# BUILD PROGRAM V4 — failure-derived matrix wave: FINAL REPORT
Date: 2026-09-24 ~05:40 MDT (11:40 UTC). Worker: v4 coordinator (parent: build-program continuation).
Method: 5 bounded matrices x falsifiable invariants, all read-only SSH against ping-core-01 (129.146.60.17). No production writes, no restarts, no commits, no credentials touched.

## Matrix design
Each matrix targets one v3 follow-up class with a falsifiable invariant (failure -> evidence -> mechanism -> invariant):
- V4-RPCBIND (ORA4-001..008): external listener set == {sshd:22}
- V4-HEALTH (ORA4-009..016): containers carry memory limits + healthchecks
- V4-BACKUP (ORA4-017..022): postgres backup within 24h RPO, automated
- V4-QDRANT (ORA4-023..030): qdrant snapshot recent + restore drilled + RTO budget
- V4-MEMORY (ORA4-031..036): no host memory pressure, OOM typed not silent

Matrix definitions: `fleet/matrix-oracle-v4.tsv`. Results: `fleet/results/oracle-v4/ORA4-*.json` (36 files, schema-valid, mission_id==filename, matrix=oracle-v4 tagged). Ledger: 5 lines appended to canonical `fleet/ledger.jsonl` (now 293 lines). Raw probe evidence: `fleet/work/v4/*-evidence.txt`.

## Per-class close (VERIFIED / FALSIFIED / PARKED-FOR-NOLAN)

### V4-RPCBIND: FALSIFIED (2 PROVEN / 5 FALSIFIED / 1 NEEDS-FOLLOWUP)
The v3 followup ("disable rpcbind or document why :111 must be exposed") was NOT acted on.
- 0.0.0.0:111 AND [::]:111 still bound (dual-stack); rpcbind.service active+enabled since Sep 20.
- No documented justification in current /opt/ping docs; iptables INPUT is ACCEPT with no :111 rule.
- PROVEN safe to disable: no NFS consumers (only rpcbind.service in the rpc/nfs class).
- Close: class FALSIFIED; the disable itself is owner-executed -> PARKED-FOR-NOLAN.
- New item: undocumented 127.0.0.1:46699 listener, no visible owner (ORA4-008, NEEDS-FOLLOWUP).

### V4-HEALTH: FALSIFIED on limits (3 PROVEN / 4 FALSIFIED / 1 PARKED-FOR-NOLAN)
- IMPROVED since v3: ping-postgres and ping-qdrant now HAVE healthchecks (both State=healthy). This closes the v3 "no healthcheck" finding for those two.
- Still missing: memory limits = 0 on ALL THREE containers (v3 "add the memory limits" followup not acted on); ping-gateway has NO healthcheck.
- No exit-137/OOM alert wiring anywhere -> PARKED-FOR-NOLAN (needs Nolan's notification channel choice).
- restart=unless-stopped confirmed on all three (PROVEN).

### V4-BACKUP: FALSIFIED (2 PROVEN / 3 FALSIFIED / 1 NEEDS-FOLLOWUP)
- Newest postgres backup is ping-postgres-2026-09-19.dump: 5 days old. The "4-day-stale" finding got WORSE.
- No backup automation: ubuntu crontab empty, /etc/cron.d has only e2scrub_all. All backups manual.
- No RPO budget documented (zero hits). Backup artifacts scattered (/opt/ping/backups vs /opt/ping/releases) — no single authority (NEEDS-FOLLOWUP).
- PROVEN: on-disk digests still match the lockfile pins (no tampering/drift).

### V4-QDRANT: FALSIFIED on readiness (3 PROVEN / 3 FALSIFIED / 1 NEEDS-FOLLOWUP / 1 PARKED-FOR-NOLAN)
- Snapshot EXISTS (65M, Sep 17) in-container + releases copy; sha256 matches lockfile pin exactly (PROVEN).
- But: 7 days old, single snapshot, no automated cadence, restore NEVER drilled, no RTO budget.
- The staging restore drill is owner-gated (needs a staging host; live-host restore forbidden) -> PARKED-FOR-NOLAN with the exact drill procedure in ORA4-026's followup.
- Collection knowledge: green, 144 points (PROVEN). Re-derivation path components not located -> NEEDS-FOLLOWUP (ORA4-029).

### V4-MEMORY: VERIFIED (4 PROVEN / 1 ADAPT / 1 PARKED-FOR-NOLAN)
- No current pressure: 774MB/5903MB used, 5.1GB available, load 0.00. Zero OOM-kill lines in 96h journal. Swap = 0 (matches design). Disk 39%.
- Latent risk only: containers unbounded but tiny (117/32/48MB) -> ADAPT; the fix is the V4-HEALTH limits.
- Memory-pressure restart drill remains owner-executed -> PARKED-FOR-NOLAN.

## Hygiene residuals closed (from the recovery report)
- D4: 13 ledger lines (1301-1750, 2701-2850 incl. the 1651-1700 double-drain line) now carry `matrix: oracle-v3`. Backup: `fleet/work/v4/backups/ledger.jsonl.pre-v4`. Mission totals unchanged (14410 -> 14446 with v4's 36; 288 -> 293 lines).
- W1/W3: evidence-path typo fixed in 250 result JSONs (was undercounted as 18): `sandbox/store-loss-drill.sh` -> `sandbox/tree/store-loss-drill.sh` (target verified to exist). Verdict-neutral.
- W5: `fleet/TIEBREAK-RULE.md` — file order is the authority for "latest drain"; `at` is informational. This also resolves D3: the later-file-offset line of a double-drain is the drain of record.

## Reconciliation
- 36/36 v4 disk JSONs schema-valid, id==filename, matrix-tagged; disk verdict counts == ledger verdict counts exactly (PROVEN 14 / FALSIFIED 15 / NEEDS-FOLLOWUP 3 / PARKED 3 / ADAPT 1).
- Zero filename collisions across all 10,236 result JSONs. Zero unknown-to-success conversions (no verdict was upgraded; FALSIFIED is a finding, not a failure).

## v5 recommendation
1. **Re-run wave after owner actions land**: rpcbind disable, container memory limits + gateway healthcheck, backup cron + RPO, qdrant snapshot cadence + staging restore drill + RTO. Each has a v4 invariant ready to re-test; that wave closes the loop instead of opening new surface.
2. **New failure-derived probes**: ORA4-008 (:46699 identification), ORA4-022 (backup consolidation), ORA4-029 (re-derivation path mapping), plus clustering the 338 "other" NEEDS-FOLLOWUP missions into the next wave's classes.
3. Do NOT generate a v5 matrix wave until (1) is scheduled or Nolan explicitly wants broader coverage — the highest-value work now is owner decisions, not more probes.

## Parked for Nolan (owner-gated, not executed)
rpcbind disable/document; exit-137 alert channel; backup cron + RPO declaration; qdrant staging restore drill + RTO budget; memory-pressure drill window. (Plus the standing parks: INGEST-001, GBP credentials, ELV2-001, key signing, media-deps install.)
