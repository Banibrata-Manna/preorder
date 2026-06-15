<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/purchase-orders/${orderId}`"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ $t("Review allocations") }}</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment :value="allocationView" @ionChange="changeView(String($event.detail.value ?? 'linked'))">
          <ion-segment-button value="linked">
            <ion-label>{{ $t("Linked") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="suggested">
            <ion-label>{{ $t("Suggested") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="all">
            <ion-label>{{ $t("All") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-item lines="none">
        <ion-label>{{ allocations.length }} {{ $t("allocations") }}</ion-label>
        <ion-button v-if="allocationView === 'suggested' && allocations.length > 0" slot="end" fill="outline" @click="linkAllAllocations">
          <ion-icon slot="start" :icon="linkOutline" />
          {{ $t("Link all") }}
        </ion-button>
      </ion-item>

      <ion-item v-if="allocations.length === 0">
        <ion-label>{{ $t("No allocations found") }}</ion-label>
      </ion-item>

      <template v-for="allocation in allocations" :key="`${allocation.orderId}-${allocation.orderItemSeqId}`">
        <!-- Order header row -->
        <div class="list-item allocation-order-header">
          <ion-item lines="full">
            <ion-label>
              <h1><strong>{{ allocation.orderName || allocation.orderId }}</strong></h1>
              <p>{{ allocation.orderId }} &nbsp;·&nbsp; {{ $t("Created on") }} {{ formatDate(allocation.orderDate) }}</p>
            </ion-label>
          </ion-item>
          <ion-badge :color="orderStatusColor(allocation)" class="ion-padding-end">{{ getStatusDesc(allocation.orderStatusId) || allocation.orderStatusId }}</ion-badge>
        </div>

        <!-- Item row -->
        <div class="list-item allocation-item-row">
          <ion-item lines="full">
            <ion-thumbnail slot="start">
              <DxpShopifyImg :src="productImage(allocation)" size="small" />
            </ion-thumbnail>
            <ion-label>
              <h2>{{ itemPrimary(allocation) }}</h2>
              <p>{{ itemSecondary(allocation) }}</p>
            </ion-label>
          </ion-item>
          <div class="tablet ion-text-center">
            <ion-chip outline>
              <ion-icon :icon="allocation.allocationType === 'Linked' ? calendarOutline : businessOutline" />
              <ion-label>{{ allocation.allocationType === 'Linked' ? formatDate(allocation.promisedDatetime) : allocation.facilityId }}</ion-label>
            </ion-chip>
            <ion-label>
              <p>{{ allocation.allocationType === 'Linked' ? $t("promise date") : $t("parking") }}</p>
            </ion-label>
          </div>
          <div class="tablet ion-text-center">
            <template v-if="allocation.allocationType === 'Linked'">
              <ion-button fill="clear" color="primary" :disabled="!poItem(allocation)" @click="syncAllocationEdd(allocation)">
                <ion-icon slot="start" :icon="syncOutline" />
                {{ $t("Sync") }}
              </ion-button>
              <ion-button fill="clear" @click="unlinkAllocation(allocation)">
                <ion-icon slot="start" :icon="linkOutline" />
                {{ $t("Unlink") }}
              </ion-button>
            </template>
            <ion-button v-else fill="clear" color="primary" @click="linkAllocation(allocation)">
              <ion-icon slot="start" :icon="linkOutline" />
              {{ $t("Link") }}
            </ion-button>
          </div>
          <div class="ion-text-center ion-padding-end">
            <ion-badge :color="itemStatusColor(allocation)">{{ getStatusDesc(allocation.itemStatusId) || allocation.itemStatusId }}</ion-badge>
          </div>
        </div>
      </template>
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
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonNote,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonThumbnail,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { businessOutline, calendarOutline, linkOutline, syncOutline } from "ionicons/icons";
import { DateTime } from "luxon";
import { defineComponent } from "vue";
import { mapGetters } from "vuex";
import { useRoute } from "vue-router";
import { useStore } from "@/store";
import { DxpShopifyImg, getProductIdentificationValue, useProductIdentificationStore } from "@hotwax/dxp-components";
import { PurchaseOrderService } from "@/services/PurchaseOrderService";

export default defineComponent({
  name: "purchase-order-allocations",
  components: {
    DxpShopifyImg,
    IonBackButton,
    IonBadge,
    IonButton,
    IonButtons,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonNote,
    IonPage,
    IonSegment,
    IonSegmentButton,
    IonThumbnail,
    IonTitle,
    IonToolbar
  },
  computed: {
    ...mapGetters({
      allocations: 'purchaseOrder/getAllocations',
      allocationView: 'purchaseOrder/getAllocationView',
      selected: 'purchaseOrder/getSelectedAllocations',
      getProduct: 'product/getProduct',
      currentOrder: 'purchaseOrder/getCurrent',
      getStatusDesc: 'util/getStatusDesc'
    }),
    requestedAllocationView(): string {
      const queryValue = this.queryValue(this.route.query.allocationView);
      return ['linked', 'suggested', 'all'].includes(queryValue) ? queryValue : this.allocationView || 'linked';
    },
    requestedProductId(): string {
      return this.queryValue(this.route.query.productId);
    }
  },
  ionViewWillEnter() {
    this.store.dispatch('util/getOrderStatusDesc');
    this.fetchAllocations(this.requestedAllocationView);
  },
  methods: {
    async fetchAllocations(allocationView = 'linked') {
      await this.store.dispatch('purchaseOrder/fetchAllocations', {
        orderId: this.orderId,
        allocationView,
        productId: this.requestedProductId
      });
    },
    changeView(view: string) {
      this.fetchAllocations(String(view || 'linked'));
    },
    queryValue(value: any) {
      const queryValue = Array.isArray(value) ? value.find(Boolean) : value;
      return queryValue ? String(queryValue) : '';
    },
    parseDate(value: any) {
      if (!value || ['null', 'undefined'].includes(String(value))) return null;
      if (typeof value === 'number' || /^\d+$/.test(String(value))) {
        const d = DateTime.fromMillis(Number(value));
        return d.isValid ? d : null;
      }
      const isoDate = DateTime.fromISO(String(value));
      const sqlDate = DateTime.fromSQL(String(value));
      const parsed = isoDate.isValid ? isoDate : sqlDate;
      return parsed.isValid ? parsed : null;
    },
    formatDate(value: any) {
      return this.parseDate(value)?.toFormat('d LLL yyyy') || '-';
    },
    productImage(allocation: any) {
      const cached = this.getProduct(allocation.productId) || {};
      return cached.mainImageUrl || cached.mediumImageUrl || '';
    },
    itemPrimary(allocation: any) {
      const cached = this.getProduct(allocation.productId) || {};
      return getProductIdentificationValue(this.productIdentificationPref.primaryId, cached) || cached.productName || allocation.productId;
    },
    itemSecondary(allocation: any) {
      const cached = this.getProduct(allocation.productId) || {};
      return getProductIdentificationValue(this.productIdentificationPref.secondaryId, cached) || cached.internalName || allocation.orderItemSeqId;
    },
    orderStatusColor(allocation: any) {
      const s = String(allocation.orderStatusId || '');
      if (s.includes('APPROVED')) return 'success';
      if (s.includes('CANCELLED')) return 'danger';
      if (s.includes('COMPLETED')) return 'medium';
      return 'primary';
    },
    itemStatusColor(allocation: any) {
      const s = String(allocation.itemStatusId || '');
      if (s.includes('APPROVED')) return 'success';
      if (s.includes('CANCELLED')) return 'danger';
      if (s.includes('COMPLETED')) return 'medium';
      return 'primary';
    },
    async linkAllocation(allocation: any) {
      try {
        await PurchaseOrderService.assignPOItemsToSOItems(this.orderId, allocation.productId, allocation.orderId)
        await this.fetchAllocations(this.allocationView)
      } catch (error) {
        console.error(error)
      }
    },
    async linkAllAllocations() {
      try {
        const productIds = [...new Set((this.allocations as any[]).map((a: any) => a.productId).filter(Boolean))]
        await Promise.all(productIds.map((productId: string) =>
          PurchaseOrderService.assignPOItemsToSOItems(this.orderId, productId)
        ))
        await this.fetchAllocations(this.allocationView)
      } catch (error) {
        console.error(error)
      }
    },
    poItem(allocation: any) {
      const items: any[] = this.currentOrder?.items || [];
      return items.find((i: any) => i.productId === allocation.productId);
    },
    async syncAllocationEdd(allocation: any) {
      const poItem = this.poItem(allocation);
      if (!poItem) return;
      const success = await this.store.dispatch('purchaseOrder/syncItemDeliveryDate', {
        orderId: this.orderId,
        orderItemSeqId: poItem.orderItemSeqId,
        soOrderId: allocation.orderId,
        soOrderItemSeqId: allocation.orderItemSeqId
      });
      if (success !== false) await this.fetchAllocations(this.allocationView);
    },
    async unlinkAllocation(allocation: any) {
      const alert = await alertController.create({
        header: this.$t("Unlink allocation"),
        message: this.$t("Are you sure you want to unlink this sales order from the purchase order?"),
        buttons: [
          { text: this.$t("Cancel") },
          {
            text: this.$t("Confirm"),
            handler: async () => {
              try {
                await PurchaseOrderService.deletePOAllocation(
                  this.orderId,
                  allocation.orderId,
                  allocation.orderItemSeqId
                )
                await this.fetchAllocations(this.allocationView)
              } catch (error) {
                console.error(error)
              }
            }
          }
        ]
      });
      return alert.present();
    }
  },
  setup() {
    const route = useRoute();
    const store = useStore();
    const productIdentificationStore = useProductIdentificationStore();
    const productIdentificationPref = productIdentificationStore.getProductIdentificationPref;
    return {
      businessOutline,
      calendarOutline,
      linkOutline,
      syncOutline,
      orderId: route.params.orderId as string,
      productIdentificationPref,
      route,
      store
    };
  }
});
</script>

<style scoped>
.allocation-order-header {
  --columns-tablet: 2;
  --columns-desktop: 2;
}

.allocation-item-row {
  --columns-tablet: 3;
  --columns-desktop: 4;
  padding-inline-start: 16px;
}
</style>
