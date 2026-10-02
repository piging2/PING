# CORE INTERROGATION — Investigator E: Intelligence (Q12, Q13, Q14)

Investigator: subagent 2e584d1c (reader/falsifier). Date: 2026-09-30 ~14:12–15:30 MDT.
Charter: ~/workspace/goals/ping-agent-execution-stack/files/PING-CORE-INTERROGATION-2026-09-30.md
Method per question: QUESTION → CURRENT CLAIM → REACHED PATH → EVIDENCE → COUNTEREVIDENCE → VERDICT → SMALLEST CONSEQUENCE.
No proposals. No new authorities, stores, writers, coordinators, or registries.

Live sources actually read (not assumed):
- Live journal: Pig `brain-postgres` / `ping_runtime` (read-only SQL via pigwsl-exec; the gateway's real DB — `crx_runtime` on `ping-postgres` is a stale 739-event snapshot, last write 2026-09-16).
- Live `ping-gateway` container logs (docker logs, read-only).
- `ping-runtime/workers/canonical_workers.js` (lane-d pig-src snapshot, convergence-zoom-2026-09-19).
- `ping-runtime/orchestration/mission_scheduler.js` MISSION_WORKER_MAP (same snapshot).
- `gateway/event_to_mission_bridge.js` EVENT_MISSION_MAP (fyd-lane harvest code-evidence).
- `~/workspace/outreach/angle-performance.md` (operational learning ledger, rounds 24–68+).
- `~/workspace/product-loop-mission-result-investigation.md` (2026-09-20).
- Forensics: agent-e (context/knowledge), agent-f (temporal/ORCA/approval), lane-f (falsification), AUTH-CONV-06 (sovereignty audit).
- Memory: dated notes 2026-09-13/16/17/19/30, MEMORY.md standing rules.

---

## Q12 — Where is intelligence currently trapped in prompts or humans?

### QUESTION
Search operational history for repeated model/human judgments. Classify each MODEL-REQUIRED / MODEL-ASSISTED / DETERMINISTIC-CANDIDATE / DETERMINISTIC-PROVEN. State what evidence would move one category to the next. Do not deterministicize judgment merely because it repeats.

### CURRENT CLAIM (the claim under test)
PING runs an "intelligence chain": observation → claim → classification → recommendation, plus an IntelligenceWorker with optional Ollama, i.e. model judgment lives inside the canonical machinery.

### REACHED PATH
Read the actual worker code (`canonical_workers.js`, 1020 lines, pig-src snapshot of the enforced path): `ObservationWorker.handle`, `ClaimWorker.handle`, `ClassificationWorker.handle` (+`_categorize`/`_prioritize`), `RecommendationWorker.handle` (+`_recommendAction`/`_recommendReason`), the `registerCanonicalWorkers` table, and the `IntelligenceWorker` require/registration. Grepped the whole file for model calls. Cross-checked against live gateway logs.

### EVIDENCE
1. **The canonical "intelligence chain" contains zero model calls.** `ClaimWorker.handle` copies `documentId/eventType/timestamp/source` from the observation into a claim and emits `CLAIM_CREATED` — no inference. `ClassificationWorker._categorize` is a static 10-entry dictionary (`REVIEW_RECEIVED→customer-feedback`, `LEAD_CREATED→sales`, …; default `'general'`). `_prioritize` is three hardcoded ifs (`REVIEW_RECEIVED && rating<=2 → urgent`, etc.). `RecommendationWorker._recommendAction` is a static 6-entry dictionary (`customer-feedback → 'Respond to customer review'`, …); `_recommendReason` is three canned strings. Grep for `ollama|inference|llm|chat(|generate(` across the file: only hits are the header comment ("optional Ollama") and a privacy comment. **The chain is DETERMINISTIC-PROVEN — lookup tables and if/else, not judgment.**
2. **IntelligenceWorker is dormant and its module is absent.** `require('./intelligence_worker')` at line 928, but `ping-runtime/workers/` contains only `canonical_workers.js` and `worker_runtime.js` — no `intelligence_worker.js`. Registration uses `eventTypes: []`, and the registration loop skips empty eventTypes ("processes ZERO events on the live path"). The one place a model was ever contemplated in the worker chain does not exist on disk in this snapshot.
3. **The real repeated judgments live outside the canonical machinery**, in prompts and humans:
   - Meta AI tandem briefs (a-weak-website-hunt, b-new-business-radar, c-review, d-fence): model proposes; contract validators fail closed (c-brief REJECTED 3 consecutive rotations, rounds 62/66/68); standing rule "no pipeline add without an independently verified date" (round 60: Meta AI's newness inference failed 4×, explicit dates correct 7/7).
   - Outreach copy drafting + A/B variants: model generates; the round-44 copy-test protocol is the empirical judge; variants still 0-0-0 on replies.
   - AEO evals (STRONG/MODERATE/WEAK), FB delta-scan prospect ID, review-intel trigger detection, HOT/WARM/WATCH grading: model applies a human-calibrated rubric.
   - Lane-g quarantine review (WRONG_INGESTION_DOMAIN): human constitutional judgment about canonical homes; the model (Meta AI b-radar) produced the misfiled observations, a human caught the domain error.
   - Engagement curation: model/agent tiers, with manual human curation when tiers misfire (pass 129: regex tiers picked a real-estate listing and a sponsorship solicitation; human curated the genuine promos).
   - Own-site verification: human-set mechanical bar ("exact address readable on the live site", not indexed content — round 66 Tri-County case).

### COUNTEREVIDENCE (what the docs claim vs what runs)
- Aspirational naming: workers called "ClaimWorker/ClassificationWorker/RecommendationWorker", mission types named `LEAD_FOLLOWUP`, `EMAIL_PROCESS`, `REVIEW_RESPONSE` — the names promise intelligence and external effects; the code delivers field-copying and event emission. Docs (agent-e) describe "claim → classification → recommendation" as an intelligence pipeline; the implementation is deterministic tables.
- `knowledge_retrieval.js` (Qdrant→Ollama direct answer) is the one live-adjacent model path, but per the 2026-09-19 product-loop finding there are zero non-test consumers of mission results, and I found no retrieval/query events in the live journal — its liveness is UNKNOWN, not proven.

### VERDICT
**PARTIAL.** The question's premise ("intelligence trapped in prompts/humans") is confirmed for the operational loops, but **inverted** for the canonical machinery: the machinery that is *named* as intelligent is deterministic, and the intelligence that is *real* lives in prompts (Meta AI briefs, drafting, curation) and humans (lane-g review, Nolan's directives, manual curation). Classification table:

| # | Repeated judgment | Location | Class | Evidence to move up one category |
|---|---|---|---|---|
| 1 | Observation→Claim→Classification→Recommendation | canonical_workers.js | **DETERMINISTIC-PROVEN** | N/A (already proven; moving "down" to model would need a demonstrated judgment the tables can't express) |
| 2 | EvidenceAuthority.rank scoring | evidence_authority.js (formula in agent-e) | **DETERMINISTIC-PROVEN** | N/A |
| 3 | IntelligenceWorker (optional Ollama) | canonical_workers.js:928,988 | **DORMANT / NOT-REACHED** (module absent, eventTypes []) | A live registration processing an event in gateway logs |
| 4 | Meta AI brief judgments (a/b/c/d) | tandem pipeline | **MODEL-ASSISTED** | → DETERMINISTIC-CANDIDATE: contract validator catches the systematic c-brief failure deterministically + stable answer shape over N consecutive rotations (currently failing, so it moves *down*, not up) |
| 5 | Own-site email/route verification | outreach engine | **DETERMINISTIC-CANDIDATE** (mechanical rule, human/model-executed) | → PROVEN: fetcher+extractor reproduces human verdicts on a held-out set with **zero false positives** (false positives misdirect outreach; the bar is asymmetric) |
| 6 | Prospect fit grading HOT/WARM/WATCH | outreach research | **MODEL-ASSISTED** | → CANDIDATE: inter-rater agreement model-vs-human on labeled set **plus** outcome correlation (do HOTs actually reply/convert more?) |
| 7 | Copy drafting + A/B variants | outreach engine | **MODEL-REQUIRED** | Cannot move: the reply-rate outcome is the judge; standing learning law bars promoting n=1 to policy. A deterministic template matching tailored-variant reply rates would be the (unlikely) falsifier |
| 8 | AEO evals, delta-scan prospect ID, review-intel triggers | outreach/engagement | **MODEL-ASSISTED** | → CANDIDATE: same as #6 — agreement + outcome correlation |
| 9 | Engagement post curation (like/comment picks) | engagement pipelines | **MODEL-ASSISTED** (human fallback when tiers misfire) | → CANDIDATE: tier picks match human-curated picks on held-out pools without the pass-129-class false positives |
| 10 | Lane-g quarantine domain review | PING ingestion | **HUMAN-REQUIRED** | → ASSISTED: a deterministic rule reproducing WRONG_INGESTION_DOMAIN verdicts on a held-out set (the judgment is constitutional — "canonical home" — not syntactic) |
| 11 | PING Social caption humor check | content pipeline | **HUMAN/MODEL-REQUIRED** (standing rule) | Per Nolan's rule, this one does not move |

Standing principle (memory/2026-09-13, Nolan): judgment is strongest where genuinely difficult (research synthesis, contradiction discovery, hypothesis generation, creative reasoning) and "disappears from decisions repeated evidence makes deterministic." The Tri-County case (round 66) is the caution: the judgment *repeats*, but the failure mode (indexed content vs live render) is exactly why the human-set bar must not be deterministicized by repetition alone.

### SMALLEST CONSEQUENCE
None — reader only. Watch item for whoever owns the worker code: the `require('./intelligence_worker')` against a missing module in the snapshot should be reconciled against the live container (if the live file is also absent, the gateway would crash at require time — but the gateway is demonstrably running, so the live tree differs from this snapshot; record the divergence, do not act).

### What observation would prove this answer wrong?
A single model/API call inside any canonical worker's `handle()` path on the live enforced code, or a classification/recommendation output in `ping_events` not derivable from the static tables (e.g. a category outside the 10-entry dictionary, or a reason string not among the three canned templates). If found, the "deterministic chain" claim collapses.

---

## Q13 — What has PING learned that materially changes its next action?

### QUESTION
Pick a real learning. Trace OBSERVATION → OUTCOME → PATTERN → CANDIDATE LEARNING → SUPPORT SET → PROMOTION → RETRIEVAL → DIFFERENT NEXT DECISION. If the final arrow cannot be demonstrated, PING may be storing learning without using learning.

### CURRENT CLAIM
PING's knowledge lifecycle (candidate → approved/rejected via KnowledgePromoter) constitutes learning that changes downstream behavior.

### REACHED PATH
Live journal queries (brain-postgres/ping_runtime, read-only): `knowledge_nodes` status/provenance counts; `SNIPPET_*`/`AI_RESPONSE_*` event counts; the 8 rejected nodes' labels and the full text of their rejection events; post-rejection node creation timestamps and sources; event-type inventory after the rejection window.

### EVIDENCE — the one complete trace (lane-g quarantine, 2026-09-25)
- **OBSERVATION:** 8 Meta AI b-new-business-radar sweep observations projected as knowledge candidates (nodes created 2026-09-25 09:22–09:23 UTC).
- **OUTCOME:** human lane-g quarantine review emitted 8× `SNIPPET_REJECTED` (2026-09-25 15:58 UTC), reason verbatim: "WRONG_INGESTION_DOMAIN: prospect/intel sweep observation (Meta AI b-new-business-radar 2026-09-25) does not belong in PING knowledge. Canonical home is the prospect store (western-co-prospects.jsonl)."
- **PATTERN:** 8/8 identical reason — systematic domain error, not noise. (6 earlier b-radar nodes from 09-18→09-22 remain `candidate`, never reviewed — the pattern was caught once, not continuously.)
- **CANDIDATE LEARNING:** "prospect/intel discovery briefs are prospect-store-only."
- **SUPPORT SET:** 8 rejection events + review reasons, preserved immutable in `ping_events`.
- **PROMOTION:** KnowledgePromoter's rejection path fired live — the 8 nodes now `status='rejected'`, `confidence=0.2` (journal counts: 233 candidate, 8 rejected, **0 approved**; `SNIPPET_APPROVED`=0, `AI_RESPONSE_ACCEPTED`=0 ever).
- **RETRIEVAL:** no retrieval consumer observed. Event inventory after 2026-09-25 16:00 UTC shows only OBSERVATION_CREATED / MISSION_* / CLAIM_CREATED — zero knowledge-query/retrieval events. The 0.2 down-weight has no demonstrated reader.
- **DIFFERENT NEXT DECISION:** **demonstrated — but at the emission gate, not in retrieval.** Five minutes after the rejections, observation `learn-round118` (2026-09-25 16:03 UTC) records: "PING observation emission is now gated at the tandem emission point to the step-7 distillation contract (learn-<sweep-id> briefs only). Prospect/intel discovery briefs (new-business radar, weak-website hunt, review signals, segment deep-dives) are prospect-store-only and are refused before any POST." Corroboration: zero b-radar-sourced nodes created after 2026-09-25 09:23; all 18 post-rejection nodes carry `brief_id: learn-roundNNN` (distillation learnings), not sweep briefs. The next observations were refused before POST — a materially different next action, caused by the learning.

### COUNTEREVIDENCE
- The autonomous-machinery reading fails: PING's own retrieval→decision arrow has **zero instances**. The 8 rejected nodes were never retrieved before or after; no `EvidenceAuthority.rank` call is logged; the 6 pre-rejection b-radar candidates still sit unreviewed. By the machinery-only reading, PING stores the rejection but has never *used* it in a decision.
- The learner is the human+operator loop (lane-g reviewer → tandem engineers), with PING as the ledger that recorded the rejection, the learning statement, and the gate. The changed decision (emission gating) was implemented outside the canonical machinery.
- The approval half of the lifecycle is entirely unexercised: 0 approvals, 0 `SNIPPET_APPROVED`, so "promotion → retrieval boost → different decision" has no positive instance either.

### VERDICT
**PARTIAL.** The full chain OBSERVATION→…→DIFFERENT NEXT DECISION is demonstrated exactly once — the 2026-09-25 lane-g quarantine learning, which changed the tandem emission behavior (sweep briefs refused before POST). But the learning was made by humans and the changed decision lives outside PING's canonical machinery; **PING's autonomous learning machinery is, on current evidence, storing learning without using it** — candidates accumulate (233), rejections are recorded (8), approvals never occur (0), and no retrieval consumer has ever made a decision from any of it.

### SMALLEST CONSEQUENCE
None — reader only. Note for the record: the next honest test of the machinery is not more ingestion but one observed retrieval that includes/excludes a node *because of* its promoted/rejected status.

### What observation would prove this answer wrong?
A logged retrieval (query event, hybrid-search call, or answer record) dated after 2026-09-25 15:58 UTC whose result set differs from the pre-rejection baseline *attributably to* a node's `rejected` status / 0.2 confidence — e.g. the 8 rejected nodes excluded where previously included, with the exclusion traced to the rank multiplier. One such record would demonstrate the machinery's final arrow; none exists in `ping_events`.

---

## Q14 — Can learning corrupt authority?

### QUESTION
Find every path by which model output, experiment result, audience score, opportunity score, recommendation, or previous successful action could become executable policy. Require an explicit promotion boundary. LEARNING ≠ AUTHORITY.

### CURRENT CLAIM
PING's standing law ("experiment results update confidence, never policy directly"; "learning is not authority"; proposal terminal-first law) is enforced by explicit promotion boundaries in the running system.

### REACHED PATH
Traced each candidate path to code + live journal: (1) KnowledgePromoter subscription/registration; (2) EventToMissionBridge EVENT_MISSION_MAP → MissionScheduler MISSION_WORKER_MAP → worker capabilities; (3) EvidenceAuthority.rank consumers; (4) engagement/outreach dispatch path (guard code + AGENTS.md standing law + live incidents); (5) durable approval events and work-order/grant/authorization event inventory in the live journal; (6) live gateway log for boundary behavior (jev-shadow namespace failure).

### EVIDENCE — path by path
1. **KnowledgePromoter (model output → knowledge → retrieval weight).** Explicit boundary, in code: the promoter is registered *only* when `options.knowledgeGraph` is provided (`registerCanonicalWorkers`, "only registered when a KnowledgeGraph is provided"); it subscribes to exactly four event types: `SNIPPET_APPROVED`, `SNIPPET_REJECTED`, `AI_RESPONSE_ACCEPTED`, `AI_RESPONSE_REJECTED`. No model-output event type is in the subscription — a model cannot self-promote; only the human-approval event types cross the boundary. Live proof the boundary holds: 8 rejections fired and down-ranked nodes; **0 approvals ever** (`SNIPPET_APPROVED`=0, `AI_RESPONSE_ACCEPTED`=0; 0 nodes with `status='approved'`). The 2026-09-17 test-scope verification (revision node `194a2b85bde957ed` v1.1.0 `PENDING_HUMAN`, active v1.0.0 untouched, no auto-promotion) shows the same boundary held under test.
2. **Recommendation → mission → worker (recommendation → executable policy).** `EVENT_MISSION_MAP`: `CLASSIFICATION_CREATED → RECOMMENDATION_CREATE`, `RECOMMENDATION_CREATED → PROJECTION_CREATE`. `MISSION_WORKER_MAP`: **every** business mission type (`CUSTOMER_ONBOARD`, `LEAD_FOLLOWUP`, `REVIEW_RESPONSE`, `EMAIL_PROCESS`, `INVOICE_FOLLOWUP`, …) maps to the `'observation'` worker — and `ObservationWorker.handle` only copies fields and emits `OBSERVATION_CREATED`. No canonical worker performs external effects. A recommendation therefore becomes a mission, the mission becomes worker execution, and the execution terminates in event emission. The path from learning to *external effect* does not exist on the live path — no promotion boundary is needed because there is no effect capability to promote to. Live journal corroboration: 68 `RECOMMENDATION_CREATED` events, 0 in the last 48h, and no downstream effect records.
3. **Ranked knowledge → answers → actions.** `EvidenceAuthority.rank` (confidence × provenance × approved?1.2 × fallback?0.5 × rejected?0.2) is scoring-only; its consumers (`KnowledgeRetrieval`, `HybridSearch`) *present* answers. No path from an answer to an authorized effect was found: the live journal contains **zero** `PROPOSED_ACTION` / `ACTION_APPROVED` / `ACTION_REJECTED` events (durable approval events added 2026-09-30, never exercised) and **zero** work-order/grant/capability/authorization events of any kind.
4. **Engagement/outreach (the one live path where model judgment → external action).** Model/agent curation (which posts, which prospects, which copy) flows to external effects (likes/comments/DMs/emails) **only** through: (a) Nolan's explicit standing authorization (ceilings, 2h cadence, targeting corridor, disclosure + AI-identity + signoff rules); (b) deterministic fail-closed guards — `engagement-guard.py` (never-reengage ledger merged on every load, terminal-aware; caps; `cmd_filter` crashes fail-closed on malformed jobs); pre-send reconciliation (UTC cap counted from Gmail truth, own-site verification). Demonstrated holds: pass-156's 11 already-engaged posts caught fail-closed at dispatch; the 2026-09-25 incident (12 slipped pre-fix) is exactly what the guard now blocks. Model output cannot widen the policy — it operates *inside* it. This matches the standing rule: experiment results update confidence (the copy-test "winning variant becomes the new A"), never policy.
5. **"Previous successful action" → policy.** The never-reengage ledger turns past actions into a *constraint* (fewer future actions), not an expanded authority. The angle-performance ledger turns outcomes into candidate learnings with explicit anti-promotion rules (n=1 never becomes policy; "Undated negatives strengthen, they never create").
6. **Boundary observed holding live today.** Gateway logs show worker `jev-shadow` failing `emit JEV_DECISION_EVALUATED` with "No owner defined for namespace 'jev'" — the namespace-ownership check fail-closed a worker's emit attempt. An unowned namespace could not become a write authority.

### COUNTEREVIDENCE / scope limits (hostile to my own answer)
- The mission-type names (`LEAD_FOLLOWUP`, `EMAIL_PROCESS`, `REVIEW_RESPONSE`) **promise effects the wiring does not deliver**. This is a latent hazard, not a live path: if a future worker with real external effects is registered under one of these names, the bridge would auto-fire it from classifications with no approval gate in the loop. The boundary that matters then does not exist yet.
- The durable approval events (`PROPOSED_ACTION`/`ACTION_APPROVED`/`ACTION_REJECTED`) have zero instances — the "authorized effect" boundary is code, not demonstrated behavior.
- `authorizeWorkOrder` exists in ORCA workstream code (`orca_control_loop.js`, `external_agent_adapter.js`) — a code-level path from authorization to execution — but I did not place it on the live enforced path; its live status is UNKNOWN.
- The engagement path's boundary is Nolan's standing directive + guards — strong, but it is *operator* authority, not a cryptographic or in-journal authorization record. A journal archaeologist finds the effects (sends, engagements) but not a per-effect authorization row.

### VERDICT
**FALSIFIED** (for the current system): on every path I could trace to code and the live journal, learning cannot become executable policy without crossing an explicit boundary — the promoter's four human-approval event types (8 rejections in, 0 approvals out, 0 self-promotions), the worker set's lack of any external-effect capability (recommendations terminate in event emission), and the engagement/outreach guards (fail-closed, demonstrated). LEARNING ≠ AUTHORITY holds in the running system today. The verdict is scoped: it rests on boundaries (1), (2), and (4); boundary (3)'s approval machinery is unexercised and the mission-name latent hazard is real but not live.

### SMALLEST CONSEQUENCE
None — reader only. Two watch items for the record, not proposals: (a) the mission-type/effect-name mismatch (`LEAD_FOLLOWUP` et al. routing to a field-copying worker) should be labeled wherever mission types are documented, so a future real-effect worker is not auto-wired by the bridge without a conscious approval decision; (b) the first real `ACTION_APPROVED` event, when it occurs, is the test that the durable-approval boundary works as coded.

### What observation would prove this answer wrong?
Any **one** of: a `knowledge_nodes` row with `status='approved'` and no corresponding `SNIPPET_APPROVED`/`AI_RESPONSE_ACCEPTED` event in `ping_events` (promoter bypass); a dispatched engagement action whose post ID is in the ledger's engaged set or which exceeds the cap (guard bypass); an external effect in the journal (email/DM/post) whose authorizing mission or capability has no Nolan-authorized policy covering it; or a worker emitting into a namespace it does not own without the fail-closed error (the jev-shadow case succeeding).

---

## Cross-question synthesis (reader only, no proposals)

1. **The intelligence inversion.** PING's canonical machinery is deterministic where its names promise intelligence (Q12), stores learning it does not autonomously use (Q13-machinery), and is safe from learning-corrupts-authority precisely *because* so little of it is live: no model in the worker chain, no approvals ever, no effect capabilities, no approval events consumed (Q14). The safety is substantially the safety of inaction.
2. **The real intelligence — and the real learning loop — is the human+operator loop with PING as ledger.** Meta AI proposes, validators fail closed, humans review (lane-g), Nolan's directives set policy, guards enforce deterministically, and the journal records rejections, learnings, and gates. The one complete OBSERVATION→DIFFERENT-NEXT-DECISION trace (Q13) ran through that loop, not through the autonomous machinery.
3. **Aspirational docs are counterevidence, not evidence.** "Intelligence chain", "ClaimWorker", mission types named for effects, the ContextPack boundary claim (falsified by agent-e) — each describes a system more capable than the one whose behavior I could reach. Any future builder should start from the reached behavior, not the names.

## Evidence anchors (for re-verification)
- Live journal: Pig `brain-postgres`, db `ping_runtime` (gateway env: `POSTGRES_HOST=brain-postgres`, `POSTGRES_DB=ping_runtime`). Read-only queries used throughout; no writes performed.
- `knowledge_nodes`: 233 candidate / 8 rejected / 0 approved (2026-09-30).
- `ping_events`: 2580 events; `SNIPPET_REJECTED`=8, `SNIPPET_APPROVED`=0, `AI_RESPONSE_ACCEPTED`=0; `PROPOSED_ACTION`/`ACTION_APPROVED`/`ACTION_REJECTED`=0; work-order/grant/authorization events=0.
- Rejection reason verbatim + learn-round118 text: queried live (see Q13 evidence).
- `canonical_workers.js` (pig-src snapshot): `_categorize`/`_prioritize`/`_recommendAction`/`_recommendReason` static tables; `require('./intelligence_worker')` with module absent; `eventTypes: []` dormant registration.
- `mission_scheduler.js` MISSION_WORKER_MAP: all business missions → `'observation'`.
- Live gateway log (2026-09-30): `jev-shadow` emit fail-closed on unowned namespace `jev`.
