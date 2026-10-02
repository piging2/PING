# Discovery record: public read routes, defect downstream checks, event count reconciliation

Date: 2026-09-12. Active worktree: curious-squid, branch constitutional-convergence-v2, HEAD e1297c52cd20840a7d7fd432dfa8948f18bf7817.
Read-only investigation. Nothing patched, committed, or pushed. No secrets recorded.

## A) Public read routes (code: curious-squid gateway/routes/, auth mounts in gateway/bootstrap/gateway_runtime.js)

Auth is per-route only (no global middleware). Mounts WITHOUT exteriorAuthMiddleware.middleware():
- gateway_runtime.js:758 /health (bare)
- gateway_runtime.js:785 /constitution ("filesystem only, always available")
- gateway_runtime.js:802 /runtime/fingerprint ("filesystem only")
- gateway_runtime.js:842 /ops
- gateway_runtime.js:856 /governance ("filesystem only")
Contrast: /events (:762), /canonical-events (:766), /ingest (:770), /ai (:885), /connectors (:887) all mount with auth.

| Family | Exact data returned | Classification | Verdict |
|---|---|---|---|
| /health (routes/health.js:12, gateway/health_authority.js:34-54) | status, components{name: check result}; checks registered gateway_runtime.js:805-841: gateway {status, uptime, memory}, generated_artifacts {count}, integrations {names, status, registeredAt, eventCount, errorCount}, event_governance/event_runtime {stats}, qdrant {healthy}, embedding {stats} | Operational metadata, light topology (integration names) | SAFE_PUBLIC |
| /ops/status (routes/ops.js:15) | status, generated_runtime_authoritative, runtime_artifact_hash, uptime, components {health, drift, events, capabilities, workflows, deployments, state_machines counts}, drift_hashes {manifestHash, runtimeArtifactHash, platformHash, dependencyGraphHash}, fingerprint, checked_at | Operational metadata | (500 live; see B) |
| /ops/health (ops.js:50), /ops/drift (ops.js:63) | status + hashes only | Operational metadata | SAFE_PUBLIC |
| /ops/dashboard (ops.js:82), /ops/system (ops.js:110) | Full SystemAuthority.getSystemState() (ping-runtime/runtime/system_authority.js:230): version, generated_at, containers [{name, status, state, IMAGE, ports PrivatePort->PublicPort, uptime, created}] (system_authority.js:37-69), git {branch, pending_changes, recent_commits [{hash, message, AUTHOR, date}]} (simple_git_adapter.js:55-65), postgres {total_events, streams, event_types, oldest/newest timestamps}, qdrant {collections, total_points}, missions/replay counts, metrics {uptime_seconds, total_requests} | Topology (image names reveal stack versions, port maps expose service layout; git branch + author names + commit messages = internal dev metadata) | SENSITIVE_PUBLIC |
| /governance/* (routes/governance.js:9-55) | policy [{event_type, authority_owner, event_class, source, namespace, expectedOwner}], full NAMESPACE_OWNERS map (ping-runtime/events/event_governance.js:13-68), violations [{code, reason, timestamp}] (50 cap), stats {total, passed, rejected, violations counts} | Governance policy: enumerates every valid event type = complete accepted-input attack surface | SENSITIVE_PUBLIC |
| /constitution/ (routes/constitution.js:46) | platform_hash, runtime_artifact_hash, constitution_version, compiler_version, graph_hash, graph_valid, startup_order (ordered internal DI service names), contracts {authority_id, authority_version, contract_hash}, registry_count, authority_count, generated_consumers, artifact_hashes, runtime_fingerprint, computed_at, latency_ms | Governance/architecture map | SENSITIVE_PUBLIC |
| /constitution/contracts (constitution.js:151) | Per-registry contracts (e.g. tenant_registry.js): authority_id/name, owner, consumes/produces, guarantees, invariants, consumers (incl. 'gateway'), requires, failure_modes, rollback, determinism, dependencies | Architecture internals | SENSITIVE_PUBLIC |
| /constitution/graph (constitution.js:177) | Non-functional: 503 live (container never passed at gateway_runtime.js:785-799); latent ReferenceError at :183 even if wired | Exposes nothing (dead path) | SENSITIVE_PUBLIC (by family), dead |
| /runtime/fingerprint (routes/fingerprint.js:9, runtime_fingerprint.js:20-63) | platform_hash, runtime_artifact_hash, generation_manifest_hash, compiler_version '1.0.0', artifact_versions {hashes}, artifact_stats {counts}, computed_at, fingerprint_hash | Opaque hashes + counts only; built for drift detection | SAFE_PUBLIC |

Consumers requiring unauthenticated access: NONE in code. Grepped all 6 worktrees (code, scripts, docs, Dockerfiles, compose): zero fetch/curl/axios/Invoke-RestMethod callers. No HEALTHCHECK in gateway Dockerfile; compose healthchecks target only qdrant (:6333) and elasticsearch (:9200); no gateway service in compose. Gateway never polls itself at boot. Soft expectations only: docs/hermes_operating_protocol.md:59-62 lists GET /ops/status, /ops/health, /ops/drift, /system/state, /constitution, /runtime/fingerprint as "Allowed (read - always available)" for a hypothetical Hermes (no implementation found); routes/constitution.js:3-9 header describes fleet-handshake query-on-startup but no fleet code implements it.

Design note: the "filesystem only" comments on the mounts suggest deliberate public-by-design for fleet handshake, but no fleet code exists that requires it.

## B) Defect downstream-dependency check

/ops/status (500 live, body {"status":"error","error":"fingerprint.generate is not a function"}):
- Root cause: gateway/routes/ops.js:19 `const fp = fingerprint ? fingerprint.generate() : null;` throws TypeError. ping-runtime/runtime/runtime_fingerprint.js defines only constructor (:9) and getFingerprint() (:20); no generate() exists. Every other consumer uses getFingerprint() (constitution.js:129). Lines 17-18 (healthAuthority.getHealth(), driftDetector.getHashes()) execute fine; getStats() calls at :20-24 never execute.
- Consumers: zero in any worktree. Only hits: curious-squid AGENTS.md:1144 (past-fix ledger), docs/COUNTER-SEMANTICS-001.md:26 (dead spec), docs/hermes_operating_protocol.md:60 (Hermes allowlist doc, no implementation), docs/runtime_map.md:26 (future Decision Inspector, marked future), route comments themselves.
- Verdict: record-and-continue, NOT a true blocker. Fix when wanted: ops.js:19 -> fingerprint.getFingerprint().

/constitution/graph (503 live, body {"error":"Container not available"}; previously observed 500):
- Root cause, doubly broken: (1) gateway_runtime.js:785-799 calls createConstitutionRoutes WITHOUT container, so guard at constitution.js:179-181 returns 503 first. (2) Latent: constitution.js:183 `const graph = buildDependencyGraph(container);` uses a bare identifier with no module-scope declaration (line 77's const is local to the / handler; only lazy getBuildDependencyGraph() at :17-23 exists). The symbol exists in gateway/bootstrap/wiring.js:193, exported :256, but line 183 bypasses the getter; if wired it would throw ReferenceError -> 500.
- Consumers: zero in any worktree.
- Verdict: record-and-continue, NOT a true blocker. Fix needs container wired through AND line 183 -> getBuildDependencyGraph()(container).

Correction to prior record: /constitution/graph is 503 live today, not 500; the 500-class bug (ReferenceError) is latent behind the 503 guard.

## C) Event count reconciliation

- Query: docker exec ping-postgres psql -U postgres -d ping_runtime -tAc "SELECT COUNT(*), MIN(timestamp), MAX(timestamp) FROM ping_events;" @ Pig-local 2026-09-12T13:12:14-06:00 -> COUNT 1,655; MIN 2026-07-30 00:26:12 UTC; MAX 2026-09-12 19:05:56 UTC (13:05:56 MDT). Column verified via \d (timestamptz, PK event_id).
- canonical_events on same DB: 0 rows (table exists, dormant).
- Drift: second reading @ 13:15:20-06:00 -> 1,655, identical MIN/MAX. Delta 0 over 3m06s. But table grows ~70-110/day (72 today UTC, 113 yesterday); dominated by source mission-runtime (1,289 rows total).
- Deletion/reset: no TRUNCATE anywhere in active worktree; no DELETE FROM ping_events; no retention logic targeting ping_events (retention covers only artifacts, checkpoints, analytics). Only conditional seed: gateway/bootstrap/gateway_runtime.js _seedBusinessEvents() seeds 18 events only if table is empty; otherwise skips.
- Postgres inventory: docker ps -> ping-postgres (postgres:15-alpine, host 5433->5432) and brain-postgres (host 5432->5432). Gateway env (non-secret vars from docker inspect): POSTGRES_HOST=host.docker.internal, POSTGRES_PORT=5433, POSTGRES_DB=ping_runtime, POSTGRES_USER=postgres -> gateway points at ping-postgres. brain-postgres has a ping_runtime DB but ping_events does not exist there. Exactly one holder.
- Provenance: 1,583 = GET /events/stats result during today's session (~13:08 MDT); route falls back to SELECT COUNT(*) ... FROM ping_events when EventReadAuthority.getEventStats() returns nothing (it queries repository_events, a different table). Matches "1583 events across 27 types" phrasing. Sources: ~/memory/2026-09-12.md#L285, ~/workspace/your_files/PHASE4_PIPELINE_COMPLETION_RECORD.md#L20.
- Reconciliation: 1,583 + 72 (today's emitted events) = 1,655 exactly. Growth is today's live vertical-slice testing (observation -> claim -> classification -> recommendation -> projection -> replay -> witness -> lineage chains), append-only. No deletions.
- 1,542: provenance UNKNOWN. Found in no workspace file, memory log, or goal note (searched ~/workspace, ~/memory for "1542"). Cannot be confirmed as a ping_events count. Plausible: earlier reading (~half a day earlier at current emission rates), a differently-scoped count, or a mis-report. Evidence that would settle it: a log line with exact query + target DB + timestamp.

Reporting rule: always report exact query + full target (container, DB, table) + Pig-local timestamp of the query. Never compare counts without timestamps; the table is append-only and gains roughly 70-110 rows/day.

## Tests actually run
- (B) Anonymous GET /ops/status -> 500 {"status":"error","error":"fingerprint.generate is not a function"}; anonymous GET /constitution/graph -> 503 {"error":"Container not available"} (live, Pig gateway, 2026-09-12).
- (C) Two direct psql count queries + \d schema check + docker ps + docker inspect (filtered, non-secret vars) + grep for TRUNCATE/DELETE/seed logic.
- (A) Code-reading only; no live HTTP probing.

## Out of scope for this task
Canonical event authority, canonical provenance authority, LIVE/DORMANT/DELEGATED/BLOCKED write-surface classification, tenant/security boundaries for remaining write families, and the smallest next executable seam were not part of this discovery task and are not claimed here.
