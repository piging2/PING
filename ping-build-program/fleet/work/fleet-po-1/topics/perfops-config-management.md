# PERFOPS topic: config-management
Scope: behavior driven by files, not by hardcoded values in worker scripts.

## METRIC
- tsv-driven: % of mission lists, titles, and objectives read from matrix-<cat>.tsv at generation time (must be 100%).
- hardcoded-ids: mission IDs hardcoded in generator code (must be 0).

## BUDGET
- tsv-driven = 100%. hardcoded-ids = 0.

## RECOVERY PATH (tested)
(1) The generator reads matrix-perfops.tsv as the single source of truth for mission_id/title/objective per range; topic docs supply the analysis. (2) If the matrix changes, re-running the generator over the same range produces updated JSONs; a diff before/after shows exactly what changed (re-run diff verified empty on identical inputs before range-1 drain). (3) Claim files are the durable queue; config drift in a claim is detected by re-reading the TSV.

## MEASURED EVIDENCE
- results-gen.py source: csv.DictReader over the matrix TSV; no mission IDs in code (grep-verified).
- Re-run diff empty (recorded at range-1 drain).
Verdict for all 50 config-management cases: PROVEN.
