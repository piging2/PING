# PING UI CONTRACT MAP

Compact authoritative map. For the full decisions see ADR_UI_BOUNDARY_AND_PROJECTION_CONTRACT_2026-09-17.md; for the operation-level authority table see CAPABILITY_MATRIX_2026-09-17.md; for the evidence reconciliation see HARVEST_CONTINUATION_2026-09-17.md and UI_HARVEST_SPEC_2026-09-17.md. All files live in /home/hatch/workspace/ping-overnight/.

Status of this map: PROPOSED (follows the ADR; becomes ACTIVE only if Nolan approves the ADR).

## Quick answers

| Question | Answer |
|---|---|
| What is Mission Control? | The single operator surface. Authenticated projection over the same PING authorities: Command Center, Missions, Runs, Executions, Events, Workers, Automation Health, Knowledge (Artifacts, Evidence, Projections, Lineage), Governance (Authorities, Capabilities, Violations, Policies), System (Runtime, Infrastructure, Integrations, Settings). Sections exist only where real or clearly required capabilities justify them. "Control Panel" is retired as a separate name. |
| What is public web? | The PING tenant/product projection. Public UI over public gateway APIs only. BUILT_NOT_LIVE today; becomes a consumer of shared contracts, never its own CMS/auth/store/scheduler/database. |
| What is shared? | packages/ui (visual primitives/design system), packages/api-client (typed communication), packages/schemas (canonical projection contracts). One contract language, multiple projections. |
| What is authoritative? | PING constitutional authorities only: MissionRuntime/MissionScheduler over ping_missions, UnifiedEventRuntime over ping_events, ExecutionAuthority, DeadLetterAuthority, KnowledgePromoter, WitnessWorker, ReplayWorker. No UI invents authority. |
| What is read-only? | Everything the PublicPingClient can touch, by construction (no mutation request types exist in its type surface). Mission Control reads are read-only projections; its mutations are operator-gated constructors only (approval grant/deny, quarantine lift, dead-letter retry, knowledge promote). |
| What can mutate? | AuthenticatedPingClient: event emission (namespace syntax only, no ACL yet), mission creation, post-verification observation emission. OperatorPingClient: the human-gated constructors above. All mutations dispatch through the authority, never around it. |
| Which capability controls it? | Gateway-enforced capabilities; full matrix in CAPABILITY_MATRIX_2026-09-17.md (37 rows). Note: no canonical capability vocabulary exists for UI operations yet; every matrix capability name is PROPOSED pending that. |
| Which schema represents it? | Shared packages/schemas: Mission, Run, Execution, Event, Artifact, Evidence, Projection, Worker, Authority, Capability, AutomationHealth, Maturity, ProofStatus, Error, Pagination, Identity, Namespace, Correlation. Every projection schema carries maturity, proof_status, verified_at, evidence_ref, source. |
| Where does operational truth originate? | ping_missions + ping_events. ORCA dashboard closure rates are synthetic (disabled loop fabricates findings; orig-engine.js) and must never be production operational truth. |
| What maturity is each surface? | See the surface table below. Invariant: UI CLAIM <= BACKEND PROOF. |

## Trust surfaces and typed clients

```
PUBLIC (untrusted internet)
  -> PublicPingClient (read-only by construction; cannot express mutations)
  -> public gateway APIs only
  -> apps/web

AUTHENTICATED USER / CUSTOMER
  -> AuthenticatedPingClient (event emission, mission creation, post-verification observation emission)
  -> apps/web when signed in (future)

OPERATOR / ADMIN
  -> OperatorPingClient (human-gated constructors: approvals, quarantine lift, dead-letter retry, knowledge promote)
  -> apps/mission-control

PING GATEWAY (sole enforcement point)
  -> PING AUTHORITIES (Mission, Event, Execution, Evidence, Knowledge, Artifact, Projection, Identity)
```

The browser is never a security boundary. UI visibility is UX; gateway capability enforcement is security. Hidden buttons, disabled controls, client-side roles, and frontend routing are never authorization. Defense in depth: schema-level incapability for the public client plus mandatory gateway authorization.

## Surface to authority table (verified 2026-09-17)

| UI surface | Authoritative source | Maturity |
|---|---|---|
| Automation health cockpit | action-truth.jsonl, action-intent-ledger.jsonl, tandem/reconciliation/LATEST.json, cron definitions, capability-registry.json (readers only) | PROVEN (as daily chat report; interactive cockpit is CONTRACT_DEFINED) |
| Mission list + detail (Mission to Run to Execution to Event to Evidence) | MissionRuntime over ping_missions; UnifiedEventRuntime over ping_events | BUILT_NOT_LIVE (/mc/* JSON reads exist; no HTML; mission view is the largest missing primitive) |
| Approval queue (PENDING_HUMAN) | KnowledgePromoter, knowledge_nodes | DIRECTION (blocked on SNIPPET_APPROVED dispatch gap for the ordinary path) |
| Intent ledger viewer | action-intent-ledger.jsonl | DIRECTION (378 open intents, no terminal outcome) |
| Evidence chain walker | lineage worker records over ping_events | EXPERIMENTAL (conformance gap open; UI must not render lineage that does not exist) |
| Dead-letter browser | DeadLetterAuthority, repository_dead_letters, WitnessWorker, ReplayWorker | PROVEN store; UI is CONTRACT_DEFINED |
| Replay comparison | DeterministicReplayEngine, WITNESS_CREATED/REJECTED events | DIRECTION (REPLAY_VERIFY creates no mission in ordinary runtime today) |
| Capability console | capability-registry.json (discovery projection; observed reality wins) + capability_requests audit table | BUILT_NOT_LIVE (registry exists; cross-cron discovery projection missing) |
| Scheduler/jobs UI | cron definitions + live scheduler state (MUST read live scheduler, never cron .md files; R-4) | DIRECTION (no execution history anywhere today) |
| Quarantine UI | tandem quarantine records | DIRECTION (CLI exists; no board UI) |
| Campaign chain view | sweep runs.jsonl, pipeline.md, angle-performance.md, content queues | PROVEN machinery; UI is CONTRACT_DEFINED |
| Knowledge dossier viewer | tandem/knowledge/dossiers/*.json | BUILT_NOT_LIVE (JSON exists; no viewer) |
| Knowledge graph browser | KnowledgeGraph nodes/edges (provenance on every edge) | DIRECTION (waits on A-62 conformance gap) |
| System/platform dashboard | /ops/dashboard JSON (SENSITIVE_PUBLIC; line-by-line review required before any public exposure) | PROVEN (JSON API; no HTML) |
| Cost per outcome | per-execution token/cost capture (does not exist yet) | UNPROVEN |
| Tenant UI | TenantRegistry (ACTIVE DEVELOPMENT; isolation claimed, enforcement unverified). tenant.ping.v1.json does NOT exist on disk; treat as DIRECTION, not an existing authority (R-7) | DIRECTION |
| Public website | shared contracts + public gateway APIs; tenant/product projection | BUILT_NOT_LIVE (14 sections, uncommitted, :3000 verified 200; HPP frozen and untouched) |
| ORCA dashboard | ORCA ExecutionEngine (own private EventQueue, in-memory missions) | SYNTHETIC (preserved, classified; never operational truth) |

Requirement reconciliation totals (HARVEST_CONTINUATION_2026-09-17.md): 9 EXISTS, 17 PARTIAL, 12 MISSING, 0 LEGACY/SYNTHETIC/DUPLICATE/UNKNOWN among the section 16/17 requirement rows.

## Projection rules (binding)

1. Screens are projections over the same authorities. Never create competing data models per screen.
2. Fail-closed rendering: unreadable state renders Unavailable/UNKNOWN, never silent zero or "All clear".
3. The live runtime queue and the tracked work board stay visually distinct at every zoom level.
4. Maturity/proof travels in-band: maturity, proof_status, verified_at, evidence_ref, source on every projection schema.
5. UI CLAIM <= BACKEND PROOF. A UI must never elevate UNPROVEN to PROVEN, EXPERIMENTAL to LIVE, or BUILT_NOT_LIVE to LIVE through presentation alone.
6. Approvals, retries, and wakes dispatch through MissionRuntime/ExecutionAuthority policy, never around it.
7. Backend gaps are rendered as gap-labeled, never implied as done.

## Stage labels (track separately, never collapse)

Per-surface pipeline stage, independent of maturity:
HARVESTED -> CONTRACT_DEFINED -> IMPLEMENTED -> WIRED -> RUNTIME_VERIFIED -> DEPLOYED

A surface can be PROVEN maturity and still only WIRED stage, or BUILT_NOT_LIVE maturity at CONTRACT_DEFINED. Do not collapse the two axes.

## Repository boundary

- UI workspace decision and backend repository consolidation are SEPARATE decisions.
- Short term: public repo stays separate (also enforced by the GitHub API 401 platform egress-proxy fault on the Piging85 token, escalation pending).
- Medium term: UI workspace (apps/mission-control, apps/web, packages/ui, packages/api-client, packages/schemas) if it reduces duplication and improves governance.
- Never merge public UI + Mission Control + backend authority into one undifferentiated application.
- The API boundary must serve the UI regardless of backend repo topology.

## TenantOS framing

The public frontend is a PING tenant/product projection: a second tenant is a new tenant JSON file, not a fork. Today tenant.ping.v1.json does not exist on disk (only referenced in MEMORY.md); tenant UI work must not assume it exists. The website becomes a consumer of shared contracts and public gateway APIs.

## Corrections to the record (binding)

1. HPP is frozen and untouched. Do not describe the public frontend as an HPP transformation.
2. The standalone public frontend is BUILT_NOT_LIVE (14 sections, uncommitted, dev server :3000 verified 200, per website/HOMEPAGE_REPORT.md; "21 uncommitted files" figure unverified, marked so).
3. ORCA closure rates are synthetic (R-1); ping_missions + ping_events are the operational spine.
4. R-5 census citation unverifiable (census-2026-09-13.md does not exist under /home/hatch/workspace; R-8); /mc/* has no single authoritative route listing yet.
5. runs.jsonl lives at goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/runs.jsonl, not tandem/runs.jsonl (C-1).

## Backend gaps that bound UI honesty (P0, from section 17)

1. Per-principal namespace ACLs: valid-but-unauthorized explicit namespaces still accepted.
2. POST /knowledge/nodes drops nodeId, sourceEventId, correlationId (orphan 4917265ee67e678c is the residue).
3. SNIPPET_APPROVED in neither EVENT_MISSION_MAP nor MISSION_WORKER_MAP (blocks ordinary approval queue path).
4. Direct REPLAY_VERIFY creates no mission (blocks ordinary replay UI actions).
5. Append-only trigger does not cover TRUNCATE.
6. /ops/status 500s; /constitution/graph 503s.
7. GET /capabilities 404'd live; no /schedule, /cron, /jobs, /tasks routes; no scheduler execution history; no run_id instrumentation.

## Next implementation slice

Per the ADR migration sequence: contracts first, gap-labeled skeletons after.
1. Shared packages/schemas with maturity/proof fields (CONTRACT_DEFINED next).
2. PublicPingClient typed surface (read-only by construction).
3. Automation health cockpit (strongest existing UI domain; data model PROVEN).
4. Mission list + detail over /mc/* and GET /missions + correlation events (largest missing primitive).
5. Approval queue and intent ledger viewer, both gap-labeled where backend wiring is absent.

Do not build: a second backend, a Mission Control backend authority, a Public Website backend authority, the public site's own CMS/auth/store/scheduler, client-side-role authorization, ORCA-data dashboards presented as operational truth.
