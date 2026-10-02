# PING Autonomy Grand Challenge: Cross-Class Coverage Matrix (mapper prep)

**Date:** 2026-09-23. **Mode:** research only, no implementation.
**Source lanes:** FAIL-1 (mobile-overflow), FAIL-2 (unsafe-url), FAIL-3 (graph-blindness), FAIL-5 (claim-binding), FAIL-9 (conflict-collapse). F4, F6, F7, F8 still running; not waited on.
**Mapper hard gate:** each MECHANISM-LIBRARY.md survivor must prevent >=2 of the 9 classes.

Failure classes: #1 mobile-overflow, #2 unsafe-url, #3 graph-blindness, #4 fixture-drift, #5 claim-binding, #6 visibility-error, #7 clone-sitespecs, #8 correction-loss, #9 conflict-collapse.

---

## 1. Survivor inventory (17 survivors, 5 completed lanes)

| ID | Mechanism (short) | Lane | Claims to prevent | Count |
|---|---|---|---|---|
| F1S1 | Post-generation empirical oracle (render, measure, assert, repair-or-block) | F1 | #1, #4, #7, #8 | 4 |
| F1S2 | Typed projection seam with capability contracts | F1 | #1, #2, #5, #6 | 4 |
| F1S3 | Canonical pure projection (pure fn of declared inputs + pinned pipeline version) | F1 | #4, #8 | 2 |
| F2S1 | Schema-typed trust with capability-specific allowlists | F2 | #2, #5, #6 | 3 |
| F2S2 | Sink-side validation at the render seam | F2 | #2, #5, #6 | 3 |
| F2S3 | Fail-closed defaults at every seam crossing | F2 | #2, #5, #6 | 3 |
| F3S1 | Shape-coverage fixture registry | F3 | #3, #4 | 2 |
| F3S2 | Extraction receipts with unexplained-drop alerts | F3 | #3, #4, #8 | 3 |
| F3S3 | Unknown-shape quarantine (UNRECOGNIZED_SHAPE / UNRESOLVED_CONFLICT) | F3 | #3, #9 | 2 |
| F3S4 | Dual-parser cross-check on sampled inputs | F3 | #3, #4 | 2 |
| F5S1 | Projection-seam binding verifier (verifyPresentationBinding) | F5 | #5, #6, #9 | 3 |
| F5S2 | Prevention-first generation (supported claims in, bound fragments out) | F5 | #5, #6 | 2 |
| F5S3 | Claim-level provenance pointers, fail-closed dangling resolution | F5 | #5, #8 | 2 |
| F9M1 | Conflict as first-class evidence state (CONFLICTING class) | F9 | #9, #5, #8 | 3 |
| F9M2 | Certainty attenuation at the answer seam | F9 | #9, #5 | 2 |
| F9M3 | Explicit auditable source-priority policy (loser stays visible) | F9 | #9, #5, #6 | 3 |
| F9M4 | Conflict surfacing as owner correction tasks | F9 | #9, #5, #8 | 3 |

All 17 pass the >=2 gate on their own claims. The mapper's job is to verify the claims, then merge.

---

## 2. Coverage matrix: class by class

Each row is one failure class; each entry is a survivor that claims to prevent it.

- **#1 mobile-overflow:** F1S1 (viewport assertion measures rendered output), F1S2 (geometry-typed slots make overflow inconstructible). **2 survivors.**
- **#2 unsafe-url:** F1S2 (capability-typed URL slots, same seam), F2S1 (schema-typed trust, allowlists), F2S2 (sink-side validation at render), F2S3 (unknown scheme neutralized). **4 survivors.**
- **#3 graph-blindness:** F3S1 (shape registry pins extraction), F3S2 (receipts expose unexplained drops), F3S3 (unknown shapes quarantined loud), F3S4 (dual-parser disagreement). **4 survivors.**
- **#4 fixture-drift:** F1S1 (determinism assertion), F1S3 (purity makes silent drift impossible), F3S1 (pinned fixtures fail on drift), F3S2 (receipt diffs catch drift), F3S4 (pinned reference parser is the fixed ruler). **5 survivors.**
- **#5 claim-binding:** F1S2 (evidence-bound fact types), F2S1, F2S2, F2S3 (same typed-slot/defaults pattern), F5S1 (binding verifier), F5S2 (prevention-first generation), F5S3 (dangling pointers fail closed), F9M1 (CONFLICTING cannot bind as settled), F9M2 (answer grammar gate), F9M3 (policy decision is evidence), F9M4 (pending conflicts defer). **11 survivors.**
- **#6 visibility-error:** F1S2 (visibility classification on the type), F2S1, F2S2, F2S3 (same pattern), F5S1 (field-visibility seam is the companion module), F5S2 (generator never receives private facts), F9M3 (priority policy encodes visibility tiers). **7 survivors.**
- **#7 clone-sitespecs:** F1S1 (structural-divergence assertion). **1 survivor.**
- **#8 correction-loss:** F1S1 (correction-preservation assertion), F1S3 (corrections are declared inputs), F3S2 (receipts reconcile corrections-in vs surviving), F5S3 (owner assertions outrank, SOURCE_CHANGED events), F9M1 (corrections are stronger evidence), F9M4 (task loop is the correction lifecycle). **6 survivors.**
- **#9 conflict-collapse:** F3S3 (UNRESOLVED_CONFLICT quarantine), F5S1 (CONFLICTING survives into render model), F9M1 (conflict records as entities), F9M2 (no false-certainty grammar), F9M3 (audited priority), F9M4 (owner task queue). **6 survivors.**

---

## 3. Gap analysis

### (a) Classes with ZERO coverage so far: none.

The clone-sitespecs hypothesis is confirmed as the weak spot but it is not zero: F1S1 claims #7 via its structural-divergence assertion. Every one of the 9 classes has at least one claimant.

### (b) Single point of failure: #7 clone-sitespecs (F1S1 only).

F1S1 is the only mechanism in the completed lanes claiming #7. Worse, its own report flags this as the shakiest claim (open question 3: the structural signature and the divergence threshold are undefined; a bad threshold makes the assertion vacuous or a permanent build blocker). See Weak-claim flags below. The mapper should treat #7 as effectively uncovered until F7 completes.

### (c) Thin but non-single coverage worth noting

- **#1 mobile-overflow (2 survivors):** F1S1 measures, F1S2 constructs. They compose (construct then verify), but F1S2's coverage is contingent on the type-system escape-hatch inventory being complete (open question 4 in FAIL-1). If F1S2 leaks, #1 rests on F1S1 alone.
- **#6 visibility-error:** nominally 7 survivors, but most are one pattern ("visibility classification rides on the type") enforced at different seams. If the classification itself is wrong at source, all of them enforce the wrong classification faithfully. The lane that owns classification (F6) has not completed; its survivors will be the authority.

---

## 4. Merge proposals

Guidance for the mapper: which survivors are the same mechanism at different layers, and the union coverage of each proposed merge.

### Merge A: The typed-seam family (F2S1 + F1S2 + F5S1 as core; F2S2 and F2S3 as seam discipline)

- F2S1 (schema-typed trust, capability allowlists), F1S2 (typed projection seam with capability contracts), and F5S1 (projection-seam binding verifier) all say one thing at three zoom levels: **trust-relevant metadata (scheme capability, evidence binding, visibility classification) rides on the type at the projection seam, and untyped material cannot reach the render tree.** F1S2's own report states it generalizes F2S1 from trust contracts to geometry contracts; F5S1's report describes the identical typed-slot pattern for factual claims. F5S1 adds the verify step (check at the seam), which is the "measure after construction" complement of the constructor discipline.
- F2S2 (sink-side validation) is the defense-in-depth clause of the same family: the seam re-derives trust at the last stage before execution rather than inheriting upstream say-so.
- F2S3 (fail-closed defaults) is the same family's answer for indeterminate inputs: the default when classification is unknown is the weakest safe form.
- Combined union: **#1, #2, #5, #6** (core merge) extending to the same set with F2S2/F2S3 (they add no new classes, only depth). If the mapper wants maximum library compression, all five fold into one entry: "typed projection seam: constructors carry trust metadata, verifier checks bindings, sinks re-validate, defaults fail closed." The mapper should decide whether to keep F2S2 separate, since it is the only one whose falsifiable test bypasses all upstream stages (stale fixtures, direct DB writes), which is a genuinely distinct failure shape worth naming.

### Merge B: The measure-and-compare family (F1S1 + F3S2)

- F1S1 (post-generation empirical oracle) measures the final rendered output against assertions; F3S2 (extraction receipts) reconciles input counts against output counts at the extraction stage. Both are the same invariant: **do not trust the stage's own success signal; compare its actual output against an independent accounting.**
- F1S1's determinism assertion and F3S2's regen-pair receipt diff are the same operation (compare two runs) at different layers.
- Combined union: **#1, #3, #4, #7, #8**. This is the broadest-coverage merged mechanism in the library, and the mapper should scrutinize its sub-claims precisely because breadth concentrates risk (see F1S1's #7 weakness).

### Merge C: The pinned-reference drift family (F3S1 + F3S4)

- F3S1 (shape-coverage fixture registry) and F3S4 (dual-parser cross-check with a pinned reference parser) are the same mechanism: **a fixed, pinned reference detects behavior change in the live component.** Fixtures pin expected output; the pinned parser pins expected parsing.
- Combined union: **#3, #4** (no expansion, pure consolidation). F1S3 (canonical pure projection) stays separate: it is determinism by construction, not by reference comparison, and the reports explicitly frame F1S1/F1S3 as the construct-then-verify pair.

### Merge D: The conflict-preservation lifecycle (F9M1 + F9M4 + F3S3-conflict-half; F9M2 + F9M3 as presentation layer)

- F9M1 (conflict as first-class evidence state) stores the disagreement; F9M4 (conflict as owner tasks) is the resolution loop; F3S3's UNRESOLVED_CONFLICT case (contradictory blocks quarantined rather than merged) is F9M1 restricted to the acquisition seam, so it folds in.
- F9M2 (certainty attenuation at the answer seam) and F9M3 (auditable source-priority policy) are the presentation half of the same lifecycle: what to show (policy) and how to say it (attenuated grammar).
- Full conflict-family union: **#3, #5, #6, #8, #9** (the #3 comes only from F3S3's shape-quarantine half; keep the shape half of F3S3 separate if merging). The mapper could reasonably file the whole D set as one library entry "conflict preservation and policy projection" or split storage (M1/M4) from presentation (M2/M3).

### Merge E: The correction-persistence pair (F5S3 + F9M1/M4-correction-half + F1S3)

- F5S3 (provenance pointers with owner assertions outranking sources), F9M1's "corrections as stronger evidence" clause, and F9M4's task loop describe one lifecycle: **a correction is an evidence record with priority, not an edit, and regen replays it.** F1S3 (canonical pure projection) is the structural guarantee underneath: corrections are declared inputs the function cannot silently drop.
- The mapper should merge the evidence-record lifecycle into one entry but keep F1S3's purity as the underlying construction principle. Combined lifecycle union: **#5, #8, #9**.

### Explicitly DO NOT merge

- **F5S2 (prevention-first generation) vs F5S1 (binding verifier):** same goal (no invented claims), opposite directions (prevent at generation vs catch at the seam). Nolan's doctrine treats them as complementary layers; keep both.
- **F3S1 vs F1S1:** fixture-pinning at the shape level is not the same as render-then-measure at the output level; collapsing them loses the layer distinction the falsifiable tests depend on.
- **F9M2 vs F9M1:** attenuation at the answer seam masks nothing upstream; it is harm reduction, not storage. Keep separate and note the asymmetry.

---

## 5. Weak-claim flags (mapper must scrutinize)

1. **F1S1 on #7 clone-sitespecs.** Sole coverage for #7, and the structural signature plus divergence threshold are undefined in its own open questions. A threshold that is too loose never fires; too tight blocks every build. Until the signature exists, this claim is an assertion, not a mechanism.
2. **F1S3 on #8 correction-loss.** Purity prevents silent drops only if the correction is correctly in the input set. FAIL-1 open question 6 admits the hard half of #8 is source-change re-anchoring: a correction keyed to a stale node ID silently stops applying. The claim covers the overwrite half, not the re-anchor half.
3. **F3S4 on #4 fixture-drift.** Detects drift only in the production extractor, only on sampled inputs, and only if the reference parser keeps a genuinely different implementation lineage (its own test demands this). It is a narrow drift detector, not the general class solution; the reports' other #4 claimants are broader.
4. **F3S1 on #4 fixture-drift.** Fixtures convert drift into failing tests only if fixture updates are honest. The report's own falsifiable test notes that blessing a behavior change by updating the fixture defeats it. Contingent on gate discipline, not self-sustaining.
5. **F9M2 on #9 conflict-collapse.** Attenuation blocks the customer-visible symptom (false certainty) while explicitly allowing the upstream merge to have already happened. It is downstream harm reduction; the merge-destroys-disagreement failure at the evidence layer is not prevented. The #9 claim should be marked partial.
6. **F5S1 on #9 conflict-collapse.** The verifier preserves CONFLICTING classification into the render model, but it does not create conflict records. Without upstream conflict detection (M1/F3S3-conflict-half), there is nothing to preserve. Dependent claim: it needs a conflict source to be real.
7. **F9M3 on #6 visibility-error.** The #6 rationale is that a priority policy encoding visibility tiers makes a private-fact leak "show up as a policy violation in the audit trail." Auditability after the fact is not prevention; the leak already happened. The #6 claim is the weakest in the set.
8. **F3S2 on #8 correction-loss.** The correction reconciliation needs receipts keyed on the same correction IDs the owner loop uses; FAIL-3 open question 7 flags that a parallel bookkeeping could drift from the owner loop. Dependent on identity alignment.
9. **F1S2 on #6 visibility-error.** Types enforce classification faithfully, including a wrong classification. The mechanism prevents misrouting, not misclassification. Enforcement-only claim.
10. **F2S1/F2S2/F2S3 on #5 and #6.** These four survivors all claim #5 and #6 through the identical typed-slot pattern. The class coverage is real (the falsifiable tests are strong), but the mapper should not count four independent coverages as redundancy: one escape hatch in the seam breaks all four at once. Shared-fate family, per Merge A.

---

## 6. Gap predictions: what F4, F6, F7, F8 must add

No completed lane needs F4/F6/F7/F8 to reach the >=2 gate for itself. The needs below are about **class coverage durability**, not individual survivor gates.

- **F7 (clone-sitespecs) is the critical lane.** #7 has exactly one claimant (F1S1), and it is the weakest claim in the library. For #7 to survive the gate with any robustness, F7 must produce at least one, ideally two, survivors that are natively about #7: graph-aware site differentiation, structural distance metrics, per-object visual differentiation budgets. If F7 fails to produce a >=2 survivor, the mapper should mark #7 as covered-by-one-weak-claim in MECHANISM-LIBRARY.md.
- **F6 (visibility-error) is the authority lane for #6.** Current #6 coverage is broad but shallow: seven claimants, nearly all "enforce the classification carried on the type." F6's survivors must supply what the completed lanes cannot: the classification source itself (what makes a fact private), the Pergola-leak shape (all output channels gated, not just the render template), and viewer-context authorization. Prediction: F6 adds 2-3 survivors; they will likely also claim #2 and #5/#9 (seam-gate patterns), which is expected convergence, not new coverage.
- **F8 (correction-loss) must close the re-anchor half.** #8 already has six claimants, but F1S3's own open question names the unsolved half: correction identity when the underlying source changed. F8's survivors should supply anchor-stable correction identity and the SOURCE_CHANGED_AGAINST_OWNER_ASSERTION semantics (previewed in F5S3's test). Prediction: F8 adds 1-2 survivors that are the real authority on #8 and will partially subsume F1S3's and F3S2's claims.
- **F4 (fixture-drift) is the authority lane for #4.** #4 already has five claimants, so the gate is safe; F4's job is canonicalization, choosing among or merging F1S1's determinism assertion, F1S3's purity, F3S1's fixtures, F3S2's receipt diffs, and F3S4's pinned reference. Prediction: F4 survivors will claim #4 plus one of #3/#8, overlapping existing coverage without extending it.
- **#1 mobile-overflow** has two survivors and no pending lane owns it. If F4 (fixture-drift) does not add a viewport-drift assertion, #1 stays at two with one contingent on the escape-hatch inventory. Acceptable but not redundant.
- **No class is currently at zero.** The mapper's real risks, in order: (1) #7 single-weak-claimant until F7 lands; (2) #1's two claimants share a seam with escape-hatch risk; (3) #6's broad coverage is classification-shallow until F6 lands.

---

## 7. One-line summary for the mapper

17 survivors across 5 lanes all clear the >=2 gate on their own claims. The library compresses to roughly 5-6 real mechanisms: the typed projection seam family (A), measure-and-compare (B), pinned-reference drift detection (C), the conflict lifecycle (D), the correction persistence lifecycle (E), plus prevention-first generation (F5S2) as the one genuine standalone. Watch F7 for #7: it is the only class whose coverage is a single weak claim, and everything else F4/F6/F8 add is consolidation, not gap-filling.
