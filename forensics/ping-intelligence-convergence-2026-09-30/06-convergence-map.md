# L6 — Intelligence Convergence Map + THE TEST (§19, §20 of the charter)

**Date:** 2026-09-30 ~11:30 MDT | **Investigator:** L6 subagent (read-only forensic lane)
**Repos examined:** lane reports 01–05 (evidence base, re-read in full); `~/workspace/marketing-os/GROWTH-OS.md`
**Single Pig probe (bounded, 2026-09-30):** branch `lane-b/tenant-dispatch-threading @ 546b62d76` confirmed;
`runtime/kernel/authorities/identity_authority.js:294` `generateSpineEventId` PROVEN;
exactly one `INSERT INTO ping_events` in `ping-runtime/events/unified_event_runtime.js` PROVEN;
`ping-runtime/workers/canonical_workers.js:140` `ClaimWorker`, `:159` `CLAIM_CREATED` emit PROVEN;
`ping-runtime/orchestration/mission_runtime.js:32` `MissionRuntime` PROVEN;
`ping-runtime/knowledge/knowledge_promoter.js` `KnowledgePromoter` class PROVEN.
Line numbers drift ±5 from lane citations (active writer tree); symbols confirmed present.

**Grade key (per evidence standard):** PROVEN = definition + live call-site cited. NOT PROVEN =
searched, absent. NEEDS-REVERIFY = could not be closed. UNKNOWN = legitimate.
Invented certainty is absent by design.

**Charter rule honored throughout:** do not propose implementation merely because a gap exists —
first establish the gap is real. Domain schemas/views are fine; duplicate foundational
authorities are not.

---

## 1. THE 14-ROW INTELLIGENCE CONVERGENCE MAP

Columns: INTELLIGENCE CAPABILITY → EXISTING PING PRIMITIVE (file:line) → EXISTING AUTHORITY
(file:line or NONE-BY-DESIGN) → GAP (precise, or NONE) → MINIMUM FUTURE INTEGRATION
(smallest bounded step, or NOTHING NEEDED).

### 1. Research

| | |
|---|---|
| **Primitive** | `MissionRuntime` — `ping-runtime/orchestration/mission_runtime.js:32` (mission lifecycle, `mission_type` free-form + `payload JSONB` + `result JSONB` + `getTrace` at `:340`); VM-side sweep shape `meta-ai-research-worker` (`~/workspace/tandem/prompts/a|b|c|d-*.md` + `meta-ask.js` — PROVEN operational, worker-inventory 2026-09-13) |
| **Authority** | `MissionRuntime` + `MissionScheduler` (`ping-runtime/orchestration/mission_scheduler.js:97`) — CANONICAL mission truth (L3 §6 PROVEN) |
| **Gap** | The `INTELLIGENCE_RESEARCH` mission *label/template* (§6.1 fields: `questions[]`, `claims_to_verify[]`, `evidence_requirements`, `output_schema`, `synthesis_rule`) — live grep 2026-09-30: zero hits in `ping-runtime` + `gateway` (L5 PROVEN ABSENT) |
| **Minimum** | A mission-label convention + typed payload schema routed by the existing `WorkerRuntime.dispatch()` once a worker declares it in `eventTypes` (L5). NOTHING structural. |

### 2. Signals

| | |
|---|---|
| **Primitive** | `ObservationWorker` / `ClassificationWorker` — `ping-runtime/workers/canonical_workers.js` (`OBSERVATION_CREATED` handling; ClaimWorker `:140-167`); `CanonicalizationService.canonicalizeAndEmit` — `ping-runtime/canonicalization/canonicalization_service.js:149` (`lifecycle_stage: 'observation'`); `UnifiedEventRuntime.emit` — `ping-runtime/events/unified_event_runtime.js:185` → single INSERT `:289` |
| **Authority** | `CanonicalizationService` (ingress namespace authorization; `authorizeNamespace` — L1 §1 PROVEN) + `EvidenceAuthority` (evidence attachment). **NO SignalAuthority — NONE-BY-DESIGN** (GROWTH-OS §2.1 doctrine "signals are observations… never authorize anything" = existing PING design; L5 grep for `SignalAuthority` = zero hits, correctly absent) |
| **Gap** | NONE foundational. The 12-value signal taxonomy is a domain vocabulary (`kind='signal:<VALUE>'`), not a missing object. |
| **Minimum** | NOTHING NEEDED. (Optional: a `SIGNAL_EMITTED` entry in `event_registry.json` if typed signal events are wanted — registry entry, not authority.) |

### 3. Claims

| | |
|---|---|
| **Primitive** | `ClaimWorker.handle()` — `ping-runtime/workers/canonical_workers.js:140-167`, emits `CLAIM_CREATED` at `:159`; registration `:874-875` (ClassificationWorker consumes `CLAIM_CREATED`); post-verification truth = `Fact` — `/home/nolan/ping/cir/fact.ts:8` |
| **Authority** | **NONE — NONE-BY-DESIGN** (L3 §3: no `ClaimAuthority` class exists in live code; claims are produced by transform, not decided. The only "ClaimAuthority" text is a pipeline-label string in a legacy Python log line — NOT an authority) |
| **Gap** | The verdict vocabulary is missing: `CONFIRMED / REFUTED / UNCLEAR` (§6.1 output schema) — zero hits in PING (L4 PROVEN ABSENT). Claim payload today is thin (no verdict, no evidence URLs, no grade). |
| **Minimum** | A `verdict` field convention on the claim record (payload extension). NOT a new object, NOT an authority. |

### 4. Evidence

| | |
|---|---|
| **Primitive** | Kernel `Evidence` — `runtime/kernel/identity/evidence.ts:16` (extracted from Artifacts; `evidence_type, artifact_id, content, location`); `EvidenceAuthority.accumulate` — `ping-runtime/evidence/evidence_authority.js:48` |
| **Authority** | `EvidenceAuthority.verify()` — `ping-runtime/evidence/evidence_authority.js:61+` returns `{verified, reason, checks}`; wired once in the composition root `gateway/bootstrap/gateway_runtime.js:544-551` — **CANONICAL** (L3 §2 PROVEN). Explicitly add-only reads (header `:14-15`), never mutates events. |
| **Gap** | The evidence *grade* vocabulary (§6.1: vendor-described / independent / unreplicated) — closest existing is compiler-local `CounterEvidence.validity` (`constitutional-compiler/evidence/evidence-store.ts:112-116`), which is NOT the kernel authority. |
| **Minimum** | A `grade` field on Evidence metadata or `Assessment` — field addition. NOTHING structural. |

### 5. Audience learning

| | |
|---|---|
| **Primitive** | `knowledge_nodes` / `knowledge_edges` — `ping-runtime/knowledge/knowledge_graph.js:45-84` (`node_type` free-form, `entity_type/entity_id`, `label`, `data JSONB`, `source_event_id`, `confidence`, `status`, `correlation_id`); relationship edges (`gateway/relationship_objects.js`); `HybridSearch` — `ping-runtime/search/hybrid_search.js` |
| **Authority** | `KnowledgePromoter` — `ping-runtime/knowledge/knowledge_promoter.js` (class `:25`; human-gated candidate→approved/rejected, ADD-only) + `EvidenceAuthority.rank` (score = confidence × provenance — L5). **NO AudienceAuthority — NONE-BY-DESIGN** (clusters are computed projections, not authorities; L5 zero hits) |
| **Gap** | Entity stitching (GROWTH-OS §5 failure-mode 3: anonymous-to-known identity, "one person in many clusters") has NO existing primitive — L5: grep for dedupe/mergeIdentity/resolveIdentity = zero hits. REAL but bounded: it is analysis, not storage, not authority. |
| **Minimum** | Bounded analysis behavior over `knowledge_nodes` (stitching rules as computed, evidence-linked edges). NOT a new authority. |

### 6. Opportunity analysis

| | |
|---|---|
| **Primitive** | `EvidenceAuthority.rank` — `ping-runtime/evidence/evidence_authority.js` (existing "rank things with evidence" primitive); `recommendation` canonical worker (registered live — L5); `Assessment` — `runtime/kernel/identity/assessment.ts:9-20` (the 0–1 score fields: confidence, trust, freshness, risk, priority, quality…); demand-sensor typed-connector pattern — `ping-runtime/connectors/capability_registry.js` |
| **Authority** | **NONE — NONE-BY-DESIGN** (GROWTH-OS §2.3: "OpportunityScore is a recommendation, never an authority. It cannot approve, publish, or spend by itself." L5: correctly absent; a score authority would be the violation) |
| **Gap** | Demand sensors are UNKNOWN pending the §6.3 training mission (Google Trends API alpha, Exploding Topics API — GROWTH-OS marks UNKNOWN). Gap is REAL but is a *data-source* gap, not a PING gap. |
| **Minimum** | Run the INTELLIGENCE_RESEARCH training mission (§6.3) FIRST; then sensor sweeps arrive as ordinary `OBSERVATION_CREATED` events. NOTHING in PING to build. |

### 7. Experiments

| | |
|---|---|
| **Primitive** | `ping_missions` — `ping-runtime/orchestration/mission_runtime.js:30-56` (`payload JSONB`, `result JSONB`, terminal `completed | failed` at `:160-175`); replay verdict — `canonical_workers.js:340-356` (`{verified, reason, violations}`); `recordVerifiedResult` → `WORKER_COMPLETED`/`WORKER_FAILED` (recon-d §e) |
| **Authority** | `MissionRuntime` (mission truth: create/claim/complete/fail/retry — L3 §6 PROVEN). **NO ExperimentAuthority — NONE-BY-DESIGN** (GROWTH-OS §2.5: "A result updates confidence, never policy directly. LEARNING ≠ AUTHORITY.") |
| **Gap** | Two, both vocabulary-level: (a) the `EXPERIMENT_RUN` mission *label* — NOT PROVEN in code (L5); (b) `SUPPORTED / FALSIFIED / INCONCLUSIVE` — zero hits in PING (L4 PROVEN ABSENT; CRX's `VerificationStatus.INCONCLUSIVE` is non-authoritative sibling context, mine-not-dependency per CEO Ledger 04). |
| **Minimum** | Mission label + payload schema convention (hypothesis, variable, control, treatment, metrics, guardrail, window — GROWTH-OS §2.5); verdict as payload state. NOT a new object, NOT an authority. |

### 8. Content generation

| | |
|---|---|
| **Primitive** | Canonical workers (observation / projection / lineage — `canonical_workers.js` pipeline comment `:9`; LineageWorker `:510-543`); `Artifact` canonical object — `runtime/kernel/identity/artifact.ts:18` ("Immutable representation of acquired information (snapshot)"; `artifact_type, content, content_hash, source_id`); Qdrant semantic projection — `ping-runtime/embeddings/embedding_service.js:132` |
| **Authority** | `EvidenceAuthority.verify` (claim-accuracy verification of artifact content) + `KnowledgePromoter` (promotion of approved artifacts). **NO ContentAuthority — NONE-BY-DESIGN** (L5: `gateway/artifact_type_registry.js` exists in inventory but was not audited — name ≠ authority; do not infer from filename) |
| **Gap** | The transcript-accuracy pass (GROWTH-OS §2.4 guardrail: "mandatory transcript-accuracy pass before editing") has no live PING primitive traced — the only adjacent machinery, `ContextCompressionAuthority` (conversation→fact extraction), is BUILT_NOT_LIVE, never instantiated (L5). REAL but bounded: it is a worker/review behavior, not a store or authority. |
| **Minimum** | Accuracy pass as bounded worker behavior + human review (Nolan), recorded as a knowledge/evidence event. NOTHING foundational. |

### 9. Claim verification

| | |
|---|---|
| **Primitive** | `EvidenceAuthority.verify()` — `ping-runtime/evidence/evidence_authority.js:74-138` (`{verified, reason, checks}`; hash recompute, lineage + namespace consistency, Qdrant-hit trace-back to `ping_events`); the failure-honesty gate — `WitnessWorker` refuses to attest claims-as-evidence: "A bare { verified: true } is a claim, not evidence" — `canonical_workers.js:588-592` (W7 at `:522-560`) |
| **Authority** | `EvidenceAuthority` (verification) + the executed witness path (`WitnessWorker` — `canonical_workers.js:504-581`; Merkle root via `gateway/replay/kernel/witness_authority.js:94` — L3 §1, §5 PROVEN CANONICAL) |
| **Gap** | NONE foundational for the mechanism. The verdict *tags* (VERIFIED / INFERRED / UNKNOWN, §6.2) are a data convention on `Assessment`/knowledge metadata (L4 §Concept 5 PROVEN REUSE). |
| **Minimum** | NOTHING NEEDED (vocabulary convention only). |

### 10. Distribution preparation

| | |
|---|---|
| **Primitive** | Typed-connector pattern — `ping-runtime/connectors/capability_registry.js` + `constitutional_capability_contract.js` (9 SaaS categories — L5); `ExternalAgentAdapter.authorizeWorkOrder` — `ping-runtime/external-agent/external_agent_adapter.js` (the ONE live execution authorization, fail-closed — L5 recon-d §e); `AGENT_PROFILES` allowlists; ORCA `REQUIRES_HUMAN_APPROVAL` → escalation — `orca/control-loop/policy/orca_policy.js` |
| **Authority** | `authorizeWorkOrder` (execution authorization) + ORCA policy (delegation classes) + the operator (Nolan) as the human-approval authority by standing directive. **NO DistributionAuthority — NONE-BY-DESIGN** (GROWTH-OS §2.6: "A connector executes; a connector never authorizes itself.") |
| **Gap** | **REAL, pre-existing: the durable human-approval record.** `BusinessActionAuthority` (`ping-runtime/approval/business_action_authority.js`, PENDING_HUMAN→APPROVED/REJECTED/EXPIRED) and `EffectAuthority` (`generateEffectId`) are in-memory with ZERO importers (L5 recon-f §e: EXPERIMENTAL, unwired). The durable-approval design (canonical `PROPOSED_ACTION` / `ACTION_APPROVED` / `REJECTED` / `EFFECT_*` `ping_events` rows) is design-only (agent-f §f), NOT PROVEN in code. Nolan's "approves every post" law is operator action today, not a PING event. |
| **Minimum** | Canonical approval **event types** (domain vocabulary on the existing spine), recorded through `UnifiedEventRuntime.emit` — NOT a new authority. This is the one gap the walkthrough (§2) hits as a live chain break; it is pre-existing, not engine-created. |

### 11. Metrics ingestion

| | |
|---|---|
| **Primitive** | `POST /ingest` — `gateway/routes/ingest.js:28` → `canonicalizeAndEmit` (`canonicalization_service.js:149`) → `UnifiedEventRuntime.emit` → `INSERT INTO ping_events … ON CONFLICT (event_id) DO NOTHING` (`unified_event_runtime.js:289` — single writer, re-verified this lane); `POST /events` BFF branch — `gateway/routes/events.js:189-196`; hand-carried precedent `tandem/emit-observation.py:502` |
| **Authority** | `CanonicalizationService` (the canonical boundary — L1 §1 PROVEN CANONICAL) / `UnifiedEventRuntime` (the admission choke point — L1 §1 PROVEN) |
| **Gap** | **REAL: the acquisition seam is OPEN BUT UNMANNED** (L2 headline, PROVEN). `POST /ingest` — the door purpose-built for external observations (`confidence: 0.5`, `lifecycle_stage: 'observation'`) — has ZERO live production callers (L2 §2.8). The only external-observation ingress today is hand-carried `POST /events` by agent scripts. Platform metrics reach PING only via the daily Page-insights cron's operator-carried path. |
| **Minimum** | ONE producer that POSTs normalized metric observations (Buffer-style normalized schema + UTM taxonomy as domain payload schema — GROWTH-OS §2.6). The door exists; walk through it. NOTHING in PING to build. |

### 12. Learning

| | |
|---|---|
| **Primitive** | `KnowledgePromoter` — `ping-runtime/knowledge/knowledge_promoter.js` (class `:25`; ADD-only promotion on human approval events, `SNIPPET_APPROVED`/`AI_RESPONSE_ACCEPTED` → confidence 1.0 approved; rejected → 0.2); `knowledge_nodes.status` ∈ {candidate, approved, rejected} + `confidence_provenance`; "remember why" precedent `learnings.md` / `angle-performance.md` (VM-side, worker-inventory) |
| **Authority** | `KnowledgePromoter` + `EvidenceAuthority` (trust/rank). **NO LearningAuthority — NONE-BY-DESIGN** (GROWTH-OS §2.7: "LEARNING ≠ AUTHORITY", explicitly forbidden) |
| **Gap** | Schema-level only: PING has no negative knowledge states — no `INSUFFICIENT_EVIDENCE` / `STALE` / `UNVERIFIED` node states (L5, recon-e §b). Verdicts are expressible as payload states; the first-class "looked and found nothing" state does not exist. |
| **Minimum** | Status-vocabulary extension on the existing authority if wanted. NOT a new authority. (The outreach engine's `learnings.md` file-form precedent shows the record works today.) |

### 13. Playbooks

| | |
|---|---|
| **Primitive** | `knowledge_nodes` with `node_type='playbook_rule'` + `status='approved'`; `LINEAGE_CREATED` edges (learning→rule) — `canonical_workers.js:510-543`; `HybridSearch` retrieval — `ping-runtime/search/hybrid_search.js` |
| **Authority** | `KnowledgePromoter` (promotion = approval; the playbook IS approved knowledge). **NO PlaybookAuthority — NONE-BY-DESIGN** (the playbook is approved knowledge, retrievable inventory — GenStudio "approved-library" pattern, GROWTH-OS §2.7) |
| **Gap** | NONE. |
| **Minimum** | NOTHING NEEDED. |

### 14. Next-question generation

| | |
|---|---|
| **Primitive** | Mission chaining: unverified claims become the next mission's input (GROWTH-OS §6.1); `EventToMissionBridge` — `ping-runtime/orchestration/event_to_mission_bridge.js:60` (maps events incl. `CLAIM_CREATED` → missions); `MissionScheduler` poll (L3 §6); worker pipeline chaining `OBSERVATION_CREATED` → `CLAIM_CREATED` → classification (`canonical_workers.js:140-167, :874-875`); `MissionRuntime.getTrace` (`mission_runtime.js:340-390`) for the causal chain |
| **Authority** | `MissionRuntime` + `MissionScheduler` — CANONICAL (L3 §6) |
| **Gap** | The chaining *rule* ("unverified claim → next INTELLIGENCE_RESEARCH mission") is not encoded as worker behavior anywhere yet. REAL but bounded: it is a behavior, not a store, not an authority. |
| **Minimum** | One bounded worker/cron behavior: on mission completion, spawn the next research mission from unverified claims with `correlation_id`/`causation_id` linkage. NOTHING foundational. |

---

## 2. THE TEST — paper walkthrough

**Prompt:** Nolan asks *"Research Jev/Typesafe and determine whether there is a technically defensible video worth making."*

Every arrow maps to an existing PING authority/primitive (file:line) or to a PRECISELY identified missing seam. No hidden MarketingOS database, ResearchAgent truth store, ContentBrain memory, or GrowthAgent authority appears anywhere.

| # | Arrow | Maps to | Grade |
|---|---|---|---|
| 1 | Nolan's ask → mission creation | Nolan (operator) creates a mission with `mission_type='INTELLIGENCE_RESEARCH'` and the §6.1 payload (`questions[]`, `claims_to_verify[]`, `evidence_requirements`, `output_schema`, `synthesis_rule`) via `MissionRuntime` — `mission_runtime.js:32`. `MISSION_CREATED` canonical event mirrors the transition. **The label itself is the §1 gap** — new bounded label, not new authority. | PROVEN primitive; label NEW (bounded) |
| 2 | Mission → parallel research workers | `MissionScheduler._poll` — `mission_scheduler.js:97`; `WorkerRuntime.dispatch()` matches on `worker.eventTypes` — `ping-runtime/workers/worker_runtime.js:93-126`. Workers = VM-side research agents with the §6.1 brief (the `meta-ai-research-worker` sweep shape: rotating briefs + provenance sidecars `status=unverified`, `ping_ingestion=pending` — worker-inventory PROVEN). | PROVEN |
| 3 | Workers → observations | Workers POST `OBSERVATION_CREATED` envelopes via `POST /events` (precedent: `tandem/emit-observation.py:502`) → `UnifiedEventRuntime.emit` → single INSERT — `unified_event_runtime.js:289` (`ON CONFLICT (event_id) DO NOTHING`). Identity minted by `IdentityAuthority.generateSpineEventId` — `identity_authority.js:294` (re-verified this lane). | PROVEN |
| 4 | Observations → evidence | Kernel `Evidence` objects — `evidence.ts:16` (extracted from Artifacts — `artifact.ts:18`); `EvidenceAuthority.accumulate` — `evidence_authority.js:48`. Primary sources preferred per the §6.1 `evidence_requirements` (a live call beats docs; docs beat marketing prose). | PROVEN |
| 5 | Evidence → claims | `ClaimWorker.handle()` — `canonical_workers.js:140-167` → `CLAIM_CREATED` at `:159` (re-verified `:140`/`:159` this lane). Claims are transform outputs — no ClaimAuthority BY DESIGN (L3 §3). | PROVEN |
| 6 | Contradiction surfacing | `ClassificationWorker` consumes `CLAIM_CREATED` — registration `canonical_workers.js:875` (re-verified this lane); conflicting claims are classified together; the review step grades evidence honestly (§6.1). **No dedicated contradiction primitive** — bounded analysis behavior over claims + human review. Not a chain break: the claims, the evidence, and the reviewer all exist. | PROVEN path; detection = bounded behavior |
| 7 | Claims → verification | `EvidenceAuthority.verify()` — `evidence_authority.js:74-138` → `{verified, reason, checks}`; `WitnessWorker` failure-honesty gate refuses to attest bare claims — `canonical_workers.js:588-592` (W7 `:522-560`). Verdict vocabulary (`CONFIRMED / REFUTED / UNCLEAR`) is the §3 gap — field-level, not authority-level. | PROVEN |
| 8 | Verified findings → knowledge update | `KnowledgePromoter` — `knowledge_promoter.js` (class `:25`, re-verified) transitions candidate→approved/rejected on human signals; findings tagged VERIFIED / INFERRED / UNKNOWN (§6.2) as a data convention on `Assessment` — `assessment.ts:9-20` (L4 §Concept 5). "Synthesis never overwrites tagged knowledge; it adds" = the promoter's ADD-only provenance contract (`knowledge_promoter.js:109`, `knowledge_graph.js:93-100`). | PROVEN |
| 9 | Knowledge → audience/opportunity evaluation | Audience clusters and `TopicOpportunity` records as `knowledge_nodes` rows (`node_type='audience_cluster'` / `'opportunity'`); scored by `EvidenceAuthority.rank`; 0–1 fields on `Assessment` (`assessment.ts:9-20`); demand-sensor sources remain UNKNOWN pending the §6.3 training mission — **handled honestly**: the defensibility judgment uses evidence actually possessed (GROWTH-OS §2.3 doctrine). | PROVEN; sensors UNKNOWN-by-design |
| 10 | Evaluation → creative proposal | Proposal drafted as a `ContentArtifact`: kernel `Artifact` — `artifact.ts:18` (one canonical text representation; derivatives by `source_id`/hash — §2.4 doctrine maps exactly) and/or `knowledge_nodes` entity rows; proposal is a worker/agent behavior producing a candidate record. | PROVEN |
| 11 | Script → claim verification | Every script claim goes back through arrows 5–7: claim → `EvidenceAuthority.verify` → verdict + evidence URLs + grade. The mechanism exists; the `CONFIRMED / REFUTED / UNCLEAR` *literals* are the §3 gap (payload extension). | PROVEN mechanism; vocabulary gap only |
| 12 | Script → artifact with evidence lineage | `LineageWorker` → `LINEAGE_CREATED` — `canonical_workers.js:510-543`; parent→derivative edges; evidence URLs carried in `Evidence.location` / `artifact_id` linkage (`evidence.ts:9`). Semantic leg: Qdrant projection — `embedding_service.js:132`. | PROVEN |
| 13 | Artifact → Nolan approval | Operator law (Nolan approves every post — GROWTH-OS §1, MEMORY.md standing directive); ORCA `REQUIRES_HUMAN_APPROVAL` → escalation precedent — `orca_policy.js`. **MISSING SEAM (real, pre-existing): the durable approval record.** The in-memory approval classes are unwired (L5 recon-f §e); canonical approval event types are design-only. The decision is honored today (nothing publishes without Nolan) but its *durability* is operator memory, not a `ping_events` row. Minimum: approval as canonical event types through `UnifiedEventRuntime.emit` — vocabulary, not authority. | PROVEN mechanism; **durable-record GAP** |
| 14 | Approval → connector publish | Typed-connector pattern — `capability_registry.js`; execution authorization = `authorizeWorkOrder` — `external_agent_adapter.js` (fail-closed; the ONE live execution authorization); `AGENT_PROFILES` allowlists. Scheduling/publishing heavy lifting stays in Business Suite (external, per plan §2.6 — PING never rebuilds it). No connector authorizes itself. | PROVEN |
| 15 | Publish → metrics as observations | Platform metrics → `OBSERVATION_CREATED` via the canonical doors (`POST /ingest` — `routes/ingest.js:28`; or `POST /events`); normalized metric schema + UTM taxonomy (GROWTH-OS §2.6) as domain payload schema. **MISSING SEAM (real, pre-existing):** `/ingest` has zero live callers (L2 §2.8 — the unmanned seam). The mechanism is PROVEN; the producer is absent. Minimum: one producer that POSTs normalized metric observations. | PROVEN door; **producer GAP** |
| 16 | Metrics → experiment evaluation | `EXPERIMENT_RUN` mission (new label — §7 gap) with design in `payload JSONB`, outcome in `result JSONB`, terminal status `completed`/`failed` — `mission_runtime.js:160-175`; verdict `SUPPORTED / FALSIFIED / INCONCLUSIVE` as payload state (literals missing — §7 gap, vocabulary only). "Result updates confidence, never policy" = Assessment/promoter doctrine (§7). Re-verification leg: `REPLAY_VERIFY` → replay worker (live map — L5). | PROVEN mechanism; label+vocabulary gap only |
| 17 | Outcome → learning | "Remember why" record (WHY CREATED / EVIDENCE / HYPOTHESIS / DECISION / OUTCOME / LEARNING / CONFIDENCE / NEXT TEST — §2.7) as `knowledge_nodes` row `node_type='learning'` with the eight fields in `data JSONB` + `confidence` + `confidence_provenance` — `knowledge_graph.js:45-69`; promotion via `KnowledgePromoter`. VM-side precedent: `learnings.md` / `angle-performance.md`. | PROVEN |
| 18 | Learning → next experiment proposal | Unverified/remaining claims → next `INTELLIGENCE_RESEARCH` / `EXPERIMENT_RUN` mission via `MissionScheduler` poll / `EventToMissionBridge` (`event_to_mission_bridge.js:60`), with `correlation_id`/`causation_id` lineage to the motivating learning. The chaining *rule* is the §14 gap — bounded worker behavior, not new authority. | PROVEN mechanism; behavior gap only |

**Walkthrough verdict:** 18 arrows. 13 ride fully PROVEN existing primitives/authorities. 5 touch precisely identified gaps, ALL pre-existing and ALL vocabulary/label/behavior-level — none is a missing authority, none is a missing store:
- G1 (vocabulary): `CONFIRMED / REFUTED / UNCLEAR`, `SUPPORTED / FALSIFIED / INCONCLUSIVE`, evidence grades, VERIFIED/INFERRED/UNKNOWN tags — field conventions, not objects.
- G2 (labels): `INTELLIGENCE_RESEARCH`, `EXPERIMENT_RUN`, `DISTRIBUTION_RUN` mission labels — routed by existing dispatch, not new authority.
- G3 (durable approval record): operator law honored today, not yet a canonical event type — the one gap where the chain's *durability* breaks inside PING.
- G4 (metrics producer): `/ingest` is live with zero callers — the unmanned acquisition seam; metrics arrive operator-carried today.
- G5 (chaining/contradiction/stitching/transcript-accuracy behaviors): bounded analysis behaviors over existing stores — no new authority anywhere.

**What the walkthrough contains zero of:** no MarketingOS database (all durable rows are `ping_events`, `ping_missions`, `knowledge_nodes`/`knowledge_edges`, bridged `canonical_events`/`repository_events`, Qdrant vectors); no ResearchAgent truth store (research output = `OBSERVATION_CREATED` events + knowledge candidates, UNVERIFIED until the gate — MEMORY.md standing rule); no ContentBrain memory (content = `Artifact` canonical objects + knowledge rows + lineage edges); no GrowthAgent authority (every "agent" is a worker behavior under `WorkerRuntime.dispatch` + `authorizeWorkOrder`; scores and signals are recommendations/observations, never authorities — the plan's kill criteria are enforceable by construction).

---

## 3. THE INTELLIGENCE COMPOUNDING PATH

Durable residue each mission type leaves, and which existing store holds it:

- **`INTELLIGENCE_RESEARCH`** leaves: claims (`CLAIM_CREATED` event payloads in **`ping_events`**), evidence (kernel `Evidence` canonical objects + evidence payloads in **`ping_events`**), verdict-tagged findings (`knowledge_nodes` rows, VERIFIED/INFERRED/UNKNOWN as `Assessment`/metadata convention in **Postgres `knowledge_nodes`**), and next-question missions (`ping_missions` rows with `correlation_id` lineage in **Postgres `ping_missions`**). The §6.1 training loop compounds because each run's unverified claims are the next run's `claims_to_verify[]` — the checklist is durable mission state, not agent memory.
- **`EXPERIMENT_RUN`** (E-0017 shape) leaves: experiment design + outcome in `ping_missions` (`payload`/`result` JSONB, terminal status), verdicts (`SUPPORTED / FALSIFIED / INCONCLUSIVE` payload states) and updated confidence on `knowledge_nodes` via the promoter, plus `WORKER_COMPLETED` receipts in **`ping_events`**. Compounding: results update confidence numbers, never policy — the playbook only changes when a Learning is promoted.
- **`DISTRIBUTION_RUN`** leaves: provider receipts (post IDs, slots) in mission `result` JSONB (**`ping_missions`**), comparable metric rows as `OBSERVATION_CREATED` events (**`ping_events`**, normalized metric schema + UTM as domain payload schema), and channel/audience performance candidates (**`knowledge_nodes`**). Compounding: per-post metrics flow back through arrows 15–18 into Learning → Playbook, so every publish makes the next hypothesis cheaper to form.
- **`SIGNAL_COMPUTE`** (typed observations) leaves: signal rows as canonical event payloads (**`ping_events`**, `kind='signal:<TAXONOMY>'`), queryable via the existing read path. Compounding: baselines accumulate — `POST_OUTPERFORMING_BASELINE` is only computable because prior posts left metric observations behind.
- **Cross-cutting:** the semantic leg compounds in **Qdrant** (vectors of canonical text representations — `embedding_service.js:132`), the causal leg in **`metadata.causation_id` / `correlation_id`** chains and `LINEAGE_CREATED` edges, and the truth leg in **`knowledge_nodes.status`** (candidate→approved/rejected, human-gated). Retrieval rides `HybridSearch` with per-hit `EvidenceAuthority.verify` — the compounder never reads unverified output as truth.

**In one paragraph:** the Growth OS intelligence loop compounds entirely on the existing PING spine — every mission type leaves its residue in one of four durable homes (`ping_events`, `ping_missions`, `knowledge_nodes`/`knowledge_edges`, Qdrant vectors), all under existing authorities (UnifiedEventRuntime, MissionRuntime, KnowledgePromoter, EvidenceAuthority, authorizeWorkOrder). The genuinely missing items are small and enumerated: three bounded mission labels, a handful of verdict/grade/tag vocabularies (field conventions, not objects), one durable human-approval event record, one live metrics producer for the already-open `/ingest` door, and a few bounded analysis behaviors (chaining, contradiction detection, identity stitching, transcript-accuracy pass). Nothing in the loop requires a new authority, a new store, or a new constitutional owner — which is exactly what the plan's own kill criteria demand.

---

## 4. CAVEATS (kept honest)

1. **Branch dimension:** all Pig-side citations are against `lane-b/tenant-dispatch-threading @ 546b62d76` (re-verified this lane). The charter's briefed branch `refactor/runtime-authority-convergence` no longer exists as a branch (L1: consumed/superseded). Re-grep if the parent needs a different baseline.
2. **Deployed vs worktree:** L1 proved the Oracle container runs cc6856c-era event bytes (no tenant gates, no verdict-class admission). The walkthrough's mechanisms are proven on the Pig worktree; deployment state is a separate question.
3. **Behavior vs registration:** several workers are PROVEN registered with per-event behavior WIRED_UNPROVEN (L5 caveat). The walkthrough maps arrows to registered primitives; live per-event runtime behavior on the 09-29/30 writer tree is NEEDS-REVERIFY before enforcement action.
4. **`gateway/artifact_type_registry.js`** was not audited for content (L5 NEEDS-REVERIFY) — name ≠ authority; do not treat it as a ContentAuthority without a sovereignty check.
5. Line drift ±5 on the active writer tree; symbols re-verified present this lane, exact line numbers may move.

---

## 5. CONDENSED SUMMARY (for the parent)

**GAP column highlights (14 rows):** 8 rows have NONE (Signals, Playbooks, + vocabulary-only gaps on Claims, Evidence, Learning). The real gaps: (1) three bounded mission labels missing (`INTELLIGENCE_RESEARCH`, `EXPERIMENT_RUN`, `DISTRIBUTION_RUN`) — new labels, not authorities; (2) verdict/grade/tag vocabularies missing (`CONFIRMED/REFUTED/UNCLEAR`, `SUPPORTED/FALSIFIED/INCONCLUSIVE`, evidence grades, VERIFIED/INFERRED/UNKNOWN) — field conventions; (3) **durable human-approval record missing** — operator law honored but not a canonical event (pre-existing); (4) **`/ingest` producer missing** — the canonical observation door is live with zero callers (pre-existing unmanned seam); (5) bounded analysis behaviors (mission chaining, contradiction detection, identity stitching, transcript-accuracy pass) — behaviors, not authorities.

**Walkthrough missing seams:** 5 of 18 arrows touch a gap, all vocabulary/label/behavior-level (G1–G5 above). No arrow requires a new authority or store. No hidden MarketingOS database, ResearchAgent truth store, ContentBrain memory, or GrowthAgent authority anywhere in the walkthrough.

**Compounding path (one paragraph):** every mission type leaves residue in four existing homes — `ping_events` (claims, evidence, signals, metric observations, receipts), `ping_missions` (research briefs, experiment designs/outcomes, distribution receipts), `knowledge_nodes`/`knowledge_edges` (verdict-tagged findings, audience clusters, opportunity scores, learnings, playbook rules, lineage), and Qdrant vectors (semantic leg) — under five existing authorities (UnifiedEventRuntime, MissionRuntime, KnowledgePromoter, EvidenceAuthority, authorizeWorkOrder). Research compounds via unverified-claims-become-next-mission; experiments compound via confidence updates (never policy); distribution compounds via metric observations flowing back into learning → playbook. The loop is closed on existing machinery.
