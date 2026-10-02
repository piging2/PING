# WORLD SHARD-4 DUPLICATE RUN - SUMMARY (worker WORLD-SHARD-1)

Indices 2000-2499, 500 missions. This is a SECOND independent run of
shard-4 (the first, by WORLD-SHARD-0, lives in missions/world/shard-4/).
Claim collision documented in
missions/world/shard-4/COLLISION-NOTE-WORLD-SHARD-1.md; my files moved here
to deconflict. Same corrected harness as my shards 1 and 5 (stochastic
IDENTITY_AMBIGUOUS gate removed after falsification FF-6), same pristine
baseline (`git archive e48ef710` at /home/nolan/ping-clean), same verify
asserts. All artifacts synthetic.

## Outcome distribution

| outcome | count | pct |
|---|---|---|
| GENERATED | 423 | 84.6% |
| GENERATED_WITH_WARNINGS | 77 | 15.4% |
| NEEDS_REVIEW / ACQUISITION_FAILED / IDENTITY_AMBIGUOUS / EVIDENCE_CONFLICT / UNSAFE_SOURCE / UNSUPPORTED / CRASH | 0 | 0% |

Hostile x outcome: clean 375 GENERATED; no-jsonld 28 GW; conflicting-hours
48 GW (contested hours field omitted fail-closed); many-services 48
GENERATED; unsafe-urls 1 GW (sanitizer engaged, 0 unsafe schemes in output).

## Comparative value vs the first shard-4 run

The first run classified the 48 conflicting-hours worlds as
EVIDENCE_CONFLICT; this run generated all 48 with the contested field
omitted and every verify assert green (0 validator errors, 0 unsafe URLs, 0
unbound claims, 0 hidden leaks). This is the empirical basis for
falsification FF-1 (shard-1/FALSIFICATION.md): same hostile class, same
index range, two policies, full data for both.

## Latencies / throughput

p50 2.157 ms, p95 5.149 ms, max 26.782 ms; 22,848 missions/min; peak RSS 159
MB, heap 41 MB. Pig load before run 2.31/24 cores.

## Verify asserts

500/500: spec valid, zero unsafe schemes, zero hidden leaks, zero unbound
factual claims, 4 pages / 15-16 sections per world, viewport meta, 10/10
determinism spot checks, 500/500 unique HTML digests.

## Generic classes

None. No crashes, no escapes. No patches proposed.
