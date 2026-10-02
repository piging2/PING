# 100-Hour Tests Sprint Plan, 06-tests-100h
## Revision filing, 2026-09-30 ~19:00 MDT. PLANS ONLY: no code, no commits, no installs, no execution.

Charter chain (all binding, Nolan): CEO-ORDER-AUTONOMOUS-TESTING-CONVERGENCE-2026-09-30.md, CEO-ORDER-600H-MASTER-DIRECTIVE-2026-09-30.md.
Status: revised under the master directive into six verticals over one PING semantic/control plane plus the seventh integrated proof. Prior version's week structure (D1-D8) is preserved and remapped into the per-plan budget below.
Disposition: BUILD CANDIDATE for the falsification-hardening direction. BUILD CANDIDATE IS NOT BUILD AUTHORIZATION.

Governing architecture: PING OWNS MEANING; RENT COMMODITY MACHINERY; WRAP PROTOCOLS; ISOLATE EXPERIMENTS. TESTS is the vertical that FALSIFIES THE ENTIRE CHAIN. It tests the actual semantic owners, at the seams, not a test repository.

Domain question: CAN WE FALSIFY THE SYSTEM AT ITS SEMANTIC OWNERS?

Hour budget (planning budgets, not time accounting; FIRST BROKEN EDGE OVERRIDES THE SCHEDULE):
- 0-10: ARCHAEOLOGY + FALSIFICATION
- 10-20: CONTRACT + ACCEPTANCE TEST FREEZE
- 20-60: IMPLEMENT HIGHEST-LEVERAGE WIRING
- 60-80: INTEGRATION WITH ADJACENT DOMAINS
- 80-95: HOSTILE TEST / REPLAY / FAILURE RECOVERY
- 95-100: DEMO / EVIDENCE / DELETE DEAD WORK / HANDOFF

Epistemic labels used below: PROVEN / SUPPORTED / REPORTED / INFERRED / UNKNOWN / CONFLICTING.

---

## 1. PRODUCT ARROW

Every important PING/FYD claim becomes mechanically falsifiable at its actual semantic owner, and every falsification compounds into permanent regression knowledge. Testing exists to ATTACK the product path (RENDERED EXPERIENCE to ASK FYD to EVIDENCE to WHY THIS to OWNER CORRECTION to REGENERATION) and the full governance lifecycle (SOURCE to OBSERVATION to EVIDENCE to OBJECTS+RELATIONSHIPS to MISSION/PLAN to ROUTING to EXECUTION to RESULT to JUDGMENT to AUTHORIZED EFFECT to VERIFICATION to OUTCOME to LEARNING/NEXT ACTION to MULTIPLE PROJECTIONS). The tests sprint builds no product path of its own; it makes every other vertical's claims disprovable and makes every disproof survive. KNOWLEDGE MUST COMPOUND: each run starts smarter than the last.

---

## 2. CURRENT VERIFIED STATE

- REPORTED: the convergence charter states 195/195 was previously green at the renderer boundary, and that the current canonical gate reported afterward "must remain the sole test truth for its exact SHA/environment."
- INFERRED: a current test-suite contradiction exists. The charter's framing (a previously-green gate plus a later canonical gate that must stand as sole truth for its SHA/environment) and the 600H directive's P0 ("resolve any current test-suite contradiction") together imply two test-truth claims that do not reconcile on one SHA. The exact delta is UNKNOWN until the P0 gate runs.
- UNKNOWN: whether the autonomous testing convergence coordinator has landed and received acceptance for the T0-T9 ladder (tests/ tree layout, constitutional properties, pr/nightly/weekly certification workflows, regression fixture format, fast-check 4.9 installed with compat verified). The prior plan gated sprint start on this; hours 0-10 verify it read-only.
- SUPPORTED: the harvest evaluation of testing machinery is already on record in the convergence order: fast-check 4.9 with shrinkable entityGraph (primary JS/TS property candidate), Testcontainers Node 12 (needs Node >=22.22; Node 22.23.2 reported compatible in principle, compat unverified in practice), StrykerJS 10 (pin, trial on a small constitutional target first), Schemathesis 4.24.x (trial only if the gateway OpenAPI is verified trustworthy), Playwright trace viewer (failure-debugging artifact), OTel JS (observability only, never truth; pin intentionally at the major transition). The FYD WILL NOT BUILD ledger (entries 1-14) forbids the parallel authorities this sprint must not invent.
- REPORTED: the existing reuse inventory from read-only recon (2026-09-30): `~/workspace/jev/test_replay_precedence.js` (spoofed test mode ignored, authoritative DB correlation group replayed), `~/workspace/jev/test_verdict_authority.js` (verdict-class admission at the single choke point), `~/workspace/jev/regcheck.py` (event-type presence checker), `~/workspace/jev/kernel_probe.js` (replay-execution probe with golden transcript), `~/workspace/jev-stage/test_jev_shadow.js` (JEV shadow typed-decision contract; owned by the JEV sprint, reused here as the classification contract). Harvest map alignment: E1 replay proof feeds D1/D7; E3 source-binding proof is the seam D3 attacks (BindingVerifier); E2 attenuation proof covers the D4 kill-list items (tenant comparison, signature check); lane-10 upcasting-registry shape constrains D6 to read-only replay/projection discipline; duplication threads T1-T7 stay OPEN reader threads, not write targets.

---

## 3. FIRST BROKEN EDGE

The leading candidate is the current test-suite contradiction itself (INFERRED). Until the P0 gate pins ONE SHA, ONE CLEAN WORKTREE, ONE COMMAND, ONE ENVIRONMENT CONTRACT, ONE EXIT CODE and resolves which gate is truth at which SHA, no other sprint's gate can be trusted, and every downstream "green" is built on an ambiguous base. This edge overrides the schedule: nothing in the 10-100 blocks proceeds on a gate whose base is unresolved.

Standing secondary candidates (from the prior plan, still live; any of them becoming the actual first break redirects the hours):

1. entityGraph generates invalid domain objects. fast-check 4.9's entityGraph is new; naive arbitraries may produce Business/Service/Location graphs that violate product invariants, making every attack a false positive against an impossible input. Mitigation: derive generators from the real object schemas and the coordinator's landed domain generators; validate the generator itself (does a generated graph survive the existing validation tier?) before trusting any attack result.
2. StrykerJS 10 vs the repo toolchain. Major-version boundary: reporter/runner/TS/ESM interplay may break on the actual repo. Trial on one small constitutional target first; if the toolchain fights back, fall back to a pinned older Stryker or handwritten mutant injection for the kill list before asking for toolchain changes. Do not chase the toolchain.
3. Testcontainers / Docker on the Pig. Disposable Postgres needs a reachable, stable Docker plane isolated from production; the Pig is the automation plane with its own constraints (WiFi-only, standby history). If Pig Docker is unsuitable, the concurrency suite gates to nightly on an approved alternate plane or is honestly marked degraded. It must NEVER run against production Postgres.
4. Schemathesis against a stale OpenAPI. STALE OPENAPI + GENERATED TESTS = AUTOMATED CONFUSION. Trial only after a contract test proves the gateway OpenAPI matches the served runtime. Until then the API attack list is covered by handwritten hostile cases.
5. Playwright trace-bundle weight. trace.zip + screenshot + console + network per browser failure accumulates fast; bundles live in the corpus with retention policy, not in git history, and never carry secrets.

---

## 4. SEMANTIC OWNER

The seams themselves. This sprint owns no product contract; it falsifies all of them. The falsification surface is the 11 lifecycle seams, each attacked at the actual semantic owner that the Phase A archaeology (and the other five sprints' archaeology) identifies:

SOURCE to OBSERVATION, OBSERVATION to EVIDENCE, EVIDENCE to OBJECT, OBJECT to PROJECTION, MISSION to ROUTE, ROUTE to EXECUTION, EXECUTION to RESULT, RESULT to JUDGMENT, JUDGMENT to EFFECT, EFFECT to VERIFICATION, VERIFICATION to OUTCOME.

Every falsifier lives beside the code it attacks: PING repo holds PING semantic tests; FYD repo/worktree holds FYD compiler/product tests. Exactly ONE external certification harness only if destructive black-box isolation provably cannot live beside product code, and that proof is a written representational-failure argument, not a convenience claim. A separate repo is an authority cost.

What this sprint does NOT own: the tenant contract, mission contract, route contract, brief contract, result/finding contract, judgment contract, capability contract, SiteSpec contract, event transition contract, or verification/outcome contract. Those belong to their owning verticals. This sprint READS them (frozen, versioned) and PROPOSES falsifiers against them; it never mutates product semantics to make a test green.

---

## 5. MUTATION OWNER

The ten shared contracts (tenant, mission, route, brief, result/finding, judgment, capability, SiteSpec, event transition, verification/outcome) each have exactly one mutation owner, assigned per the master directive before implementation. TESTS owns none of them. It READS all ten (at frozen versions) and PROPOSES falsifiers against them.

The tests sprint's one coordination surface is the integrated test harness contract around the shared seams: the gate vocabulary, the regression corpus format, the falsifiability questionnaire shape, and the clean-checkout replay gate. One mutation owner holds that contract; other lanes may READ and PROPOSE; one writer merges contract changes.

Writer proposal (max 4 writers, one mutation owner per surface; standing law: search the entire repo estate INCLUDING all worktrees for semantic overlap before proposing anything; reuse existing primitives; no push without Nolan's explicit authorization):

1. PBT + state-model writer: owns mutation of the PING tests/ property/state-model surface (D1 deep PBT; D2 owner-correction state model; D3 entityGraph attacks on the FYD side). Handoff rule: does not touch the coordinator's surfaces until G1 acceptance is signed; until then works read-only against the landed ladder.
2. Mutation + concurrency writer: owns StrykerJS config and Testcontainers concurrency suites (D4, D5). Writes only test-side files; the constitutional modules under mutation are NEVER modified except as generated mutants. Must not collide with other lanes' runtime work.
3. Debug-view + workflow writer: owns the causal debug CLI under the existing ping-runtime/gateway tree (D6, a projection over ping_events; no new store, no new authority) and the nightly/weekly workflow hardening (D7 wiring). Reader of the observability lane, not a writer of its surfaces.
4. Corpus keeper: single mutation owner of the regression corpus directory and the gold-set corpus files (D7 fixtures, D8 questions). Owns the corpus growth metric and fixture deduplication. The JEV sprint owns the classification contract; the keeper owns the corpus the classifications land in.

Collision boundaries: the current testing coordinator's surfaces until G1 lands; the FYD worktree (D3 writes happen only in coordination with the website-building sprint's writer, one mutation owner per file); the harvest duplication threads T1-T7 are OPEN reader threads, not write targets; the "Fix FYD oval rotation and shapes" side chat owns P0 execution work and is not duplicated.

---

## 6. INPUT CONTRACT

- The P0 gate must resolve the test-suite contradiction before any sprint's gate is trusted. No gate in this plan, and no gate this sprint hands to another sprint, is accepted on an unresolved base. The one-SHA/one-clean-worktree/one-command/one-environment-contract/one-exit-code result is the input every later block consumes.
- The ladder coordinator's landed T0-T9 state (G1) is verified read-only in hours 0-10: tests/ tree layout (unit/properties/metamorphic/model/integration/regression/generated); fast-check 4.9 installed with compat verified; constitutional properties executable; the three certification workflows present (pr-certification, nightly-certification "17 8 * * *", weekly-certification); the regression fixture format adopted and machine-readable (REGRESSION ID / invariant / seed / path / minimal counterexample / first failing SHA / fixed SHA / test owner / expected behavior).
- The website-building sprint's Ask FYD deterministic baseline path is reachable on both real websites (object graph + evidence index + lexical/structural retrieval to candidate evidence to answer with CLAIM to SUPPORTING EVIDENCE to SOURCE to OBSERVED AT to DIRECT / DERIVED / INFERRED). Required by D8. If unreachable, D8 degrades to generator-only work against recorded fixtures and the sprint reports the blocked arrow honestly.
- The Pig execution plane for Testcontainers (G3): Docker reachable and stable, Node >=22.22 confirmed on the actual runtime, production Postgres isolated from disposable containers. If unsuitable, the concurrency suite gates to nightly on an approved alternate plane or is marked degraded; it never runs against production state.
- Every falsifier takes as input: the invariant under attack, its owning semantic owner, the frozen contract version it reads, and the attack shape (property, metamorphic, state-model command sequence, mutant, concurrency scenario, or hostile request).

## 7. OUTPUT CONTRACT

Good-form statements only. At hour 100, the following is true, each in integration-truth terms (proven against reached runtime, replayed from a clean checkout where replay discipline requires it, with evidence attached):

- The integrated golden path survives hostile tests. The seventh deliverable scenario (TENANT OWNER to MISSION CONTROL to MISSION to ROUTER to ORCA to FINDING SET to JEV to PROPOSAL to OWNER APPROVAL to FYD OBJECT/SITE EFFECT to VERIFICATION to OUTCOME to MISSION CONTROL) runs end to end under the full hostile-class suite and its green replays from a clean checkout.
- Every sprint's gate attacks its actual invariants. Each of the other five verticals has a reproducible gate that targets the semantic owner it changed, and this sprint's harness is what runs it.
- ONE SHA, ONE CLEAN WORKTREE, ONE COMMAND, ONE ENVIRONMENT CONTRACT, ONE EXIT CODE. The canonical gate is a single documented command; its exit code is the only test truth at its SHA and environment.
- Every minimized failure becomes permanent regression knowledge. Each carries REGRESSION ID / invariant / seed / path / minimal counterexample / first failing SHA / fixed SHA / test owner / expected behavior; a seeded re-run replays the counterexample.
- No green claim stands without a clean-checkout replay. Lane self-reports are hypotheses until replayed.
- A surviving high-consequence mutant means the suite is lying. The sprint fails until the falsifiability thread closes.
- Deterministic checks stay deterministic. Hash equality, signature validity, schema validity, URL safety, permission evaluation, capability enforcement, exact replay equality, DB constraint success, exit codes, HTTP status, canonical byte equality, deterministic ID equality are decided by software, never by JEV. JEV MAY ROUTE A FAILURE. JEV MAY NOT MARK IT FIXED. HERMES MAY IMPLEMENT A FIX. HERMES MAY NOT MARK IT PROVEN. THE EXECUTABLE TEST DOES THAT.

---

## 8. DEPENDENCIES

Hard gates (sprint cannot start or continue without these):

- G1. The testing-ladder coordinator's ladder is landed and accepted (details in INPUT CONTRACT). Without G1 there is nothing to deepen; this sprint extends the ladder, it does not rebuild it.
- G2. Website-building sprint's Ask FYD deterministic baseline path reachable on both real websites (details in INPUT CONTRACT). Required by D8.
- G3. Pig environment for Testcontainers: Docker reachable and stable, Node >=22.22 confirmed on the actual runtime, production Postgres isolated from disposable containers (details in INPUT CONTRACT). Required by D5.

Nice-to-have:

- N1. JEV sprint's shadow pipeline operational (typed-decision contract + shadow worker) for D7's classification step. If late, D7 runs with deterministic-only classification (exit codes, digests, exact replay equality) and JEV routing is wired when the plane lands. JEV absence never blocks deterministic tiers.
- N2. Gateway OpenAPI verified trustworthy (contract test proving the schema matches the served runtime). Only then does Schemathesis get its trial; otherwise handwritten hostile API cases cover the API attack list (missing/extra fields, wrong types, huge strings, malformed Unicode, invalid IDs, invalid signatures, cross-tenant references, unknown predicates, bad URL schemes, unexpected ordering, repeat requests).
- N3. Playwright trace-viewer-compatible artifacts land from the coordinator's browser tier, so D6 and D7 reference the browser failure bundle format (trace.zip, screenshot, console errors, failed requests, viewport, route, SHA, SiteSpec digest, object-graph digest, ViewerContext class) rather than inventing one.

---

## 9. HARVEST CANDIDATES

Cited from the ecosystem harvest map (2026-09-30) and the autonomous testing convergence order; evaluation already recorded, reused here, not re-decided:

- fast-check 4.9: ADOPTED as the primary JS/TS property/metamorphic/state-model candidate. The shrinkable entityGraph maps directly onto FYD's object/relationship semantics. Generate DOMAIN objects (Business, Service, Location, Person, ExternalIdentity, Post; relationships offers / located_at / works_for / links_to / references; SiteSpecs; viewer contexts; evidence sets; owner overrides; transition sequences), never meaningless random JSON.
- Testcontainers Node 12: ADOPT after verifying actual package/Docker compatibility on the Pig (Node >=22.22 gate; reported 22.23.2 compatible in principle, verify in practice). No mock certifies transactions, constraints, ON CONFLICT behavior, concurrency, leases, terminal-state races, idempotency, or replay persistence.
- StrykerJS 10: PIN and trial on ONE small constitutional target first, then widen to the charter kill list. No full-repo mutation in this sprint.
- Schemathesis 4.24.x: trial ONLY if the gateway OpenAPI is verified trustworthy. Otherwise REJECT for this sprint (handwritten hostile API cases instead).
- Playwright (pinned with its browser build): ADOPT as the browser-truth adapter. Keep traces/screenshots/console/network evidence on failure. Test semantics, not pixel vanity.
- OTel JS: PIN intentionally at the major transition; USE FOR OBSERVABILITY, NOT TRUTH. Trace request to object read to evidence retrieval to JEV decision to model to answer to proposal to authority to transition. Canonical events/evidence remain authoritative. No OTel backend stack (FYD WILL NOT BUILD ledger entry 7).
- Hypothesis: Python equivalent where preserved Python execution semantics remain reached; same conceptual contracts; eventually differential-test overlapping JS/Python behavior.
- Reuse inventory (patterns, not products): `~/workspace/jev/test_replay_precedence.js` for replay-determinism PBT and replay-convergence assertions; `~/workspace/jev/test_verdict_authority.js` for authority-uniqueness properties; `~/workspace/jev/regcheck.py` for event-vocabulary assertions in D6/D7; `~/workspace/jev/kernel_probe.js` as the seed for replay-determinism PBT inputs and the deterministic-reproducer shape; `~/workspace/jev-stage/test_jev_shadow.js` for the shadow typed-decision contract and taxonomies (owned by the JEV sprint; consumed, never re-implemented).
- Harvest-map experiment alignment: E1 (replay proof) is attacked/supported by D1/D7; E2 (attenuation proof) covers the D4 kill-list items (tenant comparison, signature check); E3 (source-binding proof) is the BindingVerifier seam D3 attacks, not reimplements; lane-10 upcasting-registry shape constrains D6 to read-only replay/projection discipline.

---

## 10. OWN / RENT / WRAP / ISOLATE / REJECT DECISIONS

- OWN (what compounds): the falsification corpus and its growth discipline; the gate definitions (the integrated test harness contract); the Ask FYD gold set and its hostile extensions; the falsifiability questionnaire answers per major claim; the nine-field regression fixture format; the clean-checkout replay gate. Ownership semantics: these are knowledge assets, not machinery; they live beside the semantic owners they attack.
- RENT (commodity machinery): test runners, containers (Testcontainers/Disposable Postgres), browsers (Playwright), mutation engines (StrykerJS), API generators (Schemathesis), property libraries (fast-check), trace/observability (OTel pinned). The machinery is rented; the gates and the corpus are owned.
- WRAP: Playwright behind the existing acquisition/render adapter where browser truth is needed; MCP is not this sprint's concern; the causal debug view is a CLI projection over existing IDs and digests, not a new observability product.
- ISOLATE: experimental harnesses stay quarantined until their verdict lands. The StrykerJS trial stays on one small constitutional target until the kill list is justified. The Schemathesis trial stays out until the OpenAPI-trust contract test passes. The ONE external certification harness is permitted only after the written representational-failure argument proves destructive black-box isolation cannot live beside product code; until then it does not exist.
- REJECT: the charter's negative ledger, enforced: no TestingAuthority, no TestEventStore, no TestKnowledgeGraph, no second replay runtime, no second fixture truth system, no giant custom fuzz framework, no custom mutation framework, no custom browser debugger, no dozens of test repositories; no JEV in PR merge gates; no "fix the product to make the test green"; no new packages until the capability check proves we do not already have it.

---

## 11. P0 / P1 / P2

**P0. The one-SHA gate.** Resolve the current test-suite contradiction with ONE SHA, ONE CLEAN WORKTREE, ONE COMMAND, ONE ENVIRONMENT CONTRACT, ONE EXIT CODE. Acceptance: a single documented command, runnable by any agent from a clean worktree at the pinned SHA with the environment contract satisfied, exits 0 on green and non-zero on red; its result reconciles the REPORTED 195/195 renderer gate with the later canonical gate (whichever is truth at which SHA is stated in writing, with the SHA quoted); every subsequent green claim in this program replays under it. Until this gate is frozen, no other sprint's gate is trusted (INPUT CONTRACT).

**P1. Seam tests for every lifecycle edge with hostile classes.** The deliverables D1-D8 below, each targeting one or more of the 11 seams with the hostile classes from section 14. P1 acceptance is the ACCEPTANCE TESTS section.

**P2. The integrated golden-path hostile suite that the seventh deliverable runs against.** The seventh deliverable scenario (owner research request through ORCA findings, JEV judgment, FYD proposal, owner approval, governed transition, regeneration, verification, outcome) executes end to end under the full hostile-class suite, and its green replays from a clean checkout. P2 is the exit demonstration (see DEMO).

### Deliverables, remapped into the hour budget

**Hours 20-60, IMPLEMENT HIGHEST-LEVERAGE WIRING: attack the constitutional invariants first.**

**D1. Deep PBT at 10k+ cases on constitutional properties.**
Semantic owner: PING semantic test tree (tests/ layout landed by the coordinator).
Deepen the ladder's property tier: raise numRuns to 10k+ on every constitutional property the coordinator landed (canonical serialization idempotence + key-order invariance; stable hashing ONE DIRECTION ONLY; identity determinism + domain separation; replay determinism; projection invariance; event append round-trip; authority uniqueness; mission causation; originator preservation; retry no-silent-duplication; restart convergence). Persist every minimized failure straight into the regression corpus in the nine-field fixture format. Deep PBT moves into the nightly-certification tier because of wall-clock cost; a sampled 1k-case gate stays in PR certification. Good form: every constitutional invariant has a 10k-case nightly falsifier, and no minimized failure waits more than one nightly to become a corpus fixture.

**D4. Targeted mutation certification on constitutional modules.**
Semantic owner: PING constitutional modules (the code under test, unchanged by us).
StrykerJS 10 pinned, trial on ONE small constitutional target first, then widen to the charter kill list: remove URL sanitizer; remove min-w-0; bypass binding verifier; ignore owner visibility override; change private to public; drop evidence requirement; skip proposal digest comparison; accept invalid signature; remove tenant comparison; change UNKNOWN to FAILED; disable suppression check; let notes override canonical communication state. No full-repo mutation in this sprint. Good form: kill rate >= 95% across the constitutional module set on the kill list, and ZERO surviving high-consequence mutants (truth / privacy / authority / execution). A surviving high-consequence mutant means the suite is lying; each survivor becomes a blocking falsifiability thread, not a shrug.

**Hours 60-80, INTEGRATION WITH ADJACENT DOMAINS: falsify the product and persistence seams with their owning verticals.**

**D2. Owner-correction STATE MODEL as executable model-based tests.**
Semantic owner: PING semantic test tree (model-based suite); the FYD renderer seam exercised from the FYD worktree side where states touch presentation, in coordination with the website-building sprint's writer.
fast-check model: states OBSERVED / GENERATED / CORRECTED / HIDDEN / CUSTOMIZED / SOURCE_CHANGED / REGEN_PROPOSED / REGEN_APPLIED; commands observe / generate / correct / hide / customize / reobserve / approve / reject / restart / rebuild. Invariants: OWNER CORRECTION IS NOT LOST; HIDE IS NOT LOST; REJECTED PROPOSAL DOES NOT APPLY; APPROVED PATCH BINDS EXACT PROPOSAL; REPLAY RECONSTRUCTS SAME EFFECTIVE PRESENTATION; PRIVATE DATA NEVER BECOMES PUBLIC THROUGH REGENERATION; and the critical epistemic invariant NO SUPPORTING EVIDENCE to NO ASSERTED FACT (remove all evidence supporting proposition P; Ask FYD must not continue asserting P as known; add contradictory evidence; result must become CONFLICT / UNCERTAIN, never fabricated consensus; add owner correction; the answer must distinguish SOURCE SAYS X from OWNER SAYS Y per actual product semantics). Good form: 10k+ command sequences run with all invariants green, and owner correction survival is proven end to end (correct to regenerate to presented value respects correction) on both real websites.

**D3. fast-check entityGraph attacks on FYD graphs.**
Semantic owner: FYD repo/worktree tests (FYD compiler/product tests, per the one-owner rule), coordinated with the website-building sprint's writer.
Generate valid small DOMAIN graphs using fast-check 4.9's shrinkable entityGraph; never meaningless random JSON. Metamorphic attacks: GRAPH PERMUTATION to SAME SiteSpec semantic digest; irrelevant object insertion to unaffected sections stable; relevant Service insertion to appropriate projection changes per deterministic rules; Person + works_for insertion to person-capable composition per deterministic rules; evidence removal to unsupported factual claim disappears or becomes unsupported; OWNER HIDE to remains hidden after regeneration; OWNER CORRECT to source remains evidence but presented value respects correction; same source semantics: reordered JSON-LD nodes to same object graph; reordered persistence reads to same SiteSpec; same SiteSpec + same ViewerContext to same semantic render model; owner correction + regeneration to correction survives; source changes unrelated field to unrelated customization survives; source removes supported fact to fact does not silently remain as direct source truth; PRIVATE visibility to public ViewerContext never receives the value; URL changed to javascript: to non-executable representation. This is the same-seam attack surface as the harvest map's E3 source-binding proof; D3 attacks it, it does not reimplement it. Good form: permutation to same SiteSpec digest holds across generated graphs; PRIVATE visibility never reaches a public ViewerContext render model (verified against SERVED bytes, not source inspection); javascript: URL neutralization holds.

**D5. Disposable-real-Postgres concurrency certification.**
Semantic owner: PING semantic test tree (integration tier).
Testcontainers Node 12, only after verifying actual package/Docker compatibility on the Pig (Node >=22.22 on the actual runtime; production Postgres on the Pig isolated from disposable containers). No mock certifies transactions, constraints, ON CONFLICT behavior, concurrency, leases, terminal-state races, idempotency, or replay persistence. Generate concurrent: same-semantic event appends; same relationship creation; approval races; retry after response loss; worker claims; lease expiry; projection rebuild. Assert: no duplicate canonical semantic effect; no stale worker wins; terminal remains terminal; idempotent retries; replay converges. Concurrency tier lives in nightly, not PR. Good form: all seven concurrency scenarios green on disposable real Postgres; replay converges after each scenario.

**D6. PING CAUSAL DEBUG VIEW, CLI/text first.**
Semantic owner: existing gateway/ping-runtime tooling (projection over existing IDs and digests; no new store, no new authority, per the FYD WILL NOT BUILD ledger entry 6).
Input an object/event/request/run ID; resolve the full chain SOURCE to OBSERVATION to EVIDENCE to OBJECT to RELATIONSHIP to SITE SPEC to RENDER to ASK CONTEXT to JEV DECISION to MODEL RESULT to PROPOSAL to AUTHORIZATION to EVENT to PROJECTION, with digests at each hop. Attach SHA, runtime version, decision version, model version, source digest, evidence digest, projection digest, trace ID. No dashboard; this is the debugging primitive the autonomous loop (D7) uses to produce deterministic reproducers. It must answer the four questions the evidence-layer audits keep surfacing: what happened, which authority decided it, which version ran, can we replay it. Good form: one REAL event/object/request ID from live state resolves the full chain with a digest at every hop, and the digests match live state when re-derived.

**Hours 80-95, HOSTILE TEST / REPLAY / FAILURE RECOVERY: the hostile classes execute against the seams, and every green claim replays.**

**D7. Autonomous loop machinery hardened.**
Semantic owner: nightly/weekly certification workflows + the regression corpus directory (owned by the corpus keeper).
Full loop: CHANGE to FAST STATIC/UNIT to CONSTITUTIONAL PBT to METAMORPHIC to INTEGRATION to BROWSER to FAIL? to MINIMIZE to JEV CLASSIFY to DETERMINISTIC REPRODUCER to OWNER WORKER FIX to RE-RUN to REGRESSION FIXTURE to LEDGER to CONTINUE. JEV classifies using the charter taxonomies (FAILURE_CLASS, COUNTEREXAMPLE_CLASS, CLAIM_SUPPORT_CLASS, EVIDENCE_RELEVANCE, TEST_GAP_CLASS, MUTANT_SEVERITY, FAILURE_CLUSTER, REGRESSION_PRIORITY) and only in nightly/weekly tiers. JEV MAY ROUTE A FAILURE. JEV MAY NOT MARK IT FIXED. HERMES MAY IMPLEMENT A FIX. HERMES MAY NOT MARK IT PROVEN. THE EXECUTABLE TEST DOES THAT. Good form: one REAL failure observed during the sprint travels the entire loop and lands as a corpus fixture with all nine fields, and a seeded re-run replays the minimized counterexample, proving the next run starts smarter.

**D8. Ask FYD gold set hostile expansion.**
Semantic owner: falsification-side corpus (owned by the corpus keeper); the website-building sprint owns the product path it attacks.
Extend the initial 20-50 questions beyond 50 with hostile categories the charter names: contradicted evidence, ambiguous sources, privacy-hidden facts, owner-corrected claims, relationship-dependent chains, multi-object joins. Every question carries: required evidence, allowed evidence, FORBIDDEN claim, expected epistemic status. The first acceptance ("What services does this business offer, and how do you know?" to CLAIM to SUPPORTING EVIDENCE to SOURCE to OBSERVED AT to DIRECT / DERIVED / INFERRED; unsupported to "I don't have evidence for that.") must pass against the website-building sprint's deterministic baseline path before the sprint closes. Baseline-vs-baseline+JEV-reranking comparison runs in SHADOW (JEV does not control production until evaluated), measuring precision@k, recall of known supporting evidence, unsupported evidence admitted, relevant evidence discarded, latency, cost, context tokens saved, answer support rate, on BOTH real websites. This is where fast-check entityGraph generation may produce graph fixtures for the gold set. Good form: more than 50 hostile questions, each with required/allowed/forbidden/epistemic specification; the first acceptance question passes against the deterministic baseline; the shadow comparison is measured on both real websites.

**Hours 0-10 and 10-20 are not deliverable blocks in the old week sense; they are the archaeology and freeze blocks (see sections 2 and the budget):**

- 0-10 ARCHAEOLOGY + FALSIFICATION: verify G1 read-only; evaluate harvest toolkits against actual repo/runtime compat without installing; characterize the test-suite contradiction and name the first broken edge; produce the written seam map over the 11 lifecycle seams naming the actual semantic owner and the actual executable falsifier for each.
- 10-20 CONTRACT + ACCEPTANCE TEST FREEZE: execute the P0 gate and resolve the contradiction; freeze the integrated test harness contract, the corpus nine-field format, the gate vocabulary, the acceptance tests, and the version pins.

**Hours 95-100, DEMO / EVIDENCE / DELETE DEAD WORK / HANDOFF: see DEMO and DELETE/FREEZE LIST.**

---

## 12. EXPLICIT NON-GOALS

- No test repository. PING repo holds PING semantic tests; FYD repo/worktree holds FYD compiler/product tests. One external certification harness only after the written representational-failure argument; otherwise it does not exist.
- No giant test framework rewrite. KEEP THE EXISTING CANONICAL TEST GATES: the pr-certification, nightly-certification, and weekly-certification workflows and the 195/195 renderer gate at its SHA/environment. This sprint extends the ladder; it does not rebuild it.
- No JEV in PR gates. JEV MAY ROUTE A FAILURE; JEV MAY NOT MARK IT FIXED. Deterministic checks stay deterministic software; JEV handles bounded semantic judgment in shadow only.
- No declaring other sprints green. This sprint provides the harness and the gate; each vertical's own acceptance is proven against reached runtime, and a green is a replay result, not a report.
- No fixing the product to make the test green. HERMES MAY IMPLEMENT A FIX; HERMES MAY NOT MARK IT PROVEN. THE EXECUTABLE TEST DOES THAT. A broken arrow is reported as OWNER REQUEST to REACHED to DURABLE to EXECUTED to VERIFIED to EXPLAINABLE to first broken edge, never silently repaired.
- No new packages without proving we do not already have the capability. No custom signing, no second event spine, no OTel backend stack, no neural reranker or memory system, no custom capability-token construction, no custom browser debugger, no dozens of test repositories.
- No pushes without Nolan's explicit authorization. Local commits only.

---

## 13. ACCEPTANCE TESTS

The gates themselves, in integration-truth terms. Every claim below is proven against reached runtime, replayed from a clean checkout where the coordinator's replay discipline requires it, with evidence attached. Activity is not progress.

- **One-SHA gate (P0):** the single documented command exits 0 from a clean worktree at the pinned SHA with the environment contract satisfied; the contradiction between the REPORTED 195/195 renderer gate and the later canonical gate is resolved in writing with both SHAs quoted; every later gate in this plan replays under it.
- **Deep PBT:** 10k+ case runs execute in nightly for every constitutional property; 14 consecutive nights with zero unknown-flaky outcomes; every minimized failure lands in the corpus with all nine fixture fields before the next nightly runs.
- **Mutation certification:** kill rate >= 95% across the constitutional module set on the charter kill list; ZERO surviving high-consequence mutants. A surviving high-consequence mutant means the sprint FAILS until the falsifiability thread closes.
- **State model:** 10k+ command sequences run; all invariants green, including NO SUPPORTING EVIDENCE to NO ASSERTED FACT and PRIVATE DATA NEVER BECOMES PUBLIC THROUGH REGENERATION; owner correction survival proven end to end on both real websites.
- **entityGraph attacks:** permutation to same SiteSpec digest holds across generated graphs; evidence removal to unsupported factual claim disappears or becomes unsupported; PRIVATE visibility never reaches a public ViewerContext render model (verified against SERVED bytes, not source inspection); javascript: URL neutralization holds.
- **Concurrency:** all seven generated concurrency scenarios green on disposable real Postgres; no duplicate canonical semantic effect; no stale worker wins; terminal remains terminal; idempotent retries; replay converges after each scenario.
- **Causal debug view:** one REAL event/object/request ID from live state resolves the full chain SOURCE to PROJECTION with a digest at every hop and SHA / runtime version / decision version / model version / source digest / evidence digest / projection digest / trace ID attached; the digests match live state when re-derived.
- **Autonomous loop:** one REAL failure observed during the sprint travels the full loop (fail to minimize to JEV classify to deterministic reproducer to fix to re-run to regression fixture to ledger) and lands in the corpus; a seeded re-run replays the minimized counterexample.
- **Gold set:** more than 50 questions with hostile categories; every question specifies required evidence, allowed evidence, forbidden claim, and expected epistemic status; the charter's first acceptance question passes against the website sprint's baseline; baseline-vs-baseline+JEV shadow comparison measured on both real websites with the charter's metric set.

**Falsifiability questionnaire (answered in writing per major claim):** WHAT INVARIANT? WHO OWNS IT? HOW CAN IT FAIL? WHAT ATTACK DISPROVES IT? WHAT EVIDENCE PROVES IT? CAN IT BE REPLAYED? DOES THE FAILURE BECOME PERMANENT REGRESSION KNOWLEDGE?

**Mutation-kill metric:** kill rate per constitutional module, tracked per nightly run; surviving mutants listed with MUTANT_SEVERITY classification (truth / privacy / authority / execution / product correctness / presentation only); high-consequence survivors block the sprint.

**Regression-corpus growth metric:** fixtures added during the sprint, each with the nine-field format; semantic deduplication against existing fixtures before admission (a fixture that restates a known invariant with a new seed is a duplicate, not growth); corpus size delta reported with the per-fixture invariant it protects.

---

## 14. HOSTILE TESTS

The full hostile class list from the master directive, mapped per lifecycle seam. Each class has an executable falsifier at its seam; a falsifier that cannot reproduce a real failure mode is theater, not coverage.

- SOURCE to OBSERVATION: prompt injection (injected instructions in acquired content must not alter acquisition policy or provenance); malicious source URLs (javascript:, file:, redirect-to-private, DNS rebinding all fail closed at the acquisition seam); provider failure (provider outage degrades to a typed failure with evidence, never to silent success or fabricated content); source conflicts (two sources disagreeing on one fact produce CONFLICT/UNCERTAIN, never fabricated consensus); nondeterminism (same source bytes produce the same observation digest across runs).
- OBSERVATION to EVIDENCE: fabricated research (claims without acquisition evidence are rejected; "I searched" without an acquisition record fails); nondeterminism (same observations produce the same evidence grading); replay divergence (re-derived evidence matches the recorded evidence digest).
- EVIDENCE to OBJECT: source conflicts (object assembly preserves disagreement; deprecated ranks survive); fabricated research (objects do not carry claims their evidence does not support); unsupported factual claims (the epistemic invariant: NO SUPPORTING EVIDENCE to NO ASSERTED FACT).
- OBJECT to PROJECTION: visibility bypass (PRIVATE visibility never reaches a public ViewerContext; verified against SERVED bytes); projection drift (same SiteSpec + same ViewerContext yields the same semantic render model; served HTML is not scraped back into Markdown as truth); nondeterminism (render model digests are stable under graph permutation).
- MISSION to ROUTE: stale briefs (a stale brief fails closed; the eligibility check cannot be skipped; dropping tenant from a mission payload must not route); tenant leakage (mission created for synthetic tenant A is traced end to end; the tenant field is immutable at every hop; any hop where the tenant string changes or is re-derivable from an untrusted source fails); nondeterminism (same mission + same registry state routes deterministically).
- ROUTE to EXECUTION: capability bypass (executors without the exact capability are refused before I/O with typed REJECTED; attenuated tokens with wrong object, wrong tenant, expiry, or widened caveat fail closed); tenant leakage (worker context carries tenant immutably; cross-tenant private-context retrieval fails); restart/sleep interruption (worker interrupted mid-execution resumes or dead-letters with evidence; no silent partial effect).
- EXECUTION to RESULT: lost finding sets (successful worker findings survive the scheduler result persistence seam; the losslessness gate catches drops); partial success (partial results are typed as partial, never promoted to complete); duplicate effects (idempotent retries produce no duplicate canonical semantic effect); restart/sleep interruption (crash-window tests: context lost mid-operation leaves a typed, recoverable state); credential leakage (no secrets in traces, bundles, corpus fixtures, or JEV metadata; P0-SECRET-01 stays 139/139).
- RESULT to JUDGMENT: nondeterminism (same result + same decision version judges identically); unsupported factual claims (judgment distinguishes SUPPORTED / PARTIALLY_SUPPORTED / CONTRADICTED / INSUFFICIENT_EVIDENCE / POLICY_BLOCKED / UNCLEAR without collapsing to one magic score).
- JUDGMENT to EFFECT: capability bypass (no valid principal to no approval; no required capability to no approval; no exact proposal digest to no approval; no tenant/owner match to no approval); stale briefs (a judgment rendered against a superseded proposal cannot authorize it).
- EFFECT to VERIFICATION: duplicate effects (the effect's idempotency key prevents double application); partial success (partially applied effects verify as partial with the missing remainder named); UNKNOWN outcomes (UNKNOWN is reconciled first: determine whether the original effect happened, then SUCCEEDED / FAILED / remain UNKNOWN; UNKNOWN never blindly retries).
- VERIFICATION to OUTCOME: UNKNOWN outcomes (outcome stays UNKNOWN with the missing observation named, never converted to success); replay divergence (the outcome reconstructed from ping_events matches the recorded outcome); projection drift (the outcome shown in Mission Control matches the recorded outcome; no fabricated ui-next "live" metrics).

Cross-cutting: dirty-worktree contamination (every gate runs from a clean worktree; a dirty tree fails the gate before any claim is made); provider failure (every external dependency has a typed failure mode with evidence; retries only where policy says the operation is safely repeatable); credential leakage (secret-scanning falsifiers run over every artifact the sprint produces: traces, bundles, corpus, logs); replay divergence (clean-checkout replay is the gate for every green claim).

---

## 15. REPLAY/RECOVERY TEST

- Clean-checkout replay is the gate for every green claim. Any agent, from a clean worktree at the pinned SHA with the environment contract satisfied, runs the one command and gets one exit code. A green that does not replay is a hypothesis, not a result.
- Weekly/release tier: FULL MUTATION, DESTRUCTIVE RECOVERY, CLEAN CHECKOUT, BUILD, DEPLOY, BLACK-BOX, REPLAY, CERTIFY. Destructive recovery trials run only against disposable planes (Testcontainers Postgres, isolated containers), never against production state or the Pig's production databases.
- Restart/sleep interruption is an explicit recovery class: worker interruption, Pig standby, and mid-operation context loss are injected; the system must resume or dead-letter with evidence, and the replay gate must converge afterward. The Pig's WiFi-only and standby history are treated as a known interruption source, not an excuse.
- The replay proof (harvest E1) is the standing falsifier for the event log: replay one real mission end to end from ping_events through current worker code with a recorded worker-version marker; diff the reconstructed outcome against the original. If the log is archival rather than reconstructive, that is the first broken edge and it overrides the schedule.
- Every minimized failure in the corpus is re-runnable by seed: a seeded re-run replays the counterexample, proving the next run starts smarter.

---

## 16. OBSERVABILITY

- OTel JS is pinned intentionally at the major transition and used for OBSERVABILITY, NOT TRUTH. Trace: request to object read to evidence retrieval to JEV decision (if used) to model to answer to proposal to authority to transition. Canonical events/evidence remain authoritative. No OTel backend stack (FYD WILL NOT BUILD ledger entry 7); spans project from ping_events.
- The causal debug view (D6) is the primary debugging primitive for the autonomous loop: input an ID, resolve the full chain with digests at each hop. It is CLI/text first; no dashboard.
- The existing TracePort/MetricsPort abstract seams are kept as the wrap points (harvest map: unwired gold). The auth-gated /events traversal API (children/descendants/ancestors/correlation-group) is the lineage query surface.
- Event-vocabulary assertions (regcheck.py pattern: REPLAY_COMPLETED, WITNESS_CREATED, WITNESS_REJECTED, LINEAGE_CREATED, JEV_DECISION_EVALUATED, REPLAY_VERIFY, WITNESS_CREATE) run over result JSON in D6/D7 so the replay story is asserted, not assumed.
- Browser failure bundles keep the trace-viewer-compatible shape (trace.zip, screenshot, console errors, failed requests, viewport, route, SHA, SiteSpec digest, object-graph digest, ViewerContext class), live in the corpus with retention policy, never in git history, never carrying secrets.
- Mission Control is a consumer of projections here, not an authority: if Mission Control cannot make a stuck or lost-finding-set failure obvious, that is evidence the projection is insufficient, and the falsifier for that seam is the proof.

---

## 17. DEMO

The golden path surviving hostile tests, replayed from a clean checkout. The demonstration is the seventh deliverable scenario executed live:

Owner asks "Research whether my site accurately represents my current commercial services and propose improvements" to Mission Control; a mission is created; the router selects a worker with a typed brief; ORCA acquires authorized sources and produces persisted evidence/findings; JEV judges supported vs unsupported changes in shadow; FYD produces a SiteSpec proposal; Mission Control shows the proposal and its evidence; the owner approves; PING records the governed transition; FYD regenerates; verification checks the rendered result; the outcome appears in Mission Control.

During the demo, the hostile suite from section 14 runs against the same flow: a prompt-injected source, a stale brief, a tenant-leak probe, a capability-bypass attempt, a lost-finding-set injection, and an UNKNOWN-outcome injection are each exercised, and each fails closed with typed evidence. Then the entire demo is replayed from a clean checkout at the pinned SHA with one command and one exit code. A demo that does not replay is a performance, not a proof.

---

## 18. ROLLBACK

- The gates are additive and read-only against product code. Every falsifier lives in test-side files beside the semantic owner it attacks; the constitutional modules under mutation are never modified except as generated mutants, which are discarded after the kill measurement.
- Rollback is therefore cheap: if a falsifier, a pin, or a workflow degrades the program, freeze the one-SHA gate at its last-green SHA, quarantine the new finding as an open falsifiability thread (never as a green), and revert the test-side files to the last-verified harness contract. The canonical gate at its last-green SHA remains the sole test truth in the interim.
- If the corpus is corrupted (bad fixture, secret leaked into a fixture, duplicated invariant), the corpus keeper reverts the corpus directory to its last-verified digest; every fixture carries its digest, so the corruption is attributable and bounded.
- If the P0 gate itself is found wrong (it resolves the contradiction incorrectly), the contradiction returns to INFERRED status, the first broken edge is re-named, and no downstream gate is trusted until the P0 re-runs. There is no product-state rollback because this sprint makes no product-state changes; that is the design.

---

## 19. DELETE/FREEZE LIST

Freeze:

- Version pins: fast-check 4.9, StrykerJS 10 (trial scope frozen), Testcontainers Node 12, Schemathesis 4.24.x (conditional on the OpenAPI-trust contract test), Playwright pinned with its browser build, OTel JS pinned at the major transition.
- The integrated test harness contract (gate vocabulary, the regression corpus nine-field format, the falsifiability questionnaire shape, the clean-checkout replay gate).
- The P0 one-SHA/one-command/one-environment-contract/one-exit-code gate once resolved.
- The ten shared contract names and their owning verticals; TESTS owns none and proposes only.
- The FYD WILL NOT BUILD ledger entries: this sprint never builds a second event spine, an OTel backend, a neural reranker or memory system, custom capability-token construction, a custom browser debugger, or a test authority of any name.

Delete:

- Any test-side work this sprint itself created that no longer attacks an invariant: dead generators, superseded fixtures, stale workflow variants. The sprint deletes its own dead work in the 95-100 block.
- Dormant duplicate test suites and dead test tables only through the constitutional rule: a duplication thread (T1-T7 or a new one this sprint opens) closes with DELETE only after the owning lane's evidence is on the record, deadness is proven, consumers are converted or archived, and the re-scan runs. A reader finding is not a deletion authorization.
- Trace bundles and browser evidence beyond the corpus retention policy; never in git history.

---

## 20. DEPENDENCIES ON OTHER FIVE SPRINTS

Every sprint adds tests around the semantic owner it changes; this sprint provides the harness and the gate, and reads their frozen contracts. What this sprint needs from, and gives to, each of the other five:

**01 TenantOS.** Need: the tenant isolation invariants (two tenants, one runtime; Tenant A cannot read, search, project, execute, delegate, or retrieve private context of Tenant B) as frozen, testable statements, plus the capability test matrix over the existing capability system. Give: the adversarial tenant-leakage suite (cross-tenant reads through every read path, expired and widened attenuation attempts, private-context leak probes through regeneration, crash-window tests), the four operational tests as hostile suites, and every minimized tenant-leak failure as a permanent regression fixture with its owning primitive named.

**02 Mission Control wiring.** Need: finding-set persistence as a lossless seam (their P0); the typed research contract, the deterministic stateless route compiler, the losslessness gate, finding-set persistence by digest/reference, the extended plan validator, typed executor briefs. Until their seam is lossless, ORCA chaining, JEV judgment, and Mission Control inspection are partly fictional, and this sprint's falsifiers say so honestly. Give: the losslessness gate tests (successful worker findings survive scheduler result persistence; dropped findings are caught with the exact missing digest named), the tenant-trace propagation test (payload carrying tenant while trace displays UNKNOWN fails), and the route-compiler determinism falsifiers.

**03 ORCA.** Need: the typed brief contract and the machine-complete brief schemas, so the stale-brief fail-closed test has a real contract to attack; real source acquisition with SHA-256 source digests and persisted observations/claims. Give: fabricated-research falsifiers (claims without acquisition evidence rejected; "I searched" without an acquisition record fails), stale-brief fail-closed tests (skipping the eligibility check fails closed; dropping tenant from a mission payload does not route), source-digest verification tests, and contradiction/uncertainty preservation tests (contradictory claims become CONFLICT/UNCERTAIN, never fabricated consensus).

**04 Website building.** Need: the deterministic Ask FYD baseline path reachable on both real websites (object graph + evidence index + lexical/structural retrieval to candidate evidence), the BindingVerifier seam as the factual-binding gate, the digest-bound SitePatch seam, and the deterministic render model (same ObjectGraph + OwnerIntent + SiteSpec version + Renderer version + ViewerContext class yields the same semantic RenderModel). Give: the Ask FYD gold set (owned and curated here; shared, not duplicated), the owner-correction state model (D2), the entityGraph attacks on the graph/render seam (D3), the source-binding attacks (E3 seam), and the correction/customization survival proofs (second observation must not destroy owner correction).

**05 JEV.** Need: the shadow typed-decision contract, the verdict/dimension taxonomy (frozen, not the exact labels until their archaeology lands), and the shadow pipeline's typed-decision metadata (decision definition/version, resolved model version, candidate-set digest, state/evidence digest, typed answer, score/probability, threshold, baseline result, eventual label, latency, cost; NO SECRETS; tenant identity EXCLUDED). Give: the autonomous loop's classification consumption (D7 uses JEV taxonomies FAILURE_CLASS, COUNTEREXAMPLE_CLASS, CLAIM_SUPPORT_CLASS, EVIDENCE_RELEVANCE, TEST_GAP_CLASS, MUTANT_SEVERITY, FAILURE_CLUSTER, REGRESSION_PRIORITY in nightly/weekly tiers only), the baseline-vs-baseline+JEV shadow comparison harness for Ask FYD evidence reranking (D8), and the standing rule that deterministic checks stay deterministic: JEV judges, tests falsify, PING authorizes, software executes, evidence verifies, PING records. JEV never turns "I think this passes" into PASS.

**Seventh deliverable (all six contribute).** This sprint's P2 is the integrated golden-path hostile suite the seventh deliverable runs against: the owner research scenario through ORCA findings, JEV judgment, FYD proposal, owner approval, governed transition, regeneration, verification, and outcome, executed end to end under the full hostile-class suite, green only on a clean-checkout replay. That single flow touches all six sprints; this sprint is the falsifier that keeps it honest.

---

## Sprint boundaries (standing)

- **With the website-building sprint:** they build the Ask FYD product path (deterministic candidate retrieval over object graph + evidence index + lexical/structural retrieval, answer generation, WHY THIS, owner correction UX, regeneration). We falsify it. We write the gold set, the generators, the state model, the invariants. We do not touch the product path to make tests pass; a broken arrow is reported as OWNER REQUEST to REACHED to DURABLE to EXECUTED to VERIFIED to EXPLAINABLE to first broken edge, never silently repaired.
- **With the JEV sprint:** they own the evaluation plane, the typed-decision contract, the shadow pipeline, and the taxonomies. We own the tiers, the gates, the corpus, and the workflows that consume JEV classifications. JEV is the judgment plane, never test truth; deterministic checks stay deterministic (hash equality, signature validity, schema validity, URL safety, permission evaluation, capability enforcement, exact replay equality, DB constraints, exit codes, HTTP status, canonical byte equality, deterministic IDs). JEV-backed tests live in nightly/weekly tiers ONLY, never merge-blocking PR gates.

---

## Filing note (Pigi)

Revised 2026-09-30 ~19:00 MDT under CEO-ORDER-600H-MASTER-DIRECTIVE-2026-09-30. The prior version's week-by-week depth (D1-D8, acceptance criteria, first-broken-edge candidates, reuse inventory, 4-writer proposal) is preserved and remapped into the master directive's 20-section per-plan template and the 0-10 / 10-20 / 20-60 / 60-80 / 80-95 / 95-100 budget. Structural changes: the domain question is now CAN WE FALSIFY THE SYSTEM AT ITS SEMANTIC OWNERS; the semantic owner is the 11 lifecycle seams (this sprint owns no product contract, it falsifies all of them); the ten shared contracts are named with TESTS as reader/proposer only; the integrated test harness contract is this sprint's coordination surface; the P0 one-SHA gate resolves the current test-suite contradiction before any sprint's gate is trusted; hostile classes are mapped per seam; the P2 integrated golden-path hostile suite is this sprint's contribution to the seventh deliverable. PLANS ONLY: no code, no commits, no installs, no execution.
