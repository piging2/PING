# PING Architecture Audit — Implementation Repository

**Date:** 2026-09-16
**Scope:** `/home/nolan/ping` — read-only audit. No files modified, no git state changed.
**Audited checkout:** branch `constitutional-convergence-v2` @ `c5f7808b2` (NOT `main`; see note below)
**Working tree:** 338 MB (excluding .git). One untracked dir: `worktrees/agent-smoke-abc123def456/` (not touched, not audited as primary evidence).

> **Branch note:** Prior context described `main` at `6e359a2`. The live checkout is `constitutional-convergence-v2`. All file paths below are relative to `/home/nolan/ping` on that branch. The `worktrees/` copy was used only to confirm it is a duplicate; evidence is cited from the main tree unless stated.

## 0. Repository overview

| Aspect | Finding |
|---|---|
| Primary languages | JS (777 files), TS (310), Python (199), Markdown (993 — heavy doc culture), SQL (28) |
| Core runtime | `ping-runtime/` — 188 files, Node.js. The live system. |
| Constitutional kernel | `runtime/` — TypeScript authorities + Python workers/adapters |
| HTTP gateway | `gateway/` — Express, `server.js` → port 8080, Dockerfile present |
| Entry point | `node gateway/server.js` → `gateway/bootstrap/gateway_runtime.js` wires the full pipeline |
| Package scripts | root `package.json`: `dev` (gateway), `build`, `test`, `test:constitutional-pipeline` (`node test/run_constitutional_pipeline.js`) |
| Databases | PostgreSQL (primary store); Qdrant (vector); Neo4j (adapter only) |
| Docs-to-code ratio | ~993 md files vs ~1286 code files — the repo documents itself exhaustively (audit reports, ADRs, eval specs) |

**How to run (read-only observation, not executed):** `gateway/Dockerfile` builds `node:24-alpine`, `CMD ["node", "gateway/server.js"]`. Env template `.env.example` expects Postgres + Qdrant. Python worker path: `infrastructure/oracle/Dockerfile.worker-runtime` → `python3 -u /app/workers/worker_runtime.py`.

---

## 1. Event system

### UnifiedEventRuntime — BUILT
**File:** `ping-runtime/events/unified_event_runtime.js`

Real, complete implementation. Every event flows through `emit(eventType, source, payload, options)`:
- **Deterministic identity:** `event_id = SHA-256({eventType, source, [namespace], [logical_id|payload]})`. No `Date.now()` in identity material. Same logical event re-emitted → same ID → `ON CONFLICT DO NOTHING` dedup. Idempotent re-ingest is structural, not aspirational.
- **Validation:** event type checked against `EventValidator`/registry; governance checked via `EventGovernance` at a single choke point.
- **Namespace privacy boundary:** `core::system` default owned solely by `emit()`; `core::<name> | tenant::<id>` validated once, threaded through the whole worker chain.
- **Causal traceability:** `causation_id` / `correlation_id` in metadata; recursive CTE queries `getChildren`, `getDescendants`, `getAncestors`, `getCorrelationGroup` — real Postgres causal-tree walking with cycle guards.
- **Tables:** creates `ping_events` on `initialize()` (event_id PK, namespace, processed flag, JSONB payload/metadata, expression indexes on causation/correlation IDs).
- Older schemas also exist: `database/events.sql` (append-only `events` table with anti-UPDATE/DELETE triggers) and `database/canonical_events.sql` (UUID `canonical_events` table, tenant+sequence unique). The live path is `ping_events` via the runtime.

### Canonicalization — BUILT
**Files:** `ping-runtime/canonicalization/canonical_object.js`, `canonicalization_service.js`, `ping-runtime/authorities/canonical_authority.js`

`createCanonicalObject()` builds one immutable envelope (`id, kind, authority, canonical_hash, canonical_bytes, identity, lineage, relationships, health, confidence, metadata, payload, witness, certificate`). `verifyCanonicalObject()` recomputes the hash from payload — tamper evidence is executable, not a comment. The header documents consolidation of ~15 prior isomorphic implementations into this one.

### Identity — BUILT (declared owner), enforcement partial
**File:** `runtime/kernel/authorities/identity_authority.js` (canonical), shimmed at `ping-runtime/authorities/identity_authority.js`

Declared single owner: `IdentityAuthority.generateFromCanonicalHash()`. `deterministic_id_authority.js` is explicitly **deprecated** with a migration path — good hygiene. **Caveat (honest):** `UnifiedEventRuntime.emit()` computes its SHA-256 with `crypto` directly rather than calling `identityAuthority`. The sovereignty claim is declared and mostly followed (`canonical_object.js` uses it), but the hottest path bypasses it. Enforcement: partial.

**Time:** `constitutional_time_authority.js` — single time source used across runtime (no scattered `Date.now()` in identity paths).

---

## 2. Mission layer — BUILT

**Files:** `ping-runtime/orchestration/event_to_mission_bridge.js`, `mission_runtime.js`, `mission_scheduler.js`

- **EventToMissionBridge:** subscribes to 30+ business event types (`CUSTOMER_CREATED` → `CUSTOMER_ONBOARD`, `REVIEW_RECEIVED` → `REVIEW_RESPONSE`, `OBSERVATION_CREATED` → `CLAIM_GENERATE`, … `LINEAGE_CREATED` terminal). Threads root `correlation_id` through the chain. "Does NOT modify state — only creates missions."
- **MissionRuntime:** `ping_missions` table, full lifecycle (created → assigned → running → completed/failed → archived), lease/claim columns for distributed safety, deterministic `mission_id = sha256(missionType:event_id)[0:16]` — same event can never create two missions.
- **MissionScheduler:** polls `MissionRuntime`, dispatches via `WorkerRuntime.dispatch()` on the **original business event_type** (not mission_type) — with an explicit DOC-CONTRACT comment explaining why, referencing a contradiction-convergence ledger. Phantom-completion prevention is designed in.

---

## 3. Worker layer

### WorkerRuntime — BUILT
**File:** `ping-runtime/workers/worker_runtime.js`

Registration (`register(name, worker, {eventTypes, maxConcurrent, capabilities})`), dispatch-only mode (poll loop deliberately disabled to prevent dual input paths — documented), per-worker concurrency, heartbeats, stats. Workers with empty `eventTypes` are dormant by design (previously a catch-all bug, fixed and documented).

### Canonical JS workers — BUILT (8 workers)
**File:** `ping-runtime/workers/canonical_workers.js`

`registerCanonicalWorkers()` registers: **observation, claim, classification, recommendation, projection, replay, witness, lineage** (+ `intelligence`, currently dormant — `eventTypes: []`). Pipeline: `DOCUMENT_IMPORT → OBSERVATION_CREATED → CLAIM_GENERATE → … → REPLAY_VERIFY → WITNESS_CREATE → LINEAGE_CREATE → PROJECTION_CREATE`. Each worker preserves namespace/correlation/causation across hops via `BaseWorker._emit` — the trace contract is enforced in the base class, not left to each worker.

### Python workers — ACTIVE DEVELOPMENT (legacy generation, still shipped)
**Files:** `workers/{observation,claim,lineage,projection,replay,witness,worker_runtime,repository_client}.py`

Older generation using `kernel.event_dispatcher` + `repository_client` (different architecture from `ping-runtime`). Still has a live deployment path: `infrastructure/oracle/Dockerfile.worker-runtime` copies `workers/` + `kernel/` and runs `worker_runtime.py`. So: superseded in the gateway path, but not dead — it's the Oracle worker image. "ACTIVE DEVELOPMENT" is fair; "BUILT" would overclaim for the current architecture.

---

## 4. Knowledge

### KnowledgeGraph — BUILT (Postgres-backed)
**File:** `ping-runtime/knowledge/knowledge_graph.js`

Real store: `knowledge_nodes` (node_id, node_type, entity_type, label, data JSONB, source_event_id, namespace, confidence + `confidence_provenance`, status candidate/approved, correlation_id) and `knowledge_edges`. Confidence semantics are rigorously specified: NULL-preserving, producer confidence vs model provenance distinguished, only human approval may recompute. `knowledge_promoter.js` handles the approval lifecycle.

### "Business graph" — DIRECTION (as a named system)
Zero code hits for `business_graph`/`businessgraph`. The KnowledgeGraph is a **generic** entity/relationship store — there is no distinct business-domain graph subsystem (no customer→project→invoice relationship model in code). The marketing site's BusinessGraph diagram visualizes what the knowledge graph *could* hold, not a separate built system. The honest label is "KnowledgeGraph: BUILT; business-domain graph: DIRECTION."

### Neo4j adapter — EXPERIMENTAL
**File:** `ping-runtime/graph/neo4j_adapter.js` — thin, real REST adapter (Cypher over HTTP). No evidence it is wired into the gateway boot path or any worker. Adapter exists; integration does not.

### Hybrid search — BUILT
**File:** `ping-runtime/search/hybrid_search.js` — Qdrant 768-d cosine semantic leg + `EvidenceAuthority.verify()` leg (every hit traced to a real `ping_events` row) + KnowledgeGraph context leg. Namespace filtering enforced post-search.

---

## 5. Authority boundaries

| Authority | File | Status | Enforcement |
|---|---|---|---|
| IdentityAuthority | `runtime/kernel/authorities/identity_authority.js` | BUILT | Declared single owner; deprecated competitor removed; hot path bypass noted §1 |
| CapabilityAuthority | `runtime/kernel/capabilities/capability-authority.ts` | BUILT | Real registry+resolver (input/output types, policies, latency, determinism, replay-safety filters) |
| CanonicalAuthority | `ping-runtime/authorities/canonical_authority.js` | BUILT | Hash/bytes canonicalization used by canonical objects |
| ConstitutionalTimeAuthority | `ping-runtime/authorities/constitutional_time_authority.js` | BUILT | Single time source |
| PatchAuthority | `gateway/patch_authority.js` | BUILT | AST parse → diff validation → lint/typecheck/tests → security scan → witness → apply/rollback; `patches` table |
| FilesystemAuthority | `gateway/filesystem_authority.js` | BUILT | Compiles File constitutional objects from repo paths (hash, size, envelope) |
| TenantRegistry (P003) | `ping-runtime/runtime/tenant_registry.js` | ACTIVE DEVELOPMENT | `tenant://{id}` URIs, register commands; isolation claimed, enforcement not fully verified |
| DeploymentRegistry (P004) | `ping-runtime/runtime/deployment_registry.js` | ACTIVE DEVELOPMENT | `deployment://{tenant}/{version}`, `oracle_region` field |
| WorkspaceRegistry | — | **ABSENT** | Zero hits in code |
| CommitAuthority | — | **NOT IN AUDITED TREE** | Found only under `worktrees/agent-smoke-abc123def456/gateway/` (untouched per boundaries) |

Enforcement quality is genuinely above average: several files carry `[DOC-CONTRACT]` blocks naming the single canonical decider and citing the audit ledger that established it. But "declared authority == enforced" is not universal (see identity hot-path bypass).

---

## 6. Evidence / replay / lineage / projection

- **EvidenceAuthority** (`ping-runtime/evidence/evidence_authority.js`): BUILT — verifies search hits against `ping_events` rows.
- **ReplayWorker** (`canonical_workers.js` L229+): BUILT with honest failure modes — without an injected `replayProvider` it emits `REPLAY_COMPLETED{verified:false, reason:'no_replay_provider'}` rather than fabricating success. Whether a real kernel replay provider is wired in production boot: **unverified** (check `gateway_runtime.js` L513 options at deploy time).
- **WitnessWorker** (L454+): BUILT — **failure-honesty gate**: refuses to attest unverified replays, emits `WITNESS_REJECTED`. This is the strongest single integrity mechanism in the codebase.
- **LineageWorker**: BUILT — causation-chain tracking.
- **Projection**: BUILT — projection worker in canonical set + `runtime/projection_worker/` (constitutional projections, Qdrant collections).
- **Determinism/replay semantics:** content-addressed IDs + append-only events + canonical bytes/hash + 10 runnable evals (`evals/constitutional-runtime/EVAL-001..010`: idempotent reingest, namespace privacy chain, confidence null propagation, governance rejection, double-completion prevention, worker failure propagation, replay convergence, witness failure honesty). Replay *convergence* is tested; absolute determinism across machines is claimed in docs more strongly than the evals prove.

---

## 7. Continuity / tenancy

- **Namespace model:** BUILT — `core::system` / `core::<name>` / `tenant::<id>` enforced at the single `emit()` choke point, threaded through workers, knowledge graph, and search. This is the real isolation mechanism.
- **Tenant registry:** ACTIVE DEVELOPMENT (see §5).
- **"Continuity" as a named model:** DIRECTION — no continuity subsystem in core code (only incidental mentions in `mcp/ping_mcp_server.py`, `presentping` config). The *properties* associated with continuity (append-only log, causal chains, replay) are built; a capital-C Continuity layer is not.

---

## 8. Agents / runtimes: Codex, Hermes

- **Codex:** DIRECTION — single mention in `gateway/best_in_class_integration.js` as one provider option among six (`devin, opencode, claude, codex, continue, cline`) in a code-generation port interface. Not a PING subsystem.
- **Hermes:** DIRECTION — appears only as a `User-Agent: Hermes-Agent-Research-Pipeline` string in `brainos/research/scan_and_synthesize.py`. Not a subsystem.
- **IntelligenceWorker** (`ping-runtime/workers/intelligence_worker.js`): EXPERIMENTAL — registered dormant; "rule-based + optional Ollama" per header. The site's "Agents: ACTIVE DEVELOPMENT" overclaims this; EXPERIMENTAL is the honest label.
- **"Multi-runtime" (one authority, many execution runtimes):** DIRECTION — zero code hits for `multi_runtime`/`multi-runtime`. There is one runtime (Node WorkerRuntime) plus the legacy Python worker image. The convergence story is architecture-deck material, not code.

---

## 9. Infrastructure

| Component | Status | Evidence |
|---|---|---|
| PostgreSQL | BUILT | Primary store; `ping_events`, `ping_missions`, `knowledge_nodes/edges`, `patches`; `database/*.sql` |
| Ollama | BUILT | `runtime/adapters/ollama_provider_adapter.py`, `inference_adapter.py`; `gateway/routes/ollama.js` routes through AIRuntime with `qwen2.5-coder:7b/14b`; `PatchAuthority` gates Ollama-proposed patches |
| Qdrant | BUILT | `runtime/retrieval/retrieval_service.py`, projection workers, `mcp/ping_mcp_server.py`; `.env.example` has real collection config (`constitutional_memory`, `event_memory`, `observations`, …) |
| Oracle (OCI) | ACTIVE DEVELOPMENT | `infrastructure/oracle/Dockerfile.gateway` + `Dockerfile.worker-runtime`; `oracle_region` in deployment records; commit `c059d8744 "track Oracle deployment infrastructure"`; **no OCI SDK client code found** |
| Google Cloud | DIRECTION | One mention in `ping-runtime/connectors/connector_registry.js` + a bundled `.next` chunk; nothing wired |
| Neo4j | EXPERIMENTAL | Adapter only (§4) |

---

## 10. Status classification summary

**BUILT:** UnifiedEventRuntime + `ping_events`; canonicalization/canonical objects; IdentityAuthority (declared); EventToMissionBridge; MissionRuntime; MissionScheduler; WorkerRuntime; 8 canonical JS workers; KnowledgeGraph (Postgres); HybridSearch; EvidenceAuthority; WitnessWorker (+honesty gate); LineageWorker; ProjectionWorker; PatchAuthority; FilesystemAuthority; CapabilityAuthority (TS); namespace/tenant isolation at emit; Ollama; Qdrant; gateway HTTP API (events/ingest/missions/knowledge/ollama routes); gateway boot wiring (`gateway_runtime.js` L432–608 wires the entire pipeline); eval suite EVAL-001..010.

**ACTIVE DEVELOPMENT:** Python workers (legacy gen, Oracle image); TenantRegistry; DeploymentRegistry; Oracle deployment path.

**EXPERIMENTAL:** IntelligenceWorker (dormant); Neo4j adapter.

**DIRECTION (mentioned, not implemented):** Business graph (as distinct system); multi-runtime orchestration; Codex; Hermes; Google Cloud; Continuity model (named layer); WorkspaceRegistry; CommitAuthority (not in audited tree).

---

## 11. The single most important architectural insight a competitor would miss

**Integrity is executable, not asserted.** The system's differentiator isn't the event log or the workers — it's that every trust claim has a code path that can say *no*: deterministic content-addressed IDs make duplicate ingestion structurally impossible; the WitnessWorker *refuses* to attest unverified replays (`WITNESS_REJECTED` is a first-class event); governance rejects at a single choke point; confidence NULLs propagate instead of being fabricated; and ten runnable evals (EVAL-001–010) test exactly these properties. A competitor copying the *diagram* (events → workers → graph) would miss that the moat is the failure-honesty machinery: the system is designed to produce *observable refusals* rather than silent successes. That is what makes "evidence" a load-bearing claim instead of marketing.

---

## 12. Marketing-site status contradictions

Against the site's current labels ("Status labels reflect repository evidence"):

1. **"Agents: ACTIVE DEVELOPMENT" → overclaim.** `IntelligenceWorker` is registered dormant (`eventTypes: []`); the only agent-adjacent code is rule-based + optional Ollama. Honest label: **EXPERIMENTAL**.
2. **Business graph presented as a system → overclaim.** No `business_graph` in code. What exists is the generic KnowledgeGraph. Label the diagram as visualization of the knowledge graph, or mark business-domain graph **DIRECTION**.
3. **Multi-runtime ("JS workers: BUILT, Python workers: ACTIVE DEVELOPMENT, Oracle: IN DEVELOPMENT, Cloud: DIRECTION") → partly overclaim.** JS/Cloud labels are accurate. But "one authority / many runtimes" as an architecture story has **zero** code behind the convergence claim — there is one live runtime. The diagram should be framed as direction, not current architecture.
4. **"Local execution: BUILT" → accurate** (gateway boots the full pipeline locally).
5. **"Oracle: IN DEVELOPMENT" → accurate** (Dockerfiles + region fields, no SDK).
6. **Codex/Hermes** should not appear as architecture components anywhere; they are name-mentions, not systems.
7. **"Status labels reflect repository evidence"** is otherwise defensible — the labels for events, missions, workers, evidence/replay, Ollama, Qdrant all check out. The three fixes above would make it true.
