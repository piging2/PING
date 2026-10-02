# Connector intel - inventory domain (reference platform: Cin7 Core (DEAR Inventory))

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
Products (SKU, costing method, price tiers), ProductFamilies, Sale/Purchase lists, Stock (location quantities), Customers, Suppliers. REST at https://inventory.dearsystems.com/externalapi/v2/. JSON only.
Sources: https://dearinventory.docs.apiary.io/

## EVENTS
No native webhook push documented for Core API. Change detection via list endpoints with UpdatedDate filters (>, >=). Polling is the integration pattern.
Sources: https://dearinventory.docs.apiary.io/

## CAPABILITIES
Product CRUD, stock queries and adjustments, sale/purchase order lists, customer/supplier records, price tiers. Subset of UI functionality; check endpoint help pages.
Sources: https://dearinventory.docs.apiary.io/

## AUTHORIZATION
Account ID + API Application Key created under Integrations > API in the app. Per-request headers; no OAuth.
Sources: https://dearinventory.docs.apiary.io/#introduction/api-introduction

## WEBHOOKS
No webhook delivery in the Core v2 API per current docs. Design integrations around polling with UpdatedDate filters.
Sources: https://dearinventory.docs.apiary.io/

## POLLING
SaleList/PurchaseList filter UpdatedDate; Products/ProductFamilies filter UpdatedDate (>=). Persist last poll timestamp client-side.
Sources: https://dearinventory.docs.apiary.io/

## RATE-LIMITS
API call limits apply per plan; exceeding returns errors. Verify current values in the docs. Queue requests and retry on network failure.
Sources: https://dearinventory.docs.apiary.io/

## IDEMPOTENCY
No idempotency-key. Stock adjustments are additive; safe retry requires check-before-adjust or tracking adjustment references client-side.
Sources: https://dearinventory.docs.apiary.io/

## EFFECTS
Stock adjustments (real inventory counts), sale/purchase creation, price changes. Reads are side-effect-free.
Sources: https://dearinventory.docs.apiary.io/

## REVERSIBILITY
Stock changes are ledger entries, corrected by offsetting adjustments, not deletion. Product edits overwrite; no version restore via API.
Sources: https://dearinventory.docs.apiary.io/

## PROVENANCE
Product IDs/SKUs stable; LastModifiedOn versions records; sale/purchase lists carry timestamps; location-scoped stock gives per-site lineage.
Sources: https://dearinventory.docs.apiary.io/

