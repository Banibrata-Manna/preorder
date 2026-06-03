import { MutationTree } from 'vuex'
import PurchaseOrderState from './PurchaseOrderState'
import * as types from './mutation-types'

const mutations: MutationTree<PurchaseOrderState> = {
  [types.PURCHASE_ORDER_LIST_UPDATED] (state, payload) {
    state.list.items = payload.items
    state.list.total = payload.total
  },
  [types.PURCHASE_ORDER_QUERY_UPDATED] (state, payload) {
    state.query = { ...state.query, ...payload.query }
  },
  [types.PURCHASE_ORDER_CURRENT_UPDATED] (state, payload) {
    state.current = payload.order
  },
  [types.PURCHASE_ORDER_ALLOCATIONS_UPDATED] (state, payload) {
    state.allocations.items = payload.items
    state.allocations.view = payload.view
  },
  [types.PURCHASE_ORDER_RECEIPTS_UPDATED] (state, payload) {
    state.receipts = payload.receipts
  },
  [types.PURCHASE_ORDER_CONTACT_MECHS_UPDATED] (state, payload) {
    state.contactMechs = payload.contactMechs
  },
  [types.PURCHASE_ORDER_PAYMENT_PREFERENCES_UPDATED] (state, payload) {
    state.paymentPreferences = payload.paymentPreferences
  },
  [types.PURCHASE_ORDER_TERMS_UPDATED] (state, payload) {
    state.terms = payload.terms
  },
  [types.PURCHASE_ORDER_ADJUSTMENTS_UPDATED] (state, payload) {
    state.adjustments = payload.adjustments
  },
  [types.PURCHASE_ORDER_SELECTED_ALLOCATIONS_UPDATED] (state, payload) {
    state.selectedAllocations = payload.items
  },
  [types.PURCHASE_ORDER_LOADING_UPDATED] (state, payload) {
    state.loading = payload.loading
  },
  [types.PURCHASE_ORDER_ERROR_UPDATED] (state, payload) {
    state.error = payload.error
  }
}

export default mutations
