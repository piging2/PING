# P-20260923-088 — Implementation plan (scratch, NOT applied, NOT committed)

**Proposal:** Tenant/namespace filters across Mission Control projections.
**Spec:** `~/workspace/tenanos-wave/swarm-08/PROJECTION-WIRING.md` (§ "Tenant filter requirements").
**Decision:** IMPLEMENTABLE (85%). Backend foundation verified live in
`/home/nolan/ping` (gateway repo). This directory holds the full
implementation as patch files + a new JS adapter + tests. Nothing here is
applied to any repo; the coordinator/writer applies after review.

## File-by-file plan

| # | File (gateway-repo path) | Change | Status |
|---|---|---|---|
| 0 | `gateway/lib/tenant-context.js` | **NEW.** JS adapter of the P-20260923-092 canonical tenant mapping (regexes, error codes, fail-closed semantics). The TS kit in the integration worktree is not importable by the JS runtime; this is a port, not a competing definition. | written, 16/16 unit tests pass |
| 1 | `ping-runtime/events/unified_event_runtime.js` | `query()` gains `namespace` exact-match filter (`AND namespace = $n`); served by existing `idx_ping_events_namespace`. | patch-01 written |
| 2 | `ping-runtime/orchestration/mission_runtime.js` | (a) `initialize()` adds `idx_pm_namespace` GIN index on `(payload->>'namespace')`; (b) `create()` stamps `payload.namespace` from `options.tenantId` (validated); (c) `getPending(limit, tenantId)`, `getActive(tenantId)`, `getStats(tenantId)` add the tenant filter; (d) `getTrace(missionId, tenantId)` returns `{forbidden:true}` on mismatch or unresolvable tenant (fail closed). All tenant args default null → existing callers (Orca scheduler) unchanged. | patch-02 written |
| 3 | `gateway/routes/mission_control.js` | New `requireTenant` middleware (default-deny: no/malformed tenant ⇒ 400; `TenantBoundaryError` codes). Applied to every cross-tenant-unsafe read: `/dashboard`, all `/business/*`, `/inbox`, `/queues*`, `/activity`, `/missions/*`, `/knowledge` (passes `namespace` to `queryNodes`, which already supports it), `/replay/stats`, `/witness/stats`, `/replay/trace/:correlationId` (403 if any chain event is in another namespace). `queryEventsByType`/`queryEventsSince` helpers take namespace and keep their COUNT(*) cohort identical to the row cohort. DLQ routes (`/dead-letters*`) stay operator-global and are labeled `scope:'operator-global', tenant_isolation:'unverified'`. `/system`, `/bridge`, `/event-mission-bridge`, `/scheduler`, `/workers` are INTENTIONALLY NOT gated: they describe the gateway process (`scope:'session'`), not a tenant. | patch-03 written |
| 4 | `gateway/routes/missions.js` | `POST /` requires `tenant_id` in the body (400 `TENANT_CONTEXT_MISSING`); validates the slug (400 `INVALID_TENANT_ID`); stamps `payload.namespace` via `create()`; returns `tenant_namespace`. GETs unchanged (Orca scheduler path; follow-up if scheduler goes multi-tenant). | patch-04 written |

## Why it is safe to implement now (evidence)

1. `ping_events.namespace` column + `idx_ping_events_namespace` btree index **exist and are emit-governed** (`unified_event_runtime.js:51-58`, `emit()` governance at :106-134). The `query()` addition is a 4-line WHERE — no migration, no schema change.
2. `ping_missions` tenant state survives only in `payload.namespace`, **already stamped by the bridge** (`mission_scheduler.js:235`). The GIN expression index is created inside the existing `initialize()` `IF NOT EXISTS` block — idempotent, no ALTER COLUMN migration needed.
3. `GET /tenants` (tenant picker backend) **exists** (`gateway/routes/tenants.js`, mounted at `gateway_runtime.js:688`).
4. `/mc/knowledge` backend `queryNodes()` **already accepts `namespace`** (`knowledge_graph.js:163`).
5. 082-087 are **INTEGRATED**: the honesty foundations this spec depends on (no fake engine percentages, `/orchestration/missions` deprecated, collectMissions UNKNOWN, clamped flags) are in place, so tenant-scoped counts project real data.
6. 092 is **INTEGRATED**: the canonical `tenant::<slug>` mapping + fail-closed rules are defined and tested; file #0 ports the identical contract to JS.

## Known gaps / deferred (not blockers)

- **`repository_dead_letters` has no tenant column** (DDL verified: `dead_letter_authority.js:56-77`). Per-tenant DLQ views need a column + backfill migration — out of scope for this implementation; the three DLQ routes are honestly labeled operator-global instead.
- **Missions without `payload.namespace`** (direct writes bypassing `POST /missions`, legacy rows) resolve UNKNOWN: they never match a tenant filter, and `getTrace` refuses them (403 `tenant-unresolvable`). The UI's "UNKNOWN" rendering for these rows is a follow-up on the MC surface, not this backend change.
- **`getTrace` chain events** are selected by `metadata->>'correlation_id'`; the tenant check covers the mission row + triggering event (the spec's §2). The `/replay/trace` route additionally 403s when ANY chain event is in another namespace.
- **`routes/missions.js` GETs** (`/stats`, `/pending`, `/active`) remain ungated for the Orca scheduler; gating them is a separate proposal once the scheduler is tenant-aware.
- **`/mc/*` default-deny is a behavior change**: callers must send `?tenant=`. The tenant picker (`GET /tenants`) provides the slug list.

## Application order

1. Apply patch-01, patch-02, then `gateway/lib/tenant-context.js` (new file).
2. Apply patch-03, patch-04.
3. Run `node --test tests/tenant-context.unit.test.js` (16 tests).
4. Restart gateway, run `tests/tenant-filter.verify.md` against live PG.
5. Commit only via the wave's normal writer gate (NOT by this worker).

## Test checklist mapping (from PROJECTION-WIRING.md)

- [x] Every `/mc/*` event read with `?namespace=tenant::<id>` returns zero rows from other namespaces — patch-01 + patch-03 (verify.md §2).
- [x] `GET /mc/missions/stats?tenant=` parity with SQL — patch-02 + verify.md §2.
- [x] Trace tenant check — patch-02 + verify.md §4.
- [ ] DLQ per-tenant views — DEFERRED (no backend column; labeled instead).
- [ ] `MissionControlHeader` UNKNOWN — P-20260923-081, sprint-owned, out of scope.
