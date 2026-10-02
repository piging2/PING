# Connector intel — Ticketing domain (reference platform: Zendesk Support)

Mapped from public docs; implementation stays data-driven. Provider: Zendesk.
REST API v2, base https://{subdomain}.zendesk.com/api/v2/.

## OBJECTS
Tickets (CRUD + bulk create_many/update_many/show_many), Users
(end-users/agents/admins), Organizations, Groups, Comments + Ticket Audits,
SLA Policies, Satisfaction Ratings, Tags, Views, Macros, Ticket Fields
(custom fields). Ticket lifecycle: new -> open -> pending -> hold -> solved ->
closed. Subdomain-scoped base URL. Uniform JSON with cursor pagination
(page[size] max 100, links.next) for modern endpoints; legacy offset capped at
100 pages / 10,000 records.
Sources: https://github.com/mimicailab/mimic/issues/32 ;
https://github.com/rust-works/omni-dev/issues/894 (Zendesk research summary,
citing https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/ ;
https://developer.zendesk.com/api-reference/introduction/pagination/)

## EVENTS
First-class change stream: Incremental Ticket Export
(GET /api/v2/incremental/tickets.json?start_time=, cursor-keyed) tracks changes
by generated_timestamp, which Zendesk bumps on EVERY ticket change (automation/
macro/system-driven included) — use this, not search/export, for incremental
sync. Search/export endpoints are search-index-served (eventual consistency
~minutes, 1,000 results/query cap). Pair with deleted_tickets stream; search
excludes deleted tickets.
Sources: https://github.com/teradata/airbyte/blob/HEAD/docs/integrations/sources/zendesk-support.md ;
https://github.com/constructorfabric/insight/blob/HEAD/docs/components/connectors/support/zendesk/zendesk.md

## CAPABILITIES
Ticket CRUD + bulk (create_many/update_many/destroy_many/permanently_delete
_many), merge, mark_as_spam; user/org CRUD; comments create (public/private);
search API (Lucene-ish, type:ticket status:open, field filters); side-loading
(?include=users,groups,organizations,brands,slas); views list tickets; macros
apply. Incremental export (tickets/users/orgs) is the canonical read surface
for sync.
Sources: https://github.com/rust-works/omni-dev/issues/894 ;
https://github.com/ina654321/awesome-skills/blob/HEAD/skills/tools/enterprise/zendesk-expert/SKILL.md

## AUTHORIZATION
Three modes: API token (Basic auth "email/token:token"), OAuth 2.0 bearer
tokens for marketplace/custom apps, legacy basic-with-password (discouraged).
Rate limits apply per API token / OAuth app (not per IP). Audit logs available
(90 days Team+, 1 year Enterprise). Role-based agent permissions gate what a
token's user can do.
Sources: https://github.com/ina654321/awesome-skills/blob/HEAD/skills/tools/enterprise/zendesk-expert/SKILL.md ;
https://github.com/shanksg/clawskills/blob/HEAD/skills/zendesk/skill.md

## WEBHOOKS
Webhooks API (replaces legacy targets + HTTP triggers): send HTTP requests on
ticket/user/organization events, agent availability, omnichannel routing,
messaging, article, community post. Signed with HMAC signing secrets (rotation
supported); verify signature before processing. Trial accounts: max 10
webhooks, 60 invocations/min. Webhooks are outbound-only; there is no inbound
notification stream API.
Sources: https://support.zendesk.com/hc/en-us/articles/4408839108378-Creating-webhooks-to-interact-with-third-party-systems ;
https://github.com/rust-works/omni-dev/issues/894 (citing
https://developer.zendesk.com/api-reference/webhooks/introduction/)

## POLLING
Incremental export endpoints (tickets/users/orgs) are the polling surface:
start_time/end_time cursor, checkpoint on next_page; deleted_tickets stream for
tombstones. Legacy list pagination for small config objects (groups, views).
Webhook notifications carry event metadata; payload must be followed up with a
fetch. Poll cadence modest; respect plan rate limits.
Sources: https://github.com/teradata/airbyte/blob/HEAD/docs/integrations/sources/zendesk-support.md ;
https://github.com/shanksg/clawskills/blob/HEAD/skills/zendesk/skill.md

## RATE LIMITS
Per-minute caps by Suite plan: Team 200, Growth/Professional 400, Enterprise
700, Enterprise Plus / High Volume API add-on 2,500; account-wide ceiling
100,000/min; Search has its own 2,500/min ceiling counting toward the global.
Headers: X-Rate-Limit, remaining-count headers; 429 with Retry-After. Limits
apply per token/OAuth app.
Sources: https://github.com/rust-works/omni-dev/issues/894 (citing
https://developer.zendesk.com/api-reference/ticketing/account-configuration/usage_limits/) ;
https://github.com/airbytehq/airbyte/blob/HEAD/docs/integrations/sources/zendesk-support.md

## IDEMPOTENCY
Idempotency-Key header is supported on write endpoints (community-researched;
verify on official docs at build). Ticket-level dedup via ticket.external_id
field: search by external_id before create. Bulk update_many returns job
status — poll before assuming success. Followup: confirm Idempotency-Key
semantics against https://developer.zendesk.com at build time.
Sources: https://github.com/rust-works/omni-dev/issues/894 ;
https://github.com/shanksg/clawskills/blob/HEAD/skills/zendesk/skill.md
(external_id dedup pattern)

## EFFECTS
Writes create/update/delete tickets (agent- and customer-visible: emails fire
per triggers/automations), update_many is operationally significant, merge
combines tickets, mark_as_spam hides from views. Reads/incremental export/
search side-effect-free. Any ticket write can trigger notification emails to
real requesters — treat as operator-visible.

## REVERSIBILITY
DELETE is soft: tickets go to deleted_tickets, restorable within 30 days via
the API; permanently_delete[_many] is irreversible (no recovery path
documented). Comments are append-only (no edit/delete). Closed/solved tickets
can be reopened by status update. Model deletes as 30-day-reversible, permanent
deletes as business-irreversible. (30-day restore window per Zendesk help docs;
verify endpoint details at build.)
Sources: https://docs.fortinet.com/document/fortisoar/2.0.0/zendesk/1/zendesk-v2-0-0
(deleted_tickets shape) ; community research above.

## PROVENANCE
Stable ticket ids; Ticket Audits record every field change with actor +
timestamp; created_at/updated_at (note: automation updates may not bump
updated_at — use generated_timestamp for change lineage); via.source channel
origin; external_id correlation; webhook event types. First-class audit trail
via audits endpoint.
Sources: https://github.com/rust-works/omni-dev/issues/894 ; EVENT citations.
