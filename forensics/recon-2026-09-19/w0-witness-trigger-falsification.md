# W-0 Verdict: Witness Trigger Falsification Protocol — CLOSED

Branch: constitutional-convergence-v2. Worktree: /home/nolan/worktrees/constitutional-convergence.
Investigator: LANE-W. Date: 2026-09-18. Falsification round 1 folded in (independent investigator).

## Headline verdict

**H1 VERIFIES at branch HEAD (84da2d40c). H0 FALSIFIED.** Commit 91e1337f4 severed the
previous effective autonomous witness trigger and installed no legitimate replacement.
The "disconnected" headline was INFERRED; it is now SOURCE_VERIFIED for the branch.
It does NOT apply to the deployed artifact.

## Plane split (recorded, must be reconciled before any witness rollout)

- **LIVE_RUNTIME** (ping-gateway:devin-boundary2, image built 2026-09-16, container up 26h):
  runs PRE-91e1337f4 code. Old trigger connected AND the unverified-creation bypass is LIVE.
  Observed live: 26 REPLAY_COMPLETED (all kernel_verified) -> 26 WITNESS_CREATED, 0 refusals
  (via /mc/replay/stats and /mc/witness/stats on the deployed gateway, port 8080).
- **LOCAL_BRANCH** (HEAD 84da2d40c): autonomous trigger disconnected, but forgeable:
  unauthenticated POST /missions -> MissionRuntime.create (zero missionType validation)
  -> scheduler poll -> event_type fallback -> WorkerRuntime.dispatch -> WitnessWorker
  emits fabricated WITNESS_CREATED with attacker-chosen root and a full static trace.
  No canonical-store authentication anywhere in the path.

## BEFORE (parent ce3f8687c == deployed code)

Producer -> event -> consumer -> witness output, all effective:

1. ReplayWorker.handle(REPLAY_VERIFY | PROJECTION_CREATED) runs the deterministic kernel
   via injected replayProvider, then BaseWorker._emit('REPLAY_COMPLETED',
   {documentId, replay:{verified, reason, fingerprint, witness_root, ...}, authority, upstreamEventId})
   -> UnifiedEventRuntime.emit -> persisted to ping_events (identity = hash of
   {event_type, source, namespace, payload}).
2. EventToMissionBridge subscribed to REPLAY_COMPLETED (EVENT_MISSION_MAP had
   `REPLAY_COMPLETED: { missionType: 'WITNESS_CREATE', priority: 1 }`) -> creates mission
   type WITNESS_CREATE with payload.event_type='REPLAY_COMPLETED' plus the original event's
   event_id/source/namespace/correlation_id.
3. MissionScheduler._poll -> MISSION_WORKER_MAP['WITNESS_CREATE']='witness' (registered guard
   passes) -> builds dispatch event with event_type = payload.event_type ('REPLAY_COMPLETED',
   NOT the mission_type; per the DOC-CONTRACT in mission_scheduler.js) -> WorkerRuntime.dispatch.
4. WorkerRuntime.dispatch matches WitnessWorker (eventTypes included 'REPLAY_COMPLETED') ->
   handle: honesty gate requires replay.verified===true on the REPLAY_COMPLETED path ->
   emits WITNESS_CREATED (or WITNESS_REJECTED on unverified).

Bootstrap (gateway/bootstrap/gateway_runtime.js) wires WorkerRuntime -> registerCanonicalWorkers
(with live KernelReplayExecutionProvider) -> MissionScheduler.start() -> EventToMissionBridge.start()
unconditionally. Live execution proven: 26/26 attestations in deployed PG.

## AT (91e1337f4, "fix(witness): remove unverified creation bypass") — exact changed edges

1. ping-runtime/orchestration/event_to_mission_bridge.js: removed
   `REPLAY_COMPLETED: { missionType: 'WITNESS_CREATE', priority: 1 }`.
2. ping-runtime/orchestration/mission_scheduler.js: removed `WITNESS_CREATE: 'witness'`.
3. ping-runtime/workers/canonical_workers.js: WitnessWorker eventTypes
   ['WITNESS_CREATE','REPLAY_COMPLETED'] -> ['REPLAY_COMPLETED']; non-REPLAY_COMPLETED
   triggers now hard-rejected as unsupported_witness_trigger.

Edge 1 is the load-bearing removal: the bridge was the ONLY autonomous producer of missions
carrying REPLAY_COMPLETED payloads (only other mission producer is the unvalidated HTTP route).

## AFTER (HEAD 84da2d40c)

ReplayWorker still emits REPLAY_COMPLETED to the bus. The bridge ignores it (no mapping) ->
no mission -> scheduler never dispatches -> WitnessWorker has no autonomous trigger.
Autonomous witness pipeline: SEVERED. The worker also gained (84da2d40c) a
witness_root non-empty-string requirement, which narrows but does not authenticate.

## The competing findings — both VERIFY

**Q4 (fabricated-witness route, terminal state "prove route unreachable" FALSIFIED):**
POST /missions (gateway/routes/missions.js:25, mounted at gateway_runtime.js:819 under /mc,
no auth on the route) accepts arbitrary { missionType, payload, priority, createdBy }.
Mission { missionType:'REPLAY_VERIFY', payload:{ event_type:'REPLAY_COMPLETED',
replay:{ verified:true, witness_root:'<attacker-chosen>', fingerprint:'x', replay_id:'y' }, ... } }
-> scheduler: MISSION_WORKER_MAP['REPLAY_VERIFY']='replay' (registered) -> dispatch event
event_type='REPLAY_COMPLETED' (fallback payload.event_type || mission.mission_type) ->
WorkerRuntime.dispatch matches ONLY the witness worker -> WitnessWorker.handle trusts
payload.replay.verified / witness_root off the dispatch envelope -> emits fabricated
WITNESS_CREATED with a full static trace (causation_id = mission, correlation inherited).
Sandbox execution proof: see w1-sandbox-fabrication-proof.md (isolated scratch PG, never
touching the live container or shared postgres).

**Q3 ("worker authenticated by its canonical event_id" FALSIFIED):** WitnessWorker.handle
never reads the canonical store. It authenticates nothing; verified/witness_root come from
the dispatch envelope. Consequence: W-1 cannot certify until the worker authenticates its
trigger against the canonical store.

## Refuting the alternative readings

- "A removed import is not an effective disconnection": correct in general, but here the
  removed edge was the bridge mapping, the only autonomous mission producer for
  REPLAY_COMPLETED. Verified by enumerating all MissionRuntime.create call sites:
  only EventToMissionBridge (autonomous) and gateway/routes/missions.js POST / (manual).
- "The scheduler fallback reopens a legitimate trigger": no. The fallback route carries
  no replay certification; at HEAD it is a fabrication route, not a trigger.
- "WITNESS_CREATE label route still works": no. Scheduler map entry removed; a
  WITNESS_CREATE mission now fails the registered-worker guard and is skipped/failed.
  The worker also rejects WITNESS_CREATE events outright.

## Decision (per W-0 brief: install a proper trigger, do not leave ambiguous)

INSTALL A PROPER TRIGGER with the fabrication route closed (W-1):

1. Bridge: REPLAY_COMPLETED -> mission type WITNESS_ATTEST (new label; the old
   WITNESS_CREATE label stays retired as the bypass vector).
2. Scheduler: WITNESS_ATTEST -> 'witness'.
3. Dispatch-time consistency: the dispatched event_type must be in the assigned worker's
   registered eventTypes, else the mission fails without dispatch (closes label/eventType
   mismatch misrouting; phantom-complete prevention already exists downstream).
4. Worker-side canonical authentication: WitnessWorker resolves payload.event_id against
   the canonical store (ping_events) and attests ONLY the certified replay result read
   from the persisted REPLAY_COMPLETED event; the dispatch envelope's replay claims are
   treated as untrusted hints. Rejects (WITNESS_REJECTED, observable) on absent/mismatched
   canonical events. The worker does not re-run the kernel: replay provider owns
   verification, the worker attests the certified result.
5. Auth on POST /missions (route-level; coordinated with the gateway owner if a wider
   auth scheme exists).
6. Wall-clock idempotence: logical_id on WITNESS_CREATED / WITNESS_REJECTED /
   REPLAY_COMPLETED emissions so retried emissions mint identical event_ids and
   ON CONFLICT dedup actually works.
7. EventGovernance payload schema for WITNESS_CREATED.

Formal suspension was the alternative; rejected because the witness stage is a
constitutional evidence stage and the live runtime already depends on it.

## What was falsified

- H0 (91e1337f4 did not disconnect the effective trigger): FALSIFIED at branch HEAD.
- "Disconnected" as a global claim: FALSIFIED for the deployed artifact (still connected,
  bypass live).
- Q4 terminal state "prove route unreachable": FALSIFIED; route proven reachable and
  (in sandbox) executable.
- Q3 "worker authenticated by canonical event_id": FALSIFIED.

## Next broken arrow

W-1: attestation emission contract + proper trigger + route closure (above, items 1-7).
Invariant tests first, then implementation, sandbox execution proof of closure, commit.
