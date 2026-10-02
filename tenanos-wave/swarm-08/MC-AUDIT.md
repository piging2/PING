# Mission Control Surface Audit — Swarm 08

**Date:** 2026-09-23 ~19:00 MDT
**Scope:** Existing Mission Control surface vs backend proof. Read-only audit; no repo files touched.
**Repos audited:** `/home/nolan/ping` (gateway + ping-runtime; the live backend), `/home/nolan/projects/constitutional-runtime` (ui-next MissionControlHeader).
**Note on assigned repo:** The task named `/home/nolan/projects/ping` as REPO, but that tree is the Next.js website (FYD product; port 3100) and contains no Mission Control backend. The live Mission Control surface is `/mc/*` in the gateway repo (`/home/nolan/ping/gateway/routes/mission_control.js`, 681 lines, mounted at `gateway/bootstrap/gateway_runtime.js:810`). This audit follows the actual surface. FYD/HPP product work untouched per charter.

**Verdict scale:** PROVEN = a live backend query/event/table proves every field. UNPROVEN = no backend exists, or the field cannot be derived from one. FAKE = the surface fabricates, hardcodes, or mislabels data. Rule applied throughout: UI CLAIM <= BACKEND PROOF.

**Coordinator directives recorded:** see DIRECTIVE-RECORD.md (canonical root `src/tenanos/**`, FYD exclusion zone, base tag `tenanos-wave-base-20260923` at e48ef710 — verified present, diffs in `~/workspace/tenanos-wave/diffs/`, proposals in STATE.json).

---

## 1. MISSIONS — mostly PROVEN, one COMPETING authority

| Surface | Backend proof | Verdict |
|---|---|---|
| `GET /mc/missions/active` | `MissionRuntime.getActive()` → `SELECT * FROM ping_missions WHERE status IN ('assigned','running') ORDER BY priority DESC` — `ping-runtime/orchestration/mission_runtime.js:320-326` | PROVEN |
| `GET /mc/missions/pending` | `MissionRuntime.getPending(limit)` → `SELECT * FROM ping_missions WHERE status='created' OR (status='retry_pending' AND retry_at<=NOW()) ORDER BY priority DESC, created_at ASC LIMIT $1` — `mission_runtime.js:306-316` | PROVEN |
| `GET /mc/missions/stats` | `MissionRuntime.getStats()` → `SELECT status, COUNT(*) FROM ping_missions GROUP BY status`, plus `scope:'persistent'` — `mission_runtime.js:330-339` | PROVEN |
| `GET /mc/missions/:id/trace` | `MissionRuntime.getTrace()` → mission row + `SELECT * FROM ping_events WHERE metadata->>'correlation_id'=$1` with correlation resolved via `payload.event_id` → triggering event's `metadata.correlation_id` — `mission_runtime.js:352-398` | PROVEN |
| `GET /missions/stats\|pending\|active` (`routes/missions.js`) | Same MissionRuntime methods — `gateway/routes/missions.js:12-47` | PROVEN |
| `POST /missions` (`routes/missions.js:22`) | `missionRuntime.create(missionType, payload, {priority, createdBy})` — durable write, no tenant/namespace accepted | PROVEN write; tenant isolation UNPROVEN |
| `GET /orchestration/missions`, `GET /orchestration/missions/:id` | `engine._missions` — in-memory JS array on the ExecutionEngine session — `gateway/routes/orchestration.js:83-137` | **FAKE (competing authority)** |
| `POST /orchestration/missions` | `engine._missions.push({id: 'mission_'+Date.now()+'_'+random...})` — non-deterministic IDs, no durability, no tenant — `routes/orchestration.js:39-81` | **FAKE (competing authority)** |

**Finding F-01 (P0):** Two mission authorities exist. Canonical: `ping_missions` via MissionRuntime (`/missions/*`, `/mc/missions/*`). Shadow: `engine._missions` in-memory via `/orchestration/missions*`. A Mission Control built on both shows two different mission counts. Proposal P-20260923-083 deprecates the shadow reads (410 + canonical pointer).

## 2. RUNS — UNPROVEN

No run entity exists. There is no `mission_executions` table surfaced anywhere (the 2026-09-16 audit's uncertainty register noted `canonical_events`/`mission_executions` empty). The closest honest proxy is a `ping_missions` row plus its correlation-id event chain (`/mc/missions/:id/trace`). Any UI "RUNS" panel must be built from that projection or show UNKNOWN — there is no durable run record to query.

## 3. ATTEMPTS — UNPROVEN

No attempts table exists (bounded repo-wide search for `CREATE TABLE * attempt*` returned nothing). Attempts survive only as the `retries INTEGER` counter on `ping_missions`, incremented by `failWithRetry()` (`mission_runtime.js:203-236`), which also emits `MISSION_FAILED`. No `/mc/*` route exposes attempt history. A per-attempt timeline is UNPROVEN; `retries` count per mission is PROVEN.

## 4. CURRENT WORK — PARTIALLY PROVEN

- `GET /mc/business/today-work` → `getPending(50)` + `getActive()` merged — `mission_control.js:236-251` — PROVEN.
- Lease state (`lease_until`, `claimed_at`, `assigned_to`) exists in the `ping_missions` DDL (`mission_runtime.js:30-46`) and `reapExpiredLeases()` recovers orphans (`mission_runtime.js:269-295`, emits `MISSION_LEASE_EXPIRED`) — PROVEN backend, but **no `/mc/*` route surfaces lease/claim state**, so "who holds this mission now" is UNPROVEN in the UI.

## 5. BLOCKED / FAILED / UNKNOWN

| Surface | Backend proof | Verdict |
|---|---|---|
| `GET /mc/dead-letters`, `/dead-letters/stats`, `/dead-letters/:id` | `DeadLetterAuthority` → `repository_dead_letters` table (`CREATE TABLE` at `gateway/dead_letter_authority.js:56`); stats = `GROUP BY job_type, failure_reason, replayable` (`dead_letter_authority.js:291+`); `getDeadLettersByJobType`/`getDeadLettersByMission` at :215/:246 | PROVEN (durable) |
| Failed missions in `/mc/missions/stats` | `GROUP BY status` includes `failed` | PROVEN |
| `collectMissions()` in `/ops/dashboard` → `missions` | **Hardcodes** `completed: total` (count of `MISSION_CREATED` events), `queued: 0, executing: 0, failed: 0, blocked: 0` — `ping-runtime/runtime/system_authority.js` `collectMissions` | **FAKE — every created mission reported completed, zero failed/blocked, always** |
| `organizational_health` in `/ops/dashboard` | `state.organizational_health` — the key occurs **0 times** in `system_authority.js`; always `{}` | **FAKE (empty section under an authoritative banner)** |
| `generated_runtime_authoritative: true` (`routes/ops.js:81-110`) | Blanket claim over per-section collectors of mixed provenance | UNPROVEN as a blanket claim |

Proposals: P-20260923-085 (collectMissions → UNKNOWN), P-20260923-086 (ops/dashboard honesty).

## 6. CAPABILITY DECISIONS — UNPROVEN

No capability-decision records exist anywhere (bounded search for `capability_decision`/`capability_grant`/`grant_decision` returned nothing). `MISSION_WORKER_MAP` in `mission_scheduler.js` is a static code mapping. The engine report's `capability_registry` block (`engine.js:477-483`) reads in-memory registry stats. Worker `capabilities` arrays in `workerRuntime.getStats()` are registration-declared, session-scoped. A "who decided this worker may do that" trail is UNPROVEN — there is no decision log to project.

## 7. TOOL EXECUTIONS — UNPROVEN

No durable tool-execution records. `workerRuntime.getStats()` exposes `totalProcessed`/`totalFailed` per worker but labels itself `scope: 'session'` (`ping-runtime/workers/worker_runtime.js`) — honest, but session-only. `/mc/replay/trace/:correlationId` shows the event chain of a run, which is the closest durable proxy. A TOOL EXECUTIONS panel needs a new event type or table; until then it is UNPROVEN.

## 8. EVIDENCE — PROVEN (event stream), with one gap

| Surface | Backend proof | Verdict |
|---|---|---|
| `GET /mc/replay/stats` | Counts of `REPLAY_COMPLETED` events (verified/unverified split on `payload.replay.verified`), `by_reason` histogram, `WITNESS_REJECTED` count; optional live provider stats included only when the singleton is injected, else omitted — `mission_control.js:520-568` | PROVEN |
| `GET /mc/witness/stats` | Counts of `WITNESS_CREATED` / `WITNESS_REJECTED` — `mission_control.js:568-589` | PROVEN |
| `GET /mc/replay/trace/:correlationId` | `unifiedEventRuntime.getCorrelationGroup()` — `mission_control.js:591-630`, `unified_event_runtime.js:348` | PROVEN |
| `GET /mc/inbox`, `/mc/queues`, `/mc/queues/:eventType`, `/mc/activity` | `unifiedEventRuntime.query({eventType, source, since, unprocessed, limit})` → `SELECT * FROM ping_events WHERE 1=1 ...` — `unified_event_runtime.js` `query()` | PROVEN |
| `canonical_events` table | Noted empty in the 2026-09-16 audit uncertainty register; not referenced by any `/mc/*` route | UNPROVEN/EMPTY |

## 9. MEMORY USED — UNPROVEN

No `/mc/*` route exposes memory. `knowledge_nodes` are queryable (`/mc/knowledge` → `knowledgeGraph.queryNodes()`, `ping-runtime/knowledge/knowledge_graph.js:163`, supports `namespace` filter) — PROVEN as a knowledge surface, but "memory used by run X" has no backend. The orchestration `dashboard.js` `memSummary` is in-memory only.

## 10. CHECKPOINTS — UNPROVEN via Mission Control

`gateway/repositories/checkpoint_repository.js` implements `create/getById/getByMission/getByExecution/getLatest/list` against a `checkpoints` table — the backend exists. But **zero `/mc/*` routes expose it**, and wiring liveness was not verified. A CHECKPOINTS panel is UNPROVEN until a route projects it.

## 11. RECOVERY — PROVEN

- `failWithRetry(missionId, error, {max_attempts, backoff_delay_ms})` → `retry_pending` + `retry_at`, or `failed` on exhaustion; emits `MISSION_FAILED` — `mission_runtime.js:203-236` — PROVEN.
- `reapExpiredLeases()` → resets expired `running`/`assigned` leases to `created`; emits `MISSION_LEASE_EXPIRED` — `mission_runtime.js:269-295` — PROVEN.
- `renewLease()` — `mission_runtime.js:254-267` — PROVEN.
- Dead-letter capture + stats — PROVEN (§5).

## 12. TENANT — EXISTS as authority, ABSENT as filter (P0)

| Fact | Proof |
|---|---|
| `TenantRegistry` authority, PG-backed `tenant_registry` table | `ping-runtime/runtime/tenant_registry.js` (upsert into `tenant_registry`) — PROVEN to exist |
| `namespace` column on `ping_events`, canonical privacy boundary `core::<name> \| tenant::<id>` validated at emit | `unified_event_runtime.js` DDL + `emit()` governance — PROVEN schema-level |
| `knowledgeGraph.queryNodes()` accepts `namespace` | `knowledge_graph.js:163` — PROVEN capability |
| Tenant mentions in `mission_control.js` | **0** — every `/mc/*` read is cross-tenant |
| `namespace`/`tenant` param in `unifiedEventRuntime.query()` | **Absent** — filters are only `eventType/source/since/unprocessed/limit` |
| Tenant column on `ping_missions` | **Absent** — DDL at `mission_runtime.js:30-46` has no tenant field; tenant survives only inside JSONB `payload.namespace` via the bridge |
| Tenant on mission creation (`POST /missions`, `POST /orchestration/missions`) | **Absent** on both |
| `/mc/knowledge` namespace usage | Supported by backend, **not passed** by the route |

**Finding F-02 (P0):** Mission Control is a cross-tenant read surface with no tenant filter on any route, no namespace parameter on the canonical event query, and no tenant column on missions. For the TenantOS wave this is the blocking gap: projection wiring must add `?tenant=`/`?namespace=` to every surface before any multi-tenant UI ships. Proposal P-20260923-088 (spec; suggested owner swarm 01 tenant-reality, which is already running).

## 13. HEALTH — PROVEN paths, one FAKE UI, one UNPROVEN claim

| Surface | Backend proof | Verdict |
|---|---|---|
| `GET /mc/system` → `ai` | `aiRuntime.healthCheckAll()` calls real `provider.health()` per registered provider — `ping-runtime/ai/ai_runtime.js:95-106` | PROVEN (call path; semantics provider-defined) |
| `GET /mc/system` → `connectors.google` | `googleConnector.health()` — wired in services | PROVEN (call path) |
| `GET /mc/system` → `workers`/`scheduler`/`bridge`/`eventMissionBridge` | Session-scoped `getStats()` with `scope:'session'` in payload (`worker_runtime.js`, `mission_scheduler.js:331`, `event_bridge.js:337`, `event_to_mission_bridge.js:149`) | PROVEN as session-scoped; UI must not present as durable |
| `GET /mc/system` → `uptime`, `memory` | `process.uptime()`, `process.memoryUsage()` | PROVEN (trivially) |
| `GET /mc/scheduler`, `/mc/workers`, `/mc/bridge`, `/mc/event-mission-bridge` | Same session stats; graceful `degraded` when service absent — `mission_control.js:500-518` | PROVEN |
| `MissionControlHeader.tsx` (ui-next, used by `chat/page.tsx`) | Initial state hardcodes `gateway:'healthy'`, `ollama:'connected'`, `model:'qwen3-coder'`; `useEffect` "Simulate runtime updates" sets `latency: Math.random()*100+50`, `contextUsage: Math.random()*4096`, renders random tok/s — **zero fetch calls in 93 lines** | **FAKE — textbook fake green** |
| `/ops/dashboard` `generated_runtime_authoritative: true` | Per-section collectors of mixed provenance (§5) | UNPROVEN blanket claim |

## 14. Fabricated-confidence engine loop — FAKE (P0)

`ExecutionEngine.startAutonomousLoop()` fabricates worker output inline (`ping-runtime/orchestration/execution/engine.js`):
```js
const output = {
  workerId: w.workerId,
  findings: [{ file: mission.target || 'x', line: 0, bypass_type: 'auto_scan', confidence: 0.85 }],
  confidence: 0.85
};
```
Hardcoded `0.85` confidence flows into `collectWorkerOutput` → `consensus` → `getReport()` → `/orchestration/engine/report` percentages (`missionClosureRate`, `missionAcceptRate`, `closureRate` at `engine.js:497-517`, computed over the in-memory `_missions` array). Every percentage on that report is downstream of fabricated input. Proposal P-20260923-082 (fields → UNKNOWN) and P-20260923-084 (loop output marked synthetic / confidence null).

## 15. Honest-but-lossy: `/mc/dashboard` business rollup

`GET /mc/dashboard` (`mission_control.js:62-110`) derives business counters from a **500-event / 24h capped window** and **silently clamps negatives to 0** (`for (const k of Object.keys(business)) { if (business[k] < 0) business[k] = 0; }`). The route does return `truncated`/`totalEvents`/`window_size_ms`/`cap` metadata — honest if the UI shows them, misleading if it shows only the counters. Clamping masks counter drift (e.g. more `REVIEW_RESPONDED` than `REVIEW_RECEIVED` in-window). Proposal P-20260923-087 exposes a `clamped` flag per field instead of silent zeroing.

---

## Summary counts

- PROVEN fields/routes: 24
- UNPROVEN: 11 (runs, attempts, capability decisions, tool executions, memory-used, checkpoints-via-MC, lease visibility, tenant filtering, canonical_events, blanket authority claim, mission-creation tenant)
- FAKE: 7 (header fake-green, loop 0.85 fabrication, engine report percentages, collectMissions hardcode, always-empty organizational_health, competing /orchestration mission authority, POST /orchestration/missions random-id creation)
- Honest-but-lossy: 1 (/mc/dashboard clamping)

## P0 findings

1. **F-01:** Competing mission authority (`engine._missions` vs `ping_missions`). → P-20260923-083.
2. **F-02:** Zero tenant filtering on the entire Mission Control surface. → P-20260923-088 (spec; swarm 01 overlap noted).
3. **F-03:** Fabricated confidence 0.85 → fabricated closure percentages on `/orchestration/engine/report`. → P-20260923-082, P-20260923-084.
4. **F-04:** `collectMissions()` hardcodes completed=all-created, failed=0, blocked=0 under `generated_runtime_authoritative: true`. → P-20260923-085, P-20260923-086.
5. **F-05:** `MissionControlHeader.tsx` fake green + random metrics in a live UI (`chat/page.tsx`). → P-20260923-081.

All proposals filed in `~/workspace/tenanos-wave/STATE.json`; diffs in `~/workspace/tenanos-wave/diffs/P-20260923-08{1..7}.diff`. Wiring proposal: PROJECTION-WIRING.md.
