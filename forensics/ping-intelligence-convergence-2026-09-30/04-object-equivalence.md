# L4 — Object Equivalence: Growth OS Concepts vs Existing PING Primitives

**Date:** 2026-09-30
**Lane:** L4 (§4 of the charter) — forensic, read-only
**Investigator:** subagent (depth 2)
**Transport:** Pig WSL via `~/workspace/bin/pigwsl-exec`, single probe at start (reachable, no flap during this run)

## Scope actually searched

| Repo | Role | State at search time |
|---|---|---|
| `/home/nolan/ping` | Canonical event core | **Branch mismatch vs brief:** working tree is `lane-b/tenant-dispatch-threading` @ `546b62d76`, not `refactor/runtime-authority-convergence`. All greps below ran against this tree. Kernel identity types are long-standing; findings graded PROVEN for the searched tree, NEEDS-REVERIFY if the parent wants them re-grepped on the briefed branch. |
| `/home/nolan/ping-gateway-src` | Deployment source (JS) | Searched `ping-runtime/` + `gateway/` (excl. node_modules) |
| `/home/nolan/ping-gateway-build` | Deployment build copy | Confirmed present (`Dockerfile`, `gateway/`, `ping-runtime/`); treated as build output of ping-gateway-src, not separately grepped |
| `/home/nolan/projects/constitutional-runtime` | Dormant Python sibling | `constitutional-trunk` @ `74fbb74` — searched for context only. Per CEO Ledger 04 (2026-09-29), CRX is a **mine, not a dependency**: nothing here counts as an existing PING authority; at most a harvestable primitive. |

Search method: `grep -rliE` / `grep -rlnE` for each concept name and synonyms across `*.ts` (canonical) and `*.js` (gateway), node_modules excluded, `worktrees/` excluded from citations. `CREATE TABLE` and `interface|type|class` declarations grepped separately. Absence claims below state exactly what was searched.

## Existing PING primitives referenced (definition index)

- **Artifact** — `runtime/kernel/identity/artifact.ts:18` — "Immutable representation of acquired information (snapshot)." Payload (`artifact.ts:9`): `artifact_type, content, content_hash, size, format, source_id`.
- **Evidence** (kernel) — `runtime/kernel/identity/evidence.ts:16` — "Evidence is extracted from Artifacts (factual)." Payload (`evidence.ts:9`): `evidence_type, artifact_id, content, location`. CanonicalObject kind `Evidence` (`canonical-object.ts:23`).
- **Fact** — `cir/fact.ts:8` — "Represents an immutable truth derived from Evidence." Shape: `kind, subject, predicate, object, evidence: EvidenceReference[]`.
- **Knowledge** — `runtime/kernel/identity/knowledge.ts:30` — "Knowledge is compiled from Facts (immutable, zero subjective fields)." Payload (`knowledge.ts:9`): `derived_facts, supporting_evidence, relationships, lineage[], authority, replay_proof, constitution_version, schema_version`.
- **Assessment** — `runtime/kernel/identity/assessment.ts:22` — "Assessment never mutates Knowledge (mutable, contains subjective fields)." Payload (`assessment.ts:9`): `knowledge_id, confidence, trust, freshness, risk, priority, quality, complexity, security, coverage`.
- **Observation** — `cir/observation.ts:6` — "Represents a recorded event or state change." Shape: `type, id, kind, timestamp, entity_id, data`.
- **Claim flow (gateway)** — `ClaimWorker` handles `OBSERVATION_CREATED`/`CLAIM_GENERATE`, emits `CLAIM_CREATED` — `ping-runtime/workers/canonical_workers.js:140-172`, worker registration `canonical_workers.js:723`.
- **knowledge_nodes / knowledge_edges** — `CREATE TABLE` at `ping-runtime/knowledge/knowledge_graph.js:45-69` and `:71-84`. Node columns: `node_id, node_type (free-form), entity_type, entity_id, label, data JSONB, source_event_id, namespace, confidence, status ('candidate' default), correlation_id, confidence_provenance`. Edge columns: `edge_id, source_id, target_id, edge_type, weight, data`.
- **Promotion lifecycle** — `ping-runtime/knowledge/knowledge_promoter.js:1-64`: only a human signal promotes candidate → knowledge; `SNIPPET_APPROVED`/`AI_RESPONSE_ACCEPTED` → status `approved` (confidence 1.0); `SNIPPET_REJECTED`/`AI_RESPONSE_REJECTED` → status `rejected` (confidence 0.2) (`knowledge_promoter.js:50-51`).
- **ping_events** — `ping-runtime/events/unified_event_runtime.js:44-60`: `event_id PK, event_type, source, timestamp, payload JSONB, metadata JSONB, namespace, processed`.
- **ping_missions** — `ping-runtime/orchestration/mission_runtime.js:30-56`: `mission_id PK, mission_type (free-form), status ('created' default), priority, payload JSONB, result JSONB, assigned_to, created_by, timestamps, error, retries, retry_at, lease_until, claimed_at`. Lifecycle (`mission_runtime.js:108-228`): `created → assigned → running → completed | failed`, plus `retry_pending`; every transition mirrors a canonical event (`MISSION_CREATED/ASSIGNED/STARTED/COMPLETED/FAILED/LEASE_EXPIRED`).
- **EvidenceAuthority.verify** — `ping-runtime/evidence/evidence_authority.js:74-138` returns `{verified: boolean, reason, checks}`.
- **Replay verdict** — `ping-runtime/workers/canonical_workers.js:340-356`: `{documentId, eventType, timestamp, verified, reason, fingerprint, witness_root, violations, event_count, artifact_count, state_version}`; `verified` true only when `status === 'ok'` and `violations.length === 0`.
- **Mission trace / evidence bundle** — `mission_runtime.js:getTrace` (`mission_runtime.js:340-390`) returns `{mission, correlation_id, events, eventCount}` by causal chain.

---

## Concept 1 — ResearchPackage

**Domain meaning (GROWTH-OS.md §6.1):** the INTELLIGENCE_RESEARCH mission template — `questions[]`, `claims_to_verify[]` (with claimed source), `evidence_requirements`, `output_schema`, `synthesis_rule`; executed by a research worker, reviewed, unverified claims become the next mission's input.

**Existing PING equivalent:** `ping_missions` table (`ping-gateway-src/ping-runtime/orchestration/mission_runtime.js:30`) — `mission_type` free-form + `payload JSONB` + `result JSONB` + causal trace via `getTrace` (`mission_runtime.js:340`).

**REUSE DIRECTLY:** yes — a ResearchPackage is a Mission with `mission_type='INTELLIGENCE_RESEARCH'` and a typed payload. All template fields (questions, claims_to_verify, evidence_requirements, output_schema, synthesis_rule) fit in `payload JSONB`; the review step and next-mission chaining are the existing mission lifecycle (`created → assigned → running → completed`, `mission_runtime.js:108-175`) plus `EVENT → MISSION` bridging already in `EventToMissionBridge`.

**EXTEND:** the payload schema contract for the `INTELLIGENCE_RESEARCH` mission type (fields named above) — currently `payload` is untyped JSONB. Convention-only; no new table or authority.

**ADAPTER REQUIRED:** no — stays inside the orchestration boundary.

**GENUINELY MISSING:** no.

**Grade:** PROVEN.

---

## Concept 2 — Signal

**Domain meaning (GROWTH-OS.md §2 Engine 1):** normalized, typed, evidence-backed observation (taxonomy v0: SEARCH_DEMAND_RISING … POST_UNDERPERFORMING_BASELINE). Doctrine: "signals are observations. They are not truth and they are not authority."

**Existing PING equivalent:** `Observation` (`/home/nolan/ping/cir/observation.ts:6`) — recorded event or state change with free-form `kind` + `data`. Event-plane counterpart: `OBSERVATION_CREATED` events consumed by `ClaimWorker` (`canonical_workers.js:723`). The Growth OS doctrine ("signals are observations") is already PING's own architecture: observation → evidence → knowledge.

**REUSE DIRECTLY:** yes — a Signal is an `Observation` with `kind='signal:<TAXONOMY_VALUE>'`, or equivalently an event with `event_type` in the signal taxonomy emitted into `ping_events` (`unified_event_runtime.js:44`).

**EXTEND:** the signal taxonomy enum itself (the 12 v0 values) as a `kind` vocabulary — no structural change.

**ADAPTER REQUIRED:** no — a read-side VIEW over observations/events (`kind` LIKE `signal:%`) suffices; no new table.

**GENUINELY MISSING:** no.

**Grade:** PROVEN. (Note: the only `Signal` type found in the canonical repo was `runtime/constitutional/node_modules/human-signals` — third-party, disregarded.)

---

## Concept 3 — Claim

**Domain meaning (GROWTH-OS.md §6.1–6.2):** a falsifiable assertion to verify — `claims_to_verify[]` with claimed source, then output `(claim, verdict, evidence URLs, evidence grade)`; §6.2 synthesis tags VERIFIED / INFERRED / UNKNOWN.

**Existing PING equivalent:** the live claim pipeline in the gateway: `OBSERVATION_CREATED` → `ClaimWorker` → `CLAIM_CREATED` event (`canonical_workers.js:140-172`, registration `:723`). Post-verification truth: `Fact` (`cir/fact.ts:8`, "immutable truth derived from Evidence"), promoted through `EvidenceAuthority.verify` (`evidence_authority.js:74`) → `knowledge_nodes` status `candidate → approved / rejected` via the promoter (`knowledge_promoter.js:10-12, 50-51`). Memory also records the standing rule: Meta AI output is UNVERIFIED until the verification gate, never promoted directly into canonical claims. The deprecated Python `ClaimWorker` (`constitutional-runtime/claim_worker.py:25`, header declares "DEPRECATED - NOT DEPLOYED IN PRODUCTION") is legacy reference only and not an authority.

**REUSE DIRECTLY:** yes — pre-verification claims already exist as `CLAIM_CREATED` event payloads (`{documentId, eventType, timestamp, source}`, `canonical_workers.js:157-161`); verified claims are `Fact`s; their standing is `knowledge_nodes.status`.

**EXTEND:** a `verdict` field on the claim record for the CONFIRMED / REFUTED / UNCLEAR output schema — the claim payload is currently thin (no verdict, no evidence URLs, no grade). This is a payload extension, not a new object.

**ADAPTER REQUIRED:** no.

**GENUINELY MISSING:** no — but the verdict *enum values themselves* are missing from PING (see Status Semantics below).

**Grade:** PROVEN.

---

## Concept 4 — EvidenceRecord

**Domain meaning (GROWTH-OS.md §6.1–6.2):** the evidence behind a claim verdict — primary sources, evidence URLs, evidence grade (vendor-described / independent / unreplicated).

**Existing PING equivalent:** kernel `Evidence` (`runtime/kernel/identity/evidence.ts:16`) — extracted from Artifacts, carries `evidence_type, artifact_id, content, location`. Verification: `EvidenceAuthority.verify` returns `{verified, reason, checks}` (`evidence_authority.js:74-138`). Counter-evidence and confidence exist in the compiler-internal evidence shape: `CounterEvidence.validity: 'valid' | 'invalid' | 'uncertain'` (`constitutional-compiler/evidence/evidence-store.ts:112-116`), `Confidence{score, derivation, evidence}` (`evidence-store.ts:122-127`). (Caution: that file is a compiler-local type, not the kernel authority — the kernel `Evidence` is the authority.)

**REUSE DIRECTLY:** yes — an EvidenceRecord is a kernel `Evidence` canonical object; "evidence URLs" = `location` / `artifact_id` linkage.

**EXTEND:** the evidence *grade* enum (vendor-described / independent / unreplicated) — closest existing is `CounterEvidence.validity` or `Assessment.confidence`; a grade field on Evidence metadata or an Assessment is a field addition, not a new object.

**ADAPTER REQUIRED:** no.

**GENUINELY MISSING:** no.

**Grade:** PROVEN.

---

## Concept 5 — KnowledgeRecord

**Domain meaning (GROWTH-OS.md §6.2, §7 build order):** merged findings tagged VERIFIED / INFERRED / UNKNOWN; "synthesis never overwrites tagged knowledge; it adds."

**Existing PING equivalent:** `Knowledge` (`runtime/kernel/identity/knowledge.ts:30`) — compiled from Facts, immutable, zero subjective fields; payload carries `derived_facts, supporting_evidence, relationships, lineage[]` (`knowledge.ts:9-28`). The "adds, never overwrites" doctrine is native: immutability + lineage + `replay_proof`. Subjective grading lives separately in `Assessment` (`assessment.ts:9-22`), which is exactly where VERIFIED / INFERRED / UNKNOWN tags belong (confidence/trust/freshness fields).

**REUSE DIRECTLY:** yes.

**EXTEND:** nothing structural — tag vocabulary (VERIFIED / INFERRED / UNKNOWN) is a data convention on Assessment/Knowledge metadata.

**ADAPTER REQUIRED:** no.

**GENUINELY MISSING:** no.

**Grade:** PROVEN.

---

## Concept 6 — Learning

**Domain meaning (GROWTH-OS.md §2 Engine 7):** the "remember why" record — WHY CREATED / EVIDENCE / HYPOTHESIS / DECISION / OUTCOME / LEARNING / CONFIDENCE / NEXT TEST — feeding playbook rules. Doctrine: "confidence is a number with evidence attached, never a promotion. Learning updates knowledge and the playbook. LEARNING ≠ AUTHORITY."

**Existing PING equivalent:** `knowledge_nodes` (`knowledge_graph.js:45-69`) — free-form `node_type`, `label`, `data JSONB`, `confidence`, `status`, `source_event_id`, `correlation_id` — plus `knowledge_edges` for LEARNING → PLAYBOOK / LEARNING → KNOWLEDGE relationships. The "confidence is a number with evidence attached" doctrine is literally `Assessment{knowledge_id, confidence, …}` (`assessment.ts:9-20`) and the promoter's "confidence 1.0, status approved … never rewrites data — ADD-only provenance" (`knowledge_promoter.js:109`, `knowledge_graph.js` upsert `:93-100`). The `continuous_reflection_loop.js` learning hits are only metrics counters (`gateway/continuous_reflection_loop.js:32, 146-147`) — not an object type. No `Learning` class/interface exists in canonical TS or gateway JS (searched).

**REUSE DIRECTLY:** yes — a Learning is a `knowledge_nodes` row with `node_type='learning'` and the eight "remember why" fields in `data JSONB`, with `confidence` + `confidence_provenance` columns and status lifecycle already present; a playbook rule is another node with an edge. No new table.

**EXTEND:** a typed schema convention for the `data` JSONB shape (the eight fields) — convention only.

**ADAPTER REQUIRED:** no.

**GENUINELY MISSING:** no.

**Grade:** PROVEN.

---

## Concept 7 — ExperimentResult

**Domain meaning (GROWTH-OS.md §2 Engine 5):** `ContentExperiment{hypothesis, audience, variable, control, treatment, primary metric, secondary metrics, guardrail, observation window, result (SUPPORTED / FALSIFIED / INCONCLUSIVE)}`. Doctrine: "A result updates confidence, never policy directly."

**Existing PING equivalent:** the mission result envelope — `ping_missions.result JSONB` + terminal status (`completed | failed`, `mission_runtime.js:160-175`) — plus the replay verdict `{verified, reason, violations}` (`canonical_workers.js:340-356`) and `EvidenceAuthority.verify` `{verified, reason, checks}` (`evidence_authority.js:74-138`). The "result updates confidence, never policy" doctrine is the Assessment/promoter doctrine (see Concept 6). No `Experiment` or `ExperimentResult` type exists in canonical TS or gateway JS (searched; only hits were unrelated). No `hypothesis` literal anywhere in canonical TS (searched).

**REUSE DIRECTLY:** yes — an ExperimentResult is a mission with `mission_type='CONTENT_EXPERIMENT'`: design fields in `payload JSONB`, measured outcome in `result JSONB`, terminal status in `status`, full causal trace via `getTrace` (`mission_runtime.js:340`).

**EXTEND:** the experiment design/result schema contract (hypothesis, variable, control, treatment, metrics, guardrail, window) as a payload convention, and the verdict enum (see Status Semantics).

**ADAPTER REQUIRED:** no.

**GENUINELY MISSING:** no — except the SUPPORTED / FALSIFIED / INCONCLUSIVE verdict literals themselves (see below).

**Grade:** PROVEN.

---

## Concept 8 — ContentArtifact

**Domain meaning (GROWTH-OS.md §2 Engine 4):** `ContentArtifact{source media, transcript, segments[] (timestamp, speaker, topic, claim, evidence, visual, performance), hook, thesis, CTA, audience, experiment, derived assets[]}`. Doctrine: one canonical text representation drives all derivatives.

**Existing PING equivalent:** `Artifact` (`runtime/kernel/identity/artifact.ts:18`) — "Immutable representation of acquired information (snapshot)" with `artifact_type: string, content: string, content_hash, size, format, source_id` (`artifact.ts:9-16`). The transcript doctrine maps exactly: `artifact_type='content'`, `content` = the canonical text representation, derivatives referencing it by `source_id`/hash. Note: the gateway `documents` table (`gateway/document_tracker.js:69-83`) is a filesystem file-index (filepath, sha256) — NOT this; do not confuse it with ContentArtifact.

**REUSE DIRECTLY:** yes — a ContentArtifact is an `Artifact` canonical object; segments/hook/thesis/CTA are a content-schema convention within `content` or a linked derived artifact.

**EXTEND:** a typed content sub-schema (segments[], hook, thesis, CTA) if schema-level rigor is wanted — payload-shape convention, not a new object. (The CEO Ledger 04 media-manifest directive says classify media manifests by meaning: source/evidence-side vs generated-projection metadata — a ContentArtifact with transcript + derived assets[] is precisely the evidence-side + projection-metadata split, representable as Artifact + derived artifacts.)

**ADAPTER REQUIRED:** no.

**GENUINELY MISSING:** no.

**Grade:** PROVEN.

---

## Concept 9 — AudienceCluster

**Domain meaning (GROWTH-OS.md §2 Engine 2, §3):** `AudienceCluster{problems, questions, vocabulary, sophistication, websites, creators, YouTube channels, podcasts, communities, search queries, tools, competing products, preferred formats, observed engagement, evidence[]}`; clusters, not personas; explicit overlap. §3 graph query: `Topic → resonates_with → Audience → overlaps → Audience → follows → Creator → discusses → Topic → demonstrated_by → Video → generated → QualifiedLead`.

**Existing PING equivalent:** `knowledge_nodes` + `knowledge_edges` (`knowledge_graph.js:45-84`) — free-form `node_type`/`entity_type`/`entity_id`, `label`, `data JSONB`, `evidence[]`-equivalent via `source_event_id` + edges; the entire §3 graph query is expressible as typed nodes and edges (`resonates_with`, `overlaps`, `follows`, `discusses`, `demonstrated_by`, `generated`). No `Audience` type exists in canonical TS or gateway JS (searched; the only `audience` hit is a documentation-proposal field, `gateway/proposal_objects.js:259` — unrelated). The `customers` table (`customer_authority.js:48-73`) is a CRM person/org store (tenant_id, display_name, company, email…), not a behavioral cluster.

**REUSE DIRECTLY:** yes — an AudienceCluster is a knowledge-graph node (`node_type='audience_cluster'`, cluster fields in `data JSONB`, evidence via `source_event_id`/edges) with `overlaps` edges.

**EXTEND:** nothing structural — node/edge type vocabulary is a data convention.

**ADAPTER REQUIRED:** no — the graph query in §3 needs no new boundary; it is a read over existing nodes/edges.

**GENUINELY MISSING:** no.

**Grade:** PROVEN.

---

## Concept 10 — Opportunity

**Domain meaning (GROWTH-OS.md §2 Engine 3):** `TopicOpportunity{demand, growth, acceleration, competition, audience_fit, PING_relevance, evidence_quality, freshness}` (0–1 each); OpportunityScore. Doctrine: "OpportunityScore is a recommendation, never an authority. It cannot approve, publish, or spend by itself."

**Existing PING equivalent:** `knowledge_nodes` (`node_type='opportunity'`, `confidence`, `status`) + `Assessment` (`assessment.ts:9-20`: `confidence, trust, freshness, risk, priority, quality, complexity, security, coverage` — the 0–1 score fields are already there). The doctrine is already constitutional: "Assessment never mutates Knowledge" (`assessment.ts:3`) — a score is a recommendation, never an authority, by construction.

**REUSE DIRECTLY:** yes.

**EXTEND:** the eight TopicOpportunity score fields as a breakdown in `Assessment` payload or node `data JSONB` (current Assessment fields cover confidence/trust/freshness/risk/priority/quality but not demand/growth/acceleration/competition/audience_fit) — field addition, not a new object.

**ADAPTER REQUIRED:** no.

**GENUINELY MISSING:** no.

**Grade:** PROVEN.

---

## Status Semantics — SUPPORTED / FALSIFIED / INCONCLUSIVE / REJECTED / FAILED_EXECUTION

**Search scope:** full-text grep across `/home/nolan/ping` (`runtime`, `cir`, `constitutional-compiler`, `capabilities`, `database`, `*.ts`, node_modules and `worktrees/` excluded) and `/home/nolan/ping-gateway-src` (`ping-runtime/`, `gateway/`, `*.js`, node_modules excluded); plus the Python sibling for context.

| Literal | Finding |
|---|---|
| **SUPPORTED** | No verdict-semantics hit anywhere in PING. The only `SUPPORTED*` hits are `SUPPORTED_VISIBILITIES` (`runtime/constitutional/src/ping-vocabulary.ts:66`) — a social-visibility enum, unrelated — and `SUPPORTED_LANGUAGES` / `SUPPORTED_STREAMS` in the gateway/CRX — unrelated. **GENUINELY MISSING** as a verdict enum. |
| **FALSIFIED** | Zero hits in PING. **GENUINELY MISSING.** |
| **INCONCLUSIVE** | Zero hits in PING. The dormant CRX sibling has `VerificationStatus.INCONCLUSIVE` inside `PENDING / IN_PROGRESS / PASSED / FAILED / INCONCLUSIVE / SKIPPED` (`constitutional-runtime/runtime/verification/verifier.py:23-30`) with a `VerificationResult{verification_id, status, method, evidence_artifacts, confidence}` (`verifier.py:46-60`) — but that repo is a mine, not a PING authority (CEO Ledger 04). **GENUINELY MISSING in PING; harvestable as a primitive only.** |
| **REJECTED** | **EXISTS** — `knowledge_nodes.status = 'rejected'` set by the promoter on `SNIPPET_REJECTED` / `AI_RESPONSE_REJECTED` (`knowledge_promoter.js:50-51`), schema default `candidate` at `knowledge_graph.js:55, 60`. REUSE directly. |
| **FAILED_EXECUTION** | No such literal anywhere. Semantics covered by `ping_missions.status = 'failed'` + `error` column (`mission_runtime.js:174-175, 218-219`) and the replay reason `'kernel_failed'` (`canonical_workers.js:343`). **Literal GENUINELY MISSING; semantics REUSE via `failed`.** |
| **CONFIRMED / REFUTED / UNCLEAR** (§6.1 output schema) | Zero hits in PING. Closest existing: `EvidenceAuthority.verify` → `{verified: boolean, reason, checks}` (`evidence_authority.js:74-138`); replay verdict `verified` boolean (`canonical_workers.js:340-356`); promoter `approved / rejected` + confidence (`knowledge_promoter.js:50-51`). **GENUINELY MISSING as enums.** |

**PING's existing verdict vocabulary (the full inventory):** `verified: boolean` + `reason` + `checks`/`violations[]` (evidence + replay); `candidate / approved / rejected` + `confidence` (knowledge lifecycle); `created / assigned / running / completed / failed / retry_pending` (mission lifecycle). A three-valued experiment/claim verdict is a genuinely missing *enum*, representable as an EXTEND (a `verdict` field on claim/experiment records, or a `knowledge_nodes.status` value) — not a new object, not a new authority.

**Grade:** PROVEN for the inventory; NOT PROVEN (searched, absent) for SUPPORTED / FALSIFIED / INCONCLUSIVE / CONFIRMED / REFUTED / UNCLEAR in PING; the CRX `INCONCLUSIVE` sighting is flagged as non-authoritative context.

---

## Caveats

1. **Branch mismatch:** the canonical repo's working tree is `lane-b/tenant-dispatch-threading @ 546b62d76`, not the briefed `refactor/runtime-authority-convergence`. All canonical-repo greps ran against this tree. The cited kernel types (`evidence.ts`, `artifact.ts`, `knowledge.ts`, `assessment.ts`, `cir/fact.ts`, `cir/observation.ts`) are long-standing; still, a re-grep on the briefed branch is cheap insurance — mark NEEDS-REVERIFY only for the branch dimension, not the findings.
2. **Two Evidence shapes exist in the canonical repo:** the kernel canonical object (`runtime/kernel/identity/evidence.ts:16`, the authority) and a compiler-local `Evidence` interface (`constitutional-compiler/evidence/evidence-store.ts:44`, symbol-level, not canonical). This report cites the kernel one as the authority; do not treat the compiler one as a competing authority without a sovereignty check.
3. `ping-gateway-build` was not line-grepped; it is a build copy of the searched `ping-gateway-src`.
