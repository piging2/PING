# Connector intel — HR domain (reference platform: BambooHR)

Mapped from public docs; implementation stays data-driven. Provider: BambooHR.
Base: https://api.bamboohr.com/api/gateway.php/{companyDomain}/v1/
Auth: HTTP Basic, API key as username, any non-empty string as password.

## OBJECTS
Employees (id, firstName, lastName, workEmail, jobTitle, department, ...),
directory, custom fields, tables (job history, compensation, dependents,
emergency contacts), time-off requests, who-is-out. Field names are account-
specific for custom fields — must be discovered per customer via the fields
endpoint, never hardcoded. Defaults to XML unless Accept: application/json.
Sources: https://github.com/tryfractal/registry/blob/HEAD/skills/bamboohr/SKILL.md ;
https://github.com/pauldx/claudifying/blob/HEAD/plugins/saas-packs/bamboohr-pack/skills/bamboohr-common-errors/SKILL.md

## EVENTS
Native webhook support is LIMITED: BambooHR can push notifications for some
events (time-off requests, some employee data changes), configured in the
BambooHR admin UI, not programmatically via API — coverage narrower than modern
HRIS platforms. Production pattern: poll GET /v1/employees/changed?since={ISO8601}
for incremental employee changes, and /v1/employees/changed/tables/{table}?since=
for table data (job/comp history). Third parties offer "virtual webhooks"
(poll-and-push) to fill the gap.
Source: http://getknit.dev/blog/how-to-get-employee-data-from-bamboohr-api/
(webhooks limited; changed-employees incremental endpoints)

## CAPABILITIES
Employee CRUD, directory reads, custom field reads/writes, table row append
(dependents etc.), custom reports (batch reads), time-off request create/approve/
deny, who-is-out. Field-level permissions: API key is scoped to a real user —
fields the user cannot see in the UI are not returned (do not retry missing
fields; surface the gap). Read-only-by-default discipline recommended.
Sources: https://github.com/tryfractal/registry/blob/HEAD/skills/bamboohr/SKILL.md ;
http://getknit.dev/blog/how-to-get-employee-data-from-bamboohr-api/

## AUTHORIZATION
API key via HTTP Basic auth (key as username). Key is tied to a BambooHR user;
the API inherits that user's field-level permissions. No OAuth documented for
this surface in retrieved sources. Key rotation via BambooHR UI. Treat the key
as a credential (standing rule 1); never log it.
Sources: https://github.com/tryfractal/registry/blob/HEAD/skills/bamboohr/SKILL.md ;
https://github.com/pauldx/claudifying/blob/HEAD/plugins/saas-packs/bamboohr-pack/skills/bamboohr-common-errors/SKILL.md

## WEBHOOKS
Limited native support: some event notifications (time-off, select employee
changes), configured in admin UI, no programmatic subscription API in retrieved
docs. Production integrations use polling (changed-since endpoints) or
poll-and-push "virtual webhooks". Verify current coverage in BambooHR's webhook
docs before promising realtime coverage.
Source: http://getknit.dev/blog/how-to-get-employee-data-from-bamboohr-api/

## POLLING
GET /v1/employees/changed?since={ISO8601} — returns only changed employees
(avoid full re-fetch); per-table variants for history tables. Custom reports for
batch reads instead of per-employee GETs; cache directory results. Watermark =
timestamp; no cursor pagination contract published for the changed endpoints in
retrieved docs — verify.
Source: http://getknit.dev/blog/how-to-get-employee-data-from-bamboohr-api/ ;
https://github.com/pauldx/claudifying/blob/HEAD/plugins/saas-packs/bamboohr-pack/skills/bamboohr-common-errors/SKILL.md

## RATE LIMITS
BambooHR does NOT publish exact thresholds; enforced per API key. In practice
~100 requests/minute per API key; exceeding returns HTTP 503 Service Unavailable
with Retry-After header (NOT 429). Treat 503 as the throttle signal; exponential
backoff; prefer changed-since incremental and custom reports to stay well under.
Sources: http://getknit.dev/blog/how-to-get-employee-data-from-bamboohr-api/ ;
https://github.com/pauldx/claudifying/blob/HEAD/plugins/saas-packs/bamboohr-pack/skills/bamboohr-common-errors/SKILL.md

## IDEMPOTENCY
No native idempotency-key header documented. Writes keyed by numeric employeeId
(updates are naturally idempotent); creates of time-off requests are the retry-
hazard — mitigate via who-is-out/existing-request checks before create.
Source: CAPABILITIES citations.

## EFFECTS
Writes update HR records, create/approve/deny time-off, terminate employees.
Time-off approvals and terminations have real HR/legal consequences. Reads
(directory, reports, changed-since) side-effect-free.

## REVERSIBILITY
Employee updates reversible via update API; time-off approvals deniable;
terminations are business events with downstream consequences (offboarding) —
re-hire is a new event, not an un-terminate. No documented undelete/restore API
in retrieved sources; treat deletes as effectively irreversible. Followup:
confirm record-restore behavior in current BambooHR docs.

## PROVENANCE
Employees keyed by numeric employeeId; changed-since responses identify what
changed; tables carry row-level history (job/compensation history). API key ->
user attribution for writes is available in BambooHR's UI audit views (not
documented as API-readable in retrieved sources). Sufficient for basic lineage;
audit-depth lineage needs the UI or followup docs.
Sources: http://getknit.dev/blog/how-to-get-employee-data-from-bamboohr-api/
