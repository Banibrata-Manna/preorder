# Purchase Order UI Review Handoff

## Scope

This branch is now a UI-only purchase-order management preview for the standalone preorder Ionic Vue app.

It intentionally excludes:

- Login flow changes.
- Backend API contracts.
- Database writes.
- Server-side purchase-order services.
- Legacy OFBiz controller integration.

All purchase-order data in this PR is local fixture data under `src/store/modules/purchaseOrder/mockData.ts`.

## Target Repo

- UI: `/Users/adityapatel/Documents/GitHub/preorder`
- UI worktree: `/Users/adityapatel/.config/superpowers/worktrees/preorder/preorder-purchase-orders-ui`
- UI branch: `codex/preorder-purchase-orders-ui`

## Reference Only

- Legacy screens:
  - `FindPO`
  - `ViewOrder?orderId=11516`
  - `ViewOrder?orderId=11519`
  - `ReviewAllocations?ff_correspondingPoId=11516`
  - Warehouse receive screens through incoming shipment flow.
- Figma:
  - HC Ionic design system PO list/grouping section.
  - HC Ionic design system PO detail section.
- Reference UI patterns:
  - `/Users/adityapatel/Documents/GitHub/transfers`

## UI Routes

- `/purchase-orders`
- `/purchase-orders/new`
- `/purchase-orders/:orderId`
- `/purchase-orders/:orderId/allocations`

## UI Files

- Menu and permissions:
  - `src/components/Menu.vue`
  - `src/authorization/Actions.ts`
  - `src/authorization/Rules.ts`
- Routes:
  - `src/router/index.ts`
- Store:
  - `src/store/modules/purchaseOrder/*`
  - `src/store/index.ts`
  - `src/store/RootState.ts`
- Views:
  - `src/views/purchase-orders.vue`
  - `src/views/purchase-order-detail.vue`
  - `src/views/purchase-order-create.vue`
  - `src/views/purchase-order-allocations.vue`

## Fixture Behavior

- Find page supports keyword, status filters, arrival date filters, grouping, sorting, refresh, CSV export, and pagination shape.
- Detail page supports local-only status, item quantity, arrival date, add item, remove item, receive, and allocation navigation interactions.
- Create page creates an in-memory purchase order and routes to its detail page.
- Allocations page shows fixture allocation rows and supports local-only selection/removal.

## Known Gaps

- This is not functional purchase-order management yet; the screens are fixture-backed UI scaffolding.
- Detail page can still enter an infinite loading state in some flows and needs follow-up before real API integration.
- Backend read/write contracts are intentionally absent from this PR.

## Review Checklist

- No preorder login changes remain.
- No purchase-order network service remains.
- No purchase-order backend endpoint assumptions remain in code.
- New UI remains Ionic-first and mobile compatible.
- No `ion-grid`, `ion-row`, or `ion-col`.
- Any CSS in new PO views must remain layout-only.
- UI structure should be cross-checked against the Figma PO list/grouping and detail designs.
