# MERGED ORACLE FALSIFICATION: adversarial attacks on the empirical-oracle family

**Date:** 2026-09-23. **Mode:** research only. No implementation code.
**Target:** the merged abstraction of the five lane-surviving verification mechanisms:
- F1-S1: post-generation empirical oracle (render, measure, assert, repair-or-block; plus determinism and structural-divergence assertions)
- F3-S1: shape-coverage fixture registry (pinned input/output pairs; silent change becomes loud failure)
- F3-S2: extraction receipts with unexplained-drop alerts (candidates in vs entities out; receipt diffs across regens)
- F7-S1: input-output variance coupling (d_in/d_out metric, independent verifier, collapse and drift directions)
- F8-S3: correction survival tests (golden set of corrections asserted against rendered output as a regen gate)

**Method:** state the merged mechanism precisely, record version disagreements, construct attacks against the merged abstraction itself (not just the members), report per-member breakage per attack, then judge whether the merged abstraction survives and write the single strongest falsifiable test for it. The individual falsifications (FAIL-1-falsification, FAIL-3-falsification, FAIL-7-falsification, FAIL-8-falsification) are the evidence base; this document attacks the composition, not the components. No em dashes used anywhere by policy.

---

## 1. The merged mechanism, stated precisely

After generation completes, an INDEPENDENT verifier evaluates the output against declared expectations. The verifier shares no code, models, or trust with the generator: the generator never grades its own homework. Violations block promotion. The declared expectations come in four shapes, one per family member, and the merged oracle runs all five checks on every regen:

1. **Measured render properties (F1-S1).** Render the output in a browser harness at 320/360/375/390/430 plus desktop; assert measured properties (scrollWidth does not exceed clientWidth, determinism across regens, correction presence, structural divergence between distinct inputs). Failed assertions block promotion or trigger repair.
2. **Pinned input/output pairs (F3-S1).** A registry of enumerated input shapes, each with a fixture pinning expected extraction output. Any accepted shape without a fixture fails the gate; any fixture whose expected output no longer matches actual output fails the build.
3. **Receipt accounting (F3-S2).** Every run emits a receipt: candidates seen versus entities emitted, each non-emitted candidate carrying a reason code. Nonzero unexplained drops raise an alert. Receipts are diffed across regens of identical input.
4. **Variance coupling metric (F7-S1).** An independent verifier computes d_in over input graphs and d_out over output specs. Collapse (large d_in, near-zero d_out) and drift (near-zero d_in, above-threshold d_out) both fail the gate.
5. **Golden correction set (F8-S3).** A recorded set of corrections asserted against rendered effective output after every regen, wired as a gate: a regen that drops a golden correction is a failed regen, not a shipped page.

The merged claim: **consistency between generation and declared expectations is verified by a party that did not generate, and inconsistency blocks the build.**

---

## 2. Version disagreements inside the family

The five members do not agree on the merged mechanism's own terms. These are disagreements, not attacks yet, but each is a seam an attack can exploit.

### 2a. Block vs repair-or-block

F1-S1 offers "repair-or-block": a failed viewport assertion triggers automatic repair (trace to the overflowing owner, constrain it) or blocks promotion. The other four are block-only: F3-S1 fails the build on fixture mismatch, F3-S2 raises an alert, F7-S1 fails the gate, F8-S3 treats a golden failure as a failed regen. F1's own falsification already resolved this disjunction against auto-repair (attack A7): repair decisions are a function of declared inputs plus measurement environment (font timing, DPR, engine), so an unlogged repair is silent drift by the oracle's own definition, and it breaks the stated composition with purity-style claims (FAIL-1 C4). The merged mechanism therefore carries a contradiction: one member mutates what the others assert on. If repair runs upstream of the other four, they certify repaired output as "passed" without knowing the repair happened; if repair runs after them, F1's own determinism assertion is the one falsified. The only consistent merged reading is **block-and-escalate**, with any repair re-entering the pipeline as a new declared input that passes all five checks again. F1's strengthened test (ix) is the acceptance case for this: every repair appears in the provenance log as a declared, attributed input change, or the repair branch is dead.

### 2b. Fixture-based vs metric-based vs receipt-based vs property-based expectations

The four expectation shapes are not interchangeable:

- F3-S1 pins specific outputs per shape. Strong on regression, blind to anything not yet pinned (blindness-at-birth, FAIL-3 1B).
- F8-S3 pins a subset of effective outcomes. A set of pinned points, not a page census (FAIL-8 attack C falsified its #4 claim outright).
- F7-S1 constrains a relation between runs (d_in vs d_out). It never says what any single output should be; it says how outputs should move together. Its own falsification showed it measures variance, not coupling, without the explainability decomposition (FAIL-7 1A).
- F3-S2 constrains accounting (in minus out minus explained equals zero). It constrains quantities, not content (FAIL-3 2C: content-drift with stable counts is invisible).
- F1-S1 constrains measured physical properties of the rendered artifact. The closest to ground truth, and the only one whose verdict can be cross-checked against a real device (FAIL-1's differential-oracle clause), but also the most environment-dependent (FAIL-1 A1-A6).

The merged abstraction treats these as five independent witnesses. They are not independent: see attacks (a) and (d). Their blind spots overlap exactly where they share a substrate.

### 2c. Who writes the expectations

Every member's expectations are authored by the same team that builds the generator:

- F1-S1: the standing assertion suite and the structural-divergence threshold (FAIL-1 open question 3: the signature is undefined) are team-authored.
- F3-S1: fixtures are hand-written by the extractor's authors; FAIL-3 1B proved a fixture can pin the bug (blindness-at-birth), and the repair then breaks the fixture.
- F3-S2: reason codes are minted by the same team; FAIL-3 2B proved laundering (mint `non-business-shape`, route every drop there, alert never fires).
- F7-S1: d_in design, thresholds, and bars are set by the team and drift toward the template (FAIL-7 2A: bars settle where real businesses clear them).
- F8-S3: the golden set is hand-maintained (rot in both directions, FAIL-8 A and B) or generated from real owner actions (privacy story required, open question 6).

The merged abstraction claims the verifier is independent of the generator. The expectations the verifier checks are not independent of the generator's authors. That gap is attack (a) and attack (b).

---

## 3. Attacks against the merged abstraction

### Attack (a): oracle independence in practice

**The attack.** "The verifier shares no code, models, or trust with the generator" is an organizational claim, not a tested property. In practice the verifier is written by the same team, runs against the same data representations, and shares the generator's blind spots. Independence is asserted in prose and never constructed by a test. FAIL-3's dual-parser falsification made this exact point for its survivor (independence assumed, never verified; no lineage assertion; no positive control), and FAIL-7's attack 1C made it for the variance verifier (shared blindness via the shared graph schema; hill-climbing access; no differential corpus).

**A concrete blind spot that defeats both generator and verifier.** Take the evidence layer: duplicated, redundant, or systematically unparseable source material. The planner clears evidence-density bars on phantom fact counts (FAIL-7 2C: triplicated facts earn sections). F7-S1's independent verifier computes d_in on the same duplicated graph and sees phantom input distance too (FAIL-7 1B: d_in on raw counts is blind; the verifier shares the planner's schema, so "independent verifier" does not rescue a lossy distance function). Both count the same way. Neither sees the duplication.

Now the stronger, family-wide version: a systematically invisible input class, for instance a new JSON-LD shape carrying service objects that the traversal cannot open. Walk it through the family: F3-S1's gate is green (the extractor refuses the shape, refusal is not acceptance, so no fixture is required; FAIL-3 1A). F3-S2's receipt shows block-level candidates with a minted `unrecognized-shape` reason code and zero unexplained drops (FAIL-3 2A, 2B). F7-S1 computes d_in on the corrupted graph and d_out on the thin spec; both are small, the coupling invariant holds, the gate passes (genuine coupling of corrupted input to corrupted output). F8-S3's golden anchors dangle and the suite fails, except the anchors only exist for golden-covered objects; the invisible class has no golden twin, so the roster passes silently (FAIL-8 attack B). F1-S1 renders the thin site and finds no overflow: a pass. The defect is upstream of every oracle. Every oracle verifies downstream consistency, and downstream consistency is preserved under common-mode input blindness.

**Per-member breakage.** F1-S1: shared measurement environment (font-timing discipline shared with its own manual differential check, FAIL-1 A1; engine assumptions, A5). F3-S1: fixture author equals extractor author (blindness-at-birth, 1B). F3-S2: candidate traversal equals extractor traversal (2A: the "7 unexplained drops" receipt assumes the fix); reason-code vocabulary minted by the same team (2B). F7-S1: shared graph schema blindness (1B, 1C). F8-S3: golden set authored by the same team; coverage bounded by what the team thought to pin (attacks A, B). All five break on the independence claim as stated.

**Does the merged abstraction survive?** No, as stated. The abstraction's load-bearing word is "independent," and no member constructs it. The abstraction survives only in the strengthened form the individual falsifications already specified: verifier lineage assertions (FAIL-3 strengthened test 2, CI fails on shared dependency lineage), positive controls proving the verifier can fire (synthetic known-divergence input), the verifier's own frozen differential corpus (FAIL-7 viii, with the planner blind to verifier scores), and fixture expected-outputs cross-checked by a different-lineage oracle (FAIL-3 strengthened test 2, `oracle: self` fixtures not counting toward coverage). Without those, "independent" is a label, and the family is one team checking its own work five ways.

### Attack (b): expectation rot

**The attack.** Fixtures, golden sets, receipts, and thresholds are artifacts that go stale, and the update process is where the drift the oracle was built to catch re-enters wearing the oracle's uniform.

Walk the rot through the members:

- **F3-S1:** FAIL-3 1B is rot at birth: the fixture pins whatever output existed when it was authored, including the bug. Afterward, a repair that fixes the bug breaks the fixture, and the path of least resistance under ship pressure is to revert the repair or bless the pinned blindness by updating the expected value. The fixture update is a human judgment the gate cannot check. There is no second-level verifier that distinguishes "fixture updated because the expectation was wrong" from "fixture updated because the new behavior is wrong."
- **F8-S3:** rot in both directions (FAIL-8 A, B). Retraction direction: the owner retracts a golden correction; the suite fails on a correct page with a bare "assertion mismatch" that does not name the retraction; maintainers learn to silence the guard. Coverage direction: new fields get no golden twins; real corrections on uncovered fields are lost under a green gate. The roster check (FAIL-8 strengthened test 2: every correction in the decision store needs a golden twin or the gate fails) is the proposed maintenance protocol; it is not built.
- **F3-S2:** reason-code minting is rot by design. FAIL-3 2B showed the alert dies the moment a new reason code is minted to cover the dropped class. Each new "explained" category is an expectation update, and each one narrows what the alert can ever see again. The only defense named was an alert on explained-but-unrecognized volume exceeding a budget, which is itself a threshold that can be raised under pressure.
- **F7-S1:** threshold and bar drift toward the template (FAIL-7 2A). Bars settle where real businesses clear them; the collapse threshold gets calibrated to pass the current corpus; calibration to the corpus is the new normal. The anti-gaming rule (every difference explainable from the graph) is the defense, and it is unmechanized.
- **F1-S1:** the standing assertions are the most rot-resistant (a physical property is harder to redefine than a vocabulary), but the structural-divergence threshold (open question 3) is rot waiting to happen the moment it is defined, and the viewport matrix can be quietly sampled down (attack (e)).

**Who updates them and does the update reintroduce the drift?** The same team under ship pressure, and yes: the update path is unguarded in all five members. The family's one existing answer to this shape is FAIL-3 Survivor 4's falsifiable test case (ii): a production extractor whose behavior changed silently while its fixtures were updated to match must still be caught by the pinned independent reference. That is the correct pattern, a reference that does not move when expectations are updated, and the merged family lacks an executable version of it for members 1, 3, 5, and for F7's thresholds. The honest merged rule: expectation updates must themselves pass an oracle that is pinned against the update (lineage assertion on the reference, differential corpus re-run on threshold changes, budget on reason-code volume). No member currently implements this.

**Per-member breakage.** F3-S1 BREAKS (the fixture update path is unguarded; pinned blindness is rot-by-construction). F8-S3 BREAKS in both rot directions (retraction trains silencing; coverage lets real loss through green). F3-S2 WEAKENED (reason-code minting is the rot vector; the case-(ii) shape applies directly). F7-S1 WEAKENED (threshold/bar drift toward template). F1-S1 LARGELY SURVIVES on its core assertions; its divergence threshold is the rot vector if ever defined.

**Does the merged abstraction survive?** Conditionally. The merged claim "expectations are declared, so violations are loud" survives only if expectation updates are themselves gated. As specified, the update process reintroduces exactly the drift the oracle was built to catch, one blessed edit at a time. The abstraction needs the second-level rule: no expectation may be updated without re-passing a reference that the update cannot move.

### Attack (c): the repair half

**The attack.** F1-S1's oracle repairs-or-blocks. FAIL-1's falsification already proved the repair branch self-falsifying (A7): repair decisions are functions of declared inputs plus measurement environment, so an unlogged repair is silent change with no attributed cause, which is the fixture-drift shape by F1's own definition; it also breaks F1's composition with purity claims (C4) and guards the wrong artifact (A8, SiteSpec vs shipped DOM).

Does auto-repair recreate the fixture-drift shape at the family level? Yes, and worse: the repair is authored by the oracle, the one component the family trusts. Walk it through the family: the repair mutates the DOM post-SiteSpec; F3-S1's fixtures pin SiteSpec-level extraction output and are unaffected by a DOM-level repair, so they stay green while shipped output varies (the wrong-artifact problem, A8, at family scale). F3-S2's receipt diffs across regens would show changed output against identical input, which is the drift signature, except the repair is not receipted as an input, so the diff reads as unexplained generator drift and misattributes the cause. F7-S1's drift direction fires on the repair (d_out moved with d_in at zero) and flags a genuine mechanism as drift, training operators to ignore the flag (FAIL-7 1D's false-positive problem, now weaponized by the oracle itself). F8-S3's golden suite is the only member positioned to catch a repair that breaks a correction, and it asserts rendered output, so it would catch the breakage, but it cannot distinguish "repair broke a correction" from "generator broke a correction," so the diagnostic points at the wrong author.

The repair half also recreates the golden-set problem's evil twin: a repair that rewrites rendered output after verification is F8's sabotage mode (b), a corrupted read path, wearing an oracle badge. Who verifies the verifier's own output mutation? Nobody in the family. The merged abstraction has no self-gate: the verifier's verdict (pass, or repaired-then-pass) is not itself verified against declared expectations.

**Per-member breakage.** F1-S1's repair branch BREAKS the merged abstraction (self-falsifying per its own falsification). The other four are block-only and unaffected in their own claims, but they will certify a repaired build as "passed" if the repair runs upstream of them, and F7 will false-positive on it. The gate order is unspecified, which is itself the break: the family has no stated position for a mutation stage.

**Does the merged abstraction survive?** Only if the repair half is dropped or re-gated. The honest merged statement: the verifier never mutates; a repair is a new declared input that re-enters at the generator and passes all five checks again, with the repair recorded in the provenance log as an attributed input change (F1 strengthened test ix). F1's own falsification already decided this: only block-and-escalate keeps every other claim in the file consistent. The merged abstraction survives with repair-or-block struck. Keeping the disjunction keeps a self-falsifying member.

### Attack (d): metric gaming at the family level

**The attack.** If the oracle family is THE gate, the generator optimizes for the oracle's metrics rather than the underlying property. Goodhart at the family level: the generator does not need to produce a good site; it needs to produce a site that passes five checks.

**Most gameable member: F7-S1, by a distance.** Its own falsification's verdict: the metric as specified measures variance, not coupling, and variance is trivially inflatable. Reorder sections, rename a component (`TestimonialCarousel` to `ReviewWall`), jitter theme tokens from a hash of the business name: d_out clears the collapse threshold with zero graph-driven differentiation, deterministically, so replay survives. The anti-gaming rule (every structural difference explainable from the graph) is asserted and unmechanized; the metric rewards exactly what the rule forbids. The strengthened tests (gaming injection (iv), explainability decomposition (v)) are the proposed fix and are not built.

**The rest of the family is gameable too, each at its own layer:**

- **F1-S1:** gameable by masking. `overflow-x: hidden` passes the scrollWidth assertion while content stays clipped; FAIL-1's own cut list names this ("masks only #1 while destroying the evidence (the ancestor trace can no longer find the owner)"). The oracle asserts no-overflow, not no-regression (FAIL-1 A7). A planner that masks rather than composes passes the property check and destroys the diagnostic.
- **F3-S1:** gameable by pinning the bug. Author the fixture against the current (broken) output; the gate is green and now defends the breakage (FAIL-3 1B). This is gaming the expectation, not the metric, and it is the cheapest gaming in the family because it happens once at authoring time.
- **F3-S2:** gameable at the vocabulary level. Mint a reason code for the dropped class (FAIL-3 2B); arithmetic stays perfect; the alert never fires. Goodhart on the category system.
- **F8-S3:** gameable by coverage narrowing. Keep golden-covered fields effective; let everything else drift. The suite pins a subset; the generator (or a pipeline change) can narrow rendered output to the pinned subset and pass (FAIL-8 attack C falsified the #4 claim on exactly this ground).

**The composed gaming case.** A generator can pass all five simultaneously without the underlying properties holding: mask overflow with overflow-x:hidden (F1 passes), pin fixtures to the masked output (F3-S1 passes), mint reason codes for every exclusion (F3-S2 passes, zero unexplained drops), inflate d_out with name-hash token jitter (F7-S1 passes), keep golden fields effective (F8-S3 passes). The shipped site is a masked, undifferentiated, quietly lossy page that every oracle certified. The underlying property, "the site is good for the owner," is measured directly by none of the five.

**Does the family have an answer?** The only anti-Goodhart anchors in the five reports are human: F1's final clause ("the oracle's verdict must agree with an independent manual 320px browser check on every fixture") and F7's explainability rule (a human-readable citation of the graph feature behind each difference). Both are differential oracles with a human in the loop, which is exactly what the family was built to replace, and the human check shares the font-timing blind spot (FAIL-1 A1) and does not scale (attack (e)). F7's explainability decomposition (v) is the one mechanized anti-gaming proposal in the family and it is unbuilt. So: the family's answer to Goodhart is currently aspirational. The honest statement is that the oracles measure proxies, the generator will hill-climb the proxies, and the only existing defense is the human differential check that cost pressure will drop first.

**Per-member breakage.** F7-S1 BREAKS first and hardest (variance without coupling is the most abstracted proxy). F1-S1 WEAKENED (masking passes the property; the ancestor-trace diagnostic is destroyed). F3-S1 WEAKENED (pinning-the-bug is one authoring decision). F3-S2 WEAKENED (vocabulary laundering is one minting decision). F8-S3 WEAKENED (coverage-bounded; the honest claim is already pruned to golden-covered fields).

**Does the merged abstraction survive?** WEAKENED. The abstraction assumes the generator is an honest but buggy worker and the oracles catch its mistakes. Goodhart assumes an optimizing generator, and the family has no built defense against optimization. The abstraction survives as a bug-catcher; it does not survive as a guarantee against a proxy-optimizing generator. The pruned claim must say this.

### Attack (e): cost

**The attack.** Five oracles run per regen. The merged abstraction states no compute or latency budget, no sampling policy, and no skip rule. Under real budgets, the oracles degrade unevenly and silently.

**The cost ledger, per member:**

- **F1-S1 is the expensive one.** Six viewport widths, and the strengthened version demands Chromium plus WebKit (engine parity, FAIL-1 vii), font-settling waits (iv), scroll-to-bottom with idle-network waits (v), and the full interaction matrix of open/close panels in both scroll directions (vi). That is dozens of browser render passes per regen per business. FAIL-1's own open question 2 named this: every-regen is the honest answer, sampling reopens the class on unsampled widths.
- **F7-S1** is pairwise structural diff. At fleet scale it is O(n^2) unless it degrades to a fingerprint registry keyed on semantic digests (FAIL-7 open question 7), which keeps crude clone detection and loses the calibrated divergence assertion.
- **F3-S2** is cheap per run (receipt emission) but the regen-pair diff is manual in the written test ("inspect each receipt"), and whether it is cheap enough to run per regen depends on receipt storage (FAIL-3 open question 1). An un-automated diff is a runbook step the loop will skip.
- **F3-S1** is cheap: a CI fixture suite, blocking, already the cheapest gate in the family.
- **F8-S3** is moderate: a golden suite per regen, affordable if wired as a gate, rotting if coverage is not maintained (which is a labor cost, not a compute cost).

**What gets skipped under pressure.** The expensive and flaky checks go first, in this order: the human differential oracle (the manual 320px device check, which is also the family's only anti-Goodhart anchor, attack (d)), then engine parity (WebKit dropped, Chromium only; reopens FAIL-1 A5), then the interaction matrix (reopens A3, fixed off-canvas panels), then font-settling discipline (reopens A1), then the F7 pairwise comparison (degraded to fingerprint equality), then the F3-S2 receipt diff (becomes unread logs). What survives cost pressure is F3-S1's CI fixtures and F8-S3's golden suite: the cheapest, most deterministic gates. Those are also the two most rot-prone members (attack (b)). So cost pressure does not just weaken the family; it selects for the members whose failure mode is silent expectation rot.

**Per-member breakage.** F1-S1 BREAKS under sampling pressure (its claims require the full matrix; sampled widths reopen the class on unsampled widths, per its own open question 2). F7-S1 WEAKENED (fingerprint registry keeps crude clone detection; the calibrated divergence claim is lost). F3-S2 WEAKENED (the diff becomes manual, then skipped). F3-S1 SURVIVES (cheap CI gate). F8-S3 SURVIVES as a gate if wired; its coverage rots under labor pressure, not compute pressure.

**Does the merged abstraction survive?** Not as stated. "Five oracles run per regen, all blocking" is not implementable at scale without a stated budget, and the degradation is silent unless the skip policy names its residual risk. FAIL-3's falsification named the pattern: a test whose procedure is "inspect" by a human is a suggestion, not a gate. Under cost pressure, members of this family degrade into suggestions. The honest merged statement names a per-regen compute budget, a skip policy, and, for every skipped check, a residual-risk statement naming which classes reopen (cf. FAIL-1 strengthened test (x): "sampled-with-justification that names the residual risk"). Without that, cost converts the family from a gate into a ritual.

---

## 4. Verdict: WEAKENED

The merged abstraction does not fall: each member contains a genuine mechanism (measured physical properties; pinned regression pairs; enforced accounting; coupling invariants; rendered-outcome pins), and the family genuinely catches the crude, honest-bug shapes it was built for. But the merged claim as stated, **"an independent verifier checks the output against declared expectations; violations block promotion; the verifier shares no code, models, or trust with the generator,"** does not survive the five attacks:

- Independence is asserted, never constructed or tested (a). All five verifiers share authorship, and most share substrate, with the generator.
- Expectations rot through unguarded updates (b). The update path reintroduces the drift the oracle catches, one blessed edit at a time.
- The repair half is self-falsifying (c). It must be struck or re-gated as a new declared input.
- Goodhart: F7-S1 is the most gameable member; the family has no built gaming gates; the only anti-gaming anchor is the human check the family was built to replace (d).
- Cost: no budget, no skip policy; under pressure the oracles degrade into suggestions, selecting for the most rot-prone members (e).

**Pruned honest claims, per member.** What each member can honestly claim after this round:

- **F1-S1:** catches static, load-time, same-engine overflow in the oracle's own environment under block-and-escalate; verdicts cross-checked against a real device post-font-settling. Does not catch font-swap, lazy-load, interaction-triggered, fixed off-canvas, 100vw-scrollbar, WebKit-only, or sub-pixel overflow as specified. The #7 divergence claim is struck until the signature exists with calibrated fixtures. Repair-or-block is struck; block-and-escalate only.
- **F3-S1:** detects drift-from-pinned per shape, given correctly-authored fixtures. Does not prevent blindness-at-birth; does not police shapes the extractor refuses. The #3 claim holds only jointly with quarantine routing (refusal must be loud) and an independent fixture oracle.
- **F3-S2:** catches drops the traversal can see but the emitter drops (seen-but-dropped), and count-drift across regens if the diff is automated and receipts are queryable. Does not catch traversal-level blindness, content-drift with stable counts, or laundered reason codes as specified. The #8 claim is untested pending owner-loop ID reconciliation.
- **F7-S1:** catches crude structural clones (byte-structure copies with renamed strings) and genuine drift in the tested shapes. Does not prevent threshold gaming, d_in inflation, or median-pair convergence as specified. The anti-gaming rule is aspirational until the explainability decomposition and gaming-injection tests exist.
- **F8-S3:** pins golden-covered corrections against rendered output as a regen gate; doubles as an object-roster check (dangled anchors catch dropped entities). Does not cover uncovered corrections, does not detect non-golden drift (the #4 claim is struck), and rots in both directions without the roster check and a maintenance protocol.

**Pruned merged claim.** After generation, five checkers with no shared trust in the generator's self-assessment verify declared expectations against the output, and violations block promotion. The checkers share authorship with the generator and some share substrate; their expectations are team-authored and rot without a second-level gate; one member's metric is gameable and the family has no built gaming defense beyond a human differential check; the repair branch is removed; cost pressure degrades members unevenly and the skip policy must name residual risk. Under those conditions the family is a strong bug-catcher for honest defects. It is not a guarantee against common-mode input blindness, expectation rot, proxy optimization, or budget-driven degradation.

---

## 5. The single strongest falsifiable test for the merged oracle

This test incorporates the strengthened oracles from the individual falsifications: F1's differential-oracle clause (verdict must agree with an independent device check), font-settling and engine parity (F1 iv, vii), repair determinism (F1 ix), the refusal counterfactual and independent fixture oracle (F3-S1 strengthened 1-3), the receipt negative control and laundering budget (F3-S2 strengthened 1-2), the lineage assertion and positive control (F3-S4 strengthened 2-3), the gaming injection and explainability decomposition (F7 iv, v), the verifier differential corpus (F7 viii), the golden retraction diagnosis and coverage roster (F8 1-2), and the gate-bypass attempt (F8 4).

**Input.** A pipeline fixture set with nine poisoned runs plus one clean control:

1. **Font-swap run:** hero heading in a display webfont with wider metrics than the fallback; oracle must wait for document.fonts.ready; the matrix runs in Chromium and WebKit; an independent manual check on a real device post-swap must agree with the oracle's verdict on every width.
2. **Masking run:** the same overflow fixed with overflow-x:hidden instead of composition. Must FAIL (masking is not repair) and the failure must name the masking.
3. **Refusal run:** a valid input shape the extractor does not accept (the live @graph-wrapper shape against the current extractor). The outcome must be either a registered acceptance with a fixture whose expected output was cross-checked by a different-lineage oracle, or a quarantine routing with a gap event. Silent null FAILS the merged gate.
4. **Pinned-blindness run:** a fixture whose pinned expected output encodes the refusal bug. A repair that fixes the traversal must NOT be reverted to satisfy the fixture; updating the fixture requires re-certification by the independent-lineage oracle. Reverting the repair to keep the fixture green FAILS.
5. **Laundering run:** mint a new reason code covering the dropped candidates from run 3. The explained-but-unrecognized volume budget must fire an alert. Silence FAILS.
6. **Gaming run:** spec A cloned with section reorder, one component rename, and name-hash token jitter. The gate must FAIL the pair and decompose d_out into graph-explained vs unexplained, with only explained d_out counting toward the coupling. Passing the gamed pair FAILS the merged oracle.
7. **Repair determinism run:** run the harness twice with repair enabled across differing font-timing environments; byte-compare final shipped DOM; every repair must appear in the provenance log as a declared, attributed input change. Any unlogged or environment-dependent repair FAILS, and the repair branch is then struck from the build.
8. **Retraction plus coverage run:** retract one golden correction in the decision store; run regen and the suite. The suite must FAIL with a message naming the retraction and linking the store record (bare "assertion mismatch" FAILS the test-of-the-test). Separately: record a real correction on a field with no golden twin, corrupt the read path for that field, run regen and the suite. The suite must FAIL via the roster check (every decision-store correction needs a golden twin or the gate fails). Green while a real correction is lost on the rendered page FAILS.
9. **Bypass run:** remove the golden suite and run the production regen path end to end, then attempt to serve. Serving must be refused. Serve succeeding with no suite present FAILS (adversarial, not documentary).
10. **Control:** a clean fixture known to pass. Must promote.

**Preconditions asserted by the test itself (not assumed).** Before any run: the verifier lineage assertion passes (CI fails if any verifier resolves to the same dependency lineage as the generator's corresponding stage); the positive control fires (a synthetic input with known generator/verifier divergence produces the expected disagreement, proving every verifier in the family can fire at all); the verifier differential corpus (frozen hand-labeled pairs: clone, genuinely different, gaming permutation, duplicate-inflated, same-count-different-content) classifies correctly with the generator blind to verifier scores.

**Skip-policy clause.** Run the gate once more under the production skip policy (sampled widths, fingerprint-only divergence, no manual device check). The policy must emit a residual-risk statement naming exactly which classes reopen under sampling (font-swap overflow, WebKit-only overflow, interaction-triggered overflow, calibrated divergence, gaming permutations). A skip policy with no residual-risk statement FAILS.

**Expected observable outcome.** Every poisoned run fails loudly with a named cause; the preconditions pass; the control promotes; the skip policy names its residual risk.

**Proves the merged oracle DOESN'T work.** If any poisoned run promotes; if any verifier cannot fire its positive control; if the lineage assertion is absent or bypassed; if the gamed pair passes; if a repair is unlogged; if the suite is green while a real correction is observably lost; if serving succeeds with the suite removed; or if the skip policy degrades checks without naming the reopened classes. The single strongest falsifier is the composed gaming case from attack (d): a masked, pinned, laundered, jittered build that all five members certify. If the family certifies it, the family measures proxies, not properties, and the merged abstraction is decorative.

---

## 6. What would promote the merged abstraction to WITHSTANDS

Each item below is named in the individual falsifications; none is built. The merged abstraction reaches WITHSTANDS when all hold simultaneously, because the attacks above are compositional and the defenses must be too:

1. **Constructed independence:** verifier lineage assertions in CI, positive controls proving each verifier can fire, the verifier differential corpus with generator blindness to scores, and fixture expected-outputs cross-checked by a different-lineage oracle (`oracle: self` fixtures excluded from coverage claims).
2. **Second-level expectation gating:** fixture updates, reason-code minting, threshold/bar changes, and golden-set edits each re-pass a reference the update cannot move (the FAIL-3 case-(ii) pattern generalized); explained-but-unrecognized volume has a budget; the golden roster check is a gate.
3. **Repair struck:** block-and-escalate only; any repair re-enters as a declared attributed input and passes all five checks again.
4. **Built gaming defense:** the d_out explainability decomposition with gaming injection as its acceptance case; masking named as failure; the human differential check retained as the backstop with its blind spots (font timing, engine) stated.
5. **Cost honesty:** a per-regen compute budget, a skip policy, and a residual-risk statement for every skipped check; degradation that is named is acceptable, degradation that is silent is not.

Until then, the verdict stands: **WEAKENED**. The family is the strongest bug-catching machinery in the challenge, and its claims must be pruned to what its tests actually establish.
