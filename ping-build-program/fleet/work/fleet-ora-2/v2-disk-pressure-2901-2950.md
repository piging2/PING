# v2 disk-pressure 2901-2950: 10 subjects x 5 cases (fleet-ora-2, 2026-09-24)

Owner: Nolan (PING Social). All sizes verified read-only on ping-core-01.

## Subjects (verified)
S1 named volume oracle_pgdata — 69 MB live (postgres data)
S2 named volume oracle_qdrant_storage — 2.3 MB live (qdrant data)
S3 /var/lib/docker — 2.0 GB unique on-disk
S4 /opt/ping — 2.7 GB deployment tree
S5 /var/log — 454 MB (measured 462M)
S6 journald — 440.1M, SystemMaxUse commented out (UNCAPPED)
S7 p18-oracle-staging — 219 MB build scratch
S8 host disk 45 GB — 17 GB used, 28 GB free (39%)
S9 reclaimable docker images — 4.088 GB (old gateway candidate 1.77 GB, node:18/20-alpine)
S10 ollama/ollama:latest — 6.99 GB, no running container

## Case 5 (ORA-2901..2910): "journald SystemMaxUse cap engages before exhaustion"
Honest finding: the journald cap ONLY protects S6. It does nothing for S1/S2/S3/S4/S5/S7/S8/S9/S10.
Per-subject pressure behavior (read-only analysis + engine documentation):
- S1 pgdata: postgres fails writes with typed `ERROR: could not extend file ... No space left on device`
  (SQLSTATE 53100), then PANICs safely; on restart it replays WAL — no silent corruption, but the
  service is DOWN until space is freed. No cap prevents this; the protection is monitoring + fast reclaim.
- S2 qdrant_storage: qdrant returns errors on segment flush failure; collection goes read-only/degraded.
  Typed errors, no silent corruption.
- S3 /var/lib/docker: image pulls fail `no space left on device`; running containers unaffected until
  they need to write (json-file logs can wedge). Typed errors.
- S4 /opt/ping: deployment tree is mostly static; pressure here only matters via S8.
- S5 /var/log: logrotate (once configured per F17) caps this; currently uncapped -> contributes to S8.
- S6 journald: UNCAPPED today -> the SystemMaxUse=500M fix (F16) is exactly the cap this case names.
- S7 staging scratch: safe to delete outright (build artifacts, regenerable).
- S8 host disk: the aggregate; 28G free = comfortable, but trajectory (F5) is the watch item.
- S9/S10: not pressure victims — they are the RECLAIM pool (see case 6).
Verdicts case 5: ADAPT — the named cap is real but covers only S6; per-subject typed-failure behavior
documented above; the actual protection for S1/S2 is monitoring + reclaim runbook (case 7), not a cap.

## Case 6 (ORA-2911..2920): prune candidate list (documented)
Reclaimable, verified via `docker images`:
1. ollama/ollama:latest — 6.99 GB — NO consumer container — DECISION: Nolan (keep as planned backend or drop)
2. ping-gateway:candidate-84486f056 — 1.77 GB — superseded candidate — safe to remove after 3c5d280dd certified
3. node:18-alpine — 180 MB — superseded by node:20-alpine in the Dockerfile
4. node:20-alpine — 194 MB — superseded (Dockerfile says node:20 but live runs 18; after F2 fix pins node:22, both go)
5. build cache — `docker builder prune` reclaimable (measure at prune time)
NOT candidates: postgres:17-alpine (live), qdrant/qdrant:v1.7.0 (live), ping-gateway:candidate-3c5d280dd (live),
node:24-alpine (232MB — check consumer before touching).
Procedure: record digests in ops log -> remove in maintenance window -> `docker system df` after.
Verdicts case 6: PROVEN (candidate list documented with sizes and safety classification).

## Case 7 (ORA-2921..2930): alert thresholds + runbook
Thresholds (per subject): S8 host disk alert 70% (trend check), page 85%; S5/S6 alert 400M; S1/S2 alert on
write-error strings in logs (immediate page — pressure on data volumes is P1); S3 alert 80% of /var/lib/docker
growth week-over-week >1GB.
Runbook (pressure event): 1) identify top consumer (`du`/`docker system df`), 2) reclaim in order:
S7 staging scratch -> S9 prune candidates (oldest first) -> S10 per Nolan's decision -> S6 journal vacuum,
3) verify writes resume (postgres: `SELECT 1` + test write; qdrant: /readyz), 4) record reclaimed bytes +
cause in ops log. STOP: never delete a named data volume (S1/S2); never prune the LIVE gateway image.
Verdicts case 7: PROVEN (thresholds + runbook defined; wiring is owner followup).

## Case 8 (ORA-2931..2940): "service resumes cleanly after space is freed"
Requires an actual fill-then-free test. NOT runnable on the live host. Folded into the sandbox execution
pass (coordinator directive 2026-09-24): fill a scratch filesystem to 100% sandbox-local, verify the
store fails typed (sqlite stand-in: SQLITE_FULL), free space, verify clean resume with digest check.
Verdicts case 8: NEEDS-FOLLOWUP -> to be updated by the sandbox pass results.

## Case 9 (ORA-2941..2950): design-spec review of pressure handling per volume
- S1/S2 (data volumes): engines fail typed (postgres 53100 / qdrant flush errors); no partial writes
  presented as success (WAL/segment atomicity). Design requirement: the gateway MUST surface these as
  typed dependency failures (see partial-dep-loss family), never swallow them.
- S3 (docker): typed pull/write failures; requirement: log driver max-size so a full disk can't wedge
  the daemon's own logging.
- S4 (deploy tree): static; requirement: deploys verify free space BEFORE unpacking (pre-flight check).
- S5/S6 (logs): the caps (logrotate size / SystemMaxUse) ARE the pressure handling; requirement: caps
  configured (F16/F17) + the 400M alert.
- S7 (staging): ephemeral by design; requirement: documented as deletable, never holds unique state.
- S8 (host): aggregate monitoring (F5 trajectory alerts).
- S9/S10 (reclaim pool): not pressure subjects; they are the first-response reclaim lever.
Verdicts case 9: PROVEN (design-spec review complete per volume).
