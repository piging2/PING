# PING Harvest Plan

**Date:** 2026-09-22 (MDT)
**Scope:** read-only investigation. No code changed, no pushes, no container restarts. All Pig access via `~/workspace/pig/pigwsl-run.sh` (note: the script takes the program as its `$1` argument, not stdin; `docker exec -i` eats piped stdin, so every `docker exec` in a bridge script needs `< /dev/null`).

## 1. Inventory — where PING's real substance lives

### A. Canonical codebase: `/home/nolan/ping` (Pig) — THE source of truth
- 13 GB on disk (`worktrees/` sub-checkouts dominate; excluded `.git`), **2769 tracked files**
- Branch `refactor/runtime-authority-convergence` @ `cc6856c3bc78e0535e66f168c66dc31abee2c073`, 16 dirty files
- Tracked: **1001 markdown docs**, 1322 js/ts/py files
- `gateway/` 623M — Express REST gateway (port 8080), ~434 source files per the 2026-09-16 audit
- `ping-runtime/` 106M — the live system: UnifiedEventRuntime, 8 canonical workers
- `runtime/` 94M — constitutional kernel: TypeScript authorities + Python workers/adapters
- `docs/` 2.4M, `RepositoryKnowledgeIndex/` 2.1M, `audit/` 528K, `constitutional-compiler/` 4M, `brainos/` 2.9M, `presentping/` 2.1M, `vault/` 716K
- Harvestable: full architecture source + the design record (docs). NOT harvestable as-is: `worktrees/` (13G duplicates), node_modules.

### B. FYD app: `/home/nolan/projects/ping` (Pig) — experience layer, NOT PING core
- 1.7G (1G is node_modules), branch `fyd/builder-composition`, 67 dirty files
- Harvestable: only the `/api/*` BFF contracts + env-var inventory (already captured by the deploy lane). Do not confuse with PING.

### C. Live operational store: `brain-postgres` / `ping_runtime` — the event/journal truth
- **33 tables, `ping_events` = 2321 rows.** This is the database the running gateway actually writes to.
- Schema: ping_events, ping_missions, canonical_events, events, event_outbox, event_processing, mission_events, mission_executions, knowledge_nodes, knowledge_edges, lineage, projections, objects, repository_events/objects/snapshots/dead_letters/store_migrations, tenant_registry, tenants, agent_workspaces, capability_requests, commits, exterior_agent_credentials, filesystem_cache, ai_workspace_results, customers, hpp_projects, hpp_project_artifacts, google_reviews, review_flags, deployment_registry, runtime_registry, execution_graphs, graph_node_states, telemetry_metrics, ping_bridge_cursors
- NOTE: this supersedes the 2026-09-12 "gateway talks to the wrong database" finding — `ping_runtime` now exists inside brain-postgres and holds 2321 events. Gateway env still says `POSTGRES_HOST=host.docker.internal:5432` → brain-postgres. Gateway `/health` returned empty in this probe (state unknown, not diagnosed — read-only scope).

### D. Dev/canonical schema: `ping-postgres` (host :5433)
- `crx_runtime` (11 MB, 33 tables): ping_events=739, ping_missions=144, knowledge_nodes=68, canonical_events=0, events=0, outbox/processing=0, everything else ~0
- `lanea_gate`: single table ping_events=10
- `ping-rc-postgres`/`rc_staging` (27 tables, ping_events=13) + empty `crx` DB; `ping-test-pg` exists (test)
- Harvestable: schema DDL (the contract), light dev data. The live truth is in C, not here.

### E. Running services (Pig docker)
- `ping-gateway` (`ping-gateway:devin-boundary2`, :8080, up 8h) — live gateway
- `ping-rc-gateway` (127.0.0.1:18099) — release-candidate gateway
- `ping-qdrant` (UNHEALTHY), `ping-redis` (healthy), `ping-vault` (UNHEALTHY), `ollama`, `open-webui`, `brain-qdrant`, `cosyvoice-tts`
- Vector embeddings currently degraded (qdrant unhealthy) — harvest text projections, not vectors.

### F. Local knowledge corpus (already in this workspace)
- `~/workspace/tandem/knowledge/`: 2.3M — **509 dossiers** + 197KB `entity-index.json`
- `~/memory/*.md`: 15 daily logs, ~14.9k lines; `~/MEMORY.md` curated
- `~/workspace/ping-arch-audit/PING_ARCHITECTURE_AUDIT.md` (2026-09-16, comprehensive read-only audit)
- `~/workspace/your_files/MUSE_PING_FULL_READ_ONLY_BASELINE.md` (2026-09-12 infra baseline)
- `~/workspace/ping-harvest-12h-final-report-2026-09-18.md`, `~/workspace/tandem/*.md` (interop audit, delegation architecture, contracts), goal dirs (`ping-gateway-exterior-agent-integration`, `ping-agent-execution-stack`, `ping-website-build`)
- `~/workspace/tandem/pg_probe.py` — the proven read-only event-query pattern (resolves creds from container env at runtime, never stores them)

### G. Confirmed NOT substance
- `piging2/PING` GitHub repo: empty placeholder (one 15-byte README). Nothing to harvest.
- FYD app code (separate harvest), `worktrees/`, node_modules, `brain-postgres` `h13_*` DBs (unrelated stack), raw Qdrant vectors.

## 2. Constitutional core

**Architecture.** PING is an event-sourced intelligence system. Every state change flows through `UnifiedEventRuntime.emit()` into an append-only Postgres event log (`ping_events`) with deterministic SHA-256 event identity (same logical event re-emitted yields the same ID; idempotent re-ingest is structural), namespace privacy boundaries (`core::` / `tenant::`), and causal traceability (`causation_id` / `correlation_id` with recursive-CTE tree walking). A mission layer (`ping_missions`, deterministic mission IDs, lease/claim columns) converts business events into distributed-safe work; eight canonical workers (observation → claim → classification → recommendation → projection → replay → witness → lineage) form the processing pipeline; `canonical_object.js` produces hash-verified immutable envelopes; declared single-owner authorities (identity, time, canonical) guard sovereignty (enforcement partial — the hottest emit path bypasses the identity authority). The `gateway/` Express service exposes all of this as a capability-authority REST API with workspace isolation on port 8080.

**Data.** Source truth is the event log: 2321 live rows in `brain-postgres/ping_runtime` (the operational store the gateway writes), 739 rows in the dev `crx_runtime`. Derived truth lives in `knowledge_nodes`/`knowledge_edges` (68 nodes in dev), `projections`, `lineage`, `repository_*` (code-observation mirrors), and Qdrant vectors (currently unhealthy — treat embeddings as regenerable, not canonical). Presented truth is computed downstream (FYD renders from committed bundles/projections). The invariant any harvest must preserve: event → mission → worker → projection lineage must stay joinable on `event_id` / `correlation_id` / `causation_id`, and namespace boundaries must survive the move. A projection is not the event; harvest both, never conflate them.

## 3. Phased harvest plan

**Phase 0 — Pin the source** (read-only, Pig bridge). Record branch/HEAD/dirty-count of `/home/nolan/ping`, container image names+digests, per-DB table counts. Output: `~/workspace/fyd-harvest/manifest-<date>.json`. Excludes: `worktrees/`, node_modules, `.git`.

**Phase 1 — Doc index** (local, no Pig). Index the 1001 tracked `.md` files in `/home/nolan/ping` (path, title, bytes, one-line summary) plus the existing workspace audits. Output: `~/workspace/fyd-harvest/doc-index.jsonl`. Highest value per byte — this is the design record. Pull full text only for ADRs, authority declarations, and contract docs; index the rest.

**Phase 2 — Schema mirror** (Pig bridge, `pg_dump --schema-only`). DDL for `ping_runtime` (brain-postgres) and `crx_runtime` (ping-postgres). Output: `~/workspace/fyd-harvest/schema/<db>-<date>.sql`. This is the contract surface everything else hangs off.

**Phase 3 — Event stats + bounded samples** (Pig bridge, SELECT-only via the `pg_probe.py` pattern). Per-table row counts (done: see manifest), `event_type` histogram, namespace histogram, correlation-group depth sample, latest 200 `ping_events` with payloads truncated. Output: stats JSON + sample JSONL. NEVER full payload dumps.

**Phase 4 — Knowledge projection export** (Pig bridge + local merge). Full `knowledge_nodes`/`knowledge_edges` from `crx_runtime` (68 nodes — small), merged with the 509 local dossiers + `entity-index.json` (already local). Output: `~/workspace/fyd-harvest/knowledge-graph-<date>.json`. The 2321-row live log stays queryable in place; harvest the derived graph, not the raw log.

**Phase 5 — Gateway API contract** (repo read). Enumerate the Express route table + capability registry from `gateway/` source into a route inventory. Output: `~/workspace/fyd-harvest/gateway-routes.md`. Read path already proven by `pg_probe.py`; no new auth needed.

## 4. Explicitly NOT harvested
- `worktrees/` (13G duplicates), node_modules, `.git` objects
- Full event payloads (customer-data and secret risk)
- `exterior_agent_credentials`, `capability_requests` contents (secret-bearing tables — schema only)
- Qdrant vectors (unhealthy service; regenerable from source text)
- `brain-postgres` `h13_*` databases (unrelated stack)
- The empty `piging2/PING` GitHub repo
- FYD app code (separate harvest track)
- Raw memory daily logs beyond curated MEMORY.md (context, not PING substance)

## 5. Open observations (not action items — read-only scope)
- Gateway `/health` returned empty in this probe; liveness of the :8080 surface is unverified.
- `ping-qdrant` and `ping-vault` containers report unhealthy; embeddings and vault-backed secrets are degraded.
- The 2026-09-12 "wrong database" finding has evolved: `ping_runtime` now exists in brain-postgres with 2321 events, matching the gateway's configured host.
