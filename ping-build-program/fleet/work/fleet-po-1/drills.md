# fleet-po-1 recovery drills — 2026-09-24T02:15:25Z
## drill-runbook-dryrun
triage_5_steps_ms: 144
verdict: PASS (all steps read-only, completed)
## drill-backup-restore
rpo_simulated: full loss of state file
restore_ms: 195
checksum: MATCH (restored bytes identical)
verdict: PASS
## drill-chaos
victim_killed: yes (process 113321 terminated)
victim_still_alive: no
canary_intact: yes
files_touched_outside_workdir: 0
verdict: PASS (blast radius confined to work dir; results/ untouched)
## drill-secret-sweep
secret_shaped_hits: 0
verdict: PASS
## drill-concurrent-append
writers: 8, expected_lines: 200, actual_lines: 200
wall_ms: 25
verdict: PASS (append-only ledger is contention-safe)
## drill-atomic-write
rename_atomic: yes
verdict: PASS
done
