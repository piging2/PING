# LANE D — Working Notes

## TASK 1 — Replay/Witness/Lineage proof chain

### Chain topology (live, verified against running container + DB)
```
business event
  → UnifiedEventRuntime.emit (PG ping_events, content-hash event_id, ON CONFLICT fail-closed)
  → EventToMissionBridge (gateway boot line 576-580, started)
  → MissionRuntime
  → MissionScheduler (5s poll, started line 561, MISSION_WORKER_MAP)
  → WorkerRuntime.dispatch (on payload.event_type)
  → Worker.handle → _emit → UnifiedEventRuntime.emit (next link)
```

Documented pipeline (canonical_workers.js:9):
DOCUMENT_IMPORT → OBSERVATION_CREATE → CLAIM_GENERATE → REPLAY_VERIFY → WITNESS_CREATE → LINEAGE_CREATE → PROJECTION_CREATE
Actual bridge map (event_to_mission_bridge.js:56-68):
OBSERVATION_CREATED→CLAIM_GENERATE, CLAIM_CREATED→CLASSIFICATION_CREATE,
CLASSIFICATION_CREATED→RECOMMENDATION_CREATE, RECOMMENDATION_CREATED→PROJECTION_CREATE,
PROJECTION_CREATED→REPLAY_VERIFY, REPLAY_COMPLETED→WITNESS_CREATE,
WITNESS_CREATED→LINEAGE_CREATE, LINEAGE_CREATED=terminal.

### ReplayWorker (ping-runtime/workers/canonical_workers.js:226-446)
- Registered for ['REPLAY_VERIFY','PROJECTION_CREATED'] (line 713), replayProvider injected by
  gateway_runtime.js:515-520 via `new KernelReplayExecutionProvider()`.
- handle(): _buildReplayEvents → provider.executeReplay(transcript) → REPLAY_COMPLETED with
  {verified, reason, fingerprint, witness_root, violations} + authority evidence via _buildAuthorityEvidence.
- verified=true ONLY when kernel status==='ok' AND violations.length===0 (line 337-339).
- When no provider: structural no-op, verified:false, reason='no_replay_provider'.
- DUPLICATE: ping-runtime/agents/replay_worker.js — thin ReplayWorker (BaseWorker from agents/)
  delegating to ReplayAuthority via job.payload.transcript_id. NOT required by ANY file in the repo
  (grep across worktree: zero requires). ORPHANED/DUPLICATED.

### KernelReplayExecutionProvider (gateway/kernel_replay_execution_provider.js)
- Requires ./replay/kernel/{deterministic_replay_engine, canonical_event_envelope, replay_event_stream}
  — gateway/replay/kernel/*.js are compiled-JS ports ("use strict"; Object.defineProperty(exports,"__esModule"))
  of runtime/kernel/replay/*.ts. Real engine, not a stub.
- Maps PING event types → kernel {artifact_commit, artifact_update} (_mapEventType) — information collapse.
- Synthesizes kernel event_ids: evt-ping-{i}-{sha256_12} when PING id lacks 'evt-' prefix.
- artifact_hash: canonical_hash ?? metadata.canonical_hash ?? _computeHash(payload) (murmur-ish 64-bit).
- Hardcoded fallback timestamp '2026-01-01T00:00:00.000Z' when event.timestamp missing.
- _buildReplayEvents (canonical_workers.js:427-446): Postgres correlation-group query NOT implemented —
  "For now, return the triggering event as a single-event replay." Kernel replays ONE event, not the chain.

### WitnessWorker (canonical_workers.js:448-507)
- Registered for ['WITNESS_CREATE','REPLAY_COMPLETED'] (line 714).
- W7 failure-honesty gate: on REPLAY_COMPLETED with verified!==true → WITNESS_REJECTED, never attests.
- WITNESS_CREATED attestation = `witness-${event_id.slice(0,16)}` (derived, deterministic).
- Legacy duplicate: gateway/witness_recorder.js, gateway/witness_registry.js, gateway/witness_chain.js etc.
  (gateway/*.js witness_* files still present; live path is the canonical worker).

### LineageWorker (canonical_workers.js:510-547)
- Registered for ['LINEAGE_CREATE','WITNESS_CREATED'] (line 715). causationChain=[metadata.causation_id].
- LINEAGE_CREATED is terminal (bridge line 66).
- Separate kernel-side lineage: engine.buildLineageGraph + witness_root merkle (in-engine, not persisted
  to ping_events as first-class lineage records).

### Persistence / identity / causation (UnifiedEventRuntime, ping-runtime/events/unified_event_runtime.js)
- event_id = sha256(JSON({eventType, source, namespace?, logical_id|payload})) — deterministic, content-based.
- INSERT INTO ping_events ... ON CONFLICT (event_id) DO NOTHING + semantic-collision check (fail closed).
- metadata: {causation_id, correlation_id, confidence?, confidence_source?}, namespace column + metadata.
- Fail-closed: no pool → status error "No persistence available". 
- Idempotency caveat: workers don't pass logical_id, and payloads embed timestamps
  (e.g. replay.timestamp = nowAsISOString), so each emission hashes uniquely — dedup only helps
  byte-identical retries, not logical retries.

### Live verification (read-only, 2026-09-22 ~19:45 MDT)
- Container ping-gateway (image ping-gateway:devin-boundary2, created 2026-09-16) RUNNING, up 9h.
  Its canonical_workers.js is functionally identical for replay (kernel_verified logic matches);
  file-level md5 differs from worktree HEAD (drift elsewhere in the file).
- /mc/replay/stats: 63 total, 63 verified (kernel_verified), 0 unverified, 0 witness_rejected.
- /mc/witness/stats: 63 attestations, 0 refusals.
- DB brain-postgres:5432/ping_runtime: 63/63/63 rows, 2026-09-16 12:27 UTC → 2026-09-22 23:34 UTC
  (last chain ~2h before observation). 100% attestation.
- Sample REPLAY_COMPLETED authority evidence:
  {authority:ReplayWorker, provider:KernelReplayExecutionProvider, verified:true, reason:kernel_verified,
   deterministic_execution_identity:sha256:..., canonical_input_hash:replay-..., violation_count:0,
   correlation_id + source_event_id(=causation target) preserved, namespace core::system}
- NOTE: live container runs Sept-16 snapshot, NOT current worktree HEAD (cc6856c3b, Sept 22).
  md5 mismatch on canonical_workers.js / bridge / scheduler / event runtime vs worktree.
  The 63 verified replays are evidence for the Sept-16 code, not for HEAD.

### Where evidence becomes non-durable / non-deterministic
1. Kernel engine internals (fingerprint, witness_root, lineage_graph) are computed but only the
   flattened fields persist inside REPLAY_COMPLETED.payload — full canonical_bytes/witness object
   are NOT first-class durable records (they live in the payload JSON, queryable but not indexed).
2. Single-event replay: _buildReplayEvents never queries Postgres; the "replay the chain" claim is
   aspirational — kernel sees 1 event. Deterministic per event, but NOT a chain-integrity proof.
3. Event-type collapse in _mapEventType: all PING semantics → artifact_commit/update. Replay is
   structurally faithful but semantically lossy.
4. Synthesized evt-ping-* ids + fallback timestamp 2026-01-01: deterministic but fabricated inputs
   to the kernel (kernel sees a normalized fiction, not the raw PING event).
5. Provider stats (replays_processed) are in-memory only — container reported 6 while DB has 63.
   Lost on restart. (Observability gap, not correctness gap.)
6. Dead duplicate ping-runtime/agents/replay_worker.js (requires ReplayAuthority + tx.outbox — a
   DIFFERENT architecture: transactional outbox vs event runtime) — unreferenced, could confuse
   future wiring.

### Git provenance
- c9ae8aa07 (2026-08-27) feat(replay): converge replay path onto deterministic kernel engine
- de314f664 (2026-08-25) feat(convergence): integrate kernel replay bridge + dormant authority stubs
- 7be21909a w7 witness failure-honesty fix
- 432bfa829 docs: freeze convergence evidence and runtime contracts
