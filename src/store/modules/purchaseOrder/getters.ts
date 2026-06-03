import { GetterTree } from 'vuex'
import PurchaseOrderState from './PurchaseOrderState'
import RootState from '../../RootState'

const getters: GetterTree<PurchaseOrderState, RootState> = {
  getList (state) {
    return state.list.items
  },
  getListTotal (state) {
    return state.list.total
  },
  getQuery (state) {
    return state.query
  },
  getCurrent (state) {
    return state.current
  },
  getItems (state) {
    return state.current?.items || []
  },
  getShipGroups (state) {
    return state.current?.shipGroups || []
  },
  getAllocations (state) {
    return state.allocations.items
  },
  getAllocationView (state) {
    return state.allocations.view
  },
  getReceipts (state) {
    return state.receipts
  },
  getContactMechs (state) {
    return state.contactMechs
  },
  getPaymentPreferences (state) {
    return state.paymentPreferences
  },
  getTerms (state) {
    return state.terms
  },
  getAdjustments (state) {
    return state.adjustments
  },
  getSelectedAllocations (state) {
    return state.selectedAllocations
  },
  isScrollable (state) {
    return !state.loading && state.list.items.length > 0 && state.list.items.length < state.list.total
  },
  isLoading (state) {
    return state.loading
  },
  getError (state) {
    return state.error
  }
}

export default getters
