<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>{{ $t("Purchase orders") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="downloadCsv" :disabled="orders.length === 0">
            <ion-icon slot="icon-only" :icon="downloadOutline" />
          </ion-button>
          <ion-button @click="openFilters($event)">
            <ion-icon slot="icon-only" :icon="filterOutline" />
          </ion-button>
          <ion-button @click="navigateTo('/purchase-orders/new')">
            <ion-icon slot="icon-only" :icon="add" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" :scroll-events="true">
      <ion-refresher slot="fixed" @ionRefresh="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <ion-list class="purchase-order-controls" lines="full">
        <ion-searchbar
          :placeholder="$t('Search purchase orders')"
          v-model="localQuery.keyword"
          @ionFocus="selectSearchBarText($event)"
          v-on:keyup.enter="search()"
          @ionClear="localQuery.keyword = ''; search()">
        </ion-searchbar>

        <ion-item>
          <ion-icon slot="start" :icon="documentTextOutline" />
          <ion-label>{{ $t("Group by") }}</ion-label>
          <ion-select interface="popover" :value="groupBy" @ionChange="groupBy = $event.detail.value">
            <ion-select-option v-for="option in groupingOptions" :key="option.value" :value="option.value">
              {{ $t(option.label) }}
            </ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item button @click="toggleSortDirection">
          <ion-icon slot="start" :icon="swapVerticalOutline" />
          <ion-label>{{ $t("Sort by") }}</ion-label>
          <ion-note slot="end">{{ $t("Arrival date") }}</ion-note>
          <ion-icon slot="end" :icon="sortDirection === 'asc' ? arrowUpOutline : arrowDownOutline" />
        </ion-item>
      </ion-list>

      <ion-popover :is-open="showFilters" :event="filterEvent" @didDismiss="showFilters = false">
        <ion-list>
          <ion-item>
            <ion-label>{{ $t("Order status") }}</ion-label>
            <ion-select multiple interface="popover" :value="localQuery.orderStatusId" @ionChange="localQuery.orderStatusId = $event.detail.value; search()">
              <ion-select-option value="ORDER_CREATED">{{ $t("Created") }}</ion-select-option>
              <ion-select-option value="ORDER_APPROVED">{{ $t("Approved") }}</ion-select-option>
              <ion-select-option value="ORDER_COMPLETED">{{ $t("Completed") }}</ion-select-option>
              <ion-select-option value="ORDER_CANCELLED">{{ $t("Cancelled") }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-label>{{ $t("Item status") }}</ion-label>
            <ion-select multiple interface="popover" :value="localQuery.itemStatusId" @ionChange="localQuery.itemStatusId = $event.detail.value; search()">
              <ion-select-option value="ITEM_CREATED">{{ $t("Created") }}</ion-select-option>
              <ion-select-option value="ITEM_APPROVED">{{ $t("Approved") }}</ion-select-option>
              <ion-select-option value="ITEM_COMPLETED">{{ $t("Completed") }}</ion-select-option>
              <ion-select-option value="ITEM_CANCELLED">{{ $t("Cancelled") }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">{{ $t("Arrival after") }}</ion-label>
            <ion-input aria-label="arrival-after" type="date" v-model="localQuery.estimatedDeliveryDateFrom" @ionChange="search()" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">{{ $t("Arrival before") }}</ion-label>
            <ion-input aria-label="arrival-before" type="date" v-model="localQuery.estimatedDeliveryDateTo" @ionChange="search()" />
          </ion-item>
          <ion-item lines="none">
            <ion-button fill="clear" slot="end" @click="clearFilters">{{ $t("Clear") }}</ion-button>
          </ion-item>
        </ion-list>
      </ion-popover>

      <ion-item lines="none">
        <ion-label>{{ total }} {{ $t("purchase order lines") }}</ion-label>
        <ion-button fill="clear" slot="end" @click="clearFilters">{{ $t("Clear") }}</ion-button>
      </ion-item>

      <ion-list v-if="groupedOrders.length === 0">
        <ion-item>
          <ion-label>
            <h2 v-if="query.hasUpdated">{{ $t("No results found") }}</h2>
            <p>{{ $t("Search by purchase order ID, order name, product ID, status, or arrival date.") }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <main v-else class="purchase-order-results">
        <template v-if="isOrderGrouping">
          <template v-for="group in groupedOrders" :key="group.groupKey">
            <div class="list-item purchase-order-group-header" @click="navigateTo(`/purchase-orders/${group.orderId}`)">
              <ion-item lines="none">
                <ion-label>
                  <h2>{{ orderTitle(group) }}</h2>
                  <p>{{ orderSubtitle(group) }}</p>
                </ion-label>
              </ion-item>
              <div class="metadata ion-padding-end">
                <ion-note>{{ $t("Created on") }} {{ formatDate(createdValue(group)) }}</ion-note>
                <ion-badge :color="statusColor(group)">{{ statusLabel(group) }}</ion-badge>
              </div>
            </div>

            <template v-if="groupBy === 'ORDER_ITEM'">
              <div
                class="list-item purchase-order-line-row"
                v-for="item in group.items"
                :key="rowKey(item)"
                @click="navigateTo(`/purchase-orders/${item.orderId}`)">
                <ion-item lines="none">
                  <ion-thumbnail slot="start">
                    <DxpShopifyImg :src="productImage(item)" size="small" />
                  </ion-thumbnail>
                  <ion-label>
                    <h2>{{ productTitle(item) }}</h2>
                    <p>{{ productSubtitle(item) }}</p>
                  </ion-label>
                </ion-item>
                <div class="tablet ion-text-center">
                  <ion-label>
                    {{ formatDate(arrivalValue(item)) }}
                    <p>{{ $t("arrival date") }}</p>
                  </ion-label>
                </div>
                <div class="tablet ion-text-center">
                  <ion-label>
                    {{ quantity(orderedQuantity(item)) }}
                    <p>{{ $t("ordered") }}</p>
                  </ion-label>
                </div>
                <div class="tablet ion-text-center">
                  <ion-label>
                    {{ quantity(availableQuantity(item)) }}
                    <p>{{ $t("available") }}</p>
                  </ion-label>
                </div>
                <div class="ion-text-center ion-padding-end">
                  <ion-badge :color="statusColor(item)">{{ statusLabel(item) }}</ion-badge>
                </div>
              </div>
            </template>

            <template v-else>
              <div
                class="list-item purchase-order-parent-row"
                v-for="item in group.items"
                :key="item.groupKey"
                @click="navigateTo(`/purchase-orders/${group.orderId}`)">
                <ion-item lines="none">
                  <ion-thumbnail slot="start">
                    <DxpShopifyImg :src="productImage(item.sample)" size="small" />
                  </ion-thumbnail>
                  <ion-label>
                    <h2>{{ parentProductTitle(item.sample) }}</h2>
                    <p>{{ parentProductSubtitle(item.sample) }}</p>
                  </ion-label>
                </ion-item>
                <div class="tablet ion-text-center">
                  <ion-label>
                    {{ formatDate(item.arrivalDate) }}
                    <p>{{ $t("arrival date") }}</p>
                  </ion-label>
                </div>
                <div class="tablet ion-text-center">
                  <ion-label>
                    {{ quantity(item.ordered) }}
                    <p>{{ $t("ordered") }}</p>
                  </ion-label>
                </div>
                <div class="tablet ion-text-center">
                  <ion-label>
                    {{ quantity(item.available) }}
                    <p>{{ $t("available") }}</p>
                  </ion-label>
                </div>
                <div class="ion-text-center ion-padding-end">
                  <ion-label>
                    {{ quantity(item.variants) }}
                    <p>{{ $t("variants") }}</p>
                  </ion-label>
                </div>
              </div>
            </template>
          </template>
        </template>

        <ion-accordion-group v-else :multiple="true" :value="expandedGroups" @ionChange="expandedGroups = normalizeAccordionValue($event.detail.value)">
          <ion-accordion v-for="group in groupedOrders" :key="group.groupKey" :value="group.groupKey">
            <div class="list-item purchase-order-aggregate-row" :class="aggregateRowClass" slot="header">
              <ion-item lines="none">
                <ion-thumbnail slot="start">
                  <DxpShopifyImg :src="productImage(group.sample)" size="small" />
                </ion-thumbnail>
                <ion-label>
                  <h2>{{ aggregateTitle(group) }}</h2>
                  <p>{{ aggregateSubtitle(group) }}</p>
                </ion-label>
              </ion-item>
              <div v-if="aggregateShowsArrival" class="tablet ion-text-center">
                <ion-label>
                  {{ formatDate(group.arrivalDate) }}
                  <p>{{ $t("arrival date") }}</p>
                </ion-label>
              </div>
              <div class="tablet ion-text-center">
                <ion-label>
                  {{ quantity(group.ordered) }}
                  <p>{{ $t("ordered") }}</p>
                </ion-label>
              </div>
              <div class="tablet ion-text-center">
                <ion-label>
                  {{ quantity(group.available) }}
                  <p>{{ $t("available") }}</p>
                </ion-label>
              </div>
              <div v-if="isParentGrouping" class="tablet ion-text-center">
                <ion-label>
                  {{ quantity(group.variants) }}
                  <p>{{ $t("variants") }}</p>
                </ion-label>
              </div>
              <div class="ion-text-center ion-padding-end">
                <ion-icon :icon="chevronDownOutline" class="ion-accordion-toggle-icon" />
              </div>
            </div>

            <ion-list slot="content">
              <div
                class="list-item purchase-order-child-row"
                :class="childRowClass"
                v-for="item in group.items"
                :key="rowKey(item)"
                @click="navigateTo(`/purchase-orders/${item.orderId}`)">
                <template v-if="isParentGrouping">
                  <ion-item lines="none">
                    <ion-label>
                      <h2>{{ productTitle(item) }}</h2>
                      <p>{{ productSubtitle(item) }}</p>
                    </ion-label>
                  </ion-item>
                  <div v-if="!aggregateShowsArrival" class="tablet ion-text-center">
                    <ion-label>
                      {{ formatDate(arrivalValue(item)) }}
                      <p>{{ $t("arrival date") }}</p>
                    </ion-label>
                  </div>
                  <div class="tablet ion-text-center">
                    <ion-label>
                      {{ orderTitle(item) }}
                      <p>{{ orderSubtitle(item) }}</p>
                    </ion-label>
                  </div>
                  <div class="tablet ion-text-center">
                    <ion-label>
                      {{ quantity(orderedQuantity(item)) }}
                      <p>{{ $t("ordered") }}</p>
                    </ion-label>
                  </div>
                  <div class="ion-text-center ion-padding-end">
                    <ion-label>
                      {{ quantity(availableQuantity(item)) }}
                      <p>{{ $t("available") }}</p>
                    </ion-label>
                  </div>
                </template>

                <template v-else>
                  <ion-item lines="none">
                    <ion-label>
                      <h2>{{ orderTitle(item) }}</h2>
                      <p>{{ orderSubtitle(item) }}</p>
                    </ion-label>
                  </ion-item>
                  <div v-if="!aggregateShowsArrival" class="tablet ion-text-center">
                    <ion-label>
                      {{ formatDate(arrivalValue(item)) }}
                      <p>{{ $t("arrival date") }}</p>
                    </ion-label>
                  </div>
                  <div class="tablet ion-text-center">
                    <ion-label>
                      {{ quantity(orderedQuantity(item)) }}
                      <p>{{ $t("ordered") }}</p>
                    </ion-label>
                  </div>
                  <div class="tablet ion-text-center">
                    <ion-label>
                      {{ quantity(availableQuantity(item)) }}
                      <p>{{ $t("available") }}</p>
                    </ion-label>
                  </div>
                  <div class="metadata ion-padding-end">
                    <ion-note>{{ $t("Created on") }} {{ formatDate(createdValue(item)) }}</ion-note>
                    <ion-badge :color="statusColor(item)">{{ statusLabel(item) }}</ion-badge>
                  </div>
                </template>
              </div>
            </ion-list>
          </ion-accordion>
        </ion-accordion-group>
      </main>

      <ion-infinite-scroll @ionInfinite="loadMore($event)" threshold="100px" v-show="isScrollable">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')"></ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonAccordion,
  IonAccordionGroup,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonNote,
  IonPage,
  IonPopover,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonThumbnail,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { add, arrowDownOutline, arrowUpOutline, chevronDownOutline, documentTextOutline, downloadOutline, filterOutline, swapVerticalOutline } from "ionicons/icons";
import { DateTime } from "luxon";
import { defineComponent } from "vue";
import { mapGetters } from "vuex";
import { useRouter } from "vue-router";
import { useStore } from "@/store";
import { DxpShopifyImg, getProductIdentificationValue, useProductIdentificationStore } from "@hotwax/dxp-components";

export default defineComponent({
  name: "purchase-orders",
  components: {
    DxpShopifyImg,
    IonAccordion,
    IonAccordionGroup,
    IonBadge,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonMenuButton,
    IonNote,
    IonPage,
    IonPopover,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonThumbnail,
    IonTitle,
    IonToolbar
  },
  data() {
    return {
      expandedGroups: [] as string[],
      filterEvent: undefined as any,
      groupBy: 'ORDER_ITEM',
      groupingOptions: [
        { value: 'ORDER_ITEM', label: 'Order item' },
        { value: 'ORDER_PARENT_PRODUCT', label: 'Order and parent product' },
        { value: 'PARENT_PRODUCT', label: 'Parent product' },
        { value: 'PARENT_PRODUCT_ARRIVAL', label: 'Parent product and arrival date' },
        { value: 'PRODUCT', label: 'Product' },
        { value: 'PRODUCT_ARRIVAL', label: 'Product and arrival date' }
      ],
      localQuery: {
        keyword: '',
        orderStatusId: [] as string[],
        itemStatusId: [] as string[],
        estimatedDeliveryDateFrom: '',
        estimatedDeliveryDateTo: ''
      },
      showFilters: false,
      sortDirection: 'asc'
    }
  },
  computed: {
    ...mapGetters({
      orders: 'purchaseOrder/getList',
      total: 'purchaseOrder/getListTotal',
      query: 'purchaseOrder/getQuery',
      isScrollable: 'purchaseOrder/isScrollable',
      currentEComStore: 'user/getCurrentEComStore',
      getProduct: 'product/getProduct'
    }),
    aggregateRowClass(): string {
      return {
        PRODUCT: 'product-group',
        PRODUCT_ARRIVAL: 'product-arrival-group',
        PARENT_PRODUCT: 'parent-product-group',
        PARENT_PRODUCT_ARRIVAL: 'parent-product-arrival-group'
      }[this.groupBy] || '';
    },
    aggregateShowsArrival(): boolean {
      return ['PRODUCT_ARRIVAL', 'PARENT_PRODUCT_ARRIVAL'].includes(this.groupBy);
    },
    childRowClass(): string {
      return {
        PRODUCT: 'product-child',
        PRODUCT_ARRIVAL: 'product-arrival-child',
        PARENT_PRODUCT: 'parent-product-child',
        PARENT_PRODUCT_ARRIVAL: 'parent-product-arrival-child'
      }[this.groupBy] || '';
    },
    groupedOrders(): any[] {
      const rows = this.sortedRows();
      if (this.groupBy === 'ORDER_ITEM') return this.orderGroups(rows, false);
      if (this.groupBy === 'ORDER_PARENT_PRODUCT') return this.orderGroups(rows, true);
      if (this.groupBy === 'PRODUCT') return this.aggregateGroups(rows, 'product', (row: any) => this.productKey(row));
      if (this.groupBy === 'PRODUCT_ARRIVAL') return this.aggregateGroups(rows, 'productArrival', (row: any) => `${this.productKey(row)}-${this.dateKey(this.arrivalValue(row))}`);
      if (this.groupBy === 'PARENT_PRODUCT') return this.aggregateGroups(rows, 'parentProduct', (row: any) => this.parentProductKey(row));
      if (this.groupBy === 'PARENT_PRODUCT_ARRIVAL') return this.aggregateGroups(rows, 'parentProductArrival', (row: any) => `${this.parentProductKey(row)}-${this.dateKey(this.arrivalValue(row))}`);
      return this.orderGroups(rows, false);
    },
    isOrderGrouping(): boolean {
      return ['ORDER_ITEM', 'ORDER_PARENT_PRODUCT'].includes(this.groupBy);
    },
    isParentGrouping(): boolean {
      return ['PARENT_PRODUCT', 'PARENT_PRODUCT_ARRIVAL'].includes(this.groupBy);
    }
  },
  watch: {
    groupedOrders: {
      handler(groups: any[]) {
        this.expandedGroups = groups.map((group: any) => group.groupKey);
      },
      immediate: true
    }
  },
  ionViewWillEnter() {
    this.localQuery = {
      keyword: this.query.keyword,
      orderStatusId: [...this.query.orderStatusId],
      itemStatusId: [...this.query.itemStatusId],
      estimatedDeliveryDateFrom: this.query.estimatedDeliveryDateFrom,
      estimatedDeliveryDateTo: this.query.estimatedDeliveryDateTo
    };
    if (!this.query.hasUpdated) this.search();
  },
  methods: {
    async search(pageIndex = 0) {
      await this.store.dispatch('purchaseOrder/updateQuery', {
        query: {
          ...this.localQuery,
          productStoreId: this.currentEComStore?.productStoreId || '',
          pageIndex
        }
      });
    },
    async refresh(event: any) {
      await this.search(0);
      event.target.complete();
    },
    async loadMore(event: any) {
      const nextIndex = Math.ceil(this.orders.length / this.query.limit);
      await this.search(nextIndex);
      event.target.complete();
    },
    clearFilters() {
      this.localQuery = {
        keyword: '',
        orderStatusId: [],
        itemStatusId: [],
        estimatedDeliveryDateFrom: '',
        estimatedDeliveryDateTo: ''
      };
      this.search();
    },
    downloadCsv() {
      const headers = ['orderId', 'orderName', 'orderItemSeqId', 'productId', 'estimatedDeliveryDate', 'quantity', 'availableToPromise', 'status'];
      const lines = this.orders.map((item: any) => headers.map((header) => this.csvValue(this.csvFieldValue(item, header))).join(','));
      const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'purchase-orders.csv';
      link.click();
      URL.revokeObjectURL(url);
    },
    csvValue(value: any) {
      return `"${String(value ?? '').replace(/"/g, '""')}"`;
    },
    csvFieldValue(item: any, header: string) {
      if (header === 'status') return this.statusLabel(item);
      if (header === 'availableToPromise') return this.availableQuantity(item);
      return item[header];
    },
    aggregateGroups(rows: any[], type: string, keyFn: any) {
      return this.groupRows(rows, keyFn).map((group: any) => this.aggregateGroup(type, group.key, group.rows));
    },
    aggregateGroup(type: string, key: string, rows: any[]) {
      const sample = rows[0] || {};
      return {
        available: this.sumAvailable(rows),
        arrivalDate: this.firstArrivalValue(rows),
        groupKey: `${type}-${key}`,
        items: rows,
        ordered: this.sumOrdered(rows),
        sample,
        type,
        variants: this.variantCount(rows)
      };
    },
    aggregateSubtitle(group: any) {
      return this.isParentGrouping ? this.parentProductSubtitle(group.sample) : this.productSubtitle(group.sample);
    },
    aggregateTitle(group: any) {
      return this.isParentGrouping ? this.parentProductTitle(group.sample) : this.productTitle(group.sample);
    },
    arrivalMillis(row: any) {
      return this.parseDate(this.arrivalValue(row))?.toMillis() ?? null;
    },
    arrivalValue(row: any) {
      return row?.estimatedDeliveryDate || row?.arrivalDate || row?.promisedDatetime || row?.promiseDate || '';
    },
    availableQuantity(row: any) {
      const availableFields = ['availableToPromise', 'poItemATP', 'available', 'availableQuantity', 'atp'];
      const field = availableFields.find((fieldName) => row?.[fieldName] !== undefined && row?.[fieldName] !== null && row?.[fieldName] !== '');
      return field ? row[field] : this.orderedQuantity(row);
    },
    createdValue(row: any) {
      return row?.orderDate || row?.entryDate || row?.createdStamp || '';
    },
    dateKey(value: any) {
      return this.parseDate(value)?.toISODate() || 'no-arrival-date';
    },
    firstArrivalValue(rows: any[]) {
      const values = rows
        .map((row) => ({ value: this.arrivalValue(row), millis: this.arrivalMillis(row) }))
        .filter((entry) => entry.millis !== null)
        .sort((first: any, second: any) => first.millis - second.millis);
      return values[0]?.value || '';
    },
    firstDistinct(primary: any, ...values: any[]) {
      const primaryValue = String(primary || '');
      const value = values.find((candidate) => candidate && String(candidate) !== primaryValue);
      return value || '-';
    },
    groupRows(rows: any[], keyFn: any) {
      const groups = new Map();
      rows.forEach((row: any) => {
        const key = keyFn(row) || 'unknown';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
      });
      return Array.from(groups.entries()).map(([key, groupRows]) => ({ key, rows: groupRows }));
    },
    normalizeAccordionValue(value: any) {
      if (!value) return [];
      return Array.isArray(value) ? value : [value];
    },
    openFilters(event: Event) {
      this.filterEvent = event;
      this.showFilters = true;
    },
    orderedQuantity(row: any) {
      return row?.quantity ?? row?.orderQuantity ?? row?.orderedQuantity ?? row?.quantityOrdered ?? '';
    },
    orderGroups(rows: any[], groupByParentProduct: boolean) {
      return this.groupRows(rows, (row: any) => this.orderKey(row)).map((group: any) => {
        const sample = group.rows[0] || {};
        return {
          ...sample,
          groupKey: `order-${group.key}`,
          items: groupByParentProduct ? this.parentProductGroupsForOrder(group.rows, group.key) : group.rows,
          orderId: sample.orderId || group.key
        };
      });
    },
    orderKey(row: any) {
      return row?.orderId || row?.orderName || row?.orderExternalId || 'unknown-order';
    },
    orderSubtitle(row: any) {
      return this.firstDistinct(this.orderTitle(row), row?.orderId, row?.orderExternalId, row?.orderItemSeqId);
    },
    orderTitle(row: any) {
      return row?.orderName || row?.orderExternalId || row?.orderId || this.$t("Purchase order");
    },
    parentProductGroupsForOrder(rows: any[], orderKey: string) {
      return this.groupRows(rows, (row: any) => this.parentProductKey(row)).map((group: any) => {
        const aggregate = this.aggregateGroup('orderParentProduct', `${orderKey}-${group.key}`, group.rows);
        return {
          ...aggregate,
          arrivalDate: this.firstArrivalValue(group.rows)
        };
      });
    },
    parentProductKey(row: any) {
      return row?.parentProductId || row?.virtualProductId || row?.parentProductName || row?.parentProductInternalName || this.productKey(row);
    },
    parentProductSubtitle(row: any) {
      return this.firstDistinct(this.parentProductTitle(row), row?.parentProductId, row?.virtualProductId, row?.parentProductInternalName, row?.productId);
    },
    parentProductTitle(row: any) {
      return row?.parentProductName || row?.parentProductInternalName || row?.parentProductId || row?.virtualProductId || row?.productName || row?.internalName || row?.productId || this.$t("Product");
    },
    parseDate(value: any) {
      if (value === undefined || value === null) return null;
      const stringValue = String(value).trim();
      if (!stringValue || ['null', 'undefined'].includes(stringValue)) return null;
      if (typeof value === 'number' || /^\d+$/.test(stringValue)) {
        const numericValue = Number(stringValue);
        const millis = stringValue.length === 10 ? numericValue * 1000 : numericValue;
        const numericDate = DateTime.fromMillis(millis);
        return numericDate.isValid ? numericDate : null;
      }
      const isoDate = DateTime.fromISO(stringValue);
      const sqlDate = DateTime.fromSQL(stringValue);
      const parsedDate = isoDate.isValid ? isoDate : sqlDate;
      return parsedDate.isValid ? parsedDate : null;
    },
    formatDate(value: any) {
      return this.parseDate(value)?.toFormat('d LLL yyyy') || '-';
    },
    productImage(item: any) {
      const cached = this.getProduct(item?.productId) || {};
      return cached.mainImageUrl || cached.mediumImageUrl || cached.smallImageUrl || item?.mainImageUrl || item?.productImageUrl || '';
    },
    productKey(row: any) {
      return row?.productId || row?.productName || row?.internalName || row?.orderItemSeqId || 'unknown-product';
    },
    productSubtitle(row: any) {
      const cached = this.getProduct(row?.productId) || {};
      const secondary = getProductIdentificationValue(this.productIdentificationPref.secondaryId, cached);
      return secondary || this.firstDistinct(this.productTitle(row), row?.productId, row?.internalName, row?.sku, row?.upc, row?.orderItemSeqId);
    },
    productTitle(row: any) {
      const cached = this.getProduct(row?.productId) || {};
      return getProductIdentificationValue(this.productIdentificationPref.primaryId, cached) || row?.productName || row?.internalName || row?.productId || this.$t("Product");
    },
    quantity(value: any) {
      if (value === undefined || value === null || value === '') return '-';
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) return value;
      return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(2).replace(/\.?0+$/, '');
    },
    rowKey(item: any) {
      return `${item?.orderId || 'order'}-${item?.orderItemSeqId || 'item'}-${item?.productId || 'product'}-${this.dateKey(this.arrivalValue(item))}`;
    },
    sortedRows() {
      return [...(this.orders || [])].sort((first: any, second: any) => {
        const firstMillis = this.arrivalMillis(first);
        const secondMillis = this.arrivalMillis(second);
        if (firstMillis === null && secondMillis !== null) return 1;
        if (secondMillis === null && firstMillis !== null) return -1;
        if (firstMillis !== null && secondMillis !== null && firstMillis !== secondMillis) {
          return this.sortDirection === 'asc' ? firstMillis - secondMillis : secondMillis - firstMillis;
        }
        return this.orderTitle(first).localeCompare(this.orderTitle(second));
      });
    },
    sumAvailable(rows: any[]) {
      return rows.reduce((total, row) => total + this.toNumber(this.availableQuantity(row)), 0);
    },
    sumOrdered(rows: any[]) {
      return rows.reduce((total, row) => total + this.toNumber(this.orderedQuantity(row)), 0);
    },
    toNumber(value: any) {
      const numericValue = Number(value);
      return Number.isFinite(numericValue) ? numericValue : 0;
    },
    statusColor(item: any) {
      const statusId = String(item.statusId || item.orderStatusId || item.itemStatusId || '');
      if (statusId.includes('APPROVED')) return 'success';
      if (statusId.includes('CANCELLED')) return 'danger';
      if (statusId.includes('COMPLETED')) return 'medium';
      return 'primary';
    },
    statusLabel(item: any) {
      return item.statusDesc || item.orderStatusDesc || item.itemStatusDesc || item.statusId || item.orderStatusId || item.itemStatusId || '-';
    },
    variantCount(rows: any[]) {
      const productKeys = new Set(rows.map((row) => this.productKey(row)).filter(Boolean));
      return productKeys.size || rows.length;
    },
    toggleSortDirection() {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    },
    selectSearchBarText(event: any) {
      event.target.getInputElement().then((element: any) => element.select());
    },
    navigateTo(path: string) {
      (document.activeElement as HTMLElement)?.blur?.();
      this.router.push(path);
    }
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    const productIdentificationStore = useProductIdentificationStore();
    const productIdentificationPref = productIdentificationStore.getProductIdentificationPref;
    return {
      add,
      arrowDownOutline,
      arrowUpOutline,
      chevronDownOutline,
      documentTextOutline,
      downloadOutline,
      filterOutline,
      getProductIdentificationValue,
      productIdentificationPref,
      router,
      store,
      swapVerticalOutline
    };
  }
});
</script>

<style scoped>
.purchase-order-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  padding: 8px 16px 16px;
}

.purchase-order-controls ion-searchbar {
  flex: 1 1 320px;
  padding-inline-start: 0;
  padding-inline-end: 0;
}

.purchase-order-controls ion-item {
  flex: 1 1 280px;
}

.purchase-order-results {
  padding: 16px;
}

.purchase-order-results .list-item {
  --columns-tablet: 4;
  --columns-desktop: 5;
}

.purchase-order-results .purchase-order-group-header {
  --columns-tablet: 2;
  --columns-desktop: 2;
}

.purchase-order-results .product-group {
  --columns-tablet: 4;
  --columns-desktop: 4;
}

.purchase-order-results .product-arrival-group,
.purchase-order-results .parent-product-group {
  --columns-tablet: 4;
  --columns-desktop: 5;
}

.purchase-order-results .parent-product-arrival-group {
  --columns-tablet: 4;
  --columns-desktop: 6;
}

.purchase-order-results .product-arrival-child,
.purchase-order-results .parent-product-arrival-child {
  --columns-tablet: 4;
  --columns-desktop: 4;
}

@media (max-width: 720px) {
  .purchase-order-controls,
  .purchase-order-results {
    padding-inline-start: 0;
    padding-inline-end: 0;
  }
}
</style>
