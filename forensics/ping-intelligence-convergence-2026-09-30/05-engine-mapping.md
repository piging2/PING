# L5 — Engine Mapping: Seven Growth OS Engines onto Existing PING Machinery

**Investigator:** L5 subagent (read-only). **Date:** 2026-09-30.
**Scope:** `~/workspace/marketing-os/GROWTH-OS.md` (plan, status PLAN, "nothing here is built yet")
engines 2.1–2.7 + §6 INTELLIGENCE_RESEARCH mission template, mapped onto existing PING machinery.
The seven engines are treated as bounded capabilities / mission templates / projections / analysis /
worker behaviors over existing PING machinery — NOT services, NOT authorities.

**Evidence base and ages (all read-only):**
- (a) 2026-09-18/19 Pig-side architectural recon (branch `feature/approval-effect-identity` @
  `88c9651be` and orca-autonomy branch): `~/workspace/forensics/recon-2026-09-19/agent-d-lineage-mission-workorder.md`
  (mission/worker/workorder/runtime primitives), `agent-e-context-knowledge.md` (knowledge chain),
  `agent-f-temporal-orca-approval.md` (approval/effect paths), `phase24-mission-control-2026-09-19.md`.
- (b) 2026-09-23 event forensics: `~/workspace/constitutional-sprint/event/EVENT-FORENSICS.md`
  (UnifiedEventRuntime → ping_events sovereign path, CanonicalizationService boundary, event types).
- (c) 2026-09-30 live remote read (one bounded `pigwsl-exec` command, Pig WSL, `/home/nolan/ping`):
  `MISSION_WORKER_MAP` current contents and zero hits for `INTELLIGENCE_RESEARCH`; `ping-runtime/events/`
  dir listing.
- (d) 2026-09-30 sibling file lists in `.../ping-intelligence-convergence-2026-09-30/scratch/`
  (today's module inventory corroboration only).
- (e) 2026-09-13 worker inventory: `~/workspace/worker-inventory-2026-09-13.md`
  (VM-side workers: emit-observation.py, meta-ai-research-worker, outreach engine, cron agents).

**Grades:** PROVEN (wired to live path in cited source) / WIRED_UNPROVEN (code exists and is
wired/registered, runtime behavior not traced) / NOT PROVEN (searched, not found) / NEEDS-REVERIFY
(could not be closed from this evidence). Absence-of-evidence notes state what was searched.

**Caveats (standing):** 2026-09-29/30 convergence intervals landed writer commits (T2/T3/T4 trust-defect
fixes, Mission Control headless-agent dispatch) AFTER the 09-18/19 recon. Anything about current
live *behavior* beyond the 09-30 remote grep is NEEDS-REVERIFY. The 09-30 `MISSION_WORKER_MAP` read
supersedes the 09-19 description of it: the in-repo contract comment now states it is LABELING/ASSIGNMENT
metadata only and the canonical dispatch decider is `WorkerRuntime.dispatch()` matching on
`worker.eventTypes` against the original business `event_type` (see Engine 1 notes).

**Transport note:** initial reachability probe (`timeout 25 ~/workspace/bin/pig "<cmd>"`) — SSH tunnel
reachable, remote hostname `Pig` returned. The remote `date` token fell through to the Windows `date`
prompt ("Enter the new date") and the timeout killed the wrapper; no remote state was changed.
One further bounded read via `~/workspace/bin/pigwsl-exec` (the AGENTS.md-blessed helper). No other
remote traffic; no files written anywhere except this report.

---

## Spine reference (the existing PING loop the engines map onto)

| Loop step | Existing PING mechanism | Evidence |
|---|---|---|
| Observation intake | `POST /ingest` → `CanonicalizationService.canonicalizeAndEmit` (lifecycle_stage `'observation'`) or `POST /events` → `UnifiedEventRuntime.emit` → `INSERT INTO ping_events … ON CONFLICT (event_id) DO NOTHING` | `ping-runtime/canonicalization/canonicalization_service.js:109-176`; `ping-runtime/events/unified_event_runtime.js:73-198` (lines 147-153 append; 158-164 idempotent redelivery) — EVENT-FORENSICS.md §2D PROVEN |
| Event→mission | `EventToMissionBridge._handleEvent` → `MissionRuntime.create(missionType, payload)`; `automatic_mission_generator.js` → `repository_events` → EventBridge | `ping-runtime/orchestration/event_to_mission_bridge.js` (WIRED_UNPROVEN, recon-d §f); `gateway/bootstrap/gateway_runtime.js:598` bootstrap subscriber (EVENT-FORENSICS.md §2D) |
| Mission truth | `MissionRuntime` → `ping_missions` table; statuses created→assigned→running→completed\|failed (+retry_pending, lease reclaim); transitions mirrored as `MISSION_CREATED/ASSIGNED/STARTED/COMPLETED/FAILED/LEASE_EXPIRED` canonical events | `ping-runtime/orchestration/mission_runtime.js:33-62` (PROVEN_INTEGRATION, recon-d §c) |
| Mission→worker routing | `MissionScheduler._poll` (5s, live in gateway) + `MISSION_WORKER_MAP` labeling; canonical decider `WorkerRuntime.dispatch()` on `worker.eventTypes` ∩ `payload.event_type` (in-repo contract, read live 2026-09-30) | `ping-runtime/orchestration/mission_scheduler.js:41-88` (PROVEN, live read 09-30); `gateway/bootstrap/gateway_runtime.js:552-560` (recon-f §a) |
| Worker pipeline | JS canonical workers: observation → claim → classification → recommendation → projection → replay → witness → lineage → knowledge-promotion | `ping-runtime/workers/canonical_workers.js` (pipeline comment :9; ClaimWorker :128; LineageWorker :510-543; ProjectionWorker :709 — recon-d §b). Registration in live gateway startup logs observed 09-18 (WIRED_UNPROVEN behavior, PROVEN registration — recon-e §a) |
| Result verification | `verifyResultEnvelope` (envelope binding/identity/coherence, NOT content truth) → `recordVerifiedResult` → canonical `WORKER_COMPLETED`/`WORKER_FAILED` events | `ping-runtime/external-agent/external_agent_adapter.js` (recon-d §e; verification verifies the envelope, "records the validated claim, not a verified truth") |
| Evidence | `EvidenceAuthority.accumulate/verify/rank` (verify recomputes hash, checks lineage, namespace; trust-on-claim weakness if verifier absent) | `ping-runtime/evidence/evidence_authority.js` (PROVEN_INTEGRATION, recon-d §b) |
| Knowledge | `knowledge_nodes` (status candidate/approved/rejected; `confidence_provenance`; per-node `source_event_id`/`correlation_id`); `KnowledgePromoter` (ADD-only promotion on human approval events); `HybridSearch` (verify per hit); Qdrant projection via `embedding_service.js:132` subscriber | recon-e §b; `ping-runtime/knowledge/knowledge_promoter.js`; `ping-runtime/search/hybrid_search.js`; EVENT-FORENSICS.md §2D (WIRED_UNPROVEN for behavior, PROVEN registration) |
| Authorization | `ExternalAgentAdapter.authorizeWorkOrder` (fail-closed; the de-facto capability gate) | recon-d §e, recon-f §g (PROVEN_INTEGRATION) |
| Delegation policy | ORCA `orca_policy.js`: AUTO_EXECUTE / REQUIRES_VERIFICATION / REQUIRES_HUMAN_APPROVAL / PROHIBITED; `APPROVAL_GATED_CAPABILITIES = ['email.send','sms.send']` → escalation to `99-escalate.json`, exit 3 | `orca/control-loop/policy/orca_policy.js` (recon-f §c, PROVEN_RUNTIME in ORCA loop) |
| Approval primitives | `BusinessActionAuthority` (PENDING_HUMAN→APPROVED/REJECTED/EXPIRED) and `EffectAuthority` (generateEffectId) — both **in-memory, zero importers** | `ping-runtime/approval/business_action_authority.js`; `ping-runtime/approval/effect_authority.js` (recon-f §e: EXPERIMENTAL, unwired — the only effect path, Hermes work orders, has NO durable approval and NO effect identity) |
| Operator law (human approval) | Nolan approves every post (standing directive, GROWTH-OS §1); durable-approval machinery is the gap above | MEMORY.md standing directive; GROWTH-OS.md §1 |

---

## ENGINE 1 — Signal Engine
*Plan job:* normalize raw observations into typed, evidence-backed signals. Doctrine: signals are
observations, not truth, not authority; a signal never authorizes anything. Signal taxonomy (v0):
SEARCH_DEMAND_RISING, COMPETITOR_TOPIC_ACCELERATING, AUDIENCE_QUESTION_REPEATING,
VIDEO_RETENTION_ANOMALY, CONTENT_DECAY_DETECTED, HIGH_INTENT_COMMENT, CUSTOMER_PAIN_REPEATING,
POST_OUTPERFORMING_BASELINE, POST_UNDERPERFORMING_BASELINE, TOPIC_SATURATION_RISING,
NEW_PLATFORM_FORMAT_EMERGING, PRODUCT_SIGNAL_CORRELATES_WITH_CONTENT.

**EXISTING PING PRIMITIVES (file:line):**
- `ObservationWorker` / `ClassificationWorker` in `ping-runtime/workers/canonical_workers.js`
  (ClassificationWorker handles `OBSERVATION_CREATED`; pipeline stage `OBSERVATION_CREATE` —
  recon-d §b, WIRED_UNPROVEN behavior / PROVEN registration).
- `CanonicalizationService.canonicalizeAndEmit` — builds the canonical envelope with
  `lifecycle_stage: 'observation'`, confidence default 0.5 —
  `ping-runtime/canonicalization/canonicalization_service.js:109-176` (PROVEN, EVENT-FORENSICS.md §2D).
- `UnifiedEventRuntime.emit` — content-hash identity (`sha256(JSON.stringify({eventType, source,
  [namespace], [logical_id|payload]}))`), deduped append to `ping_events` —
  `ping-runtime/events/unified_event_runtime.js:73-198` (PROVEN).
- Type validation on ingest: `EventValidator` against `event_registry.json`
  (PROVEN, EVENT-FORENSICS.md §2D) — the registry is the natural home for a new
  `SIGNAL_EMITTED`/typed-signal event type if one is wanted.

**EXISTING AUTHORITY:** `CanonicalizationService.authorizeNamespace` — namespace ingress authorization
only (PROVEN); `EvidenceAuthority.accumulate/verify` for evidence-attachment —
`ping-runtime/evidence/evidence_authority.js` (PROVEN_INTEGRATION). **No "SignalAuthority" exists:**
grep for `SignalAuthority|signal_authority|SignalWorker` over the recon source universe = zero hits
(searched recon-2026-09-19 agent-a..g + ping-architectural-recon-2026-09-19.md, 2026-09-30) → NOT PROVEN.

**MISSION TYPES:** `DOCUMENT_IMPORT` → `'observation'` worker; `OBSERVATION_CREATE` → `'observation'`
(both live in `MISSION_WORKER_MAP`, `ping-runtime/orchestration/mission_scheduler.js:41-88`,
PROVEN live 2026-09-30); `KNOWLEDGE_EXTRACT` → `'observation'` (same map, same file). A new bounded
label like `SIGNAL_COMPUTE` is not needed as a type — signal computation is the existing
OBSERVATION_CREATE worker behavior over Page-insight observations. Post-performance baselines
(POST_OUTPERFORMING_BASELINE etc.) are computed rows, not new authorities.

**WORKERS:** JS `observation`/`classification` canonical workers (above); VM-side signal producers:
- `meta-ai-research-worker` (`~/workspace/pig-fb/meta-ask.js` + `meta-pass.sh` + 4 rotating briefs
  `~/workspace/tandem/prompts/a|b|c|d-*.md`) — raw research output + provenance sidecar
  (`status=unverified`, `ping_ingestion=pending`) — worker-inventory 2026-09-13, PROVEN operational.
- `ping-event-emitter` (`~/workspace/tandem/emit-observation.py`) — generic `OBSERVATION_CREATED`
  emitter to the gateway, bearer from container env, `source=api:muse` — worker-inventory 2026-09-13, PROVEN.
- `ping-social-outreach-engine` cron agent (step 4e tandem ingest + verification gate) and its
  `facebook-cli`/`social.search` discovery passes — existing signal *sources* today (worker-inventory, PROVEN).
- Cron-spawned agents generally (the daily cron that "already pulls Page insights" per GROWTH-OS §2.1).

**INPUT EVENTS:** `OBSERVATION_CREATED` (emitted by emit-observation.py today, PROVEN); `DOCUMENT_IMPORT`;
business observation events the `observation` worker already handles (LEAD_CREATED, CUSTOMER_CREATED,
GITHUB_COMMIT_SYNCED, DOCUMENT_IMPORT — recon-e §b, PROVEN_RUNTIME registration).

**OUTPUT EVENTS:** `CLAIM_CREATED` (ClaimWorker handles `OBSERVATION_CREATED`/`CLAIM_GENERATE`,
`canonical_workers.js:128`); `LINEAGE_CREATED`; `KNOWLEDGE_EXTRACT`-mission `MISSION_CREATED`
mirrors. Typed signal rows are payload content, not new event types (a `SIGNAL_EMITTED` type is
optional and would ride the existing registry — NOT a new authority).

**KNOWLEDGE PRODUCED:** `ping_events` payloads (signal observations, queryable via EventReadAuthority /
`GET /events/:type`); `knowledge_nodes` candidate nodes via ClaimWorker → KnowledgePromoter
(recon-e §b: node lifecycle candidate→approved/rejected, PROVEN_INTEGRATION for code).

**NEW STORAGE REQUIRED?: NO.** Signals live as canonical event payloads + knowledge nodes; the
signal taxonomy is a domain schema (event payload fields / registry entries), permitted by the
charter ("domain schemas are fine, duplicate foundational authorities are not").

**NEW AUTHORITY REQUIRED?: NO.** The plan's own doctrine ("signals are observations… never authorize
anything") maps exactly onto the existing spine: observation → evidence → (optionally) knowledge.
The kill criterion in GROWTH-OS §8 (stop any engine that mints authority) is enforceable today by
the fact that nothing downstream of an observation can spend, publish, or mutate without a worker
execution through `authorizeWorkOrder`/approval gates.

---

## ENGINE 2 — Audience Graph
*Plan job:* model who cares / what they care about / attention clusters; `AudienceCluster` schema
with problems, questions, vocabulary, sophistication, sites, creators, channels, queries, tools,
formats, observed engagement, evidence[]; clusters-not-personas; affinity from observed behavior.

**EXISTING PING PRIMITIVES (file:line):**
- `ping-runtime/knowledge/knowledge_graph.js` + `knowledge_nodes` table (entity_type/entity_id,
  status candidate/approved/rejected, `confidence_provenance`, per-node `source_event_id`,
  `correlation_id`) — recon-e §b (PROVEN_INTEGRATION for node lifecycle code).
- `KnowledgePromoter` — ADD-only promotion driven by human approval events
  (SNIPPET_APPROVED/AI_RESPONSE_ACCEPTED/...) — `ping-runtime/knowledge/knowledge_promoter.js`
  (WIRED_UNPROVEN behavior, PROVEN registration).
- `HybridSearch` — retrieval with `EvidenceAuthority.verify` per hit —
  `ping-runtime/search/hybrid_search.js` (recon-d §b).
- `EvidenceAuthority.rank` — score = confidence × provenance × (approved?1.2) × … — recon-e §b
  (WIRED_UNPROVEN).

**EXISTING AUTHORITY:** `KnowledgePromoter` (candidate→approved transitions) +
`EvidenceAuthority` (trust/verification of hits). **No "AudienceAuthority"/"AudienceCluster"
implementation exists:** grep for `AudienceCluster|audience_graph|audienceGraph` across the recon
source universe = zero hits (2026-09-30) → NOT PROVEN; the schema is plan-only (GROWTH-OS.md §2.2,
status PLAN).

**MISSION TYPES:** `KNOWLEDGE_INDEX` → `'projection'` worker; `KNOWLEDGE_EXTRACT` → `'observation'`
(live `MISSION_WORKER_MAP`, `mission_scheduler.js:41-88`, PROVEN 09-30). Cluster computation is a
`KNOWLEDGE_EXTRACT`/projection mission with domain payload; no new type strictly required.

**WORKERS:** `projection` worker (ProjectionWorker, `canonical_workers.js:709`); `observation`
worker for the initial evidence extraction; knowledge-promotion worker for cluster promotion.

**INPUT EVENTS:** `OBSERVATION_CREATED` (behavioral observations — engagement, attention signals);
`CLAIM_GENERATE`; `PROJECTION_CREATE`; human approval events (SNIPPET_APPROVED/…).

**OUTPUT EVENTS:** `CLAIM_CREATED`; `PROJECTION_CREATED` (recon-c event census);
`knowledge_nodes` status transitions (candidate→approved/rejected) as the durable record.

**KNOWLEDGE PRODUCED:** `knowledge_nodes` rows with `entity_type='AudienceCluster'`,
evidence[] = event_ids/`source_event_id` refs; overlap recorded as relationships/edges
(`relationship_objects` exist per `gateway/relationship_objects.js` — 09-30 scratch inventory).
Note agent-e §d design finding: **no merge/dedupe/resolve logic exists anywhere in PING today**
(grep `dedupe|mergeIdentit|resolveIdentity…` = zero hits) — so "one person in many clusters" is
naturally representable (no silent merges to fight), but entity-level stitching
(anonymous-to-known identity, GROWTH-OS §5 failure-mode 3) has NO existing primitive → the stitching
itself would be a new bounded analysis behavior on knowledge_nodes, not a new authority.

**NEW STORAGE REQUIRED?: NO.** AudienceCluster is a domain schema over `knowledge_nodes` (+ event
payloads + relationship edges). Nothing foundational is missing.

**NEW AUTHORITY REQUIRED?: NO.** Clusters are computed projections; promotion/demotion rides the
existing KnowledgePromoter + EvidenceAuthority. The plan's doctrine (affinity computed from observed
behavior; clusters ≠ authority) is directly expressible.

---

## ENGINE 3 — Opportunity Engine
*Plan job:* rank what is worth making; OpportunityScore = recommendation, never authority;
TopicOpportunity records {demand, growth, acceleration, competition, audience_fit, PING_relevance,
evidence_quality, freshness}; demand sensor from Trends/Exploding-Topics/YouTube/own-analytics
(all UNKNOWN/pending the INTELLIGENCE_RESEARCH run).

**EXISTING PING PRIMITIVES (file:line):**
- `recommendation` canonical worker (registered in live gateway startup logs — recon-e §a,
  PROVEN registration; per-event behavior NOT traced).
- `EvidenceAuthority.rank` (scoring with provenance weighting — recon-e §b) — the existing
  "rank things with evidence" primitive.
- Connector capability registry: `ping-runtime/connectors/capability_registry.js` +
  `constitutional_capability_contract.js` — 9 SaaS categories (communication, calendar, crm,
  accounting, payments, documents, **reviews, analytics, scheduling**) with typed operations +
  providers — recon-d §d (PROVEN_UNIT). This is the typed-connector pattern the demand sensor would ride.
- VM-side precedent: the outreach engine's own "opportunity engine (9 opportunity types, pitch primary
  only)" + "WHY THIS BUSINESS packet" personalization engine — worker-inventory 2026-09-13 item 10
  (PROVEN operational pattern, different domain — prospect outreach, not content).

**EXISTING AUTHORITY:** NONE for opportunity scoring, and by design there must not be one:
GROWTH-OS §2.3 doctrine "OpportunityScore is a recommendation, never an authority. It cannot approve,
publish, or spend by itself." `EvidenceAuthority` covers evidence-grading; no score may mint spend/publish
rights. NOT PROVEN to exist → correctly absent.

**MISSION TYPES:** `KNOWLEDGE_EXTRACT` → `'observation'` (live map) for demand-sensor sweeps;
the INTELLIGENCE_RESEARCH template (§6.1) is the named carrier for verifying the four UNKNOWN demand
sources — INTELLIGENCE_RESEARCH itself **NOT PROVEN in code** (live grep 2026-09-30 over
`ping-runtime` + `gateway` = zero hits) → it is a new bounded mission *label/template*, not a new authority.

**WORKERS:** `observation` worker; `meta-ai-research-worker` (VM-side, rotates briefs, emits raw
answers with provenance sidecars — the exact "sweep" shape INTELLIGENCE_RESEARCH describes —
worker-inventory, PROVEN); `recommendation` canonical worker.

**INPUT EVENTS:** `OBSERVATION_CREATED` (demand observations); `KNOWLEDGE_EXTRACT` missions;
connector-fetched records would arrive via `POST /ingest` canonical events (typed per `event_registry.json`).

**OUTPUT EVENTS:** `CLAIM_CREATED` / knowledge node candidates (TopicOpportunity as
`entity_type='TopicOpportunity'` candidate nodes); `MISSION_COMPLETED` with score payloads in
`result` JSONB (MissionRuntime `result` column — recon-d §c).

**KNOWLEDGE PRODUCED:** `knowledge_nodes` candidate rows (scores as payloads with confidence +
provenance); demand-sensor raw rows as canonical event payloads. The plan's "UPDATE KNOWLEDGE
(audience graph, opportunity scores)" loop step maps onto KnowledgePromoter promotion of scored nodes.

**NEW STORAGE REQUIRED?: NO.** Score records are knowledge payloads; sensor feeds are event payloads.
The comparator math (set-difference vs competitor corpora) is compute, not storage.

**NEW AUTHORITY REQUIRED?: NO** — with the standing kill criterion: if an OpportunityScore ever
drives auto-spend/auto-publish, that is an authority violation to stop, not a gap to fill. The
`authorizeWorkOrder` / operator-approval gates remain the only spend/publish authorities.

---

## ENGINE 4 — Content Memory
*Plan job:* semantic representation of everything created; `ContentArtifact` schema {source media,
transcript, segments[], hook, thesis, CTA, audience, experiment, derived assets[]}; one canonical
text representation drives derivatives; performance flows back to parent concepts.

**EXISTING PING PRIMITIVES (file:line):**
- Canonical event envelope: `createCanonicalObject`/`verifyCanonicalObject` at the ingest boundary,
  carried in `ping_events.metadata` (`canonical_object_id`, `canonical_hash`, `canonical_version`) —
  EVENT-FORENSICS.md §2D (PROVEN).
- Qdrant semantic projection: `embedding_service.js:132` in-process subscriber → Qdrant —
  EVENT-FORENSICS.md §2D (PROVEN wired); `brain-qdrant` container on the Pig (worker-inventory 2026-09-13).
- `HybridSearch` (vector + verify) — `ping-runtime/search/hybrid_search.js`.
- `knowledge_nodes` (entity payloads) + per-node provenance — recon-e §b.
- Transcript-adjacent existing machinery: `gateway/reflection_generator.js`,
  `gateway/knowledge_retrieval.js` (Q&A over Qdrant→Ollama), `ContextCompressionAuthority`
  (conversation→fact extraction — BUILT_NOT_LIVE, never instantiated — recon-e §a).

**EXISTING AUTHORITY:** `EvidenceAuthority.verify` (transcript-accuracy-style verification of claims
against sources — the existing "verify candidate content" primitive, PROVEN_INTEGRATION). NO
"ContentAuthority"/"ArtifactAuthority" was found; the `gateway/artifact_type_registry.js` file
appears in the 09-30 file inventory but was **not** audited for content — NEEDS-REVERIFY what it
declares (name ≠ authority; do not infer from filename).

**MISSION TYPES:** `DOCUMENT_IMPORT` → `'observation'` (live map) for raw media/transcript ingest;
`KNOWLEDGE_INDEX` → `'projection'` for semantic indexing of artifacts.

**WORKERS:** `observation` worker (transcript extraction), `projection` worker (semantic indexing to
Qdrant + knowledge nodes), `lineage` worker (`LINEAGE_CREATED` → parent/derivative edges —
`canonical_workers.js:510-543`, recon-d §a). VM-side: `ffmpeg` (inventory item list mentions ffmpeg
among cron-spawned agent tooling) for media derivation; the plan's waterfall derivatives are worker
behaviors, not new services.

**INPUT EVENTS:** `DOCUMENT_IMPORT`; `OBSERVATION_CREATED` (published-post metrics);
`CLAIM_GENERATE` (extract claims from transcript segments).

**OUTPUT EVENTS:** `CLAIM_CREATED`; `LINEAGE_CREATED` (derivative edges: short→parent video);
`PROJECTION_CREATED`; `WITNESS_CREATED` (where provenance witnessing applies).

**KNOWLEDGE PRODUCED:** `knowledge_nodes` rows `entity_type='ContentArtifact'` with
transcript/segments/hook/thesis/CTA/audience/experiment fields as payload; Qdrant vectors for the
canonical text; lineage edges parent→derivative; per-segment performance as event payloads
(POST_OUTPERFORMING_BASELINE observations) flowing back via `correlation_id`/`causation_id`.

**NEW STORAGE REQUIRED?: NO foundational storage; one honest gap noted.** No dedicated
content-artifact table exists in current evidence (table census from recon shows ping_events,
repository_events, canonical_events, ping_missions, knowledge_nodes, lineage_edges[dead-writer];
"artifact" hits in recon were about deployment artifacts, not a table). The artifact records fit as
(1) canonical event payloads, (2) `knowledge_nodes` entity rows, (3) Qdrant vectors. If a relational
home is preferred, a **domain-schema table** under existing namespace authority is permitted by the
charter — that is a schema, not an authority. Answer: NO new storage *authority*; a domain table is
optional and does not change the verdict.

**NEW AUTHORITY REQUIRED?: NO.** Artifacts are domain records; accuracy/verification rides
EvidenceAuthority; promotion rides KnowledgePromoter. The doctrine "one canonical text
representation" is a convention enforced by worker behavior, not an authority grant.

---

## ENGINE 5 — Experiment Engine
*Plan job:* every deliberate content decision carries a falsifiable hypothesis;
`ContentExperiment` {hypothesis, audience, variable, control, treatment, primary/secondary metrics,
guardrail, observation window, result SUPPORTED/FALSIFIED/INCONCLUSIVE}; doctrine: no winner declared
early; a result updates confidence, never policy directly (LEARNING ≠ AUTHORITY).

**EXISTING PING PRIMITIVES (file:line):**
- `MissionRuntime` mission rows with `result` JSONB + terminal statuses completed/failed —
  `ping-runtime/orchestration/mission_runtime.js` (PROVEN_INTEGRATION); experiment records are mission
  payloads/results today (the plan's build-order step 1 — extend queue.json entries — is the VM-side
  equivalent; the PING-side equivalent is a mission row).
- `verifyResultEnvelope` — 8-field envelope check; `{valid:false, retryable:false}` on failure —
  recon-d §e (PROVEN in ORCA path; content-truth verification explicitly NOT included — "records the
  validated claim, not a verified truth").
- `recordVerifiedResult` → canonical `WORKER_COMPLETED` / `WORKER_FAILED` with `logical_id: result_id`,
  `correlation_id`, `causation_id` (PROVEN, recon-d §e) — the outcome-record primitive.
- `REPLAY_VERIFY` → `'replay'` worker; `REPLAY_COMPLETED` event (recon-c census) — the existing
  re-verification primitive.
- `WitnessWorker` on `WITNESS_CREATE` (in-repo contract: `MISSION_WORKER_MAP['WITNESS_CREATE']='witness'`
  live 09-30; 09-19 recon had a rejection test guarding its removal — recon lane-c2 notes) —
  outcome witnessing.
- Dead-letter authority: `MissionScheduler._failMission` → dead-letter authority on exhaustion —
  recon-d §c (the existing failed-experiment terminal path).

**EXISTING AUTHORITY:** MissionRuntime (mission truth: create/claim/complete/fail/retry —
recon-d §f, PROVEN_INTEGRATION). **No "ExperimentAuthority" exists** (zero hits in recon; the concept
is plan-only). The plan's doctrine ("a result updates confidence, never policy directly") is
compatible: experiment rows carry confidence numbers, and policy change requires the separate
Learning Engine promotion path.

**MISSION TYPES:** none existing carries experiments; candidates for the bounded template:
a new label such as `EXPERIMENT_RUN` (or the plan's E-0017 shape) routed by `WorkerRuntime.dispatch()`
via a worker declaring it in `eventTypes` — a template addition, mirroring how INTELLIGENCE_RESEARCH
is specified in §6.1 (NOT PROVEN in code — new label, not new authority). `REPLAY_VERIFY` missions
cover the re-check leg.

**WORKERS:** a worker declaring the experiment event type in `eventTypes` (per the 09-30 dispatch
contract); `replay` worker; `witness` worker; VM-side: cron-spawned agents (experiment
setup/observation), `meta-ai-research-worker` for hypothesis-relevant research sweeps.

**INPUT EVENTS:** hypothesis/record creation via `POST /events` (typed, `event_registry.json`);
`REPLAY_VERIFY`; observation-window close could be a `MissionRuntime` `retry_at`-style durable delay
or a new bounded mission (Temporal durable timers are unwired — recon-f §a: zero workflows ever ran —
so the existing durable-delay-via-poll (`retry_at`) is the honest primitive).

**OUTPUT EVENTS:** `MISSION_COMPLETED`/`MISSION_FAILED` (with experiment result payload in `result`
JSONB); `WORKER_COMPLETED`/`WORKER_FAILED`; `WITNESS_CREATED`; `REPLAY_COMPLETED`.

**KNOWLEDGE PRODUCED:** experiment records as mission rows + `knowledge_nodes`
`entity_type='ContentExperiment'` candidates; verdicts SUPPORTED/FALSIFIED/INCONCLUSIVE are payload
states with confidence, feeding Learning via promotion.

**NEW STORAGE REQUIRED?: NO.** Mission rows (`payload`/`result` JSONB) + knowledge nodes suffice;
E-0017-style records in `queue.json` (plan build-order) are the VM-side file equivalent today.

**NEW AUTHORITY REQUIRED?: NO.** Experiment verdicts update confidence numbers on existing knowledge
machinery; they must never directly mutate policy — the plan states this, and PING has no policy-mutation
authority for them to collide with (no such authority exists to compete with).

---

## ENGINE 6 — Distribution Engine
*Plan job:* get the artifact to the audience, then bring back comparable measurements. Doctrine:
Business Suite/Creator Studio do scheduling/publishing/native insights — PING never rebuilds
distribution; typed connectors for everything else, each behind human or capability authorization;
**a connector executes; a connector never authorizes itself.** Human-in-the-loop approval is a
first-class step (Nolan approves every post).

**EXISTING PING PRIMITIVES (file:line):**
- Connector capability registry — `ping-runtime/connectors/capability_registry.js` +
  `constitutional_capability_contract.js` — typed per-category operations + providers
  (PROVEN_UNIT, recon-d §d). This is the typed-connector pattern the plan borrows from Activepieces.
- `IntegrationManager` (posthog/email/sms integrations registered in bootstrap) —
  EVENT-FORENSICS.md §2D (PROVEN wired); note recon-f §e: email/SMS/PostHog integrations are **stubs**
  ("not functional until SMTP configured"; Twilio not configured) — connectors exist as shapes, not
  live send paths.
- `ExternalAgentAdapter.authorizeWorkOrder` — the ONE live authorization decision for dispatching
  work to executors (fail-closed; capability ∈ profile allowlist; namespace match) — recon-d §e,
  recon-f §g (PROVEN_INTEGRATION).
- `AGENT_PROFILES` allowlists (7 LIVE profiles incl. hermes, ollama, copilot 1–4, codex,
  opencode-CLI — recon-d §d; the existing "who may execute what" executable truth).
- ORCA policy decision class REQUIRES_HUMAN_APPROVAL → escalation (`99-escalate.json`, exit 3);
  `APPROVAL_GATED_CAPABILITIES = ['email.send','sms.send']` — `orca/control-loop/policy/orca_policy.js`
  (PROVEN_RUNTIME in ORCA loop — recon-f §c).
- `BusinessActionAuthority` (PENDING_HUMAN→APPROVED/REJECTED/EXPIRED) and `EffectAuthority`
  (`generateEffectId`) — `ping-runtime/approval/*.js` — **in-memory, zero importers** (recon-f §e:
  EXPERIMENTAL, unwired). The durable-approval design (agent-f §f: PROPOSED_ACTION /
  ACTION_APPROVED/REJECTED/EXPIRED / EFFECT_* as canonical `ping_events` rows) is design-only,
  NOT PROVEN in code.

**EXISTING AUTHORITY:** `authorizeWorkOrder` (execution authorization) + ORCA policy (delegation
decision classes) + the operator (Nolan) as the human-approval authority by standing directive.
**No "DistributionAuthority" exists** (zero hits); none is wanted — the plan's connector doctrine
("a connector never authorizes itself") is already the PING-side rule (`no_canonical_events`,
`no_mission_state_writes` mandatory on work orders — recon-d §e).

**MISSION TYPES:** no existing mission type carries distribution; a bounded template such as
`DISTRIBUTION_RUN` (payload: artifact ref, channel, scheduled slot, approval ref) routed via
`WorkerRuntime.dispatch()` — new label, not new authority. Scheduling itself stays in Business Suite
(external to PING, per plan §2.6 and §4 "No scheduler").

**WORKERS:** connector workers keyed off `worker.eventTypes`; Hermes work orders via
`hermes_dispatch.py` (the one real external-effect executor — recon-f §e); VM-side: the existing
engagement workers are the closest operational precedent (`fb-engagement-worker` run_pass.sh/engage.js
— job-JSON-in/result-JSON-out service, worker-inventory PROVEN; `instagram-engagement-pass` cron
— browser-task based). These are marketing *engagement*, not content publishing — precedent for the
job-envelope pattern only, not reusable as-is for publishing.

**INPUT EVENTS:** human approval decision (operator; durable form = canonical approval events —
design-only, see above; today the plan's "Nolan approves every post" is an operator-law input,
not yet a PING event type); `DISTRIBUTION_RUN`-mission `MISSION_CREATED`.

**OUTPUT EVENTS:** `MISSION_COMPLETED`/`MISSION_FAILED`; `WORKER_COMPLETED`/`WORKER_FAILED` with
provider receipts (post IDs, scheduled slots) in `result`; platform metrics return as new
`OBSERVATION_CREATED` events (closing the loop: DISTRIBUTION → OBSERVATION per the plan's loop —
the plan's "bring back comparable measurements" is literally the existing observation intake).

**KNOWLEDGE PRODUCED:** metric rows as canonical event payloads (reach, engagement, follower delta,
clicks, UTM per the plan's Buffer-style normalized schema — a domain schema on event payloads);
`knowledge_nodes` for channel/audience performance candidates.

**NEW STORAGE REQUIRED?: NO.** Receipts and metrics are event payloads; the normalized metric
schema + UTM taxonomy are domain schemas on those payloads.

**NEW AUTHORITY REQUIRED?: NO — but the human-approval durability gap is real and pre-existing.**
The approval decision must be durable and canonical: the existing in-memory approval classes are
unwired (recon-f §e). Recording approvals as canonical `ping_events` rows (the agent-f §f design)
adds event *types*, not a new authority — and the growth-os plan already requires human approval as
operator law, so the engine does not need any PING authority it does not already have. The kill
criterion ("a signal that auto-publishes… gets stopped") is enforceable: nothing in the publish path
can execute without `authorizeWorkOrder` + approval-gated capabilities.

---

## ENGINE 7 — Learning Engine
*Plan job:* turn measured outcomes into bounded claims and reusable playbooks. "Remember why" record:
WHY CREATED / EVIDENCE / HYPOTHESIS / DECISION / OUTCOME / LEARNING / CONFIDENCE / NEXT TEST.
Doctrine: confidence is a number with evidence attached, never a promotion. Updates knowledge
(audience graph, opportunity scores) and the playbook (content-engine rules). The existing
post-publish loop OBSERVE→PUBLISH→VERIFY→REVIEW→ONE IMPROVEMENT→PATCH→TEST→RE-CERTIFY stands.

**EXISTING PING PRIMITIVES (file:line):**
- `KnowledgePromoter` — candidate→approved/rejected transitions on human approval events; ADD-only
  updates — `ping-runtime/knowledge/knowledge_promoter.js` (recon-e §b).
- `knowledge_nodes.status` ∈ {candidate, approved, rejected} + `confidence_provenance` (model vs
  canonical) — recon-e §b (PROVEN_INTEGRATION for node lifecycle code).
- `EvidenceAuthority.rank` — confidence × provenance × approved-weight scoring — recon-e §b.
- `HybridSearch` — verify-per-hit retrieval — `ping-runtime/search/hybrid_search.js`.
- Lineage: `LineageWorker` → `LINEAGE_CREATED` → ProjectionWorker — causation chains preserved via
  `metadata.causation_id`/`correlation_id` (recon-d §a; `MissionRuntime.getTrace` pattern).
- Verdict states: experiment result payloads (Engine 5) → promotion inputs.

**EXISTING AUTHORITY:** KnowledgePromoter (promotion decisions) + EvidenceAuthority (trust/rank).
**No "LearningAuthority"/"PlaybookAuthority" exists** (zero hits); the plan's doctrine
("LEARNING ≠ AUTHORITY", GROWTH-OS §2.5) explicitly forbids one. The playbook is *approved knowledge*,
not an authority.

**MISSION TYPES:** `KNOWLEDGE_EXTRACT`/`KNOWLEDGE_INDEX` (live map) for learning sweeps;
experiment-outcome review can ride `REPLAY_VERIFY` missions. Playbook updates are knowledge-node
transitions, not missions.

**WORKERS:** `knowledge-promotion` worker (live-registered); `projection` worker; `recommendation`
worker (live-registered); VM-side: the outreach engine's "learnings + angle-performance" loop
(worker-inventory item 10 — `angle-performance.md`, `learnings.md`: an existing "remember why"
operational precedent in file form) and cron-spawned review agents.

**INPUT EVENTS:** experiment outcome events (`MISSION_COMPLETED` with result payloads,
`WORKER_COMPLETED`); human approval events; `OBSERVATION_CREATED` (post-performance observations).

**OUTPUT EVENTS:** knowledge-node status transitions (candidate→approved/rejected) as the durable
learning record; `LINEAGE_CREATED` (learning→playbook-rule edges); `PROJECTION_CREATED`.

**KNOWLEDGE PRODUCED:** the "remember why" records as `knowledge_nodes`
`entity_type='LearningRecord'` payloads (the seven fields are payload schema); playbook rules as
`entity_type='PlaybookRule'` **approved** nodes; updated audience/opportunity scores as re-ranked
nodes (confidence updates, never silent overwrites — promoter is ADD-only).

**NEW STORAGE REQUIRED?: NO.** Learning records and playbook rules are knowledge payloads; the
VM-side precedent (`learnings.md`, `angle-performance.md`, queue.json extensions) already holds the
file-form version today.

**NEW AUTHORITY REQUIRED?: NO.** Learning writes go through the existing KnowledgePromoter /
EvidenceAuthority; confidence is "a number with evidence attached" (the plan's words), which is
exactly what `confidence_provenance` + `EvidenceAuthority.rank` already represent. The one standing
gap (from recon-e §b): PING has **no negative knowledge states** (no INSUFFICIENT_EVIDENCE /
STALE / UNVERIFIED as node states; only candidate/approved/rejected) — recording
SUPPORTED/FALSIFIED/INCONCLUSIVE experiment verdicts is expressible as payload states, but a
first-class "looked and found nothing" state does not exist. That is a schema extension on existing
authority, not a new authority.

---

## Loop → spine mapping (condensed)

| Growth OS loop step | PING spine step | Mechanism (cited above) |
|---|---|---|
| OBSERVATION | Canonical event intake | POST /ingest (`canonicalizeAndEmit`, lifecycle_stage 'observation') or POST /events (`emit`) → `ping_events` |
| SIGNAL | Typed observation extraction | `observation`/`classification` workers on `OBSERVATION_CREATED`; signals as event payloads |
| AUDIENCE / OPPORTUNITY | Candidate knowledge | `KNOWLEDGE_EXTRACT` missions; `knowledge_nodes` candidate rows; `recommendation` worker; `EvidenceAuthority.rank` |
| HYPOTHESIS | Bounded mission template | `INTELLIGENCE_RESEARCH` / `EXPERIMENT_RUN` labels (new labels, NOT PROVEN in code) via `MissionRuntime.create` / `EventToMissionBridge` |
| ARTIFACT | Worker execution + records | canonical workers; `ContentArtifact` knowledge rows; Qdrant vectors; `LINEAGE_CREATED` derivative edges |
| HUMAN APPROVAL | Operator law + approval gates | Nolan's standing directive; ORCA REQUIRES_HUMAN_APPROVAL/escalation; `APPROVAL_GATED_CAPABILITIES`; durable-approval events are design-only (NEEDS-REVERIFY if/when built) |
| DISTRIBUTION | Typed connectors (external scheduling) | connector capability registry; `authorizeWorkOrder`; Hermes dispatch; Business Suite owns scheduling (outside PING) |
| OBSERVATION (post) | Metric intake | platform metrics → `OBSERVATION_CREATED` (normalized metric schema + UTM as domain payload schema) |
| OUTCOME | Verified result record | `verifyResultEnvelope` → `recordVerifiedResult` → `WORKER_COMPLETED`/`WORKER_FAILED` |
| EVIDENCE | Evidence accumulation | `EvidenceAuthority.accumulate/verify/rank` |
| LEARNING | Promotion + confidence updates | `KnowledgePromoter` candidate→approved/rejected; `confidence_provenance`; "remember why" knowledge payloads |
| PLAYBOOK | Approved knowledge | `entity_type='PlaybookRule'` approved nodes; retrievable via `HybridSearch` |
| NEXT EXPERIMENT | New bounded mission | next `EXPERIMENT_RUN`/`INTELLIGENCE_RESEARCH` mission with lineage to the learning that motivated it |

**Content is a domain, not a platform:** every engine's durable output is either a canonical event
payload (typed via `event_registry.json`), a `knowledge_nodes` entity row, a mission row
(`payload`/`result` JSONB), or a Qdrant vector — all under existing authorities
(UnifiedEventRuntime, MissionRuntime, KnowledgePromoter, EvidenceAuthority, authorizeWorkOrder).

---

## Verdicts (per-engine, condensed)

| Engine | Primitives | Authority | Mission types | Workers | New storage? | New authority? |
|---|---|---|---|---|---|---|
| 1 Signal | CanonicalizationService, UnifiedEventRuntime, observation/classification workers, emit-observation.py | CanonicalizationService (ingress ns) + EvidenceAuthority; NO SignalAuthority (searched, absent — correct) | DOCUMENT_IMPORT, OBSERVATION_CREATE, KNOWLEDGE_EXTRACT (live map, PROVEN 09-30) | JS observation/classification; meta-ai-research-worker; emit-observation.py; outreach engine 4e | NO — event payloads + knowledge nodes; taxonomy is domain schema | NO — signals never authorize (plan doctrine = existing design) |
| 2 Audience Graph | knowledge_graph.js, knowledge_nodes, KnowledgePromoter, HybridSearch, EvidenceAuthority.rank | KnowledgePromoter + EvidenceAuthority; NO AudienceAuthority (absent — correct) | KNOWLEDGE_INDEX, KNOWLEDGE_EXTRACT (live map) | projection, observation, knowledge-promotion workers | NO — AudienceCluster as entity_type on knowledge_nodes + relationship edges | NO — clusters are computed projections; identity stitching is bounded analysis, not authority |
| 3 Opportunity | recommendation worker, EvidenceAuthority.rank, connector capability registry, VM-side outreach opportunity-engine precedent | NONE (by design — score is recommendation only) | KNOWLEDGE_EXTRACT; INTELLIGENCE_RESEARCH template (NOT PROVEN in code — new label) | observation; recommendation; meta-ai-research-worker (sweep shape matches §6.1) | NO — scores as knowledge payloads; sensor rows as event payloads | NO — kill criterion enforceable by existing gates |
| 4 Content Memory | canonical envelope, embedding_service→Qdrant, HybridSearch, knowledge_nodes, LineageWorker | EvidenceAuthority (verification); NO ContentAuthority (gateway/artifact_type_registry.js content NEEDS-REVERIFY — not audited) | DOCUMENT_IMPORT, KNOWLEDGE_INDEX (live map) | observation, projection, lineage workers; ffmpeg (VM-side) | NO foundational — optional domain-schema table permitted; payloads+nodes+Qdrant suffice | NO |
| 5 Experiment | MissionRuntime (+result JSONB), verifyResultEnvelope, recordVerifiedResult, REPLAY_VERIFY/replay worker, WitnessWorker, dead-letter authority | MissionRuntime (mission truth); NO ExperimentAuthority (absent — correct) | REPLAY_VERIFY (live); EXPERIMENT_RUN label (new, NOT PROVEN) | replay, witness workers; worker declaring experiment eventTypes; cron agents | NO — mission rows + knowledge nodes; E-0017/queue.json is today's file form | NO — verdicts update confidence numbers, never policy |
| 6 Distribution | connector capability registry, IntegrationManager (stubs), authorizeWorkOrder, AGENT_PROFILES, ORCA REQUIRES_HUMAN_APPROVAL/escalation, approval classes (in-memory, unwired) | authorizeWorkOrder + ORCA policy + operator (Nolan); NO DistributionAuthority (absent — correct) | DISTRIBUTION_RUN label (new, NOT PROVEN); scheduling stays in Business Suite | connector workers; Hermes dispatch; engagement-worker job-envelope precedent (VM-side) | NO — receipts/metrics as event payloads; metric schema + UTM are domain schemas | NO — but the durable human-approval record is a pre-existing gap (approval classes unwired; canonical approval events are design-only) |
| 7 Learning | KnowledgePromoter, knowledge_nodes status/confidence_provenance, EvidenceAuthority.rank, HybridSearch, LineageWorker, VM-side learnings.md/angle-performance.md precedent | KnowledgePromoter + EvidenceAuthority; NO LearningAuthority (absent — correct, plan forbids) | KNOWLEDGE_EXTRACT/INDEX; REPLAY_VERIFY | knowledge-promotion, projection, recommendation workers | NO — "remember why" + PlaybookRule as knowledge payloads | NO — known schema gap: no INSUFFICIENT_EVIDENCE/STALE/UNVERIFIED node states (payload workaround exists) |

**New-storage / new-authority answers that came back YES: NONE.** All seven engines: NEW STORAGE
REQUIRED = NO (domain schemas on existing stores permitted; Content Memory's dedicated table is
optional, not foundational), NEW AUTHORITY REQUIRED = NO (seven times).

**What is genuinely new (bounded, non-authority):**
1. Mission *labels/templates*: `INTELLIGENCE_RESEARCH` (§6.1 — live grep 2026-09-30: zero hits,
   NOT PROVEN in code), `EXPERIMENT_RUN`, `DISTRIBUTION_RUN` — routed by the existing
   `WorkerRuntime.dispatch()` once a worker declares them in `eventTypes`.
2. Event *payload schemas* (domain): signal taxonomy fields, normalized metric schema + UTM taxonomy,
   ContentArtifact / ContentExperiment / LearningRecord / PlaybookRule / AudienceCluster /
   TopicOpportunity fields — typed via `event_registry.json` or `knowledge_nodes` entity payloads.
3. One durable-approval mechanism if the operator wants approval records inside PING: canonical
   approval event types (agent-f §f design) — pre-existing gap, not engine-created.

**Needs-reverify list (for the coordinator):**
- `gateway/artifact_type_registry.js` — present in 09-30 inventory, contents not audited; do not let
  the name imply an authority.
- Live behavior of canonical workers beyond registration (per-event behavior was startup-log only in
  09-18 evidence; 09-29/30 interval writers may have changed dispatch semantics).
- Whether the deployed gateway's `POST /events` matches either Pig-side copy (EVENT-FORENSICS.md §2D
  unresolved question — unchanged by this lane).
- The 09-18 branch base (`feature/approval-effect-identity` @ `88c9651be`) vs the 09-30 canonical
  branch (`refactor/runtime-authority-convergence`) — module paths were corroborated by the 09-30
  remote read and file inventory, but full semantic equivalence across branches was not re-proven here.
