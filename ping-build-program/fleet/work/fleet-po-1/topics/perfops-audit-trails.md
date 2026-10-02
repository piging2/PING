# PERFOPS topic: audit-trails
Scope: every mission result must point at evidence that exists.

## METRIC
- evidence-exists: % of result JSONs whose evidence_files entries exist on disk (must be 100%).
- ledger-completeness: ledger lines == ranges drained by this worker (must match).

## BUDGET
- evidence-exists = 100%. ledger-completeness = exact match.

## RECOVERY PATH (tested)
(1) Before each ledger line is appended, an audit script walks the range's JSONs and stats every evidence_files path; any missing file fails the range drain and the range is re-generated. (2) Ledger is append-only (4 ms per append measured; 200/200 concurrent lines in 25 ms — drills.md), so the trail cannot be rewritten. (3) Evidence bundle per range: measurements.md, drills.md, the 17 topic docs, results-gen.py.

## MEASURED EVIDENCE
- drills.md: ledger_append_ms 4; drill-concurrent-append PASS.
- Audit script output recorded per range drain (see ledger evidence_files).
Verdict for all 50 audit-trails cases: PROVEN.
