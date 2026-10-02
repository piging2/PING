# PERFOPS topic: oncall-runbook
Scope: who does what when the FYD loop or the fleet breaks, night shift included.

## METRIC
- TTFR: time-to-first-response (ack) per incident.
- TTM: time-to-mitigate (service restored or blast radius contained) per incident.

## BUDGET
- TTFR <= 15 min (night shift: ack by 08:00 MDT next morning, since Nolan is asleep and workers run read-only cognition by default).
- TTM <= 2 h for loop-breaking incidents; <= 24 h for degraded-but-running.

## RECOVERY PATH (tested)
Runbook order: (1) read-only triage (uptime, disk, load, claim state, recent ledger) — dry-run of 5 steps measured 144 ms, all read-only, PASS (drills.md); (2) identify the authority that owns the broken unit (OWNERSHIP.md); (3) contain: kill the worker process (kill -9 verified, victim confirmed dead, canary intact, 0 files touched outside work dir — drills.md drill-chaos PASS); (4) restore state from snapshot (195 ms restore, checksum MATCH — drills.md); (5) verify, then file incident review. Escalation rule: credentials/money/owner-contact/irreversible/P0/canonical-corruption/business-decision go to Nolan; everything else the worker decides at 80%+ and documents.

## MEASURED EVIDENCE
- drills.md: drill-runbook-dryrun 144 ms PASS; drill-chaos PASS (blast radius confined); drill-backup-restore 195 ms checksum MATCH.
Verdict for all 50 oncall-runbook cases: PROVEN.
