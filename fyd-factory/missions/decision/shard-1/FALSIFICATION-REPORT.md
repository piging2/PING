# Falsification Report: shard-0 + shard-1 verdicts

Worker: DECISION-SHARD-0, depth 2. Date: 2026-09-24 (UTC). Method: D-449 adversarial review.
Scope: all 10 HUMAN_DECISION verdicts across both shards (0 REFUSE in corpus) + sampled
high-stakes AUTO_EXECUTE / REQUEST_CONFIRMATION / EXECUTE_REVERSIBLY items.

## Verdicts challenged and upheld

- D-015 (HUMAN_DECISION, P0): challenger "worker-gated publishing checklist" (also D-483).
  Failed: the launch boundary is absolute; checklists do not absorb business risk. UPHELD.
- D-012 (HUMAN_DECISION, P1): challenger "workers set bars routinely" (also D-472).
  Failed: release-blocking correctness bars are business-risk decisions. UPHELD.
- D-214 / D-217 (HUMAN_DECISION, P1): both fold into D-012 by their own rationales.
  UPHELD, with efficiency note: the parent faces ONE decision (the bar + red-run response),
  not three.
- D-324 (HUMAN_DECISION): challenger "worker decides disclosure posture". Failed:
  integrity-hole disclosure is reputational/business risk. UPHELD.
- D-423 (HUMAN_DECISION): canonical renderer mutation. UPHELD per D-015's gate.
- D-434 (HUMAN_DECISION): new generic primitive = canonical architecture addition.
  Challenger "parent could decide". Failed: D-015-style gate names Nolan. UPHELD.
- D-472 / D-474 / D-483 (falsification seeds, HUMAN_DECISION): second-order confirmations
  of D-012, D-251, D-015. All three challenges failed on the merits. UPHELD.
- D-001 (REQUEST_CONFIRMATION): challenger "zero-blast-radius test patch could auto-apply"
  (D-471). Failed: dirty tree (90+ files) + integration-writer ownership. UPHELD.
- D-021 (EXECUTE_REVERSIBLY): challenger "guard changes rendering semantics" (D-473).
  Failed: old behavior was an uncaught throw; guard is logged degradation. UPHELD.
- D-109 (AUTO_EXECUTE): challenger "standing-loop confirmation is parent-owned". Failed:
  the loop was directed by the task itself. UPHELD.
- D-251 / D-252 / D-253 (AUTO_EXECUTE, P0): challenger "confirming absolutes is itself
  boundary-level". Failed: the items restate Nolan's existing standing rules; they grant
  no exceptions. UPHELD with the scope note recorded.

## Partial findings (verdict stands, qualification added)

- D-360 (AUTO_EXECUTE, template adoption): D-475's challenge has merit. One shard is a
  thin sample. QUALIFICATION: adoption is provisional; parent reviews after shard 1.
- D-396 (AUTO_EXECUTE, prime directive): adopting a program directive as a proposal is
  within worker authority, but program-wide enforcement amends protocol spirit (D-431:
  parent owns amendments). QUALIFICATION: D-396 is a proposal awaiting parent ratification,
  not an enacted directive.

## Skew investigation (D-361 trigger)

Shard 1: AUTO_EXECUTE 192/250 (76.8%) exceeds the 50% investigation trigger. Finding:
composition explains it. Shard 1's units (D-251..D-500) are boundary restatements,
process rules, and protocol refinements, which are genuinely within worker authority by
design. HUMAN_DECISION count is 6 (not zero), so the second trigger did not fire.
No verdict inflation detected; no re-grading recommended. The trigger worked as designed
(investigation, not condemnation).

## Bottom line

10/10 HUMAN_DECISION verdicts upheld. 0 REFUSE in corpus. 2 qualifications recorded
(D-360 provisional, D-396 awaits ratification). No authority-bound item was auto-executed
in either shard.
