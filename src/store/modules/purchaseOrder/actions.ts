import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import PurchaseOrderState from './PurchaseOrderState'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import * as types from './mutation-types'
import emitter from '@/event-bus'
import { PurchaseOrderService } from '@/services/PurchaseOrderService'
import { DateTime } from 'luxon'
import { clone, purchaseOrderFixtures } from './mockData'

const fixtureAllocations = purchaseOrderFixtures.allocations
let fixtureOrders = purchaseOrderFixtures.orders

const ok = (data: any = {}) => Promise.resolve({ status: 200, data })

const orderStatusLabel = (statusId: string) => ({
  ORDER_APPROVED: 'Approved',
  ORDER_CANCELLED: 'Cancelled',
  ORDER_COMPLETED: 'Completed',
  ORDER_CREATED: 'Created',
  ITEM_APPROVED: 'Approved',
  ITEM_CANCELLED: 'Cancelled',
  ITEM_COMPLETED: 'Completed',
  ITEM_CREATED: 'Created'
} as any)[statusId] || statusId

const findOrder = (orderId: string) => fixtureOrders.find((order: any) => order.orderId === orderId) || fixtureOrders[0]

const findItem = (order: any, orderItemSeqId: string) => (order.items || []).find((item: any) => item.orderItemSeqId === orderItemSeqId)

const syncCurrent = (commit: any, orderId: string) => {
  commit(types.PURCHASE_ORDER_CURRENT_UPDATED, { order: clone(findOrder(orderId)) })
}

const toastAndOk = (message: string, data: any = {}) => {
  showToast(translate(message))
  return ok(data)
}

const buildFilters = (query: any): string[] => {
  const filters = ['docType: ORDER', 'orderTypeId: PURCHASE_ORDER']

  if (query.productStoreId) filters.push(`productStoreId: ${query.productStoreId}`)
  if (query.facilityId) filters.push(`facilityId: ${query.facilityId}`)
  if (query.productId) filters.push(`productId: ${query.productId}`)
  if (query.orderStatusId?.length) {
    filters.push(`orderStatusId:(${query.orderStatusId.join(' OR ')})`)
  }
  if (query.itemStatusId?.length) {
    filters.push(`orderItemStatusId:(${query.itemStatusId.join(' OR ')})`)
  }
  if (query.estimatedDeliveryDateFrom) {
    filters.push(`estimatedDeliveryDate:[${query.estimatedDeliveryDateFrom}T00:00:00Z TO *]`)
  }
  if (query.estimatedDeliveryDateTo) {
    filters.push(`estimatedDeliveryDate:[* TO ${query.estimatedDeliveryDateTo}T23:59:59Z]`)
  }

  return filters
}

const mapSolrDoc = (doc: any): any => ({
  ...doc,
  itemStatusId: doc.orderItemStatusId,
  itemStatusDesc: doc.orderItemStatusDesc,
  orderExternalId: doc.externalOrderId,
  statusId: doc.orderItemStatusId || doc.orderStatusId,
  statusDesc: doc.orderItemStatusDesc || doc.orderStatusDesc
})

const actions: ActionTree<PurchaseOrderState, RootState> = {
  async updateQuery ({ commit, dispatch, state }, { query }) {
    commit(types.PURCHASE_ORDER_QUERY_UPDATED, { query })
    return dispatch('fetchPurchaseOrders', { query: { ...state.query, ...query } })
  },

  async fetchPurchaseOrders ({ commit, state }, payload = {}) {
    const query = payload.query || {}
    const pageIndex = Number(query.pageIndex || 0)
    const limit = Number(query.limit || process.env.VUE_APP_VIEW_SIZE || 20)

    if (pageIndex === 0) emitter.emit('presentLoader')
    commit(types.PURCHASE_ORDER_LOADING_UPDATED, { loading: true })
    try {
      const groupByField = ({
        ORDER_ITEM: 'orderId',
        ORDER_PARENT_PRODUCT: 'orderIdParentProductId',
        PRODUCT: 'productId',
        PRODUCT_ARRIVAL: 'productIdETA',
        PARENT_PRODUCT: 'parentProductId',
        PARENT_PRODUCT_ARRIVAL: 'parentProductIdETA'
      } as any)[query.groupBy] || 'orderId'

      const searchPayload = {
        viewSize: limit,
        viewIndex: pageIndex,
        groupByField,
        groupLimit: 200,
        queryString: query.keyword || '',
        queryFields: 'orderId orderName productId productName internalName parentProductId parentProductName search_orderIdentifications',
        sort: 'estimatedDeliveryDate asc',
        filters: buildFilters(query)
      }

      const resp = await PurchaseOrderService.fetchPurchaseOrders(searchPayload)
      if (hasError(resp)) throw resp.data

      const grouped = resp.data?.grouped?.[groupByField]
      const groups: any[] = grouped?.groups || []
      const total: number = grouped?.matches || 0

      const items = groups.flatMap((group: any) =>
        (group.doclist?.docs || []).map(mapSolrDoc)
      )

      const productIds = [...new Set(items.flatMap((item: any) =>
        [item.productId, item.parentProductId].filter(Boolean)
      ))]
      if (productIds.length) this.dispatch('product/fetchProducts', { productIds })

      const allItems = pageIndex === 0 ? items : [...(state as any).list.items, ...items]

      commit(types.PURCHASE_ORDER_LIST_UPDATED, { items: allItems, total })
      commit(types.PURCHASE_ORDER_QUERY_UPDATED, { query: { ...query, pageIndex, limit, hasUpdated: true } })
      return { purchaseOrders: items, totalOrdersCount: total }
    } catch (error) {
      console.error(error)
      showToast(translate('Something went wrong'))
    } finally {
      commit(types.PURCHASE_ORDER_LOADING_UPDATED, { loading: false })
      if (pageIndex === 0) emitter.emit('dismissLoader')
    }
  },

  resetQuery ({ commit }) {
    commit(types.PURCHASE_ORDER_QUERY_UPDATED, {
      query: {
        keyword: '',
        orderStatusId: [],
        itemStatusId: [],
        facilityId: '',
        productStoreId: '',
        productId: '',
        estimatedDeliveryDateFrom: '',
        estimatedDeliveryDateTo: '',
        groupBy: 'ORDER_ITEM',
        pageIndex: 0,
        limit: process.env.VUE_APP_VIEW_SIZE ? parseInt(process.env.VUE_APP_VIEW_SIZE) : 20,
        hasUpdated: false
      }
    })
    commit(types.PURCHASE_ORDER_LIST_UPDATED, { items: [], total: 0 })
  },

  async fetchPurchaseOrder ({ commit }, { orderId }) {
    emitter.emit('presentLoader')
    try {
      const orderResp = await PurchaseOrderService.fetchPurchaseOrder(orderId)
      if (hasError(orderResp)) throw orderResp.data

      const orderData = orderResp.data.order
      const rawItems: any[] = orderData.items || []

      const [receiptsResult, facilityResult] = await Promise.allSettled([
        PurchaseOrderService.fetchPurchaseOrderReceipts(orderId),
        orderData.originFacilityId
          ? PurchaseOrderService.fetchFacilityContactMechs({
              facilityId: orderData.originFacilityId,
              contactMechTypeId: 'POSTAL_ADDRESS',
              contactMechPurposeTypeId: 'PRIMARY_LOCATION'
            })
          : Promise.resolve(null)
      ])

      const receivedByItem: Record<string, number> = {}
      if (receiptsResult.status === 'fulfilled' && !hasError(receiptsResult.value)) {
        const receipts: any[] = receiptsResult.value?.data?.PurchaseOrderItemShipmentReceiptList || []
        receipts.forEach((r: any) => {
          receivedByItem[r.orderItemSeqId] = (receivedByItem[r.orderItemSeqId] || 0) + Number(r.quantityAccepted || 0)
        })
      }

      const facilityData = facilityResult.status === 'fulfilled' && facilityResult.value
        ? (facilityResult.value.data?.facilityContactMechs?.[0] || {})
        : {}

      const items = rawItems.map((item: any) => ({
        ...item,
        internalName: item.internalName || item.itemDescription,
        itemStatusId: item.statusId,
        receivedQuantity: receivedByItem[item.orderItemSeqId] || 0
      }))

      const order = {
        ...orderData,
        preOrderCount: rawItems.filter((i: any) => i.isNewProduct === 'Y').length,
        backOrderCount: rawItems.filter((i: any) => i.isNewProduct === 'N').length,
        allocationCount: 0,
        items,
        shipGroups: [{
          shipGroupSeqId: '00001',
          facilityId: orderData.originFacilityId,
          facilityName: facilityData.facilityName || orderData.originFacilityId,
          address1: facilityData.address1,
          address2: facilityData.address2,
          city: facilityData.city,
          stateProvinceGeoId: facilityData.stateProvinceGeoId,
          postalCode: facilityData.postalCode,
          countryGeoId: facilityData.countryGeoId
        }]
      }

      commit(types.PURCHASE_ORDER_CURRENT_UPDATED, { order })

      const productIds = [...new Set(items.map((i: any) => i.productId).filter(Boolean))]
      if (productIds.length) this.dispatch('product/fetchProducts', { productIds })

      return { order }
    } catch (error) {
      console.error(error)
      showToast(translate('Something went wrong'))
    } finally {
      emitter.emit('dismissLoader')
    }
  },

  async createPurchaseOrder ({ commit }, { payload }) {
    const orderId = `HCPO_UI_${String(fixtureOrders.length + 1).padStart(3, '0')}`
    const firstShipGroup = payload.shipGroups?.[0] || {}
    const firstItem = firstShipGroup.items?.[0] || {}
    const order = {
      orderId,
      orderName: payload.orderName || orderId,
      externalId: payload.externalId || orderId,
      orderDate: new Date().toISOString(),
      estimatedDeliveryDate: firstShipGroup.estimatedDeliveryDate || firstItem.estimatedDeliveryDate || '',
      orderStatusId: payload.statusId || 'ORDER_CREATED',
      orderStatusDesc: orderStatusLabel(payload.statusId || 'ORDER_CREATED'),
      statusId: payload.statusId || 'ORDER_CREATED',
      statusDesc: orderStatusLabel(payload.statusId || 'ORDER_CREATED'),
      facilityId: firstShipGroup.orderFacilityId || firstShipGroup.facilityId || '',
      facilityName: firstShipGroup.orderFacilityId || firstShipGroup.facilityId || '',
      allocationCount: 0,
      preOrderCount: 0,
      backOrderCount: 0,
      shipGroups: [{
        shipGroupSeqId: '00001',
        facilityId: firstShipGroup.facilityId,
        orderFacilityId: firstShipGroup.orderFacilityId || firstShipGroup.facilityId,
        facilityName: firstShipGroup.orderFacilityId || firstShipGroup.facilityId
      }],
      items: [{
        ...firstItem,
        orderItemSeqId: '00001',
        itemStatusId: 'ITEM_CREATED',
        itemStatusDesc: 'Created',
        statusId: 'ITEM_CREATED'
      }]
    }
    fixtureOrders = [order, ...fixtureOrders]
    commit(types.PURCHASE_ORDER_CURRENT_UPDATED, { order: clone(order) })
    return toastAndOk('Purchase order created', { orderId })
  },

  async updateStatus ({ commit }, { orderId, statusId }) {
    const order = findOrder(orderId)
    order.statusId = statusId
    order.orderStatusId = statusId
    order.statusDesc = orderStatusLabel(statusId)
    order.orderStatusDesc = orderStatusLabel(statusId)
    syncCurrent(commit, orderId)
    return toastAndOk('Purchase order status updated')
  },

  async addItem ({ dispatch }, { orderId, item }) {
    try {
      const payload: any = {
        orderId,
        shipGroupSeqId: item.shipGroupSeqId || '00001',
        productId: item.productId,
        quantity: item.quantity,
        disableResetGrandTotal: true
      }
      if (item.unitPrice) payload.basePrice = item.unitPrice
      if (item.estimatedDeliveryDate) payload.estimatedDeliveryDate = DateTime.fromSQL(item.estimatedDeliveryDate).toMillis()

      const resp = await PurchaseOrderService.addOrderItem(payload)
      if (hasError(resp)) throw resp.data

      showToast(translate('Item added'))
      await dispatch('fetchPurchaseOrder', { orderId })
    } catch (error) {
      console.error(error)
      showToast(translate('Something went wrong'))
    }
  },

  async updateItem ({ commit }, { orderId, orderItemSeqId, item }) {
    const existing = findItem(findOrder(orderId), orderItemSeqId)
    if (existing) Object.assign(existing, item)
    syncCurrent(commit, orderId)
    return toastAndOk('Item updated')
  },

  async deleteItem ({ commit }, { orderId, orderItemSeqId }) {
    const order = findOrder(orderId)
    order.items = (order.items || []).filter((item: any) => item.orderItemSeqId !== orderItemSeqId)
    syncCurrent(commit, orderId)
    return toastAndOk('Item removed')
  },

  async updateItemArrivalDate ({ dispatch }, payload) {
    return dispatch('updateItem', {
      orderId: payload.orderId,
      orderItemSeqId: payload.orderItemSeqId,
      item: { estimatedDeliveryDate: payload.estimatedDeliveryDate }
    })
  },

  async updateItemAtp ({ dispatch }, { orderId, orderItemSeqId, availableToPromise }) {
    return dispatch('updateItem', { orderId, orderItemSeqId, item: { availableToPromise } })
  },

  async updateItemStatus ({ dispatch }, { orderId, orderItemSeqId, statusId }) {
    return dispatch('updateItem', {
      orderId,
      orderItemSeqId,
      item: {
        statusId,
        itemStatusId: statusId,
        itemStatusDesc: orderStatusLabel(statusId)
      }
    })
  },

  async fetchAllocations ({ commit }, { orderId, allocationView = 'linked', productId = '' }) {
    const allocations = (fixtureAllocations[orderId] || [])
      .filter((allocation: any) => allocationView === 'all' || String(allocation.allocationType || '').toLowerCase() === allocationView)
      .filter((allocation: any) => !productId || allocation.productId === productId)
    commit(types.PURCHASE_ORDER_ALLOCATIONS_UPDATED, { items: clone(allocations), view: allocationView })
    return ok({ allocations })
  },

  updateSelectedAllocations ({ commit }, { items }) {
    commit(types.PURCHASE_ORDER_SELECTED_ALLOCATIONS_UPDATED, { items })
  },

  async removeAllocations ({ commit, dispatch, state }, { orderId }) {
    const selectedKeys = new Set(state.selectedAllocations.map((item: any) => `${item.orderId}-${item.orderItemSeqId}`))
    fixtureAllocations[orderId] = (fixtureAllocations[orderId] || []).filter((item: any) => !selectedKeys.has(`${item.orderId}-${item.orderItemSeqId}`))
    commit(types.PURCHASE_ORDER_SELECTED_ALLOCATIONS_UPDATED, { items: [] })
    await dispatch('fetchAllocations', { orderId, allocationView: state.allocations.view })
    return toastAndOk('Allocations removed')
  },

  async syncItemDateWithSalesOrders () {
    return toastAndOk('Sales order dates synced')
  },

  async assignItemToSalesOrders () {
    return toastAndOk('Sales orders assigned')
  },

  async receiveItems ({ commit }, { orderId, items }) {
    const order = findOrder(orderId)
    items.forEach((receivedItem: any) => {
      const item = findItem(order, receivedItem.orderItemSeqId)
      if (item) item.receivedQuantity = Number(item.receivedQuantity || 0) + Number(receivedItem.quantityAccepted || 0)
    })
    syncCurrent(commit, orderId)
    return toastAndOk('Items received')
  },

  async fetchReceipts ({ commit }) {
    commit(types.PURCHASE_ORDER_RECEIPTS_UPDATED, { receipts: [] })
    return ok({ receipts: [] })
  },

  async fetchContactMechs ({ commit }) {
    commit(types.PURCHASE_ORDER_CONTACT_MECHS_UPDATED, { contactMechs: [] })
    return ok({ contactMechs: [] })
  },

  async updateShippingTelecomNumber () {
    return toastAndOk('Shipping contact updated')
  },

  async deleteShippingTelecomNumber () {
    return toastAndOk('Shipping contact removed')
  },

  async fetchPaymentPreferences ({ commit }) {
    commit(types.PURCHASE_ORDER_PAYMENT_PREFERENCES_UPDATED, { paymentPreferences: [] })
    return ok({ paymentPreferences: [] })
  },

  async addPaymentPreference () {
    return toastAndOk('Payment preference added')
  },

  async updatePaymentPreference () {
    return toastAndOk('Payment preference updated')
  },

  async sendPayment () {
    return toastAndOk('Payment sent')
  },

  async fetchTerms ({ commit }) {
    commit(types.PURCHASE_ORDER_TERMS_UPDATED, { terms: [] })
    return ok({ terms: [] })
  },

  async addTerm () {
    return toastAndOk('Payment term added')
  },

  async deleteTerm () {
    return toastAndOk('Payment term removed')
  },

  async fetchAdjustments ({ commit }) {
    commit(types.PURCHASE_ORDER_ADJUSTMENTS_UPDATED, { adjustments: [] })
    return ok({ adjustments: [] })
  },

  async saveAdjustment () {
    return toastAndOk('Adjustment saved')
  },

  async deleteAdjustment () {
    return toastAndOk('Adjustment removed')
  },

  async setDiscountAndShipping () {
    return toastAndOk('Discount and shipping updated')
  },

  async sendEmail () {
    return toastAndOk('Email sent')
  }
}

export default actions
