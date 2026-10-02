# Adversarial rejection coverage: witness attestation boundary (flaw correction b, directive section 5)

Observed: 2026-09-22 ~20:45 MDT. Source revision: worktree jev-surgical @ cc6856c3bc78e0535e66f168c66dc31abee2c073 (detached, uncommitted). No source modified; test-only.

## PROBLEM
The archaeology reported 63 REPLAY_COMPLETED -> 63 WITNESS_CREATED with 0 refusals. That is evidence of execution, not of strong verification. The witness's only gate is `payload.replay.verified === true` (canonical_workers.js, WitnessWorker.handle).

## SOURCE EVIDENCE
- WitnessWorker.handle: failure-honesty gate checks `payload.replay && payload.replay.verified === true`; anything else on REPLAY_COMPLETED emits WITNESS_REJECTED. The replay record itself (violations, fingerprint, replay_events, documentId binding) is never inspected.

## METHOD
gateway/test_witness_adversarial.js manufactures 12 REPLAY_COMPLETED cases against WitnessWorker.handle with a mock EventRuntime. Each case labeled STRONG (behaves as required) or WEAK (attests a case that must be rejected).

## RESULTS
STRONG: 5, WEAK: 7, ERRORS: 0.

STRONG (correctly handled):
- verified:false -> WITNESS_REJECTED
- missing replay object -> WITNESS_REJECTED
- verified:"true" (string) -> rejected (strict === fails closed)
- verified:1 (number) -> rejected (strict === fails closed)
- clean verified replay -> WITNESS_CREATED (legitimate path works)

WEAK (attested but must be rejected):
- verified:true with non-empty violations
- verified:true with null fingerprint / witness_root
- verified:true with broken causation chain in replay_events
- verified:true with duplicate semantic event in replay_events
- verified:true where replay.documentId != attested documentId
- verified:true with unknown event type inside replay_events
- verified:true with forged upstream event reference

## INTERPRETATION
The witness is a boolean-trust boundary, not a verification boundary. "kernel_verified" currently means "the replay worker set a flag", and the witness launders that flag into an attestation without recomputing anything. This is exactly the directive's warning: replay verification and epistemic verification are different concepts, and the current design conflates them at the witness step.

## WHAT THIS DOES NOT DO
No source changed. No new authority created. This is bounded discovery producing a weakness inventory. Strengthening the witness gate (recompute fingerprint, validate causation closure, bind documentId, check violations empty) is a ranked follow-up work item, not done here.

## FALSIFICATION CONDITION
If a future witness change makes any of the 7 WEAK cases reject while the 5 STRONG cases keep their behavior, the inventory must be re-run and the counts updated. If any STRONG case flips to attesting what it must reject, that is a regression.
