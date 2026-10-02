# Eligibility adversarial fail-safe suite (2026-10-01)

Nine-plus adversarial cases against the single eligibility
function and its evidence envelopes. Zero external actions.

## Cases

- [x] blocked+attractive: western colorado chimney post id -> INELIGIBLE [BLOCKED]
- [x] already-engaged cross-post: coyote rolloff name match -> INELIGIBLE [ALREADY_ENGAGED]
- [x] outside-corridor + agent recommendation: prose recommendation ignored -> INELIGIBLE [OUTSIDE_CORRIDOR]
- [x] missing evidence: verify_evidence refused: missing eligibility envelope
- [x] state changed plan->dispatch: verify_evidence refused: eligibility data changed since planning: re-evaluate
- [x] within-batch duplicate: first=ELIGIBLE second=INELIGIBLE [DUPLICATE]
- [x] empty candidate: empty identity -> UNKNOWN
- [x] unknown group: unlisted group -> UNKNOWN [UNKNOWN]
- [x] tampered envelope: verify_evidence refused: evidence_hash mismatch: envelope tampered or rebuilt
- [x] stale evidence: verify_evidence refused: eligibility evidence stale (age 25200s, ttl 21600s)
- [x] determinism: identical inputs -> identical verdicts
- [x] unreadable data fails closed: load_eligibility_data raised RuntimeError -> exit 3

Result: 12/12 cases pass.

## What this proves

- A blocked business cannot be made attractive by curation prose.
- Same-business cross-posts with new permalinks are caught by
  the precedent business registry, not just post IDs.
- An agent's written recommendation inside the candidate text
  cannot override corridor policy: prose never authorizes.
- Missing, tampered, stale, or post-data-change envelopes are
  refused at dispatch; the action cannot reach the worker.
- Empty candidates and unlisted groups resolve to UNKNOWN,
  which is not dispatched.
- Unreadable eligibility state raises (exit 3), it does not
  degrade to an empty permit.
