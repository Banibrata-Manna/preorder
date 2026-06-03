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

export const PurchaseOrderService = {
  fetchPurchaseOrders,
  fetchPurchaseOrder,
  fetchPurchaseOrderReceipts,
  fetchFacilityContactMechs
}
