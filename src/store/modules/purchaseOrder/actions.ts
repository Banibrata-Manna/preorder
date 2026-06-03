import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import PurchaseOrderState from './PurchaseOrderState'
import { showToast } from '@/utils'
import { translate } from '@/i18n'
import * as types from './mutation-types'
import emitter from '@/event-bus'
import { clone, purchaseOrderFixtures } from './mockData'

let fixtureOrders = purchaseOrderFixtures.orders
const fixtureAllocations = purchaseOrderFixtures.allocations

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

const lineRows = () => fixtureOrders.flatMap((order: any) => (order.items || []).map((item: any) => ({
  ...order,
  ...item,
  items: undefined,
  shipGroups: undefined,
  orderStatusId: order.orderStatusId,
  orderStatusDesc: order.orderStatusDesc || order.statusDesc,
  statusDesc: item.itemStatusDesc || item.statusDesc || order.statusDesc,
  facilityId: order.facilityId,
  facilityName: order.facilityName
})))

const matchesQuery = (row: any, query: any) => {
  const keyword = String(query.keyword || '').trim().toLowerCase()
  if (keyword) {
    const searchable = [
      row.orderId,
      row.orderName,
      row.externalId,
      row.productId,
      row.productName,
      row.internalName,
      row.parentProductId,
      row.parentProductName,
      row.statusDesc,
      row.itemStatusDesc
    ].filter(Boolean).join(' ').toLowerCase()
    if (!searchable.includes(keyword)) return false
  }

  if (query.orderStatusId?.length && !query.orderStatusId.includes(row.orderStatusId)) return false
  if (query.itemStatusId?.length && !query.itemStatusId.includes(row.itemStatusId || row.statusId)) return false
  if (query.facilityId && row.facilityId !== query.facilityId) return false
  if (query.productId && row.productId !== query.productId) return false
  if (query.estimatedDeliveryDateFrom && String(row.estimatedDeliveryDate || '').slice(0, 10) < query.estimatedDeliveryDateFrom) return false
  if (query.estimatedDeliveryDateTo && String(row.estimatedDeliveryDate || '').slice(0, 10) > query.estimatedDeliveryDateTo) return false

  return true
}

const findOrder = (orderId: string) => fixtureOrders.find((order: any) => order.orderId === orderId) || fixtureOrders[0]

const findItem = (order: any, orderItemSeqId: string) => (order.items || []).find((item: any) => item.orderItemSeqId === orderItemSeqId)

const syncCurrent = (commit: any, orderId: string) => {
  commit(types.PURCHASE_ORDER_CURRENT_UPDATED, { order: clone(findOrder(orderId)) })
}

const toastAndOk = (message: string, data: any = {}) => {
  showToast(translate(message))
  return ok(data)
}

const actions: ActionTree<PurchaseOrderState, RootState> = {
  async updateQuery ({ commit, dispatch, state }, { query }) {
    commit(types.PURCHASE_ORDER_QUERY_UPDATED, { query })
    return dispatch('fetchPurchaseOrders', { query: { ...state.query, ...query } })
  },

  async fetchPurchaseOrders ({ commit }, payload = {}) {
    const query = payload.query || {}
    const pageIndex = Number(query.pageIndex || 0)
    const limit = Number(query.limit || process.env.VUE_APP_VIEW_SIZE || 20)

    if (pageIndex === 0) emitter.emit('presentLoader')
    commit(types.PURCHASE_ORDER_LOADING_UPDATED, { loading: true })
    try {
      const filteredRows = lineRows().filter((row: any) => matchesQuery(row, query))
      const items = filteredRows.slice(pageIndex * limit, pageIndex * limit + limit)
      commit(types.PURCHASE_ORDER_LIST_UPDATED, { items: clone(items), total: filteredRows.length })
      commit(types.PURCHASE_ORDER_QUERY_UPDATED, { query: { ...query, pageIndex, limit, hasUpdated: true } })
      return ok({ purchaseOrders: items, totalOrdersCount: filteredRows.length })
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
      syncCurrent(commit, orderId)
      return ok({ order: clone(findOrder(orderId)) })
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

  async addItem ({ commit }, { orderId, item }) {
    const order = findOrder(orderId)
    const nextSeqId = String((order.items || []).length + 1).padStart(5, '0')
    order.items.push({
      ...item,
      orderItemSeqId: nextSeqId,
      productName: item.productName || item.productId,
      internalName: item.internalName || item.productId,
      itemStatusId: 'ITEM_CREATED',
      itemStatusDesc: 'Created',
      statusId: 'ITEM_CREATED',
      receivedQuantity: 0
    })
    syncCurrent(commit, orderId)
    return toastAndOk('Item added')
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
