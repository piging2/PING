# PING Runtime Distribution v1 — Manifest (working)

Gate chain: Authority -> Reachability -> Persistence -> Dependency Closure -> Allowlist -> Exclusion -> ARM64 image -> Oracle.

Per-row: PATH | WHY REQUIRED | IMPORTER | AUTHORITY | RUNTIME REACHABLE | ARM64 CONCERN | INCLUDE/EXCLUDE

ARM64 flags: PURE JS | PURE PYTHON | NATIVE NODE MODULE | NATIVE PYTHON MODULE | BINARY | CONTAINER IMAGE | EXTERNAL SERVICE

Exclusion classes: INCLUDE_RUNTIME_V1 | PRESERVE_NOT_DISTRIBUTE | DEVELOPMENT_ONLY | LEGACY_COMPATIBILITY | TEST_ONLY | UNKNOWN_NONBLOCKING

## Rows (populated from convergence forensics; evidence paths are worktree-relative /home/nolan/ping)

| PATH | WHY REQUIRED | IMPORTER | AUTHORITY | RUNTIME REACHABLE | ARM64 CONCERN | CLASS |
|---|---|---|---|---|---|---|
| gateway/server.js | gateway process entrypoint (Docker CMD) | docker | process | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| gateway/bootstrap/gateway_runtime.js | wires all services, mounts routes | server.js | process | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| gateway/bootstrap/wiring.js, container.js, lifecycle.js, main.js, index.js | bootstrap composition | gateway_runtime.js | process | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| ping-runtime/events/unified_event_runtime.js | canonical event acceptance, identity, persistence (ping_events) | gateway_runtime.js:432 | Event | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| ping-runtime/events/event_read_authority.js | event reads for routes | gateway_runtime.js:381 | Event | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| ping-runtime/events/event_bridge.js | legacy ingress adapter (repository_events + canonical_events -> ping_events) | gateway_runtime.js:460 | Event | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| ping-runtime/events/event_validator.js | event type validation at emit | unified_event_runtime.js | Event | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| ping-runtime/events/event_governance.js | governance/namespace check at emit | unified_event_runtime.js | Event | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| ping-runtime/events/repository_store.js | RepositoryStore service | gateway_runtime.js | Event | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| ping-runtime/authorities/constitutional_time_authority.js | canonical timestamps | unified_event_runtime.js, routes | Event | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| ping-runtime/orchestration/event_to_mission_bridge.js | event -> mission trigger | gateway_runtime.js | Mission | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| ping-runtime/orchestration/mission_runtime.js | mission persistence/lifecycle (ping_missions) | gateway_runtime.js:475 | Mission | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| ping-runtime/orchestration/mission_scheduler.js | mission dispatch to workers | gateway_runtime.js:552 | Mission/Worker | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| ping-runtime/workers/worker_runtime.js | worker execution engine | mission_scheduler.js | Worker | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| ping-runtime/workers/canonical_workers.js | canonical worker implementations | worker_runtime.js | Worker | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| ping-runtime/workers/intelligence_worker.js | intelligence worker | worker_runtime.js | Worker | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| ping-runtime/boundaries/priority_boundary.js | priority normalization at mission ingress | event_to_mission_bridge.js | Mission | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| gateway/kernel_replay_execution_provider.js | deterministic kernel replay engine provider | gateway_runtime.js:512 | Replay | YES | PURE JS (check native deps if any) | INCLUDE_RUNTIME_V1 |
| ping-runtime/evidence/evidence_authority.js | retrieval verification, traces Qdrant hits to ping_events | gateway_runtime.js (Phase E) | Evidence | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| gateway/replay/kernel/deterministic_replay_engine.js | deterministic replay engine (state machine + fingerprint + invariants + witness) | kernel_replay_execution_provider.js | Replay | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| database/canonical_events.sql | canonical_events schema, read by CanonicalEventEnvelope.initialize() | canonical_event_envelope.js:46 | Event (legacy ingress) | YES | SQL | INCLUDE_RUNTIME_V1 |
| ping-runtime/runtime/capability_resolver.js | capability registry authority (loads capability_registry.json, throws if missing) | gateway_runtime.js:179 | Capability | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| gateway/generated/capability_registry.json | required capability registry (runtime config) | capability_resolver.js | Capability | YES | JSON config | INCLUDE_RUNTIME_V1 |
| gateway/generated/event_registry.json | required event type registry (EventValidator) | event_validator.js | Event | YES | JSON config | INCLUDE_RUNTIME_V1 |
| gateway/generated/workflow_registry.json | required workflow registry (WorkflowExecutor) | workflow_executor.js | Worker | YES | JSON config | INCLUDE_RUNTIME_V1 |
| gateway/generated/deployment_manifest.json | required deployment manifest (DeploymentLoader) | deployment_loader.js | Capability | YES | JSON config | INCLUDE_RUNTIME_V1 |
| gateway/generated/state_machine_registry.json | required state machine registry | state_machine_executor.js | Worker | YES | JSON config | INCLUDE_RUNTIME_V1 |
| gateway/generated/*_generator.js | registry generators (build-time) | n/a | n/a | NO | PURE JS | DEVELOPMENT_ONLY |
| ping-runtime/evidence/constitutional_verification_authority.js | second read-side verifier (relationship to EvidenceAuthority untraced) | gateway_runtime.js | Evidence | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| ping-runtime/agents/replay_worker.js | thin replay adapter (unwired, nothing requires it) | none | Replay | NO | PURE JS | PRESERVE_NOT_DISTRIBUTE |
| workers/*.py, runtime/workers/*.py, brainos/orchestration/src/*.py | legacy Python event/replay/witness workers reading legacy `events` table | none live | Event/Replay/Witness (legacy) | NO | PURE PYTHON | PRESERVE_NOT_DISTRIBUTE |
| runtime/adapters/google_drive/google_drive_ingestion_adapter.py | legacy Drive ingestion writing `events` | none live | Event (legacy) | NO | PURE PYTHON | PRESERVE_NOT_DISTRIBUTE |
| database/events.sql | legacy `events` table schema | none live | Event (legacy) | NO | SQL | PRESERVE_NOT_DISTRIBUTE |
| gateway/test_*.js, evals/, test/, tests/ | tests and eval harnesses | none (not imported by runtime) | n/a | NO | n/a | TEST_ONLY |
| worktrees/ | development worktrees | n/a | n/a | NO | n/a | DEVELOPMENT_ONLY |
| archive/, audit/, audit_reports/, reports/, docs/ (analysis MD) | audit archaeology | n/a | n/a | NO | n/a | PRESERVE_NOT_DISTRIBUTE |
| .graph/ (if present), evidence/ | graphs and generated evidence | n/a | n/a | NO | n/a | PRESERVE_NOT_DISTRIBUTE |

## Known build gap (recorded FL-20260919-CONV-001)

- compose.yaml:302 replay-worker -> Dockerfile.replay does not exist in the worktree (context: repo root). Service unbuildable. Migration agent must author it, repoint to Dockerfile.worker-runtime, or drop the service (legacy Python replay path is out of the distribution slice per forensics).
| gateway/routes/events.js | HTTP /events API (canonical spine emit) | gateway_runtime.js:681 | Event | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| gateway/routes/canonical_events.js | HTTP /canonical-events API (legacy ingress) | gateway_runtime.js:685 | Event | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| gateway/canonical_event_envelope.js | writes canonical_events (bridged into ping_events) | gateway_runtime.js:399 | Event (legacy ingress) | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| runtime/kernel/event_repository.js | derived audit/projection adapter (repository_events) | gateway_adapter.js:27 | Event (legacy) | YES (bridged) | PURE JS | INCLUDE_RUNTIME_V1 |
| gateway/event_repository.js | shim delegating to kernel | constitutional_runtime.js | Event (legacy) | shim | PURE JS | INCLUDE_RUNTIME_V1 |
| runtime/kernel/gateway_adapter.js | kernel adapter instantiated by gateway | gateway_runtime.js:386 | Event (legacy) | YES | PURE JS | INCLUDE_RUNTIME_V1 |
| runtime/kernel/events/event-authority-interface.ts | IEventAuthority (dormant interface) | none | Event | NO | PURE TS (types only) | PRESERVE_NOT_DISTRIBUTE |
| runtime/adapters/postgres_event_store.ts | PostgresEventStore (dormant, zero instantiation) | none (RepositoryAuthority imports, never constructed) | Event | NO | PURE TS | PRESERVE_NOT_DISTRIBUTE |
| gateway/bootstrap/constitutional_runtime.js | ConstitutionalRuntime (only referenced by test) | test only | Event (legacy) | NO | PURE JS | PRESERVE_NOT_DISTRIBUTE |
| gateway/test_*.js, evals/ | tests and eval harnesses | none (not imported by runtime) | n/a | NO | n/a | TEST_ONLY |

## Runtime dependency closure (populated as authorities resolve)

- Event authority implementation files: PROVEN (rows above)
- Gateway entrypoint: PROVEN (server.js -> gateway_runtime.js)
- Postgres schema/migrations: ping_events / ping_missions / repository_events / canonical_events DDL lives inside the JS initializers (CREATE TABLE IF NOT EXISTS); no separate migration files observed yet — VERIFY before distribution build
- Worker/executor files: PROVEN (worker_runtime.js, canonical_workers.js, intelligence_worker.js)
- package.json / lockfiles: PENDING (ARM64 audit of native modules pending)

## ARM64 notes

- gateway/Dockerfile: FROM node:24-alpine (multi-arch; linux/arm64 variant exists). Native modules compile or fetch prebuilds at `npm install` time inside the ARM64 build.
- gateway/package.json: 15 deps. PURE JS: express, pg, googleapis, ioredis, simple-git, yaml, bullmq, dockerode — no ARM64 concern.
- NATIVE NODE MODULES (flagged, ARM64 MODERATE):
  - @temporalio/worker (+ client, activity): Rust core binary. NOT wired into gateway bootstrap (gateway_runtime.js has zero references to temporal_runtime.js). Temporal publishes linux/arm64 prebuilds, but if the distribution slice excludes temporal, drop from package.json at image-build time (migration decision, not this pass).
  - tree-sitter, tree-sitter-javascript, tree-sitter-python, tree-sitter-typescript: node-gyp compiled. NOT wired into gateway bootstrap (treesitter_chunker/parser_authority not required by gateway_runtime.js). Same recommendation.
- Dockerfile.worker-runtime: python3 worker polling gateway over HTTP, no direct DB. Python native deps audit only if the python executor enters the distribution slice (currently PRESERVE_NOT_DISTRIBUTE for legacy Python workers).
- EXTERNAL SERVICES for Oracle topology (milestone): postgres:17 (multi-arch official image), qdrant (multi-arch), ollama (multi-arch) — all publish linux/arm64. No ARM64 blockers among services.

## Evidence

Convergence worktree `/home/nolan/ping`, HEAD per forensic pass. Each row must cite a proof (import graph edge or runtime wiring).
