# ORCA Spine Trace (Phase 1)

**Date:** 2026-09-18
**Worktree:** /home/nolan/worktrees/orca-autonomy, branch feature/orca-autonomy
**Method:** read the code, then verified live against the running gateway (ping-gateway, up 12h) and ping-postgres (brain-postgres:5432, db ping_runtime). Live probe 2026-09-18 ~11:55 UTC: 191 missions all `completed`; last 24h saw 21 full mission lifecycles plus a complete OBSERVATION→LINEAGE worker chain. The spine below is real and executing.

## 1. Exact call path: event -> mission -> scheduler -> worker

**Path A: the live PING-internal execution path** (ORCA does not drive this; it is the machinery ORCA observes and, via Path B, delegates through).

1. **Emit.** Producer calls `UnifiedEventRuntime.emit(eventType, source, payload, {namespace, logical_id, correlation_id, causation_id, metadata})`
   (`ping-runtime/events/unified_event_runtime.js:73`). Identity: `event_id = sha256(JSON.stringify({eventType, source, [namespace], [logical_id|payload]}))` (deterministic, content-based; verified live, see section 5). Optional validator/governance hooks (null-safe). Persisted to `ping_events` (`INSERT ... ON CONFLICT DO NOTHING`). In-process handlers dispatched by event type.
2. **Bridge.** `EventToMissionBridge` (`ping-runtime/orchestration/event_to_mission_bridge.js`) subscribes via `eventRuntime.on(type)` for every key of `EVENT_MISSION_MAP` (33 business/worker/system event types). `_handleEvent` threads `correlation_id` and calls `MissionRuntime.create(missionType, {...event_id, event_type, source, namespace, correlation_id, canonical_hash, confidence, payload}, {priority: canonicalPriority(p), createdBy: 'event-to-mission-bridge'})`. Priority normalized at this single ingress via `canonicalPriority()` (`ping-runtime/boundaries/priority_boundary.js`, ORCA 1-10 scale accepted, adapter live).
3. **Mission truth.** `MissionRuntime.create` (`ping-runtime/orchestration/mission_runtime.js:69`): `mission_id = sha256(missionType:event_id)[0:16]`, `INSERT ... ON CONFLICT DO NOTHING` (idempotent). Emits `MISSION_CREATED`. Lifecycle transitions are conditional SQL: `assign` (created→assigned, 60s lease, `WHERE status='created'` so concurrent claims cannot steal), `start` (assigned→running), `complete` (running→completed, records result+duration), `fail`, `failWithRetry` (retry_pending + `retry_at` backoff; exhaustion at max_attempts → `failed`), `renewLease`, `reapExpiredLeases` (orphan recovery → `created`). `getPending(limit)` returns `created` plus due `retry_pending`, `ORDER BY priority DESC, created_at ASC`.
4. **Schedule.** `MissionScheduler._poll` (`ping-runtime/orchestration/mission_scheduler.js:122`, default 5s): renew leases for in-flight → reap expired leases → `getPending(slots)` → `_dispatch`: look up `MISSION_WORKER_MAP[mission_type]` (labeling metadata only, per the DOC-CONTRACT comment), confirm the worker is registered, `assign` → `start` → build the worker event on the **original** `payload.event_type` (phantom-complete prevention: dispatching on mission_type would silently no-op) → `WorkerRuntime.dispatch(event)`.
5. **Execute.** `WorkerRuntime.dispatch` (`ping-runtime/workers/worker_runtime.js:105`): selects registered workers with `eventTypes.includes(eventType)` (empty eventTypes = dormant, never matches) → `worker.handle(event)` → returns a result or throws (P0-2: throw propagates to the scheduler).
6. **Settle.** Scheduler: `status==='failed'` → `_failMission` → `failWithRetry` → exhaustion routes to the dead-letter authority (P0-5); null dispatch → skip + fail (never phantom-complete); else `complete` → `MISSION_COMPLETED`. Worker-emitted downstream events (e.g. `OBSERVATION_CREATED`) re-enter the bridge, forming the multi-hop chain.

**Path B: ORCA authorized delegation** (proven live 2026-09-18, run orca-run-mu6wmbzn; evidence in `orca/control-loop/evidence/`).

1. **Observe.** Read-only: `MissionRuntime.getStats()/getPending()/getActive()/getTrace()`, direct `ping_events` reads, gateway `/health` (unauthenticated).
2. **Plan.** Objective → tasks with required capability + constraints (plan artifact, `./evidence/02-plan.json`).
3. **Authorize.** `authorizeWorkOrder({agentId, capability, namespace, constraints})` from `ping-runtime/external-agent/external_agent_adapter.js` (vendored byte-copy at `orca/control-loop/vendor/external-agent/`). Fail-closed: unknown agent, `blockedExternal`, capability outside the profile's `allowedCapabilities`, namespace not matching `^(core|tenant)::[a-z0-9_.-]+$`, constraints not tightening the profile maximum, or `no_canonical_events`/`no_mission_state_writes` not true → denied.
4. **Issue.** `issueWorkOrder({...})` builds (never sends) the closed 14-field envelope; `work_order_id = sha256('workorder:'+taskId)[0:16]` (idempotent re-issue); `principal` is always the constant `ping:external-agent-adapter`.
5. **Dispatch (ORCA-side, PING-owned result_path).** Invoke the registered worker through its proven transport and capture stdout. For Hermes: venv python → `hermes_cli/main.py -z` with the prompt in a transient `C:\Windows\Temp` file (cleaned after, per the no-C: rule). Extract the 8-field result envelope from stdout. On timeout: report a **failed** envelope (`status: failed`, non-empty error); never fabricate success (contract section 5).
6. **Verify + record (PING authority, not ORCA).** `verifyResultEnvelope` (echo binding of work_order_id/context_pack_id/agent_id/capability, status rules, `verifiedAt <= deadline`; invalid is non-retryable and can never reach canonical events) → `recordVerifiedResult` → `UnifiedEventRuntime.emit('WORKER_COMPLETED'|'WORKER_FAILED', 'worker-runtime:external-agent-adapter', {...}, {namespace, logical_id: result_id, correlation_id, causation_id, metadata})`. Event identity stays with `computeEventId`.
7. **Loop.** ORCA observes the canonical outcome events (same correlation_id; t2's causation_id = t1's event_id) and plans the next step.

## 2. Seams

**Observe (read-only, no authority crossed):** `MissionRuntime.getStats/getPending/getActive/getTrace`; `ping_events` SQL; `WorkerRuntime.getStats/health` (in-gateway; via `/orchestration` routes which are auth-gated: `POST/GET /missions`, `POST /:id/dispatch`, `GET /workers`, `GET /engine`, `GET /engine/report`, `POST /engine/compile`, `POST /engine/loop`).

**Delegate (authorized request, no execution owned):** `authorizeWorkOrder` / `issueWorkOrder` / `verifyResultEnvelope` / `recordVerifiedResult` in the external-agent adapter. `MissionRuntime.create` is PING-internal (bridge-owned); ORCA must not call it directly (mission-truth authority).

**Boundary crossed by nothing in ORCA:** canonical event emission (only via `recordVerifiedResult` with PING's runtime), event/worker/mission identity minting, capability granting, evidence certification, merge/commit, filesystem/promotion.

## 3. Workers that can really execute a bounded task today

- **Canonical JS workers** (in-gateway, via Path A): `observation` (BUSINESS_EVENTS incl. SYSTEM_HEALTH_CHECK), `claim`, `classification`, `recommendation`, `projection`, `replay`, `witness`, `lineage` (`ping-runtime/workers/canonical_workers.js:705-715`). Proven: 191 completed missions; full 24h chain observed live.
- **Hermes** (external-agent family, via Path B): profile-registered capabilities `fixture.read`, `text.transform`, `text.summarize` under read-only/no-network/no-writes constraints. Proven: 2 real 8-field envelopes → 2 verified `WORKER_COMPLETED` canonical events (this run).
- **Not yet delegable:** Ollama, Copilot broker, cloud subagents (no `AGENT_PROFILES` entries; lead (d) registering in parallel). `codex` profile block expired 2026-09-17 but quota state is uncertain; not used. `opencode` blocked (no headless CLI).

## 4. Capability authority (two distinct decisions, not duplicated)

- `CapabilityAuthority.authorize` (live in the gateway container, `/app/gateway/capability_authority.js`): "may agent A invoke capability C **against PING**?" (agent-initiated, `/capabilities` surface).
- Adapter `authorizeWorkOrder` (PING-initiated): "may PING **delegate** capability C to exterior agent A under constraints K?" (`AGENT_PROFILES`, fail-closed, mirrors the CapabilityAuthority profile shape).
- The adapter header documents this separation explicitly; ORCA uses only the second.

## 5. Identity proof (live)

`t1` WORKER_COMPLETED `event_id=bce4d7cb2bed2ba166d5fbcd4c03441cfb82456a9e95c744603d24f79c09b146` recomputed locally as `sha256(JSON.stringify({eventType:'WORKER_COMPLETED', source:'worker-runtime:external-agent-adapter', namespace:'core::system', logical_id:'ecc5013d4884ba08a4b1e28f7bdfe358eb7a9122c8d6c8cf780f81197b94b652'}))` → exact match. ORCA minted nothing.
