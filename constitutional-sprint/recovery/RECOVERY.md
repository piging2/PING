# RECOVERY — forensic chain link

**Sprint:** PING constitutional convergence, night shift
**Date:** 2026-09-23 ~19:40 MDT
**Mode:** READ-ONLY forensic investigation. No repo writes, no commits, no process restarts. No secret values printed (metadata only).
**Bases:** (a) ADAPTER `/home/nolan/projects/ping-constitutional` (HEAD `a69bb68f`, clean); (b) CANONICAL CORE `/home/nolan/ping` (LIVE runtime home; working tree dirty — 4 modified files + untracked `deliverables/` — noted, not touched).

**Headline:** The only recovery mechanism that is both LIVE and PROVEN is projection regeneration (`dump.py` → `var/fyd-projections/`). The live journal (`ping-postgres`, `crx_runtime` DB, anonymous volume created 2026-09-16) has **no backup of any kind** — no pg_dump schedule, no WAL archive, no replication, no snapshots. The committed `pg_dump.sql` is a frozen 2026-07-05 dump of the **June-era schema**, not the live journal; restoring it over live state was never tested and would land old-schema tables beside the live ones. Every other "recovery" artifact is a doc, a design, or a script that never ran. There is **no authorization gate** on any destructive recovery path: whoever holds Pig SSH/docker access can restore, delete, or rewrite.

---

## 1. Per-mechanism table

Columns: BASE (A=adapter, C=core) · VERDICT (PROVEN / CLAIMED / UNPROVEN) · STATUS (sprint vocabulary) · OWNER.

| # | Mechanism | Base | What it actually is (code-verified) | PROVEN or CLAIMED? | Status | Owner |
|---|---|---|---|---|---|---|
| R1 | Live journal durability: `ping-postgres` container (`postgres:15-alpine`), DB `crx_runtime`, data in **anonymous** Docker volume `90d5b444…` (created 2026-09-16T00:22:20Z), schema init from bind-mounted `/home/nolan/projects/constitutional-runtime/brainos/orchestration/constitutional/canonical_state/schema.sql` (6 tables: objects, events, lineage, projections, system_metadata, audit_log) | C | The actual journal of record for the live gateway. Durability = single anonymous volume on one machine. | **CLAIMED-by-absence**: no backup mechanism exists at all (verified: no crontab for nolan; `C:\temp\postgres_backups` absent; rclone not installed per BACKUP_REALITY_AUDIT.md; no WAL archive config found; no replica) | **LIVE** (the thing needing recovery, with no recovery) | **UNOWNED** |
| R2 | `pg_dump.sql` (core root, 1.4 MB, tracked, committed 2026-07-05 in `d596aa596` "feat(kernel): freeze constitutional replay kernel") | C | Real data dump of the **June-era** `crx_runtime`: 16 events, 7181 objects, 7176 observations, 5 projections, 9 audit_log rows; latest event 2026-06-25 19:57 UTC. Schema (artifact_registry, authority_objects, repository_objects, topics, claims, entities…) does **not** match the live 6-table schema — it is the wrong generation of the DB. Restore never executed (no evidence anywhere; `evidence/2026-09-*` has zero restore hits). | **CLAIMED** (dump exists and parses, restore UNPROVEN) | **DORMANT** (frozen one-shot artifact) | UNOWNED |
| R3 | `brainos/orchestration/scripts/backup_postgres.ps1` (2026-06-22) | C | pg_dump → gzip → rclone to `gdrive:PING_BACKUPS`, 7-day local retention. Depends on rclone + Task Scheduler wiring. | **UNPROVEN**: never wired — no Task Scheduler entry (BACKUP_REALITY_AUDIT.md:25), no crontab, `C:\temp\postgres_backups` does not exist, rclone not installed. Script never produced a backup. | **DORMANT** | UNOWNED |
| R4 | `destructive_recovery_certification.py` (core root, 2026-06-22, 298 lines) | C | Inserts 10 `TEST_OBJECT` events into the **live** postgres, records witness/lineage/memory hashes, **deletes ALL Qdrant collections**, then "rebuilds": step 5 is literally a no-op (`"No action required - Postgres is canonical source"`), then compares hashes — which can only PASS if the Qdrant delete failed. **No confirmation prompt; no authorization check.** | **UNPROVEN**: `pg_dump.sql` contains **zero** `TEST_OBJECT` rows → the insert step never ran against the dumped DB; no output/log evidence anywhere. Never executed. | **DORMANT** (dangerous if run) | UNOWNED |
| R5 | `projection_replay.py` (core root, 311 lines) | C | "Version 0: Read events → Rebuild Qdrant projections" (Qdrant-only; explicitly no canonical state reconstruction). Imports `runtime.authorities.*`. | **UNPROVEN**: no execution evidence (no logs, no reports cite a run). | **DORMANT** | UNOWNED |
| R6 | `replay_worker.py` (core root, 155 lines) | C | `ReplayWorker`: processes `CLAIM_GENERATED` events, replay-verifies one aggregate, emits `REPLAY_EXECUTED`. | **UNPROVEN**: no callers, no cron, no container runs it (live containers: gateway, postgres, qdrant, redis, vault, ollama, brain-*, open-webui — no replay worker). | **DORMANT** | UNOWNED |
| R7 | `tools/fyd-site-projection/dump.py` (459 lines; **dirty in git** — modified, uncommitted) | C | LIVE replay-as-recovery for website projections: reads `FYD_SITE_OVERLAY` events (read-only) from PING Postgres, applies in `(timestamp, event_id)` order over a byte-deterministic fixture base, atomic tmp+rename write to `/home/nolan/ping/var/fyd-projections/<slug>.json`, unknown op kinds **abort the dump** (fail closed). Downstream (`getPingObjectGraph`, adapter `src/fyd/data/ping-object-source.ts:258`) recomputes sha256 `graphDigest` and **fails closed on mismatch**. | **PROVEN**: outputs regenerated recently (`var/fyd-projections/`: `happy-place.json` + `coppersmith-plumbing.json` both 2026-09-22 08:50; cadence ≈ daily). The consumer verification path is live code. | **LIVE** | PING tooling (file dirty — owner should confirm the modification) |
| R8 | `runtime/rollback_coordinator.js` (+ caller `runtime/execution_runtime.js`) | C | Saga-style compensating-action rollback for **in-process** infrastructure-call lifecycles (reverse-order rollback on failed lifecycle). Not data recovery; does not touch the journal. | **CLAIMED**: code exists with one in-repo caller; liveness against the live gateway **UNVERIFIED** (gateway runs as separate container image `ping-gateway:devin-boundary2`; its source is not on the Pig). | DORMANT-or-UNKNOWN | UNOWNED |
| R9 | `CRX_BACKUP_adcb062de941848d7cc3597d45cb85d12abad3d3.zip` (7.0 MB, tracked) | C | `kernel/commit-service/` **source tree including node_modules** (2026-05-10 file dates). Code snapshot, not data; no restore procedure. | **CLAIMED** as "backup"; restore UNPROVEN and undefined | **DORMANT** | UNOWNED |
| R10 | `PING_backup_20260622.zip` (168 KB) / `PING_constitutional_snapshot_20260622.zip` (52 KB, 20 files) | C | `replay/` audit .md + .ts sources; vault docs (constitution, laws, audits, runbooks). Source/doc snapshots — **no database content**. "Verification" in `backup_verification_report.md` (2026-06-22) = zip opens + file counts, not a restore. | **CLAIMED** (integrity-checked as zips; restore UNPROVEN) | **DORMANT** | UNOWNED |
| R11 | `archive/obsolete/events_backup.sql` (1.2 KB) | C | A **strategy comment header** ("Daily Backup Strategy", 2026-06-14), not a dump. Zero data rows. | Not a mechanism | — | — |
| R12 | `projection_rebuild_playbook.md` (2026-06-22) | C | READ-ONLY documentation: `curl -X DELETE …/collections/constitutional_documents` → re-embed via `projection_worker.py`. Procedure on paper; execution evidence none. | **CLAIMED** (documented procedure, UNPROVEN execution) | DORMANT | UNOWNED |
| R13 | `repository_backup_strategy.md` (2026-06-22, 675 lines) | C | Strategy doc with restore-verification *procedures*; "Mode: READ-ONLY FORENSIC INVESTIGATION". No execution evidence. | **CLAIMED** | DORMANT | UNOWNED |
| R14 | `constitutional_snapshot_verification.md` / `witness_replay_validation.md` (both 2026-06-24) | C | Both state verbatim: **"Status: DESIGN ONLY - No implementation"** (snapshot→witness→replay→witness verification; independent cross-environment witness-root validation). | Not mechanisms — designs, honestly labeled | DORMANT-design | — |
| R15 | `PING_BACKUPS.md` (2026-06-25) | C | rclone-to-Drive backup **plan**; footer: "Status: rclone not installed. Follow installation steps above." Drive folder `PING_BACKUPS` does not exist (BACKUP_REALITY_AUDIT.md). | **CLAIMED**, never executed | DORMANT | UNOWNED |
| R16 | `PRESENTPING_RECOVERY_PLAN.md` (2026-06-20) | C | "Recovery" of the presentping **presentation engine code location** (file convergence), not data recovery. Existence-check "VERIFIED" labels only. | CLAIMED, narrow scope | DORMANT | UNOWNED |
| R17 | Audit-trio (2026-06-23/25): `RESTORE_TEST_REPORT.md`, `RESTORE_CAPABILITY_AUDIT.md`, `BACKUP_REALITY_AUDIT.md` | C | `RESTORE_TEST_REPORT` "RESTORE_TEST_PASSED" = SHA256 **file-integrity sample** of a snapshot manifest; report itself says "No restore operation was needed". **The label is misleading: it is not a restore test.** `RESTORE_CAPABILITY_AUDIT` classified Postgres non-recoverable (no backup) — accurate then and now for the live journal. `BACKUP_REALITY_AUDIT` rated operational backup **0/10** — still accurate for the live journal. | Evidence of non-recovery (honest), except R-report title which overclaims | Historical evidence | — |
| R18 | Qdrant (`ping-qdrant`, named volume `ping_ping_qdrant` created 2026-08-02; currently **unhealthy**) | C | No snapshots: `POST /collections/{name}/snapshots` never executed (BACKUP_REALITY_AUDIT.md). Rebuild path = re-embed from source (R5/R12), UNPROVEN end-to-end. Container unhealthy as of inspection. | **UNPROVEN** rebuild; no backup | LIVE-but-degraded | UNOWNED |
| R19 | Checkpointing | both | **None exists.** Core: only hits are `archive/` copies inside dead worktree snapshots (`worktrees/*/archive/assets_recovery.py`). Adapter: only a UI comment (`build-client.tsx:87`) and a design doc mention. No WAL archiving, no journal checkpoints, no snapshot schedule. | — | — | — |
| R20 | Adapter: `materialization-recovery.ts` (`runMaterializationRecovery`, detect/repair fns, 464 lines) | A | Media-pipeline self-healing: orphaned-Blob detection, incomplete-KV repair, stale-assignment repair, cross-state consistency. **`detectOrphanedBlobs` is a stub** (returns `[]`, logs that Blob listing is unavailable). | **UNPROVEN** | **DORMANT** (zero importers in `src/`/`scripts/`) | UNOWNED |
| R21 | Adapter: `ReplayRepository` / `InMemoryEventRepository` (`src/lib/events.ts:41,120`) | A | Declared replay interface ("For PING and replay systems… cursor-based iteration"); sole impl is in-memory, **"NOT SUITABLE FOR PRODUCTION"**, lost on restart. `findAfter` has **zero consumers**. | Not a recovery mechanism | **DORMANT**/LEGACY | — |
| R22 | Adapter: owner event log (`src/fyd/object/owner-events.ts:26` + `owner-store.ts`) | A | Append-only JSON log, atomic tmp+rename writes, state = pure fold (`projectOwnerState`), v1→v2 migration on read. Every owner-overlay read **replays the log** — this is genuine replay-as-recovery at the overlay layer. | **PROVEN** (the fold-on-read path is live via `api/fyd/objects/[objectId]/overrides` routes) | **LIVE** | FYD lane |
| R23 | Adapter: failure-semantics surface | A | `PingReaderError` hierarchy (`ping-object-reader.ts:63-119`: GatewayNotConfigured/Unreachable/NotReady, IdentityNotFound, ObjectNotFound, BadRequest, SigningNotAvailable); attestation gate returns `ATTESTATION_REJECTED` with named missing evidence (`attestation-gate.ts:84,99,116,123`); projection reader fails closed on digest mismatch (`ping-object-source.ts`). No silent empty-results. | **PROVEN** (code-verified on live paths) | **LIVE** | FYD/PING lanes |

### Duplicates / conflicts found during the sweep

- **DUPLICATE (doc-level):** `backup_verification_report.md` "BACKUP INTEGRITY ✅ VERIFIED" vs `BACKUP_REALITY_AUDIT.md` "backup rating ZERO (0/10)" — both true only because they measure different things (zip opens vs actual DB protection). The trio must be read together; the "RESTORE_TEST_PASSED" title is the dangerous one.
- **CONFLICTING:** `WAVE_3F_OPERATIONAL_RECOVERY_REPLAY_AUDIT.md` claims a replay surface rooted in `kernel/build_witness.py`, `runtime/persistent_runtime.py`, `api/main.py` (`/replay`) — **none of these files exist** on disk (`ls` fails for all three; `kernel/` contains only `event_dispatcher.py`). The doc's "Basis" is stale/fabricated-by-drift. Treat all WAVE_3F recovery claims as unverified.
- **CONFLICTING:** docs repeatedly describe backups of `crx_runtime` (R2/R3 era) while the live journal is a **re-initialized** `crx_runtime` (volume created 2026-09-16, new 6-table schema). Anyone restoring R2 "the backup" over live state would merge June-schema tables into the live DB — a corruption vector, not a recovery.

---

## 2. Recovery authority map

**Who can authorize destructive recovery (restore over live state, replay rewrite)?**

| Action | Mechanism / path | Gate? | Who can do it today |
|---|---|---|---|
| Restore a dump over the live journal | `psql`/docker exec into `ping-postgres` | **None.** No code gate, no approval, no audit trail. | Anyone with Pig SSH/docker access (Nolan; agents operating with his SSH) |
| Delete all Qdrant collections | `destructive_recovery_certification.py` (no confirm prompt) or `curl -X DELETE :6333/collections/*` (per `projection_rebuild_playbook.md`) | **None in the scripts.** (Qdrant API key may be set — env-sourced, not verified; that is a shared-secret perimeter, not an authorization decision.) | Anyone with Pig access |
| Overwrite website projections | `dump.py` (atomic tmp+rename) | None — but low risk: derived artifacts, regenerable from the journal, digest-verified downstream | Anyone with Pig access |
| Journal replay-rewrite (rewrite history) | **No tooling exists.** No replay-rewrite path was found in either base. | n/a | Nobody (capability absent) |
| Change recovery *policy*/specs | `CONSTITUTIONAL_AMENDMENT_PROCESS.md` | Constitutional amendment process (doc-level) | Speculative — process authority, not operational |

**Verdict:** recovery authority is **possession-based, not decision-based**. There is no allow/deny decision point, no named role, no confirmation, no audit log entry for destructive recovery in any code path examined. The only thing standing between the live journal and `DROP` is whoever holds the SSH key. The constitutional amendment process governs spec text, not operational recovery.

---

## 3. Failure semantics (journal/store corrupt or unavailable)

- **Adapter — fail closed, typed, PROVEN in code:**
  - `PingReaderError` subclasses distinguish not-configured / unreachable / not-ready / not-found / bad-request / signing-unavailable (`src/lib/ping/ping-object-reader.ts:63-119`, throws at :241, :254, :273, :281, :284, :290). Gateway outage surfaces as `GatewayUnreachableError`, never as empty data.
  - Social write path: journal re-read must show claimed state or the action reports `ATTESTATION_REJECTED` with named missing evidence (`src/fyd/social/attestation-gate.ts:84,99,116,123`).
  - Projection path: digest mismatch → fail closed (per `ping-object-source.ts` verification; `/api/fyd/projection` 503 on tamper per security sweep).
  - Local stores: `readClaim` returns honest null; writes are atomic tmp+rename (`src/fyd/claim/store.ts`, `src/fyd/identity/file-store.ts`).
- **Adapter silent-degradation risk (one):** `InMemoryEventRepository` (`src/lib/events.ts:120`) drops all marketing events on restart — labeled "NOT SUITABLE FOR PRODUCTION", but the label is the only guard.
- **Core live gateway — UNVERIFIED:** the gateway runs as container image `ping-gateway:devin-boundary2`; its source is not present on the Pig in any searched location, so its corrupt-journal behavior **cannot be attested** from this investigation. No claim made.
- **Core dormant scripts — fail-open tendencies:** `destructive_recovery_certification.py` catches Qdrant-delete failure and continues (`⚠️ Could not delete…`), and its "rebuild" step is a comment — if ever run, it would certify PASS on a system it did not rebuild.

---

## 4. RPO/RTO reality

| Scope | RPO (data-loss window) | RTO (time to restore) | Basis |
|---|---|---|---|
| **Live journal** (`ping-postgres` / `crx_runtime`, vol. created 2026-09-16) | **Unbounded: everything since 2026-09-16 (~7 days and growing).** Zero backups, zero WAL archive, zero replication. | **Not achievable.** No restore source exists. Volume corruption or `DROP` = total, permanent loss of the live journal. | docker volume inspect; no crontab; no backup dir; audits |
| Website projections (`var/fyd-projections/`) | ≈ dump cadence (~daily; last 2026-09-22 08:50) | Minutes (rerun `dump.py --all`) — **PROVEN** | file mtimes; dump.py |
| Owner overlays (adapter `data/fyd-owner/*.json`) | Host-disk only; gitignored, no backup | Replay the log (log is the state) — but log loss = overlay loss | owner-events.ts |
| Legacy `crx_runtime` (June era) | Frozen: data through 2026-06-25; everything after is outside the dump | Unknown — restore never tested | pg_dump.sql content analysis |
| Qdrant (`ping-qdrant`, **unhealthy**) | No snapshots ever | Unknown — re-embed procedure documented (R12), never proven end-to-end | audits; container state |
| Code/docs | ≈ git commit cadence (+ zips R9/R10 as cold copies) | `git clone` / unzip | repo state |

---

## 5. Classification summary

| Status | Members |
|---|---|
| **LIVE** | R1 (live journal, unprotected), R7 (`dump.py` projection regeneration — the one proven recovery), R18 (Qdrant, degraded), R22 (owner-log replay), R23 (fail-closed error surface) |
| **DORMANT** | R2 (frozen dump), R3 (backup script), R4 (destructive cert), R5 (projection_replay.py), R6 (replay_worker.py), R9/R10 (zips), R12/R13/R15/R16 (docs/plans), R14 (designs), R20 (materialization-recovery), R21 (ReplayRepository) |
| **DUPLICATE** | Backup-integrity claims across the audit trio (different yardsticks, confusingly labeled) |
| **CONFLICTING** | WAVE_3F replay-surface claims (files don't exist); R2-as-"the backup" vs the live re-initialized journal (restore would corrupt, not recover) |
| **UNOWNED** | R1, R2, R3, R4, R5, R6, R8, R9, R10, R12, R13, R15, R18, R20 — no named owner, no schedule, no runbook with an assignee |

## 6. Gaps the coordinator should see

1. **The live journal has no recovery story.** This is the single highest-severity finding: 7+ days of journal in an anonymous volume, no backup, no tested restore, and the only committed "backup" is schema-incompatible with live state.
2. **Destructive scripts with no gates exist in-tree** (R4 deletes all Qdrant collections with no prompt; R12 documents unauthenticated collection DELETE). Dormant, but one careless run away from an incident.
3. **`RESTORE_TEST_REPORT.md`'s "RESTORE_TEST_PASSED" title is misleading** — it was a file-integrity sample, not a restore. Any downstream consumer citing it as restore evidence is wrong.
4. **Gateway failure behavior is a blind spot** — the live gateway is a container image whose source wasn't found on the Pig; its corrupt-journal semantics are unverifiable from here.
5. `dump.py` (the one proven recovery) is **dirty in git** — the modification is uncommitted; provenance of the live projection writer should be confirmed before the next convergence commit.
6. `ping-qdrant` is **unhealthy** right now and has no snapshots — vector recovery is doubly unproven at this moment.

## Evidence notes (method)

- Row counts and latest-event dates in `pg_dump.sql` computed by script (`count_rows.py`, `dump_dates.py` in this folder); `TEST_OBJECT` absence via `grep -c`.
- Container/volume facts via `docker ps` / `docker inspect` (read-only); DB name from container env metadata (values not printed).
- File-existence negatives (`kernel/build_witness.py`, `runtime/persistent_runtime.py`, `api/main.py`, `C:\temp\postgres_backups`) via `ls` failures.
- No writes were made to either repo base; no commits created; no processes touched. Helper scripts live only in this folder and `/tmp`.
