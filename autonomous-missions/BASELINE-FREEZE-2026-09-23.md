# BASELINE FREEZE — Oracle/PING runtime plane — 2026-09-23

Phase 0, strictly READ-ONLY. Captured 2026-09-23 ~11:45-12:00 MDT (17:45-18:00 UTC).
Nothing was built, launched, restarted, patched, committed, pushed, or written on either host or in any database.
All DB access was SELECT-only via `docker exec ... sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql ...'` (credentials resolved from in-container env, never recorded).
No secrets appear in this file; credential presence is described, values are not.

Two distinct planes exist. Every fact below is tagged with its plane:
- **PIG**: Docker Desktop backend inside Ubuntu WSL on Nolan's Windows machine ("the Pig"), inspected via `~/workspace/pig/pigwsl-run.sh`.
- **ORACLE**: host `ping-core-01` (ubuntu@129.146.60.17, OCI), inspected via locally-run `~/workspace/pig-fb/oracle-ssh.sh -s` with the script on stdin.

---

## 1. SOURCE SHA

### ORACLE plane
- **Deployed gateway source (strong indication): `3c5d280dd3735ceb2deb4433384902d07552d372`**
  - Image tag `ping-gateway:candidate-3c5d280dd` encodes short SHA `3c5d280dd`.
  - Verified in the CRX/PING repo on the Pig (`/home/nolan/ping`, remote `ngesk2/crx-runtime`):
    - Command: `git -C /home/nolan/ping log -1 --format="%H %ci %s" 3c5d280dd` (via pigwsl-run.sh)
    - Result: `3c5d280dd3735ceb2deb4433384902d07552d372 2026-09-21 05:36:52 -0600 fix(oracle): compile constitutional-dist in oracle gateway image (FL-20260921-P1)`
  - Caveat: the image carries NO `org.opencontainers.image.revision` label, so this is a tag-to-commit match, not an in-image attestation. Recorded as strong indication, not cryptographic proof.
- Release snapshot dir on the Oracle host is named `bce92787b0da631ed9218e2255607562c9dff731`
  (`/opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/`); that 40-hex string resolves in the same repo to commit
  `bce92787b0da631ed9218e2255607562c9dff731 2026-09-12 19:04:35 -0600 docs(ledger): Ledger 77 Phase D close-out, event-authority reconciliation`.
  It is the source snapshot used by the compose file that launched qdrant, NOT necessarily the gateway build source.
- `/opt/ping` on the Oracle host is NOT a git repo (`git -C /opt/ping rev-parse HEAD` -> "fatal: not a git repository").

### PIG plane
- **Main gateway (`ping-gateway:devin-boundary2`): SOURCE SHA UNKNOWN.**
  - Image has no OCI labels at all (`docker image inspect` -> labels null).
  - Image history (read-only: `docker image history --no-trunc ping-gateway:devin-boundary2`) shows buildkit `COPY gateway/...` / `COPY ping-runtime/...` layers consistent with the crx-runtime repo layout, but no commit reference.
  - `git -C /home/nolan/ping log --before="2026-09-16T12:54:22Z"` (image build time) on the current branch returns commits from 2026-09-08 (8-day gap), so the build did not come from the tip of the current branch. A non-git source tree exists at `/home/nolan/ping-gateway-src` (contains `gateway/`, `ping-runtime/`, `package.json`; `git rev-parse` -> "not a git repository") which may have been the build context. Cannot determine read-only.
- **RC gateway (`ping-gateway:rc-4d522a6b`): source SHA VERIFIED via image label.**
  - `docker image inspect` labels: `org.opencontainers.image.revision: 4d522a6bd823e980bb97b76f95caeb2252a9c5d2`, `org.opencontainers.image.source: local:constitutional-convergence-v2@4d522a6bd823e980bb97b76f95caeb2252a9c5d2`, description notes "pre-promotion CERTIFIED (8/8 gates) against manifest ae45fb774c94bf2cccfd7daddd0d6b3b47bf45b3f3ed9e30844ddeaee0179df0".
  - Repo check: `git -C /home/nolan/ping log -1 --format="%H %ci %s" 4d522a6b` -> `4d522a6bd823e980bb97b76f95caeb2252a9c5d2 2026-09-19 21:11:52 -0600 refactor(gateway): remove write-only _storage field from GatewayRuntime`; `git branch --contains 4d522a6b` -> `constitutional-convergence-v2` (+ `convergence-discovery-2026-09-20`).
- Repo HEADs on the Pig (for context, NOT claimed as deploy sources):
  - `/home/nolan/ping` @ `cc6856c3bc78e0535e66f168c66dc31abee2c073` (2026-09-21, branch `refactor/runtime-authority-convergence`, 4 files modified uncommitted; 1 stash entry) — command: `git -C /home/nolan/ping rev-parse HEAD` / `git status -sb`.
  - `/home/nolan/projects/ping` (FYD, remote `piging2/fyd`) @ `e48ef710cb889bf4d59b833ef9766067a9e2bbf0` (2026-09-23 07:32 -0600, branch `fyd/builder-composition`, 3 files modified uncommitted).

---

## 2. DEPLOYED IMAGE DIGEST(S)

Command used on both hosts: `docker images --digests --format "table {{.Repository}}\t{{.Tag}}\t{{.Digest}}\t{{.CreatedSince}}"` plus `docker image inspect` for RepoDigests/image IDs.

### ORACLE plane (all digests verified)
| Container | Image | Digest | Built | Container created/started |
|---|---|---|---|---|
| ping-gateway | ping-gateway:candidate-3c5d280dd | `sha256:4aa9d7f669bcd46ddfdf81e3baaf519bb3b3338d585e535b975d7f865cd0f8f2` | 2026-09-21T11:42:46Z | created+started 2026-09-21T12:05:20Z, restart_count 0 |
| ping-postgres | postgres:17-alpine | `sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73` | 2026-08-13 | created+started 2026-09-21T11:27:08Z, restart_count 0 |
| ping-qdrant | qdrant/qdrant:v1.7.0 | `sha256:ff1639878418c0572f50a7e1314874e399537eb97e6d2f42d6b987a07a2c4c4f` | 2023-12-08 | created 2026-09-17T01:53:11Z, started 2026-09-20T00:05:59Z, restart_count 0 |
| (exited) ping-gateway-candidate | ping-gateway:candidate-3c5d280dd | same as live gateway | — | created 2026-09-21T12:03:56Z, finished 2026-09-22T16:04:06Z, exit 137 |
| (exited) ping-gateway-prev-84486f056 | ping-gateway:candidate-84486f056 | `sha256:467af2dabc081dd09a8f26560ab8320073320005030bd3767afa8b40eadd970e` | 2 days ago (per images list) | created 2026-09-21T11:25:08Z, finished 2026-09-21T12:05:20Z, exit 137 |
| (exited) p18-scratch-pg | postgres:17-alpine | same as ping-postgres | — | exited (0) ~3 days ago |

Deploy sequence on ORACLE 2026-09-21 (from `docker inspect` Created/FinishedAt): `candidate-84486f056` 11:25Z -> SIGKILLed 12:05:20Z -> `candidate-3c5d280dd` live since 12:05:20Z. A second same-image container (`ping-gateway-candidate`) ran 12:03Z 9/21 -> 16:04Z 9/22, then SIGKILLed.

### PIG plane (all digests verified)
| Container | Image | Digest | Built | Notes |
|---|---|---|---|---|
| ping-gateway | ping-gateway:devin-boundary2 | `sha256:5f018a301b3bce675f04641887005e838f957c9f6e57a1e8e91de5968f222d20` | 2026-09-16T12:54:22Z | container created 2026-09-16T18:02:47Z, restart_count **3**, running since 2026-09-22T16:54:48Z |
| ping-rc-gateway | ping-gateway:rc-4d522a6b | `sha256:fb6f3069d642f55273697b579168b30e7b2b42bbd491cfcb53d07bf62f98ee38` | 2026-09-20T03:22:48Z | restart_count 0, running since 2026-09-22T16:55:36Z |
| ping-postgres | postgres:15-alpine | `sha256:cd17e2ac98240fce1541ad2a803b34009b4eea5aec8a832363cdc7eca62e722e` | 2026-06-16 | NOT the live DB for the main gateway (see section 3) |
| ping-rc-postgres | postgres:16 | `sha256:4b7183ac05f8ef417db21fd72d71047a4238340c261d3cc3ddb6d579ab5071ae` | 2026-05-19 | empty DB (zero relations) |
| brain-postgres | postgres:15-alpine | `sha256:cd17e2ac98240fce1541ad2a803b34009b4eea5aec8a832363cdc7eca62e722e` | 2026-06-16 | **actual live DB for the main gateway**; created 2026-07-28, restart_count 0 |
| brain-qdrant | qdrant/qdrant:latest (v1.18.2 per labels) | `sha256:75eab8c4ba42096724fdcfde8b4de0b5713d529dde32f285a1f86fdcb2c9e50c` | 2026-06-03 | actual vector DB for the main gateway |
| ping-qdrant | qdrant/qdrant:latest (v1.18.2) | same digest as brain-qdrant | 2026-06-03 | compose project "ping"; docker reports **unhealthy**; NOT used by the main gateway |
| ping-redis | redis:alpine | `sha256:978f0e01593e65eed801f2402944efcd936d43b5027e4908a7897baf88ed6241` | 2026-07-30 | healthy |
| ping-vault | hashicorp/vault:latest (v2.0.3) | `sha256:a296a888b118615dc01d5f1a6846e6d4a7277946caaed5b447008fff5fe06b54` | 2026-06-17 | dev-mode (`server -dev`); docker reports **unhealthy** |
| ping-test-pg | postgres:17-alpine | `sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73` | 2026-08-13 | scratch |
| ollama | ollama/ollama:latest | `sha256:c484b703176aa19dfc0a54cbfb60ab8094b38faa04283fb77eba1d33319e5eca` | ~2 months ago | auxiliary |
| open-webui | ghcr.io/open-webui/open-webui:main | `sha256:7f1b0a1a50cfbac23da3b16f96bc968fd757b26dc9e54e93813d61768ea9184e` | ~3 months ago | healthy; auxiliary |
| cosyvoice-tts | qwen3-tts-docker-cosyvoice-tts:latest | `sha256:93ee189e0d3b4d2c1d7d306fb3feef715569c84223f3189c5c6807d6ee5180a6` | 7 days ago | auxiliary |

All PIG-plane containers show "Up 25 hours" — the whole plane (re)started 2026-09-22 ~16:54 UTC (consistent `StartedAt` across containers).

---

## 3. DATABASE TARGETS

### ORACLE plane (verified via `docker exec ping-gateway sh -c 'echo ...'` non-secret env + inspect)
- **PostgreSQL**: container `ping-postgres`, host `postgres:5432` on docker network `oracle_ping_internal`, published `127.0.0.1:5432`. DB `crx_runtime`, user `ping` (password present in env, value not recorded). Data volume `oracle_pgdata`.
- **Qdrant**: container `ping-qdrant`, URL `http://qdrant:6333` on `oracle_ping_internal`, published `127.0.0.1:6333-6334`. Version v1.7.0. Data volume `oracle_qdrant_storage`. Collections: `knowledge` (1).
- No Redis/Vault on the ORACLE host. No other databases (volumes: `oracle_pgdata`, `oracle_qdrant_storage`, `p18_pgdata`).

### PIG plane — CORRECTED TOPOLOGY (verified by live fingerprint, not assumed from container names)
- The main gateway's env says `POSTGRES_HOST=host.docker.internal`, `POSTGRES_PORT=5432`, `POSTGRES_DB=ping_runtime`, `POSTGRES_USER=postgres`; `QDRANT_URL=http://host.docker.internal:6333`.
- Fingerprint query run INSIDE the gateway container via its own `pg` module (`/app/node_modules/pg`), read-only SELECT:
  - Command: `docker exec ping-gateway node -e "<pg Client with env creds> SELECT current_database(), current_user, (SELECT count(*) FROM ping_events), (SELECT count(*) FROM ping_missions)"`
  - Result: `db=ping_runtime, usr=postgres, ping_events=2357, ping_missions=457`.
- The same counts on `brain-postgres`/`ping_runtime` (SELECT via docker exec): `2357|457`, migrations max 11, 33 public tables. **The live database for `ping-gateway:devin-boundary2` is `brain-postgres` (volume `compose_postgres_data`, published `0.0.0.0:5432`), reached via host.docker.internal:5432 -> Docker Desktop port-forward.**
- The container named `ping-postgres` (port 5433, volume `90d5b444e2a...`, 739 ping_events / 144 ping_missions) is **NOT** the live DB for the main gateway; it is a stale/secondary copy (migrations applied 2026-09-16 17:49:53Z, same day the gateway image was built). Its purpose is UNKNOWN.
- **Qdrant for the main gateway**: `brain-qdrant` (via host.docker.internal:6333 -> published 6333-6334). Collections (GET `http://127.0.0.1:6333/collections`): `constitutional_documents`, `constitutional_memory`, `knowledge`.
- **RC plane**: `ping-rc-gateway` -> `ping-rc-postgres` (container-name host on network `ping-rc-sandbox`), DB `rc_staging`, user `crx`. `\dt` returns "Did not find any relations." — the RC database is EMPTY (migrations never applied there).
- Auxiliary: `ping-redis` (6379), `ping-vault` (8200, dev mode), `ping-qdrant` (compose "ping" project, unhealthy, unused by gateway), `ping-test-pg` (55433, scratch), `ollama` (11434), `open-webui` (3001).

---

## 4. SCHEMA/MIGRATION STATE

All queries SELECT-only against `repository_store_migrations` and `information_schema`.

### ORACLE plane (`crx_runtime`)
- Migration ledger `repository_store_migrations`: **11 rows, all applied 2026-09-15 15:33:12Z** (versions 1-11: repository_objects, event_outbox, repository_events, event_processing, execution_graphs, graph_node_states, repository_snapshots, mission_events, mission_executions, telemetry_metrics, + event_processing backfill).
- Command: `echo "SELECT * FROM repository_store_migrations ORDER BY 1 LIMIT 20;" | docker exec -i ping-postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql ... -tA'`.
- 32 public tables (listed in section 8 context). `deployment_registry`: exists, **0 rows**. `runtime_registry`: exists, **0 rows**.
- Migration file sources on host: `/opt/ping/database/` contains `canonical_events.sql`, `events.sql`, `fix_pipeline_blockers.sql`, `migration_001_add_causation_id.sql`, `migration_002_add_events_causation_id.sql`.

### PIG plane
- Live DB (`brain-postgres`/`ping_runtime`): `SELECT max(version) FROM repository_store_migrations` -> **11**; 33 public tables. (Per-table applied timestamps not captured for brain; version number confirmed.)
- Stale `ping-postgres`/`ping_runtime`: versions 1-11 applied 2026-09-16 17:49:53Z (same ledger shape as ORACLE). `deployment_registry` exists with columns (deployment_id, tenant_id, version, git_sha, build_timestamp, container_image, oracle_region, environment, status, health, active_slot, blue_version, green_version, rollback_target, deployed_at, completed_at, rolled_back_at, metadata) but **0 rows returned**.
- `ping-rc-postgres`/`rc_staging`: **no migration state possible — zero relations in the database.**

---

## 5. ACTIVE SERVICES

### ORACLE plane (`ping-core-01`, up 3d 17h; docker server 29.1.3; docker active via systemd)
- `ping-gateway` (candidate-3c5d280dd) — Up 2 days, `127.0.0.1:8080->8080`, network `oracle_ping_internal`, no mounts, no healthcheck defined (health: null).
- `ping-postgres` — Up 2 days (healthy), `127.0.0.1:5432`, volume `oracle_pgdata`.
- `ping-qdrant` — Up 3 days (healthy), `127.0.0.1:6333-6334`, volume `oracle_qdrant_storage`, compose project `oracle` (config `/opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/infrastructure/oracle/docker-compose.oracle.yml`).
- Networks: `oracle_ping_internal` (bridge), `p18-net` (bridge), bridge/host/none.
- Crons touching the plane: NONE. (`crontab` not installed; `/var/spool/cron/crontabs/` empty; `/etc/cron.d/` contains only `e2scrub_all`.)

### PIG plane (Docker Desktop WSL backend; all containers Up ~25h)
- `ping-gateway` (devin-boundary2) — `0.0.0.0:8080->8080`, network `bridge`, mount `muse-workspace` volume -> `/app/workspace/muse`, restart_count 3. Started manually (no compose labels).
- `ping-rc-gateway` (rc-4d522a6b) — `127.0.0.1:18099->8080`, network `ping-rc-sandbox`, no mounts, restart_count 0.
- `ping-postgres` (5433), `ping-rc-postgres` (127.0.0.1:15433), `brain-postgres` (0.0.0.0:5432), `brain-qdrant` (6333-6334), `ping-test-pg` (55433).
- `ping-qdrant` (unhealthy), `ping-redis` (healthy), `ping-vault` (unhealthy, `-dev`), `ollama`, `open-webui` (healthy), `cosyvoice-tts`.
- `ping-qdrant`/`ping-redis`/`ping-vault` carry compose labels: project `ping`, config `C:\Users\nolan\PING\compose.yaml` (Windows path; visible from WSL at `/mnt/c/Users/nolan/PING/`).
- Crons touching the plane: NONE on the Pig WSL (`crontab -l` -> "no crontab for nolan").
- Windows side (read-only: `schtasks.exe /query /fo LIST`, `sc.exe query`, stdin `< /dev/null`): no scheduled tasks mentioning ping/oracle/docker/wsl; service `Tailscale` RUNNING; service `com.docker.service` STOPPED (Docker runs via the WSL2 backend, expected).

---

## 6. KNOWN HEALTH

- **ORACLE `ping-gateway`**: `GET http://127.0.0.1:8080/health` -> `{"status":"healthy", ...}` — all components healthy (gateway, generated_artifacts, integrations, event_governance, event_runtime, canonicalization, qdrant v1.7.0, embedding). Uptime at check: ~193300s (~2.24d). `GET /ready` -> `404 Cannot GET /ready` (endpoint does not exist).
  - Logs (`docker logs --tail 30`): steady `[EventBridge]` poll loop, `canonical query returned 0 rows`, no errors.
  - PG log tail shows repeated `FATAL: database "ping" does not exist` and `FATAL: role "postgres" does not exist` on 2026-09-22 14:02-16:55 UTC — some prober using wrong db/role; gateway itself unaffected/healthy. Source of the probes UNKNOWN.
  - Docker events 72h: only healthcheck exec probes (`pg_isready`, tcp 6333); no container start/stop/die.
- **PIG `ping-gateway` (devin-boundary2)**: `GET http://127.0.0.1:8080/health` (from WSL) -> healthy, uptime ~88340s (~24.5h). Logs: same EventBridge poll loop, no errors. Restart count 3 (historical; reasons not in event history).
- **PIG `ping-rc-gateway`**: `GET http://127.0.0.1:18099/health` -> overall **`"unhealthy"`**; per-component: gateway healthy, generated_artifacts healthy, integrations healthy, event_governance healthy, event_runtime healthy, canonicalization healthy, **qdrant: error** (QDRANT_URL unset in env), embedding healthy, postgres_readiness healthy (TCP-level; the DB itself is empty), startup healthy.
- **Degraded-mode indicators**: NONE active. The 2026-09-13 incident (gateway booted degraded in-memory while PG started; fixed by docker restart) is historical; no gateway is currently in degraded mode.
- **Recent restart history**: whole PIG plane restarted 2026-09-22 ~16:54 UTC (all StartedAt cluster there); ORACLE gateway stable since 2026-09-21 12:05:20Z. `docker events` on the PIG shows no start/die/create records in the last 72h (daemon event history gap — see Open Unknowns).

---

## 7. ROLLBACK ANCHOR

What exists to restore current state (recorded only; nothing created):

### ORACLE plane — full backup set present
- `/opt/ping/releases/RESTORE-2026-09-16.md` — written restore procedure (isolated restore into temp volumes/ports; never into live ports 5432/6333/8080, live volumes, or live container names).
- `/opt/ping/releases/pgdata-backup-2026-09-16.sql.gz` (160927 bytes, sha256 `10e315c3ef2570e210149db95b6f57ad4268b6a4816d37764a9bc40875d8f51e` per the restore doc; at backup time: user=ping db=crx_runtime, 31 public tables, ping_events=1158, ping_missions=222).
- `/opt/ping/releases/qdrant-snapshots-2026-09-16/knowledge-knowledge-7722890700902776-2026-09-17-02-26-36.snapshot` (67375104 bytes; 13 points).
- `/opt/ping/releases/ping-source-clean-2026-09-16.tar.gz` (26628632 bytes, sha256 `962beb7c53385c6771dd2197fbca86ac4f67867d9477cab81564d7aba8cb3ed6`; excludes .git, node_modules, .env, keys/secrets).
- Live volumes: `oracle_pgdata`, `oracle_qdrant_storage`. Live images pinned by digest (section 2). Compose config path in container labels (section 5). Disk: 45G total, 39% used.

### PIG plane — partial
- Live volumes: `compose_postgres_data` (live brain DB), `90d5b444e2a...` (stale ping-postgres data), `ping_ping_qdrant`, `ping_ping_vault`, `ping-rc-pgdata`, `muse-workspace` (mounted into main gateway), plus many legacy anonymous volumes.
- Compose source: `C:\Users\nolan\PING\compose.yaml` (project `ping`; covers qdrant/redis/vault at least). Main gateway was started manually (no compose record); its exact `docker run` invocation is not recorded anywhere found.
- pg dump files exist but are of unknown provenance/date, inside repos: `/home/nolan/ping/pg_dump.sql`, several `/home/nolan/worktrees/*/pg_dump.sql`, `/mnt/c/Users/nolan/PING/tmp_pre_db_dump.sql`. NOT verified as backups of the live DBs.
- **No verified backup of the live `brain-postgres`/`ping_runtime` database was found.**

---

## 8. CURRENT AUTONOMOUS-MISSION TEST STATUS

Durable mission stores found (all reads SELECT-only / `ls`):

### ORACLE plane (`crx_runtime`)
- `ping_missions`: **483 rows** — 481 `completed`, 2 `failed`; newest `2026-09-20 01:50:16Z`, oldest `2026-09-15 15:33:12Z`. **No mission activity for ~3 days.**
- Latest rows are system-generated micro-missions from `created_by=event-to-mission-bridge` (`LINEAGE_CREATE`, `WITNESS_CREATE`, `REPLAY_VERIFY`, `PROJECTION_CREATE`, `RECOMMENDATION_CREATE`, `CLASSIFICATION_CREATE`), all `completed` in ~5s, confidence 0.5, originator `api:muse-level-2`.
- `mission_executions`: **0 rows**. `mission_events`: **0 rows**. `runtime_registry`: **0 rows**. `deployment_registry`: **0 rows**.
- `ping_events`: 2557 rows; `canonical_events`: 0 rows.
- File stores: `/home/ubuntu/p18-oracle-staging/source/ping-converged/missions/` contains only a `VerifyReplay/` staging dir; `/opt/ping/gateway/routes/missions.js` and `/opt/ping/ping-runtime/orchestration/mission_{scheduler,runtime}.js` + `event_to_mission_bridge.js` are source code, not live state.

### PIG plane (live DB `brain-postgres`/`ping_runtime`)
- `ping_missions`: **457 rows, ALL `completed`**; newest `2026-09-23 17:29:07Z` (minutes before this baseline).
- **The mission pipeline is LIVE right now**: `event-to-mission-bridge` emits a chained mission every ~5 seconds (`CLASSIFICATION_CREATE` -> `RECOMMENDATION_CREATE` -> `PROJECTION_CREATE` -> `REPLAY_VERIFY` -> `WITNESS_CREATE` -> `LINEAGE_CREATE`), each completing in ~5s (observed 17:28:37Z-17:29:07Z).
- `mission_executions`: **0 rows**. `mission_events`: **0 rows**.
- Stale `ping-postgres`/`ping_runtime`: 144 missions, all completed, newest 2026-09-16 17:54:14Z.
- File stores: `/home/nolan/projects/constitutional-runtime/missions/` (source: `mission.py`), `demo_hermes_missions.db` (source-tree artifact, not queried); no live JSONL mission-runner state found (`find` for `*mission*` under /home/nolan, /opt, /srv returned only source/docs).

### Assessment
The prior finding still holds: **no externally-assigned autonomous missions have been absorbed into PING as implementation.** What exists is the internal `event-to-mission-bridge` workflow generating and completing micro-missions (classification/recommend
...[truncated 2050 chars]