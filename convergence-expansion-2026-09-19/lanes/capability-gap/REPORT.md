# Capability Gap: Proposition / Decision / Outreach Investigation

Lane: capability-gap | Date: 2026-09-19 | HEAD: 1995f0a59 | Mode: READ-ONLY (no worktree file modified)

Question: PING's internal event correctness is strong. Where does its product/business
capability stop? What exists between intelligence (observation → claim → classification →
recommendation) and business action (proposition, decision, authorized outreach), and
what is missing?

Short answer: PING completes the full intelligence chain through RECOMMENDATION_CREATED,
then the chain dead-ends into projection (Qdrant vectors) and a read-only dashboard.
Every outbound-capable mechanism is either an explicit stub (email/SMS) or a file-based
relic (proposal pipeline). The ladder states MODEL SUGGESTED → PING RECOMMENDED →
HUMAN DECIDED → ACTION AUTHORIZED → ACTION EXECUTED → OUTCOME OBSERVED exist only as
the second rung, and that rung has no consumers. No duplicate concepts were created;
findings below reference what exists.

---

## 1. CONCEPT INVENTORY (exists, with file/line evidence)

### 1a. The intelligence chain: complete to recommendation, then projection

| Stage | Producer | Evidence |
|---|---|---|
| OBSERVATION_CREATED | ObservationWorker | ping-runtime/workers/canonical_workers.js:87-138. Extracts `{documentId, eventType, timestamp, source, metadata}`. Business events carry no document identity; the triggering event itself becomes the observation subject (lines 96-113). |
| CLAIM_CREATED | ClaimWorker | canonical_workers.js:139-168. Thin wrapper: re-emits claim with `{documentId, eventType, timestamp, source}`. No semantic content beyond provenance. |
| CLASSIFICATION_CREATED | ClassificationWorker | canonical_workers.js:805-868. `{category, priority, confidence (inherited, nullable), confidence_source, source}`. `_categorize` maps business event types to category; `_prioritize` marks REVIEW_RECEIVED rating <= 2 as urgent, LEAD_CREATED and ESTIMATE_SENT as high (lines 851-867). |
| RECOMMENDATION_CREATED | RecommendationWorker | canonical_workers.js:870-932. `{action, reason, priority, confidence (inherited), confidence_source, evidence: [event.event_id]}`. Action table is static rule lookup by category: 'Respond to customer review', 'Follow up on estimate', 'Update project status', 'Track invoice payment', 'Process incoming message', 'Onboard new customer' (lines 914-924). |
| After recommendation | EventToMissionBridge | ping-runtime/orchestration/event_to_mission_bridge.js:104. RECOMMENDATION_CREATED routes to missionType PROJECTION_CREATE. Not action; it routes to vector projection. |

Terminal states: PROJECTION_CREATED → REPLAY_VERIFY → REPLAY_COMPLETED → WITNESS_ATTEST →
WITNESS_CREATED → LINEAGE_CREATE → terminal (bridge lines 105-112). The intelligence
chain is a closed loop that ends in projections and attestations. Nothing exits to the world.

### 1b. Business event vocabulary: complete as evidence

Owned by thin emitters over the canonical UnifiedEventRuntime:
- ping-runtime/business/business_emitters.js: ReviewEmitter (REVIEW_RECEIVED, REVIEW_RESPONDED),
  CustomerEmitter (CUSTOMER_CREATED/UPDATED, LEAD_CREATED, LEAD_CONVERTED), ProjectEmitter
  (PROJECT_*, ESTIMATE_*, INVOICE_*), ConnectorEmitter (EMAIL_SENT/RECEIVED, SMS_SENT,
  GOOGLE_REVIEW_RECEIVED, GITHUB_COMMIT_SYNCED), SystemEmitter.
- Business authorities exist as HTTP-backed domain logic:
  ping-runtime/business/customer_authority.js, project_authority.js (has revenue aggregate
  SQL at :276), review_authority.js, ai_workspace_authority.js.
- Business events are first-class in scheduling: ping-runtime/boundaries/priority_boundary.js:28
  sets priority 3 = revenue-critical for leads, estimate followups, invoice followups, reviews.

So "customer need" and "business opportunity" are represented as: events (REVIEW_RECEIVED
rating<=2 → urgent classification; LEAD_CREATED → high) plus derived read-only dashboard
projections. There is no distinct "opportunity" or "proposition" object anywhere in runtime
code. Grep for `next.best.action`, `customer.need`, `business.opportunity`, `proposition`
(business sense) across ping-runtime, runtime, gateway: zero hits.

### 1c. Business missions: named but they loop back into intelligence

- event_to_mission_bridge.js:60-98 maps every business event to a mission type:
  LEAD_FOLLOWUP, LEAD_CONVERT, REVIEW_RESPONSE, ESTIMATE_FOLLOWUP, INVOICE_FOLLOWUP, etc.
- mission_scheduler.js:66-82 MISSION_WORKER_MAP routes ALL business missions to the
  'observation' worker.
- ObservationWorker then re-emits OBSERVATION_CREATED for the mission's event type
  (canonical_workers.js:87-138).

Net effect: LEAD_CREATED → LEAD_FOLLOWUP mission → ObservationWorker →
OBSERVATION_CREATED → CLAIM → CLASSIFICATION → RECOMMENDATION ("Follow up on new lead")
→ PROJECTION_CREATE → ... The "follow up" never follows up. The mission is a relabeling
of the same intelligence loop, not an action.

### 1d. Recommendation consumers: one read-only dashboard route

RECOMMENDATION_CREATED is consumed only by:
- gateway/routes/mission_control.js:206 GET /business/ai-recommendations (last 7 days,
  plain list; no accept/reject/dispatch POST).
- Tests and the generated event catalog (gateway/generated/event_generator.js:321).

Sibling read-only routes: /business/who-needs-followup (:112), /business/stalled-estimates
(:154), /business/pending-reviews (:181), /business/today-work (:236),
/business/unpaid-invoices (:253), /business/at-risk-projects (:277), /business/marketing
(:305, produces actions like case_study / testimonial_request / nurture_sequence as JSON
suggestions only). Zero POST endpoints anywhere in mission_control.js. The action POSTs
that do exist (gateway/routes/customers.js: import, sync-email, sync-calendar) are data
ingestion, not outreach.

### 1e. Delivery evidence events exist; producers are explicit stubs

- EMAIL_SENT / SMS_SENT / EMAIL_RECEIVED are in the business event vocabulary and the
  classification map ('communication').
- ping-runtime/connectors/email_integration.js:1: `// P054: Email Integration Stub :
  Stub for email delivery: not functional until SMTP provider configured.` send() appends
  to an in-memory array and returns `{status: 'queued'}`; no network.
- ping-runtime/connectors/sms_integration.js:1: `// P054: SMS Integration Stub: not
  functional until Twilio/provider configured.` Same pattern.
- email_connector.js:41-50 converts the in-memory sent array into EMAIL_SENT events for
  sync, which is evidence-of-intent, not evidence-of-delivery.
- Nothing in the runtime ever calls these integrations from the recommendation path.

### 1f. Human decision exists in exactly one place, and it is not about recommendations

- ping-runtime/knowledge/knowledge_promoter.js: explicit human approval becomes knowledge.
  SNIPPET_APPROVED / AI_RESPONSE_ACCEPTED → confidence 1.0 (approved); SNIPPET_REJECTED /
  AI_RESPONSE_REJECTED → down-ranked. ADD-only lifecycle fields; registered only when a
  knowledgeGraph is provided. This is the canonical "human override becomes history"
  mechanism, and its scope is knowledge-graph snippets, not business recommendations.
- Proposal review for code work: ping-runtime/orchestration/proposal_pipeline.js
  (file-based, statuses submitted → artifact_complete → replay_verified → merge_gate →
  constitutional_review → merged/rejected, addReview(reviewer, decision, notes)); and
  gateway/proposal_admission.js (proposal_quarantine table with reviewed_by,
  rejection_reason). Both concern architecture/code proposals, not business action.
  The pipeline is already classified "migrate" by dormant_classifier.

### 1g. Confidence and evidence lineage: present and wired

- BaseWorker._emit propagates `metadata.confidence` and `confidence_source: 'inherited'`
  when not explicitly set (canonical_workers.js:54-70; mirrored in
  intelligence_worker.js:38-52). Recommendations therefore carry evidence linkage
  (`evidence: [event.event_id]`) and inherited confidence, often null when no upstream
  confidence exists. The attach-evidence machinery the task asks about EXISTS. It just
  has no decision consumer.
- ReplayDecisionAuthority (runtime/kernel/execution/replay_decision_authority.js) decides
  replay execution scheduling (immediate/deferred/background/none), not business decisions.
  No confusion is possible in the code; it is a different "decision."

### 1h. The AI-backed recommender is dormant

- ping-runtime/workers/intelligence_worker.js header: "Currently DORMANT (empty eventTypes)
  — registered but never constructed. Would run IN PARALLEL with the canonical
  ClassificationWorker + RecommendationWorker pair if re-enabled." It carries richer
  per-event action tables (e.g. LEAD_CREATED → 'Follow up on new lead', 'New lead requires
  immediate response') but is dead code today.

### 1i. Nothing representing the missing rungs

Zero hits in runtime code for: ACTION_AUTHORIZED, ACTION_EXECUTED, OUTCOME_OBSERVED,
HUMAN_DECIDED, MODEL_SUGGESTED, PING_RECOMMENDED, DECISION_MADE, recommendation_approved.
Zero hits for campaign, template (outreach sense), consent (outreach sense), suppression,
unsubscribe, opt-in, bounce, attribution (business sense).

---

## 2. MISSING TRANSITIONS

Against the required ladder:

1. MODEL SUGGESTED: exists only as a stub shape. RecommendationWorker is deterministic
   rules (action table at canonical_workers.js:914-924); the AI-backed path
   (IntelligenceWorker) is dormant. No model suggestion with provenance (model version,
   prompt, input hash) is ever emitted.
2. PING RECOMMENDED: EXISTS as RECOMMENDATION_CREATED. This is the single rung that
   works end to end: event → observation → claim → classification → recommendation with
   evidence link and inherited confidence.
3. HUMAN DECIDED: MISSING. No event, no route, no worker consumes RECOMMENDATION_CREATED
   for a decision. The only human-decision events in the system (SNIPPET_APPROVED/REJECTED)
   belong to the knowledge graph. The proposal review mechanisms belong to code proposals.
4. ACTION AUTHORIZED: MISSING. No authorization model for business actions. (Lane D
   already recorded the gate rule: no effectful worker registers without
   authorize→ledger→dispatch→confirm; the mechanism was judged unjustified because no
   effectful worker exists. That is the authorization shape waiting for an action.)
5. ACTION EXECUTED: MISSING as a real transition. EMAIL_SENT/SMS_SENT exist as event
   types, but the only producers are stubs that return `{status: 'queued'}` from memory.
   No provider delivery, no message-id, no delivery receipt.
6. OUTCOME OBSERVED: PARTIAL. Outcome events exist (LEAD_CONVERTED, INVOICE_PAID,
   REVIEW_RESPONDED, ESTIMATE_ACCEPTED) but carry no causal link back to any
   recommendation or decision. Attribution does not exist; a converted lead cannot be
   traced to the recommendation that prompted its follow-up.

### Outreach mechanism mapping (per requested facets)

| Facet | Status |
|---|---|
| trigger | EXISTS for ingestion: REVIEW_RECEIVED (incl. GOOGLE_REVIEW_RECEIVED), LEAD_CREATED, ESTIMATE_SENT all route to missions and recommendations. |
| decision owner | MISSING. No principal field, no role, no owner for recommendations. |
| template / content authority | MISSING. No template concept; recommendation.action is a static string, not content. |
| recipient identity | PARTIAL. Business authorities hold customer/lead identities (customer_authority.js); recommendations reference only documentId/event_id, not the recipient. |
| consent / suppression | MISSING. No consent state, no suppression list, no opt-in/opt-out representation. |
| execution provider | STUB. EmailIntegration/SmsIntegration are P054 stubs; health() reports 'not configured'. |
| idempotency | EXISTS at the event layer (generateIdWithDigest, canonical_hash witness, HEAD 1995f0a59) but NOT at the send layer; a retried send would double-deliver if a provider were wired. |
| delivery evidence | PARTIAL. EMAIL_SENT/SMS_SENT event types exist; only stub-produced evidence exists. No provider message-id or receipt. |
| reply ingestion | EXISTS: EMAIL_RECEIVED, GOOGLE_REVIEW_RECEIVED event types; sync-email route in customers.js. |
| outcome | PARTIAL: LEAD_CONVERTED, INVOICE_PAID, ESTIMATE_ACCEPTED exist without attribution linkage. |

### Smallest path to a fully evidenced outreach loop (existing events only)

The review loop is the smallest because the response content can be human-composed and the
delivery evidence event already exists:

REVIEW_RECEIVED (rating<=2 → classification urgent, recommendation "Respond to customer
review", evidence=[event_id]) → [MISSING: human decision: accept/reject + response text]
→ REVIEW_RESPONDED (exists; ReviewEmitter.responded(reviewId, response)) → observed by the
same intelligence chain → next classification sees respondedReviewIds and drops it from
pending-reviews (mission_control.js:112 logic already implements this).

What is needed for this loop to close is exactly one new event type (a human decision on
a recommendation) plus a decision principal. The provider question does not arise because
the human sends the response outside PING; PING records the evidence. This is the minimum
viable proposition→decision→evidence path.

---

## 3. WHERE PING STOPS

PING stops at the recommendation boundary. Concretely:

- The intelligence chain is complete and reproducible through RECOMMENDATION_CREATED.
- The business event vocabulary is complete as evidence (leads, customers, estimates,
  invoices, reviews, projects, email/sms send+receive).
- Business missions exist as names but are routed back into the observation worker; they
  are relabels of the intelligence loop, not execution.
- The dashboard exposes recommendations and follow-up candidates as read-only JSON.
- Human judgment enters the system only for knowledge snippets (KnowledgePromoter) and
  code proposals (proposal pipeline / quarantine), never for business recommendations.
- Outbound delivery exists only as labeled stubs (P054) with in-memory queues.
- No state in the system represents: a decision about a recommendation, authorization of
  an action, execution of an action through a real provider, consent of a recipient, or
  attribution of an outcome to the recommendation/decision that caused it.

In one line: PING can observe, classify, recommend, and project, and it can replay all
of that deterministically. It cannot propose to a customer, cannot record a human
deciding, cannot authorize or execute an action, and cannot attribute an outcome.

---

## 4. BACKLOG ITEMS

Format: ID / PROBLEM / EVIDENCE / USER VALUE / CONSTITUTIONAL VALUE / FAILURE MODE /
PROPOSED MINIMUM CHANGE / PROOF REQUIRED / DEPENDENCIES / RISK / STATUS.
Prioritized with leverage reasoning. All items are investigation-stage; nothing is started.

### CG-001: P0: Human decision on recommendations is not canonical history

- PROBLEM: RECOMMENDATION_CREATED has no accept/reject path. A human reading
  /business/ai-recommendations cannot record a decision, so the human override is invisible
  to replay and the intelligence loop can never learn which recommendations were acted on.
- EVIDENCE: mission_control.js:206-234 (read-only list); grep for RECOMMENDATION_CREATED
  consumers returns only that route and tests. KnowledgePromoter (knowledge_promoter.js)
  shows the existing pattern for human-signal-as-event (ADD-only lifecycle), but its scope
  is knowledge snippets.
- USER VALUE: the operator's judgment becomes part of the record instead of living in
  chat; rejected recommendations stop recurring as identical suggestions.
- CONSTITUTIONAL VALUE: closes the human-authority gap without creating a second
  decision mechanism; reuses the KnowledgePromoter precedent (human signal → event →
  ADD-only state).
- FAILURE MODE: decision events accepted without a principal or without referencing an
  existing recommendation → fabricated authority. Anonymous "accept" must fail closed.
- PROPOSED MINIMUM CHANGE: two event types, RECOMMENDATION_ACCEPTED /
  RECOMMENDATION_REJECTED, emitted only with `{recommendation_event_id, principal,
  reason}`; a POST route on mission_control that validates the referenced
  RECOMMENDATION_CREATED exists before emitting; decision stored as event payload plus
  ADD-only lifecycle fields on the recommendation row, never rewriting the recommendation.
- PROOF REQUIRED: fail-before test showing an accept without principal or without a
  valid recommendation_event_id is rejected; pass-after showing accepted recommendation
  drops out of a pending-recommendations view while the event chain replays identically.
- DEPENDENCIES: none (builds on existing event + route patterns).
- RISK: low; additive event types and one route; no provider, no outbound effect.
- STATUS: PROPOSED.
- Leverage: this is the load-bearing missing rung. Every downstream capability
  (authorization, execution, attribution, learning) depends on a decision existing as
  canonical history. It is also the smallest change: one event pair, one route, no
  external effects.

### CG-002: P1: Outcomes carry no attribution to the recommendation/decision that caused them

- PROBLEM: LEAD_CONVERTED, INVOICE_PAID, ESTIMATE_ACCEPTED, REVIEW_RESPONDED exist but
  carry no causal link to RECOMMENDATION_CREATED or any decision. PING can never answer
  "which recommendation produced this revenue."
- EVIDENCE: business_emitters.js leadConverted/project.completed payloads contain only
  ids, no causation fields; canonical_workers.js RecommendationWorker sets
  `evidence: [event.event_id]` forward, but nothing records the reverse link when an
  outcome arrives.
- USER VALUE: the operator learns which follow-up angles actually convert; the
  recommendation loop gets a feedback signal instead of open-loop suggestions.
- CONSTITUTIONAL VALUE: attribution is provenance, the system's core claim. Without it,
  any future "PING recommended → revenue" statement is unfalsifiable.
- FAILURE MODE: spurious attribution (linking outcomes to unrelated recommendations)
  manufactures false success stories. Attribution must be opt-in at decision time
  (the decision records the expected outcome type), not inferred after the fact.
- PROPOSED MINIMUM CHANGE: allow RECOMMENDATION_ACCEPTED (CG-001) payload to carry an
  optional `expected_outcome: {event_type}` field; when that outcome event arrives for
  the same subject, the bridge emits an OUTCOME_ATTRIBUTED event linking
  `{decision_event_id, outcome_event_id}` as a derived (not source) truth.
- PROOF REQUIRED: fail-before test showing two identical outcomes where only the
  decision-linked one emits OUTCOME_ATTRIBUTED; pass-after showing replay reproduces the
  same attribution.
- DEPENDENCIES: CG-001.
- RISK: low; derived event only, no mutation of source events.
- STATUS: PROPOSED.
- Leverage: converts the intelligence loop from open to closed at near-zero mechanism
  cost; it is the difference between "PING suggests things" and "PING knows what worked."

### CG-003: P1: No authorized-action lifecycle; nothing can gate an irreversible action

- PROBLEM: if a provider were ever wired, there is no AUTHORIZED → DISPATCHED →
  CONFIRMED/FAILED state. Lane D already recorded the gate rule (no effectful worker
  registers without authorize→ledger→dispatch→confirm) and judged the ledger unjustified
  because no effectful worker exists. The first genuinely effectful action (even a draft
  email handed to a human) should instantiate the minimal version of that rule.
- EVIDENCE: Lane D EXECUTION.md (lane-d-execution); zero ACTION_* event types in repo;
  email_integration.js / sms_integration.js are stubs with no ledger of any kind.
- USER VALUE: the operator gets a single place to see what PING was authorized to do,
  what it did, and what happened; this is the trust precondition for any automation.
- CONSTITUTIONAL VALUE: makes the effect boundary explicit and auditable instead of
  implicit in code paths; one authority for action state.
- FAILURE MODE: authorized actions without idempotency keys double-execute on retry.
  The ledger's primary key must be a deterministic idempotency key (mission_id +
  action type), enforced before any provider call.
- PROPOSED MINIMUM CHANGE: ACTION_AUTHORIZED / ACTION_EXECUTED / ACTION_FAILED event
  types with `{idempotency_key, principal, authorized_scope, provider_reference}`; a
  worker may call a delivery provider only after emitting ACTION_AUTHORIZED with a
  human principal; provider responses are recorded as ACTION_EXECUTED with the provider's
  message id. No provider wiring in this change.
- PROOF REQUIRED: fail-before test proving a second ACTION_AUTHORIZED with the same
  idempotency key is rejected (fail closed); pass-after showing the full
  authorized→executed→failed lifecycle replays deterministically.
- DEPENDENCIES: CG-001 (a human decision is the only legitimate authorizer).
- RISK: medium; this is the first mechanism that anticipates real external effects, so
  the idempotency and principal rules must be airtight before any provider is attached.
- STATUS: PROPOSED.
- Leverage: one small lifecycle buys the entire future action surface its safety
  properties; without it, any later provider wiring is an unguarded irreversible path.

### CG-004: P2: Review-response loop has no draft with provenance (MODEL SUGGESTED rung)

- PROBLEM: the smallest evidenced outreach loop (review → recommendation → human decision
  → REVIEW_RESPONDED, section 2) works, but if a model ever drafts the response there is
  no event representing the draft. An undocumented draft cannot be approved, diffed, or
  audited; the human would paste text with no record of what the model proposed.
- EVIDENCE: test_business_emitters.js shows REVIEW_RESPONDED carrying only review_id +
  response text; no draft event type exists; IntelligenceWorker (dormant) shows the
  intended AI-backed recommendation slot.
- USER VALUE: the operator gets AI-drafted review replies they can approve/edit with one
  tap, and the record shows exactly what the model wrote versus what was sent.
- CONSTITUTIONAL VALUE: separates model output (derived, unverified) from human-sent
  content (authorized) as distinct events; the draft is evidence, never the send.
- FAILURE MODE: a draft mistaken for an authorized send. The draft event must be
  structurally incapable of causing delivery: no provider fields, no recipient address
  resolved, and the route that records REVIEW_RESPONDED must require a human principal.
- PROPOSED MINIMUM CHANGE: REVIEW_RESPONSE_DRAFTED event with `{review_event_id, draft_text,
  model_version, prompt_hash, input_event_ids}`; emitted only from a worker, never from
  the dashboard route; REVIEW_RESPONDED recording requires a human principal and may
  reference the draft it was based on.
- PROOF REQUIRED: fail-before test showing REVIEW_RESPONDED without a human principal is
  rejected; pass-after showing draft → edited → responded chain with full provenance in
  replay.
- DEPENDENCIES: CG-001 (decision/principal machinery).
- RISK: low; no delivery involved, draft is inert data.
- STATUS: PROPOSED.
- Leverage: instantiates the MODEL SUGGESTED rung in the cheapest possible place (one
  inert event type) and establishes the draft-vs-send separation that all future
  AI-generated content must obey.

### CG-005: P2: No consent or suppression representation for recipients

- PROBLEM: outbound messaging without recorded consent is both a legal and trust
  hazard. The system holds customer identities (customer_authority.js) but no consent
  state; there is no suppression concept anywhere in runtime code.
- EVIDENCE: grep for consent/suppress/unsubscribe/opt-in across ping-runtime, runtime,
  gateway returns only oauth_provider.js (OAuth consent, unrelated).
- USER VALUE: the operator cannot accidentally message someone who opted out; every
  outbound action can show its consent basis on demand.
- CONSTITUTIONAL VALUE: consent is a precondition on authority; recording it as events
  makes the precondition auditable instead of assumed.
- FAILURE MODE: consent inferred from "existing customer" without an explicit grant.
  Consent events must record source and timestamp of the grant, and absence of a grant
  must fail closed (no send).
- PROPOSED MINIMUM CHANGE: CONSENT_GRANTED / CONSENT_REVOKED events with
  `{subject_id, channel, source, granted_at}`; the future action gate (CG-003) checks
  for an unrevoked grant before authorizing channel-specific actions.
- PROOF REQUIRED: fail-before test showing an authorized email action without a consent
  grant is rejected by the gate; pass-after showing revoke blocks a previously allowed
  action.
- DEPENDENCIES: CG-003 (the gate that reads consent).
- RISK: low; pure event types, no behavior change until the gate exists.
- STATUS: PROPOSED.
- Leverage: small now, load-bearing later; consent must exist BEFORE any provider is
  wired, not after the first complaint.

### CG-006: P3: Send layer has no idempotency; stub integrations cannot become real safely

- PROBLEM: EmailIntegration/SmsIntegration keep in-memory "sent" arrays; sync() maps
  them to EMAIL_SENT events. There is no idempotency key, no provider message id, no
  persistence. Wiring a real SMTP/Twilio provider onto this seam would double-deliver
  on retry (the exact failure mode the convergence work just closed for event identity).
- EVIDENCE: email_integration.js send() returns `{status:'queued'}` from memory;
  email_connector.js:41-50 events() derives EMAIL_SENT from that array; no persistence,
  no dedup.
- USER VALUE: none directly; this is the precondition for the operator ever trusting
  PING to send anything.
- CONSTITUTIONAL VALUE: exactly-once external effects are the counterpart of the
  exactly-once event identity just proven at HEAD 1995f0a59; the send seam must not be
  weaker than the event seam.
- FAILURE MODE: provider wired without idempotent send → duplicate customer messages on
  worker retry. Any provider wiring must come through CG-003's idempotency-keyed ledger.
- PROPOSED MINIMUM CHANGE: none yet; this item is a constraint record. When a provider
  is authorized (decision inbox Q3), the integration must persist sends with the
  idempotency key from CG-003 and reconcile provider message ids into ACTION_EXECUTED
  before emitting EMAIL_SENT/SMS_SENT.
- PROOF REQUIRED: (deferred to provider wiring) duplicate send() calls with the same
  idempotency key produce one provider message and one EMAIL_SENT.
- DEPENDENCIES: CG-003, and the operator decision in the inbox.
- RISK: high if done wrong; zero if left as stubs.
- STATUS: PROPOSED (constraint only; do not implement).
- Leverage: records the hazard now so a future "just wire Twilio" moment cannot skip
  the idempotency requirement; the mechanism itself waits for the operator's call.

### CG-007: P4: No proposition object (offer content + terms + approval as one unit)

- PROBLEM: there is no representation of "what PING proposes to the customer": no offer
  text, no terms, no expiry, no approval binding it to a decision. Recommendation.action
  is a static string ("Follow up on estimate"), not a proposition a human could approve
  or a customer could receive.
- EVIDENCE: zero business-sense hits for proposition/offer/template; mission_control.js
  /business/marketing produces action suggestions (case_study, testimonial_request,
  nurture_sequence) as ephemeral JSON, not persisted objects.
- USER VALUE: the operator could review and approve actual customer-facing content
  inside PING instead of drafting it elsewhere and losing the record.
- CONSTITUTIONAL VALUE: a proposition is the business analog of a constitutional object:
  immutable once approved, with content hash, approver, and expiry. (Note the existing
  proposal_quarantine pattern for code proposals is the structural precedent, but it
  must NOT be reused directly: it is scoped to code/architecture proposals. Do not
  create a duplicate concept by overloading it; the business proposition is a new,
  distinct concept if it is ever built.)
- FAILURE MODE: propositions that mutate after approval → customer receives something
  different from what was approved. Approval must freeze the content hash.
- PROPOSED MINIMUM CHANGE: deferred; depends on CG-001 through CG-004 proving the
  decision and draft machinery first. Smallest eventual shape: PROPOSITION_CREATED with
  `{content_hash, content, terms, expires_at}`, approved only via the CG-001 decision
  path with the hash referenced.
- PROOF REQUIRED: (deferred) approval referencing a hash that no longer matches the
  content is rejected.
- DEPENDENCIES: CG-001, CG-004.
- RISK: medium; this is the largest concept here and must not be built until the
  decision and draft layers are proven.
- STATUS: PROPOSED (deferred; do not build before CG-001..CG-004).
- Leverage: deliberately last; propositions are the payoff of the whole ladder, and
  building them before the decision/authorization rungs exist would create an
  unauditable marketing object, which is worse than having none.

Priority rationale: CG-001 is the only P0 because every other item is either a consumer
of the decision event (CG-002, CG-003, CG-004), a precondition that must precede provider
wiring but has no user value alone (CG-005, CG-006), or the payoff that must wait for
the rungs beneath it (CG-007). Nothing here duplicates an existing concept: the audit
verified that no decision, authorization, consent, draft, attribution, or proposition
mechanism exists in runtime code today.

---

## 5. DECISION INBOX

Genuine human-intent questions. Nothing here can be resolved from the repo; each names
the default safe action if unanswered.

### Q1. Who is the human decider for business recommendations?

- QUESTION: when a recommendation needs a human decision (CG-001), whose principal is
  recorded: Nolan as PING operator, or each tenant's business owner?
- WHY: the principal determines who can authorize actions and whose consent basis
  applies. A single-operator model is simple; a per-tenant model is the real product.
- EVIDENCE: today there is no principal anywhere in the business path; the only
  human-linked events are knowledge-graph approvals with no principal field either.
- DEFAULT SAFE ACTION: record the acting principal as the PING operator (Nolan) until a
  per-tenant principal model is designed. Do not invent tenant principals.
- WHAT CHANGES: CG-001's principal validation and every later authorization check.
- URGENCY: needed before CG-001 is implemented; blocking for the whole ladder.

### Q2. May PING ever send an outbound message without an explicit per-message human authorization?

- QUESTION: is autonomous outbound messaging (email/SMS/review reply sent by PING
  without a human approving that specific message) ever acceptable, or is human
  authorization required for every send?
- WHY: this is the channel-safety line. The current stubs make the question moot, but
  CG-003's authorization gate must encode the answer, and the answer changes the gate's
  design (human-principal-required vs policy-based authorization).
- EVIDENCE: no autonomous sending exists; even the stubs only queue in memory.
- DEFAULT SAFE ACTION: explicit human authorization per message, always. No autonomous
  outbound, no policy-based exceptions, until the operator says otherwise in writing.
- WHAT CHANGES: the authorization model in CG-003 and whether any future provider
  wiring is even pursued.
- URGENCY: needed before CG-003 is designed; not blocking for CG-001/CG-002.

### Q3. Is wiring a real email/SMS provider authorized, and which one?

- QUESTION: should the P054 stubs be replaced with a real provider (Gmail API for
  email, Twilio for SMS, or other), and if so, which credentials and whose account?
- WHY: provider wiring is the first irreversible external effect in PING's history; it
  crosses the boundary from intelligence system to actor. It needs the operator's word,
  not an agent's judgment.
- EVIDENCE: email_integration.js and sms_integration.js are explicitly labeled stubs
  awaiting configuration; nothing in the repo selects a provider.
- DEFAULT SAFE ACTION: keep the stubs. No provider wiring, no credential collection.
- WHAT CHANGES: CG-006 moves from constraint record to implementation; CG-003's ledger
  gets its first real provider.
- URGENCY: not blocking; the entire ladder through CG-005 is provider-independent.

### Q4. What counts as consent evidence for outbound outreach?

- QUESTION: for the existing-relationship channels (a lead who submitted a form, a
  customer with a project), what constitutes a consent grant that PING may rely on, and
  how is revocation observed?
- WHY: CG-005's consent events need a real-world grant source; without the operator's
  definition, the events would encode guesses.
- EVIDENCE: no consent concept exists; customer records carry contact info with no
  grant metadata.
- DEFAULT SAFE ACTION: no outbound to any recipient without an explicit recorded
  grant; "existing customer" alone is not consent. Fail closed.
- WHAT CHANGES: the consent event schema and the sources that may emit CONSENT_GRANTED.
- URGENCY: needed before CG-005 is implemented; not blocking for CG-001/CG-002.

---

## 6. Notes for the parent

- No worktree files were read-modified; all reads via pigwsl-run.sh against HEAD
  1995f0a59. Lane dir used for output only.
- Two adjacent human-review mechanisms exist (knowledge_promoter.js for knowledge,
  proposal_pipeline.js + proposal_admission.js for code proposals). Neither covers
  business recommendations; do not merge them into one "review system." The
  recommendation decision (CG-001) is a third, business-scoped concept, deliberately
  separate.
- The dormant IntelligenceWorker is the natural home for the MODEL SUGGESTED rung
  (CG-004) when it is re-enabled; its CLASSIFICATION_CREATED/RECOMMENDATION_CREATED
  dual-emit contract is already specified in its header.
- The mission_control.js business routes are the read model the decision UI would
  extend; they already implement the "pending" semantics (unanswered reviews, open
  leads, stalled estimates) that a decision lifecycle would consume.
- No contradictions with other lanes were found. Lane D's effect-ledger gate rule is
  consistent with CG-003 and is cited rather than redefined.
