# Connector intel - project-mgmt domain (reference platform: Asana)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
Workspaces, Projects, Tasks (gid, name, assignee, due dates, custom_fields, stories/comments), Sections, Tags, Portfolios, Goals, Users, Attachments. REST v1 at https://app.asana.com/api/1.0/.
Sources: https://developers.asana.com/

## EVENTS
Events API: poll per resource for change streams. Webhooks: create per resource with target URL; handshake via ?verify on creation; signed delivery.
Sources: https://developers.asana.com/docs/webhooks ; https://developers.asana.com/docs/events

## CAPABILITIES
Task/project CRUD, sections, custom fields, comments (stories), attachments, portfolios, goals, status updates, batch API, search. Rules automation via UI/API.
Sources: https://developers.asana.com/

## AUTHORIZATION
OAuth 2.0 or Personal Access Tokens (bearer). Scopes per resource. Service accounts for server-to-server.
Sources: https://developers.asana.com/docs/authentication

## WEBHOOKS
POST /webhooks with resource gid + target; Asana verifies the target with a handshake. X-Hook-Signature (HMAC-SHA256 with client secret) validates delivery. Filter per event type.
Sources: https://developers.asana.com/docs/webhooks

## POLLING
GET /events?resource={gid}&sync={token} returns changes + new sync token. Persist sync tokens per resource; expired tokens need resync.
Sources: https://developers.asana.com/docs/events

## RATE-LIMITS
Per-minute limits: 1500/min paid domains, 150/min free; 50 concurrent reads/writes; search lower (60/min). 429 with Retry-After. Verify current values in the docs.
Sources: https://developers.asana.com/docs/rate-limits

## IDEMPOTENCY
No idempotency-key. Task creates not naturally idempotent; check-before-create by name in project, or track created gids. Updates keyed by gid are idempotent.
Sources: https://developers.asana.com/

## EFFECTS
Creating/assigning tasks (notifications to assignees), project changes, status updates. Reads are side-effect-free.
Sources: https://developers.asana.com/

## REVERSIBILITY
Tasks/projects deletable (trash, recoverable briefly); completed state togglable; stories append-only (comments not editable via API in some plans).
Sources: https://developers.asana.com/

## PROVENANCE
GIDs stable; created_at/modified_at versions; stories give the audit trail per task; webhook events carry change details with timestamps.
Sources: https://developers.asana.com/

