const fixtureOrders = [
  {
    orderId: 'HCPO_TEST_0602',
    orderName: 'PO-CODEX-END-TO-END-0602',
    externalId: 'HCPO_TEST_0602',
    orderDate: '2026-06-03 11:43:00.000',
    estimatedDeliveryDate: '2026-06-16 00:00:00.000',
    orderStatusId: 'ORDER_APPROVED',
    statusId: 'ORDER_APPROVED',
    statusDesc: 'Approved',
    orderStatusDesc: 'Approved',
    facilityId: 'WEST_JORDAN',
    facilityName: 'WEST_JORDAN',
    destinationFacilityName: 'WEST_JORDAN',
    allocationCount: 0,
    preOrderCount: 0,
    backOrderCount: 0,
    shipGroups: [{
      shipGroupSeqId: '00001',
      facilityId: 'WEST_JORDAN',
      orderFacilityId: 'WEST_JORDAN',
      facilityName: 'WEST_JORDAN',
      address1: '7700 W Logistics Center',
      city: 'West Jordan',
      stateProvinceGeoId: 'UT',
      postalCode: '84081',
      countryGeoId: 'USA'
    }],
    items: [
      {
        orderItemSeqId: '00001',
        productId: 'M101372',
        productName: 'M101372',
        internalName: 'M101372',
        parentProductId: 'M101372',
        parentProductName: 'M101372',
        sku: 'M101372',
        quantity: 5,
        availableToPromise: 5,
        receivedQuantity: 0,
        unitPrice: 24,
        estimatedDeliveryDate: '2026-06-16 00:00:00.000',
        itemStatusId: 'ITEM_APPROVED',
        statusId: 'ITEM_APPROVED',
        itemStatusDesc: 'Approved',
        isPreOrder: 'Y'
      },
      {
        orderItemSeqId: '00002',
        productId: 'M101672',
        productName: 'M101672',
        internalName: 'M101672',
        parentProductId: 'M101372',
        parentProductName: 'M101372',
        sku: 'M101672',
        quantity: 3,
        availableToPromise: 3,
        receivedQuantity: 0,
        unitPrice: 24,
        estimatedDeliveryDate: '2026-06-16 00:00:00.000',
        itemStatusId: 'ITEM_APPROVED',
        statusId: 'ITEM_APPROVED',
        itemStatusDesc: 'Approved',
        isBackOrder: 'Y'
      }
    ]
  },
  {
    orderId: 'HC2',
    orderName: 'PO-WEST_JORDAN_1401',
    externalId: 'HC2',
    orderDate: '2026-05-14 09:15:00.000',
    estimatedDeliveryDate: '',
    orderStatusId: 'ORDER_APPROVED',
    statusId: 'ORDER_APPROVED',
    statusDesc: 'Approved',
    orderStatusDesc: 'Approved',
    facilityId: 'WEST_JORDAN',
    facilityName: 'WEST_JORDAN',
    destinationFacilityName: 'WEST_JORDAN',
    allocationCount: 2,
    preOrderCount: 1,
    backOrderCount: 1,
    shipGroups: [{
      shipGroupSeqId: '00001',
      facilityId: 'WEST_JORDAN',
      orderFacilityId: 'WEST_JORDAN',
      facilityName: 'WEST_JORDAN'
    }],
    items: [
      {
        orderItemSeqId: '00001',
        productId: 'M101372',
        productName: 'M101372',
        internalName: 'M101372',
        parentProductId: 'M101372',
        parentProductName: 'M101372',
        sku: 'M101372',
        quantity: 2,
        availableToPromise: 2,
        receivedQuantity: 0,
        unitPrice: 24,
        estimatedDeliveryDate: '',
        itemStatusId: 'ITEM_APPROVED',
        statusId: 'ITEM_APPROVED',
        itemStatusDesc: 'Approved'
      },
      {
        orderItemSeqId: '00002',
        productId: 'M101672',
        productName: 'M101672',
        internalName: 'M101672',
        parentProductId: 'M101372',
        parentProductName: 'M101372',
        sku: 'M101672',
        quantity: 2,
        availableToPromise: 2,
        receivedQuantity: 0,
        unitPrice: 24,
        estimatedDeliveryDate: '',
        itemStatusId: 'ITEM_APPROVED',
        statusId: 'ITEM_APPROVED',
        itemStatusDesc: 'Approved'
      }
    ]
  }
];

const fixtureAllocations: Record<string, any[]> = {
  HC2: [
    {
      allocationType: 'Linked',
      facilityId: 'WEST_JORDAN',
      itemStatusDesc: 'Approved',
      orderId: 'HCDEV#5176',
      orderItemSeqId: '00001',
      orderName: 'PREORDER-5176',
      productId: 'M101372',
      promisedDatetime: '2026-06-16 00:00:00.000',
      shipmentMethodTypeId: 'STANDARD'
    },
    {
      allocationType: 'Suggested',
      facilityId: 'WEST_JORDAN',
      itemStatusDesc: 'Approved',
      orderId: 'HCDEV#2415',
      orderItemSeqId: '00002',
      orderName: 'BACKORDER-2415',
      productId: 'M101672',
      promisedDatetime: '2026-06-16 00:00:00.000',
      shipmentMethodTypeId: 'STANDARD'
    }
  ]
};

export const clone = (value: any) => JSON.parse(JSON.stringify(value));

export const purchaseOrderFixtures = {
  allocations: clone(fixtureAllocations),
  orders: clone(fixtureOrders)
};
