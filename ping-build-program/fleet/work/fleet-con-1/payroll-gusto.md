# Connector intel — Payroll domain (reference platform: Gusto)

Mapped from public docs; implementation stays data-driven. Provider: Gusto.
API surface: https://api.gusto.com/v1/... (embedded-payroll reference: docs.gusto.com)

## OBJECTS
Companies, Employees (profile, compensations, home/work addresses, state+federal
taxes, onboarding_status, custom fields), Payrolls (payroll runs), Pay Stubs,
Benefits, Time Off, Contractors, Tax documents/filings. Employee list per company:
GET /v1/companies/{companyId}/employees; employee CRUD via /v1/employees/{id}
plus sub-resources (compensations, addresses, state_taxes, federal_taxes).
Sources: https://github.com/gusto/embedded-react-sdk/blob/HEAD/docs/guides/endpoint-reference.md ;
https://embedded.gusto.com/product/payroll-api

## EVENTS
Webhook subscriptions exist (managed via API at org level): event types around
company/employee/payroll lifecycle (e.g. employee.created/updated, payroll
processed). No single canonical public event-type list was retrieved this pass;
verify against docs.gusto.com webhooks reference before implementation.
Change detection alternative: employee/payroll list polling with updated filters.
Sources: https://docs.gusto.com/app-integrations/v2024-03-01/docs/api-tokens
(API tokens used for org-level endpoints including webhooks);
https://www.merge.dev/blog/how-to-fetch-employees-from-gusto-with-merge-hris-unified-api-using-python

## CAPABILITIES
Onboard companies and employees, update employee profile/compensation/taxes/
addresses, manage onboarding status, run payroll (payroll runs, pay stubs),
benefits enrollment, time-off, contractor payments, tax filings. Org-level
(company creation, webhook subscription) uses API tokens; company/employee-level
data requires OAuth access tokens.
Sources: https://embedded.gusto.com/product/payroll-api ;
https://github.com/gusto/embedded-react-sdk/blob/HEAD/docs/guides/endpoint-reference.md

## AUTHORIZATION
OAuth 2.0: POST https://api.gusto.com/oauth/token (client_id/secret) for
access_token + refresh_token; Bearer <redacted> on subsequent calls. Two credential
tiers: API tokens (org-level endpoints: company creation, webhooks management —
`Authorization: Token <token>` scheme, certified partners) vs OAuth access tokens
(company/employee-level data). Request smallest scope set; PII/PHI-adjacent
payroll data is highly sensitive — standing rule 1 applies doubly.
Sources: https://docs.gusto.com/app-integrations/v2024-03-01/docs/api-tokens ;
https://www.merge.dev/blog/how-to-fetch-employees-from-gusto-with-merge-hris-unified-api-using-python

## WEBHOOKS
Subscription management via API at org level (API token auth). Deliveries are
HTTPS POSTs; signature-verification mechanism documented in Gusto webhooks
reference — VERIFY against docs.gusto.com before implementing (not asserted here).
Retry/backoff behavior per Gusto docs; implement endpoint idempotency by event id.
Source: https://docs.gusto.com/app-integrations/v2024-03-01/docs/api-tokens

## POLLING
Employee lists paginate via page parameter (empty page = end); include=
all_compensations,custom_fields. Payroll runs listable per company. Polling
cadence must respect unpublished rate limits — backoff on 429 and keep volumes
modest (payroll data changes infrequently; webhooks-first where available).
Source: https://www.merge.dev/blog/how-to-fetch-employees-from-gusto-with-merge-hris-unified-api-using-python

## RATE LIMITS
Gusto does NOT publish numeric rate limits in the retrieved public docs. Shape:
expect HTTP 429 on exceed; implement exponential backoff + modest polling
cadence. Do NOT invent numbers. Followup: confirm current limits/throttle
behavior in docs.gusto.com rate-limit section at implementation time.
Sources: none retrieved with numeric limits — documented as unpublished
(see https://apitracker.io/a/gusto "API rate limits" entry present but no value).

## IDEMPOTENCY
No native idempotency-key header documented in retrieved sources. Payroll runs
are the dangerous retry surface (a duplicate payroll run pays people twice):
mitigate via read-before-run checks (list payroll runs, dedupe by pay period)
and provider-side duplicate-run guards where documented. Followup: verify
Gusto's duplicate-payroll-run behavior in current docs.
Sources: CAPABILITIES citations.

## EFFECTS
Running payroll moves real money (direct deposits), files taxes, enrolls
benefits. Writes are high-stakes financial actions with legal/tax consequences.
Reads (employees, payrolls, stubs, filings) side-effect-free. Connector contract
must gate payroll-run actions behind explicit policy + human approval (T lane).

## REVERSIBILITY
Payroll runs, once processed, move money and create tax obligations: effectively
irreversible; corrections happen via off-cycle/correction payrolls, not un-run.
Employee record edits are reversible (update API); terminations are business
events, not technical deletes. Model payroll as append-only financial facts.
Source: CAPABILITIES citations (embedded payroll semantics).

## PROVENANCE
Employee/payroll resources carry uuid identifiers, created/updated timestamps,
and versioned state (onboarding_status, payroll run states). Payroll runs are
auditable financial events with per-employee pay stubs. Webhook events identify
resource + type. Sufficient for SOURCE -> OBSERVATION -> EVIDENCE lineage;
financial-grade audit expectations (SOC 2 Type II per Gusto).
Sources: https://embedded.gusto.com/product/payroll-api ;
https://github.com/gusto/embedded-react-sdk/blob/HEAD/docs/guides/endpoint-reference.md
