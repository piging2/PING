# LANE-O: Oracle Deployment Gates, Phase 1 (read-only)
**Date:** 2026-09-19 | **Lane:** O (Oracle deployment) | **Operator gate:** no install, no deploy, no host mutation until SSH proven and ARM64 gates cleared and confirmed by parent
**Candidate host:** 129.146.60.17, user ubuntu, hostname ping-core-01
**Repo state examined:** /home/nolan/worktrees/constitutional-convergence (Pig WSL), branch constitutional-convergence-v2, HEAD 84da2d40c (matches recon-e)
**Rule:** no em dashes in this file. Nothing was installed, deployed, or mutated on the host. All probes read-only.

---

## 1. SSH verdict: REACHABLE

Probe run from the Pig via pigwsl-run.sh (base64-encoded, short scripts):
`ssh -o BatchMode=yes -o ConnectTimeout=10 ubuntu@129.146.60.17 'uname -a && free -g && df -h / | tail -1'`

Result (live 2026-09-19):
- `Linux ping-core-01 6.17.0-1020-oracle #20-Ubuntu SMP Sat Jul 25 00:52:17 UTC 2026 aarch64 aarch64 aarch64 GNU/Linux`
- CPU: Neoverse-N1 (ARM64, OCI Ampere class)
- Mem: ~5 GB total (free -g rounds 5.8 GB down to 5)
- Disk: /dev/sda1 45G total, 19G used, 26G free (42%)
- sudo NOPASSWD: confirmed (`sudo -n true` OK)
- No /dev/nvidia* : GPU-less confirmed

**State change vs the task brief:** the brief said Docker and Git were absent. The live host HAS both:
- Docker 29.1.3 (Ubuntu 24.04 package build 29.1.3-0ubuntu3~24.04.2)
- Docker Compose 2.40.3 (plugin, 2.40.3+ds1-0ubuntu1~24.04.1)
- git 2.43.0

Someone installed them since the brief was written. This is reported as observed state, not as something I did. Bootstrap plan step 1 (install Docker) is now a verification step instead.

---

## 2. ARM64 gate table (verified, not trusted)

Every image below was checked individually against the Docker Hub v2 repository images API on 2026-09-19 (architecture fields read directly from the API response). arm64 present = READY for the architecture gate.

| Image | Tag in compose/plan | arm64 present | Other arches seen | Gate |
|---|---|---|---|---|
| postgres | 15-alpine | YES | 386, amd64, arm, ppc64le, riscv64, s390x | READY |
| node (gateway base) | 24-alpine | YES | amd64, s390x | READY |
| python (worker-runtime base) | 3-alpine | YES | 386, amd64, arm, ppc64le, riscv64, s390x | READY |
| python (mission-control base) | 3.11-slim | YES | 386, amd64, arm, ppc64le, riscv64, s390x | READY |
| alpine (repo-runtime base) | latest | YES | 386, amd64, arm, ppc64le, riscv64, s390x | READY |
| redis (planned addition) | 7-alpine | YES | 386, amd64, arm, ppc64le, riscv64, s390x | READY |
| qdrant/qdrant | latest | YES | amd64 | READY |
| hashicorp/vault | latest | YES | 386, amd64 | READY |
| ollama/ollama | latest | YES | amd64 | READY (CPU only; see nvidia item) |
| temporalio/auto-setup | latest | YES | amd64 | READY but unused by main compose (brain profile only) |

This supersedes recon-e's caveat: node:24-alpine, python:3-alpine, python:3.11-slim were individually API-checked this pass (recon-e had asserted them from library-image multi-arch status).

No amd64-only image in the Oracle path. The architecture gate is CLEAR for all ten images.

---

## 3. Gateway native-dependency blockers (resolved with primary evidence)

### 3.1 tree-sitter@0.21.1 : BLOCKED at Docker build time on ARM64 (verified)

Evidence chain (all primary, 2026-09-19):
1. gateway/package.json line 36: `"tree-sitter": "^0.21.1"` (plus tree-sitter-javascript, -python, -typescript).
2. Downloaded the actual npm tarball tree-sitter-0.21.1.tgz from registry.npmjs.org and listed its prebuilds directory. Contents:
   - prebuilds/darwin-arm64, darwin-x64, linux-x64, win32-x64
   - **No linux-arm64 prebuild.**
3. npm registry metadata for tree-sitter@0.21.1: `"install": "node-gyp-build"`. node-gyp-build semantics: no matching prebuild found -> falls back to `node-gyp rebuild` -> fails without a toolchain.
4. gateway/Dockerfile (node:24-alpine): `RUN apk add --no-cache git` only. No python3, no make, no g++ (no build-base).

Consequence: `npm install` inside the gateway Docker build on ARM64 fails at the tree-sitter install script. The gateway image cannot build as-is on this host. This is a build-time hard blocker, ARM64-only (linux-x64 prebuild exists).

Boot-path note: tree-sitter is required by treesitter_chunker.js, multi_language_parser.js, treesitter_parser_authority.js, etc., but NONE of these are in the gateway boot chain (server.js -> bootstrap/gateway_runtime.js; grep of all boot requires shows no tree-sitter). So the blocker is build-time, not boot-time.

Workarounds (ranked, Phase 2 choice needed):
- W1 (recommended): add a build toolchain to the gateway Dockerfile (`apk add --no-cache build-base python3`) so node-gyp compiles tree-sitter from source on arm64. Architecture-independent, matches recon-e's remediation, keeps the pinned 0.21.1 API.
- W2: upgrade tree-sitter 0.21.1 -> 0.25.1. Verified: the 0.25.1 tarball (npm dist-latest) DOES ship `prebuilds/linux-arm64/tree-sitter.node` (also win32-arm64). Caveat: 0.21 -> 0.25 is a binding rewrite (0.22 changed the node API); API compatibility of the gateway's tree-sitter call sites must be verified before adoption, and the grammar packages (tree-sitter-javascript/python/typescript) must be version-matched and their own arm64 prebuilds checked. Do not adopt blind.
- W3: remove tree-sitter from the Oracle gateway dependency set if no Oracle-phase code path needs it. Requires auditing the lazy-load paths first.

### 3.2 @temporalio/core-bridge@1.8.0 : BLOCKED at require time on Alpine/musl (verified, any arch)

Evidence chain (all primary, 2026-09-19):
1. gateway/package.json lines 26-28: `@temporalio/activity/client/worker ^1.8.0`.
2. npm registry metadata for @temporalio/core-bridge@1.8.0: `"install": "node ./scripts/build.js"`.
3. Fetched scripts/build.js and common.js from unpkg for @temporalio/core-bridge@1.8.0. Published `common.js`:
   - targets list: x86_64-apple-darwin, aarch64-apple-darwin, x86_64-unknown-linux-gnu, aarch64-unknown-linux-gnu, x86_64-pc-windows-msvc, x86_64-pc-windows-gnu. **No musl target at all.**
   - `platformMapping = { darwin: 'apple-darwin', linux: 'unknown-linux-gnu', win32: 'pc-windows-msvc' }`.
   - `getPrebuiltPath()` resolves `releases/<arch>-unknown-linux-gnu/index.node` and accepts it if the file exists.
4. On node:24-alpine (musl), os.platform() is 'linux', so build.js "finds" the glibc-linked `aarch64-unknown-linux-gnu/index.node` prebuild and npm install SUCCEEDS silently. At require time, Node dlopens a glibc-linked .node on musl -> fails (no gcompat in the gateway Dockerfile). This affects Alpine on ANY arch, not just ARM64.

Boot-path note: only gateway/temporal_runtime.js requires @temporalio/* (lines 14-15), and it is reached only via bootstrap/wiring.js, which is loaded LAZILY (constitution.js and runtime_hash.js use deferred getters; bootstrap/index.js is not in the gateway_runtime require chain; server.js has no temporal/wiring references). Gateway boot does not touch temporal. A constitution-endpoint call that triggers the lazy wiring load would crash the process on Alpine.

Workarounds (ranked):
- W1 (recommended for Oracle): REMOVE @temporalio/* from the Oracle gateway package set. Justification: no temporal service exists in the main compose.yaml (temporal appears only in compose.brain.yaml); the Oracle minimum stack has no temporal workflow; Temporal is explicitly Phase-later ("Temporal only when a real workflow is ready"). This eliminates the musl problem at the root.
- W2: add gcompat to the gateway Dockerfile. Weaker: keeps an untested glibc binary path on the critical host.
- W3: switch the gateway base from node:24-alpine to node:24-slim (glibc). Heavier image, larger change surface.

### 3.3 Python native bindings: READY

- mission-control Dockerfile: python:3.11-slim with `apt-get install gcc postgresql-client curl`. Standard manylinux aarch64 wheels exist for its requirements (psycopg2-binary, pydantic-core); gcc present as fallback. READY.
- worker-runtime Dockerfile (infrastructure/oracle/Dockerfile.worker-runtime): python:3-alpine, copies workers/ and kernel/, runs worker_runtime.py with stdlib imports only (os, sys, time, json, logging, urllib) plus kernel/event_dispatcher. No pip install, no native deps. READY.

---

## 4. Packaging gaps (architecture-independent, verified in worktree)

### 4.1 Three missing Dockerfiles: BLOCKED for dev profile, WORKAROUND available

Verified by find across the worktree: Dockerfile.witness, Dockerfile.replay, Dockerfile.projection do NOT exist. compose.yaml references them at lines 255 (projection-worker), 280 (witness-worker), 302 (replay-worker).

Scope note: all three services carry `profiles: [dev]`. A default `docker compose up` (no profile) never builds them. The prod-path worker (worker-runtime, profiles: dev+prod) uses Dockerfile.worker-runtime, which EXISTS.

But the Oracle certification ladder needs witness/replay/projection semantics (WITNESS_CREATED, REPLAY_COMPLETED tails, restart proof). The Python sources exist (workers/witness_worker.py, workers/replay_worker.py, workers/projection_worker.py).

Workaround: author three small Dockerfiles on the Dockerfile.worker-runtime pattern (python:3-alpine, copy workers/ + kernel/, CMD the respective worker). Phase 2 authoring task, low risk.

### 4.2 No redis service: WORKAROUND (add redis:7-alpine)

Verified: `grep -c redis compose.yaml` = 0. No redis service, no REDIS_URL. gateway/package.json depends on bullmq ^5.0.0 and ioredis ^5.4.0. bullmq modules (background_workers, queue_port, bullmq_adapter, persistent_queue_authority) are referenced ONLY from bootstrap/wiring.js, which is lazily loaded (see 3.2). So redis is not needed at boot, but any exercised queue path fails without it.

Plan: add a `redis: redis:7-alpine` service (arm64 verified, ~40 MB) to the Oracle compose. Cheap, removes the gap.

### 4.3 Ollama nvidia reservation: BLOCKED as written, WORKAROUND trivial

Verified: compose.yaml lines 94-97 under the ollama service reserve one nvidia GPU device. Host has no /dev/nvidia* and no nvidia container runtime; the reservation would fail container creation.

Workaround: drop the `deploy.resources.reservations.devices` block in the Oracle compose. ollama/ollama arm64 image is CPU-capable. Note: the ollama image is ~2.7 GB and the gateway defaults expect qwen2.5-coder:14b; on this 5.8 GB host, ollama + a 14b model pull is deferred to proven need (minimum stack excludes ollama; see section 6).

---

## 5. Deployment provenance manifest template

To be filled at each deployment; stored alongside the deployment, never containing secrets.

```yaml
provenance_manifest_version: 1
deployment_id: ""            # unique per deployment, e.g. oracle-20260919-001
source:
  repo: ""                  # canonical repo URL or path
  branch: ""                # e.g. constitutional-convergence-v2 (oracle/deploy-2026-09-18 stays untouched without operator word)
  source_sha: ""            # full commit SHA the host was built from
  dirty_tree: false         # true if any uncommitted changes were deployed
build:
  build_id: ""              # CI or manual build identifier
  built_at: ""              # ISO8601 UTC
  images:                   # one entry per service image
    - service: ""
      image: ""             # e.g. ping-gateway
      tag: ""
      digest: ""            # sha256:..., from docker inspect, the real identity
      arch: "linux/arm64"
config:
  config_version: ""        # version of the Oracle compose/env set used
  compose_file_sha256: ""
  env_template_sha256: ""   # sha of the env template; values never recorded
  schema_version: ""        # schema.sql / migration set version applied
  schema_sha256: ""
  event_era: ""             # event envelope / contract version in force
  witness_era: ""           # witness contract version in force (12/13-leaf resolution recorded here)
host:
  hostname: "ping-core-01"
  address: "129.146.60.17"
  os: ""                    # uname -a
  arch: "aarch64"
deployment_time: ""         # ISO8601 UTC when services reached target state
tests:
  certification_manifest: ""  # path/ID of the test/certification manifest this deployment claims
  stages_passed: []           # ladder stages evidenced, e.g. [ARCHITECTURE_READY, DEPLOYMENT_READY]
notes: ""
# NO secrets in this file. No passwords, tokens, keys, or connection strings. Ever.
```

---

## 6. Minimum-stack plan (5.8 GB RAM is not permission to run the architecture diagram)

Phase order for Oracle. Each phase starts only when the previous phase's evidence exists.

**Phase M0 (minimum stack): Postgres + gateway + worker-runtime**
- postgres:15-alpine, named volume ping_postgres, schema.sql pinned to the sprint-verified version, pg_isready health gate.
- gateway on node:24-alpine AFTER tree-sitter remediation (W1: build toolchain) AND temporal dep removal (W1). Port 8080.
- worker-runtime on python:3-alpine (Dockerfile.worker-runtime exists; stdlib only). Depends on gateway started.
- redis:7-alpine added (tiny; unblocks bullmq paths when lazily loaded).
- Network ping_internal. No public ports except where the operator explicitly approves.

**Phase M1 (when the witness/replay contract sprint lands): witness + replay + projection workers**
- Author the three missing Dockerfiles (worker-runtime pattern). Start against postgres.
- These carry the WITNESS_CREATED / REPLAY_COMPLETED evidence the ladder needs.

**Phase M2 (on proven need only): mission-control, qdrant, vault, ollama**
- mission-control (python:3.11-slim) when its surfaces are wired to real endpoints.
- qdrant when the knowledge-graph path has a real consumer.
- vault when secret management moves off env files (note: compose currently implies vault dev mode; dev mode is not production posture, flag for later).
- ollama CPU-only (nvidia block removed) when an AI route is actually exercised; model pull sized to RAM (the 14b default is not assumed).

**Explicitly deferred:** Temporal (only when a real workflow is ready; temporalio/auto-setup is brain-profile only), Neo4j, ClickHouse, NATS (none are in the Oracle bootstrap path), ui-next (last, dev/prod profile decision later).

Memory budget sanity: postgres (~200 MB) + gateway (~300-500 MB with node) + worker-runtime (~60 MB) + redis (~30 MB) fits comfortably in 5.8 GB with headroom for the witness/replay workers. The full compose.yaml service set does NOT fit this discipline and is not the plan.

---

## 7. Security posture items (verify later, Phase 2 pre-deploy checklist)

Read-only observations now; verification items for the deployment runbook:
- SSH: key-only auth expected; verify PasswordAuthentication is off and enumerate authorized_keys for the ubuntu user (read-only check before any change).
- Firewall: verify ufw/iptables default-deny posture on the host; confirm no broad public ingress.
- Postgres binding: bind to the docker internal network only; no host port publish unless the operator approves a specific consumer.
- Open ports: audit listening sockets after deploy (ss -tlnp); every open port must map to a named consumer.
- Docker socket: never mount /var/run/docker.sock into application containers.
- Service users: run application containers as non-root where the image supports it; record UID/GID in the runbook.
- File permissions: .env files and any secret material root:ubuntu 0600 or tighter; verify before first start.
- No broad public ports for convenience. Any exception needs the operator's explicit word and a named consumer.

---

## 8. Certification ladder (restated for the lane)

When authorized: ARCHITECTURE_READY -> DEPLOYMENT_READY -> DEPLOYED -> RUNTIME_PROVEN -> RESTART_PROVEN -> REPLAY_PROVEN -> PERSISTENCE_PROVEN -> BACKUP_PROVEN -> RESTORE_PROVEN -> FAILURE_RECOVERY_PROVEN -> OBSERVABLE -> OPERABLE -> CONTINUITY_PROVEN -> BUSINESS_PATH_PROVEN. Each stage with stronger evidence than the last; no fake HEALTHY. A stage is claimed only with the evidence named in its gate.

Exception in force: the public branch oracle/deploy-2026-09-18 stays untouched without the operator's explicit word.

---

## 9. What LANE-O needs confirmed before Phase 2

1. **SSH gate:** CLEARED (reachable, key auth, sudo NOPASSWD, aarch64, no GPU). No confirmation needed beyond your acknowledgment.
2. **ARM64 image gate:** CLEARED for all 10 images (individually API-verified).
3. **tree-sitter remediation choice:** W1 (add build-base+python3 to gateway Dockerfile) recommended. Confirm W1, or pick W2 (upgrade to 0.25.1 after API compat check) or W3 (drop the dep).
4. **temporal remediation choice:** W1 (remove @temporalio/* from the Oracle gateway package set) recommended. Confirm.
5. **Minimum-stack scope:** M0 = postgres + gateway + worker-runtime + redis (7-alpine). Confirm, or adjust.
6. **Missing Dockerfiles:** author 3 small Dockerfiles in Phase 2 (worker-runtime pattern) for the M1 workers. Confirm this authoring is in scope for the lane.
7. **Ollama:** deferred to proven need (M2); nvidia reservation dropped in the Oracle compose. Confirm.
8. **Host state change:** Docker 29.1.3 + Compose 2.40.3 + git 2.43.0 are already installed (brief said absent). Confirm whether this was expected (another lane/operator action) or needs investigation before I rely on it.
9. **Source pin:** which SHA/branch the Oracle host must be built from (recommendation: the sprint-verified SHA on constitutional-convergence-v2; oracle/deploy-2026-09-18 untouched per the standing exception).
10. **Secrets path:** how Postgres credentials and any API keys reach the host (env file via which channel). The provenance manifest records hashes of templates only, never values.

Phase 1 complete. LANE-O is holding at the gate: no installation, no deployment, no host mutation until you confirm.
