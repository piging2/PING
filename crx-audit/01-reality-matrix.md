# DELIVERABLE 1 — REALITY MATRIX

**Audit date:** 2026-09-22 ~19:36–20:10 MDT · **HEAD:** `cc6856c3bc78e0535e66f168c66dc31abee2c073` · branch `refactor/runtime-authority-convergence`
**Method:** strictly read-only (Pig bridge `cat`/`sed`/`grep`, read-only `SELECT`s, `docker ps`/`logs`/`inspect`, read-only HTTP GETs). No installs, no edits, no commits, no restarts.
**Full evidence:** `partials/agent-{a,b,c,d,e,f}-*.md`. Classifications use the strongest actually supported; nothing upgraded. OBSERVED FACT vs SUPPORTED INFERENCE vs UNRESOLVED marked in partials.

**Topology caveat (UNRESOLVED, grill-blocking):** Agent A found gateway env (`POSTGRES_HOST=host.docker.internal`, port 5432, db `ping_runtime`) resolving to **brain-postgres** (2321 `ping_events`) as the live store, with ping-postgres/crx_runtime (739 events) as the stale twin. Agents C and D surveyed ping-postgres/crx_runtime. Which DB the live gateway writes is NOT settled read-only — see `09-minimal-patch-queue.md` grill and index. Rows below cite whichever store each lane verified; do not mix counts.

## Event spine (the one proven plane)

| COMPONENT / PATH | PURPOSE | CALLER | PERSISTENCE / IDENTITY | CLASSIFICATION | EVIDENCE | DUPLICATE/SHADOW? | SPRINT RELEVANCE |
|---|---|---|---|---|---|---|---|
| `ping-runtime/events/unified_event_runtime.js` → `ping_events` | canonical append-only event journal | workers, routes, `gateway_runtime.js` | PG `ping_events`; deterministic SHA-256 `event_id`; `namespace`/`causation_id`/`correlation_id` | RUNTIME_PROVEN | live boot path; 739 (crx_runtime) / 2321 (ping_runtime) rows observed; emitted==persisted | `canonical_events`, `events`, `repository_events`, `mission_events`, `event_outbox` tables all 0 rows — dead schema traps, ARCHAEOLOGICAL | FOUNDATION — everything projects from here |
| `CanonicalizationService` (`ping-runtime/canonicalization/canonicalization_service.js`) | ingress identity: namespace auth, logical identity, canonical hash | `gateway_runtime.js:575` emitter wiring | `{id, canonical_hash}` envelope | RUNTIME_PROVEN | `resolveNamespace`/`authorizeNamespace` `:44-80`; `canonicalizeAndEmit` `:96-160` | none | KEEP — the ingress boundary |
| `EventGovernance` (`ping-runtime/events/event_governance.js`) | event-type/ownership/namespace policy at emit | `UnifiedEventRuntime.emit` | fail-closed rejection | RUNTIME_PROVEN | `:152-190`; emit fails closed `:106-119` | none | KEEP — ingress policy is the only enforced policy |
| `runtime/kernel/replay/` (`deterministic_replay_engine.ts`, `replay_verification.ts`) | deterministic replay | kernel paths | replay IDs via CanonicalIdentityService | SOURCE_PRESENT (declared PROVEN in YAML; agent-F found TS kernel call sites) | import/call-site greps | `gateway/replay_verifier.js` legacy side | verify before sprint builds on it |
| Witness (`gateway/witness_recorder.js`, `runtime/kernel/witness/`) | witness records | workers | witness rows | SOURCE_PRESENT | code exists; live production uncertain | no single WitnessAuthority class | P2 |

## Identity (three-way split — convergence undecided)

| COMPONENT / PATH | PURPOSE | CALLER | CLASSIFICATION | EVIDENCE | SPRINT RELEVANCE |
|---|---|---|---|---|---|
| `ping-runtime/authorities/identity_authority.js` + `deterministic_id_authority.js` | live JS identity | emit path | RUNTIME_PROVEN | emit path uses it | convergence candidate |
| `runtime/kernel/identity/canonical-identity-service.ts` | TS canonical identity | replay-authority.ts, scheduler-authority.ts, canonical-id-generator.ts | SOURCE_PRESENT (NOT bypassed — agent-F correction) | import+call-site greps | convergence candidate |
| Python identity authority | legacy/other path | python workers | ARCHAEOLOGICAL/SOURCE_PRESENT | `IDENTITY_SEMANTIC_SPLIT.md` documents split, omits TS service | convergence candidate |
| `cryptographic-authorities.ts` | SHA-256 | — | SOURCE_PRESENT / BROKEN | YAML flags fake SHA-256 (bit-shift string hash) still present | P0 security — out of sprint scope but must not be forgotten |

## Mission / worker / execution

| COMPONENT / PATH | PURPOSE | CLASSIFICATION | EVIDENCE | SPRINT RELEVANCE |
|---|---|---|---|---|
| `MissionRuntime` (`ping-runtime/orchestration/mission_runtime.js`) | mission lifecycle, idempotent create, conditional transitions | RUNTIME_PROVEN | 144/144 missions completed live; `sha256(missionType:event_id)` IDs | KEEP |
| `WorkerRuntime` + `canonical_workers.js` | 6 canonical JS workers + dormant IntelligenceWorker; lineage-preserving `_emit` | RUNTIME_PROVEN | `causation_id`/`correlation_id`/`confidence_source` propagation `:31-84` | KEEP — the execution path |
| Run unit (`run_id`, RunRuntime, `ping_runs`) | per-attempt durable identity | MISSING | zero hits repo-wide | P0 gap — grill |
| `gateway/execution_authority.js` | execution authority | SOURCE_PRESENT / DORMANT | zero `new ExecutionAuthority` outside tests | decide: wire or remove |
| Phase-15 `MissionExecutionAuthority` (autonomous coding loop) | mission→memory→prompt→Ollama→patch→tests→approval→commit | SOURCE_PRESENT / DORMANT | never instantiated live; `mission_executions` 0 rows; `memory_*` tables don't exist | decide: the agent loop lives here or nowhere |
| `ApprovalAuthority` (`gateway/approval_authority.js`) | human gate | RUNTIME_PROVEN (narrow) | commit-scoped policies only; `approvals` table | NOT a general HumanDecision — gap |
| Orca ExecutionEngine (`ping-runtime/orchestration/execution/engine.js`) | parallel execution authority | SOURCE_PRESENT (booted, non-spine) | in-source "NOT the production spine"; `worker_memory/opencode` 0 bytes | boundary note |

## Memory (one live degraded dataflow + ~10 phantoms)

| COMPONENT / PATH | PURPOSE | CLASSIFICATION | EVIDENCE | SPRINT RELEVANCE |
|---|---|---|---|---|
| Event-sourced context (`EventReadAuthority`, `GET /context/*`) | working-memory read API | RUNTIME_PROVEN / UNCONSUMED | 7 live routes; zero in-repo callers; zero hits in 9h logs | P2 — natural agent-context feed |
| `EmbeddingService` → brain-qdrant `knowledge` | vector projection of 19 event types | RUNTIME_PROVEN (write) / DEGRADED (quality) | logs "Projected … → qdrant point"; session health embedded:0 fallback:30; 52% seeded-PRNG fallback vectors; root cause: Ollama unreachable (`ping-ollama` bad hostname) | P0 — fix reachability or pause projection |
| `HybridSearch` (`POST /knowledge/search`) | retrieval front door | RUNTIME_PROVEN / UNCONSUMED | live route; 0 hits in 9h; no auth; caller-asserted namespace; post-retrieval JS filter only | P1 — wire a consumer or acknowledge shelfware |
| `EvidenceAuthority.verify/rank` | hash+namespace verification, confidence×provenance×approval ranking | RUNTIME_PROVEN | `verify()` lines 76–110; fallback ×0.5 | KEEP — best-designed piece; `checks.lineage=true` asserted not verified |
| KnowledgeGraph (`knowledge_nodes` 197, all `candidate`; `knowledge_edges` 0) | candidate node store | RUNTIME_PROVEN (write) / STARVED (promotion) | psql GROUP BY; name collision with `gateway/knowledge_graph.js` (different, in-memory) | P1 — promoter has no emitter |
| `KnowledgePromoter` | candidate→approved on human signal | RUNTIME_PROVEN (registered) / STARVED | `SNIPPET_APPROVED`/`AI_RESPONSE_ACCEPTED` never emitted in prod | needs emitter or removal |
| ConversationMemory, 4× gateway `memory_*_authority.js`, AgentMemoryAuthority (752 lines), Phase-A RAG trio, python projectors, ai-stack "CRX Memory Engine" (snapshot-only stub) | various | DOCUMENTED_ONLY / ARCHAEOLOGICAL / PHANTOM | zero callers each (verified by grep); `conversations` collection never created | REMOVE candidates — each is a trap for the next reader |
| OpenWebUI (`webui.db` 146MB) | chat history + RAG | RUNTIME_PROVEN (external) | own SQLite; not projected from spine | SILO — boundary note |

## MCP / tool execution (no live path exists)

| COMPONENT / PATH | PURPOSE | CLASSIFICATION | EVIDENCE | SPRINT RELEVANCE |
|---|---|---|---|---|
| `beforeMCPExecution`/`afterMCPExecution` hooks | interception seam | PHANTOM | zero hits repo-wide; `gateway/hooks/` absent | do not plan on these names |
| `mcp/ping_mcp_server.py` | "MCP server" | ARCHAEOLOGICAL | no MCP SDK; `requests.get` to dead `mission-control:8000` | not a server; decide delete/archive |
| `gateway/tool_authority.js` | permission-checked tool exec | SOURCE_PRESENT / DORMANT | zero callers; fail-open (`!permissionAuthority → allow all`); no arg validation; stubs; `_postgres` never used; timestamp executionIds undedupeable | pick-one-or-greenfield grill |
| `gateway/tool_gateway.js` | validated/witnessed tool exec | SOURCE_PRESENT / DORMANT | zero callers; NO auth; weak validator (ignores JSON-Schema `required:[]`); deterministic IDs silently overwrite history on retry; witness hash excludes handler; `clear()` wipes audit | pick-one-or-greenfield grill |
| `gateway/inference_authority.js` | inference + tool manifest | SOURCE_PRESENT / DORMANT | builds manifest then discards it (dead variable); zero callers | — |
| `gateway/adapters/ollama_adapter.js` | provider seam (InferenceEngine) | SOURCE_PRESENT / BROKEN | TWO dangling requires (`infrastructure_adapter_interface`, `serializer_authority`); cannot load | re-establish or remove |
| `capability-authority.ts` | capability/permission system | SOURCE_PRESENT / UNCONNECTED | TS-only, no dist, zero JS consumers; tool modules reference a different nonexistent JS module | the gate to integrate with |
| MCP client config (`.mcp.json`, Cursor, Composio) | client invocation | MISSING | none found anywhere | — |
| TOOL_* events / `tool_calls` table | tool audit | MISSING | zero references; `unified_event_runtime.js` has zero "tool" hits | P0 — dispatch journal design |

## Observability (one real plane + phantom surfaces)

| COMPONENT | CLASSIFICATION | EVIDENCE | SPRINT RELEVANCE |
|---|---|---|---|
| Canonical events (`ping_events`) + `/events` lineage traversal API | RUNTIME_PROVEN | 739 rows with real causation/correlation chains; auth-gated routes | the ONE observability plane |
| Application logs | RUNTIME_PROVEN (unstructured, unqueryable) | `console.log` everywhere; no correlation IDs; `LOG_LEVEL=INFO` ignored by DEBUG spam | Pino ADOPT (1 tiny dep) |
| Health endpoints | RUNTIME_PROVEN but shallow | prove ~process existence; `event_runtime` hardcoded healthy; postgres (canonical store!) unchecked; `/ops/status` 500s in deployed build | fix or banner |
| Audit records (who-did-what) | MISSING | `audit_log` 0 rows, no writers; policy verdicts are memory-only counters | design |
| Metrics | MISSING | `metrics_port.js`, `telemetry_subsystem.js` unwired; `telemetry_metrics` 0 rows | vocabulary-first, no backend |
| Distributed traces | MISSING | no OTel packages in any package.json; `OTEL_*`/`LOKI_URL` env vars with zero readers | OTel GenAI shapes into ping_events (zero dep) |
| Prometheus/Grafana/Tempo/Loki | MISSING | no source, compose, containers, or data | do not cite |
| ui-next "live" dashboard numbers | FABRICATED | `Math.random()` latency/tokens next to pulsing "Live" indicator | remove or banner — worse than no dashboard |
| `generated_runtime_authoritative: true` | HARDCODED LITERAL | asserted by `/ops/*` while reporting empty/degraded internals | self-asserted authority anti-pattern |
| `lineage` table | 0 rows — dead schema | `LINEAGE_CREATED` events exist; lineage computed on read | trap; document or drop |
