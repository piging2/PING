# Connector intel — Project-management domain (reference platform: Asana)

Mapped from public docs; implementation stays data-driven. Provider: Asana.
REST API v1, base https://app.asana.com/api/1.0.

## OBJECTS
Nesting: workspace (organization if it has one) -> projects + users; project ->
sections + tasks; task -> stories (comments + activity), subtasks, tags,
attachments, custom fields. Everything keyed by string gid. Error envelope is
{"errors":[{"message","phrase"}]}, not RFC 6749 codes.
Sources: https://github.com/anthropics/claude-tag-plugins/blob/HEAD/asana/skills/asana-api/SKILL.md ;
https://github.com/skylizeai-dev/skylize/blob/HEAD/docs/audits/audit_notion_asana_readiness.md

## EVENTS
No generic events API. Change detection: per-resource /events endpoint with a
sync token (poll-based event streams); the 1,000-webhooks-per-resource cap
applies to /events streams too. Webhooks-first for task/project lifecycle.
Source: https://developers.asana.com/docs/filtering (webhook/event limits)

## CAPABILITIES
Full task/project/section CRUD; comments via stories; assignee/due/complete
state changes; custom fields (text/number/enum) read + write by enum-option
gid; tags attach/detach; attachments; search API; duplication/instantiation/
export endpoints (5 concurrent jobs/user). Writes limited to what the token's
user can do (effective auth = token user permissions).
Source: https://github.com/whoaa512/asana-cli/blob/HEAD/docs/ASANA_API_REFERENCE.md

## AUTHORIZATION
OAuth 2.0 authorization-code flow: authorize at
https://app.asana.com/-/oauth_authorize, token via POST
https://app.asana.com/-/oauth_token (form-encoded client credentials); access
tokens expire in 3600s (expires_in), refresh tokens long-lived (no published
rotation/expiry policy). Personal access tokens also available for simple
integrations. Granular permission scopes in preview; use "default" scope.
Sources: https://github.com/skylizeai-dev/skylize/blob/HEAD/docs/audits/audit_notion_asana_readiness.md
(sec B.2.1, citing https://developers.asana.com/docs/oauth) ;
https://github.com/arcadeai/docs/blob/HEAD/app/en/references/auth-providers/asana/page.mdx

## WEBHOOKS
Create via POST /webhooks on a resource with filters (e.g. task.assignee
changed, story.added comment, task.completed changed). Handshake: respond to
creation with the echoed X-Hook-Secret header. Every delivery carries
X-Hook-Signature = HMAC-SHA256 of the raw body with the stored secret
(timing-safe compare). Webhooks are tied to the creating token: deactivating
the token/user trashes the webhook. Limits: 1,000 webhooks per resource
(includes /events streams); max filters documented per resource.
Sources: https://github.com/honzapav/portuni/blob/HEAD/docs/superpowers/specs/2026-09-12-asana-task-surface-design.md
(community-verified handler pattern) ; https://developers.asana.com/docs/filtering
(webhook ownership + limits)

## POLLING
/events endpoint per resource with sync-token cursors as the polling surface;
GET task/project lists with limit pagination (non-paginated queries capped at
~1,000 objects). Search API as secondary read (own 60 req/min cap).
Webhooks primary, /events the reconciliation layer.
Sources: https://developers.asana.com/docs/filtering ;
https://github.com/whoaa512/asana-cli/blob/HEAD/docs/ASANA_API_REFERENCE.md

## RATE LIMITS
Documented at https://developers.asana.com/docs/rate-limits: 150 req/min free
tier, 1,500 req/min paid tier; concurrency max 50 simultaneous GET / 15
simultaneous POST/PUT/PATCH/DELETE (evaluated independently); Search API
limited to 60 req/min separate from volume cap; duplication/export jobs 5
concurrent per user; cost-based throttling on heavy graph traversals; 429 with
Retry-After header; limits allocated per authorization token. Do not hardcode
account-specific variants; detect 429 and back off.
Source: https://github.com/skylizeai-dev/skylize/blob/HEAD/docs/audits/audit_notion_asana_readiness.md
(F.3, LIVE-VERIFIED 2026-09-02)

## IDEMPOTENCY
No native idempotency-key documented in retrieved sources. Task creation is
write; client-side safety: resolve-by-search before create, dedupe on gid,
reconcile on timeout. Followup: verify at build time.
Sources: none found — documented as undocumented.

## EFFECTS
Writes create/update/complete tasks, post comments (stories visible to
collaborators), create projects, attach files. Writes notify human
collaborators in-app; treat comment/task writes as operator-visible.
Reads/search/events side-effect-free.

## REVERSIBILITY
Tasks can be completed/reopened (state is a reversible toggle); comments
(stories) cannot be edited or deleted via the public API (verify at build);
task deletion exists but deleted-task recovery semantics are not published in
retrieved sources. Model task state as reversible, comments as permanent.
Followup: verify deletion/recovery at build time.

## PROVENANCE
String gids stable across API; stories carry actor + timestamps (activity
history); created_at/modified_at on tasks; webhook deliveries carry resource
gid + parent linkage; sync tokens position change streams. Lineage-capable.
Sources: EVENTS/WEBHOOKS citations above.
