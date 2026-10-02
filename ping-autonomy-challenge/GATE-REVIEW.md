# GATE REVIEW: red-team of the PING autonomy grand challenge hard rule

Date: 2026-09-23. Mode: research only. No new mechanisms invented; all
evidence from the 9 FAIL reports, SURVIVOR-ROSTER.md, COVERAGE-MATRIX.md,
CUT-LOG.md, and ARCHAEOLOGY-SUPPLEMENT.md.

The rule under test: a mechanism enters the library only if it prevents
at least 2 of the 9 failure classes as a standalone mechanism. 55 unique
cuts resulted, 32 of them category (a) single-class or zero-class cuts.

Question: did the gate discard anything load-bearing?

## 1. Per-class coverage redundancy (post-falsification, honest counts)

Counted from SURVIVOR-ROSTER.md: claimed classes minus classes the
falsifications marked FALLS / NO LONGER PREVENTED / NOT PREVENTED.
Excluded: FAIL-3 S1 (honest count 1) and FAIL-5 S2 (honest count 1), both
flagged EXCLUDE in the roster. FAIL-4 survivors are provisional (no
falsification file exists) and are marked (p).

| Class | Surviving survivors | Count (non-provisional) | Redundancy |
|---|---|---|---|
| #1 mobile-overflow | F1S1 (weakened) | 1 | FRAGILE: single survivor |
| #2 unsafe-url | F1S2, F2S1, F2S2, F2S3, F4S3(p), F6S1, F6S4 | 7 (6) | redundant |
| #3 graph-blindness | F3S2, F3S3, F3S4, F8S3, F8S4 | 5 | redundant |
| #4 fixture-drift | F1S1, F1S3, F3S2, F3S4, F4S1(p), F4S2(p), F4S3(p), F4S4(p), F6S2, F7S1, F8S2, F8S4 | 12 (8) | redundant |
| #5 claim-binding | F1S2, F2S1, F2S2, F2S3, F4S3(p), F5S1, F5S3, F6S1, F7S2, F7S3, F8S1, F9M1, F9M2, F9M3, F9M4 | 15 (14) | redundant |
| #6 visibility-error | F1S2, F2S1, F2S2, F2S3, F4S3(p), F5S1, F6S1, F6S2, F6S3, F6S4, F8S1 | 11 (10) | redundant |
| #7 clone-sitespecs | F4S1(p), F7S1, F7S2 | 3 (2) | thin but doubled |
| #8 correction-loss | F1S1, F1S3, F4S1(p), F4S2(p), F4S4(p), F5S3, F6S3, F7S3, F8S1, F8S2, F8S3, F8S4, F9M1, F9M4 | 14 (11) | redundant |
| #9 conflict-collapse | F3S3, F4S2(p), F5S1, F8S1, F8S2, F9M1, F9M2, F9M3, F9M4 | 9 (8) | redundant |

Notes that matter for the verdict:

- **#1 has exactly one surviving survivor.** F1S2's #1 claim was killed by
  falsification ("the typed seam stops authored fixed-pixel widths but not
  the emergent compositional overflow"). What remains is FAIL-1 S1, the
  post-generation empirical oracle, itself WEAKENED. This is the only class
  with a single point of failure. Decisive fact, per the task.
- **#7 is covered twice non-provisionally** (F7S1 input-output variance
  coupling, F7S2 evidence-gated composition, both WEAKENED but surviving).
  The archaeology supplement's note that #7 is "effectively uncovered by
  PING's LIVE machinery" is a build gap (no live PING primitive addresses
  structural site divergence), not a survivor-library gap. Do not confuse
  the two.
- No class is at zero. The excluded survivors (F3S1, F5S2) leave their
  classes (#4, #6) with 12 and 11 other claimants respectively, so their
  exclusion costs nothing.

## 2. Per-cut audit: the 32 category (a) cuts

For each cut: (1) is its class covered by a survivor? (2) is the cut the
only known prevention for that class? (3) would admission strengthen or
dilute the library?

### #1 cuts (class covered by F1S1 alone; fragile class)

| # | Cut | Covered? | Only prevention? | Admission verdict |
|---|---|---|---|---|
| 1 | Layout constraint solver, overflow as hard error | yes (F1S1) | no | dilutes; subsumed by F1S1, which measures reality instead of modeling it |
| 2 | Horizontal-extent token budget top-down | yes | no | dilutes; single-class guard, no second class |
| 3 | Fail-closed CSS defaults | yes | no | dilutes; prevents only the accidental cases, fails the hard compositional case per F1S2's falsification |
| 4 | Container-queries-only rule | yes | no | dilutes; rendering tactic, covers #1 only partially |
| 5 | Per-component intrinsic-width precomputation without oracle | yes | no | dilutes; collapses into F1S1 once measurement is added (FL-20260921-033 proved predictions wrong) |
| 15 | Mobile-overflow viewport fixture test (320px) | yes | no | dilutes as a library entry; it is the empirical bone of F1S1, kept as a test inside the survivor |

### #2 cuts (7 surviving survivors)

| # | Cut | Covered? | Only prevention? | Admission verdict |
|---|---|---|---|---|
| 6 | CSP as backstop | yes | no | see steelman; belongs on a defense-in-depth shelf, not in the library |
| 7 | URL reputation / safety-check API | yes | no | dilutes; third-party dependency, wrong layer |
| 14 | URL allowlist alone (no typed model) | yes | no | dilutes; folded into F4S3 as one axis of the typed gate |
| 44 | Source-side filtering only | yes | no | dilutes; proven insufficient by FL-20260921-031, wrong enforcement point |
| 45 | HTML escaping at render | yes | no | dilutes; the observed failure (javascript: href) survived escaping fully functional |

### #3 cuts (5 surviving survivors)

| # | Cut | Covered? | Only prevention? | Admission verdict |
|---|---|---|---|---|
| 9 | Rank-Math-specific @graph patch | yes | no | dilutes; site-local patch the CEO rule explicitly forbids, teaches the extractor nothing |
| 10 | Pin jsonld@9.0.0, delete custom processor | yes | no | dilutes; the historical repair, one-class fix, says nothing about drift or conflicts |
| 11 | Browser-rendered acquisition fallback | yes | no | dilutes; a different blindness (rendering vs parsing), prevents no second class |
| 16 | Graph-blindness extraction completeness check | yes | no | dilutes as a library entry; kept as the empirical bone of F3S2's receipts |

### #4 cuts (12 surviving survivors)

| # | Cut | Covered? | Only prevention? | Admission verdict |
|---|---|---|---|---|
| 12 | Sandbox nondeterminism interdiction alone | yes | no | dilutes; folded into F4S1 as the enforcement layer |
| 13 | Record-once SideEffect | yes | no | dilutes; folded into F4S1 (declared input) and F4S4 (derived name) |
| 17 | Deterministic full re-render, no owner layer | yes | no | see FLAG 3: retain as infrastructure beneath F4S1/F4S2, not as a library entry; it prevents #4 only as a standalone |
| 23 | Cache memoization | n/a (prevents none) | n/a | dilutes; performance optimization, and a wrongly keyed cache is itself a drift source |
| 24 | Idempotency keys | n/a (not one of the 9) | n/a | dilutes; correction double-apply is a different failure than correction loss |
| 25 | Saga / compensation patterns | n/a (not one of the 9) | n/a | dilutes; none of the 9 is a partial-effect problem |
| 32 | "Just run it twice" as the whole strategy | yes | no | dilutes as a mechanism; kept as a test inside F4S1 |
| 55 | Version/patch markers as standalone | yes | no | dilutes; deploy semantics, portable value folded into F4S1 |

### #5 cuts (15 surviving survivors)

| # | Cut | Covered? | Only prevention? | Admission verdict |
|---|---|---|---|---|
| 20 | Per-tenant claim-template allowlists | yes | no | dilutes; prevents at most one class and only by brittleness |
| 34 | Prompt instructions not to hallucinate | yes | no | dilutes; advisory, DATA NOT PRESENT beats prompt instruction |

### #6 cuts (11 surviving survivors)

| # | Cut | Covered? | Only prevention? | Admission verdict |
|---|---|---|---|---|
| 21 | Per-viewer ACLs at render | yes | no | dilutes; public FYD sites have anonymous viewers, collapses to the public-visible flag |
| 22 | Separate per-tenant databases, no shared identity | yes | no | dilutes; contradicts the taxonomy, prevents #6 by duplication, breaks the shared-observation model |
| 46 | Render-time field stripping per template | yes | no | dilutes; wrong layer, the Pergola leak traveled the script payload channel the template never saw |
| 47 | Encrypting private fields at rest | yes | no | dilutes; storage-layer answer to a projection-layer problem |
| 48 | Client-side filtering after fetch | yes | no | dilutes; the private data already crossed the boundary, this is the Pergola failure restated |

### #7 cuts (2 non-provisional surviving survivors)

| # | Cut | Covered? | Only prevention? | Admission verdict |
|---|---|---|---|---|
| 30 | Copy-level similarity checks | no (fails #7 itself) | n/a | dilutes; fails the #7 shape itself (structural identity), paraphrased clones pass |
| 31 | More template variants | yes | no | dilutes; variance without evidence coupling, planner can still select the same template twice |

### #8 cuts (14 surviving survivors)

| # | Cut | Covered? | Only prevention? | Admission verdict |
|---|---|---|---|---|
| 18 | Post-render snapshot diffing | yes | no | dilutes; a detector, not a preventer, alarms on #4 only, stops nothing |
| 19 | Freezing the source | yes | no | HARMFUL; prevents #8 by abolishing regeneration, guarantees stale data and lets stale claims persist unchallenged (#5) |
| 26 | Owner-wins-always, no conflict state | yes | no | HARMFUL; fixes #8 by guaranteeing #9 (conflict-collapse with polarity flipped) |

### #9 cuts (9 surviving survivors)

| # | Cut | Covered? | Only prevention? | Admission verdict |
|---|---|---|---|---|
| 27 | Confidence-scored auto-reconcile | yes | no | dilutes; still merges, still deletes the loser, a score on a silent decision is the same failure with instrumentation |
| 28 | Majority vote across sources | yes | no | dilutes; three wrong aggregators outvote the owner's single true listing |
| 29 | Deduplicate identical strings | n/a (prevents none) | n/a | dilutes; identity hygiene, identical strings are not conflicts |

### Audit summary

- **Every cut's claimed class is covered by at least one surviving
  survivor.** Column (2) is "no" for all 32. The gate discarded zero
  unique preventions.
- Three cuts are not merely weak but actively harmful (19, 26; plus 30
  fails its own class). Admitting them would subtract coverage.
- Six cuts are already retained in folded form (12, 13, 14, 15, 16, 32)
  or as infrastructure (17, FLAG 3). The system keeps their value without
  library membership.
- The rest are tactics, tests, wrong-layer guards, or doctrine-adjacent
  fixes. None carries a falsifiable prevention claim across regenerations.

## 3. Steelman: three strongest arguments FOR keeping the gate absolute

**A1. Zero unique losses.** The audit above is the empirical answer to the
red-team question: across all 32 single-class cuts, not one is the sole
known prevention of its class. Every claimed class has survivor coverage,
including the thinnest (#1 with one, #7 with two). A gate that costs
nothing load-bearing and buys library compression should not be relaxed.
Relaxation without a demonstrated loss is solving a problem the evidence
says does not exist.

**A2. Precedent and library bloat.** The 55-cut list is evidence of
appetite: human gates (9 lanes' worth), logs without checks (4 lanes),
failure-named-as-mechanism (3 lanes), and 32 single-class tactics all have
a "but this one is special" story. Any documented exception path reopens
adjudication on all 55, and the mapper's compression to roughly 5-6 real
mechanisms (COVERAGE-MATRIX.md section 4: the typed-seam family,
measure-and-compare, pinned-reference drift, conflict lifecycle,
correction lifecycle, prevention-first generation) unravels back into a
tactic pile. The library's entire value is that membership MEANS
multi-class prevention.

**A3. False redundancy and shared fate.** Admitting single-class
mechanisms that sit at the same seam as existing survivors creates the
illusion of redundancy while adding none. COVERAGE-MATRIX.md section 5,
flag 10, states it plainly: F2S1/F2S2/F2S3 and F1S2 all claim #5 and #6
through the identical typed-slot pattern, and one escape hatch in the seam
breaks all four at once. The real fragility (#1) is not fixed by admitting
tactics that fail the hard case: F1S2's falsification proved the hard #1
failure is compositional overflow, and cuts 1-5 themselves admit they cover
only the accidental or partial cases. The fix is a second multi-class #1
mechanism, which is a lane task, not a gate relaxation.

## 4. Steelman: three strongest arguments FOR documented single-class exceptions

**B1. #1 fragility insurance.** #1 mobile-overflow has exactly one weakened
survivor. If F1S1's oracle ever fails closed on a build or its weakened
branches prove hollow, the class has zero coverage. Candidates: cut 3
(fail-closed CSS defaults: min-width:0, max-width:100%, overflow-wrap
everywhere) and cut 15 (the 320px viewport fixture test). Both are cheap,
both are enforced (structural defaults; a build-failing test), and cut 3
operates at a different enforcement point (construction defaults) than
F1S1's post-render oracle, so this is not the pure shared-fate duplication
flag 10 warns about. The argument: the gate's purpose is preventing bloat,
but a class with a single point of failure is exactly where a narrow second
line is load-bearing rather than ornamental.

**B2. Enforcement-party independence.** Cut 6, CSP as a backstop, for #2.
Every one of the seven #2 survivors is code the team writes and can
mis-write; CSP is enforced by the browser vendor. A javascript: URL that
survives a seam bug is still blocked at execution by a policy the seam
cannot disable. That is genuine redundancy with a different failure
profile, categorically distinct from a same-seam duplicate. It is the
cleanest "documented exception" shape in the set: independent enforcer,
machine-enforced, zero human in the loop. Counterweight: #2 is the
best-covered class in the library, so the need is lowest where the
argument is strongest.

**B3. Infrastructure honesty.** Cut 17, deterministic full re-render, is
the base layer F4S1 (declared-input purity) and F4S2 (replay-mismatch
tripwire) byte-compare against (FLAG 3). Discarding it from the record
while keeping survivors that depend on it leaves the library omitting its
own foundation. The exception form here is "infrastructure shelf," not
library membership: the dependency graph stays honest. Counterweight:
CUT-LOG.md's merge notes already resolve FLAG 3 this way ("keep
deterministic re-render as infrastructure beneath the survivors"), so this
is the weakest exception claim; it asks for documentation, not for gate
relaxation.

## 5. Verdict: KEEP ABSOLUTE

The red-team question is answered: **the gate discarded nothing
load-bearing.** No cut among the 32 is the sole known prevention of its
class; six cuts' value is retained in folded or infrastructure form; three
cuts are actively harmful to admit; the rest are tactics that fail the
"prevention at machine speed with a falsifiable test" definition of a
mechanism.

The one decisive finding is not a gate failure but a **coverage risk**:
#1 mobile-overflow depends on exactly one survivor (FAIL-1 S1, weakened).
The correct response is a lane task, not a gate exception: produce a
second multi-class #1 mechanism (the F4 lane's predicted viewport-drift
assertion was the natural candidate; F4's survivors are provisional and
claim no #1). The #1 single-class cuts cannot serve as that second line
because they fail the same hard compositional case the falsification
identified.

Two non-exception dispositions, so nothing useful is lost without opening
the gate:

1. **Defense-in-depth / infrastructure shelf (not library membership).**
   CSP (cut 6) and deterministic re-render (cut 17, FLAG 3 resolution)
   belong in a documented annex of enforced hardening layers and
   infrastructure the survivors depend on. This gives the mapper a place
   to keep them with zero precedent effect on library membership.
2. **#1 fragility flagged as the library's top open risk** in
   MECHANISM-LIBRARY.md, with the requirement that the next lane cycle
   supply a second #1 mechanism.

### Exception criteria (the bar any future exception must clear, so this never becomes a loophole)

If the mapper ever revisits this, a single-class candidate may be admitted
as a documented exception only if ALL four hold:

1. **Fragility trigger:** its class has fewer than 2 non-provisional
   surviving survivors at admission time. (Today only #1 qualifies.)
2. **Independent enforcement:** a different enforcer or enforcement point
   than every existing survivor for that class, with no shared fate
   (per the COVERAGE-MATRIX.md section 5 flag 10 test: one bug must not
   be able to kill both). Advisory, human-gated, log-only, and
   same-seam mechanisms are ineligible by construction.
3. **Falsifiable prevention test:** input, procedure, expected outcome,
   and falsifier, executable at machine speed across regenerations. A
   tactic with a story but no test stays cut.
4. **Sunset clause:** the exception lapses automatically when the class
   gains a second multi-class survivor, and every exception carries a
   re-audit date. Exceptions are scaffolding, not members.

Under these criteria, no current cut qualifies today: the #1 candidates
fail criterion 2 or 3 (cuts 3 and 4 fail the hard compositional case and
carry no standalone falsifiable prevention test; cut 15 is already a test
inside F1S1), and CSP fails criterion 1 (#2 has six non-provisional
survivors). That is the intended behavior: the criteria describe a real
door that is currently, correctly, closed.

## 6. Open questions for the mapper

- F4's four survivors are provisional (no falsification file). Their
  honest counts could drop, which would thin #4, #7, #8, and #9 coverage.
  A FAIL-4 falsification pass is still owed (SURVIVOR-ROSTER.md watch
  items).
- #7's LIVE-machinery gap (ARCHAEOLOGY-SUPPLEMENT.md section d): F7S1
  and F7S2 are library survivors, but PING has no live primitive for
  structural site divergence. The mechanisms must be built, not just
  listed.
- FLAG 2 (normalization authority for conflict detection) and FLAG 1
  (F8S2's missing conflict-lifetime clock) are survivor-internal
  contradictions the gate does not touch; they remain mapper decision
  points.
- If a future lane produces a #1 mechanism that is itself single-class
  but independently enforced with a falsifiable test (e.g., a
  browser-enforced containment policy for overflow), criteria 1-4 above
  are the admission path. Until then, the gate stands absolute.
