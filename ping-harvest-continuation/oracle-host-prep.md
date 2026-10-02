# Oracle Host Prep — Phase 1 Report

**Date:** 2026-09-18 ~05:25-05:40 MDT
**Host:** 129.146.60.17 (ubuntu@ping-core-01)
**Access path:** cloud -> Pig (pigwsl) -> Oracle SSH. Direct cloud egress is blocked; all Oracle work ran through `~/workspace/pig/pigwsl-run.sh` SSH hops. No SSH keys were copied anywhere.

## Host facts (all verified live)

| Item | Value |
|---|---|
| ARCH | aarch64 |
| Kernel | 6.17.0-1020-oracle |
| OS | Ubuntu 24.04.4 LTS |
| CPU | 1 vCPU (nproc=1) |
| RAM | 5.8Gi total, 5.0Gi available (no swap) |
| DISK | 45G total, 26G free (42% used) on /dev/sda1 |
| SUDO | NOPASSWD confirmed (`sudo -n true` OK) |
| GIT | 2.43.0 (already installed) |
| DOCKER | Engine 29.1.3 client + server (package `docker.io` 29.1.3-0ubuntu3~24.04.2, Ubuntu repo) |
| COMPOSE | 2.40.3 plugin (package `docker-compose-v2` 2.40.3+ds1-0ubuntu1~24.04.1, Ubuntu repo) |

## Docker decision (documented, not silent)

The task specified the official Docker apt repo. The host already had a fully working Docker Engine 29.1.3 + compose plugin 2.40.3 serving three live, healthy PING containers. Swapping `docker.io` for `docker-ce` would restart the daemon and disrupt the running PING stack (postgres, gateway, qdrant) for no functional gain. Decision: keep the existing engine, verify it meets all requirements (it does), record the repo difference here, and leave migration to the official repo as an optional future maintenance-window item. No installs were needed for Git, Docker, or Compose.

## ARM64 image classification

Evidence tiers: RUNTIME = container running natively on this aarch64 host; LOCAL INSPECT = `docker image inspect` reports arm64/linux; MANIFEST = `docker manifest inspect` shows arm64 in the published manifest list.

| Image | Classification | Evidence |
|---|---|---|
| postgres:17-alpine | ARM64 VERIFIED | RUNTIME (ping-postgres up 24h, healthy) + local inspect arm64/linux |
| qdrant/qdrant:v1.7.0 | ARM64 VERIFIED | RUNTIME (ping-qdrant up 33h, healthy) + local inspect arm64/linux |
| node:20-alpine (gateway + scheduler Dockerfile base) | ARM64 VERIFIED | RUNTIME (ping-gateway built on this host from node:20-alpine, up 22h, healthy) + manifest lists arm64 |
| node:24-alpine | ARM64 VERIFIED | Local inspect arm64/linux |
| temporalio/auto-setup:1.24.0 | ARM64 VERIFIED | Local inspect arm64/linux |
| ghcr.io/berriai/litellm:main-latest | MULTI-ARCH VERIFIED | Manifest lists amd64 + arm64 (profile-gated, not running) |
| python:3.12 | MULTI-ARCH VERIFIED | Manifest lists arm64 among 8 architectures |
| ollama/ollama:latest | MULTI-ARCH VERIFIED | Manifest lists amd64 + arm64 |
| oracle-gateway:latest (locally built) | ARM64 VERIFIED | Local inspect arm64/linux; running healthy |

**ARM64 BLOCKERS: none.** Every image the PING stack references has verified native arm64 support. No emulation is needed or used anywhere. Note: Ollama is classified but must NOT be run on this host per the resource rule (5.8GB RAM priority order: PostgreSQL > runtime > scheduler/workers > JS workers > Python adapter > evidence > Qdrant > workspace; a large model would starve the stack).

## Compose survey and directory decisions

The live Oracle deployment is defined at `/opt/ping/infrastructure/oracle/docker-compose.oracle.yml` (read-only; not modified). It already uses Docker **named volumes** for all persistent state: `pgdata`, `qdrant_storage`, `mirror`, `scheduler_state` (instantiated on host as `oracle_pgdata`, `oracle_qdrant_storage`). Volumes in use: oracle_pgdata (postgres data), oracle_qdrant_storage (qdrant data).

- `/opt/ping` already exists (ubuntu:ubuntu), contains the live deployment source, config, `.env` (0600), a 1.08GB snapshot tarball, and release backups. Not touched.
- `/var/lib/ping` and `/var/log/ping` do not exist. **Not created**, deliberately: the compose stack already persists state in named volumes, and per the task's preference rule ("prefer Docker named volumes where Compose already uses them"), creating parallel bind dirs would duplicate the storage layout for no benefit.
- `docker system df`: images 8.8GB (3 active), build cache 5.2GB (2.9GB reclaimable). No prune was run (conservative; reclaim is optional housekeeping for a maintenance window).

## Security baseline

- Docker daemon: no TCP exposure. No `/etc/docker/daemon.json`. `ss -tlnp` shows no 2375/2376 listeners.
- Service ports are all bound to 127.0.0.1 only: 5432 (postgres), 6333/6334 (qdrant), 8080 (gateway) via docker-proxy. No PostgreSQL/Qdrant public ports.
- Other listeners: sshd on 22 (expected), rpcbind on 111 (Oracle image default), systemd-resolve on 127.0.0.53/127.0.0.54:53 (expected), containerd on 127.0.0.1:33081 (expected). Nothing unexpected.
- ufw is not active; no firewall rules were added or needed (Oracle Cloud security lists are the perimeter, untouched).
- SSH config: untouched, not weakened. No keys copied to or from the host.

## Existing PING-related state (observed, not modified)

- Running containers: `ping-gateway` (oracle-gateway:latest, up 22h, healthy), `ping-postgres` (postgres:17-alpine, up 24h, healthy), `ping-qdrant` (qdrant/qdrant:v1.7.0, up 33h, healthy). All native arm64.
- Local images include `temporalio/auto-setup:1.24.0` and `ghcr.io/oracle/oci-cli:latest` (present, not running; temporal service is defined in the compose but not currently started).
- `/opt/ping` contents: config, database (SQL migrations), gateway (full source + node_modules), infrastructure/oracle (compose, bootstrap.sh, systemd units, Dockerfile.scheduler), ping-runtime, releases (RESTORE-2026-09-16.md, pgdata-backup-2026-09-16.sql.gz, qdrant snapshots, source tarballs), and `ping-oracle-clean-snapshot.tar.gz` (1.08GB).
- Nothing on the host was modified, deleted, restarted, or reconfigured.

## EXTERNAL BLOCKERS

None for Phase 1. No external approvals, purchases, or third-party actions were required.

## REMOTE CHANGES (exact list)

**None.** Zero changes were made on Oracle. No packages installed (Git 2.43.0, Docker Engine 29.1.3, compose plugin 2.40.3 were already present and functional). No directories created (`/opt/ping` already existed; `/var/lib/ping` and `/var/log/ping` intentionally not created per the named-volume preference). No files written, no services restarted, no config edited. All Phase 1 activity on the host was read-only inspection.

## NEXT (for the parent / Phase 2)

1. Host is ready: no further prep needed before deployment work. Docker Engine + compose are verified working with the live stack.
2. Optional maintenance-window items (not required): migrate `docker.io`/`docker-compose-v2` to the official Docker apt repo (`docker-ce`); reclaim ~2.9GB of build cache with `docker builder prune` (only when no builds are in flight).
3. Resource watch: 26G disk free is comfortable; the 1.08GB snapshot tarball in /opt/ping plus release backups should be aged out on a schedule so /opt/ping does not grow unbounded.
4. Do NOT start Ollama or pull large models on this host (5.8GB RAM, no swap). Embedding/LLM inference belongs off-host or on a larger shape.
5. `temporal` and `litellm` services are defined in docker-compose.oracle.yml but not currently running; Phase 2 should decide whether they are in scope for this deployment.
6. The live stack (postgres, gateway, qdrant) predates this phase and was left running untouched; any Phase 2 redeploy should coordinate with whatever owns that deployment to avoid clobbering live state.
