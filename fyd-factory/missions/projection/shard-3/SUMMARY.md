# PROJECTION-SHARD-3 SUMMARY (missions 1500-1999)

Worker: PROJECTION-SHARD-1 (took unclaimed shard 3 after completing shard 1).
Same harness, same repo (e48ef710, read-only), one tsx invocation, 500 missions.

## Outcome distribution (n=500)
- PASS: 117
- PASS_WITH_NOTES: 310 (concierge legitimately refusing unevidenced questions)
- UNSUPPORTED: 73 (65 provenance.json without object graphs; 8 hostile-stale
  2-object fixtures consumed by mutation, harness artifact)
- LEAK: 0 / MISLABELING: 0 / THROW: 0 / NEEDS_REVIEW: 0

## Leak / mislabeling counts
- Private-fact leaks into public projections: 0
- Owner-hidden leaks into public projections: 0
- Canonical-authority claims: 0
- Source/intent/observation mislabelings: 0
- Ask evidence integrity violations: 0
- Findings emitted: 0

## Failure taxonomy
No failed checks, no generic failure classes, no patches proposed.

## Performance
500 missions in 0.2 s; p50 0 ms, p95 2 ms, max 5 ms; peak heap 17.1 MB.
