# Playbook Spec: test.verified-operational-response v1.0.0

Sprint: PING overnight convergence 2026-09-16/17. Agent E, phases 11-15.
Scope: TEST ONLY. Namespace `test.playbook`, correlation `sprint-2026-09-16`.
Standing law: no commits, no pushes, no destructive ops, no secret exposure.
Human-authority law: every playbook activation and every revision requires an
explicit recorded approval. The sprint operator (Agent E) may record its OWN
approval for the TEST playbook only, explicitly labeled as such. Production
promotion is a human gate (Nolan) and stays closed.

## Hour-1 reachability map (2026-09-16 ~20:30 MDT)

.graph/knowledge assets:
- constitutional-laws.md, patterns.md, decision-rules.md, capability-matrix.md,
  business-observations.md, ontology.md, INDEX.md
- Verdict: DOCUMENTATION-ONLY. Zero code references in gateway/, ping-runtime/,
  ping-authorities/ (grep across the constitutional-convergence-v2 tree at
  099927152). The INDEX.md mermaid claims links to GatewayRuntime, MissionRuntime,
  AuthorityRegistry, ConnectorRegistry, UnifiedEventRuntime, WorkerRuntime,
  AIRuntime; none of those components read these files. They inform humans only.

Runtime-reachable knowledge machinery:
- KnowledgeGraph (ping-runtime/knowledge/knowledge_graph.js) -> Postgres
  `knowledge_nodes` / `knowledge_edges`. VERIFIED live: 86 rows, all
  node_type='event', status='candidate', 0 approved (2026-09-16).
- KnowledgePromoter (ping-runtime/knowledge/knowledge_promoter.js) registered in
  gateway_runtime.js (options.knowledgeGraph), handles SNIPPET_APPROVED /
  AI_RESPONSE_ACCEPTED -> status='approved', confidence=1.0. This is the
  constitutional human-approval gate. (Live verification: phase 12 below.)
- RecommendationWorker registered for CLASSIFICATION_CREATED / RECOMMENDATION_CREATE.
- Playbooks/templates: NONE EXIST anywhere in code or DB. This sprint creates
  the first playbook artifact.

## Playbook record schema (knowledge_nodes row)

- node_type: 'playbook' (new type; the table is the canonical knowledge store,
  the write path is the production KnowledgeGraph.addNode -> PARTIAL, labeled)
- namespace: 'test.playbook', correlation_id: 'sprint-2026-09-16'
- node_id: deterministic sha256(nodeType:label:canonicalJSON(data))[0:16],
  idempotent via ON CONFLICT DO UPDATE; lifecycle transitions re-POST with
  explicit nodeId so the playbook keeps one stable identity (ADD-only history
  appended inside data, never destructive).
- data: { name, version, scope, derived_from_knowledge[], proposed_by,
  evidence_refs[], authorized_missions[], side_effect_class, rules[],
  lifecycle:{status, history[]}, approvals[], usage_log[], revision }

The record answers: what knowledge produced it (derived_from_knowledge IDs),
who/what proposed it (proposed_by + proposal event), what evidence supports it
(evidence_refs), what version (version), who approved it (approvals[] + the
SNIPPET_APPROVED event + column status), what missions it may authorize
(authorized_missions), what happened when it was used (usage_log[]).

## Lifecycle

proposed (status column 'candidate') -> approved (SNIPPET_APPROVED event ->
KnowledgePromoter flips column to 'approved', confidence 1.0) ->
active (driver verifies column='approved' then records lifecycle.status='active'
in data). Only status='approved' AND lifecycle.status='active' may authorize
missions; the driver enforces this and fails closed otherwise.

## Mission authorization contract

- Authorized mission types: ['REPLAY_VERIFY'] only. side_effect_class: read-only.
- Generation path: driver reads the ACTIVE playbook node, enforces the gate,
  then POST /missions -> MissionRuntime.create -> MissionScheduler ->
  WorkerRuntime.dispatch -> replay worker. The playbook NEVER bypasses
  MissionRuntime; createdBy='playbook:<node_id>', correlation_id set.
- Mission identity deterministic: sha256(missionType:event_id)[0:16].

## Learning loop (no auto-mutation)

execution -> result -> outcome event (REPLAY_COMPLETED, auto WITNESS_CREATED) ->
learning observation (OBSERVATION_CREATED) -> bridge pipeline
(CLAIM_GENERATE -> CLASSIFICATION_CREATE -> RECOMMENDATION_CREATE ->
PROJECTION_CREATE, all real workers) -> recommendation ->
playbook_revision node (node_type='playbook_revision', status='candidate',
stays PROPOSED) -> HUMAN GATE recorded in data.gate
{decision:'PENDING_HUMAN', required_approver:'Nolan Geske (human)',
decided_by:null}. The active playbook is NEVER auto-mutated.

## Proof standard

EXISTS -> IMPORTS -> REACHABLE -> EXECUTES -> PERSISTS -> SURVIVES RESTART ->
PRODUCES EVIDENCE -> REPLAYS -> REPRODUCES. Every deterministic identifier is
precomputed and compared, never assumed.
