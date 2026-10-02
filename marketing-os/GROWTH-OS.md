# Content Intelligence + Growth OS — Architecture Plan

Built 2026-09-30. Status: CONVERGED (rewritten 2026-09-30 after the PING intelligence-convergence forensics).
Every engine below maps onto an existing PING primitive or authority. No new storage, no new authority, no new constitutional owner. The five genuinely missing items are bounded and enumerated in §9; they are labels, vocabulary fields, event types, one producer, and worker behaviors.

Evidence grades: VERIFIED (primary source seen), INFERRED (reasonable reading), UNKNOWN (not settled).
Standing brand laws apply to everything derived from this file.

## 0. The one-line design

Meta Business Suite and Creator Studio do the heavy lifting: scheduling, publishing, native insights, and any native testing. PING does the thinking around them: what to make, why, for whom, what happened, what was learned. We never rebuild what the platforms give us free. The moat is institutional memory about why attention turns into outcomes, wired into the evidence, event, and replay architecture PING already runs.

Forensics headline (2026-09-30, ~/workspace/forensics/ping-intelligence-convergence-2026-09-30/06-convergence-map.md): the seven engines map onto existing PING primitives and authorities with zero new storage and zero new authority. There is no MarketingOS database, no ResearchAgent truth store, no ContentBrain memory, no GrowthAgent authority. Every durable record lands in one of four existing homes: `ping_events`, `ping_missions`, `knowledge_nodes`/`knowledge_edges`, or Qdrant vectors.

## 1. The loop, on the PING spine

```
OBSERVATION → SIGNAL → AUDIENCE / OPPORTUNITY → HYPOTHESIS → CONTENT ARTIFACT
    → HUMAN APPROVAL → DISTRIBUTION → OBSERVATION → OUTCOME → EVIDENCE
    → LEARNING → PLAYBOOK → NEXT EXPERIMENT
```

Each step rides an existing mechanism:

| Growth OS step | PING spine step | Mechanism |
|---|---|---|
| OBSERVATION | Canonical event intake | `POST /ingest` → `CanonicalizationService.canonicalizeAndEmit` (`ping-runtime/canonicalization/canonicalization_service.js:149`, lifecycle_stage `'observation'`) or `POST /events` → `UnifiedEventRuntime.emit` → the single `INSERT INTO ping_events` (`ping-runtime/events/unified_event_runtime.js:289`, `ON CONFLICT (event_id) DO NOTHING`) |
| SIGNAL | Typed observation extraction | `observation` / `classification` canonical workers on `OBSERVATION_CREATED` (`ping-runtime/workers/canonical_workers.js`); signals as event payloads |
| AUDIENCE / OPPORTUNITY | Candidate knowledge | `KNOWLEDGE_EXTRACT` missions; `knowledge_nodes` candidate rows (`ping-runtime/knowledge/knowledge_graph.js`); `recommendation` canonical worker; `EvidenceAuthority.rank` (`ping-runtime/evidence/evidence_authority.js`) |
| HYPOTHESIS | Bounded mission template | `INTELLIGENCE_RESEARCH` / `EXPERIMENT_RUN` labels via `MissionRuntime.create` (`ping-runtime/orchestration/mission_runtime.js:32`) and `EventToMissionBridge` (`ping-runtime/orchestration/event_to_mission_bridge.js:60`) |
| ARTIFACT | Worker execution + records | canonical workers; `ContentArtifact` knowledge rows; Qdrant vectors (`ping-runtime/embeddings/embedding_service.js:132`); `LINEAGE_CREATED` derivative edges (`canonical_workers.js:510-543`) |
| HUMAN APPROVAL | Operator law + approval gates | Nolan approves every post (standing directive, never changes); ORCA `REQUIRES_HUMAN_APPROVAL` → escalation (`orca/control-loop/policy/orca_policy.js`); `APPROVAL_GATED_CAPABILITIES = ['email.send','sms.send']`; durable approval events = canonical `ping_events` rows (PROPOSED_ACTION / ACTION_APPROVED / REJECTED, §9.3) |
| DISTRIBUTION | Typed connectors (external scheduling) | connector capability registry (`ping-runtime/connectors/capability_registry.js`); `authorizeWorkOrder` (`ping-runtime/external-agent/external_agent_adapter.js`, fail-closed, the ONE live execution authorization); Hermes dispatch; scheduling itself stays in Business Suite (outside PING) |
| OBSERVATION (post) | Metric intake | platform metrics → `OBSERVATION_CREATED` via `POST /ingest` (normalized metric schema + UTM taxonomy as domain payload schema, §2.6) |
| OUTCOME | Verified result record | `verifyResultEnvelope` → `recordVerifiedResult` → `WORKER_COMPLETED` / `WORKER_FAILED` (`external_agent_adapter.js`) |
| EVIDENCE | Evidence accumulation | `EvidenceAuthority.accumulate` / `verify` / `rank` |
| LEARNING | Promotion + confidence updates | `KnowledgePromoter` candidate → approved / rejected (`ping-runtime/knowledge/knowledge_promoter.js`, ADD-only); `confidence_provenance`; "remember why" knowledge payloads |
| PLAYBOOK | Approved knowledge | `entity_type='playbook_rule'` approved `knowledge_nodes` rows; retrievable via `HybridSearch` (`ping-runtime/search/hybrid_search.js`) |
| NEXT EXPERIMENT | New bounded mission | next `EXPERIMENT_RUN` / `INTELLIGENCE_RESEARCH` mission with `correlation_id` / `causation_id` lineage to the learning that motivated it |

Two outputs at the bottom: UPDATE KNOWLEDGE (audience graph, opportunity scores — `knowledge_nodes` via the promoter) and UPDATE PLAYBOOK (content-engine rules — approved `playbook_rule` rows). Nolan approves every post before it publishes. That never changes.

## 2. The seven engines, converged

### Engine 1: Signal Engine
Job: normalize raw observations into typed, evidence-backed signals.

Pipeline: Raw Observation → Normalized Signal → Entity Resolution → Context → Materiality → Opportunity / Risk / Hypothesis.

Primitives: `CanonicalizationService.canonicalizeAndEmit` (canonical envelope, `lifecycle_stage: 'observation'`, confidence default 0.5); `UnifiedEventRuntime.emit` (content-hash identity, deduped append); `ObservationWorker` / `ClassificationWorker` (`canonical_workers.js`); VM-side producers: the `meta-ai-research-worker` sweep shape (`~/workspace/tandem/prompts/`, rotating briefs + provenance sidecars), `~/workspace/tandem/emit-observation.py`, the daily Page-insights cron.

Authorities: `CanonicalizationService.authorizeNamespace` (namespace ingress authorization only) + `EvidenceAuthority` (evidence attachment). NO SignalAuthority — correctly absent by design.

Doctrine: signals are observations. They are not truth and they are not authority. A signal never authorizes anything on its own. (This is not a new rule; it is the existing PING design.)

Signal taxonomy (v0, domain vocabulary as `kind='signal:<VALUE>'` event payloads, not a new object): SEARCH_DEMAND_RISING, COMPETITOR_TOPIC_ACCELERATING, AUDIENCE_QUESTION_REPEATING, VIDEO_RETENTION_ANOMALY, CONTENT_DECAY_DETECTED, HIGH_INTENT_COMMENT, CUSTOMER_PAIN_REPEATING, POST_OUTPERFORMING_BASELINE, POST_UNDERPERFORMING_BASELINE, TOPIC_SATURATION_RISING, NEW_PLATFORM_FORMAT_EMERGING, PRODUCT_SIGNAL_CORRELATES_WITH_CONTENT.

Borrowed: PostHog's event capture with identity stitching (VERIFIED mechanics; independent results include ~30% funnel drop-off reduction from replay-driven fixes). Common Room's signal-attached-to-entity model (UNKNOWN, unverified, assigned as PING's first training task in section 6.3).

First signals to implement: POST_OUTPERFORMING_BASELINE and POST_UNDERPERFORMING_BASELINE, computed from the Page insights the daily cron already pulls. Zero new infrastructure: signals live as canonical event payloads + knowledge nodes.

### Engine 2: Audience Graph
Job: model who cares, what they care about, where they spend attention, and how clusters overlap.

Schema: AudienceCluster as `knowledge_nodes` rows with `entity_type='audience_cluster'`: problems, questions, vocabulary, sophistication, websites, creators, YouTube channels, podcasts, communities, search queries, tools, competing products, preferred formats, observed engagement, evidence[] (event_id / `source_event_id` refs). Overlap recorded as relationship edges (`gateway/relationship_objects.js`), never flattened.

Primitives: `knowledge_nodes` (status candidate/approved/rejected, `confidence_provenance`, `source_event_id`, `correlation_id`); `KnowledgePromoter`; `HybridSearch` with `EvidenceAuthority.verify` per hit; `projection` worker for cluster computation.

Authorities: `KnowledgePromoter` (candidate → approved transitions) + `EvidenceAuthority`. NO AudienceAuthority — correctly absent. Clusters are computed projections, not authorities.

Doctrine: clusters, not personas. One person belongs to many clusters at once (local-business operators, agent-runtime engineers, self-hosting enthusiasts). Affinity is computed from observed behavior against a baseline, never from demographics alone. No silent merges: PING has no merge/dedupe logic, so "one person in many clusters" is naturally representable. Anonymous-to-known stitching is a bounded analysis behavior over `knowledge_nodes` (evidence-linked edges), not an authority (§9.5).

Borrowed: SparkToro's attention-affinity matrix (VERIFIED mechanics: 70M+ crawled public profiles plus Datos clickstream panel; behavioral cohort selectors; one-vote-per-profile aggregation so power users cannot skew results; affinity as over-representation versus the average internet user; confidence reported from sample size and homogeneity. Evidence: Truly Inc margins 7% to 37% after adopting audience research; methodology corroborated by independent explainers).

v0: two hand-built clusters with evidence links: (a) the technical audience from the 2026-09-30 strategy, (b) the commercial home-services pillar audience.

### Engine 3: Opportunity Engine
Job: rank what is worth making.

Formula: Audience Wants − Existing Internet Coverage − Our Existing Coverage + Our Unique Evidence + Business Relevance = Content Opportunity.

Primitives: `recommendation` canonical worker (live-registered); `EvidenceAuthority.rank` (score = confidence × provenance — the existing "rank things with evidence" primitive); connector capability registry for demand-sensor typed connectors; VM-side precedent: the outreach engine's opportunity engine and WHY THIS BUSINESS packets (operational pattern, different domain).

Authorities: NONE for opportunity scoring, and by design there must never be one.

Doctrine: PING asks "what can we say that is useful, demanded, differentiated, and supported by evidence we actually possess," not "what can we rank for." OpportunityScore is a recommendation, never an authority. It cannot approve, publish, or spend by itself. If a score ever drives auto-spend or auto-publish, that is an authority violation to stop, not a gap to fill.

Borrowed: Ahrefs competitor-corpus set-difference with the ≥2-competitor intersect filter (VERIFIED workflow; the noise-reduction trick worth copying: a topic two competitors rank for is real demand, not a data artifact). Semrush's evidence-backed brief as the research-to-production contract (VERIFIED workflow: the brief carries the query set, intent profile, and competitor structure; production is scored against it).

Outcome evidence for the pattern: 2–25x traffic gains across independent cases (HubSpot cluster restructuring, +2,424% topical map, +97.75% in 1 month, 57% faster traffic gain per Growth Memo). Honest caveat, recorded permanently: Google never endorsed "topic clusters" as a ranking factor; the measurable mechanism is coverage plus internal linking. The widely quoted "43% average lift" traces to no primary study and is never cited.

Demand sensor: TopicOpportunity records as `knowledge_nodes` candidates with demand, growth, acceleration, competition, audience_fit, PING_relevance, evidence_quality, freshness (0–1 each). Candidate sources: Google Trends API alpha (UNKNOWN, verify), Exploding Topics API (UNKNOWN, verify), YouTube and search demand, own analytics. Demand sensors arrive as ordinary `OBSERVATION_CREATED` events once verified; the sensor gap is a data-source gap, not a PING gap.

### Engine 4: Content Memory
Job: semantic representation of everything created.

Schema: ContentArtifact as `knowledge_nodes` rows with `entity_type='content_artifact'`: source media, transcript, segments[] (timestamp, speaker, topic, claim, evidence, visual, performance), hook, thesis, CTA, audience, experiment, derived assets[].

Primitives: canonical event envelope (`canonical_object_id`, `canonical_hash` in `ping_events.metadata`); Qdrant semantic projection (`embedding_service.js:132`); `HybridSearch`; `LineageWorker` (`LINEAGE_CREATED` parent → derivative edges); `EvidenceAuthority.verify` (claim-accuracy verification of artifact content); `KnowledgePromoter` (promotion of approved artifacts).

Authorities: `EvidenceAuthority` (verification) + `KnowledgePromoter` (promotion). NO ContentAuthority.

Doctrine: one canonical text representation drives all derivatives. Edits propagate because every output reads the same representation. The waterfall (one long video → shorts → clips → posts → article → email) produces descendants of a single artifact; performance flows back to parent concepts, not just to the asset. The doctrine "one canonical text representation" is a convention enforced by worker behavior, not an authority grant.

Borrowed: Descript's transcript-as-editable-source (VERIFIED mechanics; independent evidence: >70% editing-time reduction, ~3x output per recording, 10+ hours/week saved in an independent 90-day review). Guardrails copied: mandatory transcript-accuracy pass before editing (bounded worker behavior, §9.5); consent-gated voice synthesis.

### Engine 5: Experiment Engine
Job: every deliberate content decision carries a falsifiable hypothesis.

Schema: ContentExperiment as `EXPERIMENT_RUN` mission rows (`payload` / `result` JSONB): hypothesis, audience, variable, control, treatment, primary metric, secondary metrics, guardrail, observation window, result (SUPPORTED / FALSIFIED / INCONCLUSIVE — payload states, §9.2).

Primitives: `MissionRuntime` mission rows with terminal `completed` / `failed` (`mission_runtime.js:160-175`); `verifyResultEnvelope` → `recordVerifiedResult` → `WORKER_COMPLETED` / `WORKER_FAILED`; `REPLAY_VERIFY` → `replay` worker; `WitnessWorker` (outcome witnessing); dead-letter path for exhausted experiments (`MissionScheduler._failMission`).

Authorities: `MissionRuntime` (mission truth). NO ExperimentAuthority — correctly absent.

Doctrine: no winner declared early (the 30-post discovery program stands). A result updates confidence, never policy directly. LEARNING ≠ AUTHORITY. Experiment verdicts update confidence numbers on existing knowledge machinery; they must never directly mutate policy.

Borrowed: Langfuse's trace → score → dataset → experiment → evaluation → new version loop (VERIFIED mechanics; cross-vendor convergence: OpenAI Codex evals use the same shape). Translated to content: production post → scored outcome → dataset of examples → new creative variant tested against the dataset. Plus PostHog's retention-tested activation metric and "stuck" cohort → replay → experiment loop (VERIFIED: 20%→70% conversion via experiments).

Today's TypeSafe post becomes Experiment E-0017, the first record in this schema.

### Engine 6: Distribution Engine
Job: get the artifact to the audience, then bring back comparable measurements.

Primitives: connector capability registry (`ping-runtime/connectors/capability_registry.js` + `constitutional_capability_contract.js`); `ExternalAgentAdapter.authorizeWorkOrder` (the ONE live execution authorization, fail-closed); `AGENT_PROFILES` allowlists; ORCA `REQUIRES_HUMAN_APPROVAL` → escalation; Hermes dispatch (the one real external-effect executor).

Authorities: `authorizeWorkOrder` (execution authorization) + ORCA policy (delegation classes) + the operator (Nolan) as the human-approval authority by standing directive. NO DistributionAuthority — none is wanted.

Doctrine: Business Suite and Creator Studio do the heavy lifting. Scheduling, publishing, native insights, and any native testing live there. PING never rebuilds distribution. Typed connectors cover everything else, each behind human or capability authorization. A connector executes; a connector never authorizes itself. (This is already the PING-side rule: work orders carry `no_canonical_events` and `no_mission_state_writes`.)

Human-in-the-loop approval is a first-class step, which Nolan's approval law already requires. The approval record is durable: PROPOSED_ACTION / ACTION_APPROVED / REJECTED as canonical `ping_events` rows through `UnifiedEventRuntime.emit` (event vocabulary, not a new authority — §9.3). The kill criterion (a signal that auto-publishes gets stopped) is enforceable by construction: nothing in the publish path can execute without `authorizeWorkOrder` + approval-gated capabilities.

Borrowed: Buffer's normalized cross-channel metric schema plus UTM taxonomy (VERIFIED mechanics: without one schema and one tagging convention, the cross-channel comparison table cannot exist). Every distributed artifact becomes a comparable row: reach, engagement, follower delta, clicks, UTM. For the connector pattern: Activepieces' typed packages as shared workflow-plus-agent tools (INFERRED from architecture docs; 24.3k stars; no independent outcome evidence found, flagged).

### Engine 7: Learning Engine
Job: turn measured outcomes into bounded claims and reusable playbooks.

Record ("remember why") as `knowledge_nodes` rows with `entity_type='learning'`: WHY CREATED / EVIDENCE / HYPOTHESIS / DECISION / OUTCOME / LEARNING / CONFIDENCE / NEXT TEST in `data` JSONB + `confidence` + `confidence_provenance`. Playbook rules as `entity_type='playbook_rule'` APPROVED nodes.

Primitives: `KnowledgePromoter` (candidate → approved / rejected, ADD-only); `knowledge_nodes.status` + `confidence_provenance`; `EvidenceAuthority.rank`; `HybridSearch`; `LineageWorker` (learning → rule edges via `LINEAGE_CREATED`); `MissionRuntime.getTrace` for causal chains; VM-side precedent: `learnings.md` / `angle-performance.md`.

Authorities: `KnowledgePromoter` + `EvidenceAuthority`. NO LearningAuthority — the plan forbids it, and PING has no policy-mutation authority for it to collide with. The playbook is approved knowledge, retrievable inventory — not an authority.

Doctrine: confidence is a number with evidence attached, never a promotion. Learning updates knowledge (audience graph, opportunity scores) and the playbook (content-engine rules). The existing post-publish loop stands: OBSERVE → PUBLISH → VERIFY → REVIEW → ONE IMPROVEMENT → PATCH → TEST → RE-CERTIFY. Synthesis never overwrites tagged knowledge; it adds (the promoter's ADD-only provenance contract: `knowledge_promoter.js:109`, `knowledge_graph.js:93-100`).

Borrowed: GenStudio's approved-library plus attribute-level feedback (INFERRED from Adobe docs; no independent outcome evidence): only approved assets become reusable inventory; performance feeds back at the attribute level (hook type, format, claim style), not just the asset level.

Known schema gap (honest): PING has no negative knowledge states — no INSUFFICIENT_EVIDENCE / STALE / UNVERIFIED node states (only candidate/approved/rejected). Recording SUPPORTED / FALSIFIED / INCONCLUSIVE verdicts is expressible as payload states; a first-class "looked and found nothing" state does not exist. That is a schema extension on existing authority if ever wanted, not a new authority.

## 3. CRM underneath, not beside

Object model over existing primitives, not a new database: Person, Organization, AudienceCluster, Topic, Signal, ContentArtifact, Campaign, Experiment, Observation, Outcome, Opportunity, Customer, Conversation, Channel as `knowledge_nodes` entity rows and canonical event payloads, with arbitrary relationships as `knowledge_edges`. Borrow Twenty's metadata-defined objects with generated typed APIs as the design reference (VERIFIED architecture: 43k+ stars, AGPL-3.0; AI workflow features pre-release, no outcome case studies). PING does not need to be Twenty; it needs the object model expressed on its own spine. Then the graph can answer: Topic → resonates_with → Audience → overlaps → Audience → follows → Creator → discusses → Topic → demonstrated_by → Video → generated → QualifiedLead. Marketing intelligence becomes business intelligence.

## 4. What PING does NOT build

- No attribution suite. HubSpot's lesson (VERIFIED limits): attribution needs identity, misses dark social, samples at volume, is contact-based rather than committee-based, and attribution is not incrementality. Use platform-native analytics for in-platform creative decisions; keep one agreed source of truth for business results.
- No rank tracker, no SEO suite. Borrow the brief and the set-difference; do not rebuild the corpus.
- No scheduler. Business Suite owns it.
- No journey engine yet. Mautic's pattern is proven (2M+ reach, 56% open rates, +80% ROI cases) but email nurture is secondary for a technical audience behind docs, SEO, and community. Borrow dynamic segments plus negative paths when nurture volume justifies it.
- No GenStudio-style suite. Steal "approved library plus attribute-tagged feedback," not the machinery.
- No new authority or store for any engine. Ever. The forensics closed this question: 14 capabilities mapped, 8 with no gap at all, 5 bounded gaps, all vocabulary/label/behavior-level.

## 5. Failure modes this design guards against

1. Vanity metrics as scoreboard → the two standing tables (distribution vs audience quality) plus experiment results recorded as SUPPORTED / FALSIFIED / INCONCLUSIVE, never "went well."
2. No documented strategy → this doc plus EXPERIMENT-PLAN.md are the strategy; every post carries a hypothesis.
3. Identity gap → identify() discipline wherever the loop touches the website; anonymous-to-known stitching is a bounded analysis behavior (§9.5), never an identity authority.
4. Silent automation failure → every scheduled loop gets a heartbeat; a healthy-looking dashboard over dead crons is a documented failure mode (Mautic lesson).
5. Attribution fragmentation → one source of truth for business results; platform-native analytics only for in-platform optimization.
6. Tool sprawl → connector doctrine: typed packages, versioned flows, no custom spaghetti.
7. Authority creep → §8 kill criteria, enforceable by existing gates.

## 6. TRAINING PING: the research loop as a PING capability

"Train PING to do the same thing you're doing" means PING can run the exact loop from 2026-09-30: broad research → evidence grading → claim verification → tagged synthesis → next questions. Specified here as a mission template on existing PING machinery. No new authority is created.

### 6.1 The mission template: INTELLIGENCE_RESEARCH

Fields: questions[] (explicit, falsifiable); claims_to_verify[] (each with its claimed source); evidence_requirements (primary sources first: official docs, repos, papers, maintainer statements; a live call beats docs; docs beat marketing prose); output_schema (claim, verdict CONFIRMED / REFUTED / UNCLEAR, evidence URLs, evidence grade: vendor-described / independent / unreplicated); synthesis_rule (map each confirmed mechanism to the engine it belongs in; flag vendor marketing without independent evidence).

Execution: `MissionRuntime.create('INTELLIGENCE_RESEARCH', payload)`; `MissionScheduler` polls; a research worker declaring the label in `eventTypes` runs the sweep against this brief (the VM-side `meta-ai-research-worker` sweep shape: rotating briefs + provenance sidecars). A review step reads everything, grades the evidence, and records honest caveats. Unverified claims become the next mission's input via the chaining rule (§9.5) with `correlation_id` / `causation_id` lineage. That is the training loop: each run writes the next run's checklist.

The label itself is a bounded convention on the existing MissionRuntime (landing in the forensics-fix program, §9.1), not a new authority.

### 6.2 The synthesis contract

Findings merge into the knowledge base with VERIFIED / INFERRED / UNKNOWN tags (data convention on `Assessment` / knowledge metadata — `runtime/kernel/identity/assessment.ts:9-20`). Synthesis never overwrites tagged knowledge; it adds. Every borrowed primitive records its evidence grade and its caveats at the point of use. Standing rule: a stat without a primary source is never cited, no matter how widely repeated.

### 6.3 First training run (PING's homework: check my homework)

This plan contains four UNKNOWN claims. PING's first INTELLIGENCE_RESEARCH mission verifies them:

1. Google Trends API alpha: rolling five years, regular aggregation, sub-geographic data, combinable scaling. (Check: Google for Developers.)
2. Exploding Topics API: topics, products, startups, meta-trends.
3. Common Room: GitHub actions, forum questions, pricing-page visits, competitor changes, usage spikes, social engagement, job postings, doc visits, support interactions as signals attached to people and organizations.
4. changedetection.io: page monitoring plus change detection. (Check: GitHub.)

Verdicts feed back into sections 2.1 and 2.3. Until then, the demand sensor and signal taxonomy treat these as UNKNOWN, not as dependencies.

### 6.4 How it plugs into PING (no new authority)

The research loop is missions with a research worker type, emitting evidence, reviewed, merged into knowledge. The Signal Engine's observations, the Experiment Engine's outcomes, and the Learning Engine's playbooks are all existing PING concepts (observation → evidence → knowledge → action). INTELLIGENCE_RESEARCH is a mission label, not a new constitutional owner. The seven engines are capabilities with explicit boundaries, each mapped to existing ownership.

## 7. Build order (smallest first, conservative)

1. Experiment records on every post starting now. E-0017 (today's TypeSafe post) is the first. Zero new infra: extend the queue.json entry with the ContentExperiment fields; PING-side, `EXPERIMENT_RUN` mission rows (§9.1).
2. "Remember why" fields on content artifacts. Same file, same pass; PING-side, `entity_type='learning'` knowledge rows.
3. Normalized metric schema plus UTM taxonomy in the daily loop. The cron already pulls metrics; normalize them into comparable rows and POST them as observations through `POST /ingest` (§9.4).
4. Semantic media model for the next video package. Transcript-first, accuracy pass (§9.5), derivatives from the transcript.
5. Demand sensor spike. Run the training mission (6.3) first, then wire the cheapest verified source.
6. Audience Graph v0. Two clusters, hand-built, evidence-linked, as `knowledge_nodes` rows.
7. Competitor diff robots. Maxun-pattern, only after 1–6 are routine.
8. Full signal taxonomy. Last. Twelve signal types are a roadmap, not a starting line.

## 8. Kill criteria

- Any engine that starts minting authority (a signal that auto-publishes, a score that spends budget) gets stopped, not debated. Enforceable by construction: nothing downstream of an observation can spend, publish, or mutate without `authorizeWorkOrder` / approval gates.
- A borrowed primitive whose evidence collapses on re-verification gets removed from the plan, with the removal recorded.
- If the loop ever produces posts without hypotheses, the loop is broken; fix the loop before making more posts.

## 9. The five bounded gaps (forensics verdict, being fixed, not designed)

These are the only genuinely missing items. All are vocabulary, label, or behavior-level. None is a new authority, store, or constitutional owner.

1. **Mission labels** — `INTELLIGENCE_RESEARCH`, `EXPERIMENT_RUN`, `DISTRIBUTION_RUN`: bounded labels/templates on the existing MissionRuntime, routed by `WorkerRuntime.dispatch()` once a worker declares them in `eventTypes`. Payload schemas: §6.1 fields; experiment design in `payload` JSONB, outcome in `result` JSONB, terminal `completed` / `failed`; distribution receipts in `result` JSONB.
2. **Verdict vocabularies** — field conventions, not objects: `CONFIRMED / REFUTED / UNCLEAR` on claim payloads (EvidenceAuthority.verify path); `SUPPORTED / FALSIFIED / INCONCLUSIVE` on experiment outcomes; evidence grades `vendor-described / independent / unreplicated` (Evidence metadata); `VERIFIED / INFERRED / UNKNOWN` synthesis tags (Assessment / knowledge metadata convention).
3. **Durable human-approval record** — canonical event types `PROPOSED_ACTION / ACTION_APPROVED / REJECTED` (+ `EFFECT_*` if the lifecycle needs them) recorded through the single existing `UnifiedEventRuntime.emit` choke point. The in-memory approval classes stay unwired; no approval authority is built. These event types inherit the T06 redaction choke point.
4. **Metrics producer** — `POST /ingest` is the live canonical observation door with zero production callers. One producer POSTs normalized metric observations (Buffer-style schema + UTM taxonomy) through `/ingest`, reusing the daily Page-insights collection path.
5. **Bounded analysis behaviors** — (a) chaining rule: unverified/remaining claims propose the next `INTELLIGENCE_RESEARCH` / `EXPERIMENT_RUN` mission via `MissionScheduler` / `EventToMissionBridge` with correlation/causation lineage; (b) contradiction detection over claims; (c) identity stitching (anonymous-to-known, analysis only); (d) transcript-accuracy pass behavior. Worker behaviors, never authorities.

---

*Research basis: deep research 2026-09-30 (report: ~/workspace/research_notes/marketing-os-borrowable-loops-20260930-1636/report.md) plus Nolan's seven-engine design. Convergence forensics: ~/workspace/forensics/ping-intelligence-convergence-2026-09-30/ (06-convergence-map.md headline, 05-engine-mapping.md per-engine evidence). Full source list lives in the research report.*
