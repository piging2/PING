# PING Gateway Route Inventory (static, evidence-only)

Date compiled: 2026-09-17. Compiled ONLY from captured evidence listed below. No live calls were made; the gateway is not reachable from this environment.

Scope rule followed: every row cites its evidence. Where two sources disagree, both are recorded and the conflict is marked. Where nothing proves it, the cell says UNKNOWN. No route was invented.

Auth vocabulary used:
- auth = ExteriorAuthMiddleware Bearer enforcement (401 anonymous). Principals evidenced: L1 agentId 'muse' ("Observe"), L2 agentId 'muse-level-2' ("Workspace Write"). Auth truth is the Postgres exterior_agent_credentials table. Bearer keys resolve only via `docker exec` on the Pig and never leave it.
- public = no auth, reachable anonymously.
- gap-UNKNOWN = a route family evidenced as reachable without auth where the current production posture is unproven (either a live-probed gap or a proposed-but-unapplied patch).

Proof vocabulary: PROVEN = verified by live probe or by mounted code plus a live family probe. PARTIAL = code-verified but live enumeration conflicts or is incomplete. EXPERIMENTAL / DIRECTION / UNPROVEN / UNKNOWN = as evidenced.

## Family A: event pipeline (auth)

| METHOD | PATH | AUTH SURFACE | AUTHORITY | REQUEST SHAPE | RESPONSE SHAPE | NAMESPACE BEHAVIOR | CAPABILITY REQUIREMENT | PROOF STATUS | EVIDENCE CITATION |
|---|---|---|---|---|---|---|---|---|---|
| POST | /events | auth | UnifiedEventRuntime over ping_events (canonical spine) | JSON {event_type, aggregate_id, event_data{...}, namespace?, logical_id?}. req.body.event_id is ignored; event_id is computed as sha256(eventType, source, [namespace], [logical_id or payload]). source is derived from the verified credential as api:<agentId> | 200 with canonical event_id (example: 3586f5ee8176bb708bfd4d4d4733f3e89a3ac2ab2c21d228b4db9e8cf3f80692 for OBSERVATION_CREATED). Errors: 401 anonymous; 403 Invalid namespace; 422 unknown event_type; 500 {error} on emit failure | Syntax validated only: must be core::<name> or tenant::<id>; malformed -> 403. Default core::system. Valid-but-unauthorized explicit namespace is still accepted (proven P0 gap) | Bearer L1 or L2. POST /events is the one write explicitly intended for L1 | PROVEN | PHASE0_CREDENTIAL_ROTATION_2026-09-17.md (proofs 2-4); thread-handoffs.md:274-278 (emit path); PHASE4 record sec 5 (live 200, api:muse source) |
| GET | /events | auth | UnifiedEventRuntime (write side); read side has a proven split: EventReadAuthority reads repository_events with ping_events as fallback | query params not evidenced | event rows; a reader may see a different store than the writer wrote (proven read/write split) | n/a (read) | Bearer L1 or L2 | PROVEN | thread-handoffs.md:158 (GET /events* routes), :221 (read/write split); interop-audit-2026-09-13.md Capability table (auth family) |
| GET | /events/:id | auth | UnifiedEventRuntime | path param event_id | single event row | n/a | Bearer L1 or L2 | PROVEN | PHASE4 record sec 5 (live replay tests); UI_HARVEST_SPEC_2026-09-17.md sec 17 |
| GET | /events/:id/descendants | auth | UnifiedEventRuntime (fixed recursive-CTE code path) | path param event_id | full causal chain array (verified 8-deep, depth 0..7) | n/a | Bearer L1 or L2 | PROVEN | PHASE4 record sec 5 ("GET /events/:id/descendants -> full 8-deep causal chain") |
| GET | /events/:id/ancestors | auth | UnifiedEventRuntime | path param event_id | ancestor chain; shares the fixed code path with descendants | n/a | Bearer L1 or L2 | PROVEN | PHASE4 record sec 5 ("ancestors/correlation endpoints share the fixed code path") |
| GET | /events/correlation/:id | auth | UnifiedEventRuntime | path param correlation id | correlated events (shape not further evidenced) | n/a | Bearer L1 or L2 | PROVEN | PHASE4 record sec 5 (shared fixed code path); continuity-audit-2026-09-13.md sec 3 step 4 (L1 spec) |
| POST | /events/processed | auth | EventReadAuthority -> event_processing table | worker event bookkeeping (processed marker) | UNKNOWN | n/a | Bearer (worker) | PROVEN | thread-handoffs.md:253 (PROVEN vocabulary row; workers/worker_runtime.py:65) |
| POST | /events/failed | auth | EventReadAuthority -> event_processing table | worker event bookkeeping (failed marker; retries counter increments, nothing reschedules) | UNKNOWN | n/a | Bearer (worker) | PROVEN | thread-handoffs.md:253, :291 (never retried by poller) |
| POST | /canonical-events | auth | TenantOS writers; bridge re-emits into ping_events | {event_type, ...}; caller-supplied source/actor accepted from body (self-asserted provenance, proven contradiction vs /events) | stats endpoint returns [] (dormant); POST response shape UNKNOWN | per-tenant sequence envelope (UUID PK); envelope path dormant (0 rows per Phase 4) | Bearer L1 or L2; L1-reachable write with ambiguous intent (only POST /events is explicitly intended for L1) | PROVEN | PHASE4 record sec 5 (401 anonymous), sec 6 (dormant, provenance contradiction); thread-handoffs.md:162 |
| POST | /ingest | auth | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Bearer L1 or L2; L1-reachable with ambiguous intent | PROVEN | PHASE4 record sec 5 (POST /ingest -> 401 anonymous); interop-audit-2026-09-13.md Capability table (auth family) |

## Family B: missions (auth)

| METHOD | PATH | AUTH SURFACE | AUTHORITY | REQUEST SHAPE | RESPONSE SHAPE | NAMESPACE BEHAVIOR | CAPABILITY REQUIREMENT | PROOF STATUS | EVIDENCE CITATION |
|---|---|---|---|---|---|---|---|---|---|
| GET | /missions | auth | MissionRuntime over ping_missions | query params not evidenced | mission rows; lifecycle created -> assigned -> running -> completed/failed -> archived | n/a | Bearer L1 or L2 | PROVEN | UI_HARVEST_SPEC_2026-09-17.md sec 17; PHASE0 report proof 5 (257 rows readable) |
| POST | /missions | auth | MissionRuntime over ping_missions; emits MISSION_CREATED into ping_events | mission fields; pre-fix bypass evidence: createdBy caller-supplied, source hardcoded 'mission-runtime' (missions.js:22). Current exact body schema: UNKNOWN | 200 with mission id (observed live: 3e6a7b3b453b1d98) | n/a | Bearer L1 or L2; L1-reachable write with ambiguous intent (only POST /events is explicitly intended for L1) | PROVEN | PHASE4 record sec 6 (pre-fix bypass), sec 7 (115: 401 anonymous, 200 authenticated); mission_runtime.js.live-20260917:63-85 (idempotent create) |

## Family C: capabilities and AI (auth; two public gaps)

| METHOD | PATH | AUTH SURFACE | AUTHORITY | REQUEST SHAPE | RESPONSE SHAPE | NAMESPACE BEHAVIOR | CAPABILITY REQUIREMENT | PROOF STATUS | EVIDENCE CITATION |
|---|---|---|---|---|---|---|---|---|---|
| POST | /capabilities | auth | CapabilityAuthority.authorize() | {capability, parameters}; capabilities include fs.list/read/write, fs.patch, repo.inspect, git.status/diff/log (+branch/checkout/commit for L2), process.list, service.inspect, knowledge.search, event.search. command.run/test.run/build.run hard-disabled; git.push blocked | capability result; audited to capability_requests | workspace-scoped to /app/workspace/muse; 10MB cap, 30s timeout, 5 concurrent, path containment | Bearer L1 or L2. LIVE OVER-GRANT: L1 "Observe" profile grants fs.write + fs.patch | PROVEN | interop-audit-2026-09-13.md sec 2 Capability table; sec 11 |
| GET | /discover | auth | CapabilityAuthority | none | capability discovery document (discovers capabilities, NOT routes; see answers-30.md) | n/a | Bearer L1 or L2 | PROVEN | interop-audit-2026-09-13.md sec 2 ("GET /discover (auth) for discovery") |
| GET | /capabilities/stats | public | UNKNOWN | none | UNKNOWN | n/a | none (auth gap, live) | PROVEN | interop-audit-2026-09-13.md sec 2 ("Gateway REST (auth gaps, live)") |
| POST | /ai/chat | auth | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Bearer L1 or L2; L1-reachable write with ambiguous intent | PROVEN | census-2026-09-13.md Observations 2 (sub-route name; family secured in Phase 3 per PHASE4 record) |
| POST | /ai/embed | auth | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Bearer L1 or L2; L1-reachable write with ambiguous intent | PROVEN | census-2026-09-13.md Observations 2 (sub-route name; family secured in Phase 3) |
| GET | /connectors/* | auth | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Bearer (any authenticated) | PROVEN | interop-audit-2026-09-13.md Capability table (auth family, Phase 3 secured) |
| POST | /connectors/sync | auth | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Bearer; L2 guard PROPOSED but NOT applied (census V12 was read-only) | PROVEN | census-2026-09-13.md V12 (proposed, not applied) |
| POST | /connectors/oauth/refresh | auth | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Bearer; L2 guard proposed not applied | PROVEN | census-2026-09-13.md V12 |
| POST | /connectors/oauth/revoke | auth | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Bearer; L2 guard proposed not applied | PROVEN | census-2026-09-13.md V12 |
| POST | /connectors/apikey | auth | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Bearer; L2 guard proposed not applied; L1 connector credential mutation is a live over-grant | PROVEN | census-2026-09-13.md V12; interop-audit-2026-09-13.md sec 11 |
| POST | /knowledge/* | gap-UNKNOWN | KnowledgeGraph | UNKNOWN | UNKNOWN | UNKNOWN | none enforced (unauthenticated graph mutation; patch proposed not applied) | PROVEN | census-2026-09-13.md V5 (proposed, not applied); write-surface classification (knowledge = LIVE unauthenticated PG writes) |

## Family D: /orchestration/* (ORCA engine; auth gap as last live-probed 2026-09-13)

Conflict note: live probes on 2026-09-13 found NO auth middleware on /orchestration (mount at gateway_runtime.js:790-791 applies none; asyncHandler is logging/error only). The hardening build at gateway-hardening/build/app/gateway/routes/orchestration.js instead assumes the mount middleware already authenticated every request and gates POSTs with requireLevel2 (agentId 'muse-level-2', else 403 FORBIDDEN). The hardening build is not necessarily production, so current production posture is UNKNOWN; last proven live state is unauthenticated.

All routes below are served by the ORCA ExecutionEngine, which is live-but-orphaned: initialized at boot, disabled by decision, executor null, in-memory missions (lost on restart), autonomous loop fabricates worker output inline at hardcoded confidence 0.85. Per contradiction R-1, any velocity/closure numbers from this family are synthetic; the honest mission data source is ping_missions + ping_events.

| METHOD | PATH | AUTH SURFACE | AUTHORITY | REQUEST SHAPE | RESPONSE SHAPE | NAMESPACE BEHAVIOR | CAPABILITY REQUIREMENT | PROOF STATUS | EVIDENCE CITATION |
|---|---|---|---|---|---|---|---|---|---|
| POST | /orchestration/missions | gap-UNKNOWN | ORCA ExecutionEngine (in-memory) | {type, target, priority, description, requiredCapabilities, metadata, files} | 201 {missionId, type, status, priority} | none (in-memory engine, no PG) | none enforced as last probed; hardening build requires L2 | PROVEN | thread-handoffs.md:85 (Auth: NONE, PROVEN); orchestration.js:57-100 (hardening build, requireLevel2) |
| GET | /orchestration/missions | gap-UNKNOWN | ORCA ExecutionEngine | query: status, limit (default 50) | [{id, type, target, status, priority, description, createdAt, consensus}] | none | none enforced as last probed | PROVEN | orchestration.js:103-129 |
| GET | /orchestration/missions/:id | gap-UNKNOWN | ORCA ExecutionEngine | path param id | {id, type, target, status, priority, description, files, createdAt, workerOutputs[{workerId, confidence, findingsCount}], consensus, consensusArtifactId, mergeArtifactId}; 404 {error:'Mission not found'} | none | none enforced as last probed | PROVEN | orchestration.js:131-156; thread-handoffs.md:88 |
| POST | /orchestration/missions/:id/dispatch | gap-UNKNOWN | ORCA ExecutionEngine.dispatchToAssignment | none (path param id) | {missionId, workers[{workerId, model, capability}], outputs[{workerId, promptLength, promptArtifactId}]}; the response IS the dispatch, the HTTP client is the executor | none | none enforced as last probed; hardening build requires L2 | PROVEN | thread-handoffs.md:88; orchestration.js:158-183 |
| POST | /orchestration/missions/:id/output | gap-UNKNOWN | ORCA ExecutionEngine.collectWorkerOutput | {workerId, findings, confidence, summary} | {proposalId, missionStatus, consensus{accepted}}; 400 if workerId missing; 404 if mission not found/resolved/worker unregistered | none | none enforced as last probed; hardening build requires L2 | PROVEN | thread-handoffs.md:89; orchestration.js:185-211 |
| GET | /orchestration/workers | gap-UNKNOWN | ORCA WorkerPortRegistry | none | {total, idle, running, workers[{id, model, capabilities, state, load, specialization, qualityScore, replayCompatibility}]} | none | none enforced as last probed | PROVEN | orchestration.js:215-236 |
| GET | /orchestration/engine | gap-UNKNOWN | ORCA ExecutionEngine.generateDashboard() | none | dashboard: repository, replay_coverage, certificates, constitutional_debt, capability_registry, worker_states, events, artifact_store, missions, merge_gate, velocity. SYNTHETIC caveat R-1 | none | none enforced (verified live 200 unauth 2026-09-13) | PROVEN | UI_HARVEST_SPEC_2026-09-17.md P-03 (verified 200 unauth 2026-09-13); orig-engine.js:419-522 |
| GET | /orchestration/engine/report | gap-UNKNOWN | ORCA ExecutionEngine.getReport() | none | dashboard plus high_priority_missions; manual CLI writes phase38_report.json | none | none enforced as last probed | PROVEN | UI_HARVEST_SPEC_2026-09-17.md P-04; orig-engine.js:650-664 |
| POST | /orchestration/engine/compile | gap-UNKNOWN | ORCA ExecutionEngine.compileMissions | none | {compiled, missions[{id, type, target, priority, description}]} | none | none enforced as last probed; hardening build requires L2 | PROVEN | orchestration.js:244-259 |
| POST | /orchestration/engine/loop | gap-UNKNOWN | ORCA ExecutionEngine.startAutonomousLoop | {maxIterations=3, minPriority=5, missionsPerIteration=3} | {resolved, results[{missionId, workerId, iteration}], dashboard}; loop fabricates outputs inline (R-1) | none | none enforced as last probed; hardening build requires L2 | PROVEN | orchestration.js:261-285; orig-engine.js:615-625 (fabricated findings) |
| POST | /orchestration/engine/git-diff | gap-UNKNOWN | ORCA ExecutionEngine.emitGitDiff | {diff} | {emitted, missionCount}; 400 if diff missing | none | none enforced as last probed; hardening build requires L2 | PROVEN | orchestration.js:287-298 |

## Family E: public read surfaces (deliberate) and legacy gaps

| METHOD | PATH | AUTH SURFACE | AUTHORITY | REQUEST SHAPE | RESPONSE SHAPE | NAMESPACE BEHAVIOR | CAPABILITY REQUIREMENT | PROOF STATUS | EVIDENCE CITATION |
|---|---|---|---|---|---|---|---|---|---|
| GET | /health | public | GatewayRuntime boot probe | none | 200 healthy (verified 2026-09-17). Boot probe: single SELECT 1, connectionTimeoutMillis 3000, no retry, no recovery. Pre-startup crash loop: connection refused. See answers-30.md for degraded semantics | n/a | none | PROVEN | PHASE0 report proofs 1-2; thread-handoffs.md:258 (gateway_runtime.js:141, :692-700) |
| GET | /ops/dashboard | public | SystemAuthority.getSystemState() | none | {version, generated_at, containers[{name,status,state,IMAGE,PrivatePort,PublicPort,uptime,created}], git{branch,pending_changes,recent_commits}, postgres{total_events,streams,event_types,oldest,newest}, qdrant{collections,total_points}, missions/replay counts, metrics{uptime_seconds,total_requests}}. Classified SENSITIVE_PUBLIC | n/a | none | PROVEN | UI_HARVEST_SPEC_2026-09-17.md P-01 (verified live 200 2026-09-12/13); discovery-2026-09-12 sec A |
| GET | /ops/system | public | SystemAuthority | none | system state (same family as dashboard) | n/a | none | PROVEN | UI_HARVEST_SPEC_2026-09-17.md P-01; PHASE4 record sec 5 (200) |
| GET | /ops/health | public | GatewayRuntime | none | health JSON (SAFE_PUBLIC) | n/a | none | PROVEN | PHASE4 record sec 5 (200); PHASE4 steering classification |
| GET | /ops/drift | public | GatewayRuntime | none | drift JSON (SAFE_PUBLIC) | n/a | none | PROVEN | PHASE4 record sec 5 (200) |
| GET | /ops/status | public | UNKNOWN | none | 500 live, empty body (pre-existing; ops.js:19 calls fingerprint.generate(), only getFingerprint() exists) | n/a | none | PROVEN | PHASE4 record sec 6; PHASE4 steering defects |
| GET | /governance | public | UNKNOWN | none | governance data; full NAMESPACE_OWNERS enumerates every valid event type (SENSITIVE_PUBLIC) | n/a | none | PROVEN | PHASE4 record sec 5 (200); PHASE4 steering classification |
| GET | /governance/stats | public | UNKNOWN | none | governance stats | n/a | none | PROVEN | PHASE4 record sec 5 (200) |
| GET | /constitution | public | UNKNOWN | none | constitution data (SENSITIVE_PUBLIC) | n/a | none | PROVEN | PHASE4 record sec 5 (200) |
| GET | /constitution/contracts | public | UNKNOWN | none | DI startup_order, authority contracts (SENSITIVE_PUBLIC) | n/a | none | PROVEN | PHASE4 steering classification |
| GET | /constitution/graph | public | UNKNOWN | none | 503 live ("Container not available", container not passed at gateway_runtime.js:785-799); latent 500 via bare buildDependencyGraph | n/a | none | PROVEN | PHASE4 steering defects; PHASE4 record sec 6 |
| GET | /runtime/fingerprint | public | UNKNOWN | none | CONFLICT: classified SAFE_PUBLIC (PHASE4 steering 2026-09-12) but observed -> 500 (census 2026-09-13) | n/a | none | PROVEN | PHASE4 steering classification vs census-2026-09-13.md Observations 3 |
| GET | /mc/* | public | MissionRuntime / MissionScheduler / DeadLetterAuthority / WorkerRuntime (per P-02) | none | CONFLICT R-5: interop-audit:85 says dashboard incl. queues/scheduler/workers reads; census-2026-09-13.md:56 says unpaid invoices, inboxes, queues, follow-ups. Both agree: GET-only, read-only-but-sensitive | n/a | none | PARTIAL | UI_HARVEST_SPEC_2026-09-17.md P-02 + R-5; thread-handoffs.md:247,260 (mission_control.js:242) |
| GET | /mc/scheduler | public | MissionScheduler | none | scheduler status (status-read only; no /schedule, /cron, /jobs, /tasks routes exist) | n/a | none | PROVEN | interop-audit-2026-09-13.md sec Scheduling:101 |
| GET | /system/* | public | UNKNOWN | none | sync.log, audit.json (read-only but sensitive) | n/a | none | PROVEN | census-2026-09-13.md Observations 1 |
| /tenants | /tenants | gap-UNKNOWN | TenantRegistry (ACTIVE DEVELOPMENT) | POST /tenants unauthenticated (per PHASE4 discovery) | UNKNOWN | tenant authority itself has no ownership verification; caller-supplied tenant_id with no checks | none enforced (auth gap) | PROVEN | PHASE4 steering discovery; gateway/routes/tenants.js exists (UI_HARVEST_SPEC sec 11); in degraded 503 list (thread-handoffs.md:258) |
| /deployments | /deployments | gap-UNKNOWN | UNKNOWN | unauthenticated PG-backed registry writes (LIVE per census 2026-09-13) | UNKNOWN | n/a | none enforced (auth gap; patch proposed not applied) | PROVEN | census-2026-09-13.md V1-V4; in degraded list |
| /runtime | /runtime | gap-UNKNOWN | UNKNOWN | unauthenticated PG-backed writes (LIVE per census) | UNKNOWN | n/a | none enforced (auth gap; patch proposed not applied) | PROVEN | census-2026-09-13.md V1-V4; in degraded list |
| GET/POST | /api/v1/repository | gap-UNKNOWN | UNKNOWN | unauthenticated PG writes (LIVE per census) | UNKNOWN | n/a | none enforced (auth gap; patch proposed not applied) | PROVEN | census-2026-09-13.md V1-V4, write-surface classification; in degraded list |
| * | /context | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | PROVEN (existence only) | thread-handoffs.md:258 (in degraded 503 list at gateway_runtime.js:692-700) |
| * | /canonical-events | auth for POST | see Family A | see Family A | see Family A | see Family A | see Family A | PROVEN | in degraded list; Family A row |
| POST | /customers, /reviews, /projects, /ai_workspace | gap-UNKNOWN | legacy HPP authorities (initialized gateway_runtime.js:488-507) | unauthenticated PG-backed writes; CONFLICT: PHASE4 record (2026-09-12) calls these a "dormant demo surface" while census (2026-09-13) probed them LIVE at 200 and NOT dormant | UNKNOWN | n/a | none enforced (auth gap; patch proposed not applied) | PROVEN | census-2026-09-13.md V7-V10 (probes 200, NOT dormant); PHASE4 record sec 6 ("Dormant demo surface") |
| POST | /api/v1/ollama | gap-UNKNOWN | OllamaProvider.queryModel | unauthenticated inference exec | UNKNOWN | n/a | none enforced (auth gap; patch proposed not applied) | PROVEN | census-2026-09-13.md V6; thread-handoffs.md:81 (discoverOllama:false at boot; DORMANT compute-only) |

## Routes evidenced as NOT existing

- No /schedule, /cron, /jobs, /tasks routes (interop-audit-2026-09-13.md:101).
- No route-metadata/route-listing endpoint (see answers-30.md).
- GET /capabilities 404'd live 2026-09-13 (UI_HARVEST_SPEC_2026-09-17.md sec 17).

## Conflict register (all conflicts recorded, none silently merged)

1. R-1: ORCA dashboard velocity/closure numbers are synthetic (disabled loop fabricates confidence 0.85 findings inline). Sources: orig-engine.js:615-625 vs execution-architecture-deep-audit-2026-09-16.md:178. UI impact: build Mission Control numbers from ping_missions + ping_events, never from /orchestration/engine.
2. R-3b: "no dashboard" (continuity-audit sec 3.5 = no NEW dashboard backend) vs "/mc/* dashboard reads exist" (interop-audit:85 = pre-existing JSON read endpoints). Resolution per UI_HARVEST_SPEC: not a true conflict, phrasing only.
3. R-5: /mc/* enumerated as scheduler/workers reads vs invoices/inboxes/follow-ups reads. Both agree public, GET-only, read-only-but-sensitive. Recorded in Family E row.
4. /orchestration auth: live-probed 2026-09-13 no-auth (thread 2, interop-audit sec 11) vs hardening build requireLevel2 (orchestration.js header comment). Current production posture UNKNOWN; last proven live state unauthenticated.
5. Legacy HPP write families: PHASE4 (2026-09-12) "dormant demo surface" vs census (2026-09-13) "LIVE unauthenticated PG writes, probes 200, NOT dormant". Recorded in Family E row.
6. /runtime/fingerprint: PHASE4 steering SAFE_PUBLIC vs census 500. Recorded in Family E row.
7. Namespace: syntax validated (403/422 proven) vs per-principal ACL absent (P0 gap item 1: valid-but-unauthorized explicit namespace still accepted). Not a source conflict; a proven design gap.

## Evidence source list

- ~/workspace/tandem/interop-audit-2026-09-13.md (route families, auth surface, capability contract, /orchestration no-auth, /capabilities, GET /discover)
- ~/workspace/ping-overnight/UI_HARVEST_SPEC_2026-09-17.md (P-01 to P-04, contradictions R-1, R-3b, R-5, sec 17 gaps)
- ~/workspace/goals/ping-gateway-exterior-agent-integration/hidden_files/audit-threads-2026-09-16/thread-handoffs.md (degraded route list, mission_control.js, vocabulary, success shapes, /orchestration trace)
- ~/workspace/gateway-hardening/build/app/gateway/routes/orchestration.js (ORCA-era route table with requireLevel2; hardening build, not necessarily production)
- ~/workspace/ping-overnight/drift-sources/PROVENANCE.md (extraction method for live files)
- ~/workspace/ping-overnight/drift-sources/mission_runtime.js.live-20260917 (mission lifecycle, idempotent create)
- ~/workspace/ping-overnight/PHASE0_CREDENTIAL_ROTATION_2026-09-17.md (health 200, POST /events 200, 403/422 errors, degraded key incident)
- ~/workspace/goals/ping-gateway-exterior-agent-integration/files/PHASE4_PIPELINE_COMPLETION_RECORD.md (live probes 2026-09-12: 401s, 200s, public route classification, bypass fix)
- ~/workspace/goals/ping-social-outreach-campaign/hidden_files/census-2026-09-13.md (write-surface classification, proposed-not-applied patches, /mc and /ai sub-route names)
- ~/workspace/ping-overnight/playbook/PLAYBOOK_SPEC.md and REPORT.md (PENDING_HUMAN, SNIPPET_APPROVED, KnowledgePromoter; used in answers-30.md)
