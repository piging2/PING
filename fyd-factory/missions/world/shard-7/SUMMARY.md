# WORLD-SHARD-7 SUMMARY (indices 3500-3999, 500 missions)

Worker: WORLD-SHARD-3 (took unclaimed shard 7 per the never-idle rule). Repo read-only, zero writes. Harness: shard-7/harness.ts (range-aware fork of the shard-3 harness; owner phone scheme changed to globally-unique `+1 (970) 555-${5000+i}`; shard field = 7; results to results-range-3500-3999.jsonl on the Pig, fetched to shard-7/results.jsonl). All artifacts synthetic (synthetic:true + testing_only:true on every result line).

## Outcome distribution

| Outcome | Count | Share |
|---|---|---|
| GENERATED | 423 | 84.6% |
| GENERATED_WITH_WARNINGS | 77 | 15.4% |
| EVIDENCE_CONFLICT | 0 | 0% |
| NEEDS_REVIEW / IDENTITY_AMBIGUOUS / UNSAFE_SOURCE / ACQUISITION_FAILED / UNSUPPORTED / CRASH | 0 | 0% |

Warnings (all by-design): media_unavailable 37, acquisition_partial_no_jsonld 40, owner_hide_vacuous 8.

## Latencies (ms): total p50=2, p95=4, max=27. Render dominates as in shard 3.

## Throughput and saturation

- 500 missions in 1,123 ms = 445 missions/sec (single ssh invocation incl. esbuild bundle).
- Peak RSS: 116 MB. No saturation events.

## Volume totals

6,816 objects, 6,316 relationships, 7,266 sections. 100 hide-object intents, 100 correct-fact intents.

## Verification

- 0 crashes, 0 validator errors (spec_valid=true on all 500), 0 unsafe URL leaks, 0 assert failures, 0 zero-section pages.
- Owner hide respected 100/100 (hidden absent from HTML, evidence retained).
- Owner correct-fact effective 100/100 (owner value rendered, sourceValue != ownerValue preserved).
- Determinism 20/20 spot checks (sha256 identical on re-render).

## Generic classes and patches

None. No repo failure met the 3+ bar as a defect; no patches proposed. Repo untouched.

## Hostile coverage in this range

Only {broken-media, clean, no-jsonld} occur for i in [3500,3999] under the deterministic contract (same gap as shard 3: unsafe-urls, rtl-text, franchise-lookalike, conflicting-hours, stale-source, many-services live in shards 0/1/2/4/5/6 ranges).

## Combined with shard 3

1,000 WORLD missions total: GENERATED 846, GENERATED_WITH_WARNINGS 145, EVIDENCE_CONFLICT 9, all other outcomes 0. Zero crashes across 1,000.
