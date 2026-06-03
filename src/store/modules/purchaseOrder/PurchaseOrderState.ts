export default interface PurchaseOrderState {
  list: {
    items: any[];
    total: number;
  };
  query: {
    keyword: string;
    orderStatusId: string[];
    itemStatusId: string[];
    facilityId: string;
    productStoreId: string;
    productId: string;
    estimatedDeliveryDateFrom: string;
    estimatedDeliveryDateTo: string;
    pageIndex: number;
    limit: number;
    hasUpdated: boolean;
  };
  current: any;
  allocations: {
    items: any[];
    view: string;
  };
  receipts: any[];
  contactMechs: any[];
  paymentPreferences: any[];
  terms: any[];
  adjustments: any[];
  selectedAllocations: any[];
  loading: boolean;
  error: string;
}
