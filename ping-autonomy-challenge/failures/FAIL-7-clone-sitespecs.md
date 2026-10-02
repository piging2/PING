# FAIL-7: CLONE SITESPECS - mechanism hunt

**Failure class:** two materially different businesses get rendered sites that are structurally identical (same sections in the same order with the same generic copy, differing only in the business name). The composition layer ignored what made the graphs different.
**Date:** 2026-09-23. **Mode:** research only. No implementation.

## (a) Grounding: the real instances

General shape: a generator whose output variance is far lower than its input variance, with no signal when differentiation collapses.

**Real instance 1 - the acceptance standard (memory/2026-09-21.md L653-655).** FYD's two-site compiler milestone carries a structural-difference acceptance standard: two generated SiteSpecs that differ only in company name, description, or service strings are NOT materially different. The graph must change the experience, shown through differences in sections selected, section ordering, component types, object cardinality, relationship-driven sections, navigation, featured objects, available capabilities, or content density. The named broken step is exact: "If the two SiteSpecs are structurally identical despite materially different graphs: STOP. NEW FIRST BROKEN STEP: SITE PLANNER IS TOO GENERIC." The planner must then be fixed generically, never patched per customer.

**Real instance 2 - the anti-gaming constraint (memory/2026-09-21.md L657).** The same ruling that names the failure also forbids its fake cure: "deterministic similarity is GOOD when the underlying evidence is similar," and any structural difference must be explainable from the graph (e.g. Website B has multiple Service objects, therefore a Services section was generated), never an arbitrary AI layout choice. So a mechanism that prevents clones by demanding arbitrary difference is itself a failure; the requirement is coupling between input distance and output distance, not output variance maximization.

**Real instance 3 - the passing shape (memory/2026-09-21.md L712).** The structural-difference gate passed on two real acquisitions. Happy Place: 15 direct facts, 2 objects, 1 relationship, SiteSpec digest `bc4148b93231eb46...`, 7 sections, 2 pages. Coppersmith: 38 facts, 4 objects, 3 relationships, digest `473c9d97546ef9cd...`, 8 sections, 3 pages. Same proceduralizer and renderer, zero per-customer templates or conditionals. The differentiating mechanism was visible: Coppersmith's person and external-identity objects plus `works_for`/`links_to` relationships produced an additional Explore/ObjectFeed page and navigation item. This is what the failure's absence looks like: graph features became structural features.

**Real instance 4 - the dogfood fail condition (memory/2026-09-21.md L669-671).** FYD's dogfood milestone lists eight hard fail conditions, one of which is exactly this class: "If the generator produces the same generic template for both: FAIL." Two sibling conditions sit adjacent and matter for mechanism selection: "If the site contains claims without evidence: FAIL" (#5) and "If user customization is destroyed on regeneration: FAIL" (#8).

**Real instance 5 - the in-code machinery.** The codebase already carries the prototype of the cure. `src/fyd/builder/structural-diff.ts` is a pure function of two specs (page sets, per-page section component sequences and order, theme token selection, presence mode, archetype stamp; copy compared structurally, never semantically) that reports `materiallyDifferent` plus human-readable reasons, and it stamps the planner version into the record. `planner.ts` states the boundary as law: "the planner NEVER manufactures business facts; every section comes from the existing generator's data-driven output." `generated-presentation.ts` makes ungrounded copy fail closed: a GeneratedCopySlot whose factual predicates have no resolving CopyBinding is refused, and the planner throws rather than produce a spec with unverified copy. `canonical.ts` supplies `semanticDigestOf` for spec identity. The three-layer state separation (memory/2026-09-21.md L665-667: SOURCE-DERIVED STATE, USER-OWNED OVERRIDES, GENERATED PRESENTATION) names the layers any output-change attribution must respect.

## (b) Surviving mechanisms

Hard rule applied: a candidate survives only if it prevents at least 2 of the 9 failure classes, with a crisp reason per class. Each survivor gets a falsifiable test.

---

### Survivor 1: Input-output variance coupling (the differentiation metric)

**How it works.** Define a distance on inputs d_in (object graphs: object counts by type, relationship edge counts by type, fact counts, evidence density) and a distance on outputs d_out (rendered SiteSpecs: the structural-diff dimensions of page sets, section sequences and order, component types, token selection, presence mode). The invariant is coupling: d_out must track d_in monotonically. This one invariant catches the class in two directions. Collapse direction: d_in large, d_out near zero is clone-sitespecs (#7), and the build fails. Drift direction: d_in near zero, d_out above threshold is fixture-drift (#4), and regeneration is flagged. One checker, one record (graph digests, spec digests, planner version), two verdicts.

Two properties keep this honest. First, the anti-gaming half from instance 2: the invariant is coupling, not a floor on d_out. Two graphs with near-identical evidence SHOULD produce near-identical specs, and the checker must pass them; a checker that demands difference when d_in is small is falsified by design. Second, the measurement is computed by an independent verifier, not the planner that generated the specs. This is the LANE-18 self-trust lesson (the worker grading its own homework): the planner's own attestations cannot be the evidence that differentiation held. `structural-diff.ts` already models the right shape: a pure function of the two specs with the planner version as a stamped label, not as trusted input.

**Prevents 2 classes:**

- **#7 clone-sitespecs:** the collapse direction is the class itself. Two graphs with large d_in (different services, different evidence, different relationship structure) that produce specs with d_out below the collapse threshold fail the build instead of shipping as identical sites.
- **#4 fixture-drift:** the drift direction is the same metric run across time instead of across tenants. A regenerated spec whose d_out from the stored canonical digest exceeds the drift threshold while the input graph digest is unchanged is silent output change, caught at the same gate.

**Falsifiable test.**

- Input: the two real corpora in `src/fyd/proceduralize/raw/` (Happy Place index.html, Coppersmith index.html + rss.xml), whose graphs are known to differ (15 facts/2 objects/1 rel vs 38 facts/4 objects/3 rels).
- Procedure, three injections. (i) Build both specs through the same pipeline; compute d_in and d_out; assert the gate passes with d_out above the collapse threshold. (ii) Clone injection: take spec A, change only business-name/description/service strings, feed it back as spec B; assert the gate FAILS the pair and names the collapse direction. (iii) Drift injection: regenerate spec A from a byte-identical graph with one section silently reordered; assert the gate flags drift and names the direction.
- Expected observable outcome: (i) passes with recorded reasons citing which graph features produced which structural differences; (ii) and (iii) fail loudly at the gate, never silently.
- Proves the mechanism DOESN'T work: if the renamed clone in (ii) passes the gate, or the reordered regeneration in (iii) passes, the metric is decorative. Symmetrically, if a pair of genuinely near-identical graphs is failed for insufficient difference, the anti-gaming half is broken and the mechanism is falsified.

---

### Survivor 2: Evidence-gated composition (graph-driven section selection)

**How it works.** The planner's menu of possible sections and components is generic, but selection and ordering are a pure function of graph content: a section is emitted only if the graph supplies the object types, relationship edges, and bound facts needed to populate its slots, above a per-component evidence-density bar. No section exists "because the template has one." Coppersmith's person and external-identity objects plus `works_for`/`links_to` edges producing the Explore/ObjectFeed page is the canonical positive instance; Happy Place's thinner graph producing fewer sections and pages is the canonical negative instance. Each emitted section carries its justification (which objects and edges triggered it), so any section's existence is explainable from the graph, per instance 2's explainability rule.

**Prevents 2 classes:**

- **#7 clone-sitespecs:** two different graphs cannot land on identical section sets unless their evidence is actually similar, because selection tracks graph shape. A generic template (the named broken step, "site planner is too generic") is impossible by construction: the planner has no fixed section list to fall back on.
- **#5 claim-binding:** a section can only render the factual slots its backing evidence can bind, because the section would not exist without that evidence. Boilerplate-only sections (the classic "Why Choose Us" with zero bound facts) cannot be emitted, so there is no rendering surface for unbound claims to attach to. This composes with the existing CopyBinding machinery: evidence gating decides which sections exist, binding verification decides which slots inside them may carry factual text.

**Falsifiable test.**

- Input: graph A (multiple Service objects, Person objects, `works_for` edges, Review objects) and graph B (opening hours and contact facts only, same pipeline, same planner version).
- Procedure: run the planner on both; capture the section-justification record (which objects and edges justified each section). Assert: A has strictly more sections than B; every section in both specs cites at least one graph object or edge; the relationship-driven section appears only where the edge exists. Then strip all Service objects from graph A while keeping the business name, and rebuild; assert the services section disappears rather than rendering generic service boilerplate.
- Expected observable outcome: section sets differ in ways each justified by graph content; the stripped graph yields a thinner spec with no filler sections.
- Proves the mechanism DOESN'T work: if graph B (hours plus contact only) yields the same section set as graph A, the planner ignored evidence density and selection is template-driven. If the stripped graph keeps a services section filled with generic copy, the gate leaks and the mechanism is falsified.

---

### Survivor 3: Provenance-typed content slots (generated-copy quarantine)

**How it works.** Every render string is typed at construction: BUSINESS_EVIDENCE (bound to an object field with a claim ref), OWNER_CORRECTION (bound to a user-owned override), or GENERATED_BOILERPLATE (template filler with no factual predicates). Factual slots accept only BUSINESS_EVIDENCE or OWNER_CORRECTION; a slot whose text makes a factual claim without a resolving binding is refused fail-closed, and the build throws rather than emit the spec. This is the `generated-presentation.ts` machinery (CopyBinding, "ungrounded-copy" refusal) generalized from a copy rule into a type carried on every render string. The boilerplate type does two jobs: it labels filler honestly so it can never masquerade as business-specific content, and its fraction per page becomes a measurable signal that feeds Survivor 1's d_out (a spec that is 90 percent boilerplate-typed copy is clone-prone even when its section names differ).

**Prevents 2 classes:**

- **#5 claim-binding:** an AI-generated sentence with a factual predicate cannot enter a factual slot, because no factual slot accepts an unbound string. "AI-generated prose becomes canonical fact" (dogfood fail condition) is blocked at the type constructor, not at review time.
- **#8 correction-loss:** OWNER_CORRECTION-typed bindings are the type-level enforcement of the USER-OWNED OVERRIDES layer. A regenerated spec is rejected at composition if a correction-typed binding present in the previously accepted spec has no surviving binding in the new one. Correction loss stops being discovered by the owner later and becomes a build failure now. This is the same three-layer separation from instance 5, enforced by types rather than convention.

**Falsifiable test.**

- Input: a spec containing an accepted OWNER_CORRECTION binding (owner corrected the phone number) and a candidate generated tagline carrying a factual predicate ("family-owned since 1998") with no binding.
- Procedure, three attempts. (i) Attempt to place the unbound tagline into a factual slot; assert the build throws (fail-closed refusal). (ii) Run a source refresh that returns the old phone number, regenerate, and assert the rendered phone still equals the correction and the correction-typed binding survives in the new spec. (iii) Attempt to construct the AI tagline as BUSINESS_EVIDENCE with no claimRef; assert the constructor rejects it.
- Expected observable outcome: unbound copy never reaches a factual slot; the owner correction survives a source change that contradicts it; every rendered factual string traces to a binding.
- Proves the mechanism DOESN'T work: if the regenerated spec in (ii) renders the stale source phone while the build reports success, the override layer is conventional, not typed, and the mechanism is falsified. If the unbound tagline lands in a factual slot in (i) or (iii), the quarantine is decorative.

## (c) Cut list

Each candidate below was judged against the hard rule (must prevent at least 2 of the 9 classes). All fail it, each for one stated reason.

- **Output variance maximization (demand arbitrary difference to pass).** CUT: violates the good-similarity rule (memory/2026-09-21.md L657, "deterministic similarity is GOOD when the underlying evidence is similar"); it prevents #7 only by gaming the metric and manufactures the arbitrary-layout failure the ruling explicitly forbids.
- **More template variants (a bigger fixed template menu).** CUT: variance without evidence coupling; the planner can still select the same template twice, so clone-sitespecs recurs, and no second class is touched.
- **Random per-tenant layout jitter.** CUT: destroys deterministic replay (dogfood fail condition, "must survive replay"); prevents nothing systematically and makes #4 fixture-drift strictly worse.
- **Copy-level similarity checks across sites (text overlap, cosine similarity).** CUT: fails the #7 shape itself, which is structural identity; two structurally identical sites with paraphrased copy pass, and no other class is affected.
- **LLM-as-judge uniqueness scoring.** CUT: non-deterministic, unexplainable, and the planner grading its own homework through a larger model (the LANE-18 self-trust flaw); prevents nothing verifiably across regenerations.
- **Human review of every generated site before publish.** CUT: a non-scalable gate, not a build property; it prevents nothing across regenerations and cannot run inside the autonomous pipeline.
- **Reusing or caching one spec across tenants.** CUT: that is the failure itself, not a prevention; it guarantees clones by construction.
- **Outright ban on duplicate structures (reject any two identical specs).** CUT: subsumed by Survivor 1's coupling invariant, and without the d_in half it rejects legitimately similar businesses, violating the good-similarity rule.

## (d) Open questions

1. **d_in design.** Object and relationship counts are crude. Two businesses can have identical counts with entirely different content. Is there a content-sensitive, deterministic graph distance (typed object signatures, edge-type profiles, evidence-density vectors) that stays cheap enough to run per build?
2. **Threshold calibration.** The collapse threshold and the drift threshold are the load-bearing numbers in Survivor 1, and no numeric bar exists today. Who sets them, are they per-archetype or global, and how is the calibration itself kept explainable rather than becoming the arbitrary choice the good-similarity rule forbids?
3. **Evidence-density bar per section.** Survivor 2 needs "enough evidence to justify a section." Too high deletes real sections (under-rendering); too low lets boilerplate sections through (clone by filler). Is the bar per component type, and is it owner-tunable without becoming customer-specific code?
4. **Owner intent vs drift attribution.** An owner reorder ("move emergency service first") changes d_out with no d_in change, which is Survivor 1's drift signature. Does the drift direction attribute output change to the three layers (SOURCE-DERIVED vs USER-OWNED vs GENERATED PRESENTATION) before flagging, so owner-driven change is never misreported as fixture-drift?
5. **Gate placement.** Does the variance-coupling gate run blocking inside every build, or as an async audit over the spec registry? Blocking doubles build cost and adds a failure point; async misses the failure until after a clone has shipped.
6. **Boilerplate budget.** If GENERATED_BOILERPLATE slots are allowed when labeled, can an entire clone site pass as "honestly labeled boilerplate"? Survivor 3 needs a maximum boilerplate fraction per page, otherwise typing is just labeling the failure.
7. **Comparison scope at scale.** Survivor 1 compares pairs. With hundreds of generated sites, is the check all-pairs (O(n^2)) or against a fingerprint registry keyed on `semanticDigestOf`? Is digest equality plus a threshold on the structural-diff distance sufficient, or does the registry need the full pairwise record?

---

**Sibling cross-references.** FAIL-2 (unsafe-url) Survivors 1 and 2 and FAIL-5 (claim-binding) independently converged on schema-typed trust and sink-side verification; Survivor 3 above is the same type-carries-trust pattern applied to content provenance, which suggests the pattern is genuinely general rather than class-specific. The independent-verifier property in Survivor 1 cites LANE-18's self-trust finding (the worker grading its own homework) from the wave-1 harvest pool.
