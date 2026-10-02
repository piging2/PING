# WORLD SHARD-20 SUMMARY (indices 10000-10499, 500 missions)

Worker: WORLD-SHARD-1 (fourteenth shard; claimed via CLAIMS.jsonl). Same
corrected harness, same pristine baseline, same verify asserts. All artifacts
synthetic.

## Outcome distribution

| outcome | count | pct |
|---|---|---|
| GENERATED | 452 | 90.4% |
| GENERATED_WITH_WARNINGS | 48 | 9.6% |
| all terminal outcomes | 0 | 0% |

Hostile x outcome: clean 375 GENERATED; many-services 44 GENERATED;
rtl-text 33 GENERATED; unsafe-urls 48 GENERATED_WITH_WARNINGS.

## Latencies / throughput

p50 2.246 ms, p95 5.840 ms, max 82.6 ms; ~21,700 missions/min; peak RSS 150
MB. Pig load before run: 2.62/24.

## Verify asserts

500/500: 0 unsafe URL schemes, 0 hidden leaks, 0 unbound claims, 500/500
unique digests, determinism spot checks 10/10.

## The world-10265 finding (false positive, fixed)

The initial run classified world-10265 (marketplace, person-heavy, clean,
hide-object) as NEEDS_REVIEW: "owner-hidden object leaked into public
output". Diagnosis (debug trace on the Pig):

- Hidden object: obj:w10265:service:0, title "Solar Pro", correctly
  visibility:private and correctly excluded from the public graph.
- The verify check was a raw substring test: allHtml.includes("Solar Pro").
- The public business name is "Iron Solar Pros", which contains "Solar Pro"
  as a substring. No leak occurred; the flag was a verifier false positive.

Fix (harness only, no repo change): the hidden-title leak check now uses a
word-boundary regex (new RegExp("\\b" + escapeRegExp(title) + "\\b")); the
hidden-id check stays a raw substring. Regression fixture:
missions/fixtures/world-hidden-leak-substring-false-positive.json.

Falsification: reran all 7,000 missions of this worker's 14 shard-dirs with
the fixed harness. Every HTML digest was byte-identical across runs (full
pipeline determinism confirmed empirically); exactly one record changed
outcome: world-10265 NEEDS_REVIEW -> GENERATED, warnings cleared. New
worker totals: 5,830 GENERATED, 884 GENERATED_WITH_WARNINGS, 142
ACQUISITION_FAILED, 144 EVIDENCE_CONFLICT, 0 NEEDS_REVIEW.

## Generic classes

None. The hidden-leak-substring pattern is a single-instance verifier
defect, not a 3+ generic class; fixed and falsified via the full rerun. No
patches proposed (harness-side fix; repo untouched).

## Cumulative (this worker: 14 shard-dirs, 7,000 missions)

5,830 GENERATED (83.3%), 884 GENERATED_WITH_WARNINGS (12.6%), 142
ACQUISITION_FAILED (2.0%), 144 EVIDENCE_CONFLICT (2.1%), 0 crashes, 0 unsafe
escapes, 0 unbound claims, 0 hidden leaks, 140/140 determinism spot checks.
