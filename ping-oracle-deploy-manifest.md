# Oracle PING Deployment Manifest

Inspection date: 2026-09-18 ~05:40 MDT (read-only, zero remote changes made).
Inspector: ORACLE-INSPECTION dispatcher. Path: cloud -> Pig (pigwsl-run.sh) -> Oracle 129.146.60.17.

---

## 1. Live source identity (Oracle /opt/ping)

* **/opt/ping is NOT a git repository.** `git rev-parse` returns "fatal: not a git repository". There is no branch or HEAD SHA to record. Source provenance is the local snapshots:
  * `releases/ping-source-clean-2026-09-16.tar.gz`
  * `releases/ping-oracle-clean-snapshot.tar.gz` (1,083,211,776 bytes, ~1 GB)
  * `releases/pgdata-backup-2026-09-16.sql.gz` (pre-existing DB backup)
  * `releases/qdrant-snapshots-2026-09-16/`
  * `releases/RESTORE-2026-09-16.md`
* **Live compose** (deploy spec, not git-tracked): `/opt/ping/infrastructure/oracle/docker-compose.oracle.yml` (dated 2026-09-15 04:52). Services: postgres, qdrant, temporal, gateway, scheduler, litellm (profile-gated). No `worker` service exists.
* **Live code vintage:** `/opt/ping/gateway/bootstrap/gateway_runtime.js` md5 `5a58a1bca91360d8d8833f0656176768`. The fixed branch has NO `gateway/bootstrap/` directory and no `gateway_runtime.js` anywhere, so a file-level hash comparison is not possible. The live tree also carries legacy variants (`server.js`, `server.js.v2`, `server.js.working`, `server.js.backup`) and a `root_private_key.pem` in `gateway/` (presence noted, contents never read).
* **Live gateway Dockerfile** (`/opt/ping/gateway/Dockerfile`) md5 `e4b6a8d5aaafd6d4a5c22f76d9862fca`. This is the OLD Dockerfile the live image was built from.

## 2. Fixed branch identity (Pig)

* Branch: `oracle/deploy-2026-09-18`, worktree `/home/nolan/worktrees/ping-oracle-deploy`
* HEAD SHA: `d6d2a474f6a12a46babc3c2e7540e98b675c77f9`
* `git status --porcelain`: clean (no output)
* Fix commits (blocker fixes, 2026-09-18):
  1. `c84f42d14` infra(oracle): port canonical compose, drop worker/scheduler per contract
  2. `a6e05963f` fix(oracle): add H9 gateway Dockerfile (node:20, ARM64 tools, exec CMD)
  3. `c42a11482` fix(oracle): gateway build repoint at H9 Dockerfile, pinned image name, host-gateway for Ollama
  4. `1c018a0e9` fix(oracle): postgres applies schema.sql on first init, fail-closed password
  5. `e3337353d` fix(oracle): fail-closed POSTGRES_PASSWORD on temporal, gateway, litellm
  6. `d6d2a474f` fix(oracle): bootstrap defaults to main branch; template notes for image tag and host-gateway

## 3. Live runtime (docker)

Running containers (only 3 of 6 compose services actually up; temporal/scheduler/litellm NOT running):

| Name | Image | Image ID (sha256) | Status |
|---|---|---|---|
| ping-gateway | oracle-gateway | 8400deecf2a93be276339492b71ebb2ea2a768b565b0d0752a2dd2fe005e48c5 | Up 23h, healthy |
| ping-postgres | postgres:17-alpine | 18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73 | Up 24h, healthy |
| ping-qdrant | qdrant/qdrant:v1.7.0 | ff1639878418c0572f50a7e1314874e399537eb97e6d2f42d6b987a07a2c4c4f | Up 34h, healthy |

Listening ports (all 127.0.0.1-bound): 5432 (postgres), 6333/6334 (qdrant), 8080 (gateway). Ports 7233 (temporal) and 4000 (litellm) are NOT listening.

Volumes (`docker volume ls --filter name=oracle`): `oracle_pgdata`, `oracle_qdrant_storage` (driver local). Compose also declares `mirror` and `scheduler_state` but they did not surface under the oracle_ prefix filter.

## 4. Live DB identity (ping-postgres, db crx_runtime, user ping)

Read-only. Tables in public schema (22 total): event_outbox, event_processing, execution_graphs, exterior_agent_credentials, google_reviews, graph_node_states, hpp_project_artifacts, hpp_projects, knowledge_edges, knowledge_nodes, mission_events, mission_executions, ping_bridge_cursors, **ping_events**, **ping_missions**, repository_dead_letters, repository_events, repository_objects, repository_snapshots, repository_store_migrations, review_flags, runtime_registry, telemetry_metrics, tenant_registry.

Counts: **ping_events = 2182**, **ping_missions = 419**, **knowledge_nodes = 178**.

`ping_events` columns: event_id, event_type, source, timestamp (default now()), payload (jsonb), metadata (jsonb), namespace (default 'core::system'), processed (bool), created_at. **No sequence column** (no bigint/serial).

## 5. Gateway state

* `GET http://127.0.0.1:8080/system/state` responds: `{"version":"1.0.0","generated_at":"2026-09-18T11:40:58.084Z","containers":{},"git":{},...}` with repository status available but **zero nodes, zero knowledge objects, zero missions queued**.
* Live gateway code vintage: bootstrap/runtime layer from the 2026-09-15/16 Oracle packaging, not from the fixed branch (branch has no `gateway/bootstrap/gateway_runtime.js`).
* Fixed branch gateway target: image `ping-gateway:${PING_IMAGE_TAG:-latest}`, built from `infrastructure/oracle/Dockerfile.gateway` (FROM node:20-alpine, COPY gateway/, EXPOSE 8080, CMD ["node", "server.js"]), with `extra_hosts: host.docker.internal:host-gateway` for Ollama.

## 6. Live vs fixed-branch changes

| Area | Live (pre-existing) | Fixed branch |
|---|---|---|
| Source | Non-git dir, tarball snapshots, legacy server.js variants | Git branch, clean |
| Gateway image | `oracle-gateway` built from old `gateway/Dockerfile` | `ping-gateway:${PING_IMAGE_TAG:-latest}` built from `infrastructure/oracle/Dockerfile.gateway` (node:20, H9, exec CMD) |
| Gateway code | `gateway/bootstrap/gateway_runtime.js` bootstrap layer | No bootstrap layer; canonical gateway layout |
| Compose services | postgres, qdrant, temporal, gateway, scheduler, litellm(profile) | postgres, qdrant, temporal, gateway, litellm(profile); **scheduler dropped, no worker** |
| Postgres init | Unknown (volume predates) | Applies `infrastructure/oracle/schema.sql` on first init; fail-closed POSTGRES_PASSWORD |
| Secrets | Composes interpolate `${POSTGRES_PASSWORD}` unguarded | Fail-closed POSTGRES_PASSWORD on postgres/temporal/gateway/litellm |
| Ollama | `OLLAMA_BASE_URL` defaults to `http://host.docker.internal:11434` (no host mapping) | `host.docker.internal:host-gateway` mapping added |
| Bootstrap | bootstrap.sh dated 2026-09-15 | Step 5 defaults env; template notes for image tag and host-gateway |

## 7. .env presence (values never read or printed)

* `/opt/ping/.env` exists, `-rw-------` ubuntu:ubuntu, 249 bytes, modified 2026-09-17 11:42
* `/opt/ping/infrastructure/oracle/.env` exists, `-rw-------` ubuntu:ubuntu, 249 bytes, modified 2026-09-17 11:47
* `/opt/ping/infrastructure/oracle/.env.bak-20260917` exists (pre-restore backup)

## 8. systemd decision

Units present in `/opt/ping/infrastructure/oracle/systemd/`: ping-gateway.service, ping-postgres.service, ping-scheduler.service, ping-worker.service.

Findings:
* **ping-worker.service** runs `docker compose up -d worker`, but NO compose file (live or fixed) defines a `worker` service. This unit is broken against both.
* **ping-scheduler.service** runs `docker compose up -d scheduler`. This works against the LIVE compose (scheduler exists) but breaks against the FIXED compose, which intentionally dropped the scheduler (`c84f42d14`, "drop worker/scheduler per contract").
* The fixed branch's **bootstrap.sh step 5** tells the operator to run `systemctl start ping-postgres ping-gateway ping-worker ping-scheduler`, which will fail on ping-worker (no such service in compose) and on ping-scheduler (service removed from fixed compose).

Options considered:
1. Keep the four units as-is and re-add worker/scheduler services to the fixed compose. Rejected: reintroduces components the contract deliberately dropped, adds unreviewed surface.
2. Drop systemd entirely and rely on `restart: unless-stopped`. Rejected: loses ordered startup (gateway needs postgres healthy first) and leaves the operator with no host-level control.
3. Ship fixed systemd units that only start services the fixed compose actually defines, in dependency order, and fix bootstrap.sh step 5 to match.

**RECOMMENDATION: option 3.** Ship two systemd units, ping-postgres.service then ping-gateway.service (matching the fixed compose, in dependency order), remove or neutralize ping-worker.service and ping-scheduler.service, and correct bootstrap.sh step 5 to `systemctl start ping-postgres ping-gateway`. If temporal is required in production later, it gets its own unit deliberately, not by accident.

## 9. Blockers and cautions for the transfer/build phase

1. **No live source SHA.** /opt/ping is not a git repo, so the running gateway cannot be cryptographically tied to any commit. Treat `oracle-gateway` (sha256:8400deec...) as opaque; the transfer is a rebuild from the fixed branch, not a patch of the live tree.
2. **Data preservation.** `oracle_pgdata` holds the live event store (2182 events, 419 missions, 178 knowledge nodes). Never let the fixed-branch postgres init (`schema.sql` on first init) run against this existing volume: it only triggers on a fresh empty data dir, but a misnamed volume or deleted volume would wipe the live store. Confirm volume name mapping (`pgdata` under compose project `oracle` = `oracle_pgdata`) before any `docker compose up`.
3. **Secrets.** Both `.env` files (600, ubuntu:ubuntu) must survive the transfer. Do not overwrite them with template defaults. The fixed branch's `oracle.env.template` is a template, not a live file.
4. **Quoting on the hop.** pigwsl-run.sh strips single quotes and backslashes; the psql meta-command `\\dt` and single-quoted SQL literals silently corrupt. Use double-quoted SQL without single quotes (information_schema + `current_schema()` worked). Budget for this in any future remote automation.
5. **Legacy cruft in /opt/ping.** `gateway/server.js.v2`, `server.js.working`, `root_private_key.pem`, and the 1 GB `ping-oracle-clean-snapshot.tar.gz` are pre-existing and were not touched. `root_private_key.pem` presence should be reviewed for whether it still belongs on the host.
6. **Gateway image name change.** Live runs `oracle-gateway`; the fixed build produces `ping-gateway:${PING_IMAGE_TAG:-latest}`. Old and new containers can coexist under different names; the switchover must stop the old before the new binds 127.0.0.1:8080.
7. **bootstrap.sh step 5 is wrong.** It must be fixed before anyone follows it (see systemd decision above).
8. **Temporal/litellm were never running.** Live stack = postgres + qdrant + gateway only. Do not assume temporal or scheduler state exists to migrate.

## 10. Explicit exclusions

Excluded from this manifest and from any transfer package: `.env` values, `root_private_key.pem` and any other key/PEM material, database credentials, node_modules, `.env.bak-*` contents, raw DB payloads beyond aggregate counts. Files named for identification only, never reproduced.
