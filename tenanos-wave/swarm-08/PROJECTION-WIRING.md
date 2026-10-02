# Mission Control Projection Wiring — Swarm 08

**Principle:** Mission Control is a PROJECTION. It never writes mission state, never grants capabilities, never dispatches work. Every action (approve, retry, dispatch) routes through the existing authorities (`MissionRuntime`, `ExecutionAuthority`, worker policy) — the UI only reads and links. No second orchestrator, no second event authority, no second capability system.

**Tenant rule (binding for the wave):** every projection query takes a resolved `tenant_id` and enforces it. Until the filter exists in the backend, the surface shows UNKNOWN for cross-tenant-unsafe fields rather than leaking.

---

## Canonical sources (do not duplicate)

| Concern | Canonical authority | Table / stream |
|---|---|---|
| Mission state | `MissionRuntime` | `ping_missions` |
| Events / evidence | `UnifiedEventRuntime` | `ping_events` |
| Knowledge | `KnowledgeGraph` | `knowledge_nodes` |
| Dead letters | `DeadLetterAuthority` | `repository_dead_letters` |
| Tenants | `TenantRegistry` | `tenant_registry` |
| Checkpoints | `CheckpointRepository` | `checkpoints` |
| Session liveness | `WorkerRuntime` / `MissionScheduler` / bridges | in-memory, `scope:'session'` |

The ExecutionEngine (`engine._missions`) is **not** a source. `/orchestration/missions*` reads are deprecated by P-20260923-083.

## Tenant filter requirements (P-20260923-088)

1. `unifiedEventRuntime.query()` gains `namespace` (exact match on `tenant::<id>` or `core::<name>`). Every `/mc/*` event read passes the resolved tenant namespace. Default-deny: no namespace ⇒ 400, not cross-tenant read.
2. `ping_missions` gains a `tenant_id` column (migration) OR missions are scoped by `payload->>'namespace'` with a GIN index; `getActive/getPending/getStats/getTrace` take `tenantId`. Until the migration lands, mission surfaces resolve tenant via the triggering event's namespace and mark rows UNKNOWN when unresolvable.
3. `POST /missions` requires `tenant_id`; the bridge stamps `namespace` from the spine event (already does: `mission_scheduler.js` threads `payload.namespace`).
4. `/mc/knowledge` passes `namespace` to `queryNodes()` (backend already supports it).
5. Dead letters: `repository_dead_letters` needs a tenant/job-owner column before per-tenant DLQ views; until then the DLQ surface is operator-global and labeled as such.
6. Suggested owner: swarm 01 (tenant reality/boundaries), already running — this proposal is the MC-side contract, not a competing implementation.

## Surface → projection wiring

### MISSIONS
- **List (active/pending):** `MissionRuntime.getActive()/getPending(limit)` + `tenantId` ⇒ `SELECT * FROM ping_missions WHERE tenant_id=$1 AND (status IN ('assigned','running') …)`. UI shows status, priority, assigned_to, lease_until (add lease columns to the projection — backend has them, MC doesn't surface them today).
- **Stats:** `getStats()` grouped by status + `tenantId`; keep the `scope:'persistent'` label in the payload so the UI can distinguish from session stats.
- **Trace:** `getTrace(missionId)`; verify `payload.event_id` → event namespace matches the requesting tenant, else 403. Returns mission + ordered correlation-id events + linked REPLAY_COMPLETED/WITNESS_* entries (reuse the `/mc/replay/trace/:correlationId` join).

### RUNS → derive, don't invent
No run table exists. The RUNS projection = one `ping_missions` row + its `getTrace()` chain, rendered as a timeline (created → assigned → running → completed/failed + lease expirations + retries). If a durable run record is later added, it must be keyed to `mission_id` + `correlation_id`, never a parallel ID space.

### ATTEMPTS
Today: `retries` count per mission (PROVEN) + `MISSION_FAILED` events in the trace. If per-attempt detail is required, emit an `ATTEMPT_STARTED/ATTEMPT_FAILED` event per `failWithRetry()` call (new event types through the existing `UnifiedEventRuntime.emit`, not a new authority), then project attempts from the event stream.

### CURRENT WORK
`getPending(50)` + `getActive()` (as `/mc/business/today-work` does) **plus** lease columns (`lease_until`, `claimed_at`, `assigned_to`, `retry_at`) in the projection so "who holds it / when does the lease die" is answerable. Recovery actions link to `reapExpiredLeases()` evidence (`MISSION_LEASE_EXPIRED` events).

### BLOCKED / FAILED / UNKNOWN
- Failed: `ping_missions WHERE status='failed'` (+ `error`, `retries`, `completed_at`).
- Blocked: `status='retry_pending' AND retry_at > NOW()` (waiting on backoff) — name it honestly as "backoff", not "blocked", unless a real blocker signal exists.
- Dead letters: `DeadLetterAuthority.getStats()` / `getDeadLettersByJobType` / `getDeadLettersByMission` (durable, PROVEN). UNKNOWN state: any section whose backend is unreachable returns `{status:'unknown', reason}` — never a zero-filled green.

### CAPABILITY DECISIONS → UNPROVEN, do not render
No decision log exists. Do not render a capability-decision panel from `MISSION_WORKER_MAP` (static code) or registration-declared `capabilities` arrays. If the wave needs this, the decision must first be emitted as an event (`CAPABILITY_GRANTED` with grantor, scope, expiry) through the existing event spine — then project it. Rendering static config as "decisions" would be fabrication.

### TOOL EXECUTIONS → UNPROVEN, do not render
Session counters (`totalProcessed/totalFailed`, `scope:'session'`) may be shown **only** labeled "this gateway session". Durable per-execution records require worker-emitted events; until then the panel shows UNKNOWN.

### EVIDENCE
- Replay/witness counts: `REPLAY_COMPLETED` / `WITNESS_CREATED` / `WITNESS_REJECTED` event counts (as `/mc/replay/stats`, `/mc/witness/stats` do) + `tenant` namespace filter once P-20260923-088 lands.
- Chain view: `/mc/replay/trace/:correlationId` join (replays + linked witnesses) — keep, add tenant check.
- Keep the "omit absent provider stats" behavior: absent backend ⇒ field omitted, never zero-filled.

### MEMORY USED → UNPROVEN, do not render
`/mc/knowledge` (nodes by type/search, +namespace filter) is the honest knowledge surface. "Memory used by run X" has no backend — UNKNOWN until a memory-read event/table exists.

### CHECKPOINTS → wire the existing repo
`CheckpointRepository` (`checkpoints` table) already implements the backend. Wiring = one read route `GET /mc/checkpoints?missionId=` projecting `getByMission`/`getLatest`, tenant-scoped by the mission's tenant. No new authority; just the missing projection.

### RECOVERY
Project from existing backends: `retries`/`retry_at` (backoff state), `MISSION_FAILED` / `MISSION_LEASE_EXPIRED` events, dead-letter rows with `replayable` flag. Recovery *actions* (retry-now, replay dead letter) dispatch through `MissionRuntime`/`DeadLetterAuthority` — the projection never mutates.

### TENANT
- Tenant picker: `TenantRegistry.executeListTenants()` (`GET /tenants`) — PROVEN.
- Every other surface takes the selected tenant and applies §Tenant-filter-requirements. Cross-tenant-unsafe sections render UNKNOWN with reason `tenant-isolation-unverified` until P-20260923-088 is implemented.

### HEALTH
- Providers: `aiRuntime.healthCheckAll()` (real `provider.health()` calls) — show per-provider status + latency; a provider that errors shows `error`, never green.
- Session components (workers/scheduler/bridges): show with explicit `scope: session` badge; `running` reflects the in-process flag, and the UI must label it "gateway process view", not cluster truth.
- Replace `MissionControlHeader.tsx` fabricated values with UNKNOWN (P-20260923-081) until a real `/mc/system`-backed fetch exists; never simulate.

## What the UI must never do

1. Show a percentage without naming its denominator source and scope (session vs persistent).
2. Show `0` where the backend is unreachable — show UNKNOWN.
3. Present engine-loop outputs (`confidence`, closure rates) as measured — they are synthetic until P-20260923-082/084 land.
4. Query `/orchestration/missions*` for mission state — canonical is `ping_missions`.
5. Render capability/tool/memory panels from static config or session counters unlabeled.

## Test checklist (for the writer / swarm 19 gates)

- [ ] `GET /mc/missions/stats` returns identical counts to `SELECT status, COUNT(*) FROM ping_missions GROUP BY status` (tenant-scoped when filter lands).
- [ ] `/orchestration/missions` returns 410 with canonical pointer (post P-20260923-083).
- [ ] `/orchestration/engine/report` contains no numeric closure fields, only `null` + provenance (post P-20260923-082).
- [ ] `MissionControlHeader` renders `unknown` for all fields with no network (post P-20260923-081).
- [ ] `collectMissions` no longer hardcodes completed/failed (post P-20260923-085).
- [ ] `/ops/dashboard` has no `organizational_health` key and no `generated_runtime_authoritative: true` (post P-20260923-086).
- [ ] `/mc/dashboard` exposes `clamped` flags when negative clamping fires (post P-20260923-087).
- [ ] Every `/mc/*` event read with `?namespace=tenant::<id>` returns zero rows from other namespaces (post P-20260923-088).
