# PING AUTONOMY GRAND CHALLENGE - CORPUS QA SWEEP REPORT

**Date:** 2026-09-23. **Scope:** failures/FAIL-[1-9]-*.md plus em-dash scan of the whole challenge tree.
**Mode:** verification only. No report files were edited. gate-check.py did not crash on any file.

Note on task wording: the task says "ALL NINE" files matching FAIL-[1-9]-*.md. The glob
matches 17 files (each of N=1..9 has a base report and/or a falsification report; N=4 has
no falsification file). All 17 were run through gate-check.py.

---

## 1. Per-file gate-check.py results

Command: `python3 tools/gate-check.py failures/FAIL-[1-9]-*.md`
Result: **17 files checked, 36 violations, 1 warning.** No crashes. Violations by file:

- **FAIL-1-falsification.md:** 4 violations. S1/S2/S3 each: "no Prevents block found".
  Cut list: "no cut-list section found". (This file attacks the survivors; it does not
  define them, so the missing Prevents/cut sections are structural mismatch between the
  gate's expectations and the falsification genre, not content errors.)
- **FAIL-1-mobile-overflow.md:** 0 violations, 0 warnings. Clean.
- **FAIL-2-falsification.md:** 4 violations. S1/S2/S3 each: "no Prevents block found".
  Cut list: "no cut-list section found". Same structural note as above.
- **FAIL-2-unsafe-url.md:** 0 violations, 0 warnings. Clean.
- **FAIL-3-falsification.md:** 5 violations. S1/S2/S3/S4 each: "no Prevents block found".
  Cut list: "no cut-list section found". Same structural note as above.
- **FAIL-3-graph-blindness.md:** 0 violations, 0 warnings. Clean.
- **FAIL-4-fixture-drift.md:** 0 violations, **1 warning**. S1: class #8 (correction-loss)
  "has no adjacent explanatory sentence (reason text too short: '. Owner corrections are
  declared inputs')".
- **FAIL-5-claim-binding.md:** 0 violations, 0 warnings. Clean.
- **FAIL-5-falsification.md:** 2 violations. "no surviving-mechanism sections found";
  cut list: "no cut-list section found". Same structural note as above.
- **FAIL-6-falsification.md:** 5 violations. S1/S2/S3/S4 each: "no Prevents block found".
  Cut list: "no cut-list section found". Same structural note as above.
- **FAIL-6-visibility-error.md:** 4 violations. S1/S2/S3/S4 each: "no Prevents block found".
- **FAIL-7-clone-sitespecs.md:** 0 violations, 0 warnings. Clean.
- **FAIL-7-falsification.md:** 4 violations. S1/S2/S3 each: "no Prevents block found".
  Cut list: "no cut-list section found". Same structural note as above.
- **FAIL-8-correction-loss.md:** 0 violations, 0 warnings. Clean.
- **FAIL-8-falsification.md:** 4 violations. S1/S2/S3/S4 each: "no Prevents block found".
  Cut list: "cut-list section has no entries". (The falsification file genuinely has no
  cut list; the base report FAIL-8-correction-loss.md carries it.)
- **FAIL-9-conflict-collapse.md:** 1 violation. "no surviving-mechanism sections found".
  (The file defines M1-M4 headings, which the gate's heading regex does not recognize;
  the gate expects "### Survivor N:" or "### SN." headings.)
- **FAIL-9-falsification.md:** 2 violations. "no surviving-mechanism sections found"
  (file uses "## M1." headings, same regex mismatch); cut list: "no cut-list section found".

Aggregate pattern: every falsification report triggers "no Prevents block" and "no cut
list" because the gate is written for base mechanism-hunt reports (which define
survivors, Prevents blocks, and cut lists), not for the falsification genre (which
attacks them). The 4 gate-clean base reports are FAIL-1-mobile-overflow.md,
FAIL-2-unsafe-url.md, FAIL-3-graph-blindness.md, FAIL-7-clone-sitespecs.md,
FAIL-8-correction-loss.md, FAIL-5-claim-binding.md (6 files), plus FAIL-4-fixture-drift.md
with 1 warning.

---

## 2. Em-dash scan (U+2014)

`grep -rn --include='*.md'` over the entire ~/workspace/ping-autonomy-challenge/ tree
(root, failures/, lanes/, tools/, subdirectories): **zero hits. No em dash in any .md
file.** gate-check.py's internal em-dash check therefore also passes for all 17 files.

---

## 3. Reference integrity (sandbox:// and ~/workspace/ paths in failures/*.md)

- **sandbox:// references:** none found in any failures/*.md file. Nothing to verify.
- **~/workspace/ references:** found in 5 files, 8 references total. All resolvable:

| File | Reference | Target status |
|---|---|---|
| FAIL-3-falsification.md | ~/workspace/fyd-lane/onboarding/extractor.ts | EXISTS |
| FAIL-3-graph-blindness.md | ~/workspace/fyd-lane/onboarding/extractor.ts | EXISTS |
| FAIL-4-fixture-drift.md | ~/workspace/fyd/product-lane/STEP-01-REGENERATION.md | EXISTS |
| FAIL-4-fixture-drift.md | ~/workspace/fyd/product-lane/regen/step1-regen.ts | EXISTS |
| FAIL-4-fixture-drift.md | ~/workspace/fyd/product-lane/STEP-07-CORRECTION-SURVIVES-REGEN.md | EXISTS |
| FAIL-8-falsification.md | ~/workspace/ping-autonomy-challenge/failures/FAIL-8-correction-loss.md | EXISTS |
| FAIL-9-conflict-collapse.md | ~/workspace/fyd/handoff/2026-09-22-master-context-handoff.md | EXISTS |
| FAIL-9-conflict-collapse.md | ~/workspace/fyd/product-lane/.../src/fyd/harvest/PUBLIC-SOCIAL-DATA-FABRIC.md | UNRESOLVABLE AS WRITTEN |

- **Broken references: 0** (every concrete path resolves).
- **Flag:** FAIL-9-conflict-collapse.md line 38 cites a path containing a `...`
  placeholder. The file does exist under a concrete directory
  (~/workspace/fyd/product-lane/piging2-fyd-a69bb68fc84620a5635e071030cf49a633df7394/src/fyd/harvest/PUBLIC-SOCIAL-DATA-FABRIC.md),
  but the reference as written cannot be resolved verbatim. Treat as a
  non-verifiable placeholder reference, not a broken link.

---

## 4. Verdict-format check (FAIL-N-falsification.md)

Requirement: each file contains per-survivor verdicts using exactly one of
WITHSTANDS / WEAKENED / FALLS.

| File | Survivors with verdicts | Per-survivor verdict words | Flag |
|---|---|---|---|
| FAIL-1-falsification.md | 3 | WEAKENED, WEAKENED, WEAKENED | none |
| FAIL-2-falsification.md | 3 | WEAKENED, WEAKENED, WEAKENED | none |
| FAIL-3-falsification.md | 4 | WEAKENED x4 | NOTE (class-level vocabulary): the summary table uses HOLDS, NO LONGER PREVENTED, NOT PREVENTED as per-class verdicts. Per-survivor verdicts are all WEAKENED, but class statuses use words outside the three-word scale. |
| FAIL-4-falsification.md | does not exist | n/a | FLAG: no falsification report exists for FAIL-4 (base report only). |
| FAIL-5-falsification.md | 3 | WEAKENED; FALLS on #5 + WEAKENED on #6; WEAKENED | FLAG (strict reading): S2's verdict uses two verdict words for one survivor ("FALLS on #5; WEAKENED on #6"). Within vocabulary, but not exactly one word. |
| FAIL-6-falsification.md | 4 | WEAKENED x4 | none |
| FAIL-7-falsification.md | 3 | WEAKENED x3 | none |
| FAIL-8-falsification.md | 4 | WEAKENED x4 | NOTE (class-level): S3 "no longer prevents #4 as claimed" is scored FALLS in the class table while the per-survivor verdict stays WEAKENED. |
| FAIL-9-falsification.md | 4 (M1-M4) | WEAKENED x4 | NOTE (class-level): M3's #6 prevention claim "does not survive" (detection only), while the per-survivor verdict stays WEAKENED. |

No file is missing per-survivor verdicts (except FAIL-4, which has no falsification
file at all). No file uses a verdict word outside WITHSTANDS / WEAKENED / FALLS at
the per-survivor level, with the one strict-reading exception of FAIL-5 S2's split
verdict.

---

## 5. Canonical survivor roster table

Independent count of survivors and claimed classes per FAIL-N report, as stated in
the falsification reports' "Claimed" lines (cross-checked against base report
sections). Falsification verdict is the per-survivor verdict from section 4.

| FAIL | # Survivors | Survivor | Claimed classes | Falsification verdict |
|---|---|---|---|---|
| FAIL-1 | 3 | S1 Post-generation empirical oracle | #1, #4, #7, #8 | WEAKENED (#7 FALLS; #1, #4, #8 WEAKENED; #4 holds under block-and-escalate only) |
| FAIL-1 | | S2 Typed projection seam with capability contracts | #1, #2, #5, #6 | WEAKENED (#1 FALLS as claimed; #2, #5 WEAKENED; #6 WITHSTANDS) |
| FAIL-1 | | S3 Canonical pure projection | #4, #8 | WEAKENED |
| FAIL-2 | 3 | S1 Schema-typed trust with capability-specific allowlists | #2, #5, #6 | WEAKENED |
| FAIL-2 | | S2 Sink-side validation at the render seam | #2, #5, #6 | WEAKENED |
| FAIL-2 | | S3 Fail-closed defaults at every seam crossing | #2, #5, #6 | WEAKENED |
| FAIL-3 | 4 | S1 Shape-coverage fixture registry | #3, #4 | WEAKENED (#3 no longer prevented as specified; #4 holds drift-from-pinned) |
| FAIL-3 | | S2 Extraction receipts with unexplained-drop alerts | #3, #4, #8 | WEAKENED (#8 not prevented as tested; #4 count-drift only) |
| FAIL-3 | | S3 Unknown-shape quarantine | #3, #9 | WEAKENED (#3 holds conditionally on write path; #9 WEAKENED) |
| FAIL-3 | | S4 Dual-parser cross-check on sampled inputs | #3, #4 | WEAKENED |
| FAIL-4 | 4 | S1 Declared-input purity | #4, #8, #7 | no falsification file |
| FAIL-4 | | S2 Replay-mismatch tripwire | #4, #8, #9 | no falsification file |
| FAIL-4 | | S3 Typed semantic render model with fail-closed gate | #5, #6, #2 (plus #4 supporting) | no falsification file |
| FAIL-4 | | S4 Content-derived identity | #4, #8 | no falsification file |
| FAIL-5 | 3 | S1 Projection-seam binding verifier (verifyPresentationBinding) | #5, #6, #9 | WEAKENED |
| FAIL-5 | | S2 Prevention-first generation | #5, #6 | FALLS on #5; WEAKENED on #6 |
| FAIL-5 | | S3 Claim-level provenance pointers with fail-closed dangling resolution | #5, #8 | WEAKENED |
| FAIL-6 | 4 | S1 Positive-license projection gate | #6, #5, #2 | WEAKENED |
| FAIL-6 | | S2 Visibility as canonical schema attribute | #6, #4 | WEAKENED |
| FAIL-6 | | S3 Trusted-context tenant enforcement | #6, #8 | WEAKENED |
| FAIL-6 | | S4 Adversarial boundary test suite | #6, #2 | WEAKENED |
| FAIL-7 | 3 | S1 Input-output variance coupling | #7, #4 | WEAKENED |
| FAIL-7 | | S2 Evidence-gated composition | #7, #5 | WEAKENED |
| FAIL-7 | | S3 Provenance-typed content slots | #5, #8 | WEAKENED |
| FAIL-8 | 4 | S1 Typed correction patches anchored to stable identity, decision store, re-applied on every read | #8, #6, #9, #5 | WEAKENED |
| FAIL-8 | | S2 Three-way merge on regeneration (base / new / overlay; owner wins ties) | #8, #9, #4 | WEAKENED |
| FAIL-8 | | S3 Correction survival tests (golden set as regen gate) | #8, #3, #4 | WEAKENED (#4 FALLS as stated) |
| FAIL-8 | | S4 Source-change diffing as first-class regen artifact | #8, #4, #3 | WEAKENED |
| FAIL-9 | 4 | M1 Conflict as first-class evidence state (CONFLICTING class) | #9, #5, #8 | WEAKENED |
| FAIL-9 | | M2 Certainty attenuation at the answer seam | #9, #5 | WEAKENED |
| FAIL-9 | | M3 Explicit, auditable source-priority policy (loser stays visible) | #9, #5, #6 | WEAKENED (#6 prevention claim does not survive; detection only) |
| FAIL-9 | | M4 Conflict surfacing as owner correction tasks | #9, #5, #8 | WEAKENED |

Totals: 32 survivors across 9 FAIL reports (3+3+4+4+3+4+3+4+4). Every survivor that
has a falsification report is rated WEAKENED, except FAIL-5 S2 (FALLS on #5). No
survivor WITHSTANDS. Class-level FALLS verdicts (narrower than whole-survivor):
FAIL-1 S1 #7; FAIL-1 S2 #1; FAIL-8 S3 #4; FAIL-9 M3 #6-prevention. FAIL-3 S1 #3 is
"NO LONGER PREVENTED as specified" and FAIL-3 S2 #8 is "NOT PREVENTED as tested".

---

## 6. Caveats and open items for the parent orchestrator

1. gate-check.py's violations on the falsification files are genre mismatch, not
   content failures: the gate expects base-report structure (Survivor headings,
   Prevents blocks, cut lists) which falsification files intentionally lack. Two
   genuine structural notes still stand: FAIL-8-falsification.md has no cut-list
   entries (the base report carries it), and FAIL-9 files use "## M1." headings
   that the gate's heading regex does not recognize (the base FAIL-9 file's M1-M4
   sections therefore report "no surviving-mechanism sections found").
2. The only gate WARNING in the whole corpus is FAIL-4 S1's short reason text for
   class #8.
3. FAIL-4 is the only N with no falsification report. Its 4 survivors are
   unfalsified in this corpus.
4. The report file itself was scanned: no U+2014 characters were introduced in
   this report.
