# PROJECTION-SHARD-5 SUMMARY (missions 2500-2999)

Same harness v3, baseline (unpatched repo concierge).

- PASS: 325, WARNINGS: 83, LEAK: 92 (83 leak:concierge:full-graph + 9 leak:ask-answers:hidden-address), MISLABEL: 0, GENERATOR_ERROR: 0.
- Finding classes identical to shards 0, 2, 4. No new generic classes. G1 patch (from shard-0) applies unchanged; G2 remains D-501.

All six PROJECTION shards are now complete (0, 2, 4, 5 by this worker with the adversarial harness; 1, 3 by a sibling worker with a correct-wiring harness reporting 0 findings, which does not contradict G1).
