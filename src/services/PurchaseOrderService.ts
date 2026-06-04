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
    params: { orderTypeId: 'SALES_ORDER', correspondingPoId: orderId, productId }
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

export const PurchaseOrderService = {
  fetchPurchaseOrders,
  fetchPurchaseOrder,
  fetchPurchaseOrderReceipts,
  fetchFacilityContactMechs,
  fetchPOAllocations,
  fetchPOSuggestions,
  addOrderItem
}
