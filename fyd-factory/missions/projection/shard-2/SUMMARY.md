# PROJECTION-SHARD-2 SUMMARY (missions 1000-1499)

Same harness v3 and adversarial method as shard-0, new seed range (mutations are pure functions of the mission index, so 1000-1499 exercises different fixtures, overlays, and variants).

## Outcome distribution (baseline, unpatched repo concierge)
- PASS: 325, WARNINGS: 83, LEAK: 92, MISLABEL: 0, GENERATOR_ERROR: 0
- ~80k missions/min, 105 MB peak RSS.

## Outcome distribution (patched concierge rerun)
- PASS: 408, WARNINGS: 83, LEAK: 9, MISLABEL: 0, GENERATOR_ERROR: 0

## Findings
- Generic class G1 (leak:concierge:full-graph): 83 missions, same signature as shard-0. Eliminated by the shard-0 patch in the rerun (LEAK 92 -> 9). The fix generalizes across seed ranges; no patch changes needed.
- Generic class G2 (leak:ask-answers:hidden-address): 9 missions, same as shard-0. Still open as decision D-501.
- Warnings: 535 source-contamination (variant-2), same classification as shard-0.
- No new generic classes. No canonical-authority claims, no unknown labels, no public-stays-public drops, dashboard complete on all 500 missions.

## Conclusion
Shard-2 independently reproduces shard-0's taxonomy at fresh seeds: the two generic classes are stable properties of the system, not seed artifacts. G1 is fixed and verified twice (1,000 missions total across both shards against the patched copy). G2 awaits the D-501 design decision.
