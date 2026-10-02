# Witness boundary forensics: why the 7 hostile cases passed

Observed: 2026-09-22 evening. Source revision: worktree jev-surgical @ cc6856c3bc78e0535e66f168c66dc31abee2c073 (detached, uncommitted). Read-only; no source modified. Builds on [ADVERSARIAL-witness-rejection.md](sandbox://workspace/jev/evidence/ADVERSARIAL-witness-rejection.md) (12 cases, 5 STRONG / 7 WEAK).

## PROBLEM
The witness attests on `payload.replay.verified === true` and nothing else (WitnessWorker.handle, ping-runtime/workers/canonical_workers.js:493). The forensic question: for each of the 7 attested-but-hostile cases, what exactly did the witness check, what did it trust, and what downstream consumed the attestation.

## MECHANISM (common to all 7)
- The genuine ReplayWorker computes `verified = (kernelResult.status === 'ok' && violations.length === 0)` jointly (canonical_workers.js:320-328). The witness re-derives nothing; it trusts the recorded flag.
- The witness ignores the entire `authority` evidence object that REPLAY_COMPLETED already carries (authority:'ReplayWorker', provider:'KernelReplayExecutionProvider', deterministic_execution_identity=fingerprint, canonical_input_hash=replay_id).
- Downstream chain (proven from bridge + worker subscriptions): WITNESS_CREATED → event_to_mission_bridge (line 65) missionType LINEAGE_CREATE → LineageWorker.handle → LINEAGE_CREATED (terminal, bridge line 66) → ProjectionWorker (subscribed to LINEAGE_CREATED, line 730) projects the event into Qdrant knowledge vectors. Separately, mission_control witness-status route counts WITNESS_CREATED as witness evidence. So a hostile attestation becomes durable, queryable, apparently-verified knowledge.
- Live-reachability note (worktree-proven, not live-tested): gateway/routes/events.js POST / canonical-spine path emits an arbitrary registered event_type with arbitrary event_data through UnifiedEventRuntime (event_type validated against the registry; REPLAY_COMPLETED is registered). No auth middleware observed at route or mount layer. A wholesale-forged REPLAY_COMPLETED is therefore a code-reachable forgery class, not a test-only artifact.

## CASE 1 — verified:true with non-empty violations
- INPUT: REPLAY_COMPLETED, replay={verified:true, violations:[{rule:'causation_order', detail:'event out of order'}]}
- CLAIM: "the kernel verified this replay" (a genuine record would carry reason:'kernel_verified')
- DECISION: WITNESS_CREATED (attested)
- WITNESS INPUT: payload.replay
- TRUSTED FIELD: replay.verified (boolean)
- CHECK ACTUALLY PERFORMED: `payload.replay.verified === true` (strict)
- CHECK MISSING: violations must be empty; verified must be cross-checked against violations
- WHY IT PASSED: the joint computation (verified ⟺ no violations) happens once, inside ReplayWorker. The witness assumes the joint computation held for the record in front of it. A forged event, a mutated row, or a provider that sets the fields independently breaks the assumption silently.
- DOWNSTREAM CONSEQUENCE: violation laundered into attested lineage, then projected to Qdrant as verified knowledge.

## CASE 2 — verified:true with null fingerprint / witness_root
- INPUT: REPLAY_COMPLETED, replay={verified:true, fingerprint:null, witness_root:null}
- CLAIM: "deterministic replay verified"
- DECISION: attested
- WITNESS INPUT: payload.replay
- TRUSTED FIELD: replay.verified
- CHECK ACTUALLY PERFORMED: strict === true
- CHECK MISSING: fingerprint must be non-null — it is the deterministic execution identity; without it independent recomputation is impossible in principle
- WHY IT PASSED: the witness never inspects fingerprint. Critically, this combination IS producible by the genuine path: fingerprint = kernelResult.fingerprint || null, so a provider returning status ok + zero violations + no fingerprint yields verified:true with null fingerprint. This is a genuine-production gap, not only a forgery scenario.
- DOWNSTREAM CONSEQUENCE: attestation with no execution identity; the authority evidence correctly omits deterministic_execution_identity (never invented), but nothing downstream notices its absence.

## CASE 3 — verified:true with broken causation chain in replay_events
- INPUT: REPLAY_COMPLETED, replay.replay_events=[{event_id:'e1', event_type:'CLAIM_CREATED', causation_id:'nonexistent-parent'}], verified:true
- CLAIM: "replay of this chain verified"
- DECISION: attested
- WITNESS INPUT: payload.replay
- TRUSTED FIELD: replay.verified
- CHECK ACTUALLY PERFORMED: strict === true
- CHECK MISSING: everything about replay_events. The genuine ReplayWorker never emits replay_events in the replay payload (only event_count/artifact_count) — the witness has no transcript to inspect at all.
- WHY IT PASSED: the witness cannot see the transcript; the field it would need does not exist on the genuine event schema. Deeper: the kernel has LINEAGE_PARENT_EXISTS and LINEAGE_ACYCLIC invariants, but they run on the transcript ReplayWorker built via getCorrelationGroup in created_at ASC order — while _buildReplayEvents' own comment states events "must be in causal order (ancestor → descendant) for the kernel state machine to process them correctly." The causation check rests on an ordering assumption the witness cannot verify.
- DOWNSTREAM CONSEQUENCE: a broken chain attested as verified lineage.

## CASE 4 — verified:true with duplicate semantic event
- INPUT: REPLAY_COMPLETED, replay_events=[{event_id:'e1',...}, {event_id:'e1',...}] (same event twice), verified:true
- CLAIM: "replay verified"
- DECISION: attested
- WITNESS INPUT: payload.replay
- TRUSTED FIELD: replay.verified
- CHECK ACTUALLY PERFORMED: strict === true
- CHECK MISSING: replay_events inspection; additionally the kernel's standard invariants (ARTIFACT_HASH_VALID, LINEAGE_ACYCLIC, LINEAGE_PARENT_EXISTS, STATE_VERSION_CONSISTENT) contain NO duplicate-event invariant — a genuine replay of a duplicated event may pass the kernel with zero violations. Kernel-side gap candidate, flagged not fixed.
- WHY IT PASSED: same structural blindness as case 3, plus a possible kernel-side hole.
- DOWNSTREAM CONSEQUENCE: double-processed state attested as a clean replay.

## CASE 5 — verified:true for wrong document (replay.documentId='doc-ATTACKER', payload.documentId='doc-1')
- INPUT: verdict subject ≠ event subject
- CLAIM: "doc-1's replay verified"
- DECISION: attested for doc-1
- WITNESS INPUT: payload.documentId (attestation subject) + payload.replay.verified (gate)
- TRUSTED FIELD: replay.verified, plus the implicit assumption that the verdict is about the attested document
- CHECK ACTUALLY PERFORMED: strict === true; attestation built from payload.documentId
- CHECK MISSING: replay.documentId === payload.documentId binding
- WHY IT PASSED: the witness binds a verdict about one document to an attestation of another. The genuine ReplayWorker sets both from the same triggering event so they coincide, but the binding is never enforced at the witness.
- DOWNSTREAM CONSEQUENCE: cross-document attestation laundering — a verified verdict for doc-ATTACKER becomes lineage for doc-1.

## CASE 6 — verified:true with unknown event type in replay_events
- INPUT: REPLAY_COMPLETED, replay_events=[{event_id:'e9', event_type:'TOTALLY_MADE_UP_TYPE', ...}], verified:true
- CLAIM: "replay verified"
- DECISION: attested
- WITNESS INPUT: payload.replay
- TRUSTED FIELD: replay.verified
- CHECK ACTUALLY PERFORMED: strict === true
- CHECK MISSING: replay_events inspection; the kernel state machine's applyEvent behavior on unknown types is unverified in this session (EventValidator checks types at emit, but transcripts are loaded from the store, not re-validated).
- WHY IT PASSED: same structural blindness as cases 3-4.
- DOWNSTREAM CONSEQUENCE: unknown-type content attested into verified lineage.

## CASE 7 — verified:true with forged upstream reference
- INPUT: REPLAY_COMPLETED, replay.upstreamEventId='evt-never-existed', verified:true
- CLAIM: "this replay chains to evt-never-existed"
- DECISION: attested
- WITNESS INPUT: payload.replay (verified flag); event.event_id (upstream reference for the attestation)
- TRUSTED FIELD: replay.verified
- CHECK ACTUALLY PERFORMED: strict === true; WITNESS_CREATED.upstreamEventId built from event.event_id, ignoring replay.upstreamEventId
- CHECK MISSING: none meaningful at this field — honest caveat: this case is partially artifactual. The genuine worker emits upstreamEventId at payload level, not inside replay, so the specific forgery is inert.
- WHY IT PASSED (the real class): the witness cannot distinguish a genuine ReplayWorker verdict from a wholesale-forged REPLAY_COMPLETED event. Forged event_id, forged payload, forged replay object — all attested identically. Given the POST /events canonical-spine path (above), this is the highest-severity class: full synthetic verification with no kernel involvement at all.
- DOWNSTREAM CONSEQUENCE: a completely fabricated replay becomes attested lineage and Qdrant-projected "verified" knowledge. This is the synthetic-confidence laundering path the directive warns about.

## SMALLEST CONSTITUTIONAL BOUNDARY
No new authority, no new event type. The binding material already rides on REPLAY_COMPLETED's `authority` evidence object; the witness just never looks at it. The smallest gate that turns "someone said this is valid" into the beginning of "PING can independently demonstrate why this is valid":

1. `authority.provider === 'KernelReplayExecutionProvider'` — authority binding. Closes wholesale forgery (a POST /events forgery carries no authority object, or the wrong one). Cases 3, 4, 6, 7.
2. `replay.documentId === payload.documentId` — verdict-subject binding. Case 5.
3. `Array.isArray(replay.violations) && violations.length === 0` — redundant on the genuine path, decisive on the forgery/mutation path. Case 1.
4. `replay.fingerprint != null` — deterministic execution identity must exist. Case 2. Without this, "independently demonstrate" is impossible in principle.
5. `authority.canonical_input_hash` present — transcript identity. Currently NEVER populated: `replay_id` appears nowhere in the kernel provider or engine, so this check would fail closed today and force the provider to actually emit the transcript hash. This is the "independently demonstrate" hook.

Structural precondition (not a patch, recorded as the next uncertainty): the transcript itself lives only in ReplayWorker memory. Until REPLAY_COMPLETED carries the transcript hash (canonical_bytes' hash), no witness — however gated — can recompute anything. Checks 1-4 make forgery hard; only check 5 plus a carried transcript hash make verification independent.

## FALSIFICATION CONDITION
Re-run gateway/test_witness_adversarial.js after any witness change: all 7 WEAK must reject, all 5 STRONG must keep behavior. If any STRONG flips to attest, that is a regression. Kernel-side candidates (duplicate-event invariant, created_at vs causal ordering, unknown-type handling in applyEvent) need their own adversarial suites before any claim about genuine-path safety.

## NEXT UNCERTAINTY
The synthetic-confidence ceiling trace (directive priority 2): Observation → Claim → Classification → Recommendation → Projection → Replay → Witness → Lineage → Decision evaluation, classifying each stage's confidence as OBSERVED / DERIVED / INHERITED / SELF-ASSERTED / INDEPENDENTLY VERIFIED. The witness findings already suggest the shape of the answer — INHERITED confidence laundered through boolean flags at at least two stages (ClassificationWorker inherits upstream confidence explicitly: `confidence_source: 'inherited'`; the witness inherits the kernel's verdict) — but the full stage-by-stage trace with the P3 shadow evaluation worker in the loop is not yet done.
