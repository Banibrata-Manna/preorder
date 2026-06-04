<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/purchase-orders"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ $t("Purchase order details") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="expandReceiveRows" :disabled="items.length === 0">{{ $t("Receive") }}</ion-button>
          <ion-button @click="load">
            <ion-icon slot="icon-only" :icon="refreshOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-item class="purchase-order-detail-header" lines="none">
        <ion-icon slot="start" :icon="ticketOutline" />
        <ion-label>
          <h1>{{ purchaseOrderTitle }}</h1>
          <p>{{ purchaseOrderSubtitle }}</p>
        </ion-label>
        <ion-badge slot="end" :color="statusColor(order)">{{ statusLabel(order) }}</ion-badge>
        <ion-button slot="end" fill="clear" @click="openActions($event)">
          <ion-icon slot="icon-only" :icon="chevronDownOutline" />
        </ion-button>
      </ion-item>

      <ion-popover :is-open="showActions" :event="actionsEvent" @didDismiss="closeActions">
        <ion-list>
          <ion-item button @click="showActions = false; changeStatus('ORDER_APPROVED')">
            <ion-icon slot="start" :icon="checkmarkCircle" />
            <ion-label>{{ $t("Approve") }}</ion-label>
          </ion-item>
          <ion-item button @click="showActions = false; changeStatus('ORDER_CANCELLED')">
            <ion-icon slot="start" :icon="closeCircle" />
            <ion-label>{{ $t("Cancel") }}</ion-label>
          </ion-item>
          <ion-item button @click="showActions = false; navigateTo(`/purchase-orders/${orderId}/allocations`)">
            <ion-icon slot="start" :icon="gitMergeOutline" />
            <ion-label>{{ $t("Allocations") }}</ion-label>
          </ion-item>
        </ion-list>
      </ion-popover>

      <section class="purchase-order-detail-summary">
        <ion-card>
          <ion-list>
            <ion-item lines="none">
              <ion-icon slot="start" :icon="businessOutline" />
              <ion-label>
                <h2>{{ facilityTitle }}</h2>
                <p v-for="line in facilityAddressLines" :key="line">{{ line }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
        </ion-card>

        <ion-card>
          <ion-list>
            <ion-item lines="none">
              <ion-label>
                <h2>{{ $t("Allocations") }}</h2>
              </ion-label>
            </ion-item>
            <ion-item
              :button="hasAllocationCount(allocationSummary.all)"
              @click="navigateToAllocations('linked', allocationSummary.all)">
              <ion-label>{{ $t("All orders") }}</ion-label>
              <ion-button v-if="hasAllocationCount(allocationSummary.all)" slot="end" fill="outline">
                {{ allocationLabel(allocationSummary.all) }}
                <ion-icon slot="end" :icon="downloadOutline" />
              </ion-button>
              <ion-note v-else slot="end">{{ $t("no orders") }}</ion-note>
            </ion-item>
            <ion-item
              :button="hasAllocationCount(allocationSummary.preOrders)"
              @click="navigateToAllocations('suggested', allocationSummary.preOrders)">
              <ion-label>{{ $t("Pre-orders") }}</ion-label>
              <ion-button v-if="hasAllocationCount(allocationSummary.preOrders)" slot="end" fill="outline">
                {{ allocationLabel(allocationSummary.preOrders) }}
                <ion-icon slot="end" :icon="downloadOutline" />
              </ion-button>
              <ion-note v-else slot="end">{{ $t("no orders") }}</ion-note>
            </ion-item>
            <ion-item lines="none">
              <ion-label>{{ $t("Back orders") }}</ion-label>
              <ion-note slot="end">{{ allocationLabel(allocationSummary.backOrders) }}</ion-note>
            </ion-item>
          </ion-list>
        </ion-card>

        <ion-list class="purchase-order-timeline">
          <ion-list-header>
            <ion-label>{{ $t("Timeline") }}</ion-label>
          </ion-list-header>
          <ion-item v-for="event in timelineEvents" :key="event.key">
            <ion-icon slot="start" :icon="event.icon" />
            <ion-label>
              <h2>{{ event.title }}</h2>
              <p>{{ event.description }}</p>
            </ion-label>
            <ion-note slot="end">{{ event.date }}</ion-note>
          </ion-item>
        </ion-list>
      </section>

      <ion-item class="purchase-order-items-header" lines="none">
        <ion-icon slot="start" :icon="shirtOutline" />
        <ion-label>
          <h1>{{ $t("Items") }}</h1>
        </ion-label>
        <ion-button slot="end" fill="outline" @click="showAddItem = !showAddItem">
          <ion-icon slot="start" :icon="add" />
          {{ $t("Add items") }}
        </ion-button>
      </ion-item>

      <div v-if="showAddItem" class="purchase-order-add-item">
        <ion-item>
          <ion-icon slot="start" :icon="searchOutline" />
          <ion-input
            :placeholder="$t('Search by SKU')"
            :clear-input="true"
            v-model="productSearchQuery"
            @keyup.enter="findProduct()"
            @ionClear="clearProductSearch()" />
        </ion-item>

        <ion-item v-if="isSearchingProduct" lines="none">
          <ion-spinner name="crescent" />
        </ion-item>

        <ion-item v-else-if="productSearchQuery && !searchedProduct.productId" lines="none">
          <ion-label color="medium">{{ $t("No product found") }}</ion-label>
        </ion-item>

        <div v-else-if="searchedProduct.productId" class="list-item purchase-order-draft-row">
          <ion-item lines="none">
            <ion-thumbnail slot="start">
              <DxpShopifyImg :src="productImage(searchedProduct)" size="small" />
            </ion-thumbnail>
            <ion-label>
              <h2>{{ itemPrimary(searchedProduct) }}</h2>
              <p>{{ itemSecondary(searchedProduct) }}</p>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-input type="number" :label="$t('Qty')" label-placement="floating" min="1" v-model="draftItem.quantity" />
          </ion-item>
          <ion-item class="tablet">
            <ion-input type="number" :label="$t('Unit price')" label-placement="floating" min="0" v-model="draftItem.unitPrice" />
          </ion-item>
          <ion-item class="tablet">
            <ion-input type="date" :label="$t('Arrival')" label-placement="floating" v-model="draftItem.estimatedDeliveryDate" />
          </ion-item>
          <ion-item class="tablet" lines="none">
            <ion-label>{{ $t("New product") }}</ion-label>
            <ion-toggle :checked="draftItem.isNewProduct" @ionChange="draftItem.isNewProduct = $event.detail.checked" />
          </ion-item>
          <div class="ion-text-center ion-padding-end">
            <ion-button fill="outline" :disabled="!draftItem.quantity" @click="addItem()">
              <ion-icon slot="start" :icon="add" />
              {{ $t("Add") }}
            </ion-button>
          </div>
        </div>
      </div>

      <main class="purchase-order-items">
        <ion-list v-if="items.length === 0">
          <ion-item>
            <ion-label>{{ $t("No results found") }}</ion-label>
          </ion-item>
        </ion-list>

        <template v-for="row in itemDisplayRows" :key="row.id">
          <div v-if="row.type === 'header'" class="list-item purchase-order-item-summary-row">
            <ion-item lines="none">
              <ion-thumbnail slot="start">
                <DxpShopifyImg :src="productImage(row.sample)" size="small" />
              </ion-thumbnail>
              <ion-label>
                <h2>{{ row.title }}</h2>
                <p>{{ row.subtitle }}</p>
              </ion-label>
            </ion-item>
            <div class="tablet ion-text-center">
              <ion-label>
                {{ quantity(row.ordered) }}
                <p>{{ $t("ordered") }}</p>
              </ion-label>
            </div>
            <div class="tablet ion-text-center">
              <ion-label>
                {{ quantity(row.available) }}
                <p>{{ $t("available") }}</p>
              </ion-label>
            </div>
            <div class="tablet ion-text-center">
              <ion-label>
                {{ quantity(row.variants) }}
                <p>{{ $t("variants") }}</p>
              </ion-label>
            </div>
            <div class="ion-text-center ion-padding-end">
              <ion-icon :icon="fitnessOutline" />
            </div>
          </div>

          <div v-else class="list-item purchase-order-item-row" :data-row-key="row.id">
            <ion-item lines="none">
              <ion-thumbnail v-if="!row.hasHeader" slot="start">
                <DxpShopifyImg :src="productImage(row)" size="small" />
              </ion-thumbnail>
              <ion-label>
                <p v-if="itemOverline(row)">{{ itemOverline(row) }}</p>
                <h2>{{ itemPrimary(row) }}</h2>
                <p>{{ itemSecondary(row) }}</p>
              </ion-label>
            </ion-item>
            <div class="tablet ion-text-center">
              <ion-label>
                {{ itemProgress(row) }}
                <p>{{ itemProgressLabel(row) }}</p>
              </ion-label>
            </div>
            <div class="tablet ion-text-center">
              <ion-chip :outline="true">{{ quantity(availableQuantity(row)) }}</ion-chip>
              <ion-label>
                <p>{{ $t("available") }}</p>
              </ion-label>
            </div>
            <div class="tablet ion-text-center">
              <ion-chip :outline="true" button @click="openArrivalDatePicker(row)">
                <ion-icon :icon="calendarOutline" />
                <ion-label>{{ formatDate(row.estimatedDeliveryDate || order.estimatedDeliveryDate) }}</ion-label>
              </ion-chip>
              <ion-label>
                <p>{{ $t("arrival date") }}</p>
              </ion-label>
            </div>
            <div class="tablet ion-text-center">
              <ion-badge :color="statusColor(row)">{{ statusLabel(row) }}</ion-badge>
            </div>
            <div class="ion-text-center ion-padding-end">
              <ion-button fill="clear" @click="openItemActions($event, row)">
                <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
              </ion-button>
            </div>
          </div>

          <ion-list v-if="showReceiveControls && row.type === 'item'" class="purchase-order-receive-item">
            <ion-item>
              <ion-label>{{ $t("Receive") }}</ion-label>
              <ion-input slot="end" type="number" :placeholder="$t('Quantity')" :value="receiveDraft[itemDraftKey(row)]" @ionInput="receiveDraft[itemDraftKey(row)] = $event.detail.value" />
              <ion-button slot="end" fill="clear" @click="receiveItem(row)">
                <ion-icon slot="icon-only" :icon="downloadOutline" />
              </ion-button>
            </ion-item>
          </ion-list>
        </template>

        <ion-popover :is-open="showItemActions" :event="itemActionsEvent" @didDismiss="closeItemActions">
          <ion-list>
            <ion-list-header>
              <ion-label>{{ itemPrimary(activeItem) }}</ion-label>
            </ion-list-header>
            <ion-item button @click="editActiveItemQuantity">{{ $t("Edit quantity") }}</ion-item>
            <ion-item button @click="confirmRemoveActiveItem">{{ $t("Remove item") }}</ion-item>
            <ion-item button @click="editActiveItemArrivalDate">{{ $t("Edit arrival date") }}</ion-item>
            <ion-item button @click="viewActiveItemAllocations('suggested')">{{ $t("Allocate pre-orders") }}</ion-item>
            <ion-item lines="none" button @click="viewActiveItemAllocations('linked')">{{ $t("View allocations") }}</ion-item>
          </ion-list>
        </ion-popover>

        <ion-modal :is-open="showArrivalDatePicker" @didDismiss="closeArrivalDatePicker">
          <ion-header>
            <ion-toolbar>
              <ion-title>{{ $t("Edit arrival date") }}</ion-title>
              <ion-buttons slot="end">
                <ion-button @click="closeArrivalDatePicker">{{ $t("Cancel") }}</ion-button>
                <ion-button @click="saveArrivalDate">{{ $t("Save") }}</ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content>
            <ion-item>
              <ion-label position="stacked">{{ $t("Arrival date") }}</ion-label>
              <ion-input type="date" v-model="arrivalDateDraft" />
            </ion-item>
          </ion-content>
        </ion-modal>

      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  alertController,
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonNote,
  IonPage,
  IonPopover,
  IonSpinner,
  IonThumbnail,
  IonTitle,
  IonToggle,
  IonToolbar
} from "@ionic/vue";
import {
  add,
  businessOutline,
  calendarOutline,
  checkmarkCircle,
  chevronDownOutline,
  closeCircle,
  downloadOutline,
  ellipsisVerticalOutline,
  fitnessOutline,
  gitMergeOutline,
  refreshOutline,
  searchOutline,
  shirtOutline,
  ticketOutline
} from "ionicons/icons";
import { DateTime } from "luxon";
import { defineComponent } from "vue";
import { mapGetters } from "vuex";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "@/store";
import { DxpShopifyImg } from "@hotwax/dxp-components";
import { ProductService } from "@/services/ProductService";
import { hasError } from "@/utils";

export default defineComponent({
  name: "purchase-order-detail",
  components: {
    DxpShopifyImg,
    IonBackButton,
    IonBadge,
    IonButton,
    IonButtons,
    IonCard,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonModal,
    IonNote,
    IonPage,
    IonPopover,
    IonSpinner,
    IonThumbnail,
    IonTitle,
    IonToggle,
    IonToolbar
  },
  data() {
    return {
      actionsEvent: undefined as Event | undefined,
      activeItem: {} as any,
      arrivalDateDraft: '',
      arrivalDateItem: {} as any,
      drafts: {} as any,
      itemActionsEvent: undefined as Event | undefined,
      receiveDraft: {} as any,
      showActions: false,
      showArrivalDatePicker: false,
      showAddItem: false,
      showItemActions: false,
      showReceiveControls: false,
      productSearchQuery: '',
      isSearchingProduct: false,
      searchedProduct: {} as any,
      draftItem: {
        quantity: 1,
        unitPrice: 0,
        estimatedDeliveryDate: '',
        isNewProduct: false
      }
    }
  },
  computed: {
    ...mapGetters({
      order: 'purchaseOrder/getCurrent',
      items: 'purchaseOrder/getItems',
      shipGroups: 'purchaseOrder/getShipGroups',
      allocations: 'purchaseOrder/getAllocations',
      getProduct: 'product/getProduct'
    }),
    enrichedItems(): any[] {
      return this.items.map((item: any) => {
        const cached = this.getProduct(item.productId) || {};
        return {
          ...item,
          mainImageUrl: item.mainImageUrl || cached.mainImageUrl || cached.mediumImageUrl,
          parentProductId: item.parentProductId || cached.groupId,
          parentProductName: item.parentProductName || cached.groupName,
          internalName: item.internalName || cached.internalName,
          productName: item.productName || cached.productName
        };
      });
    },
    firstItem(): any {
      return this.enrichedItems[0] || {};
    },
    itemDisplayRows(): any[] {
      const rows: any[] = [];
      this.parentProductGroups.forEach((group: any) => {
        const hasHeader = group.items.length > 1;
        if (hasHeader) {
          rows.push({
            type: 'header',
            id: `header-${group.groupKey}`,
            ...group
          });
        }
        group.items.forEach((item: any, index: number) => {
          rows.push({
            ...item,
            type: 'item',
            id: `item-${this.itemDraftKey(item)}-${index}`,
            hasHeader,
            parentGroup: group,
            isLastInGroup: index === group.items.length - 1
          });
        });
      });
      return rows;
    },
    parentProductGroups(): any[] {
      const groupsByKey = this.enrichedItems.reduce((groups: any, item: any) => {
        const groupKey = this.parentProductKey(item);
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(item);
        return groups;
      }, {});

      return Object.entries(groupsByKey).map(([groupKey, groupItems]: any) => {
        const sample = groupItems[0] || {};
        return {
          groupKey,
          sample,
          items: groupItems,
          title: this.parentProductTitle(sample),
          subtitle: this.parentProductSubtitle(sample),
          ordered: this.sumQuantity(groupItems, 'quantity'),
          available: groupItems.reduce((total: number, item: any) => total + this.toNumber(this.availableQuantity(item)), 0),
          received: groupItems.reduce((total: number, item: any) => total + this.toNumber(this.receivedQuantity(item)), 0),
          variants: groupItems.length
        };
      });
    },
    purchaseOrderTitle(): string {
      return this.order.orderName || this.order.externalId || this.order.orderId || this.$t("Purchase order") as string;
    },
    purchaseOrderSubtitle(): string {
      return this.firstDistinct(this.purchaseOrderTitle, this.order.orderId, this.order.externalId, this.order.orderDate);
    },
    arrivalDateValue(): any {
      return this.firstItem?.estimatedDeliveryDate || this.order.estimatedDeliveryDate || this.order.orderDate;
    },
    allocationSummary(): any {
      const linked = (this.allocations as any[]).filter((a: any) => a.allocationType === 'Linked')
      return {
        all: linked.length,
        preOrders: linked.filter((a: any) => a.facilityId === 'PRE_ORDER_PARKING').length,
        backOrders: linked.filter((a: any) => a.facilityId === 'BACKORDER_PARKING').length
      }
    },
    defaultFacilityId(): string {
      return this.shipGroups[0]?.facilityId || this.shipGroups[0]?.orderFacilityId || '';
    },
    facilityTitle(): string {
      const shipGroup = this.shipGroups[0] || {};
      return shipGroup.facilityName || this.order.facilityName || this.order.destinationFacilityName || this.defaultFacilityId || this.$t("Receiving facility") as string;
    },
    facilityAddressLines(): string[] {
      const shipGroup = this.shipGroups[0] || {};
      const cityLine = [shipGroup.city, shipGroup.postalCode || shipGroup.postalCodeGeoId].filter(Boolean).join(', ');
      const regionLine = [shipGroup.stateProvinceGeoName || shipGroup.stateProvinceGeoId, shipGroup.countryGeoName || shipGroup.countryGeoId].filter(Boolean).join(', ');
      return [
        shipGroup.address1 || shipGroup.addressLine1 || this.order.address1,
        shipGroup.address2 || shipGroup.addressLine2 || this.order.address2,
        cityLine,
        regionLine,
        this.defaultFacilityId
      ].filter(Boolean);
    },
    timelineEvents(): any[] {
      return [
        {
          key: 'status',
          icon: ticketOutline,
          title: this.statusLabel(this.order),
          description: this.$t("Status"),
          date: this.formatDateTime(this.order.lastUpdatedStamp || this.order.statusDatetime || this.order.orderDate)
        },
        {
          key: 'items',
          icon: shirtOutline,
          title: `${this.quantity(this.totalReceived)} ${this.$t("received")}`,
          description: `${this.quantity(this.items.length)} ${this.$t("items")}`,
          date: this.formatDateTime(this.order.orderDate)
        },
        {
          key: 'arrival',
          icon: calendarOutline,
          title: this.$t("Arrival date") as string,
          description: this.formatDate(this.arrivalDateValue),
          date: this.quantity(this.totalAvailable)
        }
      ];
    },
    totalAvailable(): number {
      return this.items.reduce((total: number, item: any) => total + this.toNumber(this.availableQuantity(item)), 0);
    },
    totalQuantity(): number {
      return this.items.reduce((total: number, item: any) => total + Number(item.quantity || 0), 0);
    },
    totalReceived(): number {
      return this.items.reduce((total: number, item: any) => total + this.toNumber(this.receivedQuantity(item)), 0);
    },
    variantCount(): number {
      const productKeys = new Set(this.items.map((item: any) => item.productId || item.sku || item.orderItemSeqId).filter(Boolean));
      return productKeys.size || this.items.length;
    }
  },
  ionViewWillEnter() {
    this.load();
  },
  methods: {
    async load() {
      await this.store.dispatch('purchaseOrder/fetchPurchaseOrder', { orderId: this.orderId });
      this.store.dispatch('purchaseOrder/fetchAllocations', { orderId: this.orderId, allocationView: 'linked' });
    },
    allocationLabel(count: any) {
      const numericCount = this.toNumber(count);
      return numericCount > 0 ? `${this.quantity(numericCount)} ${this.$t(numericCount === 1 ? "order" : "orders")}` : this.$t("no orders");
    },
    availableQuantity(item: any = {}) {
      return item.availableToPromise ?? item.availableQuantity ?? item.quantityAvailable ?? item.quantity ?? 0;
    },
    categoryOverline(item: any = {}) {
      const categoryText = [
        item.preOrderCategoryId,
        item.preorderCategoryId,
        item.preOrderCategoryName,
        item.preorderCategoryName,
        item.backOrderCategoryId,
        item.backorderCategoryId,
        item.backOrderCategoryName,
        item.backorderCategoryName,
        item.categoryId,
        item.productCategoryId,
        item.categoryName,
        item.productCategoryName,
        item.categoryTypeId,
        item.productCategoryTypeId,
        item.productCategoryMemberTypeId,
        item.categoryTypeEnumId,
        item.productCategoryTypeEnumId,
        item.productCategoryMemberStatusId,
        item.preOrderStatus,
        item.preorderStatus,
        item.backOrderStatus,
        item.backorderStatus,
        item.presellStatus,
        item.preSellStatus,
        item.queueType,
        item.inventoryTypeId,
        item.salesChannelEnumId
      ].filter(Boolean).join(' ').toUpperCase();
      const isPreOrder = this.isTruthy(item.isPreOrder)
        || this.isTruthy(item.isPreorder)
        || this.isTruthy(item.preOrderCategoryMember)
        || this.isTruthy(item.preorderCategoryMember)
        || categoryText.includes('PRE_ORDER')
        || categoryText.includes('PREORDER')
        || categoryText.includes('PRE-ORDER')
        || categoryText.includes('PRE SELL')
        || categoryText.includes('PRESELL');
      const isBackOrder = this.isTruthy(item.isBackOrder)
        || this.isTruthy(item.isBackorder)
        || this.isTruthy(item.backOrderCategoryMember)
        || this.isTruthy(item.backorderCategoryMember)
        || categoryText.includes('BACK_ORDER')
        || categoryText.includes('BACKORDER')
        || categoryText.includes('BACK-ORDER');
      if (isPreOrder) return this.$t("PRE-ORDER ACTIVE");
      if (isBackOrder) return this.$t("BACKORDER ACTIVE");
      return '';
    },
    closeArrivalDatePicker() {
      this.showArrivalDatePicker = false;
      this.arrivalDateItem = {};
      this.arrivalDateDraft = '';
    },
    closeItemActions() {
      (document.activeElement as HTMLElement)?.blur?.();
      this.showItemActions = false;
    },
    editActiveItemArrivalDate() {
      const item = this.activeItem;
      this.closeItemActions();
      this.openArrivalDatePicker(item);
    },
    async editActiveItemQuantity() {
      const item = this.activeItem;
      this.closeItemActions();
      const alert = await alertController.create({
        header: this.$t("Edit quantity"),
        inputs: [{
          name: 'quantity',
          type: 'number',
          value: String(item.quantity ?? '')
        }],
        buttons: [
          { text: this.$t("Cancel") },
          {
            text: this.$t("Save"),
            handler: (data: any) => {
              const quantity = Number(data.quantity);
              if (!Number.isFinite(quantity)) return false;
              return this.store.dispatch('purchaseOrder/updateItem', {
                orderId: this.orderId,
                orderItemSeqId: item.orderItemSeqId,
                item: { quantity }
              });
            }
          }
        ]
      });
      return alert.present();
    },
    expandReceiveRows() {
      this.showReceiveControls = !this.showReceiveControls;
    },
    firstDistinct(...values: any[]) {
      const uniqueValues = values.filter((value) => value !== undefined && value !== null && value !== '');
      return uniqueValues.find((value, index) => uniqueValues.indexOf(value) === index && index > 0) || uniqueValues[0] || '';
    },
    firstNumeric(...values: any[]) {
      const numericValue = values.find((value) => Number.isFinite(Number(value)));
      return numericValue !== undefined ? Number(numericValue) : 0;
    },
    formatDate(value: any) {
      return this.parseDate(value)?.toFormat('d LLL yyyy') || '-';
    },
    formatDateTime(value: any) {
      return this.parseDate(value)?.toFormat('h:mma d LLL yyyy') || '-';
    },
    itemProgress(item: any = {}) {
      const receivedQuantity = this.receivedQuantity(item);
      return receivedQuantity ? `${this.quantity(receivedQuantity)}/${this.quantity(item.quantity)}` : this.quantity(item.quantity);
    },
    itemProgressLabel(item: any = {}) {
      return this.receivedQuantity(item) ? this.$t("received") : this.$t("ordered");
    },
    itemOverline(item: any = {}) {
      const categoryLabel = this.categoryOverline(item);
      if (categoryLabel) return categoryLabel;
      if (item.hasHeader) return '';
      const parentLabel = item.parentProductName || item.parentProductInternalName || item.parentProductId || item.virtualProductId || item.groupName || item.groupId || '';
      return [this.itemPrimary(item), this.itemSecondary(item)].includes(parentLabel) ? '' : parentLabel;
    },
    itemDraftKey(item: any = {}) {
      return item.orderItemSeqId || item.orderItemId || item.orderItemExternalId || item.productId || item.sku || item.upc || 'item';
    },
    openActions(event: Event) {
      (event.currentTarget as HTMLElement)?.blur?.();
      this.actionsEvent = event;
      this.showActions = true;
    },
    openArrivalDatePicker(item: any = {}) {
      (document.activeElement as HTMLElement)?.blur?.();
      this.arrivalDateItem = item;
      this.arrivalDateDraft = this.draftDate(item) || this.parseDate(item.estimatedDeliveryDate || this.order.estimatedDeliveryDate)?.toFormat('yyyy-MM-dd') || '';
      this.showArrivalDatePicker = true;
    },
    openItemActions(event: Event, item: any) {
      (event.currentTarget as HTMLElement)?.blur?.();
      this.activeItem = item;
      this.itemActionsEvent = event;
      this.showItemActions = true;
    },
    closeActions() {
      (document.activeElement as HTMLElement)?.blur?.();
      this.showActions = false;
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
    itemPrimary(item: any = {}) {
      return item.productName || item.internalName || item.productId || item.orderItemSeqId || '';
    },
    itemSecondary(item: any = {}) {
      return item.sku || item.upc || item.productId || item.orderItemSeqId || '';
    },
    isTruthy(value: any) {
      return value === true || ['Y', 'YES', 'TRUE'].includes(String(value).toUpperCase());
    },
    parentProductTitle(row: any = {}) {
      return row.parentProductName || row.parentProductInternalName || row.parentProductId || row.virtualProductId || row.productName || row.internalName || row.productId || this.$t("Product");
    },
    parentProductSubtitle(row: any = {}) {
      return this.firstDistinct(this.parentProductTitle(row), row.parentProductId, row.virtualProductId, row.parentProductInternalName, row.productId);
    },
    parentProductKey(row: any = {}) {
      const parentKey = row.parentProductId || row.virtualProductId || row.groupId || row.parentProductName || row.parentProductInternalName;
      if (parentKey) return parentKey;
      if (this.enrichedItems.length > 1) return this.firstItem.productId || this.order.orderId || 'purchase-order-items';
      return row.productId || row.orderItemSeqId || 'purchase-order-item';
    },
    productImage(item: any = {}) {
      return item.mainImageUrl || item.productImageUrl || item.mediumImageUrl || item.smallImageUrl || '';
    },
    quantity(value: any) {
      if (value === undefined || value === null || value === '') return '-';
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) return value;
      return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(2).replace(/\.?0+$/, '');
    },
    receivedQuantity(item: any = {}) {
      return item.receivedQuantity ?? item.quantityAccepted ?? item.quantityReceived ?? 0;
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
    sumField(rows: any[], fieldNames: string[]) {
      return rows.reduce((total: number, row: any) => total + this.firstNumeric(...fieldNames.map((field) => row[field])), 0);
    },
    sumQuantity(rows: any[], fieldName: string) {
      return rows.reduce((total: number, row: any) => total + this.toNumber(row[fieldName]), 0);
    },
    toNumber(value: any) {
      const numericValue = Number(value);
      return Number.isFinite(numericValue) ? numericValue : 0;
    },
    toTimestamp(value: string) {
      return value ? `${value} 00:00:00.000` : '';
    },
    draftValue(item: any, field: string) {
      return this.drafts[this.itemDraftKey(item)]?.[field] ?? item[field] ?? '';
    },
    draftDate(item: any) {
      const value = this.draftValue(item, 'estimatedDeliveryDate');
      return this.parseDate(value)?.toFormat('yyyy-MM-dd') || '';
    },
    setDraft(item: any, field: string, value: any) {
      const draftKey = this.itemDraftKey(item);
      this.drafts[draftKey] = {
        ...(this.drafts[draftKey] || {}),
        [field]: value
      };
    },
    hasAllocationCount(count: any) {
      return this.toNumber(count) > 0;
    },
    async changeStatus(statusId: string) {
      const alert = await alertController.create({
        header: this.$t("Update purchase order"),
        message: this.$t("Are you sure you want to update this purchase order status?"),
        buttons: [
          { text: this.$t("Cancel") },
          {
            text: this.$t("Confirm"),
            handler: () => this.store.dispatch('purchaseOrder/updateStatus', { orderId: this.orderId, statusId })
          }
        ]
      });
      return alert.present();
    },
    async updateItem(item: any) {
      const draft = this.drafts[this.itemDraftKey(item)] || {};
      await this.store.dispatch('purchaseOrder/updateItem', {
        orderId: this.orderId,
        orderItemSeqId: item.orderItemSeqId,
        item: {
          quantity: draft.quantity !== undefined ? Number(draft.quantity) : undefined,
          unitPrice: draft.unitPrice !== undefined ? Number(draft.unitPrice) : undefined,
          availableToPromise: draft.availableToPromise !== undefined ? Number(draft.availableToPromise) : undefined,
          estimatedDeliveryDate: draft.estimatedDeliveryDate ? this.toTimestamp(draft.estimatedDeliveryDate) : undefined
        }
      });
    },
    async syncItem(item: any) {
      const draft = this.drafts[this.itemDraftKey(item)] || {};
      await this.store.dispatch('purchaseOrder/syncItemDateWithSalesOrders', {
        orderId: this.orderId,
        orderItemSeqId: item.orderItemSeqId,
        estimatedDeliveryDate: draft.estimatedDeliveryDate ? this.toTimestamp(draft.estimatedDeliveryDate) : undefined
      });
    },
    async completeItem(item: any) {
      await this.store.dispatch('purchaseOrder/updateItemStatus', {
        orderId: this.orderId,
        orderItemSeqId: item.orderItemSeqId,
        statusId: 'ITEM_COMPLETED'
      });
    },
    async receiveItem(item: any) {
      const draftKey = this.itemDraftKey(item);
      const quantityAccepted = Number(this.receiveDraft[draftKey] || 0);
      if (!quantityAccepted) return;
      await this.store.dispatch('purchaseOrder/receiveItems', {
        orderId: this.orderId,
        facilityId: this.defaultFacilityId,
        items: [{
          orderItemSeqId: item.orderItemSeqId,
          productId: item.productId,
          quantityAccepted
        }]
      });
      this.receiveDraft[draftKey] = '';
    },
    async saveArrivalDate() {
      if (!this.arrivalDateDraft || !this.arrivalDateItem.orderItemSeqId) {
        this.closeArrivalDatePicker();
        return;
      }
      await this.store.dispatch('purchaseOrder/updateItemArrivalDate', {
        orderId: this.orderId,
        orderItemSeqId: this.arrivalDateItem.orderItemSeqId,
        estimatedDeliveryDate: this.toTimestamp(this.arrivalDateDraft)
      });
      this.closeArrivalDatePicker();
    },
    async confirmRemoveActiveItem() {
      const item = this.activeItem;
      this.closeItemActions();
      const alert = await alertController.create({
        header: this.$t("Remove item"),
        message: this.$t("Are you sure you want to remove this purchase order item?"),
        buttons: [
          { text: this.$t("Cancel") },
          {
            text: this.$t("Remove"),
            handler: () => this.store.dispatch('purchaseOrder/deleteItem', {
              orderId: this.orderId,
              orderItemSeqId: item.orderItemSeqId
            })
          }
        ]
      });
      return alert.present();
    },
    viewActiveItemAllocations(allocationView: string) {
      const item = this.activeItem;
      this.closeItemActions();
      this.router.push({
        path: `/purchase-orders/${this.orderId}/allocations`,
        query: {
          allocationView,
          productId: item.productId
        }
      });
    },
    async findProduct() {
      const q = this.productSearchQuery.trim().toLowerCase();
      if (!q) return;
      this.isSearchingProduct = true;
      this.searchedProduct = {};
      try {
        const resp = await ProductService.fetchProducts({
          filters: [
            'isVirtual: false',
            `(internalName: *${q}* OR productId: *${q}* OR sku: *${q}*)`
          ],
          viewSize: 10
        });
        if (!hasError(resp) && resp.data.response.numFound > 0) {
          this.searchedProduct = resp.data.response.docs[0];
        }
      } catch (err) {
        console.error(err);
      }
      this.isSearchingProduct = false;
    },
    clearProductSearch() {
      this.productSearchQuery = '';
      this.searchedProduct = {};
      this.draftItem = { quantity: 1, unitPrice: 0, estimatedDeliveryDate: '', isNewProduct: true };
    },
    async addItem() {
      if (!this.searchedProduct.productId || !this.draftItem.quantity) return;
      await this.store.dispatch('purchaseOrder/addItem', {
        orderId: this.orderId,
        item: {
          productId: this.searchedProduct.productId,
          quantity: Number(this.draftItem.quantity),
          unitPrice: Number(this.draftItem.unitPrice || 0),
          estimatedDeliveryDate: this.toTimestamp(this.draftItem.estimatedDeliveryDate),
          isNewProduct: this.draftItem.isNewProduct ? 'Y' : 'N'
        }
      });
      this.clearProductSearch();
      this.showAddItem = false;
    },
    navigateTo(path: string) {
      (document.activeElement as HTMLElement)?.blur?.();
      this.router.push(path);
    },
    navigateToAllocations(allocationView: string, count: any) {
      if (!this.hasAllocationCount(count)) return;
      this.router.push({
        path: `/purchase-orders/${this.orderId}/allocations`,
        query: { allocationView }
      });
    }
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const store = useStore();
    return {
      add,
      businessOutline,
      calendarOutline,
      checkmarkCircle,
      chevronDownOutline,
      closeCircle,
      downloadOutline,
      ellipsisVerticalOutline,
      fitnessOutline,
      gitMergeOutline,
      orderId: route.params.orderId as string,
      refreshOutline,
      router,
      searchOutline,
      shirtOutline,
      store,
      ticketOutline
    };
  }
});
</script>

<style scoped>
.purchase-order-detail-header,
.purchase-order-items-header {
  padding: 16px;
}

.purchase-order-detail-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: stretch;
  padding: 0 16px 24px;
}

.purchase-order-detail-summary ion-card,
.purchase-order-timeline {
  flex: 1 1 320px;
  margin: 0;
}

.purchase-order-items {
  padding: 0 16px 16px;
}

.purchase-order-item-summary-row {
  --columns-tablet: 4;
  --columns-desktop: 5;
}

.purchase-order-item-row {
  --columns-tablet: 4;
  --columns-desktop: 6;
}

@media (max-width: 720px) {
  .purchase-order-detail-header,
  .purchase-order-items-header,
  .purchase-order-detail-summary,
  .purchase-order-items {
    padding-inline-start: 0;
    padding-inline-end: 0;
  }
}
</style>
