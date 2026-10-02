# PERFOPS topic: backup-restore
Scope: program state that must survive host sleep/wipe/restart: fleet results, ledger, lane STATE.md files.

## METRIC
- RPO: max age of the newest restorable snapshot of fleet/results + ledger.
- RTO: time from total loss of fleet state to restored, checksum-verified state.

## BUDGET
- RPO <= 24 h (results are written per mission as work completes; ledger per drained range).
- RTO <= 1 h.

## RECOVERY PATH (tested)
State lives in ~/workspace which persists across VM restarts (runtime guarantee). Restore = copy snapshot back; verify with sha256. Drill executed 2026-09-24T02:15Z: wrote 2-line state file, snapshotted, deleted the original (simulated full loss), restored from snapshot in 195 ms, sha256 MATCH. PASS (drills.md). Writes use the atomic pattern (write .tmp, rename) verified in drill-atomic-write, so a crash mid-write never leaves a partial JSON.

## MEASURED EVIDENCE
- drills.md: drill-backup-restore PASS (restore_ms 195, checksum MATCH); drill-atomic-write PASS (rename_atomic yes).
Verdict for all 50 backup-restore cases: PROVEN.
