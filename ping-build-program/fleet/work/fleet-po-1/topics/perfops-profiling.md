# PERFOPS topic: profiling
Scope: per-mission and per-range cost (wall time) so the night shift can schedule.

## METRIC
- mission-p50/p95: wall time per mission analysis.
- range-wall: wall time to drain one 50-mission claim range.

## BUDGET
- mission-p95 <= 30 min wall for analysis missions. range-wall <= 4 h.

## RECOVERY PATH (tested)
If a range threatens the budget: split it (claim files are 50 missions; a worker may drain a partial range and return the .claim with a note), or parallelize by topic (the 17 topics are independent; JSON generation is per-mission). Measured costs on this host under load (load 6-14): full measurement harness 96 s wall; all 6 recovery drills 1.7 s; JSON generation for 50 missions is sub-second (generator timed during range 1 drain). The dominant cost is cognition, which parallelizes across workers by claim.

## MEASURED EVIDENCE
- measurements.md: harness wall ~96 s (durationMs 96209).
- drills.md: 6 drills in 1.7 s wall.
- Range-1 drain timing recorded in ledger evidence.
Verdict for all 50 profiling cases: PROVEN.
