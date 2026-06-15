import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import PurchaseOrderState from './PurchaseOrderState'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import * as types from './mutation-types'
import emitter from '@/event-bus'
import { PurchaseOrderService } from '@/services/PurchaseOrderService'
import { purchaseOrderFixtures } from './mockData'
import { DateTime } from 'luxon'

const fixtureAllocations = purchaseOrderFixtures.allocations

const ok = (data: any = {}) => Promise.resolve({ status: 200, data })


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
        queryString: query.keyword ? `*${query.keyword}*` : '',
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

  // FIXME: Migrate this to moqui, this api requires Vendor and Supplier, can't be used now.
  async createPurchaseOrder (_, { payload }) {
    try {
      const resp = await PurchaseOrderService.createPurchaseOrder(payload)
      if (hasError(resp)) throw resp.data
      showToast(translate('Purchase order created'))
      return resp
    } catch (error) {
      console.error(error)
      showToast(translate('Something went wrong'))
    }
  },

  async updateStatus ({ dispatch }, { orderId, statusId }) {
    try {
      const resp = await PurchaseOrderService.changeOrderStatus(orderId, statusId, { setItemStatus: true })
      if (hasError(resp)) throw resp.data

      showToast(translate('Purchase order status updated'))
      await dispatch('fetchPurchaseOrder', { orderId })
      PurchaseOrderService.indexOrder(orderId).catch((error: any) => console.error('Failed to index order', error))
    } catch (error) {
      console.error(error)
      showToast(translate('Something went wrong'))
    }
  },

  async addItem ({ dispatch }, { orderId, item }) {
    try {
      const payload: any = {
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        disableResetGrandTotal: true
      }
      if (item.unitPrice) payload.unitPrice = item.unitPrice
      if (item.estimatedDeliveryDate) payload.estimatedDeliveryDate = item.estimatedDeliveryDate
      if (item.isNewProduct) payload.isNewProduct = item.isNewProduct

      const resp = await PurchaseOrderService.addOrderItem(payload)
      if (hasError(resp)) throw resp.data

      showToast(translate('Item added'))
      await dispatch('fetchPurchaseOrder', { orderId })
      PurchaseOrderService.indexOrder(orderId).catch((error: any) => console.error('Failed to index order', error))
    } catch (error) {
      console.error(error)
      showToast(translate('Something went wrong'))
    }
  },

  async updateItem ({ dispatch }, { orderId, orderItemSeqId, item }) {
    try {
      const payload: any = {}
      if (item.quantity !== undefined) {
        payload.quantity = item.quantity
        payload.availableToPromise = item.quantity
      }
      if (item.unitPrice !== undefined) payload.unitPrice = item.unitPrice
      if (item.availableToPromise !== undefined) payload.availableToPromise = item.availableToPromise
      if (item.estimatedDeliveryDate) payload.estimatedDeliveryDate = item.estimatedDeliveryDate

      const resp = await PurchaseOrderService.updateOrderItem(orderId, orderItemSeqId, payload)
      if (hasError(resp)) throw resp.data

      showToast(translate('Item updated'))
      await dispatch('fetchPurchaseOrder', { orderId })
      PurchaseOrderService.indexOrder(orderId).catch((error: any) => console.error('Failed to index order', error))
    } catch (error) {
      console.error(error)
      showToast(translate('Something went wrong'))
    }
  },

  async syncItemDeliveryDate (_ctx, { soOrderId, soOrderItemSeqId, estimatedDeliveryDate }) {
    try {
      const promisedDatetime = typeof estimatedDeliveryDate === 'number' || /^\d+$/.test(String(estimatedDeliveryDate))
        ? Number(estimatedDeliveryDate)
        : DateTime.fromSQL(String(estimatedDeliveryDate)).toMillis()
      const resp = await PurchaseOrderService.syncItemDeliveryDate(soOrderId, soOrderItemSeqId, promisedDatetime)
      if (hasError(resp)) throw resp.data

      showToast(translate('EDD synced to linked sales order'))
      PurchaseOrderService.indexOrder(soOrderId).catch((error: any) => console.error('Failed to index order', error))
      return true
    } catch (error) {
      console.error(error)
      showToast(translate('Something went wrong'))
      return false
    }
  },

  async deleteItem ({ dispatch }, { orderId, orderItemSeqId }) {
    try {
      const resp = await PurchaseOrderService.changeOrderItemStatus(orderId, orderItemSeqId, 'ITEM_CANCELLED')
      if (hasError(resp)) throw resp.data

      showToast(translate('Item removed'))
      await dispatch('fetchPurchaseOrder', { orderId })
      PurchaseOrderService.indexOrder(orderId).catch((error: any) => console.error('Failed to index order', error))
    } catch (error) {
      console.error(error)
      showToast(translate('Something went wrong'))
    }
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
    try {
      const resp = await PurchaseOrderService.changeOrderItemStatus(orderId, orderItemSeqId, statusId)
      if (hasError(resp)) throw resp.data

      showToast(translate('Item status updated'))
      await dispatch('fetchPurchaseOrder', { orderId })
      PurchaseOrderService.indexOrder(orderId).catch((error: any) => console.error('Failed to index order', error))
    } catch (error) {
      console.error(error)
      showToast(translate('Something went wrong'))
    }
  },

  async fetchAllocations ({ commit }, { orderId, allocationView = 'linked', productId = '' }) {
    try {
      let linked: any[] = []
      let suggested: any[] = []

      if (allocationView === 'linked' || allocationView === 'all') {
        const resp = await PurchaseOrderService.fetchPOAllocations(orderId, productId || undefined)
        if (!hasError(resp)) {
          linked = (resp.data?.allocations || []).map((item: any) => ({ ...item, allocationType: 'Linked' }))
        }
      }

      if (allocationView === 'suggested' || allocationView === 'all') {
        const resp = await PurchaseOrderService.fetchPOSuggestions(orderId, productId ? [productId] : undefined)
        if (!hasError(resp)) {
          suggested = (resp.data?.suggestions || []).map((item: any) => ({ ...item, allocationType: 'Suggested' }))
        }
      }

      const allocations = allocationView === 'linked' ? linked
        : allocationView === 'suggested' ? suggested
        : [...linked, ...suggested]

      commit(types.PURCHASE_ORDER_ALLOCATIONS_UPDATED, { items: allocations, view: allocationView })
      return { allocations }
    } catch (error) {
      console.error(error)
      showToast(translate('Something went wrong'))
    }
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

  async receiveItems ({ dispatch }, { orderId, facilityId, items }) {
    try {
      const resp = await PurchaseOrderService.receiveOrderItems(orderId, facilityId, items)
      if (hasError(resp)) throw resp.data

      showToast(translate('Items received'))
      await dispatch('fetchPurchaseOrder', { orderId })
      PurchaseOrderService.indexOrder(orderId).catch((error: any) => console.error('Failed to index order', error))
    } catch (error) {
      console.error(error)
      showToast(translate('Something went wrong'))
    }
  },

  async fetchReceipts ({ commit }, { orderId }) {
    try {
      const resp = await PurchaseOrderService.fetchPurchaseOrderReceipts(orderId)
      if (hasError(resp)) throw resp.data

      // Group receipts by datetimeReceived (same shape as Transfer Order)
      const grouped = (Array.isArray(resp.data) ? resp.data : [])
        .reduce((acc: any, receipt: any) => {
          const key = receipt.datetimeReceived
          if (!acc[key]) acc[key] = []
          acc[key].push(receipt)
          return acc
        }, {})

      commit(types.PURCHASE_ORDER_RECEIPTS_UPDATED, { receipts: grouped })
    } catch (error) {
      console.error(error)
      commit(types.PURCHASE_ORDER_RECEIPTS_UPDATED, { receipts: {} })
    }
  },

  async fetchOrderStatusHistory (_, { orderId, pageSize = '250' }) {
    try {
      const resp = await PurchaseOrderService.fetchOrderStatusHistory(orderId, { pageSize })
      if (hasError(resp)) throw resp.data
      return resp.data || []
    } catch (error) {
      console.error(error)
      return []
    }
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
