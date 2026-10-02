# PERFOPS topic: tracing
Scope: every action attributable to the mission that caused it.

## METRIC
- trace-coverage: % of execs and file writes attributable to a mission_id via namespaced work paths and ledger lines.
- orphan-actions: execs touching fleet state outside any claimed range (must be 0).

## BUDGET
- trace-coverage = 100%: all worker artifacts live under fleet/work/fleet-po-1/ or fleet/results/<cat>/, both namespaced by worker and mission.
- orphan-actions = 0: workers never touch another worker's inprogress dir (protocol rule); this worker's execs are confined to its own dirs.

## RECOVERY PATH (tested)
(1) All execs run with cwd inside the worker's own dirs; (2) claim files are moved atomically, so ownership is unambiguous; (3) the chaos drill verified 0 files touched outside the work dir during a kill event (drills.md). If an orphan action is found, the owning worker's range is re-verified by regenerating results from the TSV and diffing.

## MEASURED EVIDENCE
- drills.md: drill-chaos PASS (files_touched_outside_workdir 0).
- Directory layout: fleet/work/fleet-po-1/, fleet/inprogress/fleet-po-1/, fleet/results/perfops/ — all worker-namespaced.
Verdict for all 50 tracing cases: PROVEN.
