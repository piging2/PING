# ORACLE HOST - EVIDENCE LOG (lane-oracle, 2026-09-23 night)
All commands read-only. Access: local copy of ~/workspace/pig-fb/oracle-ssh.sh
(byte-identical, verified via cmp), scripts piped on stdin: `./oracle-ssh.sh -s`.
No private key material read. No .env values read (var names only via cut -d= -f1).
The one redacted value (POSTGRES_PASSWORD in a compose file) was redacted by the
runtime; no attempt was made to recover it.

## Batch 1 - system identity
- `uname -a` -> Linux ping-core-01 6.17.0-1020-oracle #20-Ubuntu SMP Sat Jul 25 00:52:17 UTC 2026 aarch64 aarch64 aarch64 GNU/Linux
- `arch` -> aarch64
- `cat /etc/os-release` -> Ubuntu 24.04.4 LTS (noble)
- `nproc` -> 1
- `free -m` -> total 5903, used 763-776, available 5127-5139, Swap: 0
- `df -h /` -> /dev/sda1 45G, 17G used, 28G avail, 39%
- `swapon --show` -> empty (no swap)
- `sudo -n true` -> SUDO-NOPASSWD-OK
- `which docker` -> /usr/bin/docker ; `systemctl is-enabled docker` -> enabled
- `which git` -> /usr/bin/git ; `git --version` -> 2.43.0
- `systemctl is-enabled cron` -> not-found (no cron daemon on host)
- `systemctl is-system-running` -> running ; `uptime` -> up 4 days, 1:53
- `systemctl is-enabled unattended-upgrades` -> enabled
- `last reboot` -> boots: 2026-09-20 00:05 (still running), 2026-09-15 18:29, 2026-07-14 02:09

## Batch 2 - docker engine
- `docker version` -> Client+Server 29.1.3, API 1.52, go1.24.4, OS/Arch linux/arm64
- `docker compose version` -> 2.40.3+ds1-0ubuntu1~24.04.1
- `dpkg -l | grep -iE 'docker|containerd'` -> docker.io 29.1.3-0ubuntu3~24.04.2 arm64,
  docker-compose-v2 2.40.3, containerd 2.2.1 (all from Ubuntu noble repos; NOT docker-ce)
- `docker info` -> Storage overlayfs, Cgroup systemd v2, Arch aarch64, Total Memory 5.765GiB, Docker Root Dir /var/lib/docker
- `docker system df` -> Images 8, 4 active, SIZE 11.54GB (logical, shared layers double-counted),
  4.088GB reclaimable; Containers 6 (3 active); Local Volumes 3, 190.5MB
- `docker images` -> ping-gateway:candidate-3c5d280dd 1.82GB; ping-gateway:candidate-84486f056 1.77GB;
  ollama/ollama:latest 6.99GB; node:24-alpine 232MB; postgres:17-alpine 415MB;
  node:20-alpine 194MB; node:18-alpine 180MB; qdrant/qdrant:v1.7.0 245MB
- `docker ps -a` ->
  ping-gateway                ping-gateway:candidate-3c5d280dd  Up 2 days                  127.0.0.1:8080->8080
  ping-gateway-candidate      ping-gateway:candidate-3c5d280dd  Exited (137) 34 hours ago
  ping-postgres               postgres:17-alpine                Up 2 days (healthy)        127.0.0.1:5432->5432
  ping-gateway-prev-84486f056 ping-gateway:candidate-84486f056  Exited (137) 2 days ago
  p18-scratch-pg              postgres:17-alpine                Exited (0) 4 days ago
  ping-qdrant                 qdrant/qdrant:v1.7.0               Up 4 days (healthy)        127.0.0.1:6333-6334->6333-6334
- `docker network ls` -> bridge, host, none, oracle_ping_internal (bridge), p18-net (bridge)

## Batch 3 - container inspect (names/volumes/policies/health)
- ping-gateway: RestartPolicy=unless-stopped, MemoryLimit=0, Healthcheck=null (NONE),
  no mounts, ports 8080/tcp -> 127.0.0.1:8080, StartedAt=2026-09-21T12:05:20Z,
  image Arch=arm64, log driver=json-file
- ping-postgres: Image=postgres:17-alpine, Restart=unless-stopped, MemoryLimit=0,
  volume oracle_pgdata -> /var/lib/postgresql/data, ports 5432 -> 127.0.0.1:5432,
  Created=2026-09-21T11:27:08Z, Health=healthy,
  healthcheck CMD-SHELL `pg_isready -U ping -d crx_runtime` interval 10s timeout 5s retries 5 start_period 30s,
  log driver=json-file
- ping-qdrant: Image=qdrant/qdrant:v1.7.0, Restart=unless-stopped, MemoryLimit=0,
  volume oracle_qdrant_storage -> /qdrant/storage, ports 6333,6334 -> 127.0.0.1,
  Created=2026-09-17T01:53:11Z, StartedAt=2026-09-20T00:05:59Z, Health=healthy,
  healthcheck TCP probe on 6333 interval 15s retries 3 start_period 30s,
  log driver=journald
- `docker volume ls` -> oracle_pgdata, oracle_qdrant_storage, p18_pgdata (orphan of p18-scratch-pg)
- `du -sh` volumes -> oracle_pgdata 69M, oracle_qdrant_storage 2.3M
- `docker history ping-gateway:candidate-3c5d280dd` (top) -> CMD ["node" "gateway/serv..."],
  EXPOSE 8080, USER nodejs, `npm install --no-save typescript` layer 39MB

## Batch 4 - live service probes (read-only HTTP/SQL)
- `curl http://127.0.0.1:8080/health` -> {"status":"healthy","uptime":222899.04,...,
  memory rss 157331456 heapUsed 96077736, integrations total 3 healthy 3 (posthog, email, ...)}
- `curl http://127.0.0.1:8080/` -> 404 "Cannot GET /"
- `curl http://127.0.0.1:6333/` -> {"title":"qdrant - vector search engine","version":"1.7.0"}
- `curl http://127.0.0.1:6333/collections` -> {"result":{"collections":[{"name":"knowledge"}]}}
- `curl http://127.0.0.1:6333/collections/knowledge` -> status green, points_count 144,
  vectors_count 144, params {size 768, distance Cosine}, hnsw m 16 ef_construct 100,
  on_disk_payload true, 2 segments
- `docker exec ping-postgres psql -U ping -d crx_runtime -c 'SELECT version();'` ->
  PostgreSQL 17.11 on aarch64-unknown-linux-musl (Alpine 15.2.0) 64-bit
  (succeeded with NO password: trust auth inside the container network path)
- `docker exec ping-gateway node --version` -> v18.20.8
- `docker stats --no-stream` -> gateway 117.8MiB, postgres 32.11MiB, qdrant 47.24MiB
  (all vs limit 5.765GiB = unlimited)
- `ps` gateway proc -> uid 1001, non-root, `node gateway/server.js`, elapsed 2-13:57:06
- `docker top ping-qdrant` -> PID 1506 `./qdrant` is the CONTAINER process
  (no host-level duplicate qdrant; earlier ps sighting explained)
- `/proc/pressure/memory` -> some/full avg10 0.00 (zero memory pressure at probe time)

## Batch 5 - host filesystem layout
- `du -sh /var/lib/docker` -> 2.0G (unique on-disk; cf. 11.54GB logical in docker system df)
- `du -sh /opt/ping` -> 2.7G ; `/home/ubuntu` -> 219M ; `/var/log` -> 454M
- `journalctl --disk-usage` -> 432.1M
- `/opt/ping` tree: gateway/ ping-runtime/ database/ config/ infrastructure/ backups/
  releases/ .env (0600, 253B) .env.bak-20260917 .env.bak-20260921-p0rotate package.json .dockerignore
- `/opt/ping/backups/` -> ping-postgres-2026-09-19.dump (368338 B)
- `/opt/ping/releases/` -> RESTORE-2026-09-16.md, pgdata-backup-2026-09-16.sql.gz (160927 B),
  ping-source-clean-2026-09-16.tar.gz (26628632 B, sha256 962beb7c...),
  qdrant-snapshots-2026-09-16/knowledge-...snapshot (67375104 B),
  bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/ (compose.yaml variants + Dockerfiles)
- `~/p18-oracle-staging/` -> build-arm64*.log, p18-probe.js, source/, .pgpass (0600)
- `cut -d= -f1 /opt/ping/.env` -> POSTGRES_HOST POSTGRES_PORT POSTGRES_DB POSTGRES_USER
  POSTGRES_PASSWORD QDRANT_HOST QDRANT_PORT QDRANT_URL LOG_LEVEL NODE_ENV (names only)
- `python3 --version` -> 3.12.3 ; `which node npm` on host -> empty (no host node)
- compose hunt -> /opt/ping/infrastructure/oracle/docker-compose.oracle.yml (postgres+qdrant+temporal+...),
  snapshot compose.*.yaml (postgres,qdrant,vault,ollama,mission-control,repo-runtime,gateway,
  digestion/newsletter/projection/witness/replay workers,ui), gateway/Dockerfile (FROM node:20-alpine,
  CMD ["node","gateway/bootstrap/gateway_runtime.js"]), infrastructure/oracle/Dockerfile.scheduler
- RESTORE-2026-09-16.md notes: live DB then had 31 public tables, ping_events=1158 rows,
  ping_missions=222 rows; backups live on-host only ("copy them off-host before they count as real DR");
  "No backup automation exists yet"
- Listening sockets: 127.0.0.1:6333,6334 (qdrant), 127.0.0.1:8080 (gateway), 127.0.0.1:5432 (postgres),
  127.0.0.1:46699 (containerd), 0.0.0.0:22 (sshd), 0.0.0.0:111 (rpcbind)

## Batch 6 - PING repo on Pig (read-only, via pigwsl-exec.sh)
- HEAD e48ef710, branch fyd-factory
- package.json engines: {"node":"24.x"}; deps: 19 total; native dep: sharp ^0.35.3
  (prebuilt arm64 binaries; lane P verified tonight)
- no sqlite/better-sqlite3 in deps; no sqlite imports in src/
- lockfile: package-lock.json (399351 B)
- Pig WSL node: v22.23.2
- no Dockerfile at repo root (maxdepth 2)
