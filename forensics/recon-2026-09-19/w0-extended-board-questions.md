# W-0 Extended Verdict: Witness Trigger + Board Questions — EVIDENCE ONLY

Branch: constitutional-convergence-v2. HEAD: 84da2d40c. Lane: W (sole writer).
Status: READ ONLY. No implementation until the writer authorization packet.
Terminal state: **H1 PROVEN / H0 FALSIFIED; lane is WRITER UNIT READY**
(bounded W-1 unit specified below, not implemented).

Supersedes and folds in: w0-witness-trigger-falsification.md (kept as the
falsification-protocol record) and falsification round 1 (independent investigator).

## Plane split (reconciled)

- **CURRENT SOURCE** (branch HEAD 84da2d40c): autonomous witness trigger severed;
  worker forgeable via manual missions (sandbox-proven). DISCONNECTED-BUT-FORGEABLE.
- **CURRENT BUILD** (all local images: ping-gateway:latest 0445d9656f75,
  ping-gateway:devin-boundary2 5f018a301b3b, devin-boundary1): no image contains
  91e1337f4 or 84da2d40c. :latest and :devin-boundary2 both carry the PRE-91e
  trigger code (verified by extracting event_to_mission_bridge.js and
  mission_scheduler.js from the images). No branch build exists.
- **CURRENT LIVE** (ping-gateway:devin-boundary2, image 2026-09-16, container up 26h):
  runs pre-91e code. Old trigger connected; unverified-creation bypass LIVE.
  Observed: 26 REPLAY_COMPLETED (all kernel_verified) -> 26 WITNESS_CREATED,
  0 WITNESS_REJECTED (via /mc/replay/stats, /mc/witness/stats); LINEAGE_CREATED
  events exist with payload.lineage.eventType='WITNESS_CREATED' and causation
  chains into WITNESS_CREATED event ids (via /mc/queues/LINEAGE_CREATED).
  Full consumer chain executes live.

Reconciliation: the witness pipeline that runs in production is NOT the pipeline
described by branch HEAD. Any witness rollout must reconcile source/build/live
before proceeding; deploying HEAD as-is silently drops the witness stage.

## BEFORE / AT / AFTER (from w0-witness-trigger-falsification.md, standing)

- BEFORE (ce3f8687c == deployed): ReplayWorker -> REPLAY_COMPLETED on the bus ->
  bridge (REPLAY_COMPLETED->WITNESS_CREATE) -> scheduler (WITNESS_CREATE->witness,
  dispatch on payload.event_type) -> WitnessWorker (eventTypes incl. REPLAY_COMPLETED,
  gate on verified for REPLAY_COMPLETED only) -> WITNESS_CREATED. EFFECTIVE.
- AT (91e1337f4): three edges removed (bridge mapping, scheduler mapping,
  witness 'WITNESS_CREATE' eventType). The bridge mapping was the only autonomous
  mission producer for REPLAY_COMPLETED.
- AFTER (HEAD): REPLAY_COMPLETED still emitted; bridge ignores; no mission; no
  dispatch; no autonomous witness trigger. The remaining trigger is manual missions
  via unauthenticated POST /missions -> fabrication route, not a trigger.

## Board questions, answered from primary source

**1. Who emits WITNESS_CREATED?**
WitnessWorker only (ping-runtime/workers/canonical_workers.js:514), via
BaseWorker._emit -> UnifiedEventRuntime.emit -> ping_events. No other executable
emitter repo-wide. (REPOSITORY_WITNESS_CREATED appears only in the generated
registry; zero executable emitters. Legacy/dead name; R5/R6 classification material.)

**2. Who consumes WITNESS_CREATED?**
(a) EventToMissionBridge subscribes (event_to_mission_bridge.js:64) ->
creates LINEAGE_CREATE missions. (b) LineageWorker, whose registered eventTypes
are ['LINEAGE_CREATE','WITNESS_CREATED'] (canonical_workers.js:732); the bridge's
LINEAGE_CREATE mission carries payload.event_type='WITNESS_CREATED', so dispatch
matches the lineage worker, which emits LINEAGE_CREATED. (c) Observability:
gateway/routes/mission_control.js /mc/witness/stats queries WITNESS_CREATED and
WITNESS_REJECTED. No other consumers.

**3. Consumer source / artifact / bootstrap / live reachability.**
Source: bridge map present at HEAD and pre-91e. Artifact: present in the deployed
image (verified by extraction). Bootstrap: gateway_runtime.js:586-590 starts the
bridge, which subscribes to every mapped event type including WITNESS_CREATED.
Live: PROVEN. LINEAGE_CREATED rows exist in deployed PG with
payload.lineage.eventType='WITNESS_CREATED' and causationChain into WITNESS_CREATED
event ids. The consumer leg executes end to end in production.

**4. Retry -> second witness? PROVEN (sandbox execution).**
Dispatching the identical REPLAY_COMPLETED trigger twice produced two
WITNESS_CREATED rows with distinct event_ids (event_a1564b69eecfedc5,
event_bd885d561ba23bc3), same witness_root. Root cause: event identity preimage
is {event_type, source, namespace, payload} (unified_event_runtime.js step 4);
the witness payload embeds witness.timestamp (wall-clock). A retry mints a new
event_id, so ON CONFLICT (event_id) DO NOTHING cannot dedup. Mission-level retry
(reclaimRetryPending -> redispatch -> handle -> _emit) hits the same path.
Exact broken arrow: wall-clock inside the identity preimage.

**5. Wall-clock in identity? PROVEN (source).**
unified_event_runtime.js: identityData = { event_type, source, namespace,
payload|logical_id }. BaseWorker._emit never passes logical_id. WitnessWorker
builds payload.witness.timestamp = constitutionalTimeAuthority.nowAsISOString().
Therefore wall-clock is in the identity preimage for every WITNESS_CREATED
(and WITNESS_REJECTED, and REPLAY_COMPLETED) emission.

**6. Naked verified bypass? PROVEN (sandbox execution + source).**
At HEAD the worker requires payload.replay.verified===true AND a non-empty
payload.replay.witness_root, but both are read off the dispatch envelope with no
canonical-store authentication. Sandbox: missionRuntime.create('REPLAY_VERIFY',
{ event_type:'REPLAY_COMPLETED', replay:{ verified:true,
witness_root:'attacker-chosen-root-xyz', ... } }) -> scheduler -> witness ->
fabricated WITNESS_CREATED attesting 'attacker-chosen-root-xyz'. The boolean is
no longer naked (root now required), but the pair is still envelope-trusted.
Pre-91e bypass (WITNESS_CREATE label, zero gate) is closed at HEAD source and
remains LIVE in the deployed artifact.

**7. EventGovernance validation? PROVEN (source): none on payload.**
EventGovernance.validateEvent checks registration, authority_owner, canonical
namespace format, and ownership namespace. The registry carries payload_schema
entries, but validateEvent never reads them. WITNESS_CREATED payload shape is
unenforced at the gate.

**8. Event_type fallback changing meaning? PROVEN (source + sandbox).**
MissionScheduler._dispatch builds the dispatch event with
event_type = payload.event_type || mission.mission_type, while the assigned worker
comes from MISSION_WORKER_MAP[mission.mission_type] and WorkerRuntime.dispatch
selects purely by eventTypes. Consequence: a mission labeled REPLAY_VERIFY
(assigned 'replay') can execute WitnessWorker (sandbox test A: missionType
REPLAY_VERIFY -> WitnessWorker.handle ran). The work order and the executed work
can name different workers. The DOC-CONTRACT presents dispatch-on-original-event-type
as intentional; the mismatch is the mechanism the fabrication route rides.

**9. Replay regenerating same witness? SPLIT: content yes, identity no (source + sandbox).**
Content: replay_id = transcript_id || 'replay-'+hash(eventsToReplay); the kernel is
deterministic; same input -> same witness_root (sandbox retry probe: sameRoot=true).
Identity: no (see Q4/Q5). A regenerated replay yields the same root under a new
event_id.

**10. Omitted hash inputs? PROVEN (source).**
Identity preimage omits: spine timestamp, all metadata (causation_id,
correlation_id, confidence, confidence_source), sequence. Two emissions with
identical payloads but different causal chains share an identity (desirable once
wall-clock is removed). The witness payload itself omits replay violations,
event_count, leaf_count, and engine version: the attestation does not record
what the replay covered.

**11. Truncated leaf? PROVEN FAIL-OPEN (source).**
gateway/kernel_replay_execution_provider.js: replayEvents.slice(0, maxEvents)
(default 10000) silently truncates with no flag in the result; malformed events
and malformed envelopes are skipped via `continue` (stats.failures++ only).
Result status stays 'ok'; with violations==[] ReplayWorker sets verified=true.
A replay over a truncated/skipped input set CAN yield verified:true, and the
witness will attest its root. ('no_events' and 'conversion_failed' do fail
closed; the hole is partial skip/truncation under status 'ok'.)

**12. Algorithm version change? PROVEN UNVERSIONED (source).**
DeterministicReplayEngine runs at engine_version 'v1' (default; surfaced only in
provider stats). Neither the REPLAY_COMPLETED payload nor the WITNESS_CREATED
payload carries the engine/algorithm version, the witness algorithm version, or
an input schema version. An engine change would silently produce different roots
with no version marker in any attested artifact. This is the W-2 unit.

**Provenance note:** causation_id, correlation_id, namespace are threaded by
BaseWorker._emit and preserved across the chain (observed live in LINEAGE_CREATED
rows). No 'principal' concept exists anywhere in the worker/event/mission layer
(grep: zero hits); the W-1 brief's "principal provenance" names something
unimplemented here. The unit must not invent it; record as UNKNOWN.

## Sandbox evidence (isolated; scratch PG container witness-sandbox-pg:15433;
never touched live container, shared postgres, or persistent state)

- harness.js (sha256 2bd0dfee...): TEST A fabrication -> fabricated:true,
  WITNESS_CREATED with root 'attacker-chosen-root-xyz'; TEST B legacy
  WITNESS_CREATE label -> no worker, mission skipped, zero new witness events;
  TEST C autonomous trigger -> bridge created zero missions for REPLAY_COMPLETED,
  zero witness events.
- retry.js (sha256 56fe5f88...): same trigger dispatched twice -> two
  WITNESS_CREATED rows, distinct event_ids, same root. Retry -> second witness.
- Local copies: /tmp/witness-sandbox-harness.js, /tmp/witness-sandbox-retry.js
  (this VM); Pig copies under /tmp/witness-sandbox/.

## Terminal state

- H0 (91e1337f4 did not disconnect the effective trigger): FALSIFIED.
- H1 (91e1337f4 severed the previous effective trigger with no legitimate
  replacement): PROVEN at CURRENT SOURCE.
- "Disconnected" as a global claim: FALSIFIED for CURRENT LIVE (still connected,
  bypass live) and CURRENT BUILD (no branch build exists).
- Fabrication route via unauthenticated POST /missions: PROVEN by sandbox execution.
- Retry -> second witness: PROVEN by sandbox execution.
- Lane state: **WRITER UNIT READY.** Bounded W-1 unit specified below; NOT implemented.

## WRITER UNIT READY: bounded W-1 unit specification (for the authorization packet)

Objective: attestation emission contract + proper trigger + fabrication route closure.
Allowed files: ping-runtime/workers/canonical_workers.js (WitnessWorker only),
ping-runtime/orchestration/event_to_mission_bridge.js (one map entry),
ping-runtime/orchestration/mission_scheduler.js (dispatch-time consistency guard),
ping-runtime/events/event_governance.js (WITNESS_CREATED payload schema),
gateway/routes/missions.js (auth/validation on POST /) — last file only if no
wider gateway auth scheme exists; otherwise coordinate.
Forbidden: HPP, Pig reboot, frozen commits, preserved WIP, main branch, any second
witness authority, rogue witness branch.
Predecessor: W-0 (this file). Promotion gate: invariant tests + sandbox execution
proof that (a) bridge REPLAY_COMPLETED -> WITNESS_ATTEST mission -> witness fires
on a genuine kernel replay, (b) forged manual mission is rejected with observable
WITNESS_REJECTED and zero WITNESS_CREATED, (c) retried emission dedups to one
event_id, (d) WITNESS_CREATED with malformed payload is rejected by governance.
Invariants to preserve: 12-leaf roots untouched (W-2 owns versioning); no
canonical_hash field on WITNESS_CREATED (retired); event_id identifies the
attestation; witness_root identifies content; replay provider owns verification,
worker attests the certified result (no worker-side kernel re-execution).

## What was falsified (cumulative)

H0; global "disconnected"; Q4 terminal "prove route unreachable"; Q3 "worker
authenticated by canonical event_id"; "registry payload_schema is enforced";
"truncated replay cannot verify"; "algorithm version is bound into attestations";
"principal provenance exists in this layer".

## Next broken arrow

Writer authorization packet for the W-1 unit above. Until it arrives: no mutation.
