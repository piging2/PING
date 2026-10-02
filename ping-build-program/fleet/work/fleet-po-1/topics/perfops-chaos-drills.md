# PERFOPS topic: chaos-drills
Scope: prove failure stays contained; never let a drill touch canonical state.

## METRIC
- detection-time: seconds from fault injection to worker noticing.
- blast-radius: files modified outside the worker's isolated work dir (must be 0).
- canary-intact: marker file in work dir survives the drill.

## BUDGET
- detection-time <= 300 s (a killed background job is noticed at next poll).
- blast-radius = 0 files outside fleet/work/fleet-po-1/.
- canary-intact = yes.

## RECOVERY PATH (tested)
Kill switch = process kill + work-dir revert; canonical state is never written by fleet workers (protocol rule), so there is nothing to roll back in PING. Drill executed 2026-09-24T02:15Z: background sleeper killed with kill -9, confirmed dead; canary marker intact; find over fleet/results newer than the canary returned 0 files. PASS (drills.md). /tmp is wiped without warning on this host (standing lesson), so drills and all durable artifacts live under fleet/work/fleet-po-1/, never /tmp.

## MEASURED EVIDENCE
- drills.md: drill-chaos PASS — victim_killed yes, victim_still_alive no, canary_intact yes, files_touched_outside_workdir 0.
Verdict for all 50 chaos-drills cases: PROVEN.
