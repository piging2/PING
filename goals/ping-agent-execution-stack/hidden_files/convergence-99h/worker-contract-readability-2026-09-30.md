# P0 Worker-Contract + Readability Routing: falsification record and typed-contract specification

Date: 2026-09-30 ~18:35 MDT. Lane: INTELLIGENCE_RESEARCH worker contract (P0).
Binding inputs: CEO-ORDER-READABILITY-ROUTING-2026-09-30.md (filed verbatim) +
Nolan's 18:32 MDT clarification: DO NOT OPTIMIZE FOR HUMAN READABILITY.
Optimize ONLY for agent routing and understanding. Briefs are machine-targeted
projections. Typed payloads over prose. Human legibility is incidental.

Status of this document: SPECIFICATION + FALSIFICATION EVIDENCE. No code was
written by this lane. The research-p0 executor (branch
`research/intelligence-worker-p0`, worktree `/home/nolan/ping/worktrees/research-p0`)
owns the seam; this lane specifies the smallest wiring delta for them. Single
writer rule respected; testing coordinator's surfaces untouched.

## Part 1 — Falsify before implementing (six steps, evidence)

### 1. Current prompt/brief construction (four parallel shapes, none machine-complete)

(a) VM-side model research: `~/workspace/tandem/prompts/{a..j}-*.md` rotating
prose TASK briefs (example `a-weak-website-hunt.md`: "TASK: weak-website hunt.
Find 12 specific, real home-service businesses...") + `build-context-pack.py`
context pack. Free-form prose. No output schema, no evidence-grade
requirement, no stop condition, no epistemic headers, no contradiction
section, no anti-goals. The whole context pack is dumped into every sweep:
over-supply by construction.

(b) GROWTH-OS.md §6.1 INTELLIGENCE_RESEARCH template: fields
`questions[]`, `claims_to_verify[]`, `evidence_requirements`,
`output_schema` (claim / verdict CONFIRMED|REFUTED|UNCLEAR / evidence URLs /
evidence grade), `synthesis_rule`. Prose-level contract only; not enforced by
any machine.

(c) research-p0 deterministic worker: typed `payload.research` plan with
`questions[]`, `claims_to_verify[]`, `sources[]`, validated by
`ResearchWorker._validatePlan` (`research_worker.js:514-522, 687-699`).
Machine-readable but missing: evidence_requirements, per-claim output
schema, required_capabilities, constraints, MAY/MAY NOT, stop condition,
anti-goals, epistemic headers on inputs, contradiction inputs, sovereignty
map, correlation/causation requirement. Output is a typed `findingSet`
(mission_id, trigger_event_id, questions, findings[], contradictions[],
unresolvedQuestions[], knowledgeCandidates[], nextMissionCandidates[],
sourceAcquisition[], produced_at, epistemics string).

(d) External/model agent briefs: ad hoc hand-written prose (subagent task
texts, including this lane's own). `external_agent_adapter.js` is not present
in this checkout (`ping-runtime/external-agent-prototype/` only);
`authorizeWorkOrder` appears only in `ping-runtime/temporal/activities/mission_activities.js`.
External-agent brief construction today is human prose, no compiled contract.

### 2. Trace one real mission into one real worker

Mission `3b0f430a06a41357` (INTELLIGENCE_RESEARCH, created 2026-09-30
12:14:51 MDT), per `gateway-deploy-2026-09-30.md:49-52`:
`MissionScheduler._poll` (5s) → `getPending()` → `MISSION_WORKER_MAP`
lookup (absent pre-P0) → log "No worker for mission type
'INTELLIGENCE_RESEARCH' - skipping" every cycle. Missing-worker seam, NOT
poison-mission starvation (getPending cycled normally; completed=623).

Post-P0 (live, research-p0 executor report 2026-09-30 ~18:35 MDT): the map
gained `INTELLIGENCE_RESEARCH: 'research'`; the stale mission was
auto-consumed and FAIL-CLOSED by `_validatePlan` ("missing research plan
(payload.research)") → terminal `failed`. The worker correctly refused to
hallucinate research. Correct resolution of the stuck state.

Acceptance mission `72dc09886ad305ea` (same report): claimed → scheduler
built the worker event with `event_type = payload.event_type ||
mission.mission_type`, `tenant_id` from the mission row, metadata
`{mission_type, tenant_id, priority, assigned_to, canonical_hash,
confidence, correlation_id, causation_id}` → `WorkerRuntime.dispatch()`
matched `research` on eventTypes → 2 real GitHub HTTPS sources acquired
(SSRF-defended, real sha256 digests, `observed_at`) → 2 `OBSERVATION_CREATED`
+ 2 `CLAIM_CREATED` via canonical ingress → mission `completed` in ~2.6s.
Both claims `UNCLEAR` with `contradiction_found:true`, both sides preserved.
Downstream cascade: CLAIM_GENERATE → classification → recommendation →
projection → replay (23 events in correlation group).

### 3. Duplicated routing/context logic inventory (with verdicts)

- `MISSION_WORKER_MAP` (`mission_scheduler.js:56-88`): NOT a duplicate. The
  [DOC-CONTRACT] comment explicitly makes it LABELING/ASSIGNMENT metadata
  only; the single canonical dispatch decider is `WorkerRuntime.dispatch()`
  matching `worker.eventTypes` against the event's `event_type`. Keep as-is.
- `WorkerRuntime.register(name, worker, {eventTypes, maxConcurrent,
  capabilities})` (`worker_runtime.js:28-38`): capabilities are FIRST-CLASS
  registration fields, exposed in `getStats()` and the dispatch receipt.
  FALSIFICATION FINDING: canonical workers declare `capabilities: [name]`
  (name tokens: `['research']`, `['observation']`, ...; only
  `knowledge-promotion` declares `['knowledge.promote']`)
  (`canonical_workers.js:905-915`). Capability routing today is name-matching
  wearing a capability costume. The machinery exists; the vocabulary does
  not. This is the routing gap, not a duplicate.
- `ExecutionRouter.json`, `RoutingIndex.json`, `RoutingCache.json`,
  `LawRouter.json`, `ContextPackets.json` (`orchestration/`, generated
  2026-07-04, UUID file graphs): dormant generated repository-knowledge
  indexes. NOT live routing. Not duplicates; do not touch.
- `dispatcher.js` (`orchestration/`): plans high-ROI entropy-reduction work
  over a graph. Work planning, not mission dispatch. Distinct semantics; not
  a duplicate.
- `build-context-pack.py` (`tandem/`): VM-side context compilation for model
  research agents. PARALLEL CONTEXT COMPILER — the one real overlap. Verdict:
  adapter, not authority. The in-repo compile must own the typed schema; the
  tandem pack becomes a consumer (renders the typed brief), never a second
  compiler.
- `EventToMissionBridge` / `automatic_mission_generator`: event→mission
  creation. Distinct from dispatch. Not duplicates.
- `ExternalAgentAdapter.authorizeWorkOrder`: execution authorization /
  capability gate. Distinct from routing. Not a duplicate.
- `GET /missions/:id/trace` (`mission_runtime.getTrace`): canonical trace
  contract (mission + correlation_id + all events sharing it). Exists. No
  new trace store needed.

### 4. Information lost vs over-supplied today

LOST (mechanical, proven):
- (i) `mission_scheduler.js:388-392`: on success the scheduler persists only
  `{worker, completed_at}` into `mission.result`. The worker's `findingSet`
  (findings, contradictions, unresolvedQuestions, knowledgeCandidates,
  **nextMissionCandidates**) is DROPPED at the completion boundary. The
  bounded-chaining seam is broken by exactly these 5 lines. Unresolved
  claims can only reach ORCA via journal archaeology, not mission state.
- (ii) Real capability semantics: name-token capabilities (see §3).
- (iii) The ten briefing questions (WHY AM I HERE … WHAT SHOULD MAKE ME
  STOP) are answered nowhere mechanically.
- (iv) Contradiction INPUTS: the worker detects contradictions inside its
  own observations but receives no prior contradictions as context.
- (v) Projection loss: trace showed `tenant_id: "UNKNOWN"` while payload
  carried `ping-ops` (per P0 executor report). The row has immutable
  tenant_id (Lane B); the loss is projection-side. Flagged for the
  losslessness test, out of this lane's write scope.
- (vi) No contract requirement on correlation_id/causation_id threading (the
  scheduler happens to thread them; nothing enforces it).

OVER-SUPPLIED:
- Tandem prose briefs dump the entire context pack into every research
  sweep. No progressive disclosure (L0–L4) anywhere in-repo. The order's
  "200KB constitutional briefing" failure mode is the current default.

### 5. Can existing mission payload + WorkerRuntime carry the contract? YES (proven per field)

| Contract field | Carrier (existing) | Evidence |
|---|---|---|
| tenant (immutable) | `ping_missions.tenant_id`, `MissionRuntime.create` REQUIRES `options.tenant_id` (fail-closed); scheduler threads `tenant_id: mission.tenant_id` into the worker event | `mission_runtime.js:110-136`; `mission_scheduler.js:300-335` |
| principal | `created_by` column on the mission row | `mission_runtime.js:110-136` |
| capability | `WorkerRuntime.register` `capabilities[]`, exposed in `getStats()`/receipt | `worker_runtime.js:28-38, 145-160` |
| mission semantics | `payload` JSONB free-form + deterministic `mission_id = hash(tenant:missionType:event_id\|canonical_payload)` | `mission_runtime.js:110-136` |
| correlation/causation | scheduler metadata `{correlation_id, causation_id}` | `mission_scheduler.js:300-335` |
| typed brief transport | `event.payload` passthrough (`payload.payload \|\| payload`) | `mission_scheduler.js:300-335` |
| typed result transport | worker return → scheduler `complete(mission_id, result)` → `result` JSONB | `mission_runtime.js:205-231` |
| verdict/existence proof | `ResearchWorker.handle` returns `{status:'ok', findingSet}` | `research_worker.js:511-685` |

What CANNOT be carried without change: the capability→target selection
itself. No selector exists between mission and event_type today
(`MISSION_WORKER_MAP` is name-keyed; `dispatch()` matches strings). That is
the one function to add: a deterministic, stateless `compileRoute`.

### 6. Smallest wiring delta (specification for the seam owner)

D1. **Typed contract schema** `payload.research_contract` v1 (JSON Schema,
machine-validated; schema text in Part 2 below). Extends the existing
`payload.research` plan; `_validatePlan` extended, not replaced.

D2. **Deterministic `compileRoute(mission)`**: pure function,
`required_capabilities × worker capabilities (from WorkerRuntime.getStats())`
→ `route_decision {event_type, eligible_workers[], selected, reason}`.
Recorded as assignment metadata alongside `assigned_to`. NOT a dispatch
authority: `WorkerRuntime.dispatch()` is untouched and remains the single
canonical decider. Changing eligible worker (local JS → external agent →
model) changes only the recorded decision, never mission semantics
(MISSION ≠ ROUTE ≠ BRIEF ≠ EXECUTION).

D3. **Losslessness gate** `validateContract(mission, brief)`: REQUIRED
SEMANTICS LOST = 0 over {tenant, principal, capability, semantic_owner,
mutation_scope, authorization_state, effect_boundary, evidence_requirement,
success_condition, stop_condition, correlation_id, causation_id}. Any
safety-critical field unrepresentable → DO NOT ROUTE (mission stays
`created` with `contract_rejected` reason; no silent defaulting).

D4. **Scheduler persists the finding set**: `complete(mission_id, {worker,
completed_at, finding_set: <bounded>})` where `<bounded>` = questions,
findings, contradictions, unresolvedQuestions, knowledgeCandidates,
nextMissionCandidates, sourceAcquisition summaries (NO full text; digests
+ URLs + observed_at only). This closes the bounded-chaining gap proven in
§4(i). ORCA (P1) reads `result.finding_set.nextMissionCandidates` to create
follow-up missions with correlation/causation preserved.

D5. **Worker validation extended** to the v1 schema (fail-closed on
missing/invalid contract, as proven correct on the stale mission).

D6. **Brief shapes as typed JSON Schemas per executor class** (researcher,
writer, falsifier, effect-executor), compiled deterministically from the
contract. Model agents receive the typed brief serialized — never a
prose-dumped context pack. `build-context-pack.py` becomes a renderer of
the typed brief (adapter), not a parallel compiler.

Explicitly NOT built: no AgentRoutingAuthority, no PromptAuthority, no
BriefStore, no AgentBrain, no new event writer/store, no dispatch()
semantics change, no TestingAuthority overlap (the testing lane's falsifier
brief is a SIBLING: shared primitives `verdict`/`evidence_grade`/`epistemic`
enums, separate brief type; do not merge).

## Part 2 — INTELLIGENCE_RESEARCH contract shape v1 (machine-targeted)

The contract is a typed JSON object. For deterministic workers it is passed
as-is (zero prose). For model agents it is serialized in FIXED field order
with no narrative wrapper. Well-formed = the correct next action is obvious
to the executor class and the incorrect action is structurally difficult;
human prettiness is not a criterion.

```json
{
  "contract_version": "intelligence-research/v1",
  "objective": "string, one sentence, falsifiable",
  "questions": ["string, explicit and falsifiable"],
  "claims_to_verify": [
    {"text": "string", "claimed_source": "url-or-citation-or-null",
     "epistemic": "REPORTED|INFERRED|UNKNOWN",
     "support_set": [{"source": "string", "observed_at": "ISO8601",
                       "freshness": "fresh|aging|stale", "authority": "string"}]}
  ],
  "evidence_requirements": {
    "hierarchy": ["live_behavior", "primary_docs", "independent_replication", "marketing_prose"],
    "primary_preferred": true,
    "min_independent_sources": 1
  },
  "output_schema": {
    "per_claim": ["claim", "verdict", "support_set", "evidence_grade", "unknowns", "contradictions", "next_questions"],
    "verdict_enum": ["VERIFIED", "REFUTED", "UNCLEAR"],
    "evidence_grade_enum": ["independent", "vendor_described", "unreplicated"]
  },
  "required_capabilities": ["web.fetch", "text.extract", "claim.evaluate"],
  "constraints": {"network": true, "external_effects": false, "ssrf_policy": "deny-private|deny-metadata|deny-redirect-rebind"},
  "known_facts": [
    {"claim": "string", "state": "PROVEN|SUPPORTED|REPORTED|INFERRED|UNKNOWN|CONFLICTING",
     "source": "string", "observed_at": "ISO8601|null", "freshness": "fresh|aging|stale|unknown",
     "support_set": ["event_id-or-url"], "authority": "string",
     "plane": "source|worktree|deployed",
     "do_not_conclude": "string|null"}
  ],
  "contradictions_unresolved": [
    {"a": "claim text", "a_source": "string", "b": "claim text", "b_source": "string",
     "required_action": "resolve_to_reached_runtime|return_unknown"}
  ],
  "sovereignty": {
    "semantic_owner": "MissionRuntime",
    "canonical_store": "ping_missions",
    "event_writer": "UnifiedEventRuntime",
    "identity": "IdentityAuthority",
    "verification": "EvidenceAuthority",
    "execution_authorization": "authorizeWorkOrder",
    "projection": "MissionControl",
    "may_not_create": ["MissionAuthority", "EventAuthority", "MarketingStore", "AgentMemory", "parallel approval store"]
  },
  "may": ["observe", "research", "propose"],
  "may_not": ["publish", "spend", "promote_itself_to_truth", "silently_create_playbook_policy"],
  "anti_goals": [
    "create_another_authority", "create_another_durable_store", "introduce_another_event_writer",
    "invent_truth_to_complete_projection", "unknown_is_not_failed", "no_silent_reconciliation",
    "no_scope_broadening", "no_promoting_learning_to_authorization"
  ],
  "success_condition": "bounded finding set with per-claim verdicts; every claim SUPPORTED/REFUTED/UNCLEAR with refs",
  "evidence_required": ["observation_event_ids", "claim_event_ids", "content_digests", "observed_at"],
  "stop_condition": "claims exhausted OR sources exhausted OR contradiction requires runtime disambiguation the worker cannot perform",
  "mutation_scope": "events only: OBSERVATION_CREATED, CLAIM_CREATED via canonical ingress; no other writes",
  "effect_boundary": "no external effects; acquisition is read-only HTTP GET under ssrf_policy",
  "authorization_state": {"required": false, "ref": null},
  "correlation_id": "string", "causation_id": "string|null",
  "tenant_id": "string (immutable, from mission row)",
  "principal": "string|null (created_by)"
}
```

Notes:
- `plane` on every known_fact routes the source/worktree/deployed caveat
  instead of summarizing it away (order item 5). A `deployed` claim with
  only `source`-plane evidence is INVALID CLAIM per the order's lint rules.
- Evidence is adjacent to claims: `claim/state/evidence(implied by
  support_set)/implication/do_not_conclude` co-located in one object, never
  a FACTS section divorced from SOURCES.
- Contradictions are never merged: no `resolved` free-text field exists in
  the schema; verdicts carry per-source support. `required_action` is an
  enum, not prose.
- `may_not` is machine-checkable: the worker's `_emit` path only allows the
  two canonical event types; anything else fails closed (already true in
  research_worker.js via `_emit`; contract makes it explicit).

## Part 3 — Researcher brief shape v1 (typed; answers the ten questions in fixed order)

The brief is a DETERMINISTIC PROJECTION of the contract (disposable; the
mission row is the authority). Same JSON, fixed order, no prose wrapper:

1. WHY AM I HERE → `objective` + `correlation_id`/`causation_id`
   (chain position: which unresolved question spawned this mission)
2. WHAT EXACTLY IS MY JOB → `questions[]` + `output_schema`
3. WHAT IS ALREADY KNOWN → `known_facts[]` (each with epistemic header +
   `plane`)
4. WHAT MUST I NOT ASSUME → `contradictions_unresolved[]` +
   `do_not_conclude` fields + `plane` caveats (e.g. DO NOT INFER
   source==deployed)
5. WHAT MAY I READ → `claims_to_verify[].claimed_source` +
   `evidence_requirements` + acquisition list (sources with `why`)
6. WHAT MAY I CHANGE → `mutation_scope` (events only, typed)
7. WHAT MUST I NOT CHANGE → `may_not[]` + `anti_goals[]` +
   `sovereignty.may_not_create[]`
8. WHAT CONSTITUTES SUCCESS → `success_condition`
9. WHAT EVIDENCE MUST I RETURN → `evidence_required[]` + `output_schema`
10. WHAT SHOULD MAKE ME STOP → `stop_condition`

Progressive context (machine-targeted, not human chapters): L0 route card =
`{objective, questions[0..2], success_condition, stop_condition,
may_not[0..3]}` (~15 fields, always inline). L1 = full contract above.
L2 = evidence pack = content-addressed refs (`event_id`, digest) the
executor fetches on demand. L3 = archaeology refs. L4 = explicit request
only. Nothing is dumped; everything is a pointer except L0/L1.

## Part 4 — Capability-based routing (no new authority)

Today (proven, §3): `dispatch()` matches `event.event_type ∈
worker.eventTypes`; `MISSION_WORKER_MAP` is name-keyed labeling metadata;
worker `capabilities` are name tokens.

Target: the contract carries `required_capabilities[]` + `constraints{}`.
`compileRoute(mission)` (pure, deterministic, no durable state):
1. read `required_capabilities` from the contract;
2. read registered workers' `capabilities` via `WorkerRuntime.getStats()`;
3. select eligible set = workers whose capabilities ⊇ required AND whose
   constraints admit the mission's constraints;
4. apply policy/availability/locality ordering (deterministic tie-break:
   prefer in-process JS worker; then registered external adapter);
5. emit `route_decision {event_type, eligible_workers[], selected, reason}`
   recorded as assignment metadata (sibling of `assigned_to`).

`dispatch()` is NOT modified. MISSION ≠ ROUTE ≠ BRIEF: the mission row is
authority; the route decision is derived metadata; the brief is the
disposable projection. Prerequisite: workers declare REAL capability
tokens (e.g. `web.fetch`, `text.extract`, `claim.evaluate`) instead of
name tokens — a registration-table change owned by the seam writer, not a
new authority.

Lint rules (deterministic, pre-inference; from the order):
- research mission + no `evidence_requirements` → INVALID
- research mission + no `output_schema` → INVALID
- external effect + no `authorization_state.ref` → INVALID
- deployed-runtime claim + only source-plane evidence → INVALID CLAIM
- mutation mission + competing owner → HOLD
- any safety-critical field unrepresentable → DO NOT ROUTE

## Part 5 — Losslessness invariant (mechanical gate)

`validateContract(mission, brief)` asserts REQUIRED SEMANTICS LOST = 0
across: tenant, principal, capability, semantic owner, mutation scope,
authorization state, effect boundary, evidence requirement, success
condition, stop condition, correlation_id, causation_id.

Known current failures (do not hide; fix or hold):
- F1: `mission.result` drops `finding_set` → next-mission chaining
  semantics lost at completion (D4 fixes).
- F2: trace projection renders `tenant_id: UNKNOWN` while payload/row
  carry the real tenant → projection-side loss (flagged; owner: projection
  lane, out of this lane's write scope).
- F3: name-token capabilities → capability semantics lost at registration
  (registration-table change required before compileRoute can route on
  them).

## Part 6 — Boundary and handoff

- This lane wrote NO code and mutated NO repo/worktree. All findings are
  read-only probes via `~/workspace/bin/pigwsl-exec` (no remote state
  changed) plus the P0 executor's delivered report.
- The six deltas (D1–D6) are specified for the research-p0 seam owner
  (single writer). Do not parallel-write `mission_scheduler.js`,
  `worker_runtime.js`, `canonical_workers.js`, or `research_worker.js`.
- Testing lane: falsifier brief is a sibling schema sharing the
  `verdict`/`evidence_grade`/`epistemic` enums. Do not merge; do not touch
  their surfaces.
- No push performed. No new store/authority/framework proposed or built.
- Open for coordinator: (a) real capability token vocabulary needs one
  owner decision (suggest: `web.fetch`, `text.extract`, `claim.evaluate`,
  `repo.read`, `browser.act`, `effect.execute.<class>`); (b) ORCA P1
  consumes `result.finding_set.nextMissionCandidates` — confirm ORCA lane
  reads mission.result, not just the journal; (c) confirm the F2
  projection fix has an owner.

## Evidence index (all read-only)

- CEO-ORDER-READABILITY-ROUTING-2026-09-30.md (binding order + 18:32
  clarification in AGENTS.md)
- CEO-ORDER-INTELLIGENCE-CONVERGENCE-2026-09-30.md (P0 acceptance chain)
- `~/workspace/tandem/prompts/a-weak-website-hunt.md` (current prose brief)
- `~/workspace/marketing-os/GROWTH-OS.md` §6.1–6.4 (current template)
- `/home/nolan/ping/worktrees/research-p0` @ `9b076c6bc`
  (research/intelligence-worker-p0): `research_worker.js` (handle :511,
  payload read :514-522, validatePlan :687-699, findingSet :650-685),
  `canonical_workers.js` (:835, :902, registration loop :905-915),
  `mission_scheduler.js` (:82-86 map entry)
- `/home/nolan/ping/ping-runtime/orchestration/mission_runtime.js`
  (create :110-136, complete :205-231)
- `/home/nolan/ping/ping-runtime/orchestration/mission_scheduler.js`
  (MAP :56-88 + [DOC-CONTRACT] :41-55, poll/dispatch :255-300, event build
  :300-335, complete call :388-392)
- `/home/nolan/ping/ping-runtime/workers/worker_runtime.js` (register
  :28-38, dispatch :93-130, getStats :145-160)
- `~/workspace/goals/ping-agent-execution-stack/hidden_files/convergence-99h/gateway-deploy-2026-09-30.md`
  (:49-52, stuck mission `3b0f430a06a41357`)
- `~/workspace/goals/ping-agent-execution-stack/hidden_files/convergence-99h/intelligence-research-p0-2026-09-30.md`
  (P0 executor evidence; acceptance mission `72dc09886ad305ea`)
- `~/workspace/forensics/ping-intelligence-convergence-2026-09-30/05-engine-mapping.md`
  + `06-convergence-map.md` (forensic base)
