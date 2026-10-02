# Oracle Deployment Convergence Report - Agent B
Date: 2026-09-16/17 (work window ~20:17 to ~02:30 MDT) | Oracle host: ping-core-01 (aarch64, Ubuntu 24.04)
Access: cloud VM -> pigwsl (WSL) -> ssh ubuntu@129.146.60.17. Read-only wrt all git repos; no repo files written.
Live state at investigation: ping-postgres (Up 31h, healthy), ping-qdrant (healthy), ping-gateway (healthy, image oracle-gateway). Project name: `oracle`.

## Phase 5 - Compose convergence: VERIFIED

Three copies were fetched byte-exact via the hop and diffed locally (line endings normalized; live and repo copies are LF, bak and older are CRLF):

1. **Live** (authority): `/opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/infrastructure/oracle/docker-compose.oracle.yml` (5501 B, mtime Sep 17 01:53 UTC; confirmed as the live file via container label `com.docker.compose.project.config_files` on ping-gateway).
2. **Pre-triage backup**: same path + `.bak-20260916-oracle-triage` (5575 B, Sep 15 15:06). Preserved on-box; not deleted.
3. **Older**: `/opt/ping/infrastructure/oracle/docker-compose.oracle.yml` (5082 B, Sep 15 04:52).

### Difference classification (every difference)

**bak vs live** (the triage diff), all three classified **LIVE FIX** (verified working by the triage agent, failing streaks 7387/7361 -> 0):
- qdrant healthcheck: `sh -c` -> `bash -c` (dash has no /dev/tcp; bash exists in qdrant/qdrant:v1.7.0).
- gateway env: added `QDRANT_URL: http://qdrant:6333` (adapter only reads QDRANT_URL; was defaulting to localhost:6333 -> 503).
- gateway healthcheck: now logs non-200 status to stderr (pass/fail semantics unchanged).

**older vs live** (older lacks everything above), classified:
- qdrant healthcheck block absent in older -> **LIVE FIX** (same as above).
- gateway `QDRANT_URL` absent in older -> **LIVE FIX**.
- gateway healthcheck block absent in older -> **LIVE FIX**.
- temporal: older comment "Workflow Orchestration" + **no** `profiles: [temporal]`; live has "(Optional)" + profile gate -> **INTENTIONAL** (live runs 3 containers; temporal is opt-in).
- Everything else byte-identical after CRLF normalization. No **STALE**, **SECRET-ENVIRONMENT-SPECIFIC**, or **UNKNOWN** differences remain between older and live. (The `mirror` volume is declared but unused in all copies and does not exist on-box; kept in canonical for live parity, harmless.)

**repo (oracle-assembly worktree) vs live**, for context only (not a deployment candidate):
- qdrant healthcheck uses `["CMD", "wget", ...]` -> **STALE/broken**: qdrant/qdrant:v1.7.0 has no wget (triage verified: bash and perl only, no wget/curl/nc); this test would exit 127.
- gateway healthcheck also wget-based -> **STALE/suspect** on the real image.
- gateway has extra `depends_on: qdrant: service_healthy` -> divergent, not live.
- extra `worker` service (Python worker runtime, Dockerfile.worker-runtime) -> not in live; the systemd `ping-worker.service` references a `worker` service that exists in NEITHER on-box compose copy (would fail with "no such service").
- temporal not profile-gated in repo -> divergent.

### Canonical file
`~/workspace/ping-overnight/oracle-deploy/docker-compose.oracle.yml` = live file verbatim, minus the Phase 6 scheduler removal (below). No secrets: all sensitive values are `${...}` interpolations; the file contains zero literal credentials.

### Validation (on-box, temp copy only; live files untouched)
- `docker compose -f /tmp/b-compose-validate/docker-compose.oracle.yml --project-name oracle config` parses cleanly (only expected warnings: unset POSTGRES_PASSWORD/LITELLM_API_KEY with no .env in the temp dir, and the obsolete `version: "3.8"` attribute warning).
- `config --services` (default profile) renders exactly: `postgres, gateway, qdrant` - identical to live `docker ps` (ping-postgres, ping-gateway, ping-qdrant). temporal/litellm stay profile-gated.
- Temp dir removed after validation.

### Env template
`~/workspace/ping-overnight/oracle-deploy/oracle.env.template`: variable names only. Required: POSTGRES_PASSWORD, LITELLM_API_KEY (litellm profile). Defaults honored: POSTGRES_USER=ping, POSTGRES_DB=crx_runtime, LOG_LEVEL=INFO, OLLAMA_BASE_URL=http://host.docker.internal:11434. Notes: on-box .env also carries NODE_ENV/POSTGRES_HOST/POSTGRES_PORT/QDRANT_HOST/QDRANT_PORT/QDRANT_URL (not interpolated by compose; vestigial). SCHEDULER_POLL_MS retired with the scheduler service.

## Phase 6 - Scheduler forensics: VERIFIED, decision OBSOLETE

The compose `scheduler` service (live file lines 144-169) is defined as:
- image: built from `node:20-alpine`, `COPY runtime/scheduler/`, `CMD ["node", "runtime/scheduler/main.js"]` (Dockerfile.scheduler, 262 B)
- role per compose comment: "Scheduler Daemon - YAML Job Executor"; env `GATEWAY_URL=http://gateway:8080`, `POLL_INTERVAL_MS`; mounts `../../config`, `../../.git`, `../../.env` (ro) + `scheduler_state:/app/config/automation`.

Evidence it never ran and cannot run as defined:
- `runtime/scheduler/` and `main.js` exist NOWHERE: not in the Oracle release tree, not in the Pig repo main worktree (constitutional-convergence-v2), not in the oracle-assembly worktree (searched maxdepth 4-6, zero hits). The Dockerfile's COPY would fail -> the service is **unbuildable**.
- Its volume mounts `../../config` and `../../.env` do not exist in the release tree (verified absent) -> would mount empty/missing.
- `docker ps -a` shows no scheduler container ever; the `scheduler_state` volume was never created (absent from `docker volume ls`).
- systemd `ping-scheduler.service` exists only as a file in the release tree; `systemctl is-enabled` = not-found for all four units, `is-active` = inactive. The units also point at the OLDER compose path (`/opt/ping/infrastructure/oracle/...`), not the live file.
- The only `runtime/scheduler` references anywhere are audit-doc mentions of a different thing (`RUNTIME_SYSTEM_INVENTORY.md:21` lists `runtime/scheduler/scheduler` as "referenced | none"; `WAVE_3A5_RUNTIME_AUTHORITY_AUDIT.md:34` mentions `runtime/scheduler/scheduler.py`) - documentation ghosts, not code.

The ONE live scheduling authority is the in-process MissionScheduler, verified executing tonight:
- `gateway/bootstrap/gateway_runtime.js:74` requires it; lines 552/560 instantiate and start it inside the gateway process.
- `ping-runtime/orchestration/mission_scheduler.js`: 5s poll (line 99, log line 124 "Started - polling every 5000ms"), lease renew before reap (lines 149-159), expired-lease reaping (163-168), dispatch via WorkerRuntime, "Single source of truth: MissionRuntime" (header line 16). Triage verified it assigned/completed mission 7b026dfacf31c414 end to end.

Was the compose daemon a duplicate? No: its design (YAML jobs over gateway HTTP, 30s poll) is a distinct, never-implemented exterior cron, NOT a ping_missions scheduler. It is not "distinct-required" either: nothing references it, no YAML jobs exist (`config/automation` absent everywhere), and it cannot build.

**Decision: OBSOLETE.** Recommendation for the coordinator: remove the `scheduler` service block (live file lines 144-169) from the default profile and drop the now-unused `scheduler_state` volume (line 26-27) - done in the canonical file. Safe because: the volume was never created, the image was never built, no container ever existed, nothing depends on it (`depends_on` only pointed gateway-ward). If a YAML job executor is ever actually implemented, re-add it behind a `profiles:` gate, never in the default profile (a bare `up -d` on the live file today would attempt to build it and fail).

## Phase 16 - DR forensics: FALSIFIED as a live-data DR path

Target: `/opt/ping/ping-oracle-clean-snapshot.tar.gz` (1.1 GB, mtime 2026-09-15 14:41 UTC, sha256 `68ee65b853eb90bc5cce6a0f51b6c78490b430098b0417f7e59dfb5b251adf04`).

**The tarball is truncated.** `gzip -t` fails: "unexpected end of file" (exit 1). `tar -tzf` dies with "Unexpected EOF in archive" mid-way through the last git pack. Measured: the extracted `pack-f0c5895317e31c54fdd42c08d1963de54ea6ed0c.pack` is 995,573,760 bytes vs 1,833,547,825 live - ~838 MB of git pack data missing. 266 files present in the live tree are missing from the archive, ALL under `.git/` (hooks samples, info/exclude, logs, loose objects). `git fsck` on the extracted tree fails ("packfile does not match index", "invalid sha1 pointer"). The git history inside the snapshot is corrupt and unusable.

**The tarball contains no live data.** It is a source-tree snapshot (3351 entries). The only database artifact anywhere, `pg_dump.sql` (1.4 MB, in tarball and release tree), was dumped from **Postgres 15.18** (live is 17-alpine) and contains only the legacy schema (artifact_registry, authority_lineage, events, observations...). Proven by isolated restore test (see below): it restores 19 tables, and `ping_events`/`ping_missions` are absent.

**No backup automation exists**: no crontab (not installed), no backup systemd timers (9 timers listed, none backup-related), no backup scripts (only `.backup` source files). Live data exists ONLY in docker volumes `oracle_pgdata` and `oracle_qdrant_storage`.

### Isolated restore test (executed, all temp artifacts cleaned up)
1. Extracted tarball to `/tmp/ping-dr-test` (28 GB free; extraction hit the EOF error above; 3351 entries recovered).
2. Diffed extracted tree vs live release tree (excluding `.git`): ALL source files present. Only differences are post-snapshot changes: `.env` (live updated; contents never printed), `gateway/Dockerfile` CMD `gateway/bootstrap/gateway_runtime.js` -> `gateway/server.js` (mtime Sep 15 15:30), `gateway/bootstrap/gateway_runtime.js` and `gateway/routes/events.js` (both differ; each has a `*.bak-agent-a-20260916` sibling on-box - another actor edited gateway source Sep 16), and the triage compose diff + its `.bak`. -> Source-tree restore = VERIFIED (modulo known drift); git history = CORRUPT.
3. Launched temp `postgres:17-alpine` container `ping-dr-test-pg` on `127.0.0.1:15432` with temp volume `ping_dr_test_pgdata`, generated password, temp db `drtest`. Restored `pg_dump.sql` via psql (exit 0; only benign `role "postgres" does not exist` on ALTER OWNER lines). Result: 19 tables, `to_regclass('public.ping_events')` = NULL, `to_regclass('public.ping_missions')` = NULL. -> The dump restores cleanly but **cannot restore live data** (wrong schema generation entirely).
4. Cleaned up: container + volume + /tmp/ping-dr-test removed; `docker ps` / `docker volume ls` re-verified to show only the 3 live containers and 2 live volumes. Live ports/volumes/data never touched.

**Classification: DR RESTORE = FALSIFIED** for live data (not merely UNKNOWN - the negative was proven). A rebuild from this tarball would boot an EMPTY database: all ping_events, ping_missions, and Qdrant vectors lost. Exact safe re-test procedure: extract to a temp dir, diff vs live tree, restore any dump into a temp postgres container on a non-live port with a temp volume and generated credentials, verify table inventory, then remove container+volume+temp dir.

**Recommendations for the coordinator**: (a) re-create the snapshot tarball (current one is corrupt) AND exclude `.git` or verify with `gzip -t`; (b) add a real data-plane backup: nightly `pg_dump` of the live PG17 `crx_runtime` (ping_events/ping_missions) plus Qdrant snapshot API to an off-volume location; (c) never store `.env` with secrets inside a snapshot tarball (the current one contains `.env` files).

## Phase 17 - ARM64: VERIFIED, no blockers

Oracle is aarch64 (verified `uname -m`). Every active runtime component checked:

| Component | Arch evidence | Verdict |
|---|---|---|
| postgres:17-alpine | `docker image inspect` = arm64/linux | OK |
| qdrant/qdrant:v1.7.0 | `docker image inspect` = arm64/linux; triage verified bash present (Debian bookworm) | OK |
| ping-gateway (oracle-gateway, built on-box FROM node:20-alpine) | image = arm64/linux; `node -p process.arch` inside container = arm64 | OK |
| npm native deps (47 `.node` files) | resolved to linux-arm64 variants: `@msgpackr-extract/...-linux-arm64/node.abi115.musl.node`, `@swc/core-linux-arm64-musl`, cpu-features built from source during on-box `npm install` (Dockerfile installs python3/make/g++/gcc). tree-sitter ships multi-platform prebuilds but only arm64 loads | OK |
| temporalio/auto-setup:1.24.0 (profile-gated, not running) | manifest lists amd64+arm64 | OK |
| ghcr.io/berriai/litellm:main-latest (profile-gated, not running) | manifest lists amd64+arm64 | OK |
| healthcheck tools | qdrant: bash /dev/tcp (verified); gateway: node one-liner (verified); postgres: pg_isready (verified) - no wget/curl/nc dependency in any live healthcheck | OK |
| Ollama / nomic-embed-text | NO Ollama process or container on Oracle; port 11434 closed. Live `/health` embedding reports healthy but stats show `embedded: 0, fallback: 5` - it runs in **fallback mode**. Ollama is not part of the live deployment, so no ARM64 dependency today; if real embeddings are wanted later, ollama/ollama ships arm64 builds (models are arch-neutral gguf) | OK / out of scope |

**No component lacks ARM64 support. Nothing is BLOCKED.** The deployment is not accidentally running from an old snapshot: all three images are native arm64, and the gateway image was built on this aarch64 host (npm resolved arm64/musl native modules at build time).

## Cross-phase observations (for the coordinator, not my phases)
- Another actor ("agent-a", Sep 16) edited `gateway/bootstrap/gateway_runtime.js` and `gateway/routes/events.js` on the live release tree (`.bak-agent-a-20260916` siblings present). Deployment drift is occurring outside the compose file.
- `gateway/Dockerfile` CMD was fixed Sep 15 15:30 (post-snapshot) from `gateway/bootstrap/gateway_runtime.js` to `gateway/server.js`; the tarball still carries the old CMD.
- systemd units in the release tree are not installed and reference the older compose path; `ping-worker.service` targets a `worker` service that exists in neither on-box compose copy.
- The on-box `.env` (mode 600) was read for KEY NAMES ONLY; no values were printed, copied, or written anywhere.

## Deliverables
- `~/workspace/ping-overnight/oracle-deploy/docker-compose.oracle.yml` - canonical compose (live + triage repairs, scheduler removed, no secrets)
- `~/workspace/ping-overnight/oracle-deploy/oracle.env.template` - variable names only
- `~/workspace/ping-overnight/oracle-deploy/REPORT.md` - this file
- `~/workspace/ping-overnight/oracle-deploy/remote/` - fetched evidence (live/bak/older/repo compose copies, Dockerfile.scheduler, bootstrap.sh, systemd units)

## Phase classification summary
- Phase 5 (compose convergence): **VERIFIED**
- Phase 6 (scheduler forensics): **VERIFIED** - decision OBSOLETE, one scheduling authority (in-process MissionScheduler)
- Phase 16 (DR forensics): **FALSIFIED** as a live-data DR path (tarball truncated + no live data inside + no backup automation); source-tree restore VERIFIED, git history corrupt
- Phase 17 (ARM64): **VERIFIED** - no blockers
