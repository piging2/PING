# Connector intel - field-service domain (reference platform: Jobber)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
Clients, Properties, Jobs (lineItems, totals), Visits (scheduled work), Quotes, Invoices, Payments, Requests. GraphQL at https://api.getjobber.com/api/graphql with version header X-JOBBER-GRAPHQL-VERSION.
Sources: https://developer.getjobber.com/docs/

## EVENTS
Webhook topics: CLIENT_CREATE/UPDATE, JOB_CREATE/UPDATE, INVOICE_UPDATE/PAID, VISIT_COMPLETE/UPDATE. Payload shape: { data: { webHookEvent: { topic, appId, accountId, itemId, occurredAt } } }.
Sources: https://developer.getjobber.com/docs/using_jobbers_api/setting_up_webhooks/

## CAPABILITIES
Client/job/visit/quote/invoice CRUD via GraphQL mutations, scheduling visits, completing visits, sending invoices, recording payments, closing jobs.
Sources: https://developer.getjobber.com/docs/

## AUTHORIZATION
OAuth 2.0 (client ID/secret from Developer Center; scopes configured in the app, not passed as scope param). Short-lived access tokens with refresh rotation.
Sources: https://developer.getjobber.com/docs/

## WEBHOOKS
Webhook endpoints created via API with URL + topics. Signed HMAC-SHA256 (base64) in x-jobber-hmac-sha256 using the OAuth client_secret as key; includes subscription verification handshake. At-least-once delivery.
Sources: https://developer.getjobber.com/docs/using_jobbers_api/setting_up_webhooks/

## POLLING
GraphQL queries with first/after pagination and sort/filter (e.g. clients sort CREATED_AT DESC, invoices filter invoiceStatus). No cursor-based sync feed.
Sources: https://developer.getjobber.com/docs/

## RATE-LIMITS
Rate limits documented in Jobber developer docs (cost-based limits on GraphQL). Verify current values in the docs; back off on throttling errors.
Sources: https://developer.getjobber.com/docs/

## IDEMPOTENCY
No idempotency-key on mutations. Check-before-create by client email/phone; job creates are not naturally idempotent. Track created IDs client-side.
Sources: https://developer.getjobber.com/docs/

## EFFECTS
Creating jobs/visits (scheduling real work), sending invoices, recording payments, client creation. Reads are side-effect-free.
Sources: https://developer.getjobber.com/docs/

## REVERSIBILITY
Visits can be unscheduled; jobs closable; invoices voidable. Payments recorded in error need correcting entries; no un-send of sent invoices.
Sources: https://developer.getjobber.com/docs/

## PROVENANCE
Global encoded IDs (Z2lkOi8vSm9iYmVyL...) stable; occurredAt on webhook events; accountId scopes multi-account apps; line item history on jobs.
Sources: https://developer.getjobber.com/docs/

