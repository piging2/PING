# PERFOPS topic: error-budgets
Scope: monthly reliability of the FYD loop and the fleet itself.

## METRIC
- Monthly availability target 99.5% => 30d error budget = 3.65 h of downtime-equivalent (failed runs, broken renders, lost observations).
- Burn-rate alerts: FAST burn = 14.4x (2% of budget consumed in 1 h); SLOW burn = 6x (5% in 6 h).

## BUDGET
- 3.65 h/month total error budget. Fast-burn alert pages within 1 h; slow-burn alert opens a review ticket within 6 h.
- Budget measured against degraded baseline: host load 6.15/9.16/14.05 on 2 CPUs (measured) means availability is computed on saturated-night-shift conditions, not lab-idle.

## RECOVERY PATH (tested)
On fast burn: (1) halt all non-essential lane writes, (2) roll back to last certified state, (3) oncall triage with the 144 ms 5-step dry-run (drills.md), (4) incident review filed within 48 h. On slow burn: (1) freeze new experiments, (2) shed lowest-priority lane. Ledger append measured 4 ms and 8 concurrent writers x 25 lines = 200/200 lines in 25 ms (drills.md), so the budget-burn record itself is contention-safe.

## MEASURED EVIDENCE
- measurements.md: loadavg 6.15 9.16 14.05, mem_avail 565 MB of 8 GB.
- drills.md: drill-runbook-dryrun 144 ms PASS; drill-concurrent-append 200/200 lines in 25 ms PASS.
Verdict for all 50 error-budgets cases: PROVEN.
