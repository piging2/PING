# SURVIVOR ROSTER: canonical audit of the PING autonomy grand challenge mechanism hunts

**Date:** 2026-09-23. **Mode:** independent verification, research only. No edits to any report were made.
**Scope:** all 9 FAIL reports plus all 8 present falsification files under `~/workspace/ping-autonomy-challenge/failures/`. There is no FAIL-4-falsification.md; FAIL-4 verdicts are recorded as missing.

## Method notes

- For each survivor I extracted: the claimed prevented classes (numbers and names), whether each claimed class has an adjacent one-line reason (R+), and whether its falsifiable test contains all four parts (input, procedure, expected outcome, falsifier).
- Falsification verdicts come from the FAIL-N-falsification.md files only. WITHSTANDS / WEAKENED / FALLS are the falsifier's own verdicts. A class the falsification explicitly marked FALLS, NO LONGER PREVENTED, or NOT PREVENTED counts as broken; classes marked WEAKENED count as surviving in narrowed form.
- HONEST-CLASS-COUNT = claimed classes minus broken classes. Any survivor below 2 is flagged EXCLUDE.
- No duplicates were merged; this roster is lane-level so the mapper's merges can be checked row by row.

**Reason-present audit: all 32 survivors carry an adjacent reason for every claimed class. No bare claims were found.**

**Test-completeness audit: all 32 survivors have all four test parts (input, procedure, expected outcome, falsifier).** One caveat: FAIL-5 S2's test has all four parts textually, but the falsification judged it unexecutable as written (no deterministic predicate extractor is specified).

## Class key

#1 mobile-overflow | #2 unsafe-url | #3 graph-blindness | #4 fixture-drift | #5 claim-binding | #6 visibility-error | #7 clone-sitespecs | #8 correction-loss | #9 conflict-collapse

## Canonical roster

| FAIL file | Survivor name | Claimed classes (all R+) | Test complete | Falsification verdict | Classes surviving falsification | HONEST-CLASS-COUNT |
|---|---|---|---|---|---|---|
| FAIL-1 | S1 Post-generation empirical oracle (render, measure, assert, repair-or-block) | #1, #4, #7, #8 | YES | WEAKENED | #1 (weakened), #4 (weakened), #8 (weakened) | 3 |
| FAIL-1 | S2 Typed projection seam with capability contracts | #1, #2, #5, #6 | YES | WEAKENED | #2 (weakened), #5 (weakened), #6 (withstands) | 3 |
| FAIL-1 | S3 Canonical pure projection | #4, #8 | YES | WEAKENED | #4 (weakened), #8 (weakened) | 2 |
| FAIL-2 | S1 Schema-typed trust with capability-specific allowlists | #2, #5, #6 | YES | WEAKENED | #2, #5, #6 (all weakened) | 3 |
| FAIL-2 | S2 Sink-side validation at the render seam | #2, #5, #6 | YES | WEAKENED | #2, #5, #6 (all weakened) | 3 |
| FAIL-2 | S3 Fail-closed defaults at every seam crossing | #2, #5, #6 | YES | WEAKENED | #2, #5, #6 (all weakened) | 3 |
| FAIL-3 | S1 Shape-coverage fixture registry | #3, #4 | YES | WEAKENED | #4 (holds) | 1 - EXCLUDE |
| FAIL-3 | S2 Extraction receipts with unexplained-drop alerts | #3, #4, #8 | YES | WEAKENED | #3 (narrowed), #4 (count-drift only) | 2 |
| FAIL-3 | S3 Unknown-shape quarantine | #3, #9 | YES | WEAKENED | #3 (conditional), #9 (weakened) | 2 |
| FAIL-3 | S4 Dual-parser cross-check on sampled inputs | #3, #4 | YES | WEAKENED | #3 (weakened), #4 (weakened) | 2 |
| FAIL-4 | S1 Declared-input purity (pure render contract + hashing + golden byte-compare) | #4, #8, #7 | YES | missing | #4, #8, #7 (provisional) | 3 (provisional) |
| FAIL-4 | S2 Replay-mismatch tripwire (regen re-derives, byte-compares, divergence blocks publish) | #4, #8, #9 | YES | missing | #4, #8, #9 (provisional) | 3 (provisional) |
| FAIL-4 | S3 Typed semantic render model with fail-closed gate (evidence, visibility, URL-safety axes) | #5, #6, #2, #4 (supporting) | YES | missing | #5, #6, #2, #4 (provisional) | 4 (provisional) |
| FAIL-4 | S4 Content-derived identity (hash-based IDs, no random UUIDs) | #4, #8 | YES | missing | #4, #8 (provisional) | 2 (provisional) |
| FAIL-5 | S1 Projection-seam binding verifier (verifyPresentationBinding) | #5, #6, #9 | YES | WEAKENED | #5, #6, #9 (all weakened) | 3 |
| FAIL-5 | S2 Prevention-first generation (supported claims in, bound fragments out) | #5, #6 | YES (unexecutable per falsification) | FALLS on #5; WEAKENED on #6 | #6 (weakened) | 1 - EXCLUDE |
| FAIL-5 | S3 Claim-level provenance pointers with fail-closed dangling resolution | #5, #8 | YES | WEAKENED | #5 (weakened), #8 (weakened) | 2 |
| FAIL-6 | S1 Positive-license projection gate (single enforcement chokepoint) | #6, #5, #2 | YES | WEAKENED | #6, #5, #2 (all weakened) | 3 |
| FAIL-6 | S2 Visibility as canonical schema attribute, deny-by-default | #6, #4 | YES | WEAKENED | #6 (weakened), #4 (weakened) | 2 |
| FAIL-6 | S3 Trusted-context tenant enforcement at every read | #6, #8 | YES | WEAKENED | #6 (weakened), #8 (weakened) | 2 |
| FAIL-6 | S4 Adversarial boundary test suite with mutation testing | #6, #2 | YES | WEAKENED | #6 (weakened), #2 (weakened) | 2 |
| FAIL-7 | S1 Input-output variance coupling (differentiation metric) | #7, #4 | YES | WEAKENED | #7 (weakened), #4 (weakened) | 2 |
| FAIL-7 | S2 Evidence-gated composition (graph-driven section selection) | #7, #5 | YES | WEAKENED | #7 (weakened), #5 (weakened) | 2 |
| FAIL-7 | S3 Provenance-typed content slots (generated-copy quarantine) | #5, #8 | YES | WEAKENED | #5 (weakened), #8 (weakened) | 2 |
| FAIL-8 | S1 Typed owner-correction patches, decision store, re-apply on every read | #8, #6, #9, #5 | YES | WEAKENED | #8 (weakened), #6, #9 (partially), #5 (weakened) | 4 |
| FAIL-8 | S2 Three-way merge on regeneration (base/new/overlay, owner wins ties) | #8, #9, #4 | YES | WEAKENED | #8, #9 (weakened), #4 | 3 |
| FAIL-8 | S3 Correction survival tests (golden set as regen gate) | #8, #3, #4 | YES | WEAKENED | #8 (weakened), #3 | 2 |
| FAIL-8 | S4 Source-change diffing as first-class regen artifact | #8, #4, #3 | YES | WEAKENED | #8 (weakened), #4 (weakened), #3 (weakened) | 3 |
| FAIL-9 | M1 Conflict as first-class evidence state (CONFLICTING class) | #9, #5, #8 | YES | WEAKENED | #9 (storage scope), #5 (storage scope), #8 | 3 |
| FAIL-9 | M2 Certainty attenuation at the answer seam | #9, #5 | YES | WEAKENED | #9 (weakened), #5 (narrowed) | 2 |
| FAIL-9 | M3 Explicit, auditable source-priority policy (loser stays visible) | #9, #5, #6 | YES | WEAKENED | #9 (weakened), #5 | 2 |
| FAIL-9 | M4 Conflict surfacing as owner correction tasks | #9, #5, #8 | YES | WEAKENED | #9, #5, #8 (all weakened) | 3 |

## EXCLUDE flags

Only two survivors fall below the honest-count bar of 2:

1. **FAIL-3 S1 Shape-coverage fixture registry (honest count 1).** Reason: the falsification stripped its #3 claim ("NO LONGER PREVENTED as specified": the gate is green during the exact historical refusal failure, and fixtures pin whatever output existed at authoring time, including the bug). As specified it is a one-class mechanism (#4 drift-from-pinned only) and fails the >=2 hard rule. It recovers #3 only jointly with FAIL-3 S3 (quarantine refusal routing) and FAIL-3 S4 (independent fixture oracle).

2. **FAIL-5 S2 Prevention-first generation (honest count 1).** Reason: the falsification marked it FALLS on #5 by construction: bound overstatement passes deterministic validation (the file's own falsification condition, "round-the-clock emergency plumbing" from a two-claim input set, is satisfiable), and the stated test is unexecutable as written because no deterministic predicate extractor is specified. What survives is citation enforcement (refusal of fragments with no binding at all), not claim-binding prevention. Only #6 survives, itself weakened (prompt channel sound; intent channel, weight knowledge, and resolution-time record bleed untested).

## FALLS list (full survivor kills)

None. No survivor was fully falsified. Every survivor with a falsification file received WEAKENED (FAIL-5 S2 received FALLS on one of its two claimed classes but survives on the other). FAIL-4's four survivors have no falsification file, so they cannot be scored as fallen.

## Partial kills (class claims broken by the falsifications)

These class claims did not survive falsification; the survivors keep their remaining classes.

1. **FAIL-1 S1, #7 clone-sitespecs: FALLS as specified.** No structural-signature definition exists and the test has no fixture for the divergence assertion; the prevention claim is vacuous until the signature exists.
2. **FAIL-1 S2, #1 mobile-overflow: FALLS as claimed.** The typed seam stops authored fixed-pixel widths but not the emergent compositional overflow of the grounded flagship incident (sections valid in isolation, overflowing in composition); unbreakable tokens, the 100vw quantity error, runtime widgets, and owner custom CSS are further well-typed overflow paths.
3. **FAIL-3 S1, #3 graph-blindness: NO LONGER PREVENTED as specified.** Refusal is not acceptance, so the gate is green during the historical failure; fixtures pin authoring-time output including bugs; recovery requires declare-at-use dispatch plus an independent fixture oracle.
4. **FAIL-3 S2, #8 correction-loss: NOT PREVENTED as tested.** No correction case exists in the test and the correction IDs are not reconciled with the owner loop's IDs; the claim depends on unstated bookkeeping.
5. **FAIL-5 S2, #5 claim-binding: FALLS.** Deterministic binding-presence validation cannot enforce semantic containment; the mechanism cannot enforce its flagship 24/7 example even in paraphrase.
6. **FAIL-8 S3, #4 fixture-drift: FALLS as stated.** The golden suite pins a subset of rendered output (golden-covered fields only); a changed non-golden field passes silently. The honest claim is "pins golden-covered fields against drift," which is a #8 instrument, not a #4 mechanism.
7. **FAIL-9 M3, #6 visibility-error (prevention): does not survive.** By its own description M3 provides post-render detection (a leak "shows up as a policy violation in the audit trail"), not prevention, and even the detection half is untested. Restate as detection or cut the claim.

## Watch items (conditional upgrades named by the falsifications, not yet confirmed)

- **FAIL-2 S2:** verdict upgrades to FALLS on #2 and #5 if Ask FYD outputs are not sink-validated (open question 7); upgrades to FALLS on #2 through the validator itself if the data: image exception ships without per-sink scoping.
- **FAIL-2 S1:** the #2 claim is open in production if any deserialization/hydration path skips the validating constructor.
- **FAIL-3 S4:** judged "closest of the four to FALLS on #3 as specified" (undefined comparison projection, unverified parser lineage, sampler bypassed) but not fallen; recoverable with the strengthened test.
- **FAIL-4 S1-S4:** no falsification file exists; honest counts above are provisional at claimed counts. A FAIL-4 falsification pass is still owed before these enter the mechanism library.
- **Cross-cutting from FAIL-1:** Survivor 1's auto-repair branch is self-falsifying (environment-dependent repair is unlogged silent drift); block-and-escalate is the only branch consistent with the determinism and purity claims.
- **Cross-cutting from FAIL-5/FAIL-6/FAIL-9:** the Ask FYD conversational seam is unguarded by most survivors; every verdict above applies to the static site projection unless stated otherwise.

## Auditor notes for the mapper

- Bare-claim check: clean. Every one of the 32 survivors gives an adjacent reason for every claimed class.
- Test-completeness check: clean on structure (all four parts present in all 32 tests). The weak joint is test strength, not test structure: nearly every falsification found the stated tests too weak to support the claims (cooperating poisons, fixed fixtures, manual inspection steps).
- No survivor WITHSTANDS as specified. The honest library is therefore "narrowed survivors plus strengthened tests," not the claims as originally written.
- Independence caveat (from FAIL-3's falsification): several survivors are mutually conditional (FAIL-3 S1 needs S3's refusal routing and S4's fixture oracle; FAIL-6 S1's #6 depends on S2's marking correctness and S4's suite). Scoring them as independent rows overcounts the library's real coverage; the mapper should carry these dependencies into MECHANISM-LIBRARY.md.
