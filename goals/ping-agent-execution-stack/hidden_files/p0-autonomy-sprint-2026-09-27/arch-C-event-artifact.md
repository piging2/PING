# ARCH-C: Event Spine / Artifacts / Evidence — P0 Autonomy Sprint Inventory
Date: 2026-09-27 ~13:05 MDT. Scope: read-only archaeology. No code written, no commits, no pushes.
Method: file reads + targeted grep + git status + memory. The HPP original was not touched. :3200 was not disturbed.

## 0. Verdict up front

There is no single governed event spine. There are two disconnected event planes:

- Plane J (JSONL journal): `~/workspace/fyd-journal-gateway/events.jsonl`. Written by the Python
  MC front door and (inertly) by the TS lane-p01 tree. Read by the MC UI routes and the Python
  projector. Nothing in the execution substrate reads it.
- Plane P (Postgres): `brain-postgres/ping_runtime.ping_events` (2,536 rows, latest 2026-09-27 08:18 MDT).
  Written by the gateway's UnifiedEventRuntime. Read by EventToMissionBridge, which mints
  `ping_missions` (497 rows), which the scheduler dispatches to workers.

No writer bridges Plane J to Plane P. No MC path calls UnifiedEventRuntime.emit. P0.13's required chain
(MC -> RUNTIME -> UER -> GOVERNANCE -> ping_events) does not exist as a chain today.

## 1. The ONE reached event path the P0 mission should use

Use the Python front door. It is committed, tested, tenant-hardened, and its journal path resolves on
this machine. The TS lane-p01 dispatch route is dead here (Section 4, B1).

Arrow by arrow, dispatch completion to canonical event:

1. `mission_intent.submit(intent, agent_id, constraints, executor, ...)` 
   `~/workspace/mission-control/mission_intent.py:1044`
   validate (line 323) -> tenant resolved from AUTHENTICATED auth_ctx, never the body (1064-1069) ->
   revocation pre-check (1074) -> idempotency lookup (1084) -> adapter authorize (1129) ->
   `_issue_work_order` (663).
2. `observe([{event_type: "MC_WORK_ORDER_ISSUED", ...}])` at `mission_intent.py:666-672`.
   The issuance record binds work order to authenticated tenant, key, digest, namespace, agent,
   capability. Terminals that do not chain to a preceding issuance are never trusted
   (`_terminal_verified`, lines 735-758).
3. `observe()` at `mission_intent.py:998-1026`: packs the machine record into the summary
   (`_pack_summary`, line 379), calls `_emit.emit_event` with the lane vocabulary
   (MC_GATE_RESULT, MC_WORK_ORDER_ISSUED, MC_LANE_STARTED, MC_LANE_COMPLETED, MC_LANE_FAILED,
   MC_LANE_UNKNOWN, MC_REVOKED, REVOKED_AFTER_DISPATCH, MC_CHECKPOINT, MC_HOLD_RAISED).
4. `emit.emit_event(...)` at `~/workspace/mission-control/emit.py:116-149`:
   unregistered event type raises ValueError (122-123); content-derived event_id
   (`mint_event_id`, line 86); `_append` refuses duplicate event_ids (107-114).
5. `_append` at `emit.py:107-114`: `open(journal_file, "a")`, one JSON line.
   Journal default `~/workspace/fyd-journal-gateway/events.jsonl` via expanduser
   (`emit.py:44-47`). This resolves on this machine. Last write observed: 2026-09-27 01:47.
6. Terminal observation on executor outcome: MC_LANE_COMPLETED (1210), MC_LANE_FAILED (1304),
   MC_LANE_UNKNOWN on crash/timeout/unverifiable result (516-522, 1210). MC_LANE_UNKNOWN is
   terminal but never success (776).
7. Read/projection: `find_intent_record` (761) with issuance-chain verification; the staged FYD UI
   reads `GET /api/mc/missions` (`patch/src/app/sites/_shared/mc-api.ts:101-103`), which projects
   the journal per request (`missions/route.ts:12-16`).

Governance in this path: event-type allowlist, content-derived ids, duplicate refusal, tenant from
auth context, adapter-owned authorize/issue/verify, issuance-chained terminals. There is no separate
"UnifiedEventRuntime" service call; the journal file is the store. That is the honest shape of the
reached path.

## 2. Implementation inventory with classifications

Format: verdict, then one line of evidence (file:line + git status).

### Event writers

- KEEP: `~/workspace/mission-control/mission_intent.py` (committed; last touch 470745b
  "Sprint integration: front-door + tenant hardening"). The governed MC front door. Carries one
  open defect: MC-EVENTBIND-SHADOW (Section 4, B3).
- KEEP: `~/workspace/mission-control/emit.py` (committed, same commit). Allowlisted, idempotent
  journal append. Docstring's "only write path" claim is contradicted by the TS writer (B1).
- DUPLICATE + BROKEN: `~/workspace/lane-p01/tree/src/app/api/mc/_lib/mc-dispatch.ts:213-245`
  (`appendDispatchEvent`; whole `lane-p01/` untracked). Second writer, divergent MC_* vocabulary
  (MC_MISSION_CREATED/MC_RUN_QUEUED/MC_EXECUTION_STARTED/..., lines 126-136), no issuance chain,
  tenant from request body (`dispatch/route.ts:217`). All three path constants are
  `/home/nolan/...` (lines 23-25); `/home/nolan` does not exist on this machine, so every POST
  throws at `mkdirSync` (line 242). Also carries known bug MC-1: `nowIso()` inside the mission-id
  hash (`dispatch/route.ts:256`) duplicates missions on retried POST.
- DUPLICATE: `~/workspace/lane-p01/tree/src/app/api/mc/missions/route.ts` and `missions/[id]/route.ts`
  (untracked). Projector reads the dead `/home/nolan` journal path, so it cannot see Python-written
  events on this machine. MERGE into one projector or fix the path; do not keep two vocabularies.
- BROKEN: `~/workspace/fyd-journal-gateway/server.mjs:150-177` (`POST /events`). Ungoverned append:
  no event-type allowlist, random `fyd-ovl-` ids (`mintId`, line 88), no duplicate refusal, no auth
  (loopback-only by default, line 32-33). Writes the OVERLAY journal
  (`data/fyd-journal/events.jsonl` default, lines 50-53), not the MC journal. Injection surface for
  owner-overlay events from any local process.
- KEEP (reference): `~/workspace/convergence-lane3/unified_event_runtime.js:136-360` (untracked lane
  copy; the live code runs in the ping-gateway container). `emit()` validates type (165), checks
  governance (178), mints `event_<16hex>` identity (211), INSERTs into `ping_events` with
  ON CONFLICT DO NOTHING + canonical_hash collision witness (293-330). Dispatch-on-dedup is
  operator-declared at-least-once law (343-351): duplicate emits still reach handlers.
- KEEP: `~/workspace/ce002/src/mission_runtime.js:70-92` (untracked lane copy; live in container).
  `create()` = `INSERT INTO ping_missions ... ON CONFLICT (mission_id) DO NOTHING` (81-83);
  mission_id = `sha256(missionType:event_id).slice(0,16)` (72-78). Emits MISSION_CREATED only on
  actual insert (86-89). Claim is atomic on `status='created'` (117). This is the mission-row
  authority; its ON CONFLICT is the only hard dedup in the execution plane.
- KEEP: `~/workspace/lane2-p0b/event_to_mission_bridge.js.new` (untracked lane copy; live logic in
  container). `EVENT_MISSION_MAP`: CLAIM_CREATED -> CLASSIFICATION_CREATE (line ~88).
  `reconcileMissingMissions()` anti-joins `ping_missions.payload->>'event_id'` (A0 convention,
  header lines 34-40); `start()` runs reconcile once at boot, then registers live handlers
  (lines ~200-260). Gateway bootstrap calls `start()` with no options
  (`convergence-zoom-2026-09-19/lane-d-execution/pig-src/gateway/bootstrap/gateway_runtime.js:601-605`),
  so reconcile fires on every gateway restart.
- KEEP: `~/workspace/convergence-zoom-2026-09-19/lane-d-execution/pig-src/ping-runtime/workers/canonical_workers.js`
  (09-19 snapshot). ClaimWorker emits CLAIM_CREATED (161); ClassificationWorker handles
  CLAIM_CREATED/CLASSIFICATION_CREATE and unconditionally emits CLASSIFICATION_CREATED (809-841):
  no worker-level dedup; relies entirely on the mission-row claim gate. WorkerRuntime is
  dispatch-only; the `_poll()` loop is disabled (worker_runtime.js:52-56). MissionScheduler is the
  single dispatch path.
- KEEP: `~/workspace/orca-adapter/vendor/external_agent_adapter.js` (authority, not a writer).
  Explicitly holds NO event-identity implementation: "Single authority:
  UnifiedEventRuntime.computeEventId (the spine)" (415-419). authorize/issue/verify live here.

### Artifact / evidence stores

- BROKEN (path) but KEEP (design): `writeArtifact`/`publishArtifact` in
  `mc-dispatch.ts:377-404` (untracked). Answers the P0.14 lineage questions on the happy path:
  WHO (agent), FOR WHICH RUN (mission_id/run_id/execution_id in the emit envelope,
  `dispatch/route.ts:268-272`), FROM WHICH INPUTS (prompt_digest), WITH WHICH EXECUTOR (agent +
  work_order_id), WHAT DIGEST (sha256), WHAT EVENT (event_id in the MC_ARTIFACT_PUBLISHED record,
  projected at `mc-dispatch.ts:340-346`). Broken only because ARTIFACT_ROOT is
  `/home/nolan/workspace/mission-control/artifacts` (line 24); `~/workspace/mission-control/artifacts`
  does not exist. The Python front door has NO artifact store at all (zero "artifact" hits in
  `mission_intent.py`); its result goes to `/tmp/mc-intent-result-<digest>.json` (line ~593).
  Verdict: one artifact authority needed; the TS shape is the better lineage answer, the Python
  path is the live one. MERGE.
- Evidence on terminals: carried inline in `event_data.evidence` and folded into the mission record
  (`mc-dispatch.ts:355-357`; Python: record packed in summary). No standalone evidence store found.

### Tables (brain-postgres/ping_runtime, per 2026-09-27 intel)

- KEEP: `ping_events` (2,536 rows, latest 2026-09-27 08:18 MDT). Writers: gateway UER.emit
  (INSERT, `unified_event_runtime.js:293-296`); worker `_emit` calls; MissionRuntime.create
  (MISSION_CREATED, only on insert). NOT the fyd-journal-gateway: no tailer exists (grep for the
  journal path across .js/.py/.sh found only `emit.py` and test/harness files), the JSONL carries
  MC_* types the bridge does not map, and write cadences differ. Separate writer, confirmed.
- KEEP: `ping_missions` (497 rows). Writers: EventToMissionBridge (`created_by=
  'event-to-mission-bridge'`); second writer pattern exists as a gateway `POST /missions` route
  (`tenanos-wave/scratch/lane-h/ping-gw/gateway/routes/missions.js:25`, scratch copy; verify
  against the live container before relying on the count split).
- DEAD: `mission_events` (0 rows), `mission_executions` (0 rows). No production INSERT found
  anywhere; all hits are test/harness/forensic files. The lifecycle lives in
  `ping_missions.status` + `ping_events`. Schema without writers.
- DEAD: `canonical_events` (0 rows). No production INSERT found. The 09-19 gateway snapshot wired
  `POST /canonical-events` (`gateway_runtime.js:715`); the 2026-09-23 unauthenticated-POST
  reachability defect (memory/2026-09-23.md#L196) appears closed or unused since. Consequence: the
  legacy canonical_events -> ping_events bridge is idle (nothing to sweep).

## 3. Bypass / shortcut / shadow paths found

- B1 (DUPLICATE writer, BROKEN path): TS `appendDispatchEvent` bypasses every Python-side govern
  (allowlist is a different vocabulary, no issuance chain, tenant from body) and writes to a path
  that does not exist here. `mc-dispatch.ts:213-245`; `dispatch/route.ts:256,266`.
- B2 (UNGOVERNED write): `POST /events` on the journal gateway appends arbitrary event types with
  random ids and no dedup. `fyd-journal-gateway/server.mjs:150-177`. Blast radius limited to the
  overlay journal and loopback, but it is a canonical-event injection surface with zero governance.
- B3 (SHADOW, proven): MC-EVENTBIND-SHADOW. `_intent_record` merges `event_bind` over canonical
  fields (`mission_intent.py:402`); only `intent_digest` is protected (set after the merge, line
  404). Reserved bind keys (`tenant`, `idempotency_key`) shadow the packed record. Consequences,
  all in the governed path: `find_intent_record` matches on the shadowed fields (803-805), so a
  tenant-scoped lookup for the true key/tenant MISSES; `submit()`'s duplicate check (1084) then
  misses too and re-dispatches under the same idempotency key; `revoke()` overwrites the
  authenticated tenant with the packed-record tenant (979 set, 983 overwritten). Proven by the
  burn script `~/workspace/goals/ping-agent-execution-stack/hidden_files/backlog-burn-2026-09-27/mc-eventbind-shadow-2026-09-27.py`
  ("tenant shadowed in packed record: True", lookup miss reproduced). Fix: reject reserved keys
  in `validate()`.
- B4 (AT-LEAST-ONCE amplifier): UER dispatch-on-dedup (`unified_event_runtime.js:343-351`).
  Re-emitted duplicates still reach bridge handlers by declared law. Benign only because
  MissionRuntime.create collapses via ON CONFLICT.
- B5 (IDLE hazard): legacy canonical_events -> ping_events bridge remints identity and collapses
  namespace to `core::system` (memory/2026-09-25.md#L2157). Live-but-idle (canonical_events = 0
  rows). DELETE-LATER; do not revive without fail-closed tenant propagation.

## 4. New intel (1): 12:52 MDT bridge re-fire

Mechanism, ranked:

1. Primary: gateway restart after the ~12:47 transport recovery ran
   `EventToMissionBridge.start()` with no options, which runs `reconcileMissingMissions()` once at
   boot (`event_to_mission_bridge.js.new`, start ~line 200; wired at `gateway_runtime.js:601-605`).
   The reconcile re-derived missions for CLAIM_CREATED rows whose A0 payload-join anti-join missed
   the existing `ping_missions` rows, then logged `[EventToMissionBridge] CLAIM_CREATED -> mission
   <id> (CLASSIFICATION_CREATE)` and bumped `missions_created`.
2. Why the SAME mission IDs (e.g. 4369c58ed3fd7513, created 2026-09-25): mission identity is
   deterministic, `sha256("CLASSIFICATION_CREATE:<event_id>").slice(0,16)`
   (`ce002/src/mission_runtime.js:72-78`). Re-derivation of the same event reproduces the same ID.
   This is not ID recycling; it is re-derivation.
3. Why no duplicate rows and no worker re-execution: `ON CONFLICT (mission_id) DO NOTHING`
   (`mission_runtime.js:81-83`) absorbed the re-derive; the already-completed mission kept
   `status='completed'`, and the scheduler only claims `status='created'` (line 117), so
   ClassificationWorker did not re-run. The re-fire is log/stats noise, not a duplicate execution.
4. Ruled out: live-handler redispatch (UER keeps handlers in-memory only; `replay()` is explicitly
   read-only and never re-executes the pipeline, `unified_event_runtime.js:437-460`); legacy-bridge
   re-sweep (canonical_events has 0 rows, nothing to sweep); worker-direct resubscription
   (WorkerRuntime is dispatch-only, `_poll` disabled, `worker_runtime.js:52-56`).

Open: WHY the anti-join missed those rows. Ranked hypotheses: (a) the 09-25 missions were derived
under a different payload shape or mission_type than today's map (the file header admits
EVENT_MISSION_MAP mutates and the A0 join is "a convention, not yet a contract column");
(b) payload->>'event_id' skew from a restore/migration; (c) the live gateway passes a nonzero
reconcileIntervalMs (snapshot passes none) making this periodic rather than boot-only.
Verification for the parent (brain-postgres/ping_runtime):
`SELECT mission_id, mission_type, created_by, payload->>'event_id' AS p_eid, status FROM ping_missions
WHERE mission_id IN ('4369c58ed3fd7513', ...);`
then compare `p_eid` against the CLAIM_CREATED `ping_events.event_id` values and check whether
`mission_type` still equals the current map value. If `p_eid` matches and type matches, the miss
came from (b)/(c) or a transient read skew; if either differs, it is (a), and the A1 upgrade
(source_event_id/routing_version columns, per the file header) is warranted. This incident is
arguably the evidence the header said would justify A1.

Nolan's ugly case "event duplicates": demonstrated in the benign form. The dangerous form (same
claim, DIFFERENT mission_id via routing-law change -> second mission row -> worker re-executes and
emits a duplicate CLASSIFICATION_CREATED, since ClassificationWorker.handle has no dedup,
`canonical_workers.js:809-841`) did not occur here but is unguarded.

## 5. New intel (2): writer topology, brain-postgres

- `ping_events` (2,536 rows): written by the gateway's UnifiedEventRuntime (INSERT at
  `convergence-lane3/unified_event_runtime.js:293-296`), fed by worker `_emit` (ClaimWorker ->
  CLAIM_CREATED at `canonical_workers.js:161`, ClassificationWorker -> CLASSIFICATION_CREATED,
  etc.) and MissionRuntime.create (MISSION_CREATED on insert). Not a tail of the JSONL journal:
  no tailer exists, vocabularies differ (MC_* vs worker chain types), cadences differ.
- `ping_missions` (497 rows): written by MissionRuntime.create via the bridge and the API route
  pattern. The 497 vs 2,536 ratio is consistent: only mapped event types derive missions.
- `mission_events`, `mission_executions`, `canonical_events` (0 rows each): no production writers
  exist. The first two are dead schema; the third is an abandoned ingestion table whose bridge now
  idles. None of this contradicts the lane-p01 MC_* emission: those events go to the JSONL journal
  (Plane J), which the gateway never reads. That is the disconnect, not a contradiction.

## 6. New intel (3): crx_runtime verdict

DEAD. The 739 `ping_events` rows (all `processed=false`, latest 2026-09-16) were written by the
miswired `ping-gateway` container during its ~5-minute life on 2026-09-16 11:49:54-11:54:19 MDT
(`POSTGRES_DB=crx_runtime` -> ping-postgres); the container was stopped and retained as
`ping-gateway-miswired-20260916`, then recreated against `brain-postgres/ping_runtime`
(memory/2026-09-16.md#L570, L626, L646). No live writer since; no live reader (the live gateway
reads `ping_runtime`; the only poller found, `worker_runtime.js:149` -> `GET /events/unprocessed`,
targets the gateway HTTP surface, and the UER itself never sets `processed=TRUE` on emit).
Stale-truth hazard, not live risk: 684 of the 739 IDs are legacy-only, 55 overlap `ping_runtime`,
and the payloads include synthetic test data (`Sarah Chen`, `sarah@example.com`) plus mission types
(CUSTOMER_ONBOARD, LEAD_FOLLOWUP, ...) from the miswire window. Anyone querying the wrong database
gets fiction. Recommend: leave the container stopped; do not delete until Nolan says so (it is
forensic evidence of the 09-16 incident).

## 7. The single highest-leverage broken boundary

Plane J and Plane P are disconnected. The P0 mission's canonical events, emitted through the
recommended Python front door, land in a JSONL journal that the execution substrate (bridge ->
missions -> scheduler -> workers) never reads; conversely the TS tree that the FYD UI reads cannot
even run on this machine (dead `/home/nolan` paths). P0.13 requires ONE chain
(MC -> RUNTIME -> UER -> GOVERNANCE -> ping_events). Today there are two chains with a gap between
them, and the MC-side chain terminates at a file nobody executes from.

Highest-leverage fix: wire ONE emission. Either the MC front door emits terminal/result events
through `UnifiedEventRuntime.emit` into `ping_events` (making MC missions visible to the bridge,
the mission table, and replay), or a governed journal-tailer carries MC journal events into the
gateway. Do not build a third bus. Second priority: fix B3 (reserved event_bind keys), because the
recommended path's idempotency gate is defeasible as it stands. Third: repair or retire the TS
lane-p01 tree (dead paths + duplicate vocabulary), since the FYD UI depends on it.

## 8. Caveats

- The live gateway is a container on the Pig; its exact current source was not inspected (only the
  2026-09-19 pig-src snapshot and lane reference copies, all untracked). Classifications of live
  behavior (bridge start options, legacy adapter still wired, POST /missions route present) rest on
  the snapshot + memory and should be re-verified against the running container, not re-probed over
  the transport per the task note.
- DB row counts and the 12:52 observation are taken from the parent's intel; I did not query
  brain-postgres (no credential handling in this pass).
- `lane-p01/`, `ce002/`, `convergence-lane3/`, `lane2-p0b/` are all untracked in git; the only
  committed MC event code is `mission-control/mission_intent.py` + `emit.py` (branch
  `burn/outreach-caps-2026-09-27`, last MC commit 470745b).
