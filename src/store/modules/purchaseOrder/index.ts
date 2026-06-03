import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import PurchaseOrderState from './PurchaseOrderState'
import RootState from '../../RootState'

const purchaseOrderModule: Module<PurchaseOrderState, RootState> = {
  namespaced: true,
  state: {
    list: {
      items: [],
      total: 0
    },
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
    },
    current: {},
    allocations: {
      items: [],
      view: 'linked'
    },
    receipts: [],
    contactMechs: [],
    paymentPreferences: [],
    terms: [],
    adjustments: [],
    selectedAllocations: [],
    loading: false,
    error: ''
  },
  getters,
  actions,
  mutations
}

export default purchaseOrderModule
