# Jev Backlog-Classification Calibration Dataset

Labeled dataset for the Jev backlog-classification shadow experiment (Nolan directive #4).
Closed Choice: PROVEN_DEFECT / MISSING_TEST / ALREADY_IMPLEMENTED / DUPLICATE / SUPERSEDED / FUTURE / UNKNOWN.

`items.jsonl`: one JSON object per line with fields
`item_id, evidence_summary, verified_disposition, verified_by, verified_at, later_outcome, source_ref`.

## Label distribution (53 items)

| Class | Count | % |
|---|---|---|
| MISSING_TEST | 22 | 41.5 |
| ALREADY_IMPLEMENTED | 13 | 24.5 |
| PROVEN_DEFECT | 8 | 15.1 |
| FUTURE | 7 | 13.2 |
| SUPERSEDED | 2 | 3.8 |
| DUPLICATE | 1 | 1.9 |
| UNKNOWN | 0 | 0.0 |

## Provenance

- `gap-01`..`gap-49`: Lane 9 falsifier verdicts from BACKLOG_FALSIFICATION.md (2026-09-25 ~20:30 MDT,
  read-only falsification of the 49 proposed gaps in your_files/sprint-30-questions-49-gaps-2026-09-25.md
  against the actual fyd-build code). Every verdict carries a file:line or mechanism-level citation.
  The coordinator acknowledged the full verdict table in convergence/CONVERGENCE_MATRIX.md the same day.
- `FYD-009`, `FYD-010`, `FYD-012`, `FYD-037`: ping-perfecting-pass falsification probes
  (2026-09-23 and 2026-09-26), recorded in the BACKLOG_PING.md NOW frontier with durable probe artifacts
  under goals/ping-agent-execution-stack/hidden_files/perfecting-pass-2026-09-26/.

No label is invented: every disposition traces to a third-party falsifier verdict or a coordinator
acknowledgment, not to the lane that did the original work. Every row carries `verified_by`,
`verified_at`, and a `source_ref`. Phone numbers in fixture evidence were redacted in summaries.

## Class-imbalance caveats

1. **UNKNOWN has zero examples.** This corpus cannot calibrate Jev's abstain path. Jev's
   UNKNOWN/INSUFFICIENT_EVIDENCE output is exactly what the completion-falsification lane (J6) will
   stress; do not claim calibration coverage there from this dataset.
2. **MISSING_TEST dominates (41.5%).** The corpus comes from a UI/compiler-quality sweep where "test
   missing" was the most common finding. A Jev model trained/evaluated only here would over-predict
   MISSING_TEST on backend/runtime backlogs. Pair with a second corpus from a runtime/API sweep
   before generalizing.
3. **DUPLICATE is a single example (gap-14)** and SUPERSEDED has two (gap-43, gap-48). Fine for
   calibration sanity checks, not for measuring accuracy on those classes.
4. **The 12 "PROMOTED" MISSING_TEST items are candidacy judgments, not coordinator-approved backlog
   dispositions.** The coordinator explicitly did NOT add them to the canonical backlog (promotion awaits
   a product/constitutional call). Their verification (missing mechanism, file:line evidence) is strong;
   their status as backlog items is provisional. Recorded in each item's `later_outcome`.
5. **Scope-limited labels:** FYD-009's ALREADY_IMPLEMENTED and FYD-012's PROVEN_DEFECT are scoped to
   the fyd-build lane copy (older directory copies are earlier generations without the machinery).
   Jev evidence summaries should not be read as whole-product verdicts.
6. **Outcome asymmetry:** `later_outcome` is thin for most gap items (verdicts stand; only gap-43 and
   gap-48 have a later resolving event). This corpus measures whether Jev matches an expert verifier's
   read of a code-evidence bundle, not whether Jev predicts long-term outcomes.

## Strongest labels (use as calibration anchors)

- **gap-12 (PROVEN_DEFECT):** missing fact-consumption map. The defect is architectural, the evidence is
  a precise absence (rationale is prose-only; placementMap covers CTA tiers, not fact ownership), and it
  is the compiler plan's Phase 2 core, so two independent records agree.
- **gap-43 (SUPERSEDED):** the stale "javascript: sink still open" claim contradicted at evidence level by
  the failure ledger (DONE_VERIFIED 2026-09-23, commit 56f164e6, 16/16 tests). Textbook example of a
  stale finding resolved by a newer verified record.
- **gap-22 (ALREADY_IMPLEMENTED):** URL allowlisting verified twice (falsifier code read + independent
  re-proof PASS 2026-09-22), with a stated merge residual. Positive-class anchor.

## Weakest labels (handle with care)

- **gap-47 (FUTURE):** borderline miscategorization; the falsifier itself notes it is "validation that
  accrues, not a defect to fix." Weakest fit to any class; keep as a stress case, not an anchor.
- **gap-29 / gap-30 (FUTURE):** depend on undecided owner questions (30-questions Q11/Q9). FUTURE is
  correct, but the label could flip to PROVEN_DEFECT or MISSING_TEST after the owner decides.
- **The 12 PROMOTED items:** verification of the missing mechanism is strong, but their disposition as
  backlog items was deferred by the coordinator. Treat as "verified mechanism gap, provisional backlog
  item" when calibrating.
- **FYD-010 / FYD-012 / FYD-037 (PROVEN_DEFECT):** gaps reproduced mechanically, but all three were
  open with no recorded fix at dataset freeze. Jev agreement here means "finds real defects," not
  "predicts fixes."
