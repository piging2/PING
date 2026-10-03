# Harvest Proposal: WorkOS (identity objects, sessions, provisioning events, audit events)

Target: WorkOS - organizations, users, sessions, memberships, Directory Sync (SCIM) provisioning, audit logs, events API + webhooks.
Date of research: 2026-10-02. Researcher: harvest worker (leaf, no subagents).

## What was read (provenance)

Official docs (workos.com), all fetched 2026-10-02:

1. https://workos.com/docs/audit-logs - Audit Logs guide (event schema, idempotency, retention)
2. https://workos.com/docs/audit-logs/exporting-events/exporting-events - export API, 10-min expiring URLs
3. https://workos.com/docs/reference/audit-logs/export - POST /audit_logs/exports API reference
4. https://workos.com/docs/directory-sync/understanding-events - full dsync event lifecycle
5. https://workos.com/docs/events/data-syncing/events-api - cursor/watermark replay guide
6. https://workos.com/docs/events/data-syncing/webhooks - signature verification, retries, out-of-order handling
7. https://workos.com/docs/events/data-syncing/index - canonical event envelope JSON
8. https://workos.com/docs/reference/authkit/session - session list/revoke endpoints
9. https://workos.com/docs/reference/events/list - GET /events reference

Official source code (MIT SDKs, read only, nothing copied):

10. github.com/workos/workos-go v4, pkg/directorysync (Directory, Group, User, UserState, cursor pagination) via https://pkg.go.dev/github.com/workos/workos-go/v4/pkg/directorysync
11. github.com/workos/workos-go v4, pkg/usermanagement (Organization, OrganizationMembership, SSO Profile) via pkg.go.dev
12. github.com/workos/workos-node, commit 91935d6942dc87fbf7ec67b5096d67b81bacf9d8 ("Add userManagement.listSessions (#1316)") - Session interface, AuthMethod, SessionStatus, session fixture JSON
13. github.com/workos/workos-kotlin, V5_MIGRATION_GUIDE.md - webhook verification helper, sealed WorkOSEvent typed catalogue, v1=/legacy s= signature formats
14. Maven Central metadata for com.workos:workos - license declaration

SOURCE_SHA input files: three curator capture files (/tmp, not retained) containing verbatim excerpts above:
- 01-audit-logs.txt (4125 bytes) - sources 1-4
- 02-events.txt (10316 bytes) - sources 5-9
- 03-objects-license.txt (4633 bytes) - sources 10-14
Concatenated in that order, sha256 = the SOURCE_SHA in manifest-entry.json.

## Object model (clean-room re-derivation from the sources above)

### Identity objects

- **Organization** `org_<id>`: the tenant. `{object: "organization", id, name}` (Go SDK also models domains/metadata on the current API; the v4 struct is minimal). Everything is scoped to an organization: audit events, directories, memberships.
- **User** `user_<id>`: `{object: "user", id, email, email_verified, first_name, last_name, profile_picture_url, last_sign_in_at, created_at, updated_at, external_id}` (shape from official API JSON in docs/third-party logs corroborating the Node SDK; the gist record shows exactly these keys).
- **OrganizationMembership**: `{id, user_id, organization_id, role/roles (role slugs), status}`. Status lifecycle: active <-> deactivated (deactivate/reactivate), plus delete (removal). Roles are slugs (member/admin/...) resolved from groups or direct assignment.
- **Invitation**: pending invitation per email per org with expiry; states sent -> accepted | revoked | expired | resent. Accepting joins the org and scopes the session.
- **Session** `session_<id>` (from official Node SDK commit 91935d6 fixture + interface):
  `{object: "session", id, user_id, user_agent, ip_address, auth_method, status, expires_at, ended_at, created_at, updated_at}`
  - `auth_method`: oauth | sso | password | magic_code | passkey | impersonation | external_auth | migrated_session | unknown
  - `status`: active | expired | revoked
- **Directory** `directory_<id>`: `{id, name, domain, external_key, type, state, idp_id, organization_id, created_at, updated_at}`. `type` is a provider enum ("azure scim v2.0", "okta scim v2.0", "gsuite directory", "workday", "sftp", ...). `state`: linked | unlinked | invalid_credentials.
- **DirectoryUser** `directory_user_<id>`: `{id, idp_id, directory_id, organization_id, email, first_name, last_name, job_title, username/emails (deprecated), groups[], state, raw_attributes, custom_attributes, role: {slug}, created_at, updated_at}`. `state`: active | inactive.
- **DirectoryGroup** `directory_group_<id>`: `{id, name, idp_id, directory_id, organization_id, raw_attributes, created_at, updated_at}`.

### The event envelopes (the interesting part)

**WorkOS event** (push + pull share one envelope, verbatim from docs source 7):
`{object: "event", id: "event_...", event: "<type>", data: {<full object snapshot>}, created_at}`
- `id`: `event_`-prefixed, stable across webhook delivery and Events API ("The event IDs passed in webhook bodies are the same as those returned by the events API").
- `event`: namespaced type string `<domain>.<object>.<action>`: dsync.user.created/updated/deleted, dsync.group.created/updated/deleted, dsync.group.user_added/user_removed, dsync.activated/deleted, user.created/updated/deleted, organization.created/updated/deleted, organization_membership.created/updated/deleted, session.created, connection.activated/deactivated/deleted, authentication.* (email_verification_succeeded, magic_auth_succeeded/failed, mfa_succeeded, oauth_succeeded, password_succeeded/failed, sso_succeeded).
- `data`: the FULL current snapshot of the object, including `created_at`/`updated_at` and `previous_attributes` (shallow diff of root + custom_attributes; new attributes shown as null) on update events.
- `created_at`: event emission time, separate from object timestamps.

**Audit Log Event** (application-emitted, separate from platform events):
`{action, version, occurred_at, actor: {id, name, type, metadata?}, targets: [{id, name, type, metadata?}], context: {location, user_agent}, metadata: {...}}`
- `action` must be pre-registered as a schema in the dashboard (event schemas; optional JSON Schema validation on metadata, limits: 50 keys, 40-char keys, 500-char values).
- **Idempotency**: `idempotency-key` request header on create; server hashes (key + event data); same key + same data returns the same response, no duplicate. If absent, a content-derived key is used automatically.
- **AuditLogExport**: `{object: "audit_log_export", id: "audit_log_export_...", state: Pending|Ready, url, created_at, updated_at}`. Export URL expires after 10 minutes; refetch regenerates it. Poll until state is Ready. Scoped to one org + date range (last 3 months via CSV).

## ID scheme

Type-prefixed opaque IDs: `org_`, `user_`, `session_`, `directory_`, `directory_user_`, `directory_group_`, `event_`, `audit_log_export_`, plus `client_`, `conn_`, `wh_` (webhook endpoints). Consequences worth stealing: (a) the prefix makes the object KIND self-describing at every boundary (logs, URLs, foreign keys) so kind-mixups fail loudly; (b) namespaces are disjoint, so a global event log can mix kinds without collision; (c) prefix + ULID-style suffix gives rough time-ordering.

## State transitions

- Membership: created(active) -> deactivated -> reactivated | deleted(removed). Multi-membership login yields `organization_selection_required` + `pending_authentication_token`; org choice binds the session (org_id in token claims).
- Session: active -> revoked | expired (ended_at set on terminal). Revocation is an explicit API call: POST /user_management/sessions/revoke {session_id}. List: GET /user_management/users/:id/sessions.
- DirectoryUser: active <-> inactive via dsync.user.updated(state=inactive) (soft delete, the common provider path); hard delete via dsync.user.deleted (rare). Post Oct 2023 new environments auto-delete inactive directory users.
- Directory: linked <-> unlinked/invalid_credentials -> deleted. Deletion is a CASCADE event: a single dsync.deleted is emitted; per-user/per-group delete events are NOT emitted. Consumer must tear down the whole org-directory association locally.
- Group membership: dsync.group.user_added / dsync.group.user_removed; role = function of full group set (recompute, never increment).
- Update events carry `previous_attributes` shallow diffs.
- Export: Pending -> Ready; URL 10-min TTL, regenerated on refetch.
- Webhook endpoint: register -> test event -> live; secret shown once.

## Authority boundary

- **Management API**: secret API key (Bearer) = full tenant authority. Write ops are server-side only.
- **Webhook delivery**: per-endpoint signing secret; the signature IS the auth (verify before parsing/processing; exclude webhook route from session auth).
- **Admin Portal**: customer-scoped delegation via short-lived single-purpose setup links (intents: sso, dsync, audit_logs, domain_verification); per-organization API keys exist.
- **Consumer responsibility** (this is the sharp part): WorkOS is the authority for WHAT happened; the app owns idempotent application. Rules from docs: ack (2xx) BEFORE processing (two-process pattern); dedupe on event.id (not delivery id); upsert by object id; last-writer-wins by updated_at; never trust order on webhooks; reconcile on a 1-6h cron by full traversal (groups, users, membership edges, then deactivate locals missing remotely); deprovisioning must kill sessions, not just flag rows.
- **Safe fetch boundary, server-side**: WorkOS rejects webhook endpoint URLs resolving to private/link-local/loopback (10/8, 172.16/12, 192.168/16) at registration time. (Useful precedent for the trust-kernel fetch boundary.)

## Persistence semantics

- Events API: cursor pagination (`after` = last processed event_id, `limit`, `order`); consumer MUST durably store the cursor ("If lost, you must backfill" via range_start). 90-day event retention in the Events API; up to 30 days per request.
- Audit logs: 30-day default retention per org; configurable 1-11 months or 1-10 years; can increase, NEVER decrease; permanently deleted at expiry. CSV export covers last 3 months.
- Webhooks are delivery, not storage: at-least-once push, no ordering, no durability guarantee beyond the retry window.
- Event sourcing shape: each event carries the full object snapshot + updated_at, so the stream doubles as a state feed (upsert-by-id converges).

## Evidence / receipts

- **Delivery receipt**: `event.id` stable across push and pull; dedupe log keyed on event.id gives exactly-once-per-consumer.
- **Integrity receipt**: `WorkOS-Signature: t=<ms>, v1=<hex>`; expected = hex(HMAC-SHA256(secret, "<ms>.<raw_body_utf8>")); tolerance 3-5 min anti-replay; constant-time compare; raw body must be used (no JSON round-trip). Legacy `s=` format also accepted. Fixed sender IP allowlist published.
- **Emit receipt**: idempotency-key on audit-log create; content-derived key when absent; same key+data = same response (no dup).
- **Export receipt**: short-lived signed URL (10 min), regeneration on refetch; state machine Pending->Ready.
- **Change evidence**: `previous_attributes` shallow diffs on update events.
- **Ordering evidence**: `created_at` (event) + `updated_at` (object) used by consumers to reject stale data.

## Retries / failures

- Webhooks: non-2xx (or timeout) = failure; retried with exponential backoff, up to 3 days in production ("retry up to 6 times, with exponential backoff over 3 days"); staging gives up after several minutes. After the window the event is failed; recovery is consumer-side via the state API or Events API.
- Docs explicitly warn: respond 200 fast, process async (queue + worker), because "You do not need to signal to WorkOS whether or not the event was processed successfully" - delivery ack and processing outcome are deliberately decoupled.
- Out-of-order delivery is NORMAL (not an error): handle by upsert + updated_at comparison; recompute roles from the full group set, never incrementally.
- Stale events from retries can arrive after newer events: compare timestamps, skip stale.
- The one hard failure mode they name: endpoint down longer than 3 days = silent gap; only the reconciliation cron catches it (the "second loop" - deactivate locals missing remotely - is "the important half").

## Revocation model

- Session revoke by id (immediate; current-session revocation forces re-login/401).
- Deprovisioning on dsync.user.updated(state=inactive) or dsync.user.deleted: revoke access AND terminate active sessions.
- Membership deactivate/reactivate/delete; invitation revoke; API key deletion.
- dsync.deleted: remove org-directory association and all derived users/groups (no per-object events to rely on).
- Retention expiry: audit events permanently deleted; export-before-expiry is the only preservation path.

## Tests (proposed, for piging2 event-kernel)

1. Out-of-order replay: deliver update events shuffled; assert updated_at guard prevents stale overwrite and final state equals last-writer-wins.
2. Duplicate delivery: same event.id twice; assert single application (dedupe log).
3. Forged/tampered webhook: wrong secret -> reject; modified body -> reject; stale timestamp beyond tolerance -> reject.
4. Signature on raw bytes: JSON re-serialization must NOT be used for verification (canonical-bytes test).
5. Cursor replay: watermark at event N; crash; resume with after=N; assert no gap, no re-application.
6. Cascade delete: dsync.deleted with no per-user events; assert full teardown.
7. Session revocation: revoke -> subsequent authenticated call fails; deprovision path ends sessions.
8. Export lifecycle: Pending -> Ready; URL expires after TTL; refetch regenerates.
9. Retention: post-expiry read returns typed absence (410 Gone style), never plausible-but-wrong data.

## Verdict: ADAPT

Do not adopt WorkOS (proprietary SaaS, closed source; nothing to take as-is). Re-derive the MECHANISM clean-room into PING's event-kernel and capability-kernel:

(a) The typed event envelope `{object:"event", id:event_<...>, event:<domain>.<object>.<action>, data:<full snapshot + created_at/updated_at>, created_at}` with stable ids across push/pull.
(b) Consumer-side cursor watermarking: `consume(after=event_id) -> (applied[], new_watermark)`, cursor durably stored, replay-from-timestamp fallback.
(c) HMAC-signed delivery with ms timestamp, tolerance window, raw-body canonical bytes, dedupe-on-event-id, upsert-by-id with updated_at last-writer-wins.
(d) The reconciliation discipline: event stream is the fast path; a scheduled full-traversal sweep is the REQUIRED slow path (events can be lost; exactly-once delivery is not promised, exactly-once-per-consumer is achieved by dedupe).
(e) Audit-log emit shape {actor, action, targets, context, occurred_at, metadata} with content-hashed idempotency as the evidence-event schema for mission/owner actions.

The parts PING should NOT take: the product surface (SSO connections, admin portal, per-org API keys, SIEM log streams, CSV exports) - none of that serves the FYD loop or proofs 9-14.

## SMALLEST MISSING PRIMITIVE

**Cursor-watermarked, idempotent event consumption: `consume(stream, after=watermark) -> (applied, new_watermark)` with event-id dedupe and updated_at last-writer-wins.**

PING has an append-only journal (the write side). What it does not have, and WorkOS proves valuable, is the CONSUMER side contract: a durable per-consumer watermark over a replayable, typed event stream, where (1) every event has a globally stable id (`event_` + kind prefix), (2) the consumer stores the last applied id and resumes from it, (3) redelivery is safe because application is idempotent (dedupe log on event.id; upsert keyed on object id with updated_at comparison), and (4) delivery verification (HMAC over canonical bytes + freshness window) is separate from processing. That single primitive is what makes proofs 11 (injected/forged result rejected at the signature boundary), 13 (verification as an independent consumer reading the same stream), and 14 (replay from a cursor reconstructs relevant state) implementable without a second truth model. Without it, a journal is write-only history; with it, it becomes a replayable substrate multiple verifiers can independently consume.

## Dependency analysis

Zero dependencies. This is a clean-room re-derivation of documented protocols; no WorkOS code, SDK, or service is required to implement the mechanism. The harvested artifact would be original PING code implementing: typed event envelope, HMAC webhook-style verification (stdlib hmac/sha256 only), cursor store, dedupe log, upsert-with-timestamp. All implementable with zero third-party packages.

## License finding

- WorkOS platform: proprietary commercial SaaS (workos.com). Closed source. Nothing copied; re-derivation is from public documentation and public SDK interfaces, which carries no license obligation for an original implementation (APIs/protocols described, not code reproduced).
- SDKs read: official WorkOS SDKs are MIT licensed (verified: Maven Central official artifact metadata for com.workos:workos declares "MIT License" with link to github.com/workos/workos-kotlin/blob/main/LICENSE; workos-node and workos-go ship MIT LICENSE files in their repos). No GPL/copyleft/SSPL/BSL anywhere in the material read. Nothing to flag for Nolan.
- Verdict on license risk: NONE. No third-party code is proposed for inclusion.

## Proof mapping

- proof 11 (injected bad result rejected): signature verification boundary + event.id dedupe; forged/stale deliveries rejected before processing.
- proof 13 (mission VERIFIED only after independent verification): independent verifier consumes the same event stream from its own watermark; delivery ack decoupled from processing outcome.
- proof 14 (replay reconstructs relevant state): cursor-based replay from event_id or range_start; full object snapshots in events make the stream self-sufficient for rebuild.
(Proofs 1-8 are FYD ingest/render; 9, 10, 12 are mission execution mechanics not touched by this harvest.)

## AUTHORITY_OWNER

event-kernel (append-only transition contract, ordering, dedupe/idempotency, read/replay). The mechanism hardens the read/replay and dedupe/idempotency facets specifically; the typed envelope also informs object-kernel evidence refs as a secondary consumer.
