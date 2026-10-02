# DELIVERABLE 5 — VERTICAL TRACE GAP REPORT

**Source:** `partials/agent-d-vertical.md` (full arrow table + evidence). Chosen path: the PING Core v1 live spine wired in `gateway/bootstrap/gateway_runtime.js` (the only non-test live instantiation): emitter → CanonicalizationService → UnifiedEventRuntime → EventToMissionBridge → MissionRuntime → MissionScheduler → WorkerRuntime → canonical workers → ping_events. Two adjacent non-live paths: Phase-15 autonomous coding loop (`MissionExecutionAuthority`, never instantiated) and Orca ExecutionEngine (booted, in-source "NOT the production spine").

**Verdict on the central question** — "can CRX explain and prove an agent action from input through memory, authorization, tool execution, result, observation, and future recall?" — **NO, not end to end.** CRX can prove what happened to an *event*. It cannot prove what an *agent* knew, was allowed to do, did with tools, or will remember — because on the live path no agent runs.

## Arrow-by-arrow

| # | Arrow | Verdict | Key evidence |
|---|---|---|---|
| 1 | REQUEST | PARTIAL | Ingress exists (emitters via `CanonicalizationService`, `gateway_runtime.js:575-580`); boot seeds synthetic events (`_seedBusinessEvents`); no live production ingress traced end-to-end |
| 2 | REQUEST IDENTITY | PROVEN | `resolveNamespace` + `authorizeNamespace` (`canonicalization_service.js:44-80`); `_logicalIdentity` idempotent identity (`:67-82`); `canonicalizeAndEmit` envelope (`:96-160`) |
| 3 | AGENT/EXECUTION IDENTITY | PARTIAL | PROVEN worker (`WorkerRuntime.register`, dispatch on eventTypes) and mission (deterministic `sha256(missionType:event_id)`, idempotent create). **ABSENT run** — no Run entity; scheduler attempt identity is an ephemeral JS Set lost on restart |
| 4 | MEMORY/CONTEXT RETRIEVAL | ABSENT (live path) | No live canonical worker reads any memory store — workers read only `event.payload`/`event.metadata`. IntelligenceWorker is dormant (`eventTypes:[]`). HybridSearch/Orca memory/Phase-15 tables exist but are disconnected from execution |
| 5 | RETRIEVED MEMORY IDENTITIES + PROVENANCE | ABSENT (live path) / PROVEN (subsystem) | HybridSearch returns `{id, canonical_hash, namespace, confidence, evidence:[source_event_id]}`. Counter-case: Orca `getContext` renders lossy plain text with no IDs/sources/timestamps — provenance destroyed by construction |
| 6 | DECISION | PARTIAL | PROVEN deterministic (`ClassificationWorker._categorize/_prioritize`, `RecommendationWorker._recommendAction` — rule tables, fully explainable). No Decision object/ID — the decision *is* the emitted event. LLM path dormant; if re-enabled, prompt/model/completion persisted nowhere |
| 7 | CAPABILITY/POLICY DECISION | PARTIAL | PROVEN ingress (`EventGovernance` rejects unregistered types/owner mismatch/namespace violation; emit fails closed). **ABSENT action-level** — `BaseWorker._emit` can emit any event type; `capabilities` recorded at register, never consulted. ApprovalAuthority is commit-scoped, not an action gate. No HumanDecision object |
| 8 | MCP/TOOL CALL IDENTITY | ABSENT | No MCP client/server in runtime; workers perform zero tool calls — no tool name, call ID, args hash |
| 9 | TOOL EXECUTION | ABSENT | No tool-execution records anywhere in live schema |
| 10 | RESULT IDENTITY | PROVEN | Every worker result reified as canonical event: deterministic SHA-256 `event_id`, `ON CONFLICT DO NOTHING` + semantic-collision fail-closed. Mission results in `ping_missions.result` JSONB |
| 11 | DURABLE STATE EFFECT | PROVEN | `ping_events` 739 rows, `ping_missions` 144 (all completed), `knowledge_nodes` 68 candidates with provenance, Qdrant upsert with `source_event_id`. DLQ wired. Caveat: qdrant unhealthy → vector leg degraded |
| 12 | EVENT/AUDIT/TRACE | PROVEN with one gap | Lineage preserved (`namespace`/`correlation_id`/`causation_id`/`confidence_source`); recursive-CTE trace queries. **GAP (proven): `MISSION_CREATED/ASSIGNED/STARTED/COMPLETED` carry no `causation_id`** — correlated via `payload.event_id`, not causally linked; strict causation walks stop at the mission boundary |
| 13 | MEMORY CANDIDATE | PROVEN | Graph subscriber creates candidates with `source_event_id`/`namespace`/`correlationId`/`confidenceProvenance` (68 live); EmbeddingService projects indexable types |
| 14 | MEMORY WRITE (approval-gated) | PARTIAL | Gate exists (`KnowledgePromoter`), but **no live producer emits approval events**; 0 approved nodes. Promotion wired but never fired |
| 15 | LATER RETRIEVAL | PARTIAL | `HybridSearch.search` composes semantic + `EvidenceAuthority.verify` + KG leg + `rank()`. Degraded now (qdrant unhealthy → semantic leg skipped). **Never consumed by agents** — HTTP only |

## The seven load-bearing gaps
1. **Memory retrieval on the execution path: ABSENT** — three memory implementations, zero owned by the execution path (sovereignty problem in miniature).
2. **Tool execution: ABSENT** — the auditable unit the question assumes does not exist in the runtime.
3. **Action authorization: PARTIAL** — ingress policy enforced; per-action capability checks and any general human gate absent.
4. **Run unit: ABSENT** — Mission→Run→Executions not in source.
5. **Causation gap:** mission lifecycle events lack `causation_id`.
6. **Recall loop: PARTIAL and degraded** — approval gate never fired; vector leg down; no agent consumes retrieval.
7. **Correction survival: BROKEN in source logic** — `addNode`'s `ON CONFLICT DO UPDATE` resets status to the projected value (`'candidate'`); re-emitted (deduplicated) events re-fire in-process handlers and would demote an approved node. Not yet fired live (0 approved nodes), but written to do it.
