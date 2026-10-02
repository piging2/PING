# Connector intel - payroll domain (reference platform: Gusto)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
REST at https://api.gusto.com/v1. Companies, employees (uuid), employments, compensations, payrolls, pay periods, benefits, time off, contractors. UUID primary keys throughout.
Sources: https://docs.gusto.com/app-integrations/v2024-03-01/docs/api-tokens ; https://embedded.gusto.com/product/payroll-api

## EVENTS
Webhooks for payroll and employee lifecycle events (per Gusto embedded docs). Event catalog is product-tier dependent; verify the current list in the docs.
Sources: https://docs.gusto.com/app-integrations/v2024-03-01/docs/api-tokens

## CAPABILITIES
Company/employee CRUD, run payroll, off-cycle payrolls, contractor payments, benefits enrollment, time-off policies. Payroll runs are stateful (draft -> submitted -> processed).
Sources: https://embedded.gusto.com/product/payroll-api

## AUTHORIZATION
OAuth 2.0 for app integrations; API tokens per company. Scopes gate product areas.
Sources: https://docs.gusto.com/app-integrations/v2024-03-01/docs/api-tokens

## WEBHOOKS
HTTPS endpoints receive signed event payloads for subscribed topics. Verify the signing scheme in the current docs before implementing verification.
Sources: https://docs.gusto.com/app-integrations/v2024-03-01/docs/api-tokens

## POLLING
List endpoints with pagination; payrolls filtered by processed status and date. Track updated_at high-water marks per resource.
Sources: https://embedded.gusto.com/product/payroll-api

## RATE-LIMITS
Rate limits published in Gusto developer documentation; exceeding returns 429. Verify current values in the docs before hard-coding.
Sources: https://docs.gusto.com/app-integrations/v2024-03-01/docs/api-tokens

## IDEMPOTENCY
No documented idempotency-key on payroll writes. Payroll state machine (draft first, then submit) is the safe pattern: create draft, verify, then submit.
Sources: https://embedded.gusto.com/product/payroll-api

## EFFECTS
Payroll submission moves real money and files taxes. Employee changes affect compliance. Reads are side-effect-free.
Sources: https://embedded.gusto.com/product/payroll-api

## REVERSIBILITY
Submitted payrolls have cancellation windows; after processing, corrections go through subsequent payrolls. Employee records support termination, not deletion of history.
Sources: https://embedded.gusto.com/product/payroll-api

## PROVENANCE
UUIDs stable; versioned API (v2024-03-01); payroll objects carry processed flags and timestamps; employee history preserved across employments.
Sources: https://docs.gusto.com/app-integrations/v2024-03-01/docs/api-tokens

