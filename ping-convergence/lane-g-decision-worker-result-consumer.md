# LANE G Decision Artifact: Missing Consumer Binding for Canonical Worker Result Events

Date: 2026-09-19
Worktree: /home/nolan/worktrees/constitutional-convergence-authority-law
HEAD: 0d3cddd4a67238e0511ae7b58718cd75dd29d8d3 (branch constitutional-convergence-authority-law)
Status: DECISION REQUIRED (policy/architecture — not patched; adding a consumer binding is an authority/policy call)

## The chain, labeled

1. objective -> authorized WorkOrder
   - Authorization: PROVEN. `authorizeWorkOrder` is fail-closed
     (ping-runtime/external-agent/external_agent_adapter.js:255-302).
   - Envelope issuance: PROVEN. `issueWorkOrder` (external_agent_adapter.js:294-345),
     sole live caller orca/control-loop/orca_control_loop.js:753. Deterministic
     work_order_id via `stableWorkOrderId` (external_agent_adapter.js:218-232).
     Schema validation enforced (non-empty strings, input object, ISO deadline, attempt >= 1).
   - Canonical mission anchor: FALSIFIED. No MissionRuntime.create call exists in the loop;
     `mission_id` is the synthetic correlation label `orca-loop:<objective12>:<taskKey>`
     (deliberate, documented orca_control_loop.js:120-122). The chain's first node is not
     a canonical entity.
   - Canonical issuance event: FALSIFIED. No WORKORDER_ISSUED / WORK_ORDER_ISSUED event type
     exists anywhere (exhaustive grep). Issuance is durable only as workorder-<tag>.json
     artifacts plus the objective-runtime store. Canonical-log replay cannot find the
     authorizing issuance.
2. authorized WorkOrder -> executor: PROVEN. `dispatchHermes` (orca_control_loop.js:310-368)
   spawns the hermes dispatcher via WSL->Windows interop (VENV_PY line 98); hermes profile
   is LIVE in AGENT_PROFILES; crash-safe rendezvous collection.
3. executor -> verified result: PROVEN. `verifyResultEnvelope` fail-closed
   (external_agent_adapter.js:368-426): envelope/work-order binding, executor binding
   (authorized == invoked == result agent), capability match, status coherence, deadline.
   Invalid envelopes can never reach the event authority (orca_control_loop.js:838-852).
4. verified result -> canonical result event: PROVEN. `recordVerifiedResult`
   (external_agent_adapter.js:430-476) emits through the REAL UnifiedEventRuntime instance
   (new UnifiedEventRuntime({ pool }), orca_control_loop.js:1128); signature matches
   emit(eventType, source, payload, options) (ping-runtime/events/unified_event_runtime.js:122).
   Effect identity binding PROVEN: result_id = sha256 over
   (work_order_id, mission_id, task_id, attempt, agent_id, capability, context_pack_id, namespace)
   (resultIdentity, external_agent_adapter.js:345-358), passed as logical_id, giving
   idempotent emission (ON CONFLICT DO NOTHING). Live proof: orca/control-loop/evidence/*/
   holds real WORKER_COMPLETED rows with canonical 64-hex event_ids from 2026-09-18 runs.
5. canonical result event -> evidence: FALSIFIED. This is the FIRST missing arrow.
   WORKER_COMPLETED / WORKER_FAILED rows persist in ping_events but have ZERO live consumers:
   - No on('WORKER_COMPLETED') / subscribe('WORKER_COMPLETED') anywhere in live code.
   - The orca process registers no handlers on its runtime instance; the loop consumes the
     result via the direct return value, never re-reading its own canonical event.
   - EventToMissionBridge.EVENT_MISSION_MAP (ping-runtime/orchestration/event_to_mission_bridge.js:23-75):
     no WORKER_* entries.
   - Graph projection (gateway/bootstrap/gateway_runtime.js:613-650): 19 types; WORKER_* absent.
   - EmbeddingService.INDEXABLE_TYPES (ping-runtime/embeddings/embedding_service.js:25-43):
     WORKER_* absent by explicit design ("structural, not embeddable").
   - Python observation/claim workers: legacy plane (kernel.event_dispatcher + repository_client),
     consume DOCUMENT_IMPORTED / OBSERVATION_CREATED only; not connected to canonical ping_events.
   - Only readers: mission_control.js:84 dashboard counts (display only),
     orca/measurements/measure.js (offline, no-I/O analysis module).
6. evidence -> knowledge/projection: FALSIFIED (consequence of 5). Verified worker results never
   become knowledge candidates, embeddings, missions, or observations.

## Recommended consumer (from existing contracts, no new subsystem)

The Graph Projection in gateway/bootstrap/gateway_runtime.js:613-650:
`knowledgeGraph.addNode('event', label, {...}, { status: 'candidate', ... })`.
Its contract comment is the existing canonical event->knowledge binding: "Knowledge candidates:
business + observation events project into the knowledge graph as status='candidate',
confidence 0.5. Only explicit human approval promotes to knowledge (confidence 1.0)."
It is live (knowledgeGraph constructed and initialized, gateway_runtime.js:497-498), uses the
existing candidate->human-approval gate (no new authority), and its label logic already handles
events without business entity refs (falls back to the event_id slice).

Rejected alternatives:
- EmbeddingService: its own contract comment explicitly classifies worker events as
  "structural (missions, workflow, system) - not embeddable". Binding there contradicts the
  stated contract.
- EventToMissionBridge: worker results are terminal verified outcomes; the orca loop already
  owns bounded retries internally. A bridge mapping risks a mission-per-result loop and
  duplicates the loop's autonomy bounds. No contract invites it.
- Observation plane (OBSERVATION_CREATED): no existing canonical producer maps worker results
  to observations; the Python workers are legacy-plane and quarantined per standing rules.
  That mapping would be a new binding, not an existing consumer.

## Proposed patch shape (for the decision-maker, NOT applied)

Add 'WORKER_COMPLETED' and 'WORKER_FAILED' to GRAPH_PROJECTION_EVENTS
(gateway/bootstrap/gateway_runtime.js:613-622). Optionally extend the label/entityRef
extraction to surface work_order_id / capability from the payload. No new authority, no new
store, no schema change. The human-approval promotion gate already bounds the blast radius.

## Contradictions surfaced

1. Baseline "EventGovernance gates EMISSION" does NOT hold on the live Orca emission path:
   the orca process builds `new UnifiedEventRuntime({ pool })` with no eventValidator and no
   eventGovernance, so both gates are skipped by constructor design. The actual gate on this
   path is the adapter's fail-closed verifyResultEnvelope + authorizeWorkOrder. The governance
   claim describes the gateway process wiring, not the Orca path.
2. `recordVerifiedResult` returns `deduplicated: emitted.deduplicated === true`, but
   UnifiedEventRuntime.emit() never returns a `deduplicated` field (it only bumps an internal
   stat). The flag is always false even on idempotent replay. Mechanism works
   (ON CONFLICT DO NOTHING); reporting is wrong.
3. orca/control-loop/run-loop.sh in THIS worktree execs
   `/home/nolan/worktrees/orca-autonomy/orca/control-loop/orca_control_loop.js` — a stale
   cross-worktree launcher path. The live loop may be running from a different worktree than
   this HEAD.
4. orca_status_model treats "canonical WORKER_COMPLETED event_id" as the evidence backing the
   VERIFIED transition, but nothing downstream can consume that evidence except by raw table
   scan. True as persistence, false as consumption.
5. The SECTION-6 causal hierarchy (GOAL -> PROGRAM -> MISSION -> WORK ORDER) is aspirational:
   the MISSION level exists only as a string label. Any consumer joining worker results to
   MissionRuntime missions will find nothing.
