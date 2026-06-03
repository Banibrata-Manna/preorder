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
        <ion-segment :value="allocationView" @ionChange="changeView($event.detail.value)">
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
      <ion-list>
        <ion-item lines="none">
          <ion-label>{{ allocations.length }} {{ $t("allocations") }}</ion-label>
          <ion-button slot="end" fill="outline" :disabled="selected.length === 0" @click="removeSelected">
            <ion-icon slot="start" :icon="trashOutline" />
            {{ $t("Remove") }}
          </ion-button>
        </ion-item>
        <ion-item v-if="allocations.length === 0">
          <ion-label>{{ $t("No allocations found") }}</ion-label>
        </ion-item>
        <ion-card v-for="allocation in allocations" :key="`${allocation.orderId}-${allocation.orderItemSeqId}`">
          <ion-item lines="full">
            <ion-checkbox
              slot="start"
              :model-value="isSelected(allocation)"
              @ionChange="toggleAllocation(allocation, $event.detail.checked)">
            </ion-checkbox>
            <ion-label>
              <h2>{{ allocation.orderName || allocation.orderId }}</h2>
              <p>{{ allocation.productId }} · {{ allocation.orderItemSeqId }}</p>
            </ion-label>
            <ion-badge slot="end">{{ allocation.allocationType }}</ion-badge>
          </ion-item>
          <ion-list>
            <ion-item lines="none">
              <ion-label>{{ $t("Status") }}</ion-label>
              <ion-note slot="end">{{ allocation.itemStatusDesc || allocation.statusId }}</ion-note>
            </ion-item>
            <ion-item lines="none">
              <ion-label>{{ $t("Promised date") }}</ion-label>
              <ion-note slot="end">{{ formatDate(allocation.promisedDatetime) }}</ion-note>
            </ion-item>
            <ion-item lines="none">
              <ion-label>{{ $t("Facility") }}</ion-label>
              <ion-note slot="end">{{ allocation.facilityId || '-' }}</ion-note>
            </ion-item>
            <ion-item lines="none">
              <ion-label>{{ $t("Shipping method") }}</ion-label>
              <ion-note slot="end">{{ allocation.shipmentMethodTypeId || '-' }}</ion-note>
            </ion-item>
          </ion-list>
        </ion-card>
      </ion-list>
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
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { trashOutline } from "ionicons/icons";
import { DateTime } from "luxon";
import { defineComponent } from "vue";
import { mapGetters } from "vuex";
import { useRoute } from "vue-router";
import { useStore } from "@/store";

export default defineComponent({
  name: "purchase-order-allocations",
  components: {
    IonBackButton,
    IonBadge,
    IonButton,
    IonButtons,
    IonCard,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonPage,
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToolbar
  },
  computed: {
    ...mapGetters({
      allocations: 'purchaseOrder/getAllocations',
      allocationView: 'purchaseOrder/getAllocationView',
      selected: 'purchaseOrder/getSelectedAllocations'
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
      this.store.dispatch('purchaseOrder/updateSelectedAllocations', { items: [] });
      this.fetchAllocations(String(view || 'linked'));
    },
    queryValue(value: any) {
      const queryValue = Array.isArray(value) ? value.find(Boolean) : value;
      return queryValue ? String(queryValue) : '';
    },
    isSelected(allocation: any) {
      return this.selected.some((item: any) => item.orderId === allocation.orderId && item.orderItemSeqId === allocation.orderItemSeqId);
    },
    toggleAllocation(allocation: any, checked: boolean) {
      const next = checked
        ? this.selected.concat(allocation)
        : this.selected.filter((item: any) => item.orderId !== allocation.orderId || item.orderItemSeqId !== allocation.orderItemSeqId);
      this.store.dispatch('purchaseOrder/updateSelectedAllocations', { items: next });
    },
    parseDate(value: string) {
      if (!value || ['null', 'undefined'].includes(String(value))) return null;
      const isoDate = DateTime.fromISO(String(value));
      const sqlDate = DateTime.fromSQL(String(value));
      const parsedDate = isoDate.isValid ? isoDate : sqlDate;
      return parsedDate.isValid ? parsedDate : null;
    },
    formatDate(value: string) {
      return this.parseDate(value)?.toFormat('yyyy-MM-dd') || '-';
    },
    async removeSelected() {
      const alert = await alertController.create({
        header: this.$t("Remove allocations"),
        message: this.$t("Are you sure you want to remove the selected purchase order allocations?"),
        buttons: [
          { text: this.$t("Cancel") },
          {
            text: this.$t("Confirm"),
            handler: () => this.store.dispatch('purchaseOrder/removeAllocations', { orderId: this.orderId })
          }
        ]
      });
      return alert.present();
    }
  },
  setup() {
    const route = useRoute();
    const store = useStore();
    return {
      orderId: route.params.orderId as string,
      route,
      store,
      trashOutline
    };
  }
});
</script>
