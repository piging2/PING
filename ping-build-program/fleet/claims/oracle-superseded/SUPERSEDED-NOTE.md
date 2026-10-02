# Superseded claim files

These 5 UNCLAIMED v1 claim files were moved here on 2026-09-24 during the
oracle matrix v2 regeneration. Their missions referenced synthetic placeholder
subjects (forward-recovery: failure-{0..19}, disk-pressure: volume-{0..9})
proven unexecutable by fleet-ora-2 investigations. They are replaced by
category-qualified v2 claims under fleet/claims/oracle-v2/.

- 2151-2200.claim, 2201-2250.claim, 2251-2300.claim, 2301-2350.claim
  (forward-recovery; synthetic failure-{i} subjects)
  -> superseded by claims/oracle-v2/oracle-2151-2200.claim,
     oracle-2201-2250.claim, oracle-2251-2300.claim, oracle-2301-2350.claim
- 2851-2900.claim (disk-pressure; synthetic volume-{i} subjects)
  -> superseded by claims/oracle-v2/oracle-2851-2900.claim
     (plus new oracle-2901-2950.claim for the 50 missions v1 trimmed)

No inprogress claim and no ledgered range was touched.

## v3 additions (2026-09-24, oracle matrix v3 regeneration)

These 3 UNCLAIMED v1 claim files were moved here during the oracle matrix v3
regeneration. Their missions referenced synthetic service subjects
(resource-exhaustion: js-worker-a/b, python-adapter, event-ingest, witness,
scheduler, backup-agent, health-monitor, log-shipper, reverse-proxy,
cert-renewer) proven nonexistent on the Oracle host by the fleet-ora-2
range-2651-2700 investigation (N-A x41 in the ledger). They are replaced by
category-qualified v3 claims under fleet/claims/oracle-v3/.

- 2701-2750.claim, 2751-2800.claim, 2801-2850.claim
  (resource-exhaustion; synthetic ORA_SVCS subjects)
  -> superseded by claims/oracle-v3/oracle-2701-2750.claim,
     oracle-2751-2800.claim, oracle-2801-2850.claim

No inprogress claim and no ledgered range was touched.

## 2026-09-24 recovery triage — 16 stale claims moved here

- `oracle-3101-3150.claim` … `oracle-3701-3750.claim` (13, oracle-v2): every
  range ledgered TWICE — fleet-acq-2 under matrix=oracle-v2 (2026-09-24
  03:50–03:56Z) and fleet-ora-2 under matrix=oracle-v3 (10:58–12:10Z, v3
  redrain, 63 ranges x 50 = 3,150 missions). The v2 claims were never claimed
  (empty 0-byte copies; the atomic-mv protocol was not used when the v3
  redrain consumed the real claims). Superseded, not missing.
- `oracle-v3-redrain-2701-2750/2751-2800/2801-2850.claim` (3): each drained by
  fleet-ora-1 (03:41–03:43Z); ledger notes describe oracle-v3 content and
  on-disk verdicts match. Only defect is the missing `matrix: oracle-v3` tag
  on the ledger lines (cosmetic). Superseded, not missing.

Nothing was re-drained; all 16 ranges were already covered by ledger + result
files on disk.
