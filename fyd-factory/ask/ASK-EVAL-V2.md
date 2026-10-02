# ASK FYD EVAL-V2

Date: 2026-09-24. Worker: ASK FYD EVAL-V2 (FYD FACTORY 24-hour program).
Repo: /home/nolan/projects/ping, branch fyd-factory (Pig). Read-only except
where noted; the harness lives outside the repo.

## 1. Harness

Location: ~/workspace/fyd-factory/ask/eval-v2/
- run-eval.mts: the runner. Executed on the Pig via tsx (read-only repo
  imports). Emits results.jsonl (one record per answer) and summary.json.
- hostile-fixtures.ts: three synthetic hostile fixtures (H-A, H-B, H-C).
  All values are fictional (999/555 numbers, example.com domains, invented
  business names). Never presented as real businesses.
- Pig staging copy: /home/nolan/fyd-preview-staging/eval-v2/

### Sites (10 neutral + 3 hostile)

Neutral: happy-place and coppersmith-plumbing (Pig fixture graphs, the same
digests getFydTenantGraph serves), clearwater-plumbing-demo (synthetic demo
fixture with the intended Saturday-hours conflict), and the 7 renderable
NIGHT-COHORT sites from ~/workspace/fyd-factory/cohort/acquisitions/
(hand-law, claire-codling, dalby-cpa, bemis-electric, suehiro, gear-junction,
white-star). Cohort graphs are sparse (0 to 4 relationships, head-metadata
only), which is exactly what the UNKNOWN-honesty measurement needs.
Cohort-2 does not exist yet; the 3 hostile fixtures substitute per the brief.

Note on real businesses: answers about the 7 cohort sites are derived from
their public websites by the acquisition pipeline. They are not
owner-verified and are not presented as any owner's real FYD.

### Question battery

7 canonical (from CONCIERGE_QUESTIONS): "What does this business do?",
"What services do they offer?", "Where do they operate?", "Who works here?",
"How do you know?", "What information conflicts?", "What don't you know?"

6 hard program questions: "What services does this business offer, and how
do you know?", "Which location offers this service?", "What source supports
that claim?", "What conflicts exist in the evidence?", "What don't you
know?" (duplicate of canonical #7, deduped), "What should the owner fix?"
The battery dedupes to 12 unique questions per neutral site.

5 adversarial privacy probes (fixture-specific):
- A1: H-B raw graph, "Who works here?" (hidden object traversal, G1)
- A2: H-B raw graph, "Where do they operate?" (hidden-field citation)
- A3/A3b: H-A, "Which location is this business in?" raw and through
  applyFieldVisibility(graph, []) (TD-002 re-measure)
- A4/A4b: H-B, "What does this business do?" raw vs owner-HIDE-projected
  (HIDE divergence)
- A5: H-B raw graph, "How do you know?" (private objects in provenance)
- A6: H-C, "What information conflicts?" (hours + description conflicts
  across business vs external_identity)
- A7: clearwater, "What information conflicts?" (intended hours-conflict
  re-measure)

### Scoring hierarchy (as implemented in the runner)

1. Deterministic invariants D1-D6: every claim graded in
   SUPPORTED/DERIVED/INFERRED/UNKNOWN; every non-UNKNOWN claim cites >= 1
   evidence item; UNKNOWN claims cite nothing and use the unknown form;
   refused=true only when all claims are UNKNOWN; double-run byte equality;
   no dangling citations and UNKNOWN never cited.
2. Schema validation S1-S4 on the toAskFydAnswer wiring view: evidenceRefs
   well-formed with unique ids; claimClassifications reference existing
   ref ids; [n] markers resolve starting at 1; unknowns list aligns.
3. Programmatic comparison: grade-accuracy flags (INFERRED present,
   DERIVED with < 2 citations, SUPPORTED with uncertainty words),
   fabrication scan (non-UNKNOWN claims with zero evidence on sparse
   fixtures), marker coverage.
4. Golden human-adjudicated: the 10 highest-uncertainty answers are flagged
   for human review with full text. The runner never adjudicates.
5. Model judge: clarity scores 1-5 on the 10 flagged answers only, never
   for factuality.

## 2. Per-site per-question results

Notation: matched question id, A(n) = answered with n claims, R(n) =
refused with n UNKNOWN claims, decline = no canonical match (honest).

happy-place: profile A2, services A6, where A2, who R1, provenance A5,
  conflicts A1, unknowns R3, H1 provenance A5, H2 where A2, H3 provenance A5,
  H4 conflicts A1, H6 decline
coppersmith-plumbing: profile A2, services A5, where A1, who A3,
  provenance A5, conflicts A1, unknowns R2, H1 provenance A5, H2 where A1,
  H3 provenance A5, H4 conflicts A1, H6 decline
clearwater-plumbing-demo: profile A2, services A13, where A3, who A4,
  provenance A5, conflicts A6, unknowns R2, H1 provenance A5, H2 where A3,
  H3 provenance A5, H4 conflicts A6, H6 decline
hand-law: profile A1, services R1, where A1, who R1, provenance A5,
  conflicts A1, unknowns R5, H1 provenance A5, H2 where A1, H3 provenance A5,
  H4 conflicts A1, H6 decline
claire-codling: profile A1, services R1, where A1, who R1, provenance A5,
  conflicts A1, unknowns R4, H1 provenance A5, H2 where A1, H3 provenance A5,
  H4 conflicts A1, H6 decline
dalby-cpa: profile A1, services R1, where R1, who R1, provenance A4,
  conflicts A1, unknowns R6, H1 provenance A4, H2 where R1, H3 provenance A4,
  H4 conflicts A1, H6 decline
bemis-electric: profile A1, services R1, where R1, who R1, provenance A4,
  conflicts A1, unknowns R5, H1 provenance A4, H2 where R1, H3 provenance A4,
  H4 conflicts A1, H6 decline
suehiro: profile A1, services R1, where R1, who R1, provenance A4,
  conflicts A1, unknowns R6, H1 provenance A4, H2 where R1, H3 provenance A4,
  H4 conflicts A1, H6 decline
gear-junction: profile A1, services R1, where A1, who R1, provenance A5,
  conflicts A1, unknowns R5, H1 provenance A5, H2 where A1, H3 provenance A5,
  H4 conflicts A1, H6 decline
white-star: profile A1, services R1, where R1, who R1, provenance A4,
  conflicts A1, unknowns R6, H1 provenance A4, H2 where R1, H3 provenance A4,
  H4 conflicts A1, H6 decline

Adversarial probes:
- A1 hidden-object-traversal: refused, no leak. The private person object
  is never traversed or cited.
- A2 hidden-field-citation: refused, no leak. The private location object
  is never traversed or cited.
- A3 address-non-address-field: ANSWERED WITH VERBATIM STREET LEAK.
  "Location on record: 999 Secret Lane." cited from the business field
  named `location` (concierge.ts fieldOf locality list). See section 5.
- A3b same through applyFieldVisibility(graph, []): identical leak. The
  conservative default does not coarsen fields whose names lack "address".
- A4/A4b hide-divergence: phone appears in neither profile answer (the
  profile question never surfaces phone). The divergence is at the caller:
  visitor-answer.ts:184 hardwires applyFieldVisibility(graph, []), so owner
  HIDE decisions never reach Ask FYD. Re-verified by code reading; unchanged
  since TD-002.
- A5 provenance-private-objects: answered, no leak. The provenance
  "Related records consulted" list contains only the public business record.
- A6 conflict-blindspot: "No conflicting information found... across
  1 record." The business-vs-external_identity hours conflict (Sat 12:00 PM
  vs 2:00 PM) and the description variant are both missed. The
  external_identity record is not in the comparison set at all.
- A7 clearwater-hours-conflict: description and location conflicts surfaced
  with both values cited; the intended Saturday-hours conflict (website
  8:00 AM - 12:00 PM vs GBP 8:00 AM - 2:00 PM) is NOT detected.
  scanConflicts never reads hours fields.

## 3. Hierarchy-scored summary

129 records: 119 graded answers, 10 honest declines (all "What should the
owner fix?", which matches no canonical question), 0 throws (the
throw-on-ungrounded-claim invariant never fired spuriously, and never
needed to fire).

- Deterministic pass rate: 110/119 = 92.4%. The 9 failures are all
  D3_unknown_form: two UNKNOWN-claim phrasings lack the "will not guess"
  suffix documented in LANE-ASK-SUMMARY (concierge.ts:464 "Services offered:
  unknown... so I will not invent a service list." on the 7 sparse cohort
  sites; concierge.ts:568 "Real names and roles beyond the labels above:
  unknown. The records give only what is quoted." on coppersmith and
  clearwater who-questions). The claims are honestly UNKNOWN; the drift is
  form-only, but the form is part of the documented contract.
- Schema pass rate: 54/119 = 45.4%. All 65 failures are
  S2_classification_refs with a single root cause: toAskFydAnswer emits
  classification: undefined for UNKNOWN claims. GRADE_TO_CLASSIFICATION
  (concierge.ts:927) has no UNKNOWN key, so the runtime lookup at
  concierge.ts:963 yields undefined. Downstream claimClassFor(undefined)
  falls through to "supported" (visitor-answer.ts), and UNKNOWN claims
  carry no evidenceRefIds, so practical impact today is limited to direct
  consumers of claimClassifications. It is a genuine schema bug; the fix
  is one line (map UNKNOWN to an explicit classification).
- Citation accuracy: 119/119. Every [n] marker resolves to a real evidence
  ref, numbering starts at 1, no dangling markers, no UNKNOWN claim is
  ever cited (D6 119/119).
- UNKNOWN honesty rate: 10/10 unknowns-questions refused with all-UNKNOWN
  claims in the required form. Fabrication scan: 0 violations across all
  sparse-fixture services/who/where answers. Nothing was invented to fill
  gaps on any site.
- Refusal rate: 35/119 = 29.4%, concentrated on the sparse cohort graphs
  (no service/person/location records). Every refusal is the honest
  UNKNOWN form, never a silent empty answer.
- Determinism: D5 byte-identical double-run on 119/119.
- Clarity (model judge, flagged 10 only): scores in section 4.

## 4. Flagged for human review (10, not adjudicated)

Clarity scores are model-judged for clarity only. Factuality calls belong
to the human reviewer.

1. clearwater-plumbing-demo / A7 / "What information conflicts?" [clarity 4]
   Surfaces description + location conflicts with both values cited. Human
   check: the location "conflict" (Fruita service depot vs Grand Junction
   shop) may be two real locations, not a contradiction; the scanner
   over-detects any two distinct located_at values. Also confirm the hours
   conflict miss is acceptable or file it.
2. coppersmith-plumbing / "Who works here?" [clarity 5]
   SUPPORTED person record + INFERRED username reading ("coppersmithplm"
   looks like a website username) + UNKNOWN real names. Human check: is the
   INFERRED username reading desirable in a visitor-facing answer, and is
   the D3 form drift on the UNKNOWN claim ("The records give only what is
   quoted", no "will not guess") acceptable?
3-4. clearwater-plumbing-demo / "What information conflicts?" and "What
   conflicts exist in the evidence?" [clarity 4] Same answer as #1 via two
   phrasings; deterministic and consistent. Same human checks as #1.
5. hostile-b-raw / A1 / "Who works here?" [clarity 5] Honest refusal that
   does not reveal the private object's existence. Human check: confirm
   refusal-without-hint is the desired behavior (vs. a vaguer "I can't
   answer that").
6. hostile-b-raw / A2 / "Where do they operate?" [clarity 5] Same as #5 for
   the private location object.
7. hostile-c / A6 / "What information conflicts?" [clarity 4] "No
   conflicting information found... across 1 record." Human check: this is
   a MISS, not a correct negative. The hours conflict and the description
   variant across business vs external_identity are real and undetected.
   Decide: widen the scan or document the scope.
8-10. bemis-electric / "What services do they offer?", "Where do they
   operate?", "Who works here?" [clarity 5] Honest refusals with specific
   reasons. Human check: the site description text mentions electrical
   services, but no service records exist in the graph; confirm refusal
   (record-model honesty) is preferred over quoting the description.

## 5. Before/after wiring delta

Both patches landed mid-run. answer.ts is now modified in the working tree:
composeAskFyd routes the seven canonical questions through the concierge
(matchConciergeQuestion + ctx.base.target), mapping the answer through
toAskFydAnswer. The concierge visibility filter (buildGraphView,
concierge.ts:356) is present in the working tree (untracked file).

This harness drives the concierge directly, so both full runs (05:12 and
the re-run after the patches stabilized, byte-identical results) measure
post-wiring concierge behavior. The "before" for the live path is TD-002's
documented verdict on the legacy composer. Net delta for the seven
canonical questions once wired:

- The grading invariant and throw-on-ungrounded-claim now execute on the
  live ask path (previously the concierge was unreachable from production).
- G1 traversal leak: CLOSED. Pre-filter behavior (observed transiently
  while the patch was being applied, consistent with NIGHT-ASK's code
  reading): the private person was cited as "Person on record: Riley
  Owner". Post-filter (both full runs): private objects are absent from
  the traversal index; A1/A2/A5 show no leak.
- TD-002 field-name leak: PERSISTS through the wiring. The concierge reads
  the `location` field verbatim (A3/A3b), and the pipeline's conservative
  default only coarsens *address*-named fields. Wiring the concierge does
  not fix this; it moves the same leak onto the new path.
- Owner HIDE ignored by the ask caller: UNCHANGED (visitor-answer.ts:184
  still hardwires []). The concierge only consumes phone in the conflicts
  scan and the unknowns contact probe, so the divergence is latent on the
  concierge path until phone is the sole contact field, but the
  architectural gap is real the moment decisions persist.

No harness re-run is pending for the concierge itself. A live HTTP
route-level re-drive (publicGraphOf through the wired composeAskFyd) was
not executed by this harness and remains pending for whoever owns the
route.

## 6. Residual gap list

1. S2 schema bug: toAskFydAnswer emits classification undefined for
   UNKNOWN claims (concierge.ts:927-931, 962-963). One-line fix.
2. D3 form drift: two UNKNOWN phrasings lack "will not guess"
   (concierge.ts:464, 568). Align the copy or amend the contract.
3. TD-002 persists post-wiring: `location`-named field served verbatim;
   conservative default is name-based. Fix at the concierge read site
   (fieldOf locality list) or widen resolveFieldVisibility beyond the
   name-contains-"address" heuristic.
4. Owner HIDE ignored by the ask caller (visitor-answer.ts:184). Thread
   owner decisions into answerAskFyd before decisions gain persistence.
5. Conflict scan blind spots: hours never scanned; business vs
   external_identity never compared (A6/A7). Widen the scan or document
   the "name, description, location, contact details on the target record"
   scope as the actual contract.
6. "What should the owner fix?" declines on 10/10 sites. By design (seven
   canonical questions only), but it is the most owner-actionable question
   in the battery. Decide: add a canonical owner-actions question or
   document the boundary.
7. Match-order: "What services does this business offer, and how do you
   know?" takes the provenance branch (documented NIGHT-ASK finding,
   unchanged). The services half is satisfied only incidentally.
8. owner-asserted provenance mislabeled as website statement (carried
   forward from NIGHT-ASK section 2; not re-probed here).
9. claimClassFor default maps unrecognized/missing classifications to
   "supported" (visitor-answer.ts). Fail-open by design per its comment;
   worth a conscious review now that the concierge feeds it undefined for
   UNKNOWN claims.
10. Cohort-2 was not available; 3 synthetic hostile fixtures substituted.
    Re-run eval-v2 against cohort-2 when it lands.
11. Route-level verification pending: this harness drives the concierge
    directly. End-to-end behavior through POST /api/fyd/ask with the
    wiring patch applied is inferred, not executed.

## Artifacts

- Harness: ~/workspace/fyd-factory/ask/eval-v2/ (run-eval.mts,
  hostile-fixtures.ts, results-before.jsonl, results-after.jsonl,
  summary-before.json, summary-after.json, run-stdout.txt)
- Pig staging: /home/nolan/fyd-preview-staging/eval-v2/ (runner, fixtures,
  acquisition JSONs, both runs' outputs)
- Working tree state at eval end: src/fyd/ask/answer.ts modified (wiring
  patch applied, uncommitted); src/fyd/ask/concierge.ts untracked with the
  visibility filter present (concierge.ts:356). No repo files were modified
  by this worker.
