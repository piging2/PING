# Range 1351-1400 investigation (fleet-po-1, 2026-09-24 UTC)

## Mission family
ORA-1351..ORA-1400: family `store-loss` (50 of 200).
"Store loss: {service} — total data loss, rebuild from canonical sources"
Objective: total loss must be recoverable from canonical sources within RTO.
Pass: wipe the store, rebuild completes within RTO budget, data verified against
canonical digest; FAIL on unrecoverable loss.

## Item mapping (verified from generator source)
gen_matrices.py line 89: store-loss items = ["qdrant","postgres"]*10, mission ORA-N maps
to items[(N-1301) % 20]. Range 1351-1400 = 25 qdrant + 25 postgres, alternating.
Both are REAL services on the Oracle host (personally verified 2026-09-24T02:52Z:
ping-postgres Up 2d healthy, ping-qdrant Up 4d healthy).

## Why not PROVEN/FAIL: the wipe is destructive on the live host
The pass criterion requires WIPING the production postgres / qdrant on ping-core-01.
That is data destruction on the live baseline — forbidden by the oracle rule
(baseline sacred). The test belongs on a staging host. Verdict for all 50:
NEEDS-FOLLOWUP with the exact harness below.

## Read-only recovery-path findings (probed, baseline untouched)
Probe 2026-09-24T03:0xZ via oracle-ssh.sh -s, read-only commands only:

1. POSTGRES rebuild source EXISTS but is stale:
   /opt/ping/backups/ping-postgres-2026-09-19.dump, 368338 bytes,
   dated 2026-09-19 12:10 UTC — 4 days old at probe time.
   FINDING: backup cadence gap; a total loss today would restore to Sep 19 state.
2. QDRANT snapshot EXISTS:
   collection "knowledge" live (curl :6333/collections);
   /qdrant/snapshots contains "knowledge" and "tmp" entries.
   Snapshot restore has never been drill-verified (no record found).
3. NO RTO BUDGET DOCUMENTED: grep -ril "rto" over /opt/ping/config and
   /opt/ping/infrastructure returned zero hits. The mission's "within RTO budget"
   cannot be evaluated because no budget is written down anywhere.

## Exact followup harness (staging ARM64 host; NEVER ping-core-01)
For postgres (25 missions, one drill covers the family):
  1. On staging: restore ping-postgres-2026-09-19.dump into a fresh postgres:17-alpine.
  2. Take a FRESH dump; document the backup cadence fix (daily dumps, retained 7d).
  3. Wipe the staging data dir; rebuild from the fresh dump; time the rebuild = measured RTO.
  4. Verify: row counts + canonical digest of ping_events match pre-wipe.
  5. Write down the RTO budget (measured RTO x 2 headroom) into /opt/ping/config.
  PASS: rebuild <= budget, digest matches. FAIL: anything else.
For qdrant (25 missions, one drill covers the family):
  1. On staging: restore the "knowledge" snapshot into a fresh qdrant/qdrant:v1.7.0.
  2. Verify: collection count, point count, and a sample vector search match pre-wipe.
  3. Time the restore = measured RTO; document snapshot cadence + RTO budget.
  4. Alternative path (also worth drilling): re-derive the collection from postgres
     canonical events via the PING pipeline (embeddings re-run); compare RTOs.
  PASS: restore <= budget, data verified. FAIL: anything else.

## Verdicts
50 x NEEDS-FOLLOWUP (25 postgres + 25 qdrant), each with the harness above.
No wipe, no restart, no state change performed on the live host.
Standalone findings for the parent (not mission verdicts):
  F1: postgres backup 4 days stale (Sep 19 dump).
  F2: no RTO budget documented in /opt/ping/config or /opt/ping/infrastructure.
  F3: qdrant snapshot exists but restore is undrilled.
