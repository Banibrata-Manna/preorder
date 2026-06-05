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

const assignPOItemsToSOItems = async (orderId: string, productId: string): Promise<any> => {
  return client({
    baseURL: store.getters['user/getMaargeBaseUrl'],
    url: `oms/purchaseOrders/${orderId}/assign`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${store.getters['user/getUserToken']}`
    },
    data: { productId }
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
  deletePOAllocation,
  assignPOItemsToSOItems
}
