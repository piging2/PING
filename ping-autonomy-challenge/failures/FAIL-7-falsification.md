# FAIL-7 FALSIFICATION: adversarial attacks on the three survivors

**Date:** 2026-09-23. **Mode:** research only, no implementation. Falsification, not confirmation.
**Target:** the 3 surviving mechanisms in FAIL-7-clone-sitespecs.md.
**Method:** for each survivor, construct the strongest concrete adversarial case, run the survivor's own falsifiable test against it (does the test as written catch it?), then strengthen weak tests. Verdicts: WITHSTANDS, WEAKENED, FALLS.

## Verdict summary

| Survivor | Verdict | Classes still prevented | Classes no longer fully prevented |
|---|---|---|---|
| 1. Input-output variance coupling | WEAKENED | Crude #7 (identical-structure clones), genuine #4 drift | #7 against threshold gaming and d_in inflation; #4 drift direction weakened by owner-attribution false positives |
| 2. Evidence-gated composition | WEAKENED | Extreme #7 (thin graph getting rich sections), boilerplate-only sections (#5) | #7 in the median regime (similar-evidence businesses converging on the same section set); justification causality unproven |
| 3. Provenance-typed content slots | WEAKENED | Crude #5 (unbound tagline in factual slot), crude #8 (correction survival) | #5 against type-laundering via trivial bindings; #8 minting authority and stale-correction handling untested |

None FALLS outright. Every attack below has a named fix inside the mechanism's own design space, and the strengthened tests say exactly what would upgrade each verdict to WITHSTANDS.

---

## Survivor 1: Input-output variance coupling

### Attack 1A: threshold gaming on d_out (reorder, rename, retoken)

The metric measures structure (page sets, section sequences and order, component types, token selection), not meaning. A planner, or even a generic planner with a cosmetic per-tenant shuffle, can push d_out above the collapse threshold without any graph-driven differentiation:

- **Section reorder:** swap two sections. Section order is a named diff dimension, so d_out goes nonzero. Two sites with the same sections, same generic copy, same component types, different order: still the clone experience, gate passes.
- **Component rename:** the planner stamps the same component as `TestimonialCarousel` for business A and `ReviewWall` for business B. structural-diff compares component types by name, and the name is a planner-controlled label. Same component, different string, d_out inflates.
- **Token jitter:** pick theme tokens from a hash of the business name. Deterministic, so replay survives, but arbitrary: every business pair gets above-threshold d_out from token selection alone while the composition ignores the graphs completely.

The sharpest realistic version: a planner that falls back to a fixed template but derives section order and token choice from `hash(businessName)`. This is not cartoon malice; it is the natural shape of a "make each site look unique" heuristic. It satisfies the letter of the coupling invariant (d_out > threshold whenever names differ) while violating instance 2's anti-gaming rule (difference must be explainable from the graph) in every pair it touches. The verifier cannot tell name-hash jitter from graph-driven differentiation, because the metric never decomposes *why* d_out is nonzero.

**Does the written test catch it?** No. Test (ii) clones spec A with only name/description/service strings changed and asserts the gate fails the pair. That catches the naive clone but none of the three gaming variants above: a reordered clone, a renamed-component clone, and a retokened clone all pass test (ii) as written. The test suite has no gaming-injection case.

**Strengthened tests:**
- (iv) Gaming injection: take spec A, produce B by permuting section order, renaming one component, and swapping theme tokens, with byte-identical copy and section set. Assert the gate still FAILS the pair, and names which d_out dimensions were discounted as unexplained.
- (v) Explainability decomposition: the verifier must split d_out into graph-explained and unexplained components, and only explained d_out counts toward the coupling. Concretely: for each structural difference the verifier must cite the graph feature that explains it (the instance 2 rule, mechanized); differences with no citing feature are scored as gaming, not differentiation. Test (iv) is the acceptance case for this decomposition.

### Attack 1B: d_in gaming via evidence-density inflation

d_in is defined over counts: object counts by type, relationship edge counts, fact counts, evidence density. Counts are inflatable without adding information:

- **Duplicate facts:** the same phone number scraped from three pages becomes three "facts"; opening hours in the footer and on the contact page count twice. Graph A' = graph A with every fact duplicated has measured d_in(A, A') > 0 while the true input distance is zero.
- **Asymmetric inflation:** one business's graph carries duplicates, the other's does not. Measured d_in between two near-identical businesses is now large, which perverts both directions of the gate: in the collapse direction, phantom d_in makes genuine clones *more* likely to trip the gate (false positive, blocking legitimate similar businesses); in the drift direction, duplicate-count churn across regenerations creates phantom d_in movement that masks real output drift or manufactures false drift.

**Does the written test catch it?** No. No test case duplicates facts and asserts d_in stability.

**Strengthened tests:**
- (vi) Duplicate injection: d_in(graph, graph-with-every-fact-duplicated) must equal 0. This forces d_in onto deduplicated, content-hashed claims rather than raw fact counts.
- (vii) Same-count-different-content: two graphs with identical object/edge/fact counts but different content (different service types, different relationship targets) must yield d_in > 0. This is open question 1 turned into a test: counts alone are blind, and the verifier shares the planner's blindness, so "independent verifier" does not rescue a lossy distance function.

### Attack 1C: who verifies the verifier

"Independent verifier, not the planner" is an organizational claim about code, not a testable property. Three concrete weaknesses:

1. **Shared blindness:** the verifier and the planner consume the same graph schema. If the schema is lossy (attack 1B), both are blind to the same differences. Independence of authorship does not buy independence of perception.
2. **Hill-climbing access:** if the planner (or its developers, or its prompt) can observe the verifier's scores during development, the planner gets optimized against the metric. The LANE-18 self-trust lesson is cited for planner-vs-verifier, but the same lesson applies one level up: the team that tunes the planner against the verifier's corpus is grading its own homework through a laundered channel.
3. **No differential corpus:** the verifier's correctness is asserted, never measured. There is no fixed set of hand-labeled pairs (clone / genuinely different / gaming permutation / duplicate-inflated / same-count-different-content) against which the verifier must score correctly, version after version.

**Does the written test catch it?** No. The three injections test the gate end to end, never the verifier alone.

**Strengthened tests:**
- (viii) Verifier differential corpus: a frozen set of at least 20 hand-labeled graph/spec pairs covering clone, different, gaming-permutation, duplicate-inflated, and same-count-different-content cases. The verifier must classify all 20 correctly. The planner must be blind to verifier scores during generation (no score in the planner's inputs, no tuning loop against the corpus); a test asserts the planner's code path has no access to the verifier's output.

### Attack 1D: the drift direction vs owner-driven change (open question 4, weaponized)

An owner reorder ("move emergency service first") changes d_out with d_in = 0. That is exactly the drift signature, and the gate cannot distinguish it from silent fixture-drift unless output change is attributed to the three layers (SOURCE-DERIVED vs USER-OWNED vs GENERATED PRESENTATION) *before* flagging. As specified, the mechanism either false-positives on every owner edit (if blocking) or trains operators to ignore its flags (if async audit). This does not stop the gate catching genuine drift, but it degrades the drift direction from a reliable signal to a noisy one in any pipeline where owners edit.

**Does the written test catch it?** No. Test (iii) covers silent reorder as drift; there is no owner-driven-change case asserting the gate does NOT flag it.

**Strengthened test:**
- (ix) Owner-attribution case: apply an owner-layer edit (reorder via the USER-OWNED OVERRIDES path) with an unchanged source graph; assert the gate attributes the d_out change to the owner layer and does not flag fixture-drift.

### Survivor 1 verdict: WEAKENED

It still prevents the crude #7 shape named in the failure (byte-structure clones with renamed strings: test (ii) catches those) and genuine #4 drift (test (iii) catches silent reorders). But it does not prevent #7 against threshold gaming: reorder/rename/retoken and name-hash jitter produce above-threshold d_out with zero graph-driven differentiation, and the metric as specified rewards that. It does not prevent d_in inflation from corrupting both directions. The drift direction is weakened by the owner-attribution gap. The missing load-bearing piece is the explainability decomposition of d_out (strengthened test (v)): without it, the invariant measures variance, not coupling, and variance is exactly what the anti-gaming rule forbids as a target.

---

## Survivor 2: Evidence-gated composition

### Attack 2A: the evidence bar becomes the new template

The mechanism gates section emission on per-component evidence-density bars. Over a tuning cycle, the bars get set where real businesses reliably clear them, because every bar that deletes a real section generates an under-rendering complaint, and every complaint gets "fixed" by lowering the bar. The equilibrium: nearly every local service business clears the same core bars (Services, About, Hours, Contact, Reviews, Gallery). Section sets converge again, now *above* a bar instead of below a template, and the convergence is more defensible because each section can point at *some* evidence.

The realistic median pair the written test never probes: two HVAC companies, one commercial-refrigeration, one residential-install. Both clear every core bar. Both get the identical section set in the identical canonical order. The composition ignored what made the graphs different (service mix, customer type, job structure); it just did so with justified sections. The failure class is "materially different businesses get structurally identical sites," and section-set identity is most of that structure.

**Does the written test catch it?** No. The test contrasts graph A (rich: services, people, reviews) against graph B (hours plus contact only). That extreme contrast is the case any sane planner passes. There is no median-pair case: two graphs both above all bars but materially different in content.

**Strengthened tests:**
- (x) Median-pair differentiation: graph A (commercial refrigeration service mix, no Person objects) and graph B (residential install mix, Person objects with `works_for` edges), both clearing all core bars. Assert the specs differ in at least one of: section set, section ordering, component types, object cardinality within sections, or featured objects, and that every difference cites its graph cause. If the section sets are legitimately identical (good-similarity rule), assert the justification records still distinguish the pair (different cited objects/edges per corresponding section).
- (xi) Bar-tuning audit: the bars themselves are versioned and the test corpus includes the median pair; any bar change that makes the median pair's section sets converge further must be flagged in review. Bars are parameters, and parameters drift toward the template unless the test suite pins them.

### Attack 2B: justification as post-hoc rationalization

"Each emitted section carries its justification" constrains nothing about causal order. The planner can emit the section it was going to emit anyway, then scan the graph for any object or edge matching the section's justification schema and attach it. With weak evidence the citation can be nearly vacuous: the business-name fact justifying the About section, a single photo justifying a Gallery section. The justification record then *looks* like instance 2's explainability rule while being a rationalization pass over template-driven selection.

The written test performs exactly one counterfactual (strip Service objects, assert the services section disappears). One section's causality does not prove the selection function is causal; the planner can be causal on services and template-driven on everything else.

**Does the written test catch it?** Partially. The strip-services case is a real causal test, but it covers one section and the richest-evidence section at that (the easiest one to get right).

**Strengthened test:**
- (xii) Per-section counterfactual sweep: for *every* section in a generated spec, remove the objects and edges its justification cites, rebuild, and assert the section disappears or degrades to a justified thinner form. A section that survives the removal of its own cited evidence has a post-hoc justification, and the mechanism is falsified for that section. This is the causal version of the justification record, and it is the only version that means anything.

### Attack 2C: padded graphs clear the bar (Survivor 1's attack 1B, applied here)

If the bar counts raw facts rather than distinct content-hashed claims, a thin business with duplicated facts (phone number on three pages, hours in footer and contact page) clears bars it should not clear, and filler sections get emitted with "justification." The bar is then a function of scrape redundancy, not evidence.

**Does the written test catch it?** No.

**Strengthened test:**
- (xiii) Duplicate-inflation bar test: graph B (hours plus contact only) with every fact triplicated must still fail to earn the sections it failed to earn undoplicated. Bar inputs must be deduplicated claims (same content hash = one claim).

### Survivor 2 verdict: WEAKENED

It still prevents the extreme #7 shape (a hours-and-contact-only graph cannot earn a rich section set: the written test's A/B contrast holds) and the boilerplate-only-section shape for #5 (a section with zero evidence cannot be emitted). But in the median regime, where real businesses clear the same core bars, section sets converge and the mechanism has no say over the remaining differentiation surface (within-section cardinality, featured objects, ordering), which is where the clone either happens or doesn't. Justifications are post-hoc until the per-section counterfactual sweep (xii) passes. Note on scope: Survivor 2's #5 claim ("boilerplate-only sections cannot be emitted") holds at the section-existence level, but #5's real fight is inside emitted sections (unbound filler slots in justified sections), which is Survivor 3's territory. The two survivors compose; neither prevents #5 alone.

---

## Survivor 3: Provenance-typed content slots

### Attack 3A: the type constructor as single point of failure

The entire mechanism reduces to one invariant: every render string passes through a typed constructor, and no untyped path to the renderer exists. That invariant is one bypass away from decorative:

- **One legacy template** with raw string interpolation that was never migrated.
- **One `as` cast** in a hurry (`as BusinessEvidence`), which TypeScript erases without a sound.
- **One helper** that concatenates strings and wraps the result in BUSINESS_EVIDENCE by default because "the caller knows it's fine."
- **One direct renderer call** that takes plain strings, used by a new feature that didn't know the constructor existed.

TypeScript types are compile-time fiction; without a runtime brand, nothing at render time distinguishes a typed string from a bare one. The written tests exercise the constructor's rejection behavior (tests (i) and (iii)) but never verify the system property the mechanism actually claims: that *all* render paths go through the constructor.

**Does the written test catch it?** No. Tests (i)-(iii) test the constructor in isolation. There is no render-path coverage test.

**Strengthened tests:**
- (xiv) Render-boundary audit: render a full spec end to end and assert every string in the serialized output carries a runtime provenance brand (an opaque wrapper object or tagged structure that survives to serialization, not a compile-time-only type). Any bare string in the final spec fails the build. This makes bypass structurally impossible rather than conventionally avoided.
- (xv) Cast and `any` audit: a static check that fails the build on `as` casts targeting provenance types and on `any`-typed values flowing into factual slots. Brittle but real; it closes the cheapest bypass.

### Attack 3B: type-laundering via trivial bindings (predicate coverage, not binding presence)

The mechanism checks that a factual slot's string has *a* resolving binding. It does not check that the binding covers the string's factual predicates. Attack: the planner wants the AI tagline "family-owned since 1998" in a factual slot. It binds the slot to the business-name object (claimRef exists, resolves fine). The constructor sees a resolving binding and accepts. The sentence's actual factual predicates ("family-owned," "since 1998") are unbound, and the AI-generated prose has now become canonical fact wearing a BUSINESS_EVIDENCE type. This is not exotic malice; it is the path of least resistance for any planner under pressure to fill slots, and it defeats #5's stated intent ("AI-generated prose becomes canonical fact" blocked) while satisfying the mechanism's letter.

Note the doc's own phrasing already contains the stronger requirement: "a GeneratedCopySlot whose factual predicates have no resolving CopyBinding is refused." Predicates, plural, per-predicate binding. If the implementation binds per predicate, attack 3B already fails; but no test verifies it, so the property is asserted, not proven.

**Does the written test catch it?** No. Test (iii) attempts BUSINESS_EVIDENCE with *no* claimRef (rejected). There is no mismatched-binding case.

**Strengthened test:**
- (xvi) Mismatched-binding refusal: attempt to place "family-owned since 1998" in a factual slot bound to the business-name claim; assert the constructor refuses because the predicates "family-owned" and "since 1998" have no resolving bindings. Predicate coverage, not binding presence, is the gate.

### Attack 3C: OWNER_CORRECTION minting authority

OWNER_CORRECTION bindings are trusted: they override source data and survive regeneration. The written test verifies survival (test (ii)) but never asks *who can mint one*. If the planner, a prompt, or an "AI assistant drafting owner edits" can construct OWNER_CORRECTION bindings, the trusted type becomes a laundering channel: unbound AI copy enters through the highest-trust door. The three-layer separation (SOURCE-DERIVED vs USER-OWNED vs GENERATED PRESENTATION) is then conventional, not enforced.

**Does the written test catch it?** No. Minting authority is untested.

**Strengthened test:**
- (xvii) Minting-authority refusal: attempt planner-side construction of an OWNER_CORRECTION binding (no owner-action provenance, e.g., no signed edit event from the owner-input path); assert the constructor refuses. OWNER_CORRECTION must be mintable only from the user-owned-overrides path.

### Attack 3D: stale corrections block legitimate regeneration

The flip side of correction-loss prevention: a regenerated spec is rejected if a correction-typed binding has no surviving binding. But corrections go stale. The owner corrected the phone number in 2025; the business changed numbers in 2026 and the source refresh returns the new number with no trace of the old. The mechanism rejects the regeneration, and there is no retirement path for a superseded correction except owner re-intervention. The mechanism prevents #8 (correction silently lost) at the cost of blocking legitimate updates, which in an autonomous pipeline means either a stuck build or an operator override that becomes the new silent-loss channel.

**Does the written test catch it?** No. Test (ii) covers only the keep-the-correction case.

**Strengthened test:**
- (xviii) Correction-retirement path: a source refresh that contradicts a correction must produce a typed supersede event (correction marked SUPERSEDED with the contradicting source evidence attached), not a silent drop and not a stuck build. Assert the retirement event exists in the record and the new spec renders the new value.

### Attack 3E: the boilerplate budget hole (open question 6, weaponized)

GENERATED_BOILERPLATE is allowed when labeled, and its fraction feeds Survivor 1's d_out as a clone-proneness signal. But there is no maximum boilerplate fraction per page (the doc's open question 6). A fully generic clone site, every string honestly typed GENERATED_BOILERPLATE, passes Survivor 3 completely: no factual slot is violated because no factual claims are made. Typing has then labeled the failure without preventing it. The defense "Survivor 1 catches it via the boilerplate fraction signal" only works if the fraction actually feeds d_out with a calibrated threshold, which does not exist yet.

**Does the written test catch it?** No. No test renders an all-boilerplate spec.

**Strengthened test:**
- (xix) Boilerplate-budget refusal: a page exceeding the maximum boilerplate fraction fails the build, not merely flags. (Requires the budget number from open question 6 to exist; the test asserts the budget is enforced, whatever its value.)

### Survivor 3 verdict: WEAKENED

The tested shapes hold: crude unbound copy in a factual slot is refused (#5, tests (i)/(iii)), and an owner correction survives a contradicting source refresh (#8, test (ii)). But the quarantine is one bypass away from decorative (attack 3A: no render-path coverage test), binding presence without predicate coverage allows type-laundering of AI prose through trivial bindings (attack 3B, which defeats #5's intent while satisfying its letter), OWNER_CORRECTION minting authority is untested (attack 3C), and stale corrections can wedge regeneration (attack 3D). The boilerplate budget hole (3E) means an honestly-labeled clone passes Survivor 3 untouched. Each attack has a fix inside the mechanism's design space: runtime brands plus the render-boundary audit (xiv), per-predicate binding coverage (xvi), minting authority tied to the owner-input path (xvii), a typed supersede path (xviii), and an enforced boilerplate budget (xix). Until those tests exist and pass, the mechanism prevents the crude instances of #5 and #8, not the realistic ones.

---

## Cross-cutting findings

1. **All three survivors share a single upstream dependency: the honesty of the graph.** Duplicate facts, scrape redundancy, and lossy count-based distances corrupt Survivor 1's d_in, inflate Survivor 2's evidence bars, and give Survivor 3's bindings vacuous claimRefs to launder through. A deduplicated, content-hashed evidence layer is the common precondition none of the three establishes. The strengthened tests (vi), (xiii), and (xvi) are three faces of the same requirement.

2. **The anti-gaming rule is asserted but unmechanized.** Instance 2's rule (every structural difference explainable from the graph) is the load-bearing constraint for Survivors 1 and 2, but neither survivor's written tests enforce it. Survivor 1 needs the explainability decomposition (v); Survivor 2 needs the per-section counterfactual sweep (xii). Until those exist, both survivors measure the *appearance* of graph-coupling, which is exactly what a gaming planner optimizes.

3. **#5 is prevented by composition, not by any single survivor.** Survivor 2 blocks evidence-free sections; Survivor 3 blocks unbound slots. The realistic #5 shape (a justified section padded with unbound filler slots, or AI prose laundered through a trivial binding) lives in the gap between them. The falsification-relevant test is the composed one: justified section plus filler slots, run through both gates.

4. **Test-strength pattern.** Every written test in FAIL-7 probes the crude attack and passes it. Every realistic attack above (gaming permutations, median pairs, trivial bindings, bypass paths, minting authority) is untested. The test suites as written prove the mechanisms work against the naive adversary; they do not prove the mechanisms work at all against the adversary the mechanisms were built for.

## What would upgrade each verdict to WITHSTANDS

- **Survivor 1:** implement the d_out explainability decomposition with the gaming-injection test (iv) as its acceptance case; move d_in to deduplicated content-hashed claims with tests (vi) and (vii); add the verifier differential corpus with planner blindness (viii); add owner-layer attribution for the drift direction (ix).
- **Survivor 2:** add the median-pair differentiation test (x); run the per-section counterfactual sweep (xii) on every spec in CI; deduplicate bar inputs (xiii); version the bars with convergence monitoring (xi).
- **Survivor 3:** make provenance a runtime brand and enforce the render-boundary audit (xiv); require per-predicate binding coverage (xvi); restrict OWNER_CORRECTION minting to the owner-input path (xvii); add the typed supersede path (xviii); enforce a boilerplate budget (xix).
