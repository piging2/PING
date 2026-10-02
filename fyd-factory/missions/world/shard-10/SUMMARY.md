# WORLD SHARD-10 SUMMARY (indices 5000-5499, 500 missions)

Worker: WORLD-SHARD-1 (fourth shard; claimed via missions/world/CLAIMS.jsonl
before running, per the collision lesson). Same corrected harness (stale-source
now deterministic ACQUISITION_FAILED; stochastic gates removed), same pristine
baseline (`git archive e48ef710` at /home/nolan/ping-clean), same verify
asserts. All artifacts synthetic.

## Outcome distribution

| outcome | count | pct |
|---|---|---|
| GENERATED | 375 | 75.0% |
| GENERATED_WITH_WARNINGS | 31 | 6.2% |
| ACQUISITION_FAILED | 46 | 9.2% |
| EVIDENCE_CONFLICT | 48 | 9.6% |
| NEEDS_REVIEW / IDENTITY_AMBIGUOUS / UNSAFE_SOURCE / UNSUPPORTED / CRASH | 0 | 0% |

Hostile x outcome: clean 375 GENERATED; stale-source 46 ACQUISITION_FAILED
(stage 'source', no render); contradictory-sources 48 EVIDENCE_CONFLICT
(stage 'evidence', no render - unresolvable phone conflict, same policy as
shard-2's confirmed-correct handling); broken-media 31
GENERATED_WITH_WARNINGS (broken hero image omitted, site renders without
media, warning recorded).

## Terminal outcomes are genuine

Both terminal classes produced zero pages and zero rendered sections: the
AF missions failed before observation (no source acquired), the EC missions
failed at evidence (phone unresolvable, no safe render). This is the
taxonomy discipline from FALSIFICATION.md applied: terminal labels only on
non-renders.

## Latencies / throughput

Total per mission: p50 2.348 ms, p95 3.540 ms, max 32.310 ms. Throughput:
26,713 missions/min (fastest shard yet; failure missions are cheap). Peak
memory: RSS 154 MB, heap 47 MB. Pig load before run: 3.67 on 24 cores (no
wait needed).

## Verify asserts

406 rendered missions: 0 unsafe URL schemes, 0 hidden leaks, 0 unbound
factual claims, 4 pages / 15-16 sections each, viewport meta, 10/10
determinism spot checks, 406/406 unique HTML digests. 94 non-rendered
missions: typed failures with stage + signature, no partial output.

## Failure taxonomy / generic classes

The 46 ACQUISITION_FAILED and 48 EVIDENCE_CONFLICT are by-design hostile
behaviors (deterministic per-class policy), not defects - assessed via
hostile x outcome rather than raw signature strings (signatures embed
per-mission identifiers by design). No crashes, no escapes. No improve-once
loop triggered; no patches proposed.

## Cumulative (this worker: shards 1, 4dup, 5, 10)

2,000 missions: 1,663 GENERATED (83.2%), 243 GENERATED_WITH_WARNINGS
(12.2%), 46 ACQUISITION_FAILED (2.3%), 48 EVIDENCE_CONFLICT (2.4%), 0
crashes, 0 unsafe escapes, 0 unbound claims, 0 hidden leaks, 40/40
determinism spot checks passed.
