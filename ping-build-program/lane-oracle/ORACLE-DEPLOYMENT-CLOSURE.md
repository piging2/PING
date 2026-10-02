# ORACLE DEPLOYMENT CLOSURE (lane-oracle, AGENT 11, 2026-09-23 night)
Read-only investigation. Nothing was created, started, stopped, or modified on the
host. The prior "known facts" (Docker ABSENT, Git ABSENT) are STALE: Docker 29.1.3,
Git 2.43.0, and a live 3-container PING stack are present and running.

## 1. CURRENT STATE (verified tonight)

Host: 129.146.60.17, ubuntu, ping-core-01, Ubuntu 24.04.4 LTS, aarch64, 1 vCPU,
5903 MB RAM, 0 swap, 45 GB disk (17 G used, 28 G free), sudo NOPASSWD, sshd on
0.0.0.0:22, unattended-upgrades ENABLED, no cron daemon, docker+containerd enabled.

Live containers (hand-started `docker run`, NOT from any compose file on the box;
evidence: log drivers and volume names do not match the checked-in compose files):

| container | image | since | restart | mem limit | healthcheck | ports |
|---|---|---|---|---|---|---|
| ping-gateway | ping-gateway:candidate-3c5d280dd (arm64, node 18.20.8, 1.82 GB) | 2026-09-21 12:05 UTC | unless-stopped | NONE (0) | NONE | 127.0.0.1:8080 |
| ping-postgres | postgres:17-alpine (PostgreSQL 17.11 aarch64) | 2026-09-21 11:27 UTC | unless-stopped | NONE | pg_isready 10s, healthy | 127.0.0.1:5432 |
| ping-qdrant | qdrant/qdrant:v1.7.0 | created 09-17, restarted 09-20 00:05:59 UTC | unless-stopped | NONE | TCP 6333 15s, healthy | 127.0.0.1:6333,6334 |

Steady-state RSS: gateway ~118-157 MB, postgres ~32 MB, qdrant ~47 MB. Zero memory
pressure at probe time. Qdrant holds collection `knowledge`: 144 points, 768-dim
cosine vectors, status green. Gateway /health returns healthy with 3/3 integrations
healthy. Postgres volume oracle_pgdata = 69 MB; qdrant volume oracle_qdrant_storage = 2.3 MB.

Dead containers on box: ping-gateway-candidate (exit 137, 34 h ago),
ping-gateway-prev-84486f056 (exit 137, 2 d ago), p18-scratch-pg (exit 0, 4 d ago).
Exit 137 = SIGKILL: consistent with either `docker stop` or OOM-kill. With no memory
limits and no swap, OOM cannot be ruled out; treat as a risk, not a verdict.

Not running: ollama/ollama:latest image present (6.99 GB logical) but NO ollama
container exists. No temporal, vault, workers, or UI containers despite compose
artifacts describing them. The live stack is postgres + qdrant + gateway only.

/opt/ping (2.7 GB) holds the P18 deployment tree: gateway/, ping-runtime/,
database/, config/, infrastructure/oracle/docker-compose.oracle.yml,
releases/ (RESTORE-2026-09-16.md, pgdata-backup-2026-09-16.sql.gz 161 KB,
ping-source-clean-2026-09-16.tar.gz 26.6 MB, qdrant snapshot 67 MB, compose.*.yaml
variants, Dockerfiles), backups/ (ping-postgres-2026-09-19.dump 368 KB),
.env (0600, names only ever read). ~/p18-oracle-staging holds build logs and .pgpass.

## 2. PROPOSED TOPOLOGY
Design artifact: `compose.proposed.yaml` in this lane dir. DO NOT APPLY REMOTELY.
Pins the exact tags verified live (postgres:17-alpine, qdrant/qdrant:v1.7.0),
adds what the live stack lacks: memory limits on every service (1g/1g/2g),
healthcheck on the gateway, depends_on healthy ordering, json-file log rotation
(10m x 5), loopback-only ports, env_file intake. Ollama is present only as a
commented profile: NOT ADOPTED (veto gate, section 12).

## 3. ARM64 COMPATIBILITY
Host is aarch64; every live image is arm64 (gateway image Arch=arm64 verified;
postgres:17-alpine and qdrant/qdrant:v1.7.0 publish arm64 manifests; node:24-alpine
exists for arm64). PING repo needs: node engines 24.x, sharp ^0.35.3 (prebuilt
arm64 binaries, no build toolchain needed at runtime), zero sqlite/native deps in
package.json and src. The live gateway runs node 18.20.8, which VIOLATES the repo
engines field (24.x): this is P18-era drift. Any rebuild of the gateway image must
use node:24-alpine as base. No host-level node exists (workers must run in
containers); host python is 3.12.3.

## 4. DOCKER INSTALL PATH
Nothing to install: docker.io 29.1.3 + docker-compose-v2 plugin 2.40.3 from Ubuntu
noble repos, containerd 2.2.1, overlayfs, cgroup v2 systemd driver. Reinstall path
if ever needed: `sudo apt install docker.io docker-compose-v2` (deliberately the
Ubuntu-packaged build, not docker-ce: apt-cache shows no docker-ce candidate in
configured repos). Daemon autostart verified: docker.service and containerd.service
both `enabled`.

## 5. POSTGRESQL
- Image: postgres:17-alpine (17.11, musl/aarch64). ARM64 native.
- Persistence: named volume oracle_pgdata -> /var/lib/postgresql/data (69 MB live).
  Named volumes preferred over bind mounts: portable across rebuilds, correct
  ownership inside the container, no host-path coupling.
- Memory: currently uncapped; propose mem_limit 1g. At 69 MB of data the working
  set is tiny; 1g leaves room for 100x growth before revisit.
- Backup design (no cron daemon on host: use a systemd timer, not crontab):
  nightly `docker exec ping-postgres pg_dump -U ping -d crx_runtime --no-owner --no-acl`
  piped to gzip in /opt/ping/backups with UTC timestamp; retention 7 daily + 4
  weekly; verify with `gzip -t` and a row-count probe against an ISOLATED restore
  container (procedure already exists in RESTORE-2026-09-16.md, do not restore into
  live ports/volumes/names). Off-host copy: scp the nightly artifact to the Pig
  (design only; no backup runs tonight).
- WAL/archive: at this data size (69 MB) plain pg_dump is sufficient; WAL archiving
  is overkill and adds operational surface. Revisit if the DB passes 10 GB or
  point-in-time recovery becomes a requirement. Record the decision; do not build it.

## 6. VOLUMES AND FILESYSTEM LAYOUT
- /var/lib/docker (2.0 GB unique on-disk): engine state, named volumes. Keep.
- /opt/ping (2.7 GB): deployment tree, compose artifacts, backups/, releases/.
  This is the operator-owned layer; the proposed compose references it for env_file.
- ~/p18-oracle-staging (219 MB): build scratch; safe to archive off-host, not live.
- /var/log 454 MB + journald 432 MB: cap journald (SystemMaxUse) to stop slow fill;
  container logs rotate via the proposed logging options.
- Reclaimable: docker images 4.088 GB logical (old gateway candidate 1.77 GB,
  unused node:18/20-alpine). Prune is a morning operator action, not tonight.

## 7. GATEWAY / RUNTIME CONTAINER
Runs `node gateway/server.js` as non-root uid 1001, CMD from a candidate image
built 2 days ago (1.82 GB; layer history shows a full repo COPY plus an
`npm install --no-save typescript` layer). /health is healthy; `/` 404s.
Secrets: env-only intake via /opt/ping/.env (0600); values never read tonight,
never belong in images, compose files, logs, or chat. Gaps to close at rebuild:
no healthcheck, no memory limit, node 18 vs required 24, 1.82 GB image is heavy
(full repo COPY: slim to a multi-stage build in the morning).

## 8. JS WORKERS
No worker containers run today. The snapshot compose files describe digestion,
newsletter, projection, witness, and replay workers plus a worker-runtime
Dockerfile. Worker model for the proposal: one container per worker, node:24-alpine,
same env_file, depends_on postgres+qdrant healthy, mem_limit 512m-1g each,
restart unless-stopped. Four workers at ~200 MB RSS each still fit (section 13).
No host node: workers never run on bare metal here.

## 9. PYTHON ADAPTER
Host python3 is 3.12.3. No venv and no adapter code run on the host today.
Recommendation: python adapters run in their own slim container
(python:3.12-alpine, arm64) with pinned requirements, NOT in a host venv, so the
host stays a pure container host. Dependency weight must be declared in the image;
nothing new was measured tonight because no adapter is deployed.

## 10. QDRANT
qdrant/qdrant:v1.7.0 arm64, 47 MB RSS with 144 points. Volume oracle_qdrant_storage
(2.3 MB). Collection design observed: `knowledge`, 768-dim cosine, HNSW m=16,
on-disk payload. Do NOT create collections from this lane (none were).
Snapshot story: `POST /collections/{name}/snapshots` + copy the file off the
volume; a 67 MB snapshot from 09-17 exists in releases/. Proposed: weekly snapshot
via the same systemd timer as pg_dump. Memory budget: 1g cap; vector growth to
~1M points at 768 dims (~3 GB) would exceed this host: that scale needs a morning
architecture decision, not tonight.

## 11. OLLAMA: HONEST VERDICT
Image ollama/ollama:latest (6.99 GB) is pulled; no container runs. RAM math:
5903 MB total, ~5127 MB available at idle, ZERO swap. A usable local model
(llama3.1:8b Q4 ~4.7 GB) plus the running stack (~1.5 GB with workers) plus OS
fits only on paper; under any concurrent load the OOM killer decides, and the two
exit-137 gateway deaths show SIGKILLs already happen on this box. Small models
(1-3B, 1-2 GB) fit but are weak for the Ask FYD / extraction workloads. Verdict:
local Ollama is MARGINAL-TO-UNFIT for production on this host. Alternatives:
(a) remote inference API (recurring cost, data leaves the host: veto-gate data
custody question for morning), (b) a second, larger Oracle ARM host for inference
(free-tier shapes exist: 4 OCPU / 24 GB), (c) defer inference to the Pig.
VETO GATE on adopting local Ollama for production: REJECT for now (weight dwarfs
value at this RAM; fails "what fails if it disappears" gracefully only if remote
fallback exists). Research use in isolation remains allowed per standing decisions.

## 12. HEALTH: WHAT "HEALTHY" MEANS, MEASURABLY
- postgres: `pg_isready -U ping -d crx_runtime` exit 0 (already live, 10s interval).
- qdrant: TCP connect to 6333 succeeds AND `GET /` returns version JSON (live check
  is TCP-only; add the HTTP check at rebuild).
- gateway: `GET /health` returns HTTP 200 with {"status":"healthy"} (MISSING today:
  container reports only process liveness; a wedged event loop would still show
  "Up"). Proposed healthcheck in compose.proposed.yaml.
- host: docker.service active, available RAM > 1 GB, disk use < 80%.
- restart policy: unless-stopped on all three live containers (verified). At
  rebuild, keep unless-stopped; never use `always` (it would resurrect containers
  an operator deliberately stopped).

## 13. RESTART AND RECOVERY (verified against current OS state)
Proven: host rebooted 2026-09-20 00:05; qdrant container StartedAt 2026-09-20
00:05:59 (59 s after boot) with NO human action: docker.service (enabled) started
the daemon, unless-stopped policy restarted the container, its healthcheck passed.
Exact recovery sequence after any reboot:
1. systemd starts containerd.service then docker.service (both enabled).
2. dockerd restarts every unless-stopped container (order not guaranteed).
3. postgres and qdrant healthchecks gate readiness (10-30 s start_period).
4. gateway has NO startup ordering today (depends_on exists only in the compose
   artifacts, not in the live `docker run` topology): on a cold boot the gateway
   may start before postgres is ready. It survived this in practice (Sep 20),
   but the proposed compose makes it deterministic.
Full-loss rebuild (closure test): from this lane's artifacts alone a stranger can
rebuild: install docker.io + compose plugin (section 4), create volumes, run the
three services per compose.proposed.yaml with env_file recreated from the variable
NAMES in section 1, restore postgres from the newest /opt/ping/backups dump and
qdrant from snapshot using the isolated procedures in RESTORE-2026-09-16.md.
What they CANNOT recover from artifacts: secret VALUES (live only in /opt/ping/.env
and container metadata) and anything written since the last backup. That is the
honest gap; the off-host backup copy (section 5) is what closes it.

## 14. CAPACITY TABLE (honest)

| resource | total | steady state now | proposed stack (pg+qdrant+gateway+4 workers) | headroom | verdict |
|---|---|---|---|---|---|
| RAM | 5903 MB | ~1200 MB incl OS/docker | ~2200 MB | ~3700 MB | FITS comfortably |
| RAM + local 8B LLM | 5903 MB | n/a | ~7000 MB needed | negative | DOES NOT FIT |
| RAM + local 3B LLM | 5903 MB | n/a | ~4200 MB | ~1700 MB | MARGINAL, no swap, OOM risk |
| disk | 45 GB | 17 GB used | +~2 GB growth | 28 GB free | FITS |
| CPU | 1 vCPU | load 0.16-0.66 | bursty workers OK, sustained inference not | thin | FITS for serving, NOT for training/heavy inference |

Degradation order under pressure: gateway (no limit, first OOM candidate) >
workers > qdrant > postgres. Memory limits in the proposed compose encode this
priority explicitly.

## 15. VENDOR VETO GATE (standing decision 2, applied)
- postgres:17-alpine: ADOPT (already live; zero recurring cost; data stays on host;
  replaceable by any postgres; PING owns schema and events; disappearance = restore
  from dump). No gate trigger beyond "new hosted database": it is self-hosted,
  passes.
- qdrant/qdrant:v1.7.0: ADOPT (same reasoning; vectors are derived projections,
  rebuildable from canonical events).
- ollama/ollama:latest as production inference: REJECT for now (section 11).
  Experimentation in isolation remains permitted.
- Remote inference API (future): QUEUED FOR MORNING. Gate questions answered
  partially: recurring cost unknown (needs Nolan), data custody = prompts leave
  the host (Nolan's call), replaceable yes (model behind an interface), PING stays
  authority yes. Not adopted tonight.
- Ubuntu-packaged docker.io vs docker-ce: ADOPT docker.io (no new vendor; already live).

Oracle free-tier constraint recorded: this host is the free ARM shape (4 OCPU/24 GB
is the free allowance; this VM presents 1 vCPU/5.9 GB). Staying inside free tier
means no paid upgrades without Nolan; the honest scaling answer is a second free
ARM VM for inference, not a bigger paid box.

## 16. SHARED RECORD LINES
Format: DOMAIN / COMPONENT / CLAIM / EVIDENCE / CALLER / CALLEE / WRITER / READER /
AUTHORITY / CLASSIFICATION / CONFIDENCE / BROKEN BOUNDARY / DEPENDENCIES / AFFECTS AGENTS

- ORACLE / HOST / Host is Ubuntu 24.04.4 LTS aarch64, 5903 MB RAM, 0 swap, 45 GB disk (28 GB free) / uname+free+df via oracle-ssh.sh / agent-11 / - / - / OBSERVED / HIGH / none / - / all-lanes
- ORACLE / HOST / Prior "Docker ABSENT, Git ABSENT" claims are stale; docker.io 29.1.3 and git 2.43.0 are installed and running / which+docker version+dpkg / agent-11 / - / - / OBSERVED / HIGH / none / - / coordinator
- ORACLE / CONTAINERS / Three live containers: ping-gateway (candidate-3c5d280dd), ping-postgres (postgres:17-alpine), ping-qdrant (qdrant/qdrant:v1.7.0), all restart unless-stopped / docker ps -a + inspect / agent-11 / - / - / OBSERVED / HIGH / none / - / all-lanes
- ORACLE / GATEWAY / Gateway has no healthcheck and no memory limit; node 18.20.8 inside image vs repo engines 24.x / docker inspect (Healthcheck null, MemoryLimit 0) + docker exec node --version + Pig package.json / agent-11 / - / - / OBSERVED / HIGH / engines-drift / pig-repo / lane-dup,coordinator
- ORACLE / GATEWAY / Two prior gateway containers died with exit 137 (SIGKILL), consistent with docker stop OR OOM-kill; OOM not excludable with no limits and no swap / docker ps -a / agent-11 / - / - / INFERRED / MEDIUM / none / - / coordinator
- ORACLE / POSTGRES / postgres:17-alpine healthy via pg_isready 10s; volume oracle_pgdata 69 MB; trust auth allows passwordless psql from container exec / healthcheck inspect + SELECT version() / agent-11 / - / - / OBSERVED / HIGH / none / - / phase0,lane-n
- ORACLE / QDRANT / qdrant v1.7.0 healthy; collection knowledge: 144 points, 768-dim cosine, status green / /collections/knowledge API / agent-11 / - / - / OBSERVED / HIGH / none / - / lane-f
- ORACLE / NETWORK / All service ports bound to 127.0.0.1 only; sshd on 0.0.0.0:22 / ss -tlnp / agent-11 / - / - / OBSERVED / HIGH / none / - / lane-l
- ORACLE / RESTART / Reboot 2026-09-20 00:05 auto-recovered qdrant in 59 s via enabled docker.service + unless-stopped; no human action / last reboot + container StartedAt / agent-11 / - / - / PROVEN / HIGH / none / - / lane-xexec,coordinator
- ORACLE / TOPOLOGY / Live containers were hand-started with docker run, not from the checked-in compose files (log driver and volume names mismatch) / inspect vs compose file contents / agent-11 / - / - / INFERRED / HIGH / config-drift / p18-artifacts / coordinator
- ORACLE / BACKUP / Backups are one-shot (09-16, 09-19), on-host only, no automation; no cron daemon exists; RESTORE-2026-09-16.md documents isolated restore with off-host-copy caveat / ls releases/ + RESTORE doc + systemctl is-enabled cron / agent-11 / - / - / OBSERVED / HIGH / backup-gap / - / lane-j,coordinator
- ORACLE / SECRETS / Secret intake is env-only via /opt/ping/.env (0600); values never read; POSTGRES_PASSWORD redacted at source / ls -l + cut -d= -f1 / agent-11 / - / - / OBSERVED / HIGH / none / - / lane-l
- ORACLE / OLLAMA / ollama/ollama:latest image present (6.99 GB), no container; local production inference REJECTED at 5.9 GB RAM / 0 swap (veto gate) / docker images + free -m / agent-11 / - / - / DECISION / HIGH / none / - / coordinator,lane-g
- ORACLE / CAPACITY / Full minimal stack + 4 workers fits (~2.2 GB of 5.9 GB); 8B local LLM does not fit; disk fine (28 GB free) / docker stats + free + df / agent-11 / - / - / COMPUTED / MEDIUM / none / - / coordinator
- ORACLE / PYTHON / Host python3 is 3.12.3; no host venv; adapters belong in containers, not on the host / python3 --version + which node / agent-11 / - / - / OBSERVED / HIGH / none / - / lane-conn
- ORACLE / COMPOSE / Proposed topology written as design artifact compose.proposed.yaml in lane dir; NOT applied remotely / lane file / agent-11 / - / - / ARTIFACT / HIGH / none / morning-decisions / coordinator

## 17. TOP 3 RISKS
1. Unbounded memory + zero swap + prior SIGKILL deaths: the gateway (no limit, no
   healthcheck) is the likely OOM victim under load; a wedged gateway still shows
   "Up". Mitigation is the proposed compose (limits + healthcheck); until applied,
   any load spike risks silent degradation.
2. Backups live on the same disk as production with no automation: a host or disk
   failure loses the DB and its backups together. The off-host copy design exists
   (section 5) but has never run.
3. Config drift: live topology is hand-run containers, not the checked-in compose
   files; exact current state (env values, run flags) is reconstructible only from
   the live host, not from artifacts. The closure test (section 13) passes for
   data, fails for exact config until the proposed compose is adopted.

## 18. TOP 3 OPEN DECISIONS FOR MORNING
1. Ollama: adopt local small-model inference, provision a second free ARM VM for
   inference, or use a remote inference API (cost + data-custody call is Nolan's)?
2. Gateway generation: is the live P18 candidate (node 18) or the build program's
   fyd-factory output (node 24) canonical on this host? The proposed compose waits
   on this before it can be applied.
3. Backup automation target and off-host destination (Pig? separate volume?) plus
   pruning the 4 GB of reclaimable images: operator actions needing Nolan's word.
