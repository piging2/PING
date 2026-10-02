# PING AUTONOMY GRAND CHALLENGE: EVIDENCE QUOTE BANK

Date: 2026-09-23. Research only. Mined from the falsification passes.

**Sources:** `failures/FAIL-1-falsification.md`, `FAIL-2-falsification.md`, `FAIL-3-falsification.md`, `FAIL-5-falsification.md`, `FAIL-6-falsification.md`, `FAIL-7-falsification.md`, `FAIL-8-falsification.md`, `FAIL-9-falsification.md`, `failures/MERGED-conflict-falsification.md`, `failures/MERGED-correction-falsification.md`, `failures/MERGED-oracle-falsification.md`, `failures/MERGED-typed-seam-falsification.md`, plus `DELETE-OUR-NEED.md` and `ARCHAEOLOGY-SUPPLEMENT.md`.

**Conventions:** Each quote is condensed to 1-2 sentences, faithful to the source, no invented wording. Entries marked `[condensed]` had wording tightened for the 1-2 sentence form. Entries marked ⭐ belong to the VERBATIM-10 (Section G), exact quotes with section refs. Note: there is no `FAIL-4-falsification.md` in the tree; FAIL-4's source report (`FAIL-4-fixture-drift.md`) supplies its quote, flagged where used. No em dashes used anywhere in this file, per policy.

---

## A. THE SCOREBOARD: verdicts and falls

**A1.** ⭐ "No survivor WITHSTANDS as stated, because in all three cases the falsifiable test is weaker than the claim: the shared grep oracle cannot see entity-encoded payloads, and each test omits the exact path its mechanism's guarantee depends on."
Source: FAIL-2-falsification.md, Verdict summary (all three survivors).
Significance: the FAIL-2 headline; all three survivors weakened because every test is weaker than its claim.

**A2.** ⭐ "What survives is narrow and real: refusal of fragments with no binding at all. That is citation enforcement, not claim-binding prevention as the file defines it."
Source: FAIL-5-falsification.md, S2 (prevention-first generation) verdict.
Significance: the one outright FALLS in the per-lane rounds; a #5 prevention claim demoted to citation enforcement.

**A3.** ⭐ "The suite pins a subset of rendered output; a changed non-golden field passes silently, which is precisely the failure the claim says is impossible."
Source: FAIL-8-falsification.md, Survivor 3 (golden-set survival tests) verdict.
Significance: FAIL-8 S3's #4 claim struck, not patched; a golden suite is pinned points, not a page census.

**A4.** [condensed] "#7 clone-sitespecs: FALLS as specified. No signature definition, no test fixture; the prevention claim is vacuous until the signature exists and calibrated fixtures pass."
Source: FAIL-1-falsification.md, Survivor 1 (empirical oracle), #7 claim.
Significance: the only FALLS in FAIL-1; an assertion with no definition and no test provides no prevention.

**A5.** [condensed] "No survivor WITHSTANDS as specified and tested. No survivor FALLS outright: each contains a genuine mechanism whose claims exceed what its test establishes."
Source: FAIL-3-falsification.md, Verdict summary.
Significance: the whole-lane pattern: the mechanisms are real, but the tests assume the preconditions they depend on.

**A6.** [condensed] "No survivor withstands either: every test verifies behavior on a fixed fixture while the claimed property is structural, every test's threat list is frozen at 2026 channels, and the realistic failures pass every test as written."
Source: FAIL-6-falsification.md, Bottom line.
Significance: FAIL-6's one-sentence epitaph for the fixed-fixture testing pattern across all four survivors.

---

## B. SHARPEST SINGLE ATTACK PER LANE

**B1.** ⭐ "Auto-repair is not merely risky; it is self-falsifying."
Source: FAIL-1-falsification.md, Cross-survivor findings, C-A.
Significance: the load-bearing attack on Survivor 1; the repair branch falsifies the survivor's own determinism claim, leaving only block-and-escalate consistent.

**B2.** ⭐ "The rendered bytes contain `&#106;avascript:`, so `grep javascript:` finds nothing. The test passes; the browser executes."
Source: FAIL-2-falsification.md, section 0, "Cross-cutting finding: the shared oracle weakness".
Significance: the single attack that broke all three FAIL-2 survivors' shared oracle; a grep cannot distinguish a safe serializer from a vulnerable one.

**B3.** [condensed] "The gate is green during the exact historical failure, because refusal is not acceptance and the test only polices acceptance."
Source: FAIL-3-falsification.md, Survivor 1 (shape-coverage fixture registry), Attack 1A.
Significance: FAIL-3 S1's coverage gate certifies the Coppersmith blindness configuration as green; the real failure class (refusal) is outside the test's counterfactual.

**B4.** (source note: FAIL-4 has no falsification file; quote from the source report.) [condensed] "A full-workspace grep for fixture drift returned zero hits. The class was named, but it is currently guarded by digest comparisons and the run-twice spec digest check, not by a named invariant."
Source: FAIL-4-fixture-drift.md, Grounding, Negative finding.
Significance: the gap the FAIL-4 mechanisms close; detection (run twice, compare) is not prevention.

**B5.** "The verifier cannot distinguish 'presentation around a supported service name' from 'unsupported predicate in marketing dress' because the distinction lives in the label, which the verifier trusts."
Source: FAIL-5-falsification.md, S1, Attack A1 (flourish predicates).
Significance: the representation gap; the verifier trusts labels applied by the one component whose honesty is in question.

**B6.** "A red-team suite whose fixture lacks the leaking channel is a test of the fixture, not of the system."
Source: FAIL-6-falsification.md, S4, Attack 2 ("green before Pergola").
Significance: S4's mutation suite would have been green the day before the actual leak; threat lists frozen at 2026 channels miss the novel channel.

**B7.** [condensed] "A planner that falls back to a fixed template but derives section order and token choice from hash(businessName) satisfies the letter of the coupling invariant while violating the anti-gaming rule in every pair it touches."
Source: FAIL-7-falsification.md, Survivor 1, Attack 1A (threshold gaming).
Significance: the d_in/d_out metric rewards cosmetic jitter; without the explainability decomposition it measures variance, not coupling.

**B8.** [condensed] "The test as written PASSES while the owner's intent (this service hidden) is defeated: the hide patch stays honored on a dead identity while the merged successor renders fully visible with no owner decision."
Source: FAIL-8-falsification.md, Survivor 1, Attack A (entity merge).
Significance: S1's vanish-case disjunction mistakes "patch not dropped" for "correction effective"; identity reorganization defeats id-string anchoring.

**B9.** [condensed] "The leak shows up: after it rendered, in a log. That is detection, not prevention. A mechanism that logs a privacy leak post-render does not prevent the leak; it documents it."
Source: FAIL-9-falsification.md, M3, Attack 4.
Significance: M3's #6 prevention claim does not survive; the mechanism's own description is post-render detection.

---

## C. CROSS-SURVIVOR PATTERNS

### Ask FYD unguarded

**C1.** ⭐ "The Ask FYD surface is unguarded by all three survivors. Survivor 1 gates static projection; its oracle never runs on conversational output. #1, #5, and #6 all reopen through the chat surface, untested by every falsifiable test in the file."
Source: FAIL-1-falsification.md, Cross-survivor findings, C-B.
Significance: every prevention verdict in FAIL-1 applies to static projection only; the conversational seam restarts everything from zero.

**C2.** "Until the handoff seam is defined, S1/S2/S3 cannot be claimed to protect Ask FYD output at all, and FYD-BAR-001's zero unsupported published factual claims bar is untestable for Q&A."
Source: FAIL-5-falsification.md, section 4, "The Ask FYD seam assessment", bottom line.
Significance: the Ask FYD handoff seam is undefined; triage labels produced by the LLM whose honesty is in question are self-graded labels, not mechanisms.

**C3.** [condensed] "If Ask FYD outputs are not sink-validated, Survivor 2's verdict upgrades to FALLS on #2 and #5. The upgrade condition is a live open question."
Source: FAIL-2-falsification.md, Survivor 2 (sink-side validation), verdict.
Significance: the ask seam is the load-bearing condition that promotes WEAKENED to FALLS; the file names it as open question 7.

### Single-instant, single-actor tests

**C4.** ⭐ "Each mechanism is exactly as strong as its test's imagination, and each test imagines a single instant, a single actor, and a cooperative pipeline. The attacks that land come from time (staleness, rot, invalidation), from a second actor, and from writers outside the pipeline."
Source: FAIL-8-falsification.md, Cross-survivor observations.
Significance: the universal failure of the falsifiable tests: they probe a moment; the attacks that land are functions of time, a second actor, and out-of-band writers.

### Survivors specified against a nonexistent architecture

**C5.** ⭐ "The survivors are therefore specified against an architecture that does not exist yet."
Source: FAIL-6-falsification.md, Cross-cutting findings, C2.
Significance: the actual production fix for the grounding incident is a member of the cut class; every test should run against the production pipeline.

### The merged families

**C6.** "The family converted silent collapse into documented irresolution, which is progress, but documented irresolution is not resolution, and at the product surface it can be worse than a deterministic wrong pick."
Source: MERGED-conflict-falsification.md, section 6, Verdict.
Significance: the conflict family's honest net result; #9's harm reappears in four new costumes (audited picks no one sees, unread universal hedges, ghost conflicts, permanent unownered queues).

**C7.** "Against a time-crossing attack it does exactly what it promises, and what it promises is the failure: faithful preservation of an outdated judgment against the true current source, forever."
Source: MERGED-correction-falsification.md, Attack (d).
Significance: on the time axis the correction family is falsified, not weakened; timeless always-preserve policy is itself the staleness failure.

**C8.** "It does not keep: any #1 claim (emergent overflow is well-typed), any #7 claim (differentiation is not a seam property), any #9 claim (markers die downstream), or any Ask FYD coverage (the second seam restarts every guarantee from zero)."
Source: MERGED-typed-seam-falsification.md, section 5, Verdict.
Significance: the pruned honest seam; the typed seam is a sound layer on static projection, not a standing guarantee.

**C9.** [verbatim, framing trimmed] "A masked, pinned, laundered, jittered build that all five members certify. If the family certifies it, the family measures proxies, not properties, and the merged abstraction is decorative."
Source: MERGED-oracle-falsification.md, section 5, "What proves the merged oracle DOESN'T work".
Significance: the composed Goodhart case; the family's only anti-gaming anchor is the human check that cost pressure drops first.

---

## D. PHANTOM ANALOGS

**D1.** ⭐ "Any Jev-lane mechanism bound to PING run history is built on air."
Source: ARCHAEOLOGY-SUPPLEMENT.md, section (a), item 1.
Significance: the single most consequential phantom: the Run entity and Execution history have zero hits repo-wide; every run-scoped reuse is DOA.

**D2.** "Do not let the 7 coverage-matrix claimants for #6 mask this: they enforce a classification, none of them creates it."
Source: ARCHAEOLOGY-SUPPLEMENT.md, section (d), #6 visibility-error row.
Significance: #6 visibility is the biggest PING gap; many enforcement claimants, zero classification authority; the capability model is dormant and unconnected.

**D3.** "Only F1S1 claims #7, and its own report flags the structural signature and divergence threshold as undefined. Treat as effectively uncovered until F7 completes."
Source: ARCHAEOLOGY-SUPPLEMENT.md, section (d), #7 clone-sitespecs row.
Significance: #7 is effectively uncovered; the thinnest class overall, with no LIVE help.

---

## E. DELETE-OUR-NEED

**E1.** ⭐ "Net result: out of 15 lanes and roughly 200 mechanisms, exactly one wave-1 mechanism family survives the gate."
Source: DELETE-OUR-NEED.md, "The gate".
Significance: the delete-our-need headline; the LANE-14 handoff contract is the sole survivor, everything else deleted with one reason each.

**E2.** [condensed] "Post-mortem explanation is detection, not prevention: zero of the 9."
Source: DELETE-OUR-NEED.md, LANE-11 deletion entry.
Significance: the one-line kill for observability machinery; every falsification scenario is framed as an after-the-fact investigation, which prevents nothing.

**E3.** [condensed] "Wave 1's only near-miss on #8 correction-loss: every other wave-1 mechanism leaves #8 completely uncovered, so this call decides whether wave 1 contributes anything at all to correction-loss."
Source: DELETE-OUR-NEED.md, section (e), "Largest open delete/keep judgment call".
Significance: LANE-18 invariant 7 re-scoped to the FYD pipeline is the unresolved keep/delete call and wave-1's only near-miss on #8.

---

## F. WHAT WOULD PROVE IT BROKEN (from the falsifiable tests)

**F1.** "What proves the mechanism DOESN'T work: any byte difference across the 5 environment-varied runs with identical inputs (an undeclared input leaked in), OR identical output bytes after the ownerOverrides change (a declared input was silently ignored, which is also drift)."
Source: FAIL-4-fixture-drift.md, S1 falsifiable test. (No falsification file exists for FAIL-4.)
Significance: the sharpest prevention-proving bar in the corpus: environment-varied runs must be byte-identical; a silently ignored declared input is drift too.

**F2.** "The file's falsification condition is exactly this: 'a fragment passes validation while its binding points to a claim it does not actually present.' The condition is satisfiable by construction."
Source: FAIL-5-falsification.md, S2, Attack B1.
Significance: S2's own falsification condition is satisfiable by construction; deterministic validation checks binding presence, not semantic containment.

**F3.** "A survivor's test must include a property-removal mutant, a variant of the system where the structural property is removed but fixture behavior is preserved, which the test must fail."
Source: FAIL-6-falsification.md, Cross-cutting findings, C3.
Significance: the standing rule that separates property tests from fixture theater.

**F4.** "A family that passes it has earned 'nothing silently overwrites' without scope qualifiers."
Source: MERGED-correction-falsification.md, section 6, "The single strongest falsifiable test" (the hostile-lifetime gauntlet).
Significance: two actors, one re-identification, one stale correction, N silent regens; the current family fails modes 1, 2, 3, and 5.

**F5.** [condensed] "For each structural difference the verifier must cite the graph feature that explains it; differences with no citing feature are scored as gaming, not differentiation."
Source: FAIL-7-falsification.md, Survivor 1, strengthened test (v).
Significance: the only mechanized anti-gaming gate proposed in the challenge; still unbuilt.

---

## G. THE VERBATIM-10

Exact quotes, section refs. All ten are em-dash free as quoted.

**V1.** "No survivor WITHSTANDS as stated, because in all three cases the falsifiable test is weaker than the claim: the shared grep oracle cannot see entity-encoded payloads (section 0), and each test omits the exact path its mechanism's guarantee depends on (deserialization sites for S1; the full sink inventory and second seam for S2; the known-good classifier boundary and availability corpus for S3)."
Ref: FAIL-2-falsification.md, "Verdict summary".

**V2.** "The rendered bytes contain `&#106;avascript:`, so `grep javascript:` finds nothing. The test passes; the browser executes."
Ref: FAIL-2-falsification.md, section 0, "Cross-cutting finding: the shared oracle weakness".

**V3.** "Auto-repair is not merely risky; it is self-falsifying."
Ref: FAIL-1-falsification.md, "Cross-survivor findings", C-A ("Repair authority is decided by the falsification, not by taste").

**V4.** "What survives is narrow and real: refusal of fragments with no binding at all. That is citation enforcement, not claim-binding prevention as the file defines it."
Ref: FAIL-5-falsification.md, "S2 verdict: FALLS on #5; WEAKENED on #6".

**V5.** "The suite pins a subset of rendered output; a changed non-golden field passes silently, which is precisely the failure the claim says is impossible."
Ref: FAIL-8-falsification.md, "Survivor 3: Correction survival tests ... Verdict" (from the sentence "#4: FALLS as stated. The suite pins a subset of rendered output; a changed non-golden field passes silently, which is precisely the failure the claim says is impossible.").

**V6.** "Net result: out of 15 lanes and roughly 200 mechanisms, exactly one wave-1 mechanism family survives the gate."
Ref: DELETE-OUR-NEED.md, "The gate".

**V7.** "Each mechanism is exactly as strong as its test's imagination, and each test imagines a single instant, a single actor, and a cooperative pipeline. The attacks that land come from time (staleness, rot, invalidation), from a second actor, and from writers outside the pipeline."
Ref: FAIL-8-falsification.md, "Cross-survivor observations", observation 2 ("Time is the adversary the tests forgot").

**V8.** "The survivors are therefore specified against an architecture that does not exist yet."
Ref: FAIL-6-falsification.md, "Cross-cutting findings", C2.

**V9.** "The Ask FYD surface is unguarded by all three survivors (open question 7). Survivor 1 gates static projection; its oracle never runs on conversational output. Survivor 2 gates static slots; answer cards render LLM-generated layout (unbreakable tokens, wide tables) through a second seam the typed contracts do not cover. Survivor 3 covers static projection purity; per-query answers are not regenerations of declared inputs. #1, #5, and #6 all reopen through the chat surface, untested by every falsifiable test in the file."
Ref: FAIL-1-falsification.md, "Cross-survivor findings", C-B.

**V10.** "Any Jev-lane mechanism bound to PING run history is built on air."
Ref: ARCHAEOLOGY-SUPPLEMENT.md, section (a) "Dead on arrival", item 1 (the Jev-lane standing instruction).
