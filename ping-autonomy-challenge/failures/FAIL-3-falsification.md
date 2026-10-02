# FAIL-3 FALSIFICATION: adversarial attacks on the four survivors

**Date:** 2026-09-23. **Mode:** research only. No implementation code.

**Method.** Each survivor's own falsifiable test is treated as the contract. For each survivor I construct the strongest concrete adversarial case, run the written test against it, and report whether the test as written catches the attack. Weak tests get strengthened. Verdicts: WITHSTANDS (the attack fails; claims hold as specified), WEAKENED (one or more claimed classes no longer prevented, or claims hold only under added conditions the mechanism does not specify), FALLS (the mechanism does not prevent what it claims).

**Grounding** (from FAIL-3 and the live tree):
- Coppersmith: `flattenJsonLd` did not recurse into `@graph`; Rank Math JSON-LD contributed zero facts; 7 nodes invisible, zero signal.
- Verified repair: `jsonld@9.0.0` pinned; 7 nodes became 11 visited nodes, 38 facts, 4 objects, 3 relationships; no custom JSON-LD processor.
- Live blindness, verified 2026-09-23 in `~/workspace/fyd-lane/onboarding/extractor.ts`, `parseJsonLd`: a block shaped `{"@context": ..., "@graph": [...]}` fails the business-`@type` check on the wrapper object, so the entire block is skipped and the function returns null for it. Malformed JSON-LD hits `catch { // Malformed JSON-LD is not evidence; ignore. }` and vanishes without a count.

**A test-strength rule applied throughout.** A falsifiable test whose procedure step is "inspect" or "check" by a human is not a gate; it is a suggestion. Falsifiability requires an executable assertion that fails without human judgment. Several tests below fail on this ground before any adversarial input is introduced.

---

## Survivor 1: Shape-coverage fixture registry

Claims to prevent: #3 graph blindness, #4 fixture-drift.

### Attack 1A: the test's counterfactual is not the failure class

The written test's case (i): "add form (i) to the extractor's accepted handling without a registry entry, then run the coverage gate," expecting the gate to fail with "unregistered accepted shape."

The historical failure: nobody added `@graph` to accepted handling. The extractor REFUSED the wrapper (no business `@type` on the wrapper object) and moved on. A coverage gate enforcing "every accepted shape has a fixture" is green in exactly the Coppersmith configuration: the extractor accepts bare nodes and top-level arrays (both registered, fixtures green) and refuses `@graph` wrappers (not accepted, so no fixture required, no gate failure). The blindness persists under a green gate.

The gate can only catch case (i) if it can mechanically detect "accepted handling." Two candidate implementations, neither specified by the mechanism or its test:

(a) **Declare-at-use dispatch.** The extractor routes every block through an exhaustive switch over a registry enum; adding a shape means editing the enum; the gate asserts every variant has a passing fixture. This works, but it is an architectural constraint the mechanism never states, and the live `extractor.ts` does not have it: its acceptance is emergent (wrap-non-array-in-array plus a `@type` regex), not declared.

(b) **Differential shape fuzzing.** Feed generated shapes through the extractor, observe which produce output, demand fixtures for those. But the fuzzer's shape generator defines the enumerable universe; a shape the generator cannot produce is invisible to the gate. The gate's oracle is then the fuzzer, which has the same unknown-shape problem as the extractor.

**Does the written test catch Attack 1A? No.** The test assumes the gate detects acceptance. The Coppersmith-shaped refusal, the actual failure class, is outside the test's counterfactual entirely.

### Attack 1B: fixtures pin output; they do not verify correctness

The #3 crisp reason claims "the `flattenJsonLd` bug cannot land because the fixture fails the moment `@graph` nodes are dropped." That assumes the `@graph` fixture's expected output already encodes CORRECT behavior (all nodes extracted). If the `@graph` fixture had been authored while the bug was live, its pinned expected output would be 0 facts, and the registry would then FAIL THE REPAIR: fixing `@graph` breaks the fixture, and updating the fixture to bless the new output is a human judgment the gate cannot check. The registry prevents drift-from-pinned; it does not prevent blindness-at-birth. The fixture author is the same team that wrote the extractor, so the fixture is a self-portrait, not an independent oracle.

Concrete: register the `@graph` wrapper shape today against the live `extractor.ts`. The honest pinned output is null (the block is skipped). Fixture green. The blindness is now PINNED: a future repair that extracts the 7 nodes breaks the fixture, and the path of least resistance is to revert the repair, not to question the fixture.

**Does the written test catch Attack 1B? No.** Case (iii) (halving entities for a registered shape) tests drift from a known-good pinned output. Nothing in the test establishes that the pinned output was ever correct. The test never asks who authored the expected output or against what oracle.

### Attack 1C: registry granularity vs the real bug location

The registry enumerates TOP-LEVEL shapes (bare node, top-level array, `@graph` wrapper...). The Coppersmith blindness lived in the INTERACTION of top-level form with the `@type` filter: the wrapper form was fine, the filter applied to the wrapper instead of the nodes was the defect. A registry entry "@graph wrapper" with a bug-contemporary fixture passes (Attack 1B); a registry entry authored correctly requires the author to already know the correct traversal. Either way the registry's unit of coverage (top-level form) is coarser than the bug's location (filter application point). A shape-level registry cannot see filter-level blindness, e.g. a `@type` regex that misses a valid business type on an otherwise registered shape.

### Test-strength assessment

The test is half a gate. Case (iii) is a genuine executable assertion for #4 drift-from-pinned. Cases (i) and the mutated-fixture case assume, without constructing, the gate's detection of "accepted" and the fixture's correctness. The procedure never specifies how the gate observes acceptance, making case (i) unexecutable as written.

### Strengthened test

1. Require declare-at-use dispatch: the extractor's shape handling is an exhaustive switch over the registry enum; the gate fails the build if any enum variant lacks a passing fixture AND fails the build if shape-handling code exists outside the switch (grep-level structural check, not behavioral).
2. Require an independent fixture oracle: expected outputs for registry fixtures must be generated or cross-checked by an implementation of different lineage than the extractor (this is Survivor 4's job; the registry alone cannot do it). A fixture whose expected output was hand-written by the extractor's author is marked `oracle: self` and does not count toward #3 coverage.
3. Add the refusal counterfactual the original test omitted: feed a valid shape the extractor does NOT accept (the live `@graph` wrapper against `extractor.ts`); assert the outcome is either a registered acceptance with a fixture or a quarantine routing (Survivor 3), never a silent null. This makes the registry-quarantine boundary (open question 3) an executable assertion: the union of registry acceptance and quarantine routing must be total over observed shapes.

### Verdict: WEAKENED

- **#4 fixture-drift: HOLDS**, given correctly-authored fixtures. Pinned per-shape expected outputs with a failing assertion on change is a real drift detector for drift-from-pinned.
- **#3 graph blindness: NO LONGER PREVENTED as specified.** Attack 1A shows the gate is green during the exact historical failure (refusal is not acceptance). Attack 1B shows the fixture pins whatever output existed at authoring time, including the bug. The #3 claim requires two conditions the mechanism does not specify: declare-at-use dispatch (so "accepted" is observable) and an independent fixture oracle (so "pinned" means "correct").
- Consequence under the challenge's own hard rule (must prevent >=2 classes): Survivor 1 as specified is a one-class mechanism (#4 only). It recovers the #3 claim only jointly with Survivor 3 (refusal routing) and Survivor 4 (fixture oracle). The survivors are not independent; see the dependency map at the end.

---

## Survivor 2: Extraction receipts with unexplained-drop alerts

Claims to prevent: #3 graph blindness, #4 fixture-drift, #8 correction-loss.

### Attack 2A: candidate counting presupposes the missing capability

The written test expects: "the `@graph` page's receipt shows 7 unexplained drops and triggers the alert." For the receipt to show 7 candidates, the receipt layer must enumerate the 7 nodes inside `@graph`. Enumerating nodes inside `@graph` IS recursing into `@graph`: the exact capability whose absence is the failure. The test's expected observable assumes the fix.

The only candidate definition implementable WITHOUT presupposing the fix is block-level: candidates = `ld+json` script blocks found (regex matches), each with a top-level shape label and an outcome. Against the live `extractor.ts`, the Coppersmith page then yields: 1 block found, top-level shape `@graph-wrapper`, 0 emitted. Is the drop explained or unexplained? That depends on the reason-code vocabulary, which the mechanism does not define. If `unrecognized-shape` (or `failed-type-filter`) is a legal reason code, the receipt reads "1 candidate, 0 emitted, 1 explained exclusion": zero unexplained drops, no alert, blindness persists with a receipt certifying that everything is accounted for. If `unrecognized-shape` is NOT a legal reason code, then the receipt forces the extractor to recognize every shape it encounters, which is the closed-registry requirement: the receipt IS Survivor 1 with arithmetic, not an independent mechanism.

**Does the written test catch Attack 2A? No.** The test's expected outcome (7 unexplained drops) is inconsistent with the only implementable candidate definition that does not assume the traversal fix. The test never specifies the candidate definition, so it cannot distinguish "7 candidates counted by an @graph-aware traversal" (fix assumed) from "1 candidate, explained away" (blindness persists, alert silent).

### Attack 2B: reason-code laundering

The invariant is `unexplained_drops = candidates - emitted - explained_exclusions`, with the alert on nonzero unexplained drops. The falsification condition in the test: "if any dropped candidate can appear in neither the emitted set nor the receipt's excluded set... the receipt is a vanity log." This misses the laundering path: the dropped candidate appears in the EXCLUDED set with a reason code minted by the same team that wrote the extractor. Concrete: add reason code `non-business-shape` and route every `@type`-filter failure there, including `@graph` wrappers whose inner nodes were never examined. Unexplained drops stay zero forever. The alert never fires. The receipt is a vanity log WITH perfect arithmetic, and the test's falsification condition passes because every candidate appears in the excluded set.

The test's own hard case backfires: "malformed JSON-LD that the extractor 'ignores' today must appear as a counted, reason-coded exclusion, not as absence." In the live `extractor.ts`, malformed JSON hits the catch-and-ignore branch. Counting it as a reason-coded exclusion moves it into the EXPLAINED bucket, which SUPPRESSES the alert. The test conflates "appears in the receipt" with "triggers the alert": a receipt can account for everything and alert on nothing.

**Does the written test catch Attack 2B? No.** Its falsification condition covers accounting holes but not reason-code laundering, and its malformed-JSON hard case rewards the laundering.

### Attack 2C: #4 via receipts detects count-drift only, and the diff is manual

The #4 crisp reason: "diffing receipts across two regens over identical input exposes drift." The receipt as specified carries counts (blocks found, node counts, candidate fact counts, emitted counts). Drift can be semantic with identical counts: same 38 facts emitted, but a phone number parsed differently, hours reformatted, an address truncated after a dependency update. Two regens with different fact VALUES and identical counts produce identical receipts; the diff is clean; the drift passes unnoticed. The test's regen pair only varies counts, so it never probes content-drift.

Further, the test procedure says "inspect each receipt" and "run the regen pair and diff the two receipts": manual steps. A #4 detector that requires a human to run the diff on every regen is not a mechanism; it is a runbook. And open question 1 (where receipts live) decides whether the regen-pair diff is even cheap enough to run per regen at perpetual-onboarding scale: extraction-local files make it a file-comparison chore the loop will skip; PING observations make it a query.

**Does the written test catch Attack 2C? Partially.** It catches count-drift across regens (genuine), but not content-drift, and the manual procedure means the detection is not actually wired to fire.

### Attack 2D: the #8 claim is untested

The #8 crisp reason: "a receipt that reconciles corrections-in against corrections-surviving-in-output across a regen catches silently dropped corrections." The test's inputs contain no correction, no correction ID, no regen with a correction present in run 1 and absent in run 2. The entire #8 claim is asserted, never exercised. Open question 7 is load-bearing here: the owner loop already verifies corrections surviving regen (memory/2026-09-23) with its own correction IDs. If the receipt invents parallel bookkeeping with different IDs, the two can drift apart (the receipt says the correction survived; the owner loop says it did not, or vice versa). The mechanism does not state which correction IDs it reconciles.

**Does the written test catch Attack 2D? No.** There is no correction-loss case in the test at all.

### Test-strength assessment

The invariant is real and well-formed, but the test leaves the three load-bearing definitions unspecified: what counts as a candidate, what reason codes are legal and who mints them, and what the regen diff compares. The expected outcome for the `@graph` page assumes the traversal fix. Two of three claimed classes (#4 content-drift, #8) are untested or under-tested, and the procedure's manual steps are not a gate.

### Strengthened test

1. Pin the candidate definition: candidates are counted at the block level (script blocks found) PLUS node-level counts produced ONLY by a traversal the test also verifies. Add a negative control: run the receipt layer against the live blind `extractor.ts` and assert the test FAILS (does not produce "7 unexplained drops"). A receipt test that passes against the blind extractor is testing the fix, not the mechanism.
2. Close the laundering path: reason codes must carry the evidence for the check the candidate failed (e.g. `failed-type-filter` must record the `@type` value actually seen, including undefined). Add an alert on explained-but-unrecognized volume: if exclusions with reason `unrecognized-shape` exceed a budget (per page or per time window), alert. Unexplained-drop alert alone is insufficient.
3. Regen diff: compare content hashes of emitted facts, not just counts; and make the diff an automated gate over receipts in their specified store (answering open question 1), not a manual inspection.
4. #8 case: correction C applied to business B with the owner loop's correction ID; regen; assert the receipt reconciles C-in against C-in-output BY THAT ID, and fails if the IDs diverge (open question 7 made executable).

### Verdict: WEAKENED

- **#3 graph blindness: WEAKENED, and the strong claim ("silent loss becomes impossible by construction") is falsified.** The invariant genuinely catches drops the traversal can see but the emitter drops. Against the observed failure (traversal itself blind; wrapper fails the `@type` check; malformed JSON ignored in a catch), the receipt shows zero unexplained drops via block-level counting plus reason-code laundering, and no alert fires. The "7 candidates, 0 emitted" receipt in FAIL-3's telling assumes an @graph-aware candidate counter, which is the fix wearing a receipt costume.
- **#4 fixture-drift: WEAKENED to count-drift.** Count changes across regens are caught (if the diff is automated and receipts are queryable). Content-drift with stable counts is invisible to the receipt as specified.
- **#8 correction-loss: NOT PREVENTED as tested.** No correction case exists in the test; the claim depends on reconciling the owner loop's correction IDs, which the mechanism does not specify (open question 7).
- Under the hard rule, Survivor 2 as specified prevents #3 only in its narrow form (seen-but-dropped) and #4 only for count-drift: roughly one and a half classes, with #8 aspirational.

---

## Survivor 3: Unknown-shape quarantine

Claims to prevent: #3 graph blindness, #9 conflict-collapse.

### Attack 3A: quarantine-everything noise (the adversarial web)

The mechanism: "Shapes in the known set are processed normally; any shape outside the set is routed to quarantine" with a typed gap event per item. Run this against 100 real business homepages. A typical WordPress + Rank Math page carries 8-15 JSON-LD blocks: WebSite, Organization, WebPage, BreadcrumbList, Article, FAQPage, ItemList, SearchAction, plus ad-tech and widget blocks with exotic shapes. The extractor's business-relevant known set is small (bare business node, business `@graph`, top-level arrays thereof). Everything else is "outside the set":

- If "known" means "shapes the extractor can process," the known set must include every common schema.org shape, which reintroduces the registry-maintenance problem (Survivor 1) and the boundary question (open question 3) with no executable answer.
- If "known" means "business-relevant shapes," then every WebSite, BreadcrumbList, and SearchAction block on every page becomes a quarantine item with a gap event. At perpetual-onboarding scale that is thousands of gap events per day, ~all of them non-actionable. The signal (one novel business shape per month) drowns. Per open question 2's own warning, a quarantine nobody can drain is a second /dev/null with better labeling, and the noise guarantees nobody drains it.

The written test uses three hand blocks and never measures signal-to-noise. Its control (iii), a normal bare-node block, dodges the common real cases (WebSite block, BreadcrumbList block) that decide whether the mechanism survives contact with the web.

An adversarial variant: pages where each block carries a unique novel top-level key (`widgetData`, `customNs:thing`, per-plugin namespaces). Each is a distinct "unknown shape" producing its own quarantine entry and gap event. The mechanism has no structural-signature dedup (cluster by sorted top-level keys ignoring values), no per-signature rate limit, and no storage budget. Quarantine storage grows unboundedly; the gap feed is pure noise; a genuinely novel business shape is undiscoverable inside it.

**Does the written test catch Attack 3A? No.** It tests the write path on toy input and never measures quarantine volume, dedup behavior, or drain.

### Attack 3B: the classifier boundary the test dodges

In the Coppersmith instance, is the `@graph` wrapper "unrecognized" (quarantine + gap event) or "recognized but non-business" (silent skip, like a WebSite block)? The live `extractor.ts` treats them identically: the wrapper's `@type` is undefined, a WebSite block's `@type` is "WebSite", both fail the business regex, both are skipped. A top-level-shape classifier that runs BEFORE processing sees keys `@context`/`@graph` for the wrapper and `@type: WebSite` for the WebSite block. To route the wrapper to quarantine while silently skipping the WebSite block, the classifier must know that `@graph` is a container worth opening: again the traversal knowledge, or a registry lookup (Survivor 1) that lists `@graph`-wrapper as known. The mechanism's "classifies every block's top-level shape before processing" hides the entire difficulty in the word "classifies," and the test's control (iii) is a business bare node, which never forces the classifier to distinguish "known non-business, skip silently" from "unknown, quarantine loudly."

Concrete discriminator the test must include but does not: a WebSite-typed bare node (must process-or-skip with NO gap event), a BreadcrumbList block (same), and an `@graph` wrapper containing only a WebSite node (quarantine or not? the mechanism as written has no answer; either answer needs a stated rule).

**Does the written test catch Attack 3B? No.** The control is chosen to avoid the boundary.

### Attack 3C: #9 conflict detection presupposes identity resolution and normalization

Case (ii): "two blocks asserting contradictory opening hours for the same business with no merge rule registered" must produce an `UNRESOLVED_CONFLICT` quarantine entry with neither fact entering the graph. This assumes the extractor already knows the two blocks describe THE SAME business: same `@id`? same URL plus name match? The mechanism specifies no identity-resolution rule, and identity resolution across plugins (Rank Math vs theme vs widget) is its own hard problem: missing `@id`s, differing names ("Coppersmith Plumbing" vs "Coppersmith Plumbing & HVAC").

Worse, the false-conflict DoS: block A says `"openingHours": "Mo-Fr 09:00-17:00"`, block B says `"openingHours": ["Monday-Friday: 9am-5pm"]`. Same hours, different serialization. Without a normalization rule for hours (which the mechanism says may not exist: "no merge rule registered"), a string comparison reports conflict, both facts are quarantined, and the graph has NO hours for every site running two SEO plugins. False conflicts become a completeness DoS: adversarial or merely sloppy pages with N near-duplicate blocks get all their facts quarantined. With sloppy normalization instead, genuine conflicts collapse silently. The test's case (ii) says "contradictory" without specifying whether the contradiction survives normalization, so it cannot distinguish a true conflict from a serialization difference.

**Does the written test catch Attack 3C? No.** It assumes entity linking solved ("for the same business") and contains no same-hours-different-serialization control.

### Attack 3D: the drain path is untested (open question 2 is the mechanism)

The test verifies the write path: block (i) "lands in quarantine with a `UNRECOGNIZED_SHAPE` gap event and its raw content intact." Nothing tests the read path: who triages the gap feed, on what cadence, what happens to a shape that sits unreviewed for 90 days, whether an undrained quarantine blocks onboarding or trails it. The #3 crisp reason claims "the variant is discovered at the first real site instead of never." Discovery is a read-path event. A write-only quarantine with no drain SLA does not discover; it archives. Combined with Attack 3A's noise, the expected outcome is archival, not discovery.

**Does the written test catch Attack 3D? No.** It is a write-path test for a mechanism whose value lives on the read path.

### Test-strength assessment

The loud-default flip is the right instinct and the write-path test is executable, but the test measures the mechanism on three hand blocks while the mechanism's failure modes are statistical (noise volume), boundary (classifier), semantic (identity/normalization), and temporal (drain). None are probed.

### Strengthened test

1. Noise corpus: run extractor+quarantine over a corpus of real business homepages (WordPress/Rank Math/Wix/Squarespace mix); assert quarantine items per page and gap events per day stay under a stated budget; assert structural-signature dedup (one gap event per novel top-level-key signature per time window, with a count attached).
2. Classifier boundary controls: WebSite bare node and BreadcrumbList block must produce NO gap event; `@graph` wrapper containing business nodes MUST produce a gap event (pinning the Attack 3B routing decision in the open); `@graph` wrapper containing only non-business nodes follows the stated rule, whichever is chosen.
3. Conflict controls: same-hours-different-serialization pair must NOT quarantine (normalization rule stated and tested); genuinely contradictory hours for blocks linked by the STATED identity rule must quarantine as `UNRESOLVED_CONFLICT` with neither fact in the graph unlabeled; blocks that cannot be linked by the identity rule must not be compared at all (no phantom conflicts).
4. Drain SLA: quarantined items carry an age; assert triage within N days per the stated ownership (open question 2 answered in the test); assert age-escalation for items past SLA; assert the #3 discovery claim end to end: a novel business shape quarantined on day 0 is registered or explicitly declined by day N, not merely stored.

### Verdict: WEAKENED

- **#3 graph blindness: HOLDS on the write path, conditionally.** The loud-default flip is genuine: the Coppersmith `@graph` block would have been preserved with a gap event instead of vanishing, PROVIDED the classifier routes the wrapper to quarantine rather than the known-non-business skip. That routing decision is currently unspecified (Attack 3B), so the hold is conditional on the strengthened test's boundary pinning. Durability of the hold depends on the untested drain SLA (Attack 3D) surviving the untested noise load (Attack 3A).
- **#9 conflict-collapse: WEAKENED.** Quarantining detected conflicts instead of collapsing them is the right default, but detection presupposes an entity-identity rule and a normalization boundary the mechanism does not specify. As specified, it either false-conflicts on serialization differences (completeness DoS) or never fires because linking fails. The discriminating case the test names (ii) is real, but the test does not earn it.
- The mechanism's center of gravity is open question 2 (SLA/ownership) and open question 3 (registry boundary): both are load-bearing, both untested.

---

## Survivor 4: Dual-parser cross-check on sampled inputs

Claims to prevent: #3 graph blindness, #4 fixture-drift. Its own falsification condition stresses parser independence: shared-lineage parsers agreeing at 0-vs-0 prove nothing.

### Attack 4A: the comparison projection is undefined (disagreement everywhere or circular)

"Two independent parsers run over a sample; their entity counts and type sets are compared; disagreement above a tolerance threshold opens a gap event." The two sides do not compute the same entity notion. The production extractor emits BUSINESS entities (name, telephone, hours). The reference parser (the `jsonld@9.0.0` expansion pipeline) expands ALL nodes: WebSite, WebPage, BreadcrumbList, Organization, FAQPage. On a normal page (bare business node + WebSite + BreadcrumbList blocks), production emits 1 business entity; the reference expands ~8 nodes. Disagreement of 7-vs-1 exceeds any sane absolute tolerance, so the cross-check fires a gap event on EVERY normal page: the signal is pure noise.

To make the comparison meaningful, the reference side must apply the production side's business-entity selection to its expanded nodes. But then the reference path reintroduces the extractor's selection assumptions (the `@type` filter), eroding the independence the mechanism depends on. Alternatively the comparison runs on raw expanded node counts per block, but then the PRODUCTION side must also report expanded node counts per block, which requires it to expand `@graph`: the very capability whose absence is being detected. Circular.

The test's case (i) expects "a disagreement event with 7-vs-0 node counts attached": node counts, not business-entity counts. The production extractor does not emit node counts. The test hand-waves the projection that would make 7-vs-0 a well-defined comparison.

**Does the written test catch Attack 4A? No.** It works only on the toy two-page input where the reference side's extra nodes happen to be absent. On any real page the naive comparison is either vacuous (fires always) or circular (requires the blind side to see).

### Attack 4B: independence is assumed, not constructed or tested

The actual repair made the production extractor USE `jsonld@9.0.0`. If the reference parser is "the `jsonld@9.0.0` expansion pipeline," production and reference now share lineage by construction: agreement proves nothing, and a defect in `jsonld@9.0.0`'s expansion (or in how both sides invoke it) is shared. The mechanism's own falsification condition names this, but the test provides no step that ESTABLISHES independence: no lineage assertion (fail if the reference resolves to the same package/lineage as production's JSON-LD dependency, open question 5), and no positive control (a synthetic input on which the two parsers are KNOWN to diverge, e.g. a shape where `jsonld.js` and the alternative differ in blank-node labeling or `@container` handling, proving the cross-check can fire at all). Without a positive control, 0-vs-0 agreement is indistinguishable from independence failure: the test cannot tell "both correct" from "both blind the same way."

A genuinely different lineage exists (e.g. Ruben Verborgh's `jsonld-streaming-parser`, a separate implementation; or a non-JS sidecar), but each carries dependency and runtime cost the mechanism does not budget (open question 4), and nothing stops a future refactor from pointing both sides at the same library without the lineage assertion.

**Does the written test catch Attack 4B? No.** The test's falsification condition is honest but unexecuted: the procedure never verifies lineage or fires a positive control.

### Attack 4C: the sampler is bypassed in the test

The #3 crisp reason: the reference parser "flagged the blind shape on the first sampled Rank Math page." The test hands the Rank Math `@graph` page DIRECTLY to the cross-check ("run the cross-check on the sample"). The sampling rule (every Nth page? all pages with JSON-LD? stratified by shape?) is unspecified, and stratified-by-shape sampling is circular: you cannot stratify by shapes you cannot see. If `@graph`-shaped business blocks appear on 2% of pages and the rule is every 25th page, detection latency is a random variable the test never measures; a rare shape can run undetected for a long onboarding tail. The test assumes the sampling problem solved by placing the blind page in the sample.

**Does the written test catch Attack 4C? No.** The sampler, the component that decides whether the blind shape is ever LOOKED at, is not under test.

### Attack 4D: #4 via the reference fails for shared-dependency drift

The #4 crisp reason: "a silent behavior change in the production extractor across regens appears as a new disagreement where previously the two agreed." This holds for drift in the production SELECTION stage (e.g. the `@type` regex changed). It fails for drift in a SHARED dependency: if both sides expand via `jsonld@9.0.0` and a minor version bump changes expansion, both move together and no disagreement appears. The test's case (ii) ("production extractor whose behavior changed silently between regens while its fixtures were updated to match") assumes the reference is unaffected without asserting it. Post-repair, the most likely drift source (the JSON-LD library both sides would naturally share) is exactly the drift this mechanism cannot see.

**Does the written test catch Attack 4D? Partially.** It catches production-selection drift given genuine independence. It does not cover shared-dependency drift, and it does not assert the independence its case (ii) requires.

### Test-strength assessment

The mechanism's core idea (a pinned independent ruler) is sound, and its self-stated falsification condition is the most honest of the four. But the test establishes none of the three preconditions the mechanism depends on: a defined comparison projection, verified parser independence, and a sampler that actually samples. The procedure's "inspect disagreement events" is manual.

### Strengthened test

1. Comparison projection: define it explicitly (e.g. per-block expanded-node count vs per-block emitted-entity count, compared against a BASELINE distribution learned on a control corpus of normal pages; flag outliers, not absolute threshold crossings). Assert the false-positive rate on the control corpus stays under budget. The naive absolute tolerance in the written test must go.
2. Lineage assertion (open question 5 made executable): CI fails if the reference parser resolves to the same package, version line, or implementation lineage as the production extractor's JSON-LD dependency. State the reference lineage (e.g. `jsonld-streaming-parser`, verified different implementation) rather than "e.g. the `jsonld@9.0.0` expansion pipeline," which post-repair is production's own lineage.
3. Positive control: a synthetic input with KNOWN parser divergence between the two lineages; assert the cross-check fires on it every run. A cross-check that has never fired cannot distinguish health from shared blindness.
4. Sampler under test: run the SAMPLER (not the cross-check alone) over a corpus with known rare-shape prevalence; measure time-to-first-disagreement for the blind shape under the stated sampling rule and cost budget (open question 4). Assert the latency bound, not just eventual detection.

### Verdict: WEAKENED (closest of the four to FALLS on #3 as specified)

- **#3 graph blindness: WEAKENED.** The pre-repair counterfactual is genuine: a custom flattener vs an independent `jsonld.js` WOULD have disagreed on the first sampled Rank Math page. But as specified and tested, the mechanism does not establish its own preconditions: the comparison projection is undefined (Attack 4A: naive counts fire on every normal page; defined counts are circular), independence is asserted never verified (Attack 4B: post-repair, production IS the reference lineage), and the sampler is bypassed (Attack 4C). With the strengthened test (projection + baseline, lineage assertion, positive control, sampler latency bound), the #3 claim is recoverable. Without it, the mechanism is a second parser call, not a second opinion.
- **#4 fixture-drift: WEAKENED.** Holds for production-selection-stage drift under genuine independence. Fails for shared-dependency drift (Attack 4D), which post-repair is the likeliest drift source. The test's case (ii) does not assert the independence it assumes.
- Note the irony the mechanism itself invites: the actual repair (pin `jsonld@9.0.0`, delete the custom processor) destroyed the independence this survivor needs. Post-repair, the honest reference is a second lineage maintained at real cost, or the survivor's #3 value is spent.

---

## Cross-cutting findings

### The survivors are not independent: a dependency map

The challenge evaluated the four as independent survivors. They are not. Each one's claim leans on another's unsolved problem:

- Survivor 1 (registry) needs an independent fixture oracle to make "pinned" mean "correct": that is Survivor 4's job (Attack 1B). It needs a refusal path so the gate's green does not certify blindness: that is Survivor 3's job (Attack 1A, strengthened test step 3).
- Survivor 2 (receipts) needs a shape classifier to define candidates and mint reason codes honestly: that is Survivor 3's boundary plus Survivor 1's registry (Attacks 2A, 2B). Without them, the receipt's arithmetic is launderable.
- Survivor 3 (quarantine) needs Survivor 1's registry to draw the known/unknown boundary (Attack 3B, open question 3), and its durability is open question 2 (SLA/ownership), which no survivor answers.
- Survivor 4 (dual-parser) is the only one whose output (an independent oracle) is an input to another survivor's claim (Survivor 1's fixture correctness). If no second JSON-LD lineage is maintainable at acceptable cost in the JS ecosystem, Survivors 1 and 4 weaken together: shared substrate failure.

A falsification program that scores survivors independently will overcount. The next round should attack the COMPOSITION (registry + quarantine + receipts + reference parser as one pipeline) rather than the components, because the components' guarantees are mutually conditional.

### Open questions: which are load-bearing

- Q1 (receipt storage): load-bearing for Survivor 2's #4. If receipts are extraction-local files, the regen-pair diff is a chore the loop will skip; the #4 claim needs queryable receipts and an automated diff gate.
- Q2 (quarantine SLA/ownership): load-bearing for Survivor 3's durability. An undrained quarantine is /dev/null with labels; the #3 discovery claim is a read-path claim tested only on the write path.
- Q3 (registry vs quarantine boundary): load-bearing for Survivors 1 and 3 jointly. Currently unanswerable; the strengthened tests above make it executable (union of registry acceptance and quarantine routing is total over observed shapes).
- Q4 (sampling rate/cost) and Q5 (reference-parser lineage): load-bearing for Survivor 4. Both are currently assumed; the strengthened test makes both executable (latency bound under a cost budget; CI lineage assertion).
- Q6 (parse-tier labels): relevant to Survivors 2 and 3 event payloads (memory L376 requires truthful tiers); neither test asserts tier labeling. Add it to the receipt schema and the quarantine event schema assertions.
- Q7 (correction receipts vs owner loop): load-bearing for Survivor 2's #8. Currently the #8 claim is untested; the strengthened test reconciles by the owner loop's correction IDs.
- Q8 (Ask FYD query-time surface): unclaimed by all four, and correctly so, but it bounds every verdict above. All four survivors are onboarding-scoped. A graph built blind stays blind at query time: Ask FYD assembling answers from a graph that missed 7 nodes does not re-run extraction. None of the survivors' tests touch query-time entity assembly. The receipt SHAPE generalizes (question in, entities assembled, sources cited, unexplained absences flagged), but no survivor claims it, so every #3 verdict above should be read as "at acquisition time." A query-time blindness class (graph built blind, question asked innocently, answer confidently incomplete) is unaddressed by this round.

### The strongest single attack, per survivor, in one line each

1. Registry: the gate is green during the exact historical failure, because refusal is not acceptance and the test only polices acceptance.
2. Receipts: the test's "7 unexplained drops" assumes an @graph-aware candidate counter, which is the fix wearing a receipt costume; with block-level counting plus a minted reason code, the alert never fires.
3. Quarantine: the write path works on three hand blocks; the web delivers thousands of novel-shaped blocks per day, and nothing in the mechanism dedeups, budgets, or drains them.
4. Dual-parser: post-repair, production IS the reference lineage, the comparison projection fires on every normal page or is circular, and the test bypasses the sampler that decides whether the blind shape is ever looked at.

---

## Verdict summary

| Survivor | #3 graph blindness | #4 fixture-drift | #8 correction-loss | #9 conflict-collapse | Overall |
|---|---|---|---|---|---|
| 1. Shape-coverage fixture registry | NO LONGER PREVENTED as specified | HOLDS (drift-from-pinned) | (not claimed) | (not claimed) | WEAKENED |
| 2. Extraction receipts | WEAKENED (narrow seen-but-dropped case holds; construction claim falsified) | WEAKENED (count-drift only) | NOT PREVENTED as tested | (not claimed) | WEAKENED |
| 3. Unknown-shape quarantine | HOLDS conditionally (write path; boundary pinning required) | (not claimed) | (not claimed) | WEAKENED (identity/normalization unspecified) | WEAKENED |
| 4. Dual-parser cross-check | WEAKENED (recoverable with strengthened test) | WEAKENED (selection-stage drift only) | (not claimed) | (not claimed) | WEAKENED |

No survivor WITHSTANDS as specified and tested. No survivor FALLS outright: each contains a genuine mechanism (closed-shape discipline; enforced accounting; loud-default preservation; pinned independent ruler) whose claims exceed what its test establishes. The gap in every case is the same pattern: the test assumes, without constructing, the precondition the mechanism depends on (acceptance observability and fixture correctness; candidate definition and reason-code discipline; classifier boundary and drain; comparison projection, lineage, and sampling). Strengthen the tests as specified above and three of the four recover to WITHSTANDS on their core claims; Survivor 2's #8 claim needs the owner-loop ID reconciliation (Q7) before it can be scored at all.

**Research-only note.** No implementation code was written or modified. The live `extractor.ts` blindness was read, not touched.
