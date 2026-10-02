# T-05 fixture 08: reconciliation crash

Status: FIXTURE ONLY. NOT wired into any suite. Do not execute against production dispatch.

Corpus: Wave B HOLD/recovery (T-05). Run in T-06 against f01, S5, classifyUnknownExecution.

Reference vocabulary: f01 reconciliation-only transitions (only the reconciler may
move HOLD to SUCCEEDED | FAILED | SAFE_TO_RETRY | continued HOLD); _failMission
proven-failures-only; proven lifecycle OPEN → KNOWN_PERMANENT → RESOLVED →
REOPENED (idempotent, auditable); human-authority reconciliation (D-71).

## Setup

1. A mission row exists in HOLD: outcome UNKNOWN, reconciliation_required TRUE,
   retry_eligibility FALSE, hold_record with accumulated notes.
2. The reconciler begins work: it gathers evidence (channel receipts, provider
   logs, idempotency-key lookups) and is KILLED mid-reconciliation, after writing
   some but not all of its evidence notes, and before committing any transition.

## Trigger

Reconciler death / crash between evidence gathering and transition commit; then a
new reconciler attempt starts (or the scheduler's reconciler picks it up).

## Invariant under test

UNKNOWN EFFECT → HOLD → RECONCILE → PROVE EFFECT / PROVE ABSENCE / HUMAN DECISION

Reconciliation itself is an unknown-outcome operation: the crash must not leave
the mission in a state that is weaker than HOLD.

## Expected correct behavior

- The mission is still HOLD after the crash: retry_eligibility still FALSE, still
  reconciliation_required TRUE. No partial transition is visible as a resolution.
- Evidence gathered before the crash is preserved as evidence notes merged into
  hold_record (append-only; never overwritten by the next reconciler attempt).
- The next reconciler attempt is idempotent: it re-reads hold_record, resumes
  evidence gathering, and commits exactly one terminal transition. Duplicate
  evidence notes are harmless (dedup by evidence identity, not destructive
  overwrite).
- The transition commit is atomic with respect to dispatch: between the crash and
  the successful reconciliation, no dispatch path can claim the row.
- Terminal states reachable: SUCCEEDED (effect proven), SAFE_TO_RETRY (absence
  proven), continued HOLD with HUMAN DECISION request (evidence inconclusive).
  FAILED only via the proven-failures-only gate; a crashed reconciler is not a
  proven failure of the mission.

## Known hostile outcome (must FAIL the fixture)

A half-written reconciliation that commits a resolution without the proof
(e.g., marks SUCCEEDED because "the reconciler probably checked"), or a crashed
reconciler leaving the row in a limbo status that a boot path interprets as
claimable, or two concurrent reconcilers committing conflicting transitions
(transition commit not atomic; evidence notes clobbered by overwrite).
