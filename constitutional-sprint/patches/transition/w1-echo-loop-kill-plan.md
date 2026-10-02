# KILL PLAN — mission echo loop (F243) + P-T1 enforcement design

**Status:** PROPOSE-ONLY. No kill switch installed. **NO LIVE-FIRE DRILL RUN.**
**Date:** 2026-09-24. **Worker:** W1 (consumes F124/F172/F242/F243; see `fleet/gateway/w1-event-lane-echo.md` F255–F259).
**COMMITS CREATED: NONE.** No staging, no installs, no live-runtime mutations.

The lane's warning stands and is repeated here verbatim in intent: **a live-fire drill ignites the
unbounded loop without a kill plan.** This file IS the kill plan. The drill comes after.

---

## 1. TRIGGER ANATOMY (the exact chain)

Fuel: any `PROJECTION_CREATED` event reaching the bridge, OR one direct unauthenticated
`POST /missions {missionType:'PROJECTION_CREATE'}` (`gateway/routes/missions.js:22`, no auth — F124;
scheduler auto-dispatches within 5s).

1. `MissionScheduler._dispatch` builds the dispatch event on the **original business event type**
   (`mission_scheduler.js:24-32` DOC-CONTRACT, `:219-244`): a `REPLAY_VERIFY` mission dispatches as
   `event_type='PROJECTION_CREATED'`.
2. `WorkerRuntime.dispatch(event)` (`worker_runtime.js:69-108`) **broadcasts** to every worker whose
   `eventTypes` include `PROJECTION_CREATED` → the projection worker re-runs
   (`canonical_workers.js:708-709`).
3. `ProjectionWorker` re-emits `PROJECTION_CREATED` (`canonical_workers.js:182`) with a fresh-timestamp
   payload → fresh content-hash `event_id` (`unified_event_runtime.js:80-83`) → defeats
   `ON CONFLICT DO NOTHING` (`:153`).
4. `EventToMissionBridge` mints a new `REPLAY_VERIFY` mission (`mission_runtime.js:78-84`;
   `mission_id = sha256('REPLAY_VERIFY:' + new_event_id)`, distinct every echo).
5. Goto 1. Each cycle also spawns the replay→witness→lineage tail and a Qdrant point.
   Throttled ONLY by scheduler `maxConcurrent=3` / per-worker `maxConcurrent=2` — rate limits, not termination.

Collateral: the echo **poisons observability** — `/mc/missions/stats` completed counts and `ping_events`
row counts inflate, reading as healthy throughput. The only early signal is abnormal correlation-group growth.

Why OBS3's fix would not work: it removes self-subscription from worker `eventTypes`, but at cc6856c no
worker is registered on its own output type (F172 refuted the cited mechanism). The live mechanism is
dispatch-time re-matching — the fix must be at dispatch time (P-T1, §5).

## 2. KILL-SWITCH INSERTION POINTS (in order; install before any drill)

| # | Switch | Location | Effect | Latency |
|---|---|---|---|---|
| K1 | Scheduler poll pause | `mission_scheduler.js:190-213` — check a pause flag (env or in-memory) at the top of `_poll` | stops new dispatches | ≤ 1 poll interval (5s) |
| K2 | Bridge mint pause | `event_to_mission_bridge.js` — flag/filter stopping `REPLAY_VERIFY` minting for `PROJECTION_CREATED` | stops new mission creation even if events flow | immediate |
| K3 | P-T1 dispatch scoping | §5 — `WorkerRuntime.dispatch(event, onlyWorker)` | structural: removes the re-match permanently | on deploy |
| K4 | `/missions` ingress auth | gate `POST /missions` per s5-F1's minimum change (same authn/authz as the gateway uses elsewhere; scheduler rejects `mission_type` not in `MISSION_WORKER_MAP` with an event) | removes the remote trigger | on deploy |

Secondary audit (not a switch): `WorkerRuntime._poll` (`worker_runtime.js:145-159`) polls the vestigial
`/events/unprocessed` endpoint and calls broadcast `this.dispatch(event)` — a second fan-out path if that
endpoint ever serves rows again. P-T1's `onlyWorker = null` default preserves its broadcast behavior
deliberately; revisit only if the endpoint is revived.

Proposed diff shape for K1/K2 (minimal, additive, propose-only):

```diff
--- a/ping-runtime/orchestration/mission_scheduler.js
+++ b/ping-runtime/orchestration/mission_scheduler.js
@@ async _poll() {
+    // K1 kill switch: pause dispatch without stopping the process.
+    if (process.env.MISSION_SCHEDULER_PAUSED === '1' || this._paused) return;
     try {
```

```diff
--- a/ping-runtime/orchestration/event_to_mission_bridge.js
+++ b/ping-runtime/orchestration/event_to_mission_bridge.js
@@ (REPLAY_VERIFY mint site)
+    // K2 kill switch: stop re-minting on PROJECTION_CREATED during loop kill.
+    if (process.env.BRIDGE_REPLAY_VERIFY_PAUSED === '1' || this._paused) return;
```

## 3. DETECTING A LIVE LOOP FROM THE JOURNAL (read-only runbook)

Baseline first: run these against the live journal (`brain-postgres`/`ping_runtime`) now to bank quiescent
values (F249: 2429 rows baseline 2026-09-24). Re-run on any alert.

1. `SELECT event_type, count(*) FROM ping_events WHERE created_at > now() - interval '5 minutes' GROUP BY 1 ORDER BY 2 DESC;`
   → `PROJECTION_CREATED` dominating and growing window-over-window = loop signature.
2. `SELECT mission_type, state, count(*) FROM ping_missions GROUP BY 1,2;`
   → `REPLAY_VERIFY` in `created`/`pending` growing unboundedly.
3. `SELECT correlation_id, count(*) FROM ping_events WHERE created_at > now() - interval '1 hour' GROUP BY 1 ORDER BY 2 DESC LIMIT 20;`
   → one chain absorbing the majority of new rows = the only early signal.
4. Chain walk: echo missions carry `mission_id = sha256('REPLAY_VERIFY:' || payload->>'event_id')` with
   `payload->>'event_id'` pointing at the parent echo's `PROJECTION_CREATED` — walkable via
   `GET /events/:eventId/descendants`.
5. Cross-check: `/mc/missions/stats` completed rising while (1)–(3) show a single chain = poisoned
   observability, not throughput. Trust the journal, not the stats.

## 4. RECOVERY PROCEDURE (operator-run, in order)

1. **Arm K1 + K2** (pause scheduler poll, pause bridge mint). New fuel stops within seconds.
2. **Drain or dead-letter in-flight echo missions** via the existing `_failMission` → DLQ path
   (`mission_scheduler.js:289-330`). **Never `DELETE` journal rows** — append-only; F204: zero backups,
   journal loss is permanent.
3. **Verify quiescence** with §3 probes across two consecutive quiet windows.
4. **Apply P-T1 (+ K4 `/missions` gate)**, re-enable K1/K2, run the bounded chain test (§5 TEST).
5. **Bank the new quiescent baseline** (§3 queries) for future alerts.

## 5. P-T1 ENFORCEMENT DESIGN (dispatch only to the assigned worker)

- WHY: `_dispatch` already resolves `workerName = MISSION_WORKER_MAP[mission.mission_type]` (`:193`) and
  verifies registration (`:199-204`), then discards that knowledge and broadcasts. P-T1 keeps it.
- EVIDENCE: `fleet/observability/obs1-scratch/mission_scheduler.js:193-204,250`;
  `worker_runtime.js:69-108`; F172 (OBS3 fix refuted); F258.
- MINIMUM CHANGE:
  - `worker_runtime.js`: `async dispatch(event, onlyWorker = null)`; inside the worker loop,
    `if (onlyWorker && name !== onlyWorker) continue;` — event_type on a mission dispatch event is data,
    not a routing broadcast.
  - `mission_scheduler.js:250`: `this._workerRuntime.dispatch(event, workerName)`.
  - Update the `[DOC-CONTRACT]` comment (`:24-32`): *a mission executes exactly its assigned worker.*
  - No second dispatcher, no new authority; the registered-worker guard and phantom-complete prevention stay.
- FAILURE SEMANTICS:
  - `mission_type` not in `MISSION_WORKER_MAP` → existing skip + stats (add a journal/log event per s5-F1).
  - Assigned worker unregistered → existing skip path.
  - Assigned worker returns null/no-match → existing skip + `_failMission` (phantom-complete prevention intact).
  - Worker throws → existing retry → exhaustion → DLQ.
- TEST (only after K1/K2 armed; never a blind live-fire): unit — synthetic `REPLAY_VERIFY` with
  `payload.event_type='PROJECTION_CREATED'` → assert only the replay worker ran, no `PROJECTION_CREATED`
  emitted; chain — one `PROJECTION_CREATED` through the bridge → `ping_missions` grows by a bounded finite
  chain and returns to quiescent.
- DEPENDENCY: touches the `[DOC-CONTRACT]` convergence-ledger entry — route through Agent 20 before any test
  (obs1 open question 3, carried, not resolved here).
- RESULT: Design written; NOT APPLIED.

## 6. WHAT MUST WAIT FOR NOLAN

1. **F252 probe ownership:** who runs the read-only live probe matrix (which revision serves :8080 now),
   and is a structurally-invalid-body POST acceptable as the probe.
2. **Credential choice (F253/F259):** middleware-attached agent identity as primary credential vs the env
   bearer token vs both.
3. **F244 canonical-home ruling:** the deploy carrying K3/K4 (and the hardened event-lane gate) needs the
   governance ruling first; the deploy freeze is respected until then.
4. **The live-fire drill itself:** stays PROHIBITED until K1+K2 are installed and §3 baselines are banked.

**Deliverables:** this file; `patches/transition/w1-event-lane-auth-hardened.md`;
`fleet/gateway/w1-event-lane-echo.md` (F250–F259). **COMMITS CREATED: NONE.**
