# Wave B hostile corpus: HOLD/recovery (T-05)

Fixture set. NOT wired into any suite. No runner exists yet; the runner is T-06's
deliverable ("a runner that executes all three implementations against them").

Each fixture: name, setup steps, trigger, the exact invariant under test, expected
correct behavior (pass criteria), and the known hostile outcome it must catch.

Shared invariant (all eight): UNKNOWN EFFECT → HOLD → RECONCILE → PROVE EFFECT /
PROVE ABSENCE / HUMAN DECISION.

| # | File | Scenario |
|---|------|----------|
| 01 | fixture-01-unknown-external-effect.md | unknown external effect |
| 02 | fixture-02-lease-expiration-after-possible-effect.md | lease expiration after possible effect |
| 03 | fixture-03-death-after-effect-before-ack.md | death after effect before acknowledgement |
| 04 | fixture-04-death-after-result-before-journaling.md | death after result before journaling |
| 05 | fixture-05-duplicate-submission.md | duplicate submission |
| 06 | fixture-06-zombie-result.md | zombie result |
| 07 | fixture-07-restart-with-hold-present.md | restart with HOLD present |
| 08 | fixture-08-reconciliation-crash.md | reconciliation crash |

Reference vocabulary sources (read-only, searched before writing):
- ~/workspace/f01-fix/mission_runtime.js and HOLD_REAPER_EVIDENCE.md
- prelaunch/02-SEMANTIC-ASSET-REGISTER.md sections 9-14 (dispatch, run state,
  UNKNOWN, HOLD, reconciliation, recovery)
- prelaunch/03-DO-NOT-REIMPLEMENT-REGISTER.md (no duplicate seam created here;
  fixtures only)

Scoring rule for T-06 (from T-05 task spec): never-redispatch-unknown-consequential-effect
(binary per fixture), invariant preservation, human-decision routing.
