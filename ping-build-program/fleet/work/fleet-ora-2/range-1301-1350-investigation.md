# Range 1301-1350 investigation (fleet-ora-2, 2026-09-24 UTC)

## Mission family
ORA-1301..1350: family store-loss (first 50 of 200; family spans ORA-1301..ORA-1500).
"Store loss: {it} — total data loss, rebuild from canonical sources"
Pass criterion: "Wipe {it}: rebuild completes within RTO budget; data verified against canonical digest; FAIL on unrecoverable loss."

## Hard boundary
Wiping postgres or qdrant on the live production Oracle host destroys the certified baseline's data.
Not attempted, ever, by a fleet worker. NEEDS-FOLLOWUP with the staging restore-drill harness below.

## Read-only observations relevant to the drill design
- /opt/ping has a `backups/` directory (seen in the /opt/ping listing). Contents not enumerated beyond
  confirming existence; the restore drill's first step is to inventory it and verify the newest backup's
  integrity OFF the live host (copy to staging, restore there).
- postgres uses named volume oracle_pgdata; qdrant uses oracle_qdrant_storage (durable, from earlier probe).
- No RTO budget exists on record for either store; the drill must measure actual rebuild time and then
  have an owner set the budget (this is a business/ops decision, not a worker decision).
- "Canonical digest" for verification: the event store's constitutional snapshot / witness digests
  (see RESTORE_TEST_REPORT.md and constitutional_snapshot_verification.md in p18-oracle-staging/source/ping-converged
  for the digest model) — the drill verifies restored data against those, not against the wiped store.

## Exact followup harness (staging host with copied backups, never the live baseline)
  1. Copy the newest backup artifacts to staging (rsync/scp from /opt/ping/backups; never operate on the originals).
  2. Start time T0. Restore postgres from backup into a fresh named volume; start qdrant and rebuild its
     collections from the canonical event stream in postgres (replay path).
  3. Record T_restore_complete. The RTO budget is an owner decision; report the measured number.
  4. Verify: row counts, event-digest chain from the constitutional snapshot, qdrant point counts vs
     projection manifest. PASS: everything matches the canonical digest; FAIL: any unrecoverable loss.
  5. Do this quarterly as a scheduled drill; file the measured RTO each time.

## Verdicts
- qdrant, postgres: NEEDS-FOLLOWUP with the harness above (restore drill on staging; RTO budget is an owner decision).
