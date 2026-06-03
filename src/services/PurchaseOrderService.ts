import { api } from '@/adapter';

const fetchPurchaseOrders = async (payload: any): Promise<any> => {
  return api({
    url: 'solr-query',
    method: 'POST',
    data: payload
  });
}

export const PurchaseOrderService = {
  fetchPurchaseOrders
}
