import { api, client } from '@/adapter';
import store from '@/store';

const fetchPurchaseOrders = async (payload: any): Promise<any> => {
  return api({
    url: 'searchOrders',
    method: 'POST',
    data: payload
  });
}

const fetchPurchaseOrder = async (orderId: string): Promise<any> => {
  return client({
    baseURL: store.getters['user/getMaargeBaseUrl'],
    url: `oms/purchaseOrders/${orderId}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${store.getters['user/getUserToken']}`
    }
  });
}

const fetchPurchaseOrderReceipts = async (orderId: string): Promise<any> => {
  return client({
    baseURL: store.getters['user/getMaargeBaseUrl'],
    url: `oms/purchaseOrders/${orderId}/receipts`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${store.getters['user/getUserToken']}`
    }
  });
}

const fetchFacilityContactMechs = async (params: any): Promise<any> => {
  return client({
    baseURL: store.getters['user/getMaargeBaseUrl'],
    url: 'oms/facilityContactMechs',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${store.getters['user/getUserToken']}`
    },
    params
  });
}

const fetchPOAllocations = async (orderId: string, productId?: string): Promise<any> => {
  return client({
    baseURL: store.getters['user/getMaargeBaseUrl'],
    url: `oms/purchaseOrders/${orderId}/allocations`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${store.getters['user/getUserToken']}`
    },
    params: { productId }
  });
}

const fetchPOSuggestions = async (orderId: string, productIds?: string[]): Promise<any> => {
  return client({
    baseURL: store.getters['user/getMaargeBaseUrl'],
    url: `oms/purchaseOrders/${orderId}/suggestions`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${store.getters['user/getUserToken']}`
    },
    params: productIds?.length ? { productIds } : {}
  });
}

const changeOrderStatus = async (orderId: string, statusId: string, params?: any): Promise<any> => {
  return client({
    baseURL: store.getters['user/getMaargeBaseUrl'],
    url: `oms/purchaseOrders/${orderId}/status`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${store.getters['user/getUserToken']}`
    },
    data: { statusId, ...params }
  });
}

const changeOrderItemStatus = async (orderId: string, orderItemSeqId: string, statusId: string, params?: any): Promise<any> => {
  return client({
    baseURL: store.getters['user/getMaargeBaseUrl'],
    url: `oms/purchaseOrders/${orderId}/items/${orderItemSeqId}/status`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${store.getters['user/getUserToken']}`
    },
    data: { statusId, ...params }
  });
}

const updateOrderItem = async (orderId: string, orderItemSeqId: string, payload: any): Promise<any> => {
  return client({
    baseURL: store.getters['user/getMaargeBaseUrl'],
    url: `oms/purchaseOrders/${orderId}/items/${orderItemSeqId}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${store.getters['user/getUserToken']}`
    },
    data: payload
  });
}

const addOrderItem = async (payload: any): Promise<any> => {
  return client({
    baseURL: store.getters['user/getMaargeBaseUrl'],
    url: `oms/purchaseOrders/${payload.orderId}/items`,
    method: 'POST',
    data: payload,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${store.getters['user/getUserToken']}`
    },
  });
}

const fetchOrganization = async (): Promise<any> => {
  return client({
    baseURL: store.getters['user/getMaargeBaseUrl'],
    url: 'admin/organizations',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${store.getters['user/getUserToken']}`
    },
    params: { roleTypeId: 'INTERNAL_ORGANIZATIO', pageSize: 1 }
  });
}

const createPurchaseOrder = async (payload: any): Promise<any> => {
  return api({
    url: 'createPurchaseOrder',
    method: 'POST',
    data: { order: payload }
  });
}

const deletePOAllocation = async (poOrderId: string, soOrderId: string, soOrderItemSeqId: string): Promise<any> => {
  return client({
    baseURL: store.getters['user/getMaargeBaseUrl'],
    url: `oms/orders/${soOrderId}/items/${soOrderItemSeqId}/poAllocations`,
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${store.getters['user/getUserToken']}`
    },
    data: { orderId: soOrderId, orderItemSeqId: soOrderItemSeqId }
  });
}

const receiveOrderItems = async (orderId: string, facilityId: string, items: any[]): Promise<any> => {
  return client({
    baseURL: store.getters['user/getMaargeBaseUrl'],
    url: `oms/purchaseOrders/${orderId}/receive`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${store.getters['user/getUserToken']}`
    },
    data: { facilityId, items }
  });
}

const assignPOItemsToSOItems = async (orderId: string, productId: string, salesOrderId?: string): Promise<any> => {
  return client({
    baseURL: store.getters['user/getMaargeBaseUrl'],
    url: `oms/purchaseOrders/${orderId}/assign`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${store.getters['user/getUserToken']}`
    },
    data: { productId, ...(salesOrderId ? { salesOrderId } : {}) }
  });
}

export const PurchaseOrderService = {
  fetchPurchaseOrders,
  fetchPurchaseOrder,
  fetchPurchaseOrderReceipts,
  fetchFacilityContactMechs,
  fetchPOAllocations,
  fetchPOSuggestions,
  addOrderItem,
  receiveOrderItems,
  changeOrderStatus,
  changeOrderItemStatus,
  updateOrderItem,
  createPurchaseOrder,
  fetchOrganization,
  deletePOAllocation,
  assignPOItemsToSOItems
}
