# FAIL-3: GRAPH BLINDNESS - mechanism hunt

**Failure class:** during acquisition, FYD extracts entities from source pages; JSON-LD blocks using `@graph` (a list of nodes instead of a single top-level object) get missed by extractors written for the single-node shape.
**Date:** 2026-09-23. **Mode:** research only. No implementation.

## (a) Grounding: the real instances

The general shape is a parser that handles the common input shape but silently drops a valid variant shape, with no signal that anything was missed. Three real instances, one historical-fixed and one still live in the local tree.

**Real instance 1 - Coppersmith @graph zero-facts (memory/2026-09-21.md L373).** Commit `e044696` processed Coppersmith Plumbing & HVAC as the second real website through the full pipeline. The run proved that `flattenJsonLd` did not recurse into `@graph`, so Rank Math JSON-LD contributed zero facts. The extractor saw the JSON-LD blocks, found no shape it recognized, and emitted nothing. The next finding (L376) named the highest-value correction: recursive `@graph` parsing with truthful parse-tier labels. The standing CEO rule (L506, L856) was minted from this exact failure: every failure from a real website is gold and must be turned into a generic capability; the Coppersmith @graph failure is the exemplar because the fix compounds across every future onboarding.

**Real instance 2 - the verified repair (memory/2026-09-21.md L567).** `@graph` VERIFIED: Coppersmith 7 nodes became 11 visited nodes, 38 facts, 4 objects, 3 relationships; `jsonld@9.0.0` pinned; no custom JSON-LD processor. The repair was generic (replace the custom flattener with a pinned commodity library) rather than site-local, per the CEO rule.

**Real instance 3 - the same blindness, still live in the local onboarding extractor (verified 2026-09-23, `~/workspace/fyd-lane/onboarding/extractor.ts` L133-157).** `parseJsonLd` iterates `ld+json` script blocks, wraps non-array payloads in an array, and for each candidate checks `candidate["@type"]` against a business-type regex. A block shaped as `{"@context": ..., "@graph": [ ...nodes... ]}` fails the check: the wrapper object has no business `@type` (typically `WebSite` or none), so the entire block is skipped and the function returns null for the block, having silently discarded every node inside `@graph`. The two handled shapes (bare node, top-level array) work; the valid third shape drops silently. This is the failure class in miniature, observable in the current tree, and it is exactly the gap the Coppersmith run exposed: the extractor never counts what it refused, so nothing distinguishes "no JSON-LD present" from "JSON-LD present but shaped differently."

General shape confirmed: variant-shape silence. The extractor's contract covers "the shapes we thought of," and every shape it didn't think of degrades to zero signal.

## (b) Surviving mechanisms

Hard rule applied: a candidate survives only if it prevents at least 2 of the 9 failure classes, with one crisp reason per class. Each survivor gets a falsifiable test.

---

### Survivor 1: Shape-coverage fixture registry

**How it works.** The set of accepted JSON-LD top-level shapes is enumerated in a registry (bare node, top-level array, `@graph` wrapper, nested `@graph`, `@graph` with `@id`-linked references, multi-block pages), and each registered shape has a fixture that pins expected extraction output for it. A coverage gate runs in CI: a shape accepted by the extractor without a fixture fails the gate; a fixture whose expected output no longer matches actual output fails the test. New shapes enter only through the registry with their fixture. The general rule: input-shape space is a closed, enumerated, fixture-backed set, never an open "whatever the parser happens to tolerate."

Wave-1 cross-check: this is the same closed-set discipline LANE-13 demanded of its fencing tokens (coverage must be total; audit the holes) and LANE-16's per-tool `verify()` contract (the seam declares what it claims to handle).

**Prevents 2 classes:**

- **#3 graph blindness:** the `@graph` shape is registered with a fixture that expects all nodes extracted; the `flattenJsonLd` bug cannot land because the fixture fails the moment `@graph` nodes are dropped. Crisp reason: blindness is a valid shape with no fixture; the registry makes "handled shape without a passing fixture" a build failure, so unhandled shapes are caught before any real site.
- **#4 fixture-drift:** fixtures pin expected extraction output per shape, so a regeneration that silently changes output (the drift class) turns into a loud fixture mismatch. Crisp reason: drift is silent output change across regenerations; pinned shape fixtures convert silence into a failing assertion.

**Falsifiable test.**

- Input: (i) a new valid top-level form not yet in the registry, e.g. a JSON-LD block that is a bare array containing one `@graph` wrapper; (ii) a registry with all fixtures green; (iii) an extractor change that silently halves extracted entities for one registered shape.
- Procedure: add form (i) to the extractor's accepted handling without a registry entry, then run the coverage gate; then mutate one fixture's expected output, then run the test suite; then introduce extractor change (iii) and run the suite.
- Expected observable outcome: the gate fails on (i) with "unregistered accepted shape"; the suite fails on the mutated fixture; the suite fails on (iii).
- Proves the mechanism DOESN'T work: if any accepted shape can reach production without a fixture (gate silent on (i)), or if an output-changing extractor edit passes all fixtures unchanged, the registry is decorative and the mechanism is falsified. Note the asymmetry this test exploits: coverage is only real if the gate, not a human, enforces the shape-to-fixture mapping.

---

### Survivor 2: Extraction receipts with unexplained-drop alerts

**How it works.** Every extraction run emits a structured receipt: candidate entities seen (JSON-LD blocks found, top-level shape of each, node count per block, candidate fact count) versus entities emitted (facts, objects, relationships), with each non-emitted candidate carrying a reason code (malformed JSON, unrecognized shape, filtered type, duplicate). A nonzero unexplained drop (candidates seen minus candidates emitted minus explained exclusions) raises an alert. Receipts are stored per run, so two regens over the same input produce comparable receipts. This is the LANE-9 M-RECEIPT-AUDIT shape adapted from tool calls to extraction: identity of the input, counts in and out, and an outcome enum, but with the drop-invariance enforced, not just logged.

**Prevents 3 classes:**

- **#3 graph blindness:** the Coppersmith run's receipt would have read "1 JSON-LD block, shape @graph, 7 candidate nodes, 0 facts emitted, 7 unexplained drops," which is a loud alert instead of a silent zero. Crisp reason: blindness is loss without accounting; receipts make every non-emitted candidate carry a count and a reason, so silent loss becomes impossible by construction.
- **#4 fixture-drift:** diffing receipts across two regens over identical input exposes drift even when both runs "succeed": changed emitted counts or changed reason codes are the drift signature. Crisp reason: drift hides inside successful runs; receipt diffs compare runs on their accounting, not their exit status, so changed behavior on unchanged input cannot pass unnoticed.
- **#8 correction-loss:** owner corrections are input records to proceduralize; a receipt that reconciles corrections-in against corrections-surviving-in-output across a regen catches silently dropped corrections the same way it catches dropped JSON-LD nodes. Crisp reason: correction loss is the same accounting shape as graph blindness (input entity present, output entity absent, no reason), so the same receipt invariant catches it.

**Falsifiable test.**

- Input: a page with a Rank Math `@graph` block containing 7 nodes; a second page with a bare-node block; an extractor that drops the `@graph` nodes; a regen pair over identical input where the second run emits different counts.
- Procedure: run extraction on both pages; inspect each receipt for the invariant `unexplained_drops = candidates - emitted - explained_exclusions`; run the regen pair and diff the two receipts.
- Expected observable outcome: the `@graph` page's receipt shows 7 unexplained drops and triggers the alert; the bare-node page's receipt shows zero; the regen-pair diff flags the changed counts.
- Proves the mechanism DOESN'T work: if any dropped candidate can appear in neither the emitted set nor the receipt's excluded set (a hole in the accounting), or if two regens with different outputs produce identical receipts, the receipt is a vanity log and the mechanism is falsified. The hard case the test must include: malformed JSON-LD that the extractor "ignores" today must appear as a counted, reason-coded exclusion, not as absence.

---

### Survivor 3: Unknown-shape quarantine

**How it works.** The extractor classifies every JSON-LD block's top-level shape before processing. Shapes in the known set are processed normally; any shape outside the set (unrecognized nesting, unknown top-level keys, contradictory type declarations) is not skipped. It is routed to quarantine: the raw block is preserved with its source URL, parse-tier label, and a typed `UNRECOGNIZED_SHAPE` gap event, and the gap is surfaced to the onboarding/repair loop. The default for "I do not recognize this shape" is loud preservation, never silent skipping. Memory L376 already points this way: the repair for `@graph` was required to carry "truthful parse-tier labels" so downstream stages could see what tier the data came from.

**Prevents 2 classes:**

- **#3 graph blindness:** the Rank Math `@graph` block under the old `flattenJsonLd` was effectively an unrecognized shape; quarantine would have emitted a gap event with the 7 nodes preserved instead of zero facts with zero signal. Crisp reason: blindness is the unknown-shape-is-silent default; quarantine flips the default to unknown-shape-is-loud, so the variant is discovered at the first real site instead of never.
- **#9 conflict-collapse:** contradictory sources that cannot be honestly merged into the accepted shape (two blocks asserting conflicting facts, an entity that is both Person and Organization with no merge rule) are quarantined as explicit `UNRESOLVED_CONFLICT` objects rather than resolved by whichever block the parser saw first. Crisp reason: collapse is contradiction destroyed by a merge the input never authorized; quarantine preserves what the merger cannot represent, keeping the contradiction available for explicit resolution.

**Falsifiable test.**

- Input: (i) a JSON-LD block with a top-level shape the extractor does not know (e.g. nodes nested under a `data` key); (ii) two blocks asserting contradictory opening hours for the same business with no merge rule registered; (iii) a normal bare-node block as control.
- Procedure: run extraction; check the quarantine store and the gap-event feed; check the emitted graph.
- Expected observable outcome: block (i) lands in quarantine with a `UNRECOGNIZED_SHAPE` gap event and its raw content intact; case (ii) produces an `UNRESOLVED_CONFLICT` quarantine entry and neither contradictory fact enters the graph unlabeled; block (iii) processes normally with no gap event.
- Proves the mechanism DOESN'T work: if block (i) vanishes without a gap event, or if case (ii) emits one of the two contradictory facts into the graph as if it were uncontested, the quarantine path is a second trash can and the mechanism is falsified. The discriminating case is (ii): a quarantine that only catches syntax variants but not semantic conflicts is a shape filter, not a preservation mechanism.

---

### Survivor 4: Dual-parser cross-check on sampled inputs

**How it works.** Two independent parsers (the production extractor and a pinned reference parser, e.g. the `jsonld@9.0.0` expansion pipeline that the real repair adopted) run over a sample of acquisition inputs. Their entity counts and type sets are compared; any disagreement above a tolerance threshold opens a gap event with both parses attached. The reference parser is pinned and never changes with the production extractor, so it acts as a fixed mirror. Disagreement does not block the pipeline; it routes to the same gap feed as quarantine.

**Prevents 2 classes:**

- **#3 graph blindness:** when the production extractor missed `@graph` nodes, the reference parser (which expands `@graph` correctly) disagreed on node count on the first sampled Rank Math page, flagging the blind shape without any human noticing. Crisp reason: blindness is one parser's private assumption; a second independent parser turns a private assumption into a visible disagreement.
- **#4 fixture-drift:** because the reference parser is pinned, a silent behavior change in the production extractor across regens appears as a new disagreement where previously the two agreed. Crisp reason: the pinned reference is a fixed ruler; drift in the measured parser shows up as ruler-vs-measurement divergence even when the parser's own fixtures were updated to bless the change.

**Falsifiable test.**

- Input: (i) a sampled Rank Math `@graph` page run through a production extractor that drops `@graph` nodes and a pinned reference parser that expands them; (ii) a production extractor whose behavior changed silently between regens (same input, different entity counts) while its fixtures were updated to match.
- Procedure: run the cross-check on the sample; inspect disagreement events and the attached parses.
- Expected observable outcome: case (i) produces a disagreement event with 7-vs-0 node counts attached; case (ii) produces a disagreement event at the regen where behavior changed, even though the production extractor's own suite is green.
- Proves the mechanism DOESN'T work: if the two parsers share the defect (both built on the same flawed flattener, both miss `@graph`) and agree at 0-vs-0, producing silence, the parsers are not independent and the mechanism is falsified. Independence is the whole mechanism: the test must use a reference parser with a genuinely different implementation lineage, and a shared-lineage pair passing this test would prove nothing.

## (c) Cut list

Each candidate below was judged against the hard rule (must prevent at least 2 of the 9 classes). All fail it, each for one stated reason.

- **Rank-Math-specific @graph patch (fix the one site's shape).** CUT: repairs the Coppersmith instance but prevents no other class; it is the site-local patch the CEO rule explicitly forbids, and it teaches the extractor nothing about the next unknown shape.
- **Pinning jsonld@9.0.0 and deleting the custom processor (the actual repair).** CUT: a good one-class fix, but it prevents only #3; pinning a library says nothing about drift detection, conflict preservation, correction survival, or any other class, so it fails the >=2 rule.
- **Browser-rendered acquisition fallback (Level 2 of the acquisition stack).** CUT: fetches JS-rendered content the static path cannot see, but it is a different blindness (rendering vs parsing) and prevents no second failure class.
- **Schema.org type allowlist at extraction (only emit known business types).** CUT: actively anti-coverage; it converts unknown-type blindness from a bug into policy and trades one silent drop for another, preventing nothing.
- **Unstructured extraction logging ("log everything and grep later").** CUT: a log line nobody asserts on is the same silence with more bytes; Survivor 2 differs precisely because the receipt carries an enforced accounting invariant, not volume.
- **Human review of extraction output before proceduralize.** CUT: non-deterministic, non-scalable, not a mechanism; prevents nothing systematically across the perpetual onboarding loop.
- **Total-entity-count vanity metric (dashboard shows entities extracted).** CUT: the Coppersmith run's count was zero and nobody noticed; a count without the in-vs-out reconciliation invariant is exactly the silence this class needs, and it is subsumed by Survivor 2.

## (d) Open questions

1. **Where do receipts live?** As PING observations (queryable, durable, witness-grade) or as extraction-local run files? The answer decides cost at perpetual-onboarding scale and whether the regen-pair diff is a query or a file comparison.
2. **Quarantine SLA and ownership.** Who resolves quarantined shapes, on what cadence, and does an unresolved quarantine item block onboarding or merely trail it? A quarantine nobody drains becomes a second /dev/null with better labeling.
3. **Shape registry vs unknown-shape quarantine overlap.** If quarantine already catches unknown shapes loudly, what does the closed registry add? Candidate answer: the registry makes coverage auditable at build time (which shapes we claim to handle), while quarantine catches the wild ones at runtime; but the boundary needs one explicit statement.
4. **Dual-parser sample rate and cost.** 100% of inputs doubles parse cost forever; sampling misses rare shapes. What sampling rule (every Nth page, all pages with JSON-LD, stratified by shape) keeps the disagreement signal without doubling the acquisition budget?
5. **Reference-parser independence guarantee.** What stops a future refactor from pointing both parsers at the same underlying library? The mechanism needs a lineage rule (different implementations, pinned separately), not just a second call site.
6. **Parse-tier labels downstream.** Memory L376 requires truthful parse-tier labels so RESOLVE priority behaves as documented. Do receipts and quarantine events carry the tier, and does the conflict-preservation in Survivor 3 mark which tier each contradictory fact came from?
7. **Correction receipts and owner-override interplay.** Survivor 2 claims correction-loss coverage via input-output reconciliation; owner corrections verified to survive regen (memory/2026-09-23) already exist. Is the receipt reconciling the same correction IDs the owner loop uses, or a parallel bookkeeping that can drift from it?
8. **Ask FYD acquisition surface.** All four survivors are scoped to onboarding extraction. Ask FYD answers questions from the graph at query time, a second acquisition-shaped surface. Does graph blindness reopen there when the graph itself was built blind, and do receipts cover query-time entity assembly?
