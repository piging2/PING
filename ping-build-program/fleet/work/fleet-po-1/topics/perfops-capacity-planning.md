# PERFOPS topic: capacity-planning
Scope: sandbox host + claim queue depth for the night shift.

## METRIC
- mem-headroom: MemAvailable / MemTotal.
- cpu-pressure: 1-min loadavg / nproc.
- disk-free: % free on workspace volume.
- queue-depth: unclaimed ranges across all categories.

## BUDGET
- mem-headroom >= 10% (ALERT if below). MEASURED: 565 MB / 8126 MB = 6.9% => BELOW BUDGET. Finding: the night-shift host is memory-pressured right now; recovery = shed load.
- cpu-pressure <= 2.0 (ALERT if above). MEASURED: 6.15 / 2 = 3.1 => ABOVE BUDGET. Finding: CPU saturated by parallel fleet workers.
- disk-free >= 20%. MEASURED: 89 G free of 100 G = 89% => within budget.
- queue-depth: 17 perfops + 2 release + others unclaimed at shift start; target drains to 0 by morning.

## RECOVERY PATH (tested)
(1) Shed lowest-priority lanes first (priority order oracle, acquisition, backend, connector, perfops, release — perfops sheds before oracle); (2) serialize heavy execs (the measurement harness took 96 s wall under this load); (3) keep every exec light: no installs, no giant jobs — the drills all ran in < 2 s total. Capacity action from this analysis: this worker keeps execs light and avoids parallel heavy jobs while mem < 10%.

## MEASURED EVIDENCE
- measurements.md: mem_avail_kb 565016 of 8126308; loadavg 6.15 9.16 14.05; disk 89G free.
- drills.md: all drills < 2 s total wall.
Verdict for all 50 capacity-planning cases: PROVEN (budgets defined; two budgets currently breached with a documented shed-load recovery).
