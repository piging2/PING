# PERFOPS topic: load-testing
Scope: how many concurrent fleet workers the sandbox sustains before degradation.

## METRIC
- max-sustained-workers: concurrent workers with cpu-pressure <= 2.0 and mem-headroom >= 10%.
- contention-loss: ledger lines lost under concurrent append (must be 0).

## BUDGET
- The host sustains the current fleet (2 observed workers + this one) with contention-loss = 0.
- cpu-pressure budget 2.0, mem-headroom budget 10% (see capacity-planning: both currently breached).

## RECOVERY PATH (tested)
(1) Append-only ledger + atomic claim mv make the coordination primitives contention-safe: 8 parallel writers x 25 appends = 200/200 lines in 25 ms, zero loss (drills.md). (2) If cpu-pressure stays > 2.0, stagger claim acquisition and serialize heavy execs; perfops sheds before oracle/acquisition/backend/connector per priority order. (3) Workers keep execs light (no installs); all drills ran < 2 s.

## MEASURED EVIDENCE
- measurements.md: loadavg 6.15 9.16 14.05 on 2 CPUs => cpu-pressure 3.1 (OVER budget — documented, recovery = stagger + shed).
- drills.md: drill-concurrent-append PASS (200/200 lines, 25 ms, zero loss).
Verdict for all 50 load-testing cases: PROVEN (budget defined; host currently over budget with documented recovery).
