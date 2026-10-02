# Phase 8: Exterior Agent Production Wiring Forensics, 2026-09-17

**Verdict: YES.** The ExternalAgentAdapter can sit behind the EXISTING WorkerRuntime as one more registered worker. No new routing authority is needed. The seam is unambiguous and is proven by a full isolated end-to-end run: a real `ping_missions` row drove MissionScheduler to WorkerRuntime to an adapter-backed worker to a real Hermes execution and back, with PING emitting every canonical event itself.

**Production wiring subtrack: READY-PENDING-RESTART.** The exact change is documented below (one map entry, one worker file, one registration entry, one restart). The live gateway was not touched and not restarted; the sibling agent owns gateway restarts.

Date: 2026-09-17 ~05:50-06:00 MDT. Read-only forensics plus one isolated Pig-hosted harness run. No commits, no pushes, no merges, no resets, no live gateway file edits, no restarts, no credential values printed or stored. Playbook revision 194a2b85bde957ed untouched. ping-postgres and ping-qdrant data untouched (only test-scoped inserts). No em dashes in this report.

## 1. Forensics: the seam

All line references are to the LIVE Oracle container tree (`/app/...` in `ping-gateway`), read via `docker exec` (read-only).

### (a) How WorkerRuntime registers and selects workers

`/app/ping-runtime/workers/worker_runtime.js` (169 lines, live):

- Registration is a plain `Map`: `register(name, worker, options)` stores `{ worker, eventTypes, capabilities, maxConcurrent, running, ... }` keyed by name. The only interface requirement is `worker.handle(event)` (throws otherwise). No factory, no plugin loader, no parallel registry.
- Selection is `dispatch(event)` (lines 69-93): iterates the map and picks entries where `entry.eventTypes.length > 0 && entry.eventTypes.includes(event.event_type)`, subject to a `running < maxConcurrent` guard. Empty `eventTypes` means dormant. On worker throw, the error propagates to the caller (MissionScheduler) for the retry/fail path.
- `getStats()` exposes registered names; MissionScheduler uses it as a registered-worker guard.

### (b) Adapter interface vs the worker interface

The adapter (`external_agent_adapter.js`: `authorizeWorkOrder`, `issueWorkOrder`, `verifyResultEnvelope`, `canonicalEventId`) is pure functions; it does not implement `handle(event)`. Adaptation is a thin wrapper class:

```js
class ExteriorAgentWorker {
  async handle(event) {
    const workOrder = adapter.issueWorkOrder({ ... }); // authorizeWorkOrder runs fail-closed inside
    const envelope = await invokeHermes(workOrder);    // one-shot subprocess, no token, no DB
    const v = adapter.verifyResultEnvelope(envelope, workOrder);
    // PING-side emission of TASK_STARTED / TASK_COMPLETED / EVIDENCE_RECORDED
    return { status: 'ok', ... }; // or { status: 'failed', error } / throw
  }
}
```

The scheduler contract (live `mission_scheduler.js` `_dispatch`) accepts exactly three worker outcomes: throw or `{status:'failed'}` to fail-with-retry, null/undefined to fail (phantom-complete prevention), `{status:'ok'}` (or truthy) to complete. The wrapper satisfies this fully. Proven by the run in section 2.

### (c) Where the constitutional boundary sits

The adapter owns exactly one decision: "may PING issue work order W delegating capability C to external agent A under constraints K?" (`authorizeWorkOrder`, fail-closed). It does not duplicate:

- `CapabilityAuthority.authorize` (live `/app/gateway/capability_authority.js:230`): agent-initiated invocation, the opposite direction.
- `CanonicalizationService.authorizeNamespace`: who may emit into a namespace.
- `WorkerRuntime.dispatch`: which registered workers handle an event (routing, not authorization).

The exterior agent's sandbox boundary is its authority boundary (BOUNDARY.md): it must not emit canonical events, write mission state, touch event storage, decide promotion, or self-assert identity. In the proven run the agent emitted zero events (verified: 0 rows with source `hermes`), never saw a credential, and only produced the result envelope on stdout. Every canonical row was written PING-side through the real `UnifiedEventRuntime`. No new routing authority is created: `WorkerRuntime.dispatch` remains the single execution decider.

### (d) Mission-type routing is one map

Live `mission_scheduler.js` (module scope): `MISSION_WORKER_MAP` maps `mission_type` to worker name. `_dispatch` uses it for (a) the `assigned_to` label and (b) the registered-worker guard, then builds the dispatch event with `event_type = payload.event_type || mission.mission_type` (DOC-CONTRACT in the file: dispatch is on the business event type, never the mission type alone). One new entry, `EXTERIOR_TASK: 'exterior-agent'`, plus one `workerRuntime.register('exterior-agent', worker, { eventTypes: ['EXTERIOR_TASK'] })` at the existing registration site, is the complete routing change. No parallel dispatcher, scheduler, or event store.

**Production registration site** (live `gateway_runtime.js`): line 557 `new WorkerRuntime({ pool })`, line 590 `registerCanonicalWorkers(workerRuntime, { eventRuntime, pool, ... })`, line 510 `new UnifiedEventRuntime({ pool, ... })`, line 553 `new MissionRuntime({ pool, eventRuntime: unifiedEventRuntime })`. The canonical worker list lives in `registerCanonicalWorkers` (`/app/ping-runtime/workers/canonical_workers.js:690`).

## 2. Wiring proof: one isolated Hermes mission end to end

Method (Agent C pattern): a Pig-hosted driver instantiated the REAL production classes from byte-verified live extracts (mission_runtime.js sha256 `4102bd9a...`, mission_scheduler.js `cc0fa09d...`, worker_runtime.js, unified_event_runtime.js, plus the constitutional-time require closure), pointed at live Oracle Postgres through an SSH tunnel. PG credentials resolved from the container env into process memory only. Runtime-local augmentations only: `MISSION_WORKER_MAP['EXTERIOR_TASK'] = 'exterior-agent'` in the driver process, and the lease/retry reapers scoped to `mission_type='EXTERIOR_TASK'` so shared-table live rows were never touched. The live gateway process was untouched; its scheduler skips unknown mission types harmlessly. Driver: `/tmp/phase8/drive.js` on the Pig (ephemeral).

Task: `task-uppercase-002`, capability `text.transform`, bounded read-only Hermes WorkOrder (inline input, no network, no writes, no tools; `--safe-mode -t todo`; `-t none` is rejected by the Hermes CLI, `todo` is the most inert valid toolset).

### Identifier chain (all read back from Postgres or computed independently)

| Item | Value |
|---|---|
| Mission | `685ec6160f9d3862`, type `EXTERIOR_TASK`, status `completed`, `assigned_to` `exterior-agent`, retries 0 |
| WorkOrder | `875368d610b5a395` = sha256(`workorder:task-uppercase-002`)[0:16], independently recomputed, matches |
| authorizeWorkOrder | ran inside `issueWorkOrder`, granted (recorded `authorized:true` in TASK_STARTED payload); 18/18 fail-closed adapter tests re-passed on the Pig before the run |
| Hermes | v0.21.2, exit 0, one-shot, ~7s mission duration |
| Result envelope sha256 | `3f76edca9e4aa93661715739881398cb5ffa15081a884ed252a358f6a4af6ac8`, matches `result_sha256` in TASK_COMPLETED and EVIDENCE_RECORDED |
| Envelope | `{"work_order_id":"875368d610b5a395","agent_id":"hermes","status":"completed","output":"THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG","evidence":{},"error":null}` |
| verifyResultEnvelope | valid; semantic PASS (exact uppercase match, agent_id cross-check vs invoked agent, error null) |
| Evidence ID | `53283c302ef58cd4` = sha256(`evidence:` + work_order_id)[0:16] |
| Exterior-agent-emitted events | 0 (Hermes emitted nothing) |

### Canonical events (PING emitted all seven)

Namespace `tenant::phase8-proof`, correlation `phase8-2026-09-17` for the worker-side events; mission lifecycle events land in `core::system` (the production default, same as Agent C observed):

1. `MISSION_CREATED` `2bce47d753da6fd5fd5575050c6665bfce42710edf337fd0cfdbea89eac4174b` (mission-runtime)
2. `MISSION_ASSIGNED` `5efed40496b42b80fbf6f7e2a327782416db3a04732a7ee60224fc63f4bb5d46` (mission-runtime)
3. `MISSION_STARTED` `3284dba3cb303dd8a354e22293ec1cd92d659c5c0fc6e50f88b38a312edfc452` (mission-runtime)
4. `TASK_STARTED` `e97152a297e5ce4edb56349cb0e49177040794bf9a81965e67fd8e0b97faa854` (exterior-agent-worker, causation = mission id)
5. `TASK_COMPLETED` `5ba10fc3cb0daed60946834067a0704b0e282f9087298f91d847152a08507dbf` (causation = TASK_STARTED, verified:true)
6. `EVIDENCE_RECORDED` `ffbd6166af2416c3b0d50ee0b0d173e2191b5566793485053820ea1a106c88f7` (causation = TASK_COMPLETED, verification PASS)
7. `MISSION_COMPLETED` `c2ebc23c5cf60521c0a2a4b008d84e7f891b318fd4c1e85d949706dd1ecbb2b1` (mission-runtime)

Chain verified: mission created through the ordinary `MissionRuntime.create` path (real row, deterministic ID, idempotency via ON CONFLICT), claimed/started/completed by the real scheduler, dispatched by the real `WorkerRuntime.dispatch` to the registered `exterior-agent` worker, `authorizeWorkOrder` enforced, Hermes executed, `verifyResultEnvelope` validated, PING recorded result and evidence. Exactly one `EXTERIOR_TASK` mission exists; zero lease/reclaim side effects on live rows.

## 3. Production wiring: exact change (READY-PENDING-RESTART)

The sibling agent owns live gateway files and restarts. When it is ready, the complete production change is:

1. `ping-runtime/orchestration/mission_scheduler.js`: add one entry to `MISSION_WORKER_MAP`: `EXTERIOR_TASK: 'exterior-agent',`
2. New file `ping-runtime/workers/exterior_agent_worker.js`: the `ExteriorAgentWorker` class (production-hardened version of the proven harness wrapper; transport injectable; emits TASK_*/EVIDENCE_RECORDED via the injected eventRuntime; never lets the agent touch credentials, events, or mission state).
3. `ping-runtime/workers/canonical_workers.js`, inside `registerCanonicalWorkers`, add one entry to the `workers` array: `{ name: 'exterior-agent', Worker: ExteriorAgentWorker, eventTypes: ['EXTERIOR_TASK'], options: { eventRuntime: options.eventRuntime } },`
4. Adapter placement: `external-agent/` currently lives untracked in the `sprint/agent-exec` worktree; the owning unit decides its canonical require path for the worker file.
5. Restart the gateway (sibling owns; not done here).

**Transport/host caveat (no framework invented, documented only):** `hermes.exe` is Windows/Pig-native; the Oracle gateway runs Linux ARM64 and cannot spawn it. This proof ran the worker Pig-hosted against live Postgres. Routing a live Oracle-gateway mission to a Pig-hosted exterior agent requires a remote-invocation transport decision (direction, credentials, trust boundary) that is outside the map-entry subtrack and was not built here.

## 4. Honest notes and limits

- The harness ran the worker Pig-hosted, not inside the live gateway process; the classes, DB, ID formulas, and scheduler/dispatch semantics are the real production ones, but fleet-level replay of exterior missions is still unproven.
- The scheduler drops the worker's return payload (only status is consumed); verification detail lives in the TASK_COMPLETED/EVIDENCE_RECORDED events, not the mission row.
- Mission lifecycle events carry no correlation threading and land in `core::system`; the exterior chain carries explicit correlation/causation in `tenant::phase8-proof`.
- The 18/18 adapter fail-closed tests were re-run on the Pig immediately before the proof run: PASS.
- Live gateway health 200 at proof end; no stray tunnel processes left on the Pig; `/tmp/phase8` harness files are ephemeral.
