# PROJECTION-SHARD-2 LOG

## Claim
Shard 2 (missions 1000-1499) was unclaimed (shard-0 mine, shard-1 and shard-3 held by a sibling worker). Claimed per the never-idle rule.

## What happened
- Reused the shard-0 harness v3 unchanged (one tsx invocation, baseline against the unpatched repo concierge), then the harness-fixed variant (patched concierge copy) for the rerun.
- Baseline: 325 PASS / 83 WARNINGS / 92 LEAK / 0 MISLABEL / 0 GENERATOR_ERROR.
- Fixed rerun: 408 PASS / 83 WARNINGS / 9 LEAK. G1 eliminated again; G2 persists as designed.
- No new generic classes at fresh seeds. Findings taxonomy identical to shard-0.
- Outputs: results.jsonl, findings.jsonl, run-summary.json, run-summary-fixed.json, SUMMARY.md.

## Note on sibling shards
Sibling worker's shard-1/shard-3 harnesses wire the concierge correctly (public-only) and report 0 findings. That does not contradict G1: G1 fires exactly when a caller passes an unfiltered graph, which their harness never does. Their "0 findings" is a property of correct caller wiring, not of the concierge's own gating. The concierge's input contract remains unenforced in the repo; the D-502 patch is the fail-closed fix. If their classifications are ever re-read as "the concierge cannot leak", that reading is falsified by G1's repro (missions/fixtures/concierge-hidden-service-traversal.json).
