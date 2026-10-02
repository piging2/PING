# CORE INTERROGATION — INVESTIGATOR F (MarketingOS): Q15–Q19

Reader/falsifier only. Nothing built. No subsystem proposed. Method per question:
QUESTION → CURRENT CLAIM → REACHED PATH → EVIDENCE → COUNTEREVIDENCE → VERDICT → SMALLEST CONSEQUENCE,
then the mandatory "what observation would prove this answer wrong?"

Evidence is live unless marked otherwise. "We plan to" is treated as counterevidence, not evidence.
All Postgres reads below were done 2026-09-30 ~14:30–15:00 MDT against the live Pig journal
(`brain-postgres`, database `ping_runtime`, schema `public`) via the read-only role pattern
(`PGOPTIONS=-c default_transaction_read_only=on`); zero writes made.

Prior forensic base (re-verified where load-bearing, not re-argued):
- `~/workspace/forensics/ping-intelligence-convergence-2026-09-30/05-engine-mapping.md` (L5)
- `~/workspace/forensics/ping-intelligence-convergence-2026-09-30/06-convergence-map.md` (L6)
- `~/workspace/forensics/ping-intelligence-convergence-2026-09-30/07-operating-spec-proposals.md`
- `~/workspace/goals/ping-agent-execution-stack/files/MARKETINGOS-AUDIENCE-INTELLIGENCE-2026-09-30.md`
- `~/workspace/goals/ping-agent-execution-stack/files/MARKETINGOS-INTELLIGENCE-COMPOUNDING-2026-09-30.md`
- `~/workspace/goals/ping-agent-execution-stack/files/MARKETINGOS-ARCHAEOLOGY-SYNTHESIS.md`
- `~/workspace/goals/ping-agent-execution-stack/files/MARKETINGOS-PROJECTION-CONTRACT.md`
- `~/workspace/marketing-os/GROWTH-OS.md` (CONVERGED 2026-09-30, plan status)

---

## Q15. Does MarketingOS actually need seven engines?

**QUESTION:** Take Signal, Audience, Opportunity, Content Memory, Experiment, Distribution, Learning;
strip the names. Reduce each to input records, computation, output records, authority involved,
durable residue. If two engines are different computations over the same canonical machinery,
they are domain vocabulary, not runtime architecture.

**CURRENT CLAIM (charter):** "The existing forensic mapping already strongly suggests exactly this:
those engines map onto existing PING machinery rather than requiring new services or authorities."

**REACHED PATH:** L5 engine-mapping report (read in full) → verified its load-bearing greps against
the live Pig worktree `/home/nolan/ping` (branch lane-b/tenant-dispatch-threading) → live DB row
census for the durable homes each engine supposedly writes to.

**EVIDENCE:**

Per-engine reduction (inputs / computation / outputs / authority / durable residue):

| Engine | Input records | Computation | Output records | Authority | Durable residue |
|---|---|---|---|---|---|
| 1 Signal | `OBSERVATION_CREATED` events, raw metric rows | normalize + classify observations into typed signal payloads (`kind='signal:<TAXONOMY>'`) | signal payloads in canonical events | CanonicalizationService (ingress) + EvidenceAuthority (attachment); NO SignalAuthority — grep zero hits, confirmed live | `ping_events` payloads |
| 2 Audience Graph | behavioral observations, engagement events | cluster computation over `knowledge_nodes` | `entity_type='audience_cluster'` candidate rows + overlap edges | KnowledgePromoter + EvidenceAuthority; NO AudienceAuthority — grep zero hits | `knowledge_nodes` / edges (currently ZERO rows — see Q17) |
| 3 Opportunity | demand observations, audience clusters | score = f(demand, growth, acceleration, competition, audience_fit, ping_relevance, evidence_quality, freshness) | `entity_type='opportunity'` rows with score breakdown | NONE BY DESIGN (score is recommendation, never authority) | `knowledge_nodes` (currently ZERO rows — see Q18) |
| 4 Content Memory | media/transcripts, published-post metrics | transcript extraction, semantic indexing, lineage linking | `Artifact` canonical objects, Qdrant vectors, `LINEAGE_CREATED` edges | EvidenceAuthority (verification); NO ContentAuthority — grep zero hits | Qdrant vectors + `knowledge_nodes` + `ping_events` |
| 5 Experiment | hypothesis + window + metrics | run mission, record outcome, assign verdict | mission `result` JSONB, verdict payload states | MissionRuntime; NO ExperimentAuthority — grep zero hits | `ping_missions` rows (currently ZERO `EXPERIMENT_RUN` rows) |
| 6 Distribution | approved artifact, channel, slot | connector dispatch through typed capability registry | provider receipts in mission `result`, metric rows as `OBSERVATION_CREATED` | `authorizeWorkOrder` + ORCA policy + operator (Nolan); NO DistributionAuthority — grep zero hits | `ping_events` + `ping_missions` |
| 7 Learning | experiment outcomes, approval events | promotion candidate→approved/rejected, confidence updates | `entity_type='learning'` / `'playbook_rule'` rows | KnowledgePromoter + EvidenceAuthority; NO LearningAuthority — grep zero hits, plan forbids one | `knowledge_nodes` (currently ZERO rows) |

Reduction facts:
- All seven engines' durable outputs reduce to the same four homes: `ping_events`, `ping_missions`,
  `knowledge_nodes`/`knowledge_edges`, Qdrant vectors. Live DB census: `ping_missions` holds
  mission types {CLAIM_GENERATE 92, CLASSIFICATION_CREATE 67, LINEAGE_CREATE 66, PROJECTION_CREATE 68,
  RECOMMENDATION_CREATE 66, REPLAY_VERIFY 68, WITNESS_CREATE 68, INTELLIGENCE_RESEARCH 2, ...} —
  zero `EXPERIMENT_RUN`, zero `DISTRIBUTION_RUN`. `knowledge_nodes` holds only `node_type='event'`
  (233 candidate, 8 rejected); zero audience_cluster/opportunity/learning rows.
- No engine exists as a runtime service, class, or table anywhere in `ping-runtime`/`gateway`
  (live grep 2026-09-30; corroborated by L5). The engine names live only in the GROWTH-OS plan document.
- Mission labels `INTELLIGENCE_RESEARCH` / `EXPERIMENT_RUN` / `DISTRIBUTION_RUN` exist in code only as
  string literals inside `ping-runtime/analysis/claim_chaining.js` (the chaining rule); no worker
  declares them in `eventTypes`, so the scheduler cannot dispatch them (DB confirms the follow-up
  mission sits `created`/unclaimed — see Q19).
- The computations genuinely differ (normalization vs clustering vs scoring vs indexing vs
  verdicting vs dispatching vs promoting) but the authority and durability substrate is identical.

**COUNTEREVIDENCE (hostile):**
- Distribution and Content Memory touch genuinely different I/O surfaces (external platform
  connectors; Qdrant vector projection). Those are external capabilities and a projection store,
  not new internal authorities — the distinction survives, but a purist could argue the engine
  names earn their keep as *worker-behavior* boundaries rather than pure vocabulary.
- Sufficiency is unproven in the strong sense: only one INTELLIGENCE_RESEARCH mission has ever run
  and no distribution or experiment has run through PING machinery, so "existing machinery is
  sufficient" is a design-mapping claim, not a runtime-proven one.

**VERDICT: PROVEN.** The seven engines are seven different computations plus mission-template
labels and projection vocabularies over one canonical spine (five authorities, four durable homes).
They are not seven runtime services, stores, or authorities, and none is required to be one.
The plan itself (GROWTH-OS.md, CONVERGED) now states this.

**SMALLEST CONSEQUENCE:** None. No engine needs building as a service/authority/store. The names may
be kept as domain vocabulary for mission templates and projections.

**What observation would prove this answer wrong?** Discovery of any MarketingOS-owned durable write
or decision authority outside the five authorities / four homes — e.g. a `marketing_signals` table,
a `SignalAuthority` class with live callers, or a running process named for an engine that mints
spend/publish/approve rights. Alternatively, proof that one engine's computation *cannot* be
expressed over existing primitives (e.g. distribution provably requiring a new spend authority).

---

## Q16. Can MarketingOS discover that its own strategy is wrong?

**QUESTION:** Construct technically excellent content with weak qualified response; mediocre-looking
content with strong response; high reach wrong audience; low reach extraordinary target response.
Does the system distinguish reach / engagement / qualified engagement / audience fit / technical
credibility / conversion intent / business outcome? Does the experiment vocabulary (hypothesis,
deliberate variable, SUPPORTED/FALSIFIED/INCONCLUSIVE, observation window, guardrails) have
machinery behind it or is it only documentation?

**CURRENT CLAIM (charter + audience directive):** MarketingOS can be built to prefer information gain
over virality, with a four-layer measurement (exposure quality → response quality → durable
acquisition → knowledge gained) and an experiment contract (hypothesis, deliberate variable,
observation window, SUPPORTED/FALSIFIED/INCONCLUSIVE).

**REACHED PATH:** Audience Intelligence directive (binding, read verbatim) → Projection Contract
v1 (read verbatim) → live code grep for the experiment vocabulary → live DB census for any
experiment/metric/audience rows → MC served-route behavior per archaeology.

**EVIDENCE:**

1. The *distinction vocabulary* exists only as binding directive text, not machinery. The audience
   directive defines exposure quality, response quality (cheap vs expensive signals: like < save <
   technically specific comment < repo inspection < correction with reproducible evidence),
   durable-audience acquisition, and information gain, plus the contract lines
   ENGAGEMENT ≠ TRUTH, VIRALITY ≠ AUDIENCE FIT, CORRELATION ≠ CAUSATION, NO SIGNAL YET ≠ FAILURE,
   AUDIENCE METRIC ≠ PUBLISH AUTHORITY. These are law, not code.
2. Live code grep: `qualified_engagement` / `qualifiedEngagement` = ZERO hits anywhere in
   `ping-runtime`/`gateway` (excluding node_modules). No code distinguishes any of the seven
   quantities in the question.
3. Live DB: zero metric observations from any platform; zero `EXPERIMENT_RUN` missions; zero
   audience/opportunity/learning `knowledge_nodes` rows. There is literally no data on which to
   distinguish reach from qualified engagement today.
4. The experiment *vocabulary* is landed in code: `SUPPORTED`/`FALSIFIED`/`INCONCLUSIVE` literals
   exist in `ping-runtime/analysis/claim_chaining.js` and `contradiction_detection.js` (forensics-fix
   landing). `MissionRuntime` (`mission_runtime.js:30-56`) can hold experiment design in `payload`
   JSONB and outcome in `result` JSONB with terminal completed/failed. So the record machinery for
   an experiment verdict exists.
5. But no experiment has ever executed the full loop: hypothesis → declared window → distribution →
   metric observations → outcome → verdict → learning → next experiment. The MC projection renders
   audience/opportunity/learning as NOT_STARTED with machine-readable reasons (second-eyes verified
   2026-09-30), and `effect`/`outcome` fields carry PENDING `OBSERVATION_WINDOW_OPEN` only when a
   distribution exists — none does.

**COUNTEREVIDENCE (hostile):**
- The verdict literals and mission result columns are real code, not prose — so "only documentation"
  would be too strong. The record-keeping half of the experiment contract has machinery.
- The four test cases in the question (excellent/weak, mediocre/strong, high-reach/wrong-audience,
  low-reach/right-audience) are all *representable* as observation payloads + evidence packets under
  the existing schema; nothing in PING forbids recording them. Representability is not capability.

**VERDICT: PARTIAL.** The strategy-skepticism doctrine and the verdict record machinery exist; the
feedback loop that would actually surface "our strategy is wrong" has never run. MarketingOS today
cannot distinguish reach from qualified engagement because it has zero observations to distinguish
on and zero completed experiments. The vocabulary has machinery behind it at the record level;
the loop-level capability is untested.

**SMALLEST CONSEQUENCE:** None new. Nolan's audience directive already orders the FIRST REAL TEST
(one artifact, one declared hypothesis, one variable, one window, evidence-backed assessments).
Until that runs, any claim that MarketingOS "discovers" strategy errors is aspirational.

**What observation would prove this answer wrong?** Either direction. (a) An `EXPERIMENT_RUN` mission
row with a SUPPORTED/FALSIFIED verdict plus a `learning` knowledge node that changed the *next*
experiment's deliberate variable, all with canonical correlation lineage — would upgrade PARTIAL
toward PROVEN. (b) Evidence that verdict payloads cannot reach the promoter (schema rejection,
verdict-class admission blocking them) — would push PARTIAL toward FALSIFIED.

---

## Q17. Can the Audience Graph survive contradictory identity evidence?

**QUESTION:** One person in several clusters; anonymous identity later known; two apparently identical
identities different people. Is stitching reversible and evidence-linked? Is anything merging merely
because embeddings are close?

**CURRENT CLAIM (charter + GROWTH-OS §2.2/§9.5):** "No silent merges: PING has no merge/dedupe logic,
so 'one person in many clusters' is naturally representable. Anonymous-to-known stitching is a
bounded analysis behavior over knowledge_nodes (evidence-linked edges), not an authority."

**REACHED PATH:** GROWTH-OS.md §2.2 and §5 (plan text) → live grep for every stitch/merge/identity
primitive in `/home/nolan/ping` (ping-runtime, gateway, runtime) → live DB census of
`knowledge_nodes` by node_type.

**EVIDENCE:**

1. There is no audience graph. Live DB: zero `knowledge_nodes` rows with `node_type='audience_cluster'`
   or `entity_type='audience_cluster'`. Nothing to put under contradiction.
2. No stitching code exists. Live grep: `mergeIdentity` = none; `identity_stitch`/`IdentityStitch` =
   none; `AudienceCluster`/`audience_cluster` = none; `dedupe` = only in test files and
   `claim_chaining.js` (event dedup, not identity); `resolveIdentity` = one hit in
   `gateway/social_ingest_adapter.js`, which resolves a *cryptographic signer identity* from an SPKI
   public key (`OBJECT_CREATED` with schema `ping.identity@1`) — unrelated to audience identity.
3. No merge/dedupe/resolve logic exists anywhere in PING (L5 grep, corroborated live). Consequence:
   nothing *can* merge merely because embeddings are close — there is no code path that merges
   entities on any similarity basis. The Qdrant semantic projection (`embedding_service.js:132`)
   writes vectors; no consumer reads vector proximity to merge knowledge entities.
4. The design doctrine (GROWTH-OS §2.2, §9.5) requires: clusters-not-personas, overlap recorded as
   relationship edges never flattened, no silent merges, anonymous-to-known stitching as a *bounded
   analysis behavior* with evidence-linked edges, "never an identity authority."

**COUNTEREVIDENCE (hostile):**
- The absence of merge machinery is a double-edged fact: it guarantees no *destructive* merge, but
  it also means contradictory identity evidence has no handling at all. Anonymous→known cannot be
  linked; two identical-looking identities cannot be resolved; they simply sit as unrelated candidate
  nodes with no edges. The system "survives" contradiction only by being unable to represent
  identity linkage — that is not the same as surviving it well.
- The projection contract's parenthetical "(identity stitching + transcript-accuracy designed, not
  landed)" refers to the §9.5 plan description; no separate design document for stitching was found.
  "Designed" here means "specified as a bounded behavior in the plan," not "designed in code."

**VERDICT: UNKNOWN.** There is no audience graph and no stitching behavior, so the question has no
testable instance. The no-merge design guarantees nothing merges on embedding closeness (verified by
absence of any merge code path), which is honest UNKNOWN-preservation by default — but reversible,
evidence-linked stitching is undesigned and unbuilt, and the plan's "designed, not landed" claim
reduces to a paragraph in GROWTH-OS §9.5.

**SMALLEST CONSEQUENCE:** None. Stitching stays a bounded future behavior. When audience clusters are
first created, they must carry evidence links per the existing doctrine (already in the plan).

**What observation would prove this answer wrong?** (a) A landed, tested stitching behavior that
reversibly links anonymous→known identity with evidence-linked edges and an un-stitch path —
would move UNKNOWN toward answered. (b) Discovery of an existing code path that merges audience
entities on embedding similarity without evidence — would falsify "never merge merely because
embeddings are close."

---

## Q18. Can an opportunity score explain itself?

**QUESTION:** Is every ranking decomposable into observations and counterevidence? What would have to
be true for an opportunity to be bad? What evidence would reverse the ranking? Which input is
weakest/stalest/from vendor claims?

**CURRENT CLAIM (charter + GROWTH-OS §2.3):** OpportunityScore is a recommendation, never an
authority; scoring decomposes into demand, growth, acceleration, competition, audience_fit,
PING_relevance, evidence_quality, freshness; `EvidenceAuthority.rank` is the existing "rank things
with evidence" primitive.

**REACHED PATH:** GROWTH-OS §2.3 → live grep for opportunity/Assessment scoring in ping-runtime/gateway
→ live DB census for opportunity rows → projection contract's opportunity field spec → the actual
claim records from mission 78c88729ceb51f38 (the closest existing scored/graded artifact).

**EVIDENCE:**

1. No opportunity score has ever been produced in PING. Live DB: zero `knowledge_nodes` rows of
   type opportunity; no Assessment rows for content. `opportunity` code hits in ping-runtime/gateway
   are unrelated (constitutional technology evaluator, gap analysis). The MC projection renders
   opportunity as UNKNOWN (`NO_VERIFIED_DEMAND_OBSERVATIONS`) — the contract's honest state.
2. The score-breakdown fields (demand, acceleration, audience_fit, ping_relevance, evidence_quality,
   freshness, novelty, information_gain) exist only in the Projection Contract §4 as a doctrine for
   `Assessment` records. No code computes them.
3. The closest existing machinery — claim records — shows the decomposability pattern AND its limit.
   The four live claims from mission 78c88729ceb51f38 each carry `text`, `verdict`,
   `evidence {method, counts, observation_event_ids}`, `synthesis_tag`, `upstreamEventId` linkage.
   But there is NO structured counterevidence field anywhere: grep of `claim_chaining.js` for
   counterevidence/missing_evidence = zero hits; the follow-up mission's payload carries the UNCLEAR
   claim's `unclear_reason` as prose *inside* `evidence`, not as a first-class counterevidence set.
4. Demand sensors (the inputs a score would need) are UNKNOWN by the plan's own marking: Google
   Trends API alpha, Exploding Topics API — "GROWTH-OS marks UNKNOWN," pending the §6.3 training
   mission. The weakest/stalest/vendor-claim inputs are therefore: all of them — no independent
   demand observation exists yet. The evidence-grade vocabulary (vendor-described / independent /
   unreplicated, GROWTH-OS §6.1) is the doctrine for grading them when they arrive.

**COUNTEREVIDENCE (hostile):**
- `EvidenceAuthority.rank` (score = confidence × provenance) is a real, wired "rank with evidence"
  primitive, and the claim drill-down (claim → support set → source/evidence → verdict) is a real
  canonical pattern the projection contract requires. So an explainable score is *composable* from
  existing parts — the doctrine is not fantasy.
- But composability is not existence. No score, no decomposition, no reversal case has ever occurred.

**VERDICT: NOT-REACHED.** Opportunity scoring has never been attempted in PING — zero rows, zero
scoring code, zero demand-sensor observations. The explainability doctrine (score breakdown fields,
claim drill-down, evidence grades) is documentation awaiting its first instance. The sub-questions
("what would make this opportunity bad," "which input is weakest") cannot be answered from evidence
because there is no ranking to interrogate.

**SMALLEST CONSEQUENCE:** None new. The Projection Contract already fires UNKNOWN
(`NO_VERIFIED_DEMAND_OBSERVATIONS`) until verified demand observations exist; the first real
Assessment must cite its inputs or that state holds. No machinery to build.

**What observation would prove this answer wrong?** A real opportunity Assessment/`knowledge_nodes`
row whose score breakdown cites its observation and counterevidence inputs by event ID, plus a
documented reversal where new counterevidence flipped a ranking. That would move NOT-REACHED to
an answered question about that instance. (A score produced *without* evidence citations would
instead falsify the doctrine.)

---

## Q19. Can research recursively improve its questions?

**QUESTION:** For INTELLIGENCE_RESEARCH mission 78c88729ceb51f38: which questions answered, partially
answered, refuted, contradictions, which UNKNOWNs matter, which next question has highest expected
information value? Is next-question chaining implemented or merely described?

**CURRENT CLAIM (charter):** "The forensic work identifies next-question chaining as a bounded missing
behavior, not missing infrastructure."

**REACHED PATH:** Live DB read of `ping_missions` rows 78c88729ceb51f38 and 3b0f430a06a41357
(payload, status, timestamps, assigned_to) → live read of all four `CLAIM_CREATED` events from the
mission (full payloads) → `ping-runtime/analysis/claim_chaining.js` source (the chaining rule).

**EVIDENCE:**

Mission 78c88729ceb51f38 (INTELLIGENCE_RESEARCH, tenant ping-ops, assigned to
`writer-m-research-worker`, created 2026-09-30 18:14:50.97 UTC, completed 18:14:51.03 UTC):

- **Questions asked (3, from payload):** (1) Is the Pig journal the live event plane and when was its
  last production write? (2) What is the Lane L tenant-backfill state of ping_events after the merged
  line initialize()? (3) Did any INTELLIGENCE_RESEARCH mission exist in the journal before this run?
- **Answered: 3/3 — all CONFIRMED.** Claim e06fd96d: "The Pig journal is the live event plane and it
  accepted this mission's writes" (evidence: direct SQL readback, 2568 events before, 2574 after).
  Claim dd01af37: "every ping_events row carries the Lane L tenant backfill value" (evidence:
  null_tenant_id_rows = 0). Claim a660e2e4: "No INTELLIGENCE_RESEARCH mission existed before this
  run" (evidence: prior_ir_count = 0).
- **Partially answered: 0. Refuted: 0. Contradictions surfaced: 0** (ContradictionDetector saw 4
  claims, surfaced 0 — per archaeology; no conflicting claim pair existed to surface).
- **The UNKNOWN that matters:** claim 04dec8de (UNCLEAR): "MarketingOS projection falsification test
  1 is fully satisfied: this mission state was supplied AND the view renders it." Unclear_reason:
  state-supply half confirmed by readback; rendering half unobservable because the MC writer had not
  implemented the view (projection contract §§8, 10). This is the one material UNKNOWN — it is the
  product-boundary question (can the projection render real mission state?), not a data question.
- **Next-question chaining is IMPLEMENTED and FIRED, not merely described.**
  `ping-runtime/analysis/claim_chaining.js` (forensics-fix, landed 2026-09-30): subscribes to
  `CLAIM_CREATED`, skips settled verdicts (CONFIRMED/SUPPORTED), proposes the next mission via
  `MissionRuntime.create()` with `correlation_id` = parent mission and `causation_id` = the claim
  event. DB proof: mission 3b0f430a06a41357 exists, `mission_type='INTELLIGENCE_RESEARCH'`,
  payload carries the full UNCLEAR claim + `research.questions = ["Is the following claim true?
  <claim text>"]` + `claims_to_verify[]` + `evidence_requirements` + `causation_id` =
  `04dec8deefdfb870afd0af2bec149fc9d2141d47c5d612a2da7ccbf6d815cec6`.
- **But the recursion is stalled at resolution.** Mission 3b0f430a06a41357 sits in status `created`,
  unclaimed (`assigned_to` null, `started_at` null). Per the chainer's own comment, "the scheduler
  skips mission types with no registered worker, so nothing executes until a research worker
  declares the label" — no worker declares INTELLIGENCE_RESEARCH in `eventTypes`. The UNCLEAR is
  now potentially resolvable (archaeology: the rendering half was since proven by the 8/8
  served-route battery), but no resolution has been recorded.
- **Highest expected information value next question:** "Does the served MC view now render this
  mission's state (falsification-test-1)?" — i.e., claim mission 3b0f430a06a41357 and re-run the
  rendering check. It is the single question whose answer moves an UNCLEAR product-boundary verdict;
  all other claims are settled CONFIRMED.
- Honesty note: the question→claim→verdict leg of *this* run was human-executed
  (`writer-m-research-worker`, direct SQL readback as evidence method, ~60ms mission). The machine's
  demonstrated contribution is the chaining rule + mission machinery, not autonomous research.
  Also: claims carry evidence but no structured counterevidence/missing-evidence fields (see Q18) —
  the compounding directive's "record old confidence, missing evidence, new observation, new verdict,
  confidence delta" has not been demonstrated.

**COUNTEREVIDENCE (hostile):**
- The chainer fired exactly once on exactly one mission. "Implemented" rests on one sample; the
  settled-verdict skip logic (CONFIRMED/SUPPORTED don't chain) has never been exercised against a
  REFUTED/FALSIFIED claim, and idempotency-on-replay is asserted in comments, not observed.
- The follow-up mission's `evidence_requirements` says "every verdict needs evidence URLs," but the
  actual evidence in this run was direct SQL readback with no URLs — the template's own requirement
  was not met by its first instance.
- Recursion that stalls at the second step is arguably "described with one demonstration," not a
  proven loop.

**VERDICT: PARTIAL.** Next-question chaining is implemented in code and proven to fire (UNCLEAR claim
→ follow-up mission with causal lineage, in the live journal). The recursive loop is NOT proven:
the follow-up mission is unclaimed, no verdict transition (UNCLEAR→CONFIRMED/REFUTED) has ever been
recorded, and the human executed the research leg this run.

**SMALLEST CONSEQUENCE:** None new. The archaeology's top-ten already lists the exact next step as
delta #1: claim mission 3b0f430a06a41357 via the existing WorkerRuntime path with the minimal
payload, and record the verdict transition. No new machinery.

**What observation would prove this answer wrong?** (a) Mission 3b0f430a06a41357 claimed and
completed with a CONFIRMED/REFUTED verdict on the same claim event, plus the verdict delta recorded
as a new claim event — would upgrade PARTIAL toward PROVEN recursion. (b) Proof that follow-up
missions can never be claimed by any worker (e.g., the scheduler permanently skips the label and no
worker may declare it) — would falsify the recursion claim and push toward FALSIFIED.

---

## Cross-cutting notes (not proposals)

1. **The dominant pattern across Q16–Q18:** doctrine and vocabulary are landed (in binding directives,
   the projection contract, and increasingly in code literals), while *execution* of the
   MarketingOS loop is at exactly one INTELLIGENCE_RESEARCH mission, zero experiments, zero
   distributions, zero audience/opportunity/learning rows. The system is honest about this (MC
   renders NOT_STARTED/UNKNOWN with reasons), which is the epistemically correct state — but it
   means every "can MarketingOS X?" question except Q15 and the chaining half of Q19 answers at
   best PARTIAL.
2. **Claim records are the strongest existing explainability primitive** (text, verdict, evidence
   method, observation event IDs, upstream linkage — all in the live journal), but they lack
   structured counterevidence and "what would change my mind" fields. That gap is visible in the
   actual claim payloads, not just in the plan.
3. **No silent merges are possible** (no merge code path exists), which makes the audience-graph
   contradiction question moot in the destructive direction and unanswered in the constructive
   (linking) direction.
4. All Postgres reads were SELECT-only under `default_transaction_read_only=on`. Journal row counts
   were observed, not modified.
