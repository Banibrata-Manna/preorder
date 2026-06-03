<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>{{ $t("Purchase Orders") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="filters-bar">
        <ion-searchbar
          :placeholder="$t('Search purchase orders')"
          v-model="queryString"
          @keyup.enter="searchPurchaseOrders()"
        ></ion-searchbar>
        <div class="filter-separator"></div>
        <div class="filter-group">
          <ion-icon :icon="documentTextOutline" />
          <ion-label>{{ $t("Group by") }}</ion-label>
          <ion-select v-model="groupBy" interface="popover">
            <ion-select-option value="orderItem">{{ $t("Order item") }}</ion-select-option>
          </ion-select>
        </div>
        <div class="filter-separator"></div>
        <div class="filter-group">
          <ion-icon :icon="swapVerticalOutline" />
          <ion-label>{{ $t("Sort by") }}</ion-label>
          <ion-label class="ion-margin-start bold">{{ $t("Arrival date") }}</ion-label>
          <ion-button fill="clear" size="small" @click="toggleSortOrder">
            <ion-icon :icon="sortAscending ? arrowUp : arrowDown" slot="icon-only" />
          </ion-button>
        </div>
      </div>
      <div class="empty-state" v-if="!purchaseOrders.length">
        <p>{{ $t("No purchase orders found.") }}</p>
      </div>

      <ion-list v-else>
        <ion-item v-for="order in purchaseOrders" :key="order.id">
          <ion-label>
            <h2>{{ order.id }}</h2>
            <p>{{ order.name }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonPage,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import { defineComponent, ref } from "vue";
import { arrowDown, arrowUp, documentTextOutline, swapVerticalOutline } from "ionicons/icons";

export default defineComponent({
  name: "PurchaseOrders",
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonMenuButton,
    IonPage,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
  },
  setup() {
    const purchaseOrders = ref([] as any[]);
    const queryString = ref("");
    const groupBy = ref("orderItem");
    const sortAscending = ref(true);

    function searchPurchaseOrders() {
      // TODO: implement search
    }

    function toggleSortOrder() {
      sortAscending.value = !sortAscending.value;
    }

    return {
      arrowDown,
      arrowUp,
      documentTextOutline,
      groupBy,
      purchaseOrders,
      queryString,
      searchPurchaseOrders,
      sortAscending,
      swapVerticalOutline,
      toggleSortOrder,
    };
  },
});
</script>

<style scoped>
.filters-bar {
  display: flex;
  align-items: center;
  padding: 16px var(--ion-padding, 16px) 0;
}

.filters-bar ion-searchbar {
  flex: 1;
  padding: 0;
}

.filter-separator {
  width: 1px;
  height: 32px;
  background: var(--ion-color-medium);
  margin: 0 12px;
  flex-shrink: 0;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.filter-group .bold {
  font-weight: bold;
}
</style>
