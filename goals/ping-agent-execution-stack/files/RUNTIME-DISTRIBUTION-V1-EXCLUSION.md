# PING Runtime Distribution v1 — Exclusion Manifest

Forensic basis: convergence worktree /home/nolan/ping, HEAD 88c9651be, read-only pass 2026-09-19.

**Distribution exclusion does NOT mean deletion. Nothing is deleted anywhere.** Excluded material stays in the development repository as evidence and history.

Classes: INCLUDE_RUNTIME_V1 | PRESERVE_NOT_DISTRIBUTE | DEVELOPMENT_ONLY | LEGACY_COMPATIBILITY | TEST_ONLY | UNKNOWN_NONBLOCKING

## Classified

| PATH | CLASS | WHY |
|---|---|---|
| runtime/kernel/events/event-authority-interface.ts | PRESERVE_NOT_DISTRIBUTE | IEventAuthority: dormant in-memory pub/sub interface, zero implementations, not wired |
| runtime/adapters/postgres_event_store.ts | PRESERVE_NOT_DISTRIBUTE | PostgresEventStore: DORMANT, zero instantiation (RepositoryAuthority never constructed), writes a different `events` table |
| gateway/bootstrap/constitutional_runtime.js | PRESERVE_NOT_DISTRIBUTE | ConstitutionalRuntime: only referenced by test_kernel_replay.js, not wired into production bootstrap |
| ping-runtime/agents/replay_worker.js | PRESERVE_NOT_DISTRIBUTE | Unwired; nothing requires it |
| workers/*.py, runtime/workers/*.py | PRESERVE_NOT_DISTRIBUTE | Legacy Python workers reading the legacy `events` table; no live compose service |
| runtime/adapters/google_drive/google_drive_ingestion_adapter.py | PRESERVE_NOT_DISTRIBUTE | Legacy bypass writer to `events`; not wired live |
| brainos/orchestration/src/** | PRESERVE_NOT_DISTRIBUTE | Legacy Python orchestration; not on the distribution path |
| database/events.sql | PRESERVE_NOT_DISTRIBUTE | Legacy `events` table schema; no live writers |
| gateway/generated/*_generator.js | DEVELOPMENT_ONLY | Registry generators are build-time; the JSON registries are INCLUDE |
| gateway/test_*.js, evals/, test/, tests/ | TEST_ONLY | Harnesses and spies; not imported by runtime |
| worktrees/ | DEVELOPMENT_ONLY | Development worktrees |
| archive/, audit/, audit_reports/, reports/, docs/ (analysis MD) | PRESERVE_NOT_DISTRIBUTE | Audit archaeology; valuable evidence, not runtime |
| .graph/, evidence/ (untracked) | PRESERVE_NOT_DISTRIBUTE | Generated graphs and evidence |
| compose.yaml replay-worker service | DEVELOPMENT_ONLY pending migration decision | References missing Dockerfile.replay (FL-20260919-CONV-001); unbuildable from this worktree |

## Keep-off-Oracle confirmation (milestone list, dependency-tracing result)

Confirmed OFF unless a later trace proves otherwise: .graph/, execution ledgers, governance probe matrices, commissioning/migration reports, screenshots, generated audits, historical event-queue JSON, replay test corpora/test fixtures, archived implementations, .tmp.driveupload, development worktrees, Git history, Markdown architecture docs, old runtime implementations (gateway/event_write_authority.js, witness_chain.js, replay_log.js, event_bus.js, eventstore_persistence.js, stage_registry.js, lifecycle_visualizer.js, event_outbox.js, mission_event_bus.js — all dormant).

## Durable runtime state (exception)

Witnesses, lineage records, execution results, mission state, capability decisions, and canonical events generated during operation are durable runtime state and ride the journal tables (ping_events, ping_missions). Their authoritative persistence is proven in OPERATING_SPEC.md. They are not development artifacts.
