# eval-v2 harness

Per-program Ask FYD evaluation harness (FYD FACTORY, 2026-09-24).

- run-eval.mts: the runner. Run on the Pig: `npx tsx run-eval.mts` from
  /home/nolan/fyd-preview-staging/eval-v2/ (needs the acquisitions/ dir
  next to it). Read-only wrt the repo. Emits results.jsonl + summary.json.
- hostile-fixtures.ts: synthetic hostile fixtures H-A (address in
  non-*address* fields), H-B (private objects + owner-HIDE phone), H-C
  (hours/description conflicts across business vs external_identity).
  All values fictional; never present as real businesses.
- results-before.jsonl / summary-before.json: first full run (05:12).
- results-after.jsonl / summary-after.json: re-run after the wiring and
  visibility-filter patches stabilized. Byte-identical to the before run.

Scoring: D1-D6 deterministic invariants, S1-S4 wiring-view schema,
programmatic grade-accuracy flags, top-10 uncertainty flagging for human
review (never adjudicated by the runner), clarity judging reserved for the
model on the flagged 10 only.

Full writeup: ~/workspace/fyd-factory/ask/ASK-EVAL-V2.md
