# MISSION CONTROL COMPONENT INVENTORY — PING BACKEND HARVEST

Date: 2026-09-29. Scope: /home/nolan/ping main tree (worktrees excluded from
caller greps; node_modules/__pycache__ excluded). Method: read-only forensic
via pigwsl: read headers, grep require/import callers in main tree, check tests.
Four parallel lanes + targeted follow-ups. One lane errored on a runtime
restart; its gaps were re-covered with direct greps.

KEY FINDING: There is NO existing real Mission Control UI to harvest. The old
docker Mission Control died 2026-06-24 (stale artifacts prove it). Everything
real is backend data/API aggregation, and the strongest pieces are LIVE in the
gateway bootstrap path. Three duplicate event systems exist; one is canonical.

## CLASSIFICATION TALLY

- LIVE: 16
- PROVEN BUT UNWIRED: 19
- UI-ONLY: 0 (no real UI found)
- MOCK: 3
- DUPLICATE: 4 (2 confirmed superseded event systems + 2 duplicate-candidates)
- DEAD: 5
- UNSAFE: 0 confirmed (1 dev-only flag)
- UNKNOWN: 5 items flagged inline

---

## FULL CLASSIFIED TABLE

### MISSION / RUN / SCHEDULER

**1. ping-runtime/orchestration/mission_runtime.js — MissionRuntime**
PURPOSE: Single canonical mission system (header: "Replaces 12 dead mission
implementations"). Lifecycle created→assigned→running→completed/failed→archived;
retry lifecycle running→retry_pending→created (reclaimRetryPending,
backoff-gated); retry_pending rows never dispatched directly. Tenant-scoped
(immutable tenant_id, fail-closed). | LIVE CALLERS: gateway/bootstrap/gateway_runtime.js
(instantiates); gateway/mission_execution_authority.js, gateway/repositories/mission_repository.js,
gateway/control_center_subscription.js, gateway/materialized_views.js,
gateway/self_improvement_loop.js | DEPENDENCIES: pg.Pool, UnifiedEventRuntime |
DATA SOURCE: Postgres ping_missions (mission_id, status, priority, payload,
result, assigned_to, retries, retry_at, lease_until, claimed_at, error) |
AUTHORITY | CLASSIFICATION: LIVE | FYD USE: mission/run view — THE run primitive
for FYD generation missions | TEST: commissioning tests | VERDICT: HARVEST.
Reason: the live mission backend the Mission Control order asks for.

**2. ping-runtime/orchestration/mission_scheduler.js — MissionScheduler**
PURPOSE: MissionRuntime↔WorkerRuntime bridge: 5s poll of getPending(), conditional
claim, mission_type→worker dispatch, reclaimRetryPending (backoff-gated, every
attempt counted, F-01), terminal-fail on exhaustion, DLQ transition; unknown
effects HOLD, never auto-retry. Recently repaired: fail-closed dispatch
(2026-09-26), W6-postgres tenant authority on ping_events (2026-09-25). |
LIVE CALLERS: gateway/bootstrap/gateway_runtime.js (:75 require, :569 instantiate) |
DEPENDENCIES: MissionRuntime, failure_record.js, retry policy, pg | DATA SOURCE:
Postgres ping_missions | AUTHORITY (dispatch/retry transitions) | CLASSIFICATION:
LIVE | FYD USE: mission/run view, pipeline stages (poll→dispatch→complete→HOLD),
VERIFY | TEST: mission_scheduler.retry_watchdog.test.js, test_lane_b_tenant_threading.js |
VERDICT: HARVEST. Reason: live, tested retry/unknown/DLQ semantics.

**3. ping-runtime/orchestration/event_to_mission_bridge.js — EventToMissionBridge**
PURPOSE: Listens to business events on UnifiedEventRuntime, creates missions
workers can process. "The missing link between event emitted and worker
executes." Creates missions only, never modifies state. EVENT_MISSION_MAP
(event type→mission type+priority, normalized at one ingress boundary). |
LIVE CALLERS: gateway/bootstrap/gateway_runtime.js (:89 require) | DEPENDENCIES:
UnifiedEventRuntime, priority_boundary | DATA SOURCE: memory (map) | PROJECTION/adapter |
CLASSIFICATION: LIVE | FYD USE: ACQUIRE→mission creation pattern (FYD pipeline
events become missions) | TEST: test_priority_bridge_integration.js | VERDICT:
KEEP (wrap). Reason: live event→mission funnel.

**4. gateway/mission_authority.js — MissionAuthority (Ω.70)**
PURPOSE: Compiles Mission constitutional objects from ReflectionObjects and
RepositoryGraphs; "owns Mission object creation" for the autonomous-evolution
domain (repo self-modification), NOT FYD missions. | LIVE CALLERS: none (docs,
tests, audits only; NOT required by gateway_runtime.js) | DEPENDENCIES: postgres,
objectRegistry, witnessChain, MissionRuleAuthority | DATA SOURCE: Postgres + memory
cache | AUTHORITY (declared) | CLASSIFICATION: PROVEN BUT UNWIRED |
FYD USE: none direct | TEST: unknown | VERDICT: REJECT for FYD harvest.
Reason: unwired + wrong domain (self-modification missions, not product pipeline).

**5. gateway/mission_authority_v2.js — MissionAuthority V2 (Phase 36A)**
PURPOSE: "Every external request becomes a Mission. Nothing executes outside
MissionAuthority." Mission lifecycle, event-sourced, deterministic replay,
witnesses. | LIVE CALLERS: none (docs/tests only; NOT in gateway_runtime.js) |
CLASSIFICATION: PROVEN BUT UNWIRED | DUPLICATE-CANDIDATE vs #4 (adjacent mission
semantics, both unwired — do not merge without review) | FYD USE: mission/run
view semantics reference | VERDICT: REJECT for harvest now. Reason: unwired;
mission_runtime.js is the live path.

**6. gateway/mission_execution_authority.js, mission_execution_graph.js,**
**mission_generator.js, mission_planner.js, automatic_mission_generator.js,**
**mission_repository_port.js**
PURPOSE: mission-lifecycle/execution/graph/generator/planner machinery (headers
claim constitutional mission handling). | LIVE CALLERS: none found in
gateway_runtime.js or main-tree JS (docs/tests/audit mentions only) |
CLASSIFICATION: PROVEN BUT UNWIRED (each; not individually deep-dived) |
FYD USE: reference only | VERDICT: REJECT for harvest now. Reason: zero live wiring.

**7. missions/VerifyReplay/** — mission.yaml + proofs/execution.json +
results.json + workspace.json. A single recorded mission artifact (replay
verification), not a component. CLASSIFICATION: DEAD (evidence artifact).
FYD USE: fixture shape reference for what a mission record looks like.

### EXECUTION / FAILURE / RETRY

**8. runtime/authorities/execution_authority.py — ExecutionAuthority**
PURPOSE: Single choke point for subprocess execution. ExecutionRequest dataclass;
ExecutionAdapter Protocol; SubprocessExecutionAdapter; run/run_command/run_docker
all route through the configured adapter. | LIVE CALLERS: runtime/supervisor.py,
runtime/constitutional_event_loop.py, runtime/constitutional_runtime.py,
runtime/cognitive/worker_protocol.py, runtime/tool_router.py (all default adapter) |
Adapter subclasses: ZERO anywhere; "Temporal backend" claim aspirational |
DEPENDENCIES: stdlib only | DATA SOURCE: memory | AUTHORITY (enforced) |
CLASSIFICATION: LIVE | FYD USE: mission/run view execution backend; audit choke
point for FYD subprocess calls | TEST: tests/test_runtime_authority_boundaries.py |
VERDICT: KEEP (wrap for JS via thin bridge). Reason: only proven single-owner
execution choke point.

**9. ping-runtime/orchestration/failure_record.js — deriveFailureRecord()**
PURPOSE: Pure derivation: ping_missions row + dispatch outcome
(ok|worker_failed|worker_threw|no_worker|unknown) + retry policy → ledger-shaped
failure record. Standing law encoded: unknown→outcome:'unknown_hold',
status:'HOLD_RECONCILE', classification UNKNOWN_EXECUTION, literal "OUTCOME
UNKNOWN — RECONCILIATION IN PROGRESS"; unknown NEVER retried, NEVER resolves to
'failed'. failure_id derived (fl-+sha256 slice), never minted. Fail-closed
typed TypeErrors. | LIVE CALLERS: mission_scheduler.js (:39 require, :600/:911
calls) | DEPENDENCIES: node crypto only | DATA SOURCE: memory (pure) |
PROJECTION | CLASSIFICATION: LIVE | FYD USE: event timeline, health, VERIFY —
the exact UNKNOWN-handling semantic FYD needs | TEST: failure_record.test.js |
VERDICT: HARVEST. Reason: battle-encoded unknown semantics, tiny, tested, zero deps.

**10. gateway/retry_policy.js (+ gateway/dead_letter_authority.js)**
PURPOSE: Centralized retry policy: exponential backoff 1s→32s, 50% deterministic
jitter, retry limits, determineFailureReason() vocabulary
(timeout|network|validation|authorization|not_found|constraint|rate_limit|unknown),
permanent-failure detection, dead-letter transition. "No worker should invent
retry logic." | LIVE CALLERS: dead_letter_authority.js (:36, :117); itself
required by gateway_runtime.js (:92) | DEPENDENCIES: none | DATA SOURCE: memory |
AUTHORITY-adjacent (policy source of truth) | CLASSIFICATION: LIVE | FYD USE:
VERIFY stage retry policy; retry counts/DLQ in mission/run view | TEST: none
(covered indirectly via scheduler tests) | VERDICT: HARVEST. Reason: single
canonical retry policy; pairs with failure_record.js.

**11. ping-runtime/orchestration/execution/ (directory: engine.js,**
**mission_compiler.js, worker_state_machine.js, scheduler.js, …)**
PURPOSE: Self-contained "ExecutionEngine" world: compiles missions, schedules,
routes artifacts, runs worker ports (OpenCode/Ollama), MergeGate + dormant
classification. Internal agent-orchestration runtime. | LIVE CALLERS: only
orchestration/index.js (require.main report script → phase38_report.json);
nothing in gateway/ touches it | CLASSIFICATION: PROVEN BUT UNWIRED |
FYD USE: none direct | VERDICT: REJECT for harvest now. Reason: unwired parallel
runtime — harvesting it risks a second Mission Control.

**12. ping-runtime/orchestration/merge_gate.js** — static constitutional lint gate
(blocks Date.now/new Date/crypto.createHash/Math.random for IDs/direct
child_process; validateFile/validateGitDiff via execSync git diff). Live only via
the script path (engine.js/index.js). Dev tooling, not execution semantics.
CLASSIFICATION: PROVEN BUT UNWIRED (dev-only) | FYD USE: possible WRAP to lint
generated FYD code pre-serve | VERDICT: REJECT for product harvest. Flag: execSync
git diff must never enter a request path.

**13. ping-runtime/orchestration/proposal_pipeline.js** — worker proposal lifecycle,
file-JSON persistence, IDs minted via Date.now (violates merge_gate's own rule).
LIVE CALLERS: none. CLASSIFICATION: DEAD | VERDICT: REJECT.

**14. ping-runtime/orchestration/merge_queue.js** — proposal stage machine
(submitted→…→merged/rejected/archived), file-JSON. LIVE CALLERS: none.
CLASSIFICATION: DEAD | VERDICT: REJECT. (Note: stage vocabulary resembles a
proposal flow, but unwired/file-based — NOT the vehicle for FYD proposal/approval.)

**15. ping-runtime/orchestration/dispatcher.js** — misnamed: plans internal
repo-hygiene jobs (entropy reduction, witness improvement) over an
intelligence_graph. Repo self-improvement planner, not work dispatch.
LIVE CALLERS: none. CLASSIFICATION: DEAD | VERDICT: REJECT.

### EVENTS / OBSERVABILITY

**16. ping-runtime/events/unified_event_runtime.js — UnifiedEventRuntime**
PURPOSE: Single admission choke point. SHA-256 content-derived event_id
({eventType, source, namespace, logical_id/payload}); tenant isolation via
namespace (fail-closed); verdict-class admission gate — only canonical producer
workers in VERDICT_PRODUCERS may emit REPLAY_COMPLETED/WITNESS_CREATED/
WITNESS_REJECTED/LINEAGE_CREATED/JEV_DECISION_EVALUATED, with qualifying
provenance. | LIVE CALLERS: gateway_runtime.js (:434, with pg pool — production
spine); mission_runtime.js (mission lifecycle); events/event_bridge.js;
workers/canonical_workers.js (BaseWorker._emit); jev/shadow_worker.js;
routes/mission_control.js (UER.query() projections: /replay/stats, /witness/stats) |
DEPENDENCIES: constitutional_time_authority, identity_authority,
canonical_authority, event_validator, event_governance, pg | DATA SOURCE: Postgres
ping_events (bridges repository_events + canonical_events) | AUTHORITY (write
admission + verdict gate); query() is the projection feed | CLASSIFICATION: LIVE |
FYD USE: event timeline, evidence inspector, mission/run view, VERIFY verdict
stream | TEST: test_verdict_authority.js, test_correlation_chain.js,
test_witness_adversarial.js, EVAL-001..003, uer-spine-identity.test.js,
test_runtime_tenant.js | VERDICT: KEEP. Reason: the canonical event spine —
FYD Mission Control event timeline + verdict surfacing read from it.

**17. gateway/event_bus.js — ConstitutionalEventBus (DUPLICATE, legacy)**
PURPOSE: In-memory + self-minted-ID event bus writing its own events table.
Own header declares it LEGACY (deprecation 2026-09-24): never reaches
ping_events; "New code MUST use UnifiedEventRuntime.emit()". | LIVE CALLERS:
gateway/knowledge_compiler.js only | CLASSIFICATION: DUPLICATE |
VERDICT: REJECT. Keep frozen; migrate knowledge_compiler to UER before removal.

**18. ping-runtime/orchestration/execution/event_queue.js +**
**ping-runtime/orchestration/event_queue/ (20 JSON files)**
PURPOSE: Old Orca file-backed queue (one JSON/event, schema_version 3.0.0,
global_sequence). All 20 files timestamped 2026-09-24 10:10 — single stale write
burst. | LIVE CALLERS: none outside tests | CLASSIFICATION: DUPLICATE / DEAD |
VERDICT: REJECT. Historical reference only.

**19. ping-runtime/events/event_bridge.js — EventBridge**
PURPOSE: Polls repository_events + canonical_events (5s, per-source last-ID
cursors), dedups, re-emits through UER into ping_events. | LIVE CALLERS:
gateway_runtime.js (instantiate + start, ~:462-468) | CLASSIFICATION: LIVE |
FYD USE: ACQUIRE/EXTRACT funnel pattern | VERDICT: KEEP (wrap).

**20. ping-runtime/events/event_read_authority.js (kernel shim)**
PURPOSE: Query events by type/stream/correlation ID, stats, read models. Pure
delegation to runtime/kernel/event_read_authority.js. | LIVE CALLERS:
gateway_runtime.js (instantiates) | CLASSIFICATION: LIVE (thin; routes use
UER.query() directly instead — two read paths coexist) | FYD USE: event timeline
query surface — FYD should standardize on ONE read path (this or UER.query()) |
VERDICT: KEEP (wrap), with the one-read-path decision noted.

**21. ping-runtime/events/event_validator.js, event_governance.js,**
**standard_event_schema.js** — UER support: reject unknown event types, wrong
schema versions, missing authority owners (vs gateway/generated/event_registry.json);
namespace ownership. Validator machine-generated from manifests. Wired into UER.
CLASSIFICATION: LIVE | FYD USE: VERIFY (FYD events validate against same registry) |
VERDICT: KEEP (part of the UER spine).

**22. gateway/health_authority.js — HealthAuthority**
PURPOSE: Aggregates registered health-check functions into {status, uptime,
components}; "no health logic in controllers"; singleton. | LIVE CALLERS:
gateway_runtime.js (:43); api_controller.js (:16, /health delegates) |
DEPENDENCIES: none (memory map) | DATA SOURCE: memory | PROJECTION |
CLASSIFICATION: LIVE | FYD USE: health surface | TEST: unknown (has clear() for
tests) | VERDICT: KEEP (wrap) — natural home for FYD component health checks.

**23. gateway/trace_port.js — TracePort**
PURPOSE: Hides tracing (span/export) behind a port; names
OpenTelemetry/Jaeger/Zipkin providers as "Implementations" — NO provider files
found in repo; aspirational. | LIVE CALLERS: none (zero hits) | CLASSIFICATION:
PROVEN BUT UNWIRED (MOCK-adjacent until a provider is proven) | FYD USE: run
tracing if a real provider lands | VERDICT: conditional — harvest the port
abstraction only after a real provider exists.

**24. Structured log store** — none found (no logging dir; console.log-style
only). CLASSIFICATION: UNKNOWN (absent). Gap flagged: event-derived
observability exists; log aggregation does not.

### EVIDENCE / KNOWLEDGE / WITNESS

**25. ping-runtime/evidence/evidence_authority.js — EvidenceAuthority**
PURPOSE: accumulate(sourceEventIds) resolves backing events from ping_events;
verify() recomputes canonical hash + lineage + namespace consistency, traces
Qdrant hits back to a real PG event; rank() orders by confidence×provenance×
approval. ADD-only reads, never fabricates. | LIVE CALLERS: gateway_runtime.js
(:544, with pool); search/hybrid_search.js (verification leg) | DEPENDENCIES: pg
and/or UER, verifyCanonicalObject | DATA SOURCE: PG ping_events + Qdrant |
AUTHORITY (decides verifiable truth) | CLASSIFICATION: LIVE | FYD USE: evidence
inspector, VERIFY, Ask FYD retrieval verification | TEST:
evidence/test_evidence_authority.js, test_knowledge_search.js,
test_confidence_transport.js, test_confidence_convergence.js | VERDICT: KEEP.
Reason: the "retrieval returns only verifiable results" authority FYD needs.

**26. ping-runtime/search/hybrid_search.js — HybridSearch**
PURPOSE: Qdrant 768-d semantic search + EvidenceAuthority verification leg +
KnowledgeGraph context leg; every result carries {canonical_hash, namespace,
confidence, evidence:[eventIds], verified, source}; ADD-only. | LIVE CALLERS:
gateway_runtime.js (:549 instantiates) — but NO route references it (dead end) |
CLASSIFICATION: PROVEN BUT UNWIRED (live instantiation, no reachable surface) |
FYD USE: ACQUIRE (knowledge search for Ask FYD / evidence inspector) | TEST:
test_knowledge_search.js | VERDICT: HARVEST — attach to a real route instead of
rebuilding search; evidence-trace-on-every-result is exactly FYD's requirement.

**27. ping-runtime/workers/canonical_workers.js — WitnessWorker (~:503)**
PURPOSE: On REPLAY_COMPLETED verified:true with qualifying evidence emits
WITNESS_CREATED + attestation; on unverified replays REFUSES (WITNESS_REJECTED) —
never fabricates. UER verdict gate admits only source:'witness'. | LIVE CALLERS:
gateway_runtime.js (registerCanonicalWorkers ~:517); routes/mission_control.js
/witness/stats + /replay/stats (UER.query() projections) | CLASSIFICATION: LIVE |
FYD USE: VERIFY witness/attestation stream, event timeline | TEST:
test_witness_adversarial.js, test_witness_negpath.js | VERDICT: KEEP — the
verdict-gate pattern is the model for FYD's "verified" surface.

**28. ping-runtime/jev/shadow_worker.js — JevShadowWorker**
PURPOSE: Observes CLAIM_CREATED, runs typed decision providers independently of
the canonical pipeline, emits one JEV_DECISION_EVALUATED per claim through UER.
Zero execution authority; provider failures recorded, never swallowed, never
fabricated. | LIVE CALLERS: gateway_runtime.js (~:530); UER VERDICT_PRODUCERS
admits source:'jev-shadow' | CLASSIFICATION: LIVE | PROJECTION (observation-only) |
FYD USE: agent/decision inspector — the observe-and-record pattern for FYD agent
runs | VERDICT: KEEP (wrap).

**29. ping-runtime/events/repository_store.js — RepositoryStore**
PURPOSE: "Pure persistence only" — JSONB + BYTEA canonical_bytes, versioned
migrations, transaction boundaries; intended verify-before-append. | LIVE CALLERS:
gateway_runtime.js (repoStore) | CLASSIFICATION: LIVE (support) | FYD USE:
PROJECT (canonical artifact persistence under the evidence spine) | VERDICT: KEEP.

**30. gateway/artifact_authority.js — ArtifactContract producer**
PURPOSE: pure ArtifactContract (artifact + lineage); infra/witness/persistence
moved out. | LIVE CALLERS: UNKNOWN (caller grep not completed) | CLASSIFICATION:
UNKNOWN → treat as PROVEN BUT UNWIRED pending check | FYD USE: object inspector
(artifact + lineage), PROJECT | VERDICT: conditional — verify callers before wiring.

**31. ping-runtime/orchestration/artifact_store/ (3 JSON files) +**
**orchestration/execution/artifact_store.js** — file-based artifacts from the old
engine lane. CLASSIFICATION: DUPLICATE / DEAD | VERDICT: REJECT (same as old
EventQueue).

### APPROVAL / CAPABILITY / AGENT

**32. ping-runtime/approval/business_action_authority.js — BusinessActionAuthority**
PURPOSE: Human approval gate (2026-09-17): proposeAction({missionId, capability,
targetIdentity, preview, reason, evidence, risk, expirationSeconds}) →
PENDING_HUMAN; deterministic canonical-hash action IDs (action_<16hex>);
Postgres-or-memory storage. | LIVE CALLERS: none outside own dir + tests |
DEPENDENCIES: constitutional_time_authority, CanonicalAuthority | DATA SOURCE:
memory by default (pluggable storage never provided) | AUTHORITY (action/effect
identity + approval transitions; idempotency via derived IDs) | CLASSIFICATION:
PROVEN BUT UNWIRED | FYD USE: proposal/approval view — ONE decision, ONE
evidence link, approve/deny (Mission Control order step 4) | TEST:
approval_effect.test.js, approval_restart_durability.test.js | VERDICT: HARVEST —
highest-priority approval component. Needs a real storage backend wired
(currently memory-only) before production use.

**33. ping-runtime/approval/effect_authority.js — EffectAuthority**
PURPOSE: Canonical effect identity for idempotent external actions:
createEffect() binds proposedActionId + approvalId; deterministic effect_<16hex>
IDs; status AUTHORIZED; provider/attempt/result tracking. | LIVE CALLERS: none
outside own dir + tests | CLASSIFICATION: PROVEN BUT UNWIRED | FYD USE:
proposal/approval view (PROPOSED→EXECUTED chain, idempotency) | TEST: same as #32 |
VERDICT: HARVEST (with #32 as a unit).

**34. ping-runtime/runtime/tenant_capability_grant.js**
PURPOSE: Typed validation boundary for tenant-scoped capability grants (W5):
fixed schema + fixed capability vocabulary + operational-purpose allowlist
(learning purposes rejected); break-glass grants (≤15 min, least-privilege,
audited). Header: "This is NOT an authority." | LIVE CALLERS: only its own test
requires it (one lane reported "LIVE in grant flows" from prior knowledge —
unverified; the actual grep found test-only) | DEPENDENCIES: none (pure) |
DATA SOURCE: memory | CLASSIFICATION: PROVEN BUT UNWIRED | FYD USE:
PLAN/EXECUTION grant checks; the typed grant shape TenantOS needs |
TEST: test_tenant_capability_grant.js | VERDICT: HARVEST. Reason: tested,
dependency-free, smallest integration unit for the approval→execution boundary.

**35. ping-runtime/connectors/capability_registry.js — CapabilityRegistry**
PURPOSE: Capability→provider registry with full metadata (operations,
requiredPermissions, defaultProvider, connected, lastVerified) — PING reasons
about what it CAN do. Initialized from constitutional_capability_contract;
providers register at runtime. | LIVE CALLERS: gateway_runtime.js (:84) |
DEPENDENCIES: ./constitutional_capability_contract | DATA SOURCE: memory |
CLASSIFICATION: LIVE | FYD USE: PLAN (capability discovery before proposing
actions); agent inspector ("what can this agent do") | TEST: none found |
VERDICT: HARVEST. Reason: live; capability discovery is prerequisite for
propose→approve→execute. DUPLICATE-CANDIDATE: orchestration/execution/
capability_registry.js is a separate worker-name registry class (unwired, only
used by execution/engine.js) — same class name, different purpose; do not merge
without semantic review.

**36. ping-runtime/feedback/feedback_contract.js**
PURPOSE: Narrow typed boundary TenantOS business truth ↔ PING execution/learning
(W9): raw observation → tenant-private canonical event → three branches
(task-ephemeral receipt, tenant knowledge, learning gate with ≥10-tenant
aggregation + materiality check). UNKNOWN defaults to TENANT_PRIVATE (fail
closed). Header: "not an authority and not a database." | LIVE CALLERS: none
(test only) | DEPENDENCIES: node crypto | CLASSIFICATION: PROVEN BUT UNWIRED |
FYD USE: VERIFY/learning boundary; evidence inspector handling-class discipline |
TEST: test_feedback_contract.js | VERDICT: HARVEST (deferred) — wire only when
the FYD learning/evidence path opens; not needed for run-view-first.

**37. ping-runtime/agents/agent_memory_authority.js** — 752 lines. Event-sourced
multi-tier agent memory (working/long-term/execution/architectural/failure),
replayMemory, factory. No stub markers. | LIVE CALLERS: none found |
CLASSIFICATION: PROVEN BUT UNWIRED | FYD USE: agent inspector | VERDICT: HARVEST
(deferred) — real structure, but agent memory is not in the run-view-first sequence.

**38. ping-runtime/agents/base_worker.js** (88 lines: subclass implements
process(job); workers must use Authorities/TransactionBoundary/Outbox) and
**worker_port.js** (Tier-2 port hiding worker ops). Callers: base_worker ←
replay_worker only; worker_port ← none. CLASSIFICATION: PROVEN BUT UNWIRED |
VERDICT: WRAP (worker contract/port patterns).

**39. ping-runtime/agents/replay_worker.js** — 27 lines. Thin ReplayWorker adapter:
deserialize job, delegate to ReplayAuthority, append REPLAY_COMPLETED to outbox.
| LIVE CALLERS: none | CLASSIFICATION: PROVEN BUT UNWIRED | VERDICT: WRAP.

**40. ping-runtime/workers/worker_runtime.js — WorkerRuntime v1**
PURPOSE: register(name, worker, {eventTypes, maxConcurrent, capabilities}) +
dispatch + stats. Header claims "Extracted from 38 worker implementations" —
UNVERIFIABLE from the tree. | LIVE CALLERS: gateway/test_commissioning.js only
(test script); mission_scheduler.js references in comments only |
CLASSIFICATION: PROVEN BUT UNWIRED (consolidation claim UNKNOWN) | FYD USE:
mission/run view execution layer | VERDICT: HARVEST (wrap) — verify the
consolidation claim before treating as canonical.

**41. ping-runtime/temporal/workflows/mission_workflow.js +**
**activities/mission_activities.js** — Temporal durable workflow: approval SIGNAL
+ QUERY, wait-with-timeout for human decision, then execute. BUT executeWorkOrder
is a SELF-DECLARED STUB ("ExternalAgentAdapter is in feature/
external-agent-hardening branch"); ExternalAgentAdapter absent from main tree.
| LIVE CALLERS: temporal_integration.test.js only | DEPENDENCIES: @temporalio
(infra liveness unverified) | CLASSIFICATION: PROVEN BUT UNWIRED (approval
signal/query pattern) / MOCK (agent-execution activity) | FYD USE: proposal/
approval view (durable approval-signal pattern) | VERDICT: harvest the approval-
signal pattern; REJECT the stub.

**42. scripts/skill_registry.py** — 40 lines. register_skill() writes a HARDCODED
"Replay Verification" skill (confidence 0.96, fabricated constants) to
knowledge/skills/<mission>.json; knowledge/skills/ does not exist → never ran.
CLASSIFICATION: MOCK / DEAD | VERDICT: REJECT.

**43. mcp/ping_mcp_server.py** — 215 lines. Docstring claims "Thin proxy to
Mission Control" but: no mcp SDK import, no tool registration, no stdio/JSON-RPC —
plain functions calling requests against http://mission-control:8000 (dead since
2026-06-24). CLASSIFICATION: MOCK | VERDICT: REJECT as MCP server.

**44. ping-runtime/agents/distributed_desktop_agents.js** — 713 lines. Registers
machines as uniform RuntimeIdentity agents (capabilities/health/queue).
Real-looking, no stubs. | LIVE CALLERS: none | CLASSIFICATION: PROVEN BUT
UNWIRED | FYD USE: none for FYD scope | VERDICT: REJECT for FYD — flag for infra
lane (desktop fabric, not mission pipeline).

### UI COMPONENTS

**45. ping-runtime/orchestration/dashboard.js — ExecutiveDashboard** (229 lines)
PURPOSE: NOT a UI — pure JSON data-aggregation class: generate() builds an
executive report from graph/classifier/certifier/queue/dispatcher/memory/pipeline
summaries. Zero HTML/HTTP/render lines. | LIVE CALLERS: orchestration/index.js
(ConstitutionalOrchestrator), itself zero callers (dead entry point); repo's own
dormant-classifier marks it dormant | DATA SOURCE: in-memory summaries |
PROJECTION | CLASSIFICATION: PROVEN BUT UNWIRED | FYD USE: mission/run view +
pipeline stages (report-shape pattern) | TEST: none | VERDICT: WRAP the aggregate
shape (production/dormant counts, queue stats, closure rate); reject the
repo-intelligence domain specifics.

**46. gateway/constitutional_mission_control.js — ConstitutionalMissionControl**
(428 lines) — Real Postgres-backed dashboard-data builder for autonomous-
evolution missions (repo discovery queue, technology scores, refactor
opportunities). NOT FYD missions. Zero JS callers; dormant-classified. |
CLASSIFICATION: PROVEN BUT UNWIRED | FYD USE: mission/run view (active-missions
section pattern: mission_id/type/title/status/priority, capped slices) |
VERDICT: WRAP the pattern; REJECT the tech-evaluation domain as FYD UI content.

**47. mission_control_knowledge_apis.py** (733 lines, Flask, repo root)
PURPOSE: GET /knowledge/search|related|lineage|research|documents. Internal:
Mission Control → Constitutional Search → Qdrant → PostgreSQL verification. No UI
consumer; the docker Mission Control it served exited 2026-06-24. | LIVE CALLERS:
none (June audit docs only) | DEPENDENCIES: psycopg2 (DB crx_runtime — STALE vs
live ping DB), qdrant_client, Flask | DATA SOURCE: Qdrant + Postgres |
PROJECTION | CLASSIFICATION: PROVEN BUT UNWIRED | FYD USE: evidence inspector,
Ask FYD tracing (search + lineage + related) | TEST: UNKNOWN (none found) |
VERDICT: HARVEST — the read surface an evidence inspector needs; re-point DB on
harvest.

**48. mission_control_authority_endpoint.py** (129 lines, FastAPI, repo root)
PURPOSE: Docstring says "light-weight stub … does not implement complex
resolution logic" — but POST /authority/resolve executes REAL Postgres reads
(authorities, authority_supersession, lineage, events) and returns authority-
chain + why-source-won. Honest code, false label. | LIVE CALLERS: none (June
audit docs only) | DATA SOURCE: Postgres | PROJECTION (authority-resolution
readout) | CLASSIFICATION: PROVEN BUT UNWIRED | FYD USE: object/evidence/site
inspectors — the "why this" explanation pattern | TEST: UNKNOWN | VERDICT:
HARVEST — read-only authority readout maps directly onto Why This.

**49. docker_mission_control_state.json / docker_mission_control_logs.txt** —
stale June-2026 artifacts (container state char-dump; Qdrant docker logs
2026-06-24). CLASSIFICATION: DEAD | VERDICT: REJECT (forensic info only).

Docs (all docs-only, none are components — REJECT as harvest targets):
- MISSION_CONTROL_CONSTITUTIONAL_CAPABILITIES.md (June-2026 audit; endpoints were
  on the dead docker service)
- vault/capabilities/MISSION_CONTROL_CAPABILITY_MATRIX.md (June-2026 matrix;
  some entries honestly marked placeholder)
- WAVE_3C_CONSTITUTIONAL_OPERATIONS_DASHBOARD.md (16-page read-only dashboard
  SPEC, explicitly "No code changes" — NEVER BUILT; its read-only-projection
  philosophy is a usable UI-design input)
- OPENWEBUI_MISSION_CONTROL_INTEGRATION.md (integration explicitly "NOT IMPLEMENTED")
- docs/MISSION_LIFECYCLE_AND_ROUTING.md (lifecycle reference doc)

---

## TOP HARVEST CANDIDATES FOR THE FYD BACKEND

1. **mission_runtime.js + mission_scheduler.js** — the live mission/run/retry
   backend (Postgres, tenant-scoped, fail-closed dispatch, HOLD on unknown).
   FYD generation becomes a mission with stages; this is the run primitive.
2. **failure_record.js** — battle-encoded UNKNOWN→hold-and-reconcile semantics,
   pure function, tested, zero dependencies. The FYD correction-survival arrow
   needs exactly this.
3. **unified_event_runtime.js** — the canonical event spine (PG ping_events,
   verdict-gated admission). Mission Control is a projection over this; FYD
   actions emit here, MC reads here. No second logging universe.
4. **evidence_authority.js** — retrieval verification (canonical hash + lineage +
   namespace). The evidence inspector's authority.
5. **hybrid_search.js** — semantic + verified retrieval, instantiated but with no
   HTTP route. Attach it to a route instead of rebuilding search for Ask FYD.
6. **approval/business_action_authority.js + effect_authority.js** — human approval
   gate (PENDING_HUMAN + preview + evidence + risk + expiry) with idempotent
   effect_<16hex> identity. The missing FYD proposal→approve→execute arrow.
7. **tenant_capability_grant.js** — typed, dependency-free capability-grant
   validation for the approval→execution boundary.
8. **mission_control_knowledge_apis.py** — /knowledge/search|lineage|related read
   surface for the evidence inspector and Ask FYD tracing (re-point DB from
   crx_runtime on harvest).
9. **mission_control_authority_endpoint.py** — authority-resolution readout; the
   Why This explanation pattern for object/evidence/site inspectors.
10. **health_authority.js** — health aggregation singleton; home for FYD component
    health checks in Mission Control.
11. **event_to_mission_bridge.js** — live event→mission creation funnel; the
    pattern for FYD pipeline events becoming missions.
12. **gateway/retry_policy.js** — single canonical retry policy (backoff, jitter,
    failure vocabulary, dead-letter); pairs with failure_record.js.

## UI COMPONENTS: HARVEST VS REJECTED

Worth harvesting (patterns/backend read surfaces, NOT wholesale UI):
- mission_control_knowledge_apis.py (#47) — evidence-inspector API shape.
- mission_control_authority_endpoint.py (#48) — Why-This readout shape.
- dashboard.js ExecutiveDashboard (#45) — aggregate report shape (counts, queue
  stats, closure rate).
- constitutional_mission_control.js (#46) — active-missions list section pattern.
- WAVE_3C spec (doc) — read-only-projection UI philosophy as design input.

Rejected:
- No real Mission Control UI exists; the old docker one died 2026-06-24.
- All four UI docs are docs-only (one spec never built, one integration never
  implemented, two June audits of a dead service).
- docker_mission_control_state.json / logs.txt — stale artifacts.
- skill_registry.py, ping_mcp_server.py — MOCKs, not components.
- orchestration/execution/ directory — unwired parallel runtime; harvesting it
  risks a second Mission Control.
- proposal_pipeline.js / merge_queue.js / dispatcher.js — DEAD.
- gateway/mission_authority.js + v2 + generator/planner/execution files — unwired,
  wrong-domain (autonomous-evolution) or superseded by the live mission_runtime path.

## COULD NOT VERIFY (UNKNOWN — never invented)

1. gateway/artifact_authority.js live callers (grep incomplete; treat as
   PROVEN BUT UNWIRED pending one follow-up grep).
2. TracePort's named provider implementations (OpenTelemetry/Jaeger/Zipkin) —
   no files found; header list aspirational.
3. mission_control_knowledge_apis.py test coverage — none found.
4. mission_control_authority_endpoint.py test coverage — none found.
5. worker_runtime.js "extracted from 38 worker implementations" claim —
   unverifiable from the tree.
6. tenant_capability_grant.js liveness conflict: one lane reported "LIVE in grant
   flows" from prior knowledge; the actual main-tree grep found test-only
   callers. Treated as PROVEN BUT UNWIRED.
7. mission_generator.js / mission_planner.js / automatic_mission_generator.js /
   mission_execution_authority.js / mission_execution_graph.js /
   mission_repository_port.js — headers read, deep purpose not verified; all
   have zero live bootstrap callers.

## NOTES FOR THE WIRING PHASE

- Mission Control = projection: FYD ACTION → EXISTING AUTHORITY → EVENT (UER) →
  PROJECTION → MISSION CONTROL. No special MC database writes.
- Boundaries preserved: MISSION STATE != OBJECT STATE; RUN STATE != CANONICAL
  TRUTH; EXECUTION != AUTHORIZATION; AGENT OUTPUT != APPROVED TRANSITION;
  MISSION CONTROL != AUTHORITY; DASHBOARD != DATABASE OF RECORD.
- Event-read path decision needed: EventReadAuthority vs UER.query() — FYD
  should standardize on one.
- approval/* needs a real storage backend (currently memory-only) before
  production use.
- mission_control_knowledge_apis.py defaults to DB crx_runtime; re-point on harvest.
- No new authorities: use existing mission/execution/event/capability/evidence/
  projection primitives (per Nolan's order).
