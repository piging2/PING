# Self-audit 2026-09-21: 2026-09-20 reconciler invariant re-validated; Meta prose-drift watch item

## The reasoning that recurred today

This pass's b-new-business-radar run (20260921-150418) ended capture_failed
(exit 3): Meta AI returned a substantive ~9255-char answer with ~5 businesses
but in PROSE sections, not parseable business entries. The post-2026-09-19
validator counted 0 business entries and the run failed closed (evidence kept
as .md.CAPTURE_FAILED, sidecar capture_failed, never extracted).

When reconciling the report I again first claimed --file MISSING --bytes
MISSING (the .md is absent), and reconcile-run-report.sh again rejected it:

  RECONCILE 20260921-150418-b-new-business-radar: mismatch
  (claimed file=MISSING bytes=MISSING items=n/a |
   actual file=20260921-150418-b-new-business-radar.md.CAPTURE_FAILED
   bytes=9317 items=n/a)

The corrected claim (--file <run_id>.md.CAPTURE_FAILED --bytes 9317
--items n/a) passed. This is the second production occurrence of the
2026-09-20 note's invariant; it held exactly as specified. Step 8's wording
("MISSING for an absent file") remains the misleading line, and the
--auto proposal there remains the correct automation, still Nolan's call.

## Watch item (not promoted)

Meta AI's answer FORM drifted on this run (prose sections instead of the
brief's explicit "Numbered list." instruction). The b brief succeeded with 10
numbered items in the 03:04 MDT pass today, so this is one data point, not a
pattern. If prose-drift repeats on b (>=2 more occurrences), the correct
response is a brief-side repair (make the list instruction task-first,
per the 2026-09-13 task-first lesson), not a contract-bar change.

## Decision

No promotion this pass. The machinery behaved per design at every gate:
presence validation failed closed, rotation held (failed run does not
advance; next pass retries b), distill sweep had nothing to process, ledger
entry FL-20260921-108 recorded. The agent had nothing left to reason about
that was not already a rule.
