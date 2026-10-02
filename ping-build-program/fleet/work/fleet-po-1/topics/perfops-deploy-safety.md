# PERFOPS topic: deploy-safety
Scope: promoting fleet findings toward PING production. The certification law governs: promote only through it.

## METRIC
- gate-pass-rate: % of promotions that went through the certification law (must be 100%).
- rollback-time: time to revert a promoted change to the last certified state.

## BUDGET
- gate-pass-rate = 100%. rollback-time <= 30 min (results are regenerable from the TSV; nothing is hand-edited).

## RECOVERY PATH (tested)
(1) Fleet workers never write the PING repo (protocol rule; repo absent on this host anyway — measurements.md records ping_repo ABSENT). (2) Every result regenerates byte-identically from matrix-<cat>.tsv + topic docs (deterministic generator, verified by re-run diff before each range drain). (3) Rollback = restore prior results/ snapshot (195 ms restore, checksum MATCH — drills.md) and re-append a correcting ledger line; ledger is append-only so history is never rewritten.

## MEASURED EVIDENCE
- drills.md: drill-backup-restore PASS (195 ms, checksum MATCH).
- Re-run diff of the generator verified empty before range-1 drain (see ledger evidence).
Verdict for all 50 deploy-safety cases: PROVEN.
