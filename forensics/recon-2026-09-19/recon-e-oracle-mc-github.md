# Recon E - Oracle ARM64 static compatibility, Mission Control downstream, public GitHub archaeology
**Date:** 2026-09-18 | **Mode:** read-only recon, no execution, no changes
**Local worktree:** LOCAL_WORKTREE /home/nolan/worktrees/constitutional-convergence, branch constitutional-convergence-v2, HEAD 84da2d40c
**Claim-domain legend:** PUBLIC_GITHUB = ngesk2/crx-runtime on GitHub; LOCAL_BRANCH = constitutional-convergence-v2; LOCAL_WORKTREE = uncommitted worktree state; LIVE_RUNTIME = running containers/processes. Every claim below is tagged.

---

## PART 1 - Oracle static compatibility (ARM64)

### 1.1 Image inventory (LOCAL_WORKTREE compose.yaml + infrastructure/oracle/)

| Component | Image / base (LOCAL_WORKTREE) | linux/arm64 variant verified? | Verdict |
|---|---|---|---|
| postgres | postgres:15-alpine | YES, verified via Docker Hub v2 images API (amd64, arm/v6, arm/v7, **arm64** present) | ARM64 READY |
| qdrant | qdrant/qdrant:latest | YES, verified: **arm64** image present alongside amd64 | ARM64 READY |
| vault | hashicorp/vault:latest | YES, verified: **arm64** image present (product 2.1.1, aarch64 minirootfs) | ARM64 READY |
| ollama | ollama/ollama:latest | YES, verified: **arm64** image present alongside amd64 | ARM64 READY (CPU only) |
| temporal | temporalio/auto-setup:latest (compose.brain.yaml ONLY, not main compose) | YES, verified: **arm64** image present (ARG TARGETARCH=arm64) | ARM64 READY but unused by main compose |
| gateway | node:24-alpine | Official library image, multi-arch arm64 (same build pipeline as verified postgres; not individually API-checked) | BASE OK, DEPS BLOCKED (see 1.2) |
| worker-runtime | python:3-alpine | Official library image, multi-arch arm64 | ARM64 READY |
| mission-control | python:3.11-slim | Official library image, multi-arch arm64 | ARM64 READY |
| ui-next | node (CascadeProjects/infra/ui-next/Dockerfile) | base image standard; not in Oracle bootstrap path | N/A for Oracle |

ARM64 image sources verified 2026-09-18 from Docker Hub v2 repository images endpoints (architecture fields read directly, not assumed). No amd64-only images in the Oracle path. Temporal is the only image that looked risky; it ships arm64.

### 1.2 Native dependency risks (LOCAL_WORKTREE)

**tree-sitter@0.21.1 in gateway (HARD BLOCKER on ARM64).** Public evidence (abhigyanpatwari/GitNexus commit bd90d5bf, verified 2026-06-09): tree-sitter@0.21.1's npm tarball "ships no linux-arm64 prebuild, so require('tree-sitter') threw 'No native build was found ... arch=arm64'"; resolution there was source-building with node-gyp. gateway/Dockerfile (node:24-alpine) installs only git, no build toolchain (no build-base, python3, make, g++). Consequence: on ARM64 the gateway image build either fails at npm install or fails at require time. On x86_64 the linux-x64 prebuild exists, so this is an ARM64-only break. Remediation belongs to a later execution sprint: add apk build tools to the Dockerfile (architecture-independent) or drop tree-sitter from the gateway dependency set.

**@temporalio/core-bridge@1.8.0 (LIKELY BLOCKER on Alpine ARM64).** npm registry metadata for 1.8.0 shows an `install` script (`node ./scripts/build.js`) that downloads a Rust core prebuild or falls back to cargo build. The musl prebuild targets (x86_64-unknown-linux-musl, aarch64-unknown-linux-musl) were added in a patch proposed AFTER 1.8.0 (temporalio/sdk-typescript issues #1856 / PR #1852); pre-1.8.0 target list was glibc-only. Gateway runs on node:24-alpine (musl), so on ARM64 the prebuild download path likely 404s and the source build fails (no Rust toolchain in the image). Mitigation option for Oracle: temporal deps appear unused by the Oracle bootstrap path (no temporal service in main compose.yaml; temporal appears only in compose.brain.yaml). A minimal Oracle gateway may not need @temporalio/worker at require time; verify at build time, do not assume.

**Python native bindings: OK.** mission-control requirements (fastapi, uvicorn, psycopg2-binary, qdrant-client, pydantic, hvac, google clients): psycopg2-binary publishes manylinux aarch64 wheels; pydantic-core publishes aarch64 wheels; the rest are pure Python. No node-gyp equivalent concern. LOCAL_WORKTREE determination; standard public wheel availability.

### 1.3 Packaging gaps independent of ARM64 (LOCAL_WORKTREE)

These would block an Oracle bootstrap on ANY architecture:

1. **Missing Dockerfiles referenced by compose.yaml.** compose.yaml builds witness-worker from `Dockerfile.witness`, replay-worker from `Dockerfile.replay`, projection-worker from `Dockerfile.projection`. None of these files exist in the worktree (verified by find across the tree). `docker compose build` for those three services fails. infrastructure/oracle/ contains only Dockerfile.gateway and Dockerfile.worker-runtime. The Oracle bootstrap must either author the three missing Dockerfiles or replace those services with the oracle worker-runtime image. This is a planning item, not an execution item.
2. **No redis service.** gateway/package.json depends on bullmq + ioredis, but compose.yaml defines no redis service. The gateway will fail at first queue touch unless REDIS_URL is injected externally. Not an ARM64 issue; a compose completeness issue.
3. **Ollama nvidia reservation.** compose.yaml reserves one nvidia GPU device for ollama. The Oracle ARM64 host has no NVIDIA GPU (no nvidia runtime, no driver). Docker compose will fail or the container will fail to start with the reservation in place. The ollama arm64 image itself is CPU-capable (libopenblas present, image verified). Remediation: drop the `deploy.resources.reservations.devices` block for the Oracle profile. Also note the ollama image is ~2.7 GB and the gateway defaults expect qwen2.5-coder:14b (large model pull on ARM64; CPU inference only).
4. **Oracle host state today.** Docker and Git are not installed on 129.146.60.17 (per task context); sudo NOPASSWD ubuntu user. Nothing was touched; this is from the task brief, not a fresh probe.

### 1.4 Witness/event sprint changes vs Oracle packaging and restart proof

The planned sprint changes (witness contract freeze, witness_id/hash/verification/fallback decisions, 12/13-leaf drift resolution, replay completeness, binding replay root into attestations) are pure in-repo logic and event-payload changes. Assessment:

- **Packaging impact: NONE.** No new images, no new native dependencies, no new services, no OS-level changes are implied by any of these changes. The tree-sitter/temporal blockers in 1.2 are pre-existing and orthogonal.
- **Restart-proof impact: SHAPE UNCHANGED, PAYLOAD-SENSITIVE.** The restart proof (boot order, Postgres WAL durability, deterministic replay from events, witness re-derivation) does not change in shape. What the sprint must preserve: the event payload contract consumed by replay (REPLAY_COMPLETED.payload.replay fields: verified, reason, fingerprint, witness_root) and the WITNESS_CREATED/WITNESS_REJECTED emission contract, since /mission-control/replay/stats and /witness/stats (see Part 2) read them live. The 12/13-leaf drift is a semantics question about what witness_root commits to; it does not alter how the Oracle host restarts services.
- **Schema sensitivity:** witness changes ride on the mounted schema.sql via docker-entrypoint-initdb.d/01-schema.sql. If the sprint adds witness columns, the bootstrap plan must pin the schema file version to the sprint output.

### 1.5 Bootstrap plan (PLAN ONLY, no execution)

1. Install Docker Engine + compose plugin on the host (absent today).
2. Clone the pinned worktree state (branch constitutional-convergence-v2 at the sprint-verified SHA) to the host.
3. Create named volumes first: ping_postgres, ping_qdrant, ping_ollama, ping_vault; create network ping_internal.
4. Start postgres alone; confirm health (pg_isready) and that 01-schema.sql applied (schema version matches sprint output).
5. Start qdrant (healthcheck /health) and vault (dev mode per compose; note: dev mode is not production posture, flag for later).
6. Start ollama CPU-only with the nvidia reservation removed; pull only the models the gateway actually routes (decide per EMBEDDING_MODEL/CHAT_MODEL; the 14b coder model is heavy on CPU).
7. Build gateway AFTER remediating Dockerfile (tree-sitter build tools or dep removal; temporal musl/arm64 resolution). Start gateway; confirm 8080.
8. Build and start mission-control (depends postgres healthy, qdrant healthy, ollama healthy); confirm 8000.
9. Resolve the three missing Dockerfiles (witness/replay/projection) or substitute infrastructure/oracle/Dockerfile.worker-runtime; start workers in dependency order (postgres first; gateway for worker-runtime).
10. Start ui-next last (dev/prod profile) pointing at gateway.
11. Redis decision: add a redis service to the Oracle compose or inject REDIS_URL; do not start bullmq-dependent paths without it.
12. Restart proof runbook (later execution sprint): stop all, restart in the same order, verify REPLAY_COMPLETED/WITNESS_CREATED tails are re-readable and counts match pre-restart; that is the L0-L3 durability argument.

---

## PART 2 - Mission Control downstream (UI surfaces vs backend contracts)

All claims LOCAL_WORKTREE unless noted.

### 2.1 Surface inventory: what the UI calls and what backs it

| UI surface | Endpoint called | Backend exists? | Classification |
|---|---|---|---|
| TimeMachine timeline (replay history) | GET /api/v1/timeline | NO route anywhere in gateway (grep over gateway/ empty) | PHANTOM |
| KnowledgeGalaxy graph + "Replay Verified" color mode | GET /api/v1/knowledge-graph | NO route; knowledge routes mount at /knowledge with /stats, /nodes, /nodes/:nodeId/neighborhood only | PHANTOM |
| MCPOrchestration replay panel | GET /api/v1/mcp/replay | NO route mounted | PHANTOM |
| CockpitDashboard system state | GET /system/state | REAL (routes/system.js -> ping-runtime/runtime/system_authority.js) | REAL but MISLEADING (see 2.2) |
| (none) | GET /mission-control/replay/stats | REAL (routes/mission_control.js:520, live REPLAY_COMPLETED + WITNESS_REJECTED query, PG-gated, provider section hidden when absent) | REAL, UNWIRED (no UI calls it) |
| (none) | GET /mission-control/witness/stats | REAL (routes/mission_control.js:568, WITNESS_CREATED vs WITNESS_REJECTED counts, PG-gated) | REAL, UNWIRED |
| (none) | GET /mission-control/replay/trace/:correlationId | REAL (routes/mission_control.js:591, replays + linked witnesses per correlation chain) | REAL, UNWIRED |

### 2.2 Why /system/state is misleading

ping-runtime/runtime/system_authority.js: collectReplay() counts ALL events (getAllEvents) as `total_runs` and labels the block "replay"; it is an event-count projection, not a replay-run projection. collectKnowledge() hardcodes `witnesses: 0, replay_certificates: 0` with status 'unavailable'. The UI therefore can display an event count as "replay runs" and zeros as witness/replay-certificate counts. Under the law UI CLAIM <= BACKEND PROOF, /system/state's replay block must not be presented as replay evidence.

### 2.3 Target truthful projection (design only, no implementation)

CAN be shown after the witness convergence sprint, because real backend contracts exist:

1. **Replay stats card:** total/verified/unverified REPLAY_COMPLETED counts, by-reason breakdown, WITNESS_REJECTED count, all from /mission-control/replay/stats. Honest, event-derived, PG-gated, with the provider section auto-hidden when the provider is absent.
2. **Witness stats card:** attestations (WITNESS_CREATED) vs refusals (WITNESS_REJECTED) from /mission-control/witness/stats. The refusal semantics are meaningful: refusals include unverified_replay and missing_witness_root, which is exactly the failure-honesty story (commits 91e1337f4, 84da2d40c on LOCAL_BRANCH).
3. **Correlation trace view:** per-correlation replay + linked witness tail from /replay/trace/:correlationId, including upstreamEventId, causation_id, payload.replay.verified/reason/fingerprint/witness_root. This is the evidence-provenance surface: every witness links to the replay event that produced it.

MUST REMAIN HIDDEN until contracts exist:

1. **TimeMachine timeline** (phantom endpoint; nothing to repoint at without a timeline aggregation contract).
2. **KnowledgeGalaxy "Replay Verified" color mode** (no backend supplies node.replay_verified; /knowledge/nodes does not carry it).
3. **MCPOrchestration replay panel** (phantom /api/v1/mcp/replay).
4. **Any headline "witness root" display as settled fact:** the 12/13-leaf source/compiled drift is unresolved, and LOCAL_WORKTREE currently has TWO live witness shapes (canonical_workers.js WitnessWorker attesting replay-provided witness_root; legacy witness_worker.py sha256(aggregate_id:fingerprint), not Merkle). Until the sprint freezes the witness contract, individual witness_root hashes may be shown only inside the trace view (labeled as raw event data), never as a verified headline. UI CLAIM <= BACKEND PROOF.
5. **/system/state replay block as replay evidence:** repoint the dashboard replay tile at /mission-control/replay/stats instead, or relabel honestly as "event store volume."

Ordering note: wiring the three real mission-control routes into UI cards is post-sprint work; the sprint first freezes the witness contract so the numbers shown are stable, not shape-shifting.

---

## PART 3 - Public GitHub archaeology (ngesk2/crx-runtime)

Public clone at /tmp/crx-public, origin/main 6c4b531, last commit 2026-06-08. All claims below PUBLIC_GITHUB unless tagged otherwise. Single branch (main), no visible feature branches, 9 commits total.

### 3.1 Constitutional history relevant to witness/replay

- **2026-06-08 6c4b531 (PUBLIC_GITHUB HEAD):** "Freeze constitutional object model with 7 definitions (Identity, Object, Placement, Host, Owner, Revocation, Witness)" in certification/CONSTITUTIONAL_OBJECT_MODEL.md. Witness definition: "The cryptographic commitment to the canonical state of an object, placement, or event." Type: Witness { witness_root: WitnessRoot (branded string), leaf_count, tree_height, witness_algorithm, created_at }. Constitutional rules: Merkle tree root, deterministic, canonical, cryptographically scoped, irreversible; "Witness mismatches produce typed replay failure (never silent recovery)." Witness commits: canonical payload, invariant version, replay config version, schema version, actor signature, permission state.
- **2026-06-07 63a0784:** "Complete constitutional replay kernel hardening: Phase 1-12 certification freeze" (certification reports, hashes, postgres index freeze).
- **2026-06-07 b4c5d6e:** FCA-10.5/11/12 certification; **9bd2cb3:** merge constitutional-recovery; **42ce1e1:** recovery snapshot; **2026-05-10 adcb062:** kernel initial commit-service with canonical hashing and DAG validation.

### 3.2 The false-Merkle finding (still matters)

reports/merkle_witness_integrity.md (PUBLIC_GITHUB, audit 2026-06-07) documents, as FACT: witness root computation did NOT use Merkle construction; it used JSON.stringify concatenation while claiming the Merkle algorithm; roots could diverge on field reordering, whitespace, undefined-vs-null, sparse arrays, chunking, duplicate insertion. Verdict: FALSE_REPLAY_KERNEL. This is the earliest documented instance of the exact class of gap the current sprint is re-litigating (12/13-leaf drift, witness_root binding). It still matters as the definition benchmark and as proof this failure class predates the current worktree: any new witness implementation must answer the same falsification (canonical bytes, ordering, nullability) or it repeats June's failure. It does NOT constrain the current live path's shape; it constrains the falsification bar.

### 3.3 Public witness roots freeze (superseded)

certification/hashes/witness_roots.txt (PUBLIC_GITHUB) freezes five replay witness roots (minimal_replay, multi_event_replay, lineage_replay, violation_replay, unicode_replay) under certification CRX-CK-2026-06-07-v1. These are immutable freezes of the OLD kernel semantics. LOCAL_WORKTREE live path differs (WitnessWorker in canonical_workers.js attests the replay-supplied witness_root; legacy witness_worker.py uses sha256(aggregate_id:fingerprint)). The public hashes must not be cited as live or as expectations for the sprint; they are superseded by live evidence. Retained value: regression corpus names, not values.

### 3.4 Authority changes

AUTHORITY_CONFLICT_REPORT.md (PUBLIC_GITHUB, 2026-06-06) establishes the authority hierarchy: AGENT.md (canonical) > knowledge/authoritative/UCIA-CONSTITUTION-v1.0.md (kernel primitives, survivability, replay semantics) > vos/cos/CONSTITUTION.md (process, 8-stage gate) > agents/agent_permissions.md > domain specs. No authority transfer events after June are visible publicly; LOCAL_BRANCH authority work (witness authority reduction docs, authority registry) is not on PUBLIC_GITHUB.

### 3.5 Divergence note

LOCAL_BRANCH commits 91e1337f4 and 84da2d40c (2026-09-18) are absent from PUBLIC_GITHUB (public HEAD is 2026-06-08, ~100 days stale). Per the task instruction: this absence does NOT falsify local evidence. The public repo is a historical snapshot; LOCAL_WORKTREE is the system under test.

---

## Caveats

- Other agents' reports were not used as evidence; every claim above rests on direct reads of LOCAL_WORKTREE files, the PUBLIC_GITHUB clone, or the Docker Hub v2 API (verified 2026-09-18). No runtime containers were inspected (LIVE_RUNTIME untouched; read-only law).
- node:18-alpine / node:24-alpine / python:3-alpine / python:3.11-slim arm64 availability was asserted from official library-image multi-arch status, not individually API-checked like postgres/qdrant/vault/ollama/temporal.
- No em dashes used in this report.
