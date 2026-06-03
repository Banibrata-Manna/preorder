<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/purchase-orders"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ $t("New purchase order") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="createOrder">
            <ion-icon slot="start" :icon="saveOutline" />
            {{ $t("Save") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-list-header>
          <ion-label>{{ $t("Header") }}</ion-label>
        </ion-list-header>
        <ion-item>
          <ion-label>{{ $t("Order name") }}</ion-label>
          <ion-input slot="end" v-model="form.orderName" />
        </ion-item>
        <ion-item>
          <ion-label>{{ $t("External ID") }}</ion-label>
          <ion-input slot="end" v-model="form.externalId" />
        </ion-item>
        <ion-item>
          <ion-label>{{ $t("Product Store") }}</ion-label>
          <ion-input slot="end" v-model="form.productStoreId" />
        </ion-item>
        <ion-item>
          <ion-label>{{ $t("Facility") }}</ion-label>
          <ion-input slot="end" v-model="form.facilityId" />
        </ion-item>
        <ion-item>
          <ion-label>{{ $t("Receiving facility") }}</ion-label>
          <ion-input slot="end" v-model="form.orderFacilityId" />
        </ion-item>
        <ion-item>
          <ion-label>{{ $t("Arrival") }}</ion-label>
          <ion-input slot="end" type="date" v-model="form.estimatedDeliveryDate" />
        </ion-item>
      </ion-list>

      <ion-list>
        <ion-list-header>
          <ion-label>{{ $t("First item") }}</ion-label>
        </ion-list-header>
        <ion-item>
          <ion-label>{{ $t("Product") }}</ion-label>
          <ion-input slot="end" v-model="form.productId" />
        </ion-item>
        <ion-item>
          <ion-label>{{ $t("Quantity") }}</ion-label>
          <ion-input slot="end" type="number" v-model="form.quantity" />
        </ion-item>
        <ion-item>
          <ion-label>{{ $t("Unit price") }}</ion-label>
          <ion-input slot="end" type="number" v-model="form.unitPrice" />
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { saveOutline } from "ionicons/icons";
import { defineComponent } from "vue";
import { mapGetters } from "vuex";
import { useRouter } from "vue-router";
import { useStore } from "@/store";
import { showToast } from "@/utils";

export default defineComponent({
  name: "purchase-order-create",
  components: {
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonPage,
    IonTitle,
    IonToolbar
  },
  data() {
    return {
      form: {
        orderName: '',
        externalId: '',
        productStoreId: '',
        facilityId: '',
        orderFacilityId: '',
        estimatedDeliveryDate: '',
        productId: '',
        quantity: 1,
        unitPrice: 0
      }
    }
  },
  computed: {
    ...mapGetters({
      currentEComStore: 'user/getCurrentEComStore'
    })
  },
  ionViewWillEnter() {
    if (!this.form.productStoreId) this.form.productStoreId = this.currentEComStore?.productStoreId || '';
  },
  methods: {
    toTimestamp(value: string) {
      return value ? `${value} 00:00:00.000` : '';
    },
    async createOrder() {
      if (!this.form.productId || !this.form.facilityId) {
        showToast(this.$t("Product and facility are required"));
        return;
      }
      const payload = {
        orderName: this.form.orderName || undefined,
        externalId: this.form.externalId || undefined,
        productStoreId: this.form.productStoreId || undefined,
        statusId: 'ORDER_CREATED',
        shipGroups: [{
          facilityId: this.form.facilityId,
          orderFacilityId: this.form.orderFacilityId || this.form.facilityId,
          estimatedDeliveryDate: this.toTimestamp(this.form.estimatedDeliveryDate),
          items: [{
            productId: this.form.productId,
            quantity: Number(this.form.quantity || 1),
            availableToPromise: Number(this.form.quantity || 1),
            unitPrice: Number(this.form.unitPrice || 0),
            estimatedDeliveryDate: this.toTimestamp(this.form.estimatedDeliveryDate)
          }]
        }]
      };
      const resp = await this.store.dispatch('purchaseOrder/createPurchaseOrder', { payload });
      const orderId = resp?.data?.orderId;
      if (orderId) this.router.push(`/purchase-orders/${orderId}`);
    }
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    return {
      router,
      saveOutline,
      store
    };
  }
});
</script>
