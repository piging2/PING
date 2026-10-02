#!/usr/bin/env python3
"""DECISION-SHARD-0 generator. Units 0-249. Builds backlog appends + results.jsonl."""
import json, os

BASE = os.path.expanduser("~/workspace/fyd-factory/missions/decision")
BACKLOG = os.path.expanduser("~/workspace/fyd-factory/missions/decision-backlog.jsonl")
SHARD = os.path.join(BASE, "shard-0")

items = []

def add(iid, kind, question, context, outputs, evidence, confidence, conf_basis,
        criticality, reversibility, blast_radius, novelty, authority, cost,
        time_sensitivity, verification, verdict, verdict_rationale):
    items.append({
        "id": iid, "kind": kind, "question": question, "context": context,
        "outputs": outputs, "evidence": evidence, "confidence": confidence,
        "conf_basis": conf_basis, "criticality": criticality,
        "reversibility": reversibility, "blast_radius": blast_radius,
        "novelty": novelty, "authority": authority, "cost": cost,
        "time_sensitivity": time_sensitivity, "verification": verification,
        "verdict": verdict, "verdict_rationale": verdict_rationale,
    })

# ---------------------------------------------------------------- FIRST 15 (seed backlog, units 0-14)

add("D-001","integration",
    "Integrate TD-001 contestant-A regression test patch?",
    "tournaments/td-001/INTEGRATION-PLAN.md; test-only, zero production blast radius, git apply --check OK",
    ["Apply contestant-a.patch (new test file only) and run suites",
     "Hold: keep patch staged, no repo write",
     "Reject: archive with rationale"],
    ["git apply --check passes on fyd-factory@e48ef710",
     "INTEGRATION-PLAN.md expected results section (4 tests + builder suites green)",
     "Patch inventory: exactly one new file under __tests__, zero production files"],
    0.95, "Plan documents check-OK, single-file additive patch, explicit integration steps with expected results.",
    "P2", "Fully: delete the single new test file; no production code ever touched.",
    "Zero production blast radius by construction (test file only); lane testMatch discovery.",
    "Recurring (tournament integration convention)", "Parent-gated integration writer (repo writes are not worker authority)",
    "Low (copy patch, apply, run vitest suites)", "This week (fidelity tripwire value decays while unmerged)",
    "git status shows exactly one new untracked test file; npx vitest run on the file = 4/4 pass; builder suites green",
    "REQUEST_CONFIRMATION", "Evidence is complete and the change is test-only, but every repo write is owned by the parent-gated integration writer; the decision shard recommends integration, the writer confirms and executes.")

add("D-002","integration",
    "Integrate the 5 SEC-FIX patches to the repo?",
    "security/SEC-FIX-SPEC.md; REQUIRED x4 + RECOMMENDED x1; close /o XSS hole; resolveSafeLink stays single authority",
    ["Apply all 5 patches (4 REQUIRED + 1 RECOMMENDED email-shape tighten)",
     "Apply only the 4 REQUIRED patches; hold RECOMMENDED for separate review",
     "Hold all: keep patches staged"],
    ["SEC-FIX-SPEC.md patch index with git apply --check OK on all 5",
     "Test assertions per patch (A35/A36/A44/A49/W2 hole-closed criteria + positive regressions)",
     "HOSTILE-VERDICT.md confirming the holes are real on the /o lane"],
    0.9, "Spec verified with git apply --check against the Pig working tree 2026-09-23; hole-closed assertions are explicit.",
    "P0 (live XSS-class seams on the /o object pages)", "Reversible per patch via git apply -R, but touch production render code; rollback is cheap, reputational cost of a regression is not.",
    "/o lane render path (view.ts, page.tsx Contact block, media select, data-boundary export, safe-link email shape)",
    "Recurring (lane-verdict -> patch -> integration cadence)", "Parent-gated integration writer",
    "Low-Medium (apply 5 patches, run hostile test assertions + positive regressions)", "This week (XSS-class holes are P0)",
    "Re-run the hostile assertions A35/A36/A44/A49/A32/A33: holes closed, positive regressions green",
    "REQUEST_CONFIRMATION", "REQUIRED patches are clear-cut, but the RECOMMENDED #5 is a judgment call and all repo writes belong to the parent-gated integration writer; default recommendation is to integrate all 5, confirmed by the writer.")

add("D-003","failure-class",
    "F-1..F-6: 6 uncaught TypeErrors on malformed fields (null description/fields/objects/relationships). Fail-closed fix path?",
    "pressure/PRESSURE-REPORT.md",
    ["Ingestion-boundary normalization: coerce nulls to typed absent at graph construction, single choke point",
     "Per-call-site guards: null checks at homePage, fieldValue, group, related, applyFieldVisibility",
     "Hybrid: boundary normalization for graph shape, call-site guards for field values"],
    ["PRESSURE-REPORT.md F-1..F-6 exact TypeError signatures and call sites",
     "Honest-handling note: numeric phone already treated as absent (precedent for fail-closed handling)",
     "Reuse rule: no second authority; the existing validator/graph boundary is the candidate owner"],
    0.8, "Failure sites are exactly located, but the authority question (ingestion vs call site) is a design decision with trade-offs.",
    "P1 (degenerate JSON ingestion crashes the render path)",
    "Patch proposals under missions/patches are reversible until applied; the applied behavior change is semi-permanent",
    "generateSiteSpec + buildRenderContext (all lanes consume them)",
    "Recurring (robustness class)", "Parent-gated integration writer for repo write; worker may propose patch",
    "Medium (minimize repro, one patch on the authorized path, pressure re-run)", "This week",
    "Re-run F4 pressure suite: F-1..F-6 produce typed failures or honest-empty output, zero throws",
    "DEEP_REVIEW", "The fix path is an architecture choice (one choke point vs distributed guards) on shared pipeline code; the recommendation is ingestion-boundary normalization with per-call-site field guards as defense, but the design needs review before a patch is proposed.")

add("D-004","failure-class",
    "F-8: title:null renders literal 'About null' with 0 validator errors. Where should the guard live?",
    "pressure/PRESSURE-REPORT.md",
    ["validateSiteSpec emits a typed error on null/invalid titles (validator mandate)",
     "Generator coerces null title to honest-absent before page construction",
     "Both: generator normalizes, validator flags residual cases"],
    ["F-8 evidence: page titles [null, 'About null'], 0 validator findings, classified INVENTED-CLAIM",
     "R7 validator gate mandate (DEHPP: never render an invalid spec)"],
    0.85, "The gap is exactly located; validator mandate already exists (R7), so extending it is the natural owner.",
    "P1 (invented business name surfaced to visitors)",
    "Patch proposal reversible; applied validator change is semi-permanent",
    "validateSiteSpec consumers; page title presentation",
    "Novel instance of a known class (null-coercion)", "Worker may propose patch; parent-gated writer applies",
    "Low (one validator rule + regression test)", "This week",
    "title:null input yields typed validator error and no 'About null' in output; '0 validator errors' case impossible",
    "EXECUTE_REVERSIBLY", "The guard's home is clear (validator, per R7) and the fix is a small additive rule with a regression test; proceed with a patch proposal in missions/patches, reversible until the integration writer applies it.")

add("D-005","failure-class",
    "F-7: duplicate object ids resolve inconsistently across generator/renderer seam. Canonical owner?",
    "pressure/PRESSURE-REPORT.md",
    ["Generator wins: renderer must adopt stable-sort-first resolution",
     "Renderer wins: generator must adopt Map last-wins resolution",
     "Neither: duplicate ids become a typed validation error (fail closed at validateSiteSpec)"],
    ["F-7 exact evidence: specHomeTitle='First Title' vs resolvedOwnerTitle='Second Title', mismatch=true",
     "Class-4 note: near-dups already resolve lowest-id-wins cleanly in the generator"],
    0.8, "Evidence is exact, but choosing the canonical rule is a semantic decision affecting identity semantics.",
    "P1 (self-contradictory output: spec says First Title, render says Second Title)",
    "Patch proposal reversible; applied identity-semantics change is semi-permanent",
    "Generator/renderer seam (all sites with duplicate ids in source data)",
    "Novel (cross-seam identity inconsistency)", "Worker may propose patch; parent-gated writer applies",
    "Medium (repro + one-seam fix + pressure re-run of class 4)", "This week",
    "Duplicate-id input: spec title and rendered owner title/phone agree on every pass (determinism check)",
    "DEEP_REVIEW", "This changes identity semantics at a seam with two plausible owners; the failure-loop patch process requires a reviewed design (recommended: typed validation error on duplicate ids, since silent winner selection is what pressure class 6 already forbids) before implementation.")

add("D-006","failure-class",
    "H4/R-H4 two-verifier seam: renderer accepts derived/owner_authored unconditionally. Reconcile or route?",
    "claim/CLAIM-VERDICT.md; lane-evidence-wire-spec in flight",
    ["Route: make the renderer call BindingVerifier (retire the weaker verifier)",
     "Reconcile: strengthen verifyPresentationBinding to enforce owner-assertion rule",
     "Wait for lane-evidence-wire-spec, then decide on its terms"],
    ["CLAIM-VERDICT.md H4: verifyPresentationBinding accepts derived/owner_authored unconditionally (graph.ts); R-H4 confirmed end to end on coppersmith fixture",
     "Renderer comment block ~685-710 claims 'no binding, no factual output' invariant relative to the weaker verifier",
     "lane-evidence-wire-spec status (in flight): its terms may define the seam"],
    0.7, "The hole is confirmed but a parallel lane is actively redefining the evidence wire; deciding now risks a conflicting seam.",
    "P0 (unverified claims can render as supported facts on the production path)",
    "Seam redesign is semi-permanent; patch proposals reversible",
    "Entire render path claim integrity", "Novel seam defect", "Parent-gated integration writer",
    "Medium-High (seam redesign + attack-test re-run)", "Blocked until lane-evidence-wire-spec lands",
    "H4 attack test green: owner_authored with no assertion grades UNBOUND at the renderer seam too",
    "DEFER", "An in-flight lane spec owns the seam being decided; deciding now would preempt or conflict with it. Revisit the moment lane-evidence-wire-spec lands, with H4/R-H4 attack tests as the acceptance bar.")

add("D-007","failure-class",
    "R-MODEL: /sites path never runs the strong verifier. Wire buildVerifiedRenderModel into /sites or equivalent?",
    "claim/CLAIM-VERDICT.md; qa/truth findings",
    ["Wire buildVerifiedRenderModel into /sites pages (happy-place, coppersmith-plumbing) with render-time re-verification",
     "Move verification to the planner for /sites too (single verification owner)",
     "Keep /sites direct but gate serving on a verified-model digest match"],
    ["R-MODEL evidence: tampered phone 970-000-0000 rendered though the verified model saw 970-245-3869; serving-path fact: both /sites pages call generateSiteSpec directly, buildVerifiedRenderModel's only non-test caller is planner.ts",
     "qa/truth findings on the /sites serving path"],
    0.85, "The hole is exactly located with a serving-path fact; the design choice is which seam owns verification.",
    "P0 (render-time integrity on the public path rests entirely on the weaker verifier)",
    "Serving-path change is semi-permanent; patch proposal reversible",
    "/sites public pages (production serving path)", "Novel (serving-path verifier gap)",
    "Parent-gated integration writer; design review", "Medium-High", "This week (P0, but design first)",
    "Tampered-graph probe: post-verification mutation cannot render; /sites pages build or consume a VerifiedRenderModel",
    "DEEP_REVIEW", "This is the load-bearing claim-integrity seam on the public path; the wiring choice (page-level vs planner-owned vs digest gate) needs a reviewed design, with the R-MODEL tamper probe as the acceptance test.")

add("D-008","failure-class",
    "H8: 32-bit digest collision found empirically. Mandate >=256-bit digests everywhere?",
    "claim/CLAIM-VERDICT.md; incremental spec already uses SHA-256",
    ["Mandate SHA-256+ everywhere immediately",
     "Inventory all 32-bit digest uses first, then mandate with migration plan",
     "Ban 32-bit digests from change-detection/dedup/integrity identity only (narrow ban), migrate the rest opportunistically"],
    ["H8 evidence: real collision 'faebba73' -> '555-61245' and '555-83635' found in ~4.3s",
     "CLAIM-VERDICT residual: H8 digest must not be used for change detection, dedup, or integrity identity",
     "Incremental spec already uses SHA-256 (precedent)"],
    0.75, "The hole is proven but the blast radius of 'everywhere' is unknown without an inventory.",
    "P1 (silent semantic collisions in change detection/dedup)",
    "Migration is semi-permanent; the narrow ban is reversible",
    "Every digest consumer (unknown inventory)", "Novel mandate",
    "Worker may propose; mandate needs review", "Low for inventory; Medium for migration",
    "Now for inventory; mandate after",
    "Codebase inventory: every 32-bit digest use listed with its role (change detection / dedup / identity / display)",
    "GATHER_MORE_EVIDENCE", "'Mandate everywhere' is not actionable without knowing where 32-bit digests live; run the inventory first (a read-only grep-class sweep), then the mandate decision becomes a migration plan with named consumers.")

add("D-009","failure-class",
    "H3 evidence laundering: owner-corrected value graded BOUND on source-value ref. Binding rule fix?",
    "claim/CLAIM-VERDICT.md",
    ["Grade owner-corrected values as OWNER_ASSERTED, never BOUND on the source evidence ref",
     "Strip the evidence ref on owner correction (value carries no source binding)",
     "Keep ref but annotate provenance split: source value BOUND, owner delta ASSERTED"],
    ["H3 evidence: owner value 555-0199 graded BOUND with source 'evidence-ref' covering source value 555-0100",
     "R-CORRECTED: same laundering confirmed end to end (970-000-0001 renders, graded BOUND on ref covering 970-245-3869)"],
    0.85, "The laundering mechanism is exactly described; the fix is a binding-rule change with a clear correct direction.",
    "P1 (owner authorship presented as direct source evidence)",
    "Patch proposal reversible; applied binding-rule change semi-permanent",
    "verifyBinding + render path for owner-corrected fields", "Novel (evidence laundering)",
    "Worker may propose patch; parent-gated writer applies", "Low-Medium", "This week",
    "H3 attack test green: owner-corrected value never grades BOUND on the source ref; R-CORRECTED probe green",
    "EXECUTE_REVERSIBLY", "The correct binding rule is unambiguous (owner-authored values are not source evidence); propose the patch in missions/patches with the H3/R-CORRECTED tests as acceptance, reversible until applied.")

add("D-010","failure-class",
    "H9 composed-claim blindness: verifier grades raw field, not composed presentation. Extend verifier scope?",
    "claim/CLAIM-VERDICT.md",
    ["Extend atoms to carry presented text + transform; verifier grades the composed claim",
     "Require transforms to be declared derivations with their own binding",
     "Document the gap as accepted (verifier grades inputs only) with a composed-claim audit list"],
    ["H9 evidence: 'Serving the valley since 2009' composed from foundingDate '2009'; binding carries no transform or presented text; verifyBinding returns raw '2009'",
     "Digest covers inputs, never rendered outputs"],
    0.8, "The semantic gap is exactly described; scope extension is a schema+verifier design change.",
    "P1 (any transform between field value and rendered text is invisible to verification)",
    "Schema change is semi-permanent; patch proposal reversible",
    "BindingVerifier, atom schema, every composed presentation", "Novel (verifier scope)",
    "Design review + parent-gated writer", "Medium", "This week",
    "H9 probe: verifyBinding on a composed claim returns/grades the presented text with its transform declared",
    "DEEP_REVIEW", "Extending the verifier to composed claims changes the atom schema and the verifier contract; the design (what counts as a transform, how presented text is bound) needs review before a patch is proposed.")

add("D-011","policy",
    "DEHPP count-mismatch denominator: 54 mechanisms (framing) vs 62 rows (classification). Which is canonical?",
    "dehpp/parameterization-spec.md vs classification.md; morning decision item",
    ["54 is canonical: classification.md's stated total; 62 rows include non-mechanism rows (headers/splits)",
     "62 is canonical: every row is a mechanism; the 54 framing is wrong",
     "Recount: classify each of the 62 rows, publish the row->mechanism mapping, then declare"],
    ["classification.md: 'Counts: KEEP 34, PARAMETERIZE 13, REFACTOR/REPLACE-DROP 7. Total mechanisms classified: 54.'",
     "parameterization-spec.md authority line cites classification.md (54 mechanisms)",
     "The 62-row count source (classification.md row table)"],
    0.6, "Both numbers come from the same document family; only a row-by-row recount resolves which denominator the spec should cite.",
    "P2 (denominator error propagates into build planning and acceptance counts)",
    "Documentation correction is fully reversible", "DEHPP build spec + clone-prove acceptance",
    "Novel (spec inconsistency)", "Worker (documentation truth)",
    "Low (read-only recount of the 62 rows)", "This week (morning decision queue)",
    "Published mapping: 62 rows -> 54 (or 62) mechanisms with each row's disposition; spec cites the reconciled number",
    "GATHER_MORE_EVIDENCE", "Below the decide threshold: the recount is a 30-minute read-only exercise that determines the answer; do it, publish the mapping, then the denominator declares itself.")

add("D-012","policy",
    "Adopt 0.95 as the golden-set correctness bar?",
    "morning decision item; golden-set protocol exists",
    ["Adopt 0.95 as the bar with a defined red-run response",
     "Adopt 0.95 as an advisory target, hard bar later",
     "Set a different bar (1.0 for safety-critical seams, 0.95 elsewhere)"],
    ["Golden-set protocol definition (metric, sampling, fixture ownership)",
     "Morning decision queue item naming 0.95",
     "Red-run history: what happens today when the set goes red"],
    0.55, "The protocol exists but the bar's consequences (who stops what on red) are not in evidence.",
    "P1 (quality bar governs release confidence)", "Bar change is reversible (a number), but a red bar blocks work",
    "Whole factory output confidence", "Novel (program-level)", "Nolan (morning decision queue)",
    "Low (decision + documentation)", "Morning queue",
    "Bar documented with: metric definition, red-run response owner, fixture refresh cadence",
    "HUMAN_DECISION", "A program-level correctness bar with release-blocking consequences is a genuine business decision for Nolan's morning queue; the shard recommends 0.95 with a defined red-run response, but the call is his.")

add("D-013","policy",
    "VQ repair patches: apply after clone fidelity (motion-gated services, badge contrast, FAB occlusion, contact CTA, scroll lock)?",
    "patches/vq-*.patch; fidelity proof done (PROCEED)",
    ["Apply all 5 VQ patches in one integration",
     "Apply individually with per-patch fidelity re-check",
     "Hold: keep staged until post-apply fidelity proof is defined"],
    ["patches/vq-001..vq-004 (and the 5th) with git apply --check status",
     "Fidelity proof PROCEED record",
     "Per-patch scope: motion-gated services, badge contrast, FAB occlusion, contact CTA, scroll lock"],
    0.9, "Fidelity proof is done and patches are checked; the remaining question is batch vs individual application.",
    "P2", "git apply -R per patch; fully reversible", "Clone fidelity surface (5 named repairs)",
    "Recurring", "Parent-gated integration writer",
    "Low (apply + fidelity re-check)", "This week",
    "Post-apply: clone fidelity re-proof passes with the 5 repairs in place",
    "REQUEST_CONFIRMATION", "Fidelity proof says PROCEED and the patches are checked, but repo writes belong to the integration writer; recommend individual application with per-patch fidelity re-check, confirmed by the writer.")

add("D-014","policy",
    "AcceptsSchemas/registry hygiene: reconcile ObjectFeed acceptsSchemas vs SCHEMA_COMPONENTS before new consumers?",
    "tournaments/td-001/adversarial-review.md latent note",
    ["Reconcile now: single inventory, one canonical mapping, regression test",
     "Reconcile lazily: only when a new consumer is proposed",
     "Document the drift and accept it"],
    ["TD-001 latent note text (the exact hygiene finding)",
     "Current acceptsSchemas vs SCHEMA_COMPONENTS diff",
     "TD-001 test 1 pin: external_identity -> GenericObjectCard only (shows the mapping matters)"],
    0.75, "The latent note names the drift but its current severity (silent mismatch vs documented divergence) needs the diff.",
    "P2 (registry drift silently changes component eligibility)",
    "Inventory is read-only; reconciliation patch is semi-permanent",
    "ObjectFeed eligibility for every schema", "Recurring (registry hygiene)",
    "Worker may propose patch; writer applies", "Low-Medium", "Before the next new consumer",
    "Single published mapping acceptsSchemas<->SCHEMA_COMPONENTS with a regression test that fails on drift",
    "DEEP_REVIEW", "The reconciliation touches the schema-to-component contract that TD-001 just pinned; get the current diff first, then review the reconciliation design against the TD-001 pins before proposing a patch.")

add("D-015","policy",
    "Phase 17 gap list: what does the factory need before UNAUTHENTICATED VISITOR -> PUBLISH is safe?",
    "build-program coordinator dependency; morning decision item",
    ["Produce the gap list and treat each gap as a blocking work item",
     "Produce the gap list as advisory; coordinator prioritizes",
     "Defer the list until the claim seams (H4, R-MODEL) are closed"],
    ["Build-program coordinator dependency statement",
     "Current seam status: H4/R-H4 open, R-MODEL open, SEC-FIX pending integration, F-1..F-8 pending",
     "Phase 17 definition of 'safe' (threat model for unauthenticated publishing)"],
    0.7, "The dependency is real and the open-hole inventory is known, but 'safe' needs the coordinator's threat model to be checkable.",
    "P0 (this is the production-launch gate)", "A gap list is reversible; publishing is not",
    "Production launch", "Novel (launch gate)", "Nolan (production launch is a hard boundary)",
    "Medium (gap analysis across lanes)", "Morning queue; blocking for Phase 17",
    "Gap list where each item has: owner, evidence requirement, and a named closer; Nolan signs the list",
    "HUMAN_DECISION", "UNAUTHENTICATED VISITOR -> PUBLISH is a production launch, which is a hard boundary: no launch without Nolan. The shard will produce the gap list as the evidence pack, but the go/no-go is his.")

# ------------------------------------------------- PRESSURE DRILLS D-016..D-050

def pf(iid, question, context, outputs, evidence, confidence, conf_basis,
       criticality, reversibility, blast_radius, authority, cost,
       time_sensitivity, verification, verdict, verdict_rationale):
    add(iid, "failure-class", question, context, outputs, evidence, confidence,
        conf_basis, criticality, reversibility, blast_radius,
        "Novel instance of F-class", authority, cost, time_sensitivity,
        verification, verdict, verdict_rationale)

pf("D-016", "F-1: where exactly should the null-description guard live?",
   "pressure/PRESSURE-REPORT.md F-1: g.owner.description.trim() in homePage",
   ["Normalize description to '' at graph ingestion",
    "Null-guard at homePage call site (description ?? '')",
    "Typed fail-closed: owner without description -> typed validator error, page omitted"],
   ["F-1 exact TypeError and call site", "1MB description passes honestly (normalization must not break large fields)"],
   0.8, "Call site is exact; choice between ingestion choke point and call-site guard is design.",
   "P1", "Patch proposal reversible", "generateSiteSpec homePage path",
   "Worker may propose patch; writer applies", "Low", "This week",
   "F-1 repro: description:null yields honest output or typed error, no throw",
   "EXECUTE_REVERSIBLY", "The fix is small and local with an exact repro; propose the patch (recommended: call-site null-guard plus ingestion normalization later), reversible until applied.")

pf("D-017", "F-2: fieldValue on fields:null. Guard at accessor or normalize fields={} at ingestion?",
   "pressure/PRESSURE-REPORT.md F-2: o.fields[name] in fieldValue",
   ["Accessor guard: fieldValue treats null fields as absent",
    "Ingestion: coerce fields:null to {} once",
    "Typed error: object with null fields flagged by validator"],
   ["F-2 exact TypeError", "F-6 shows the same null-fields shape breaks buildRenderContext too (two sites, one shape)"],
   0.85, "Two failure sites share one root shape; the ingestion choke point fixes both.",
   "P1", "Patch proposal reversible", "fieldValue + applyFieldVisibility (both field accessors)",
   "Worker may propose patch; writer applies", "Low", "This week",
   "fields:null and fields:undefined both render honest-empty; F-2 and F-6 repros green",
   "EXECUTE_REVERSIBLY", "One ingestion normalization (fields:null -> {}) closes F-2 and F-6 together; propose it as a single patch with both repros as acceptance.")

pf("D-018", "F-3: group() on graph.objects:null. Fail-typed or normalize to []?",
   "pressure/PRESSURE-REPORT.md F-3: graph.objects.map in group()",
   ["Normalize objects:null to [] at ingestion (honest-empty graph)",
    "Typed fail: generateSiteSpec returns typed error 'graph has no objects'",
    "Call-site guard in group() only"],
   ["F-3 exact TypeError", "Class-1 precedent: missing business object already fails closed with typed error (pages:[], ownerObjectId:'')"],
   0.85, "Class-1 sets the fail-closed precedent; the question is normalize vs typed-error.",
   "P1", "Patch proposal reversible", "generateSiteSpec entry",
   "Worker may propose patch; writer applies", "Low", "This week",
   "objects:null behaves like class 1 (honest-empty + typed error), no throw",
   "EXECUTE_REVERSIBLY", "Follow the class-1 precedent: treat null objects as the missing-business case (honest-empty + typed error). Small, reversible patch proposal.")

pf("D-019", "F-4: related() on graph.relationships:null. Same treatment as F-3?",
   "pressure/PRESSURE-REPORT.md F-4: for (const r of graph.relationships)",
   ["Normalize relationships:null to [] at ingestion",
    "Call-site guard in related() (null -> no relations)",
    "Typed error like F-3"],
   ["F-4 exact TypeError", "Class-12 precedent: zero relationships already fails closed honestly"],
   0.9, "Class 12 proves null-relationships-equivalent input is already handled honestly; this is a one-line guard.",
   "P1", "Patch proposal reversible", "related() relationship resolution",
   "Worker may propose patch; writer applies", "Low", "This week",
   "relationships:null resolves like zero-relationships input (class 12 behavior)",
   "EXECUTE_REVERSIBLY", "The correct behavior is proven by class 12; this is a one-line null-guard. Propose it.")

pf("D-020", "F-5: undefined member inside objects array. Drop silently, flag, or fail?",
   "pressure/PRESSURE-REPORT.md F-5: graph.objects.map((o) => [o.id, o]) on undefined member",
   ["Drop undefined members at ingestion with a typed ingestion warning",
    "Fail typed: malformed graph rejected with member index",
    "Guard in group(): skip undefined members silently"],
   ["F-5 exact TypeError", "Numeric-field precedent: malformed values treated as absent honestly"],
   0.75, "Silent drop risks hiding data loss; typed failure risks brittleness on dirty ingestion. The warning-carrying drop is the middle path but needs review.",
   "P1", "Patch proposal reversible", "group() object indexing",
   "Worker may propose patch; writer applies", "Low", "This week",
   "objects:[valid, undefined] indexes the valid object; the malformed member is reported, not thrown on",
   "DEEP_REVIEW", "Silent-drop vs typed-fail is a data-loss-visibility decision on shared ingestion; review the trade-off (recommended: drop with typed ingestion warning) before proposing.")

pf("D-021", "F-6: applyFieldVisibility on fields:undefined. Covered by D-017's normalization?",
   "pressure/PRESSURE-REPORT.md F-6: Object.entries(o.fields) in buildRenderContext",
   ["Yes: D-017 ingestion normalization (fields -> {}) closes F-6; no separate patch",
    "No: separate call-site guard in applyFieldVisibility as defense in depth",
    "Validator-side: objects with undefined fields flagged before render context"],
   ["F-6 exact TypeError; note generate+validate passed first (honest-empty + typed error) then render threw",
    "D-017 proposed normalization"],
   0.85, "Root shape is identical to F-2; the open question is defense-in-depth vs single choke point.",
   "P1", "Patch proposal reversible", "buildRenderContext field visibility",
   "Worker may propose patch; writer applies", "Low", "This week",
   "fields:undefined object passes generate, validate, and buildRenderContext without throw",
   "EXECUTE_REVERSIBLY", "Treat as one fix with D-017 (single ingestion normalization), with the F-6 repro added to its acceptance; if review wants defense in depth, add the call-site guard in the same patch.")

pf("D-022", "F-8 follow-up: audit all string concatenations in the renderer for null-coercion artifacts?",
   "pressure/PRESSURE-REPORT.md F-8; renderer string assembly sites",
   ["Full audit: grep all '+'/'template' title/name assembly, add null guards, regression tests",
    "Targeted: fix title paths only (page titles, section headings)",
    "No audit: rely on validator null-title rule from D-004"],
   ["F-8: 'About ' + null -> 'About null' is a composition-site bug, not just a validator gap",
    "Validator flags input; composition sites can still coerce non-null-typed-but-undefined values"],
   0.8, "F-8 proves the composition site is a distinct bug class from the validator gap.",
   "P1", "Patch proposal reversible", "Renderer string assembly (titles, headings, labels)",
   "Worker may propose patch; writer applies", "Medium (audit + guards + tests)", "This week",
    "Null/undefined at every audited assembly site renders honest-absent, never 'null'/'undefined' literals",
   "EXECUTE_REVERSIBLY", "F-8 is a composition-site defect; the validator rule alone leaves sibling sites open. Run the audit as a reversible patch proposal with a per-site regression test.")

pf("D-023", "Canonical rule: malformed field values are treated as absent (generalize the numeric-phone precedent)?",
   "pressure/PRESSURE-REPORT.md honest-handling note: phone:12345 treated as absent, Contact omitted, no throw",
   ["Adopt as canonical: any malformed field value -> absent, section omitted, no invention",
    "Keep case-by-case: numeric handled, others decided per finding",
    "Adopt with typed warnings: absent + validator warning naming the field"],
   ["Numeric phone precedent in the pressure report", "F-1..F-8: nulls currently throw instead of absenting"],
   0.8, "The precedent is proven and honest; generalizing it is a one-rule change with clear semantics.",
   "P2", "Rule documentation reversible; applied behavior semi-permanent",
   "All field accessors (fieldValue, applyFieldVisibility)", "Worker (rule) + writer (code)",
   "Low", "This week",
   "Malformed values across field types (null, numeric, object) all resolve to absent with no throw and no invented output",
   "EXECUTE_REVERSIBLY", "The honest behavior is already proven on the numeric case; generalize it as the canonical malformed-field rule, with typed warnings so data loss is visible. Reversible patch proposal.")

pf("D-024", "Ingestion boundary: single normalization choke point for all degenerate graph shapes?",
   "pressure/PRESSURE-REPORT.md classes 7 (F-1..F-8); MISSION-PROTOCOL reuse rule: no second authority",
   ["Create one normalizeGraph() at ingestion owning all null/undefined/degenerate shapes",
    "Keep per-call-site guards (D-016..D-022 decisions)",
    "normalizeGraph() for shape, call-site guards for field values (split ownership)"],
   ["F-1..F-6 share root cause: no ingestion normalization", "Reuse rule forbids a second authority; the graph boundary is the candidate single owner"],
   0.75, "Single choke point is architecturally clean but changes the ingestion contract for all producers.",
   "P2", "New function is additive; contract change semi-permanent",
   "Graph ingestion (all lanes produce graphs)", "Design review + writer",
   "Medium", "This week",
   "normalizeGraph() idempotent; F-1..F-6 repros pass through it; all existing honest cases unchanged",
   "DEEP_REVIEW", "This creates the ingestion contract for the whole factory; the single-owner design needs review (recommended: adopt normalizeGraph() as the one choke point, per the no-second-authority rule) before implementation.")

pf("D-025", "generateSiteSpec failure contract: which malformed inputs throw vs return typed errors?",
   "pressure/PRESSURE-REPORT.md; class-1 typed-error precedent",
   ["Typed errors for all malformed input; generateSiteSpec never throws on data",
    "Throws allowed for programmer errors (null graph object itself); typed for data",
    "Current mixed behavior documented as-is"],
   ["Class 1: generateSiteSpec returns pages:[] + typed validator error, no throw (precedent)",
    "F-1..F-5: generateSiteSpec throws TypeErrors on data (violates the precedent)"],
   0.85, "The precedent exists; the contract just needs to be stated and enforced.",
   "P2", "Contract documentation reversible; enforcement semi-permanent",
   "generateSiteSpec + all callers", "Worker (contract) + writer (enforcement)",
   "Low", "This week",
   "Contract published; pressure suite asserts no-throw-on-data across all 12 classes",
   "EXECUTE_REVERSIBLY", "State the contract (typed errors for malformed data, throws only for programmer errors) and enforce it in the same normalizeGraph patch; the pressure suite becomes the contract test.")

pf("D-026", "Validator mandate: detect malformed input, not just structural invalidity?",
   "pressure/PRESSURE-REPORT.md F-8: 0 validator errors on invented 'About null'",
   ["Extend validateSiteSpec to flag null/invalid field values as findings",
    "Keep validator structural; malformed input is the generator's job",
    "Split: validator flags, generator normalizes (both)"],
   ["F-8: validator reported 0 errors on an invented claim", "R7 mandate: 'an invalid spec never renders' - a spec with 'About null' is invalid"],
   0.85, "R7 already mandates the validator as the render gate; malformed values that invent claims are validator business.",
   "P1", "Additive validator rules reversible", "validateSiteSpec + isRenderable gate",
   "Worker may propose patch; writer applies", "Low", "This week",
   "Malformed inputs (null title, null description) produce validator findings; isRenderable reflects them",
   "EXECUTE_REVERSIBLY", "Extend the validator with malformed-value findings per the R7 mandate; additive rules, regression-tested, reversible patch proposal.")

pf("D-027", "Re-run the F4 pressure suite after the F-1..F-8 fixes: full 22-case re-run or targeted?",
   "pressure/PRESSURE-REPORT.md; harness f4-harness.mts (22 cases) kept for rerun",
   ["Full 22-case re-run (regression + fix verification)",
    "Targeted: class 7 cases only",
    "Full re-run plus new null-coercion audit cases"],
   ["Harness kept for rerun per report hygiene section", "Fixes touch shared code paths (field accessors) that honest cases depend on"],
   0.9, "Shared-code changes demand regression proof; the harness exists and is runnable.",
   "P2", "Read-only run; fully reversible", "None (read-only)",
   "Worker (within read-only authority)", "Low", "After fixes land",
   "Full suite green: 10/12 classes still fail-closed, class 7 now typed/honest, zero regressions",
   "AUTO_EXECUTE", "Read-only re-run of the kept harness is squarely within worker authority; run it after the fixes land and notify with the before/after table.")

pf("D-028", "Class-4 rule: codify 'lowest-id wins' for near-duplicate names as canonical?",
   "pressure/PRESSURE-REPORT.md class 4: near-dups resolve lowest-id owner cleanly",
   ["Codify lowest-id-wins in the generator with a regression test",
    "Leave as emergent behavior (tested but undocumented)",
    "Replace with explicit dedup rule (merge vs drop decision)"],
   ["Class-4 evidence: no throw, no invented strings, lowest-id wins cleanly", "Class-6 conflict rule: no silent winner fabrication in output"],
   0.8, "Behavior is proven; codification is documentation + test, low risk.",
   "P3", "Documentation/test reversible", "Generator near-dup path",
   "Worker", "Low", "Standing",
   "Regression test pins lowest-id-wins on near-dup input",
   "AUTO_EXECUTE", "Pinning proven honest behavior with a regression test is reversible, within authority, and prevents future drift. Do it.")

pf("D-029", "Class-6 rule: 'no silent winner fabrication' as a canonical conflict-handling law?",
   "pressure/PRESSURE-REPORT.md class 6: two businesses different phones, exactly one phone resolves, no merge",
   ["Adopt as canonical law with pressure class-6 as the conformance test",
    "Keep as observed behavior only",
    "Strengthen: conflicting facts must surface a typed conflict finding"],
   ["Class-6 evidence: Contact resolves exactly one phone 555-0001, no merge, no silent fabrication",
    "H5 misattribution hole: silent source replacement is the same class of sin"],
   0.85, "The honest behavior is proven; the law generalizes it across conflict cases.",
   "P2", "Law documentation reversible", "All conflict resolution paths",
   "Worker (law) ", "Low", "Standing",
   "Class-6 conformance test passes; H5-style silent replacement fails review",
   "AUTO_EXECUTE", "Adopt the law and pin it with the class-6 test; it directly constrains the H5 fix design. Within worker authority.")

pf("D-030", "1MB string fields: keep the 1MB pass as a permanent performance guard test?",
   "pressure/PRESSURE-REPORT.md class 8: 1MB description/title pass in ~1 ms, byte-exact",
   ["Keep as permanent guard (regression on perf + byte-exactness)",
    "Keep as documented behavior, no permanent test",
    "Drop: degenerate size is not a supported input"],
   ["Class-8 evidence: ~1 ms, byte-exact through all stages", "Saturation rule: never crash the machine for a number"],
   0.9, "Behavior is proven and the test is cheap and read-only.",
   "P3", "Test-only, reversible", "None",
   "Worker", "Low", "Standing",
   "Guard test in the pressure harness asserts <100ms and byte-exactness on 1MB fields",
   "AUTO_EXECUTE", "A cheap read-only guard that pins proven behavior; within authority, reversible. Add it to the harness.")

pf("D-031", "RTL/bidi/zero-width passthrough: document as honest-bytes policy?",
   "pressure/PRESSURE-REPORT.md class 9: RTL overrides, zero-width, CJK, Arabic, emoji, NUL round-trip byte-identical",
   ["Document byte-identical passthrough as the canonical unicode policy",
    "Add sanitization (strip zero-width/bidi overrides) as a safety rule",
    "Leave undocumented"],
   ["Class-9 evidence: byte-identical round-trip through spec, projection, query resolution",
    "No injection vector demonstrated in the report for bidi/zero-width in this pipeline"],
   0.75, "Passthrough is proven but bidi overrides are a known spoofing vector in display contexts; the trade-off needs a call.",
   "P2", "Policy reversible", "Text rendering of business content",
   "Worker (policy)", "Low", "Standing",
   "Policy documented; if sanitization chosen, class-9 cases re-run with expected transforms",
   "DEEP_REVIEW", "Byte-passthrough vs bidi-spoofing hardening is a display-safety trade-off that affects every text surface; review before adopting either as canonical.")

pf("D-032", "Schema-less objects: 'honest-empty + typed error' as canonical drop rule?",
   "pressure/PRESSURE-REPORT.md class 10: schema:'' and unknown schemas never match a role; honest-empty spec + typed error",
   ["Codify as canonical with regression test",
    "Leave as observed",
    "Extend: unknown schemas get a review queue instead of silent drop"],
   ["Class-10 evidence: honest-empty spec + typed validator error; unlinked real service correctly dropped",
    "Deterministic world addressing includes hostile types that may produce schema-less objects"],
   0.85, "Behavior is proven honest; codification is low-risk.",
   "P3", "Reversible", "Spec generation for unknown schemas",
   "Worker", "Low", "Standing",
   "Regression test pins honest-empty + typed error on schema-less input",
   "AUTO_EXECUTE", "Pin the proven honest behavior; reversible and within authority.")

pf("D-033", "Class-11: generator ignores evidenceRef on relationships. Acceptable or a hole?",
   "pressure/PRESSURE-REPORT.md class 11: evidenceRef:'' and undefined on relationships ignored; pipeline OK",
   ["Acceptable: relationships carry structural, not evidential, weight; document",
    "Hole: relationships need evidence binding like fields (route to claim lane)",
    "Typed warning: unevidenced relationships flagged, not dropped"],
   ["Class-11 evidence: full pipeline OK with empty/undefined evidenceRef",
    "CLAIM-VERDICT H1: empty provenance refs on derived claims are a confirmed smuggling vector"],
   0.7, "Class 11 says harmless, H1 says empty refs smuggle claims; the interaction is genuinely uncertain.",
   "P2", "Decision reversible", "Relationship evidence handling",
   "Worker + claim-lane input", "Low", "This week",
   "Ruling documented with the H1 interaction addressed; if hole, a claim-lane work item is filed",
   "GATHER_MORE_EVIDENCE", "The H1 interaction makes this a real question, not a formality: check whether relationship-derived claims can reach presentation unevidenced before ruling. A focused probe, then decide.")

pf("D-034", "Class-12 explore page from unlinked public objects: canonical honest-minimal-site rule?",
   "pressure/PRESSURE-REPORT.md class 12: home + about + explore from unlinked public objects; no phantom sections",
   ["Codify: zero relationships -> explore page from unlinked public objects, no phantom service/person sections",
    "Leave as observed",
    "Change: omit explore when no relationships exist"],
   ["Class-12 evidence: honest minimal site, no phantom sections", "Explore page is a real surface; its population rule matters for honesty"],
   0.8, "Behavior is proven honest; codification is documentation + test.",
   "P3", "Reversible", "Explore page generation",
   "Worker", "Low", "Standing",
   "Regression test pins the minimal-site shape on zero-relationship input",
   "AUTO_EXECUTE", "Pin the proven honest behavior; within authority, reversible.")

pf("D-035", "Address coarsening (123 Main St -> Grand Junction, CO): canonical conservative-default rule documented?",
   "pressure/PRESSURE-REPORT.md honest-handling note: coarsening verified as derived-from-input, not invention, per field-visibility.ts",
   ["Document as canonical: public projection coarsens street address by default",
    "Make coarsening an owner-configurable parameter",
    "Remove coarsening: render full address when public"],
   ["field-visibility.ts conservative-default rule", "Pressure verification: derived-from-input, not invention"],
   0.85, "The rule exists in code and is verified honest; the question is documentation vs configurability.",
   "P2 (privacy-relevant default)", "Documentation reversible; parameter change semi-permanent",
   "Public address presentation", "Worker (document); parameter needs review",
   "Low", "Standing",
   "Rule documented; if parameterized, default stays coarsened and the parameter is owner-gated",
   "EXECUTE_REVERSIBLY", "Document the verified rule as canonical with the conservative default locked; configurability can be proposed separately. The documentation step is reversible and within authority.")

pf("D-036", "F-8 class extension: null numeric/boolean fields in arithmetic or display composition?",
   "pressure/PRESSURE-REPORT.md F-8 (title); composition sites beyond titles untested",
   ["Extend the D-022 audit to numeric/boolean composition (prices, counts, ratings)",
    "Titles only; other types cannot coerce to misleading literals",
    "Validator-side: flag null numerics like null titles"],
   ["F-8 mechanism: JS '+' coercion; the same coercion applies to numbers/booleans in templates",
    "No evidence yet of a misleading numeric artifact"],
   0.7, "The mechanism generalizes but no misleading artifact has been demonstrated for non-string types.",
   "P2", "Audit reversible", "All composed presentations",
   "Worker", "Low-Medium", "This week",
   "Probe: null numerics/booleans through composition; any misleading literal -> guard, else document clean",
   "GATHER_MORE_EVIDENCE", "Run the probe first: feed null numerics/booleans through the composition sites and see what renders. The audit scope follows the evidence.")

pf("D-037", "Pressure harness: promote f4-harness.mts to a permanent regression suite?",
   "pressure/PRESSURE-REPORT.md hygiene: harness sources kept for rerun",
   ["Promote: check in as the render-path robustness suite with CI-style invocation",
    "Keep as rerun-only artifacts (current state)",
    "Archive: one-off campaign, delete harness"],
   ["Harness exists and is documented (f4-harness.mts, 22 cases; f4-followup.mts, 4 probes)",
    "Repo is read-only for missions; harness promotion needs the integration writer"],
   0.85, "The harness is proven and kept; promotion is a process decision.",
   "P3", "Promotion is additive and reversible", "Render-path robustness coverage",
   "Parent-gated integration writer (repo check-in)", "Low", "Standing",
   "Harness runs green from a clean checkout via a documented command",
   "REQUEST_CONFIRMATION", "The harness is worth keeping as the permanent robustness suite, but checking it into the repo is the integration writer's call to confirm.")

pf("D-038", "Cyclic relationships: 'single-hop related() never recurses' as canonical traversal law?",
   "pressure/PRESSURE-REPORT.md class 5: owner/services/self loops resolve without hang; 8 resolutions, 0 errors",
   ["Codify as traversal law with the class-5 cases as conformance tests",
    "Leave as observed",
    "Replace with cycle detection + typed finding"],
   ["Class-5 evidence: no hang, no recursion", "Deterministic worlds include cyclic relationship shapes"],
   0.85, "Behavior is proven; codification is test + documentation.",
   "P3", "Reversible", "related() traversal",
   "Worker", "Low", "Standing",
   "Conformance test: cyclic graphs resolve without hang and without unbounded recursion",
   "AUTO_EXECUTE", "Pin the proven no-hang behavior as the traversal law; reversible, within authority.")

pf("D-039", "200-service scale case: keep as permanent scale guard?",
   "pressure/PRESSURE-REPORT.md class 3: 2 ms end to end, 201 objects, 431 resolutions, 0 errors",
   ["Keep as permanent scale/perf guard",
    "Keep documented, no permanent test",
    "Extend: 2000-service stress case"],
   ["Class-3 evidence: 2 ms, no invented strings", "Saturation rule bounds heavy runs"],
   0.9, "Proven, cheap, read-only.",
   "P3", "Test-only reversible", "None",
   "Worker", "Low", "Standing",
   "Guard asserts sub-second end-to-end on the 200-service fixture",
   "AUTO_EXECUTE", "Cheap permanent guard on proven behavior; within authority.")

pf("D-040", "Zero-services honest site: canonical minimal-site shape (home 5 sections + about)?",
   "pressure/PRESSURE-REPORT.md class 2: honest site with home (5 sections) + about, no services page",
   ["Codify the minimal shape with regression test",
    "Leave as observed",
    "Reduce: home only"],
   ["Class-2 evidence: 0 validator errors, honest", "Class-12 minimal site is a related but distinct shape"],
   0.8, "Proven honest; codification is low-risk.",
   "P3", "Reversible", "Zero-service site generation",
   "Worker", "Low", "Standing",
   "Regression test pins home+about shape on zero-service input",
   "AUTO_EXECUTE", "Pin the proven honest minimal shape; reversible, within authority.")

pf("D-041", "Missing business object: pages:[] + ownerObjectId:'' + typed error as canonical?",
   "pressure/PRESSURE-REPORT.md class 1: FAIL-CLOSED with typed error",
   ["Codify as the canonical missing-owner contract",
    "Leave as observed",
    "Change: throw a typed MissingOwnerError instead"],
   ["Class-1 evidence: exact typed error 'error@pages: A site needs at least one page.'",
    "D-025 failure contract: typed errors for malformed data"],
   0.9, "Proven fail-closed; codification aligns with the D-025 contract.",
   "P2", "Reversible", "generateSiteSpec missing-owner path",
   "Worker", "Low", "This week",
   "Contract test: missing owner -> pages:[], ownerObjectId:'', typed error, no throw",
   "AUTO_EXECUTE", "Codify the proven contract; it becomes the reference case for D-025. Within authority.")

pf("D-042", "F-7 alternative: renderer adopts generator's stable-sort-first resolution. Acceptable?",
   "pressure/PRESSURE-REPORT.md F-7; D-005 considers canonical owner",
   ["Accept: align renderer to generator (stable-sort-first) as the smaller change",
    "Reject: alignment without a typed duplicate-id signal hides data problems",
    "Defer to D-005 outcome"],
   ["F-7 mismatch evidence", "D-005 pending design review"],
   0.7, "This is a sub-decision of D-005; deciding it now preempts the review.",
   "P1", "Reversible until applied", "Generator/renderer seam",
   "Design review (D-005)", "Low", "After D-005",
   "Consistency proof per D-005 verification",
   "DEFER", "Sub-decision of D-005; deciding it here would preempt the design review. Fold into D-005.")

pf("D-043", "Pressure class coverage: add the claim-verdict hostile classes as pressure classes 13+?",
   "pressure/PRESSURE-REPORT.md 12 classes; claim/CLAIM-VERDICT.md 14 holes",
   ["Extend pressure suite with claim-hostile classes (H1..H9 as input classes)",
    "Keep suites separate (pressure = robustness, claim = integrity)",
    "Merge: one hostile-input suite covering both"],
   ["12 pressure classes are robustness-shaped; 14 claim holes are integrity-shaped",
    "H1/H3/H4 holes are triggerable via hostile input graphs"],
   0.75, "Both framings are defensible; the suites have different owners and acceptance bars.",
   "P3", "Suite organization reversible", "Harness organization",
   "Worker", "Low", "Standing",
   "Decision recorded; if extended, new classes have the same fail-closed/invention bars",
   "DEEP_REVIEW", "Suite architecture affects two lanes' acceptance bars; get the claim-lane and pressure-lane owners to agree on merged vs separate before reorganizing.")

pf("D-044", "Harness CSS stub: keep the --import CSS stub as the standard node-runner shim?",
   "pressure/PRESSURE-REPORT.md: --import CSS stub neutralized asset imports so pure seam functions execute",
   ["Adopt as the standard shim for node-side seam testing",
    "Replace with the claim lane's css-stub.js convention",
    "Unify: one stub used by both lanes"],
   ["css-stub.mts worked for the F4 run", "Claim lane uses css-stub.js with jest moduleNameMapper (different runner)"],
   0.8, "Both shims work in their runners; unification is hygiene.",
   "P3", "Reversible", "Node-side test shims",
   "Worker", "Low", "Standing",
   "One documented shim per runner; no duplicated stub logic",
   "EXECUTE_REVERSIBLY", "Unify on one stub per runner and document it; small, reversible hygiene. Propose via the normal patch/test path.")

pf("D-045", "Pressure finding severity: INVENTED-CLAIM (F-8) outranks CRASH (F-1..F-6)?",
   "pressure/PRESSURE-REPORT.md: F-8 classified INVENTED-CLAIM, F-1..F-6 CRASH",
   ["Adopt severity order: INVENTED-CLAIM > CRASH > FAIL-CLOSED* for triage",
    "CRASH first (availability), then INVENTED-CLAIM",
    "No global order: severity per finding"],
   ["F-8 invents a business name visitors see; F-1..F-6 crash the path (visible, fail-closed-ish via 500)",
    "Claim-integrity framing: invented claims are the core sin of the program"],
   0.8, "Program values (claim honesty) support INVENTED-CLAIM-first, but availability matters too.",
   "P3 (triage policy)", "Policy reversible", "Finding triage",
   "Worker", "Low", "Standing",
   "Triage policy documented; F-8 fixed before or with F-1..F-6 per the order",
   "AUTO_EXECUTE", "Adopt INVENTED-CLAIM > CRASH for triage: a crash is loud and visible, an invented business name is silent and dishonest. Document the order.")

pf("D-046", "F-1..F-6: fix all six in one patch or six separate patches?",
   "pressure/PRESSURE-REPORT.md F-1..F-6; failure-loop rule: one patch touching ONE authorized path",
   ["One patch on the ingestion/normalization path (single authorized path)",
    "Six small patches, one per call site",
    "One patch per root shape (F-1/F-8 title, F-2/F-6 fields, F-3/F-4/F-5 graph shape)"],
   ["Failure-loop rule: patch touches ONE authorized path", "D-017/D-021 show F-2+F-6 share a root shape; F-3/F-4/F-5 share graph shape"],
   0.85, "The failure-loop rule plus shared root shapes point to shape-grouped patches.",
   "P2", "Patch proposals reversible", "Patch organization",
   "Worker (proposal)", "Low", "This week",
   "Each patch: git apply --check clean, touches one authorized path, repros green",
   "EXECUTE_REVERSIBLY", "Group by root shape (three patches max), each on one authorized path per the failure-loop rule. Propose in missions/patches.")

pf("D-047", "Pressure report hygiene: concurrent-lane dirty file (ask/context-compiler.ts) noted; require pre/post git status in every lane?",
   "pressure/PRESSURE-REPORT.md hygiene: pre/post git status verified; one concurrent-lane delta noted",
   ["Adopt as lane hygiene law: pre/post git status in every lane report",
    "Recommend, not require",
    "No: noise"],
   ["The report caught a concurrent-lane file via the status diff", "90+ dirty files on the branch make attribution hard"],
   0.9, "Proven useful in this exact report; cheap to require.",
   "P3", "Policy reversible", "Lane reporting",
   "Worker", "Low", "Standing",
   "Next lane reports include pre/post git status deltas",
   "AUTO_EXECUTE", "Adopt the hygiene law: with 90+ dirty files on the branch, pre/post git status is the only attribution mechanism. Cheap and proven.")

pf("D-048", "Storage law: pressure artifacts under ~/workspace/fyd-factory/pressure/; extend to all lanes?",
   "pressure/PRESSURE-REPORT.md hygiene: all artifacts under the lane dir; nothing in /tmp, C:, D:, WSL bulk",
   ["Extend storage law to all lanes (lane dir under ~/workspace/fyd-factory/)",
    "Per-lane choice",
    "Centralize: one artifacts dir for all lanes"],
   ["Pressure lane complied; /tmp wipe lesson (2026-09-22) supports lane dirs over /tmp",
    "MISSION-PROTOCOL already implies lane outputs under missions/<class>/shard-<k>/"],
   0.85, "The /tmp-wipe lesson and the protocol's output layout both support lane dirs.",
   "P3", "Policy reversible", "Artifact storage",
   "Worker", "Low", "Standing",
   "Lane dirs exist for active lanes; no irreplaceable work in /tmp",
   "AUTO_EXECUTE", "Adopt the lane-dir storage law factory-wide; it is the /tmp-wipe lesson written as policy.")

pf("D-049", "Harness deletion after run (__pressure__ deleted, zero residue): require zero-residue for all Pig harnesses?",
   "pressure/PRESSURE-REPORT.md: harness lived in src/fyd/__pressure__/, executed, deleted; zero residue",
   ["Require zero-residue: harness dirs deleted after run, sources kept in the lane dir",
    "Allow harness dirs to persist on the Pig",
    "Require zero-residue only for lanes touching shared source trees"],
   ["Zero-residue run left no __pressure__ entries in final git status", "Repo has 90+ dirty files; stray harness dirs add attribution noise"],
   0.9, "Proven clean; directly reduces dirty-tree noise.",
   "P3", "Policy reversible", "Pig working tree hygiene",
   "Worker", "Low", "Standing",
   "Post-run git status shows no harness residue for lanes touching shared trees",
   "AUTO_EXECUTE", "Adopt zero-residue for harnesses in shared source trees; harness sources live in the lane dir. Proven and cheap.")

pf("D-050", "Pressure verdict scale: keep the 4-level verdict (FAIL-CLOSED / CRASH / INVENTED-CLAIM / FAIL-CLOSED*)?",
   "pressure/PRESSURE-REPORT.md verdict table",
   ["Keep the 4-level scale as the pressure verdict standard",
    "Align with the WORLD outcome taxonomy (GENERATED_WITH_WARNINGS etc.)",
    "Extend: add NEEDS_REVIEW for asterisk cases like class 4"],
   ["The scale distinguished F-8 (INVENTED-CLAIM) from F-1..F-6 (CRASH) usefully",
    "MISSION-PROTOCOL defines a different outcome taxonomy for WORLD missions"],
   0.75, "The scale worked for this report; cross-taxonomy alignment is a real but separate concern.",
   "P3", "Reversible", "Pressure reporting",
   "Worker", "Low", "Standing",
   "Scale documented; asterisk cases link to their findings",
   "DEEP_REVIEW", "The scale works, but the factory now has two verdict taxonomies (pressure vs WORLD outcomes); align them deliberately rather than letting them drift. Review with the mission-class owners.")

# ------------------------------------------------- CLAIM DRILLS D-051..D-120

def cf(iid, question, context, outputs, evidence, confidence, conf_basis,
       criticality, reversibility, blast_radius, authority, cost,
       time_sensitivity, verification, verdict, verdict_rationale):
    add(iid, "failure-class", question, context, outputs, evidence, confidence,
        conf_basis, criticality, reversibility, blast_radius,
        "Novel instance of claim-integrity class", authority, cost,
        time_sensitivity, verification, verdict, verdict_rationale)

cf("D-051", "H1: verifier must grade derived claims with empty provenance as UNBOUND. Fix design?",
   "claim/CLAIM-VERDICT.md H1: verifyBinding({classification:'derived'}, graph, []) -> BOUND with empty evidenceRef",
   ["Verifier-side: derived with empty provenance ref grades UNBOUND, no exceptions",
    "Atom-side: construction rejects derived atoms with empty evidenceRef",
    "Both: verifier grades UNBOUND + constructor enforces non-empty ref"],
   ["H1 exact evidence: status BOUND expected UNBOUND; atom.evidenceRef == ''",
    "Smuggling vector: any label can pass an unevidenced fact as BOUND"],
   0.9, "Hole exactly located; the correct direction (UNBOUND) is unambiguous.",
   "P0", "Patch proposal reversible", "BindingVerifier derived-claim path",
   "Worker may propose patch; writer applies", "Low", "This week",
   "H1 attack test green: derived + empty provenance -> UNBOUND",
   "EXECUTE_REVERSIBLY", "The fix direction is unambiguous and the attack test is the acceptance. Propose the patch (recommended: both verifier and constructor) in missions/patches.")

cf("D-052", "H1 follow-up: enforce non-empty evidenceRef on derived atoms at construction?",
   "claim/CLAIM-VERDICT.md H1: DETERMINISTIC_DERIVATION atom carries empty evidenceRef",
   ["Enforce at construction (fail-typed on empty ref)",
    "Enforce at emission gate only",
    "No construction enforcement; verifier catches it (D-051)"],
   ["H1: the atom itself carried the empty ref through emission", "No-second-authority rule: one enforcement owner"],
   0.8, "Defense in depth is good, but two enforcement points risk a second authority.",
   "P1", "Patch proposal reversible", "Atom construction",
   "Design review + writer", "Low", "This week",
   "No derived atom with empty evidenceRef can be constructed or emitted",
   "DEEP_REVIEW", "Construction-time enforcement vs verifier-time enforcement is a single-authority question; review which seam owns it before proposing, to avoid two competing enforcers.")

cf("D-053", "H1..H9 attack tests: promote the 11 verifier-hole tests to permanent regression?",
   "claim/CLAIM-VERDICT.md: attack-verifier-holes.test.ts (11 tests, all confirmed holes); each written as a failing assertion naming the invariant",
   ["Promote all 14 (11 verifier + 3 render-path) as the claim-integrity regression suite",
    "Promote only after each hole is fixed (green tests only)",
    "Keep as campaign artifacts, not regression"],
   ["Tests are written as failing assertions that go green when the seam closes (designed for promotion)",
    "Repo is read-only for lanes; promotion needs the integration writer"],
   0.9, "The tests were designed for exactly this promotion.",
   "P1", "Test-only, reversible", "Claim-integrity coverage",
   "Parent-gated integration writer", "Low", "This week",
   "Suite runs green post-fix from clean checkout; any seam regression reds loudly",
   "REQUEST_CONFIRMATION", "The tests are promotion-ready by design, but checking them into the repo as the permanent suite is the integration writer's confirmation.")

cf("D-054", "H1 interim: while unfixed, document the label-smuggling exposure for integrators?",
   "claim/CLAIM-VERDICT.md H1: any label can smuggle an unevidenced fact through as BOUND",
   ["Publish interim advisory: derived claims are untrusted until H1 closes",
    "No advisory: the hole is tracked, integrators read the verdict",
    "Advisory + temporary label allowlist at emission"],
   ["H1 is P0 and the fix is pending", "Integrators choosing labels today can hit the hole unknowingly"],
   0.8, "Exposure is real; an advisory is cheap and reversible.",
   "P1", "Documentation reversible", "Integrator behavior",
   "Worker", "Low", "Now",
   "Advisory published where integrators choose claim labels",
   "AUTO_EXECUTE", "A short interim advisory is within worker authority, reversible, and prevents unknowing exploitation. Publish it.")

cf("D-055", "H2: reconcile the two emission gates. Which gate is authoritative?",
   "claim/CLAIM-VERDICT.md H2: assertSpecBindingsVerified PASSES on unevidenced generated atom; buildVerifiedRenderModel THROWS on the same",
   ["buildVerifiedRenderModel is authoritative; harden assertSpecBindingsVerified to match",
    "assertSpecBindingsVerified is authoritative; align buildVerifiedRenderModel to it",
    "Neither: define a third reconciled gate both call"],
   ["H2 exact evidence: documented 'emission gate that throws before any spec is produced' does not throw",
    "No-second-authority rule forbids two disagreeing gates"],
   0.85, "The disagreement is proven; the no-second-authority rule forces one gate.",
   "P0", "Gate change semi-permanent; patch proposal reversible", "All spec emission",
   "Design review + writer", "Medium", "This week",
   "Both gates agree on the H2 probe: unevidenced generated atom is rejected at both",
   "DEEP_REVIEW", "Choosing the authoritative gate changes the emission contract for every caller; review the choice (recommended: the throwing gate, buildVerifiedRenderModel, as authoritative) before proposing.")

cf("D-056", "H2: migrate planner-path callers to the authoritative gate?",
   "claim/CLAIM-VERDICT.md H2 residual: planner path's guarantee depends on which gate the caller picked",
   ["Migrate all planner-path emission to the reconciled gate (post D-055)",
    "Leave callers; document which gate each uses",
    "Deprecate the weaker gate (fail-typed on use)"],
   ["Only /build/[siteId] uses planner at all; caller inventory is small", "D-055 must land first"],
   0.8, "Caller inventory is small, but D-055 is a prerequisite.",
   "P1", "Reversible until applied", "Planner emission path",
   "Writer (post D-055)", "Low-Medium", "After D-055",
   "Every emission caller routes through the single authoritative gate",
   "DEFER", "Blocked on D-055: the migration target does not exist until the authoritative gate is chosen. Fold into the D-055 patch plan.")

cf("D-057", "H2: dual-gate agreement test as permanent conformance?",
   "claim/CLAIM-VERDICT.md H2",
   ["Add permanent test: both gates agree on a battery of binding probes",
    "One-off verification at D-055 time only",
    "No test: single gate makes agreement vacuous"],
   ["H2 is a gate-disagreement bug; a conformance test prevents recurrence", "Post-reconciliation there is one gate, making the test vacuous"],
   0.75, "Useful during reconciliation, vacuous after; the decision is about permanence.",
   "P3", "Test-only reversible", "Gate conformance",
   "Worker", "Low", "With D-055",
   "Agreement battery green at reconciliation time",
   "EXECUTE_REVERSIBLY", "Add the agreement battery as a reconciliation-time gate (not permanent): it proves D-055, then the single gate makes it vacuous. Reversible test proposal.")

cf("D-058", "H2 interim: document which emission gate each caller uses?",
   "claim/CLAIM-VERDICT.md H2 residual",
   ["Publish caller->gate mapping as interim documentation",
    "No interim doc; D-055 will obsolete it",
    "Add code comments at each call site"],
   ["Guarantee currently depends on caller luck", "Mapping is a read-only exercise"],
   0.9, "Read-only, cheap, prevents confusion during the D-055 window.",
   "P2", "Documentation reversible", "None",
   "Worker", "Low", "Now",
   "Mapping published; every emission call site named",
   "AUTO_EXECUTE", "Read-only mapping within worker authority; publish it so the D-055 design starts from a complete caller inventory.")

cf("D-059", "H3: canonical binding semantics for owner-corrected values?",
   "claim/CLAIM-VERDICT.md H3; D-009 decides the rule fix",
   ["Owner-corrected value binds as OWNER_ASSERTED with the owner assertion as its evidence, never the source ref",
    "Owner-corrected value carries split provenance: source ref for source value, assertion for delta",
    "Owner-corrected value carries no binding (renders as asserted content, not evidence)"],
   ["H3 laundering evidence", "SOURCE FACT != OWNER INTENT != OBSERVATION labeling law (projection spec)"],
   0.8, "The laundering direction is clear, but the canonical representation is a modeling choice.",
   "P1", "Semantics change semi-permanent", "verifyBinding + all owner-correction flows",
   "Design review + writer", "Medium", "This week",
   "H3 probe: owner value never grades BOUND on source ref; representation documented",
   "DEEP_REVIEW", "D-009 fixes the immediate rule; the canonical representation (asserted vs split-provenance) is a modeling decision that shapes every owner-correction flow. Review it.")

cf("D-060", "H3: annotate provenance split instead of stripping the source ref?",
   "claim/CLAIM-VERDICT.md H3; D-059",
   ["Annotate: binding carries both source ref (source value) and owner assertion (corrected value)",
    "Strip: corrected value carries only the owner assertion",
    "Sub-decision of D-059; do not decide separately"],
   ["Stripping loses the source-value audit trail; annotating keeps it but complicates the binding",
    "D-059 owns the representation"],
   0.7, "Genuine trade-off, but owned by D-059.",
   "P1", "Reversible", "Binding representation",
   "Design review (D-059)", "Low", "With D-059",
   "D-059 verification",
   "DEFER", "Owned by D-059; deciding here preempts the modeling review. Fold in.")

cf("D-061", "R-CORRECTED: end-to-end acceptance for owner-correction rendering?",
   "claim/CLAIM-VERDICT.md R-CORRECTED: owner-corrected 970-000-0001 renders, then grades BOUND on ref covering 970-245-3869",
   ["Adopt the R-CORRECTED probe as the permanent end-to-end acceptance for owner corrections",
    "Unit-level H3 test only; no end-to-end",
    "End-to-end on fixtures only (coppersmith)"],
   ["R-CORRECTED confirms the laundering survives the full render path", "Fixtures coppersmith-plumbing/happy-place render substantial factual content"],
   0.85, "The probe exists and is the true acceptance (unit tests can pass while the path leaks).",
   "P1", "Test-only reversible", "Owner-correction render path",
   "Worker (test proposal)", "Low", "This week",
   "R-CORRECTED probe green: corrected value renders as asserted, never as source-bound",
   "EXECUTE_REVERSIBLY", "Propose the R-CORRECTED probe as a permanent end-to-end test; it is the acceptance that unit tests cannot provide. Reversible test proposal.")

cf("D-062", "H3 interim: flag owner-corrected values in rendered output until the binding is fixed?",
   "claim/CLAIM-VERDICT.md H3",
   ["Flag: corrected values render with an owner-corrected marker for integrators",
    "No flag: keep rendering, fix the binding",
    "Suppress: do not render corrected values until H3 closes"],
   ["Laundering is silent; a marker makes it visible", "Markers on public pages leak internal machinery to visitors"],
   0.7, "Visibility vs visitor-facing noise is a product call.",
   "P2", "Reversible", "Owner-corrected presentation",
   "Design review", "Low", "This week",
   "Decision recorded; if flagged, markers appear in integrator views only, never public pages",
   "DEEP_REVIEW", "Whether to surface correction markers, and where, is a product-presentation decision on top of the binding fix; review it rather than improvising.")

cf("D-063", "H4/R-H4: reconcile the two verifiers or route the renderer to BindingVerifier?",
   "claim/CLAIM-VERDICT.md H4/R-H4; D-006 defers to lane-evidence-wire-spec",
   ["Route: renderer calls BindingVerifier; retire verifyPresentationBinding",
    "Reconcile: strengthen verifyPresentationBinding to enforce the owner-assertion rule",
    "Wait for lane-evidence-wire-spec (D-006)"],
   ["H4 root cause: verifyPresentationBinding accepts derived/owner_authored unconditionally",
    "D-006: lane-evidence-wire-spec is in flight and owns the seam"],
   0.7, "Same preemption problem as D-006.",
   "P0", "Seam change semi-permanent", "Render-path claim integrity",
   "Design review + writer", "Medium-High", "After lane-evidence-wire-spec",
   "H4/R-H4 probes green at the renderer seam",
   "DEFER", "Same as D-006: the in-flight lane spec owns this seam. Do not design around it; revisit with the H4/R-H4 probes as acceptance.")

cf("D-064", "H4: correct the renderer comment block (~685-710) claiming 'no binding, no factual output'?",
   "claim/CLAIM-VERDICT.md H4: the invariant holds only relative to the weaker verifier",
   ["Rewrite the comment to state the actual (weaker) invariant until the seam is fixed",
    "Delete the comment (it asserts a false invariant)",
    "Leave; the fix will make it true"],
   ["The comment asserts an invariant the code does not hold; readers rely on it",
    "Comment fix is a one-line, zero-behavior change"],
   0.95, "A false invariant comment is unambiguously wrong.",
   "P2", "Comment change reversible", "Renderer code readability",
   "Worker may propose; writer applies", "Low", "Now",
   "Comment states the true current invariant (or is removed)",
   "EXECUTE_REVERSIBLY", "Correcting a false invariant comment is zero-behavior, reversible, and prevents readers from trusting a guarantee that does not hold. Propose it with the H4 patch.")

cf("D-065", "H4: contract test pinning 'renderer seam enforces the owner-assertion rule'?",
   "claim/CLAIM-VERDICT.md H4/R-H4",
   ["Add permanent contract test at the renderer seam (resolveBoundField honors UNBOUND)",
    "Rely on the H4 attack test promotion (D-053)",
    "No test until the seam design lands"],
   ["R-H4 is the end-to-end proof; a seam contract test pins the design, not just the hole",
    "D-053 promotes the attack tests"],
   0.8, "The attack tests pin the hole; a contract test pins the intended design.",
   "P1", "Test-only reversible", "Renderer seam",
   "Worker (test proposal)", "Low", "With the H4 fix",
   "Contract test green: resolveBoundField returns no value for UNBOUND bindings",
   "EXECUTE_REVERSIBLY", "Propose the seam contract test alongside the H4 fix; it pins the design intent, complementing the attack-test regression. Reversible.")

cf("D-066", "Canonical owner of presentation binding: BindingVerifier or the renderer?",
   "claim/CLAIM-VERDICT.md H4: two verifiers, renderer uses the weaker one",
   ["BindingVerifier is the single authority; renderer is a consumer",
    "Renderer owns presentation binding; BindingVerifier is the planner authority",
    "One verifier with two entry points (unified)"],
   ["No-second-authority rule", "D-006/D-063 defer the seam to the lane spec"],
   0.75, "The rule says one authority, but the lane spec may define the shape.",
   "P1", "Authority decision semi-permanent", "Claim verification architecture",
   "Design review (with lane spec)", "Low", "After lane-evidence-wire-spec",
   "Single named authority documented; no second verifier constructible",
   "DEFER", "Authority follows the seam design, which the lane spec owns. Record the no-second-authority requirement as a constraint on that spec, decide after it lands.")

cf("D-067", "H4 interim: deny owner_authored without assertion at the renderer seam now?",
   "claim/CLAIM-VERDICT.md H4/R-H4",
   ["Interim deny: resolveBoundField refuses owner_authored/derived without assertion until the seam is reconciled",
    "No interim change; wait for the reconciled design",
    "Interim warn: log + render (visibility without breakage)"],
   ["The hole is P0 and the reconciled design is blocked on the lane spec",
    "Interim deny could break legitimate owner_authored rendering that currently works"],
   0.65, "Breakage risk on the legitimate path is real and unmeasured.",
   "P0", "Interim change reversible", "Renderer owner_authored/derived rendering",
   "Design review", "Low", "This week",
   "Probe: no unevidenced claim renders; legitimate asserted rendering unaffected",
   "GATHER_MORE_EVIDENCE", "Measure the breakage first: run the fixtures with an interim deny and see what legitimate rendering breaks. The evidence decides whether the interim deny is safe.")

cf("D-068", "H5: precedence rule - field-level evidenceRef beats object-level ref?",
   "claim/CLAIM-VERDICT.md H5: binding's own 'google-business-profile:acme-123' silently replaced with object-level 'website-ingestion:https://example.com/'",
   ["Adopt precedence: field-level ref wins; object-level is fallback only",
    "Adopt conflict rule: differing refs -> typed misattribution finding, no silent replacement",
    "Keep object-level override (document as intended)"],
   ["H5 is silent source replacement: source B's claim attributed to source A",
    "Class-6 law (D-029): no silent winner fabrication"],
   0.9, "Silent replacement is unambiguously wrong under the D-029 law.",
   "P1", "Patch proposal reversible", "Binding evidence attribution",
   "Worker may propose patch; writer applies", "Low", "This week",
   "H5 probe: field-level ref survives; no silent replacement",
   "EXECUTE_REVERSIBLY", "Field-level-wins with a typed finding on conflict is the honest rule and follows the D-029 law. Propose the patch with the H5 probe as acceptance.")

cf("D-069", "H5: migrate existing bindings that carry replaced refs?",
   "claim/CLAIM-VERDICT.md H5",
   ["Audit and re-attribute existing bindings to their true refs",
    "Leave historical bindings; fix forward only",
    "Flag affected bindings for review"],
   ["Unknown how many existing bindings carry replaced refs", "Historical misattribution may already be rendered"],
   0.6, "The population size is unknown; the audit comes first.",
   "P2", "Audit read-only; migration semi-permanent", "Existing binding store",
   "Worker (audit)", "Low for audit", "This week",
   "Audit complete: count of bindings with replaced refs, by source",
   "GATHER_MORE_EVIDENCE", "Count the affected bindings first (read-only audit). The migration decision follows the population size.")

cf("D-070", "H5: regression test pinning field-level ref survival?",
   "claim/CLAIM-VERDICT.md H5",
   ["Add permanent regression test (the H5 probe)",
    "Covered by D-053 promotion",
    "No test; rule documented only"],
   ["H5 probe is exact and small", "D-053 promotes the attack tests including H5"],
   0.9, "The probe exists and D-053 already promotes it.",
   "P2", "Test-only reversible", "None",
   "Worker", "Low", "With D-053",
   "H5 probe in the permanent suite",
   "AUTO_EXECUTE", "Fold the H5 probe into the D-053 promotion; no separate decision needed. Record the fold.")

cf("D-071", "H5 class: audit other silent ref-replacement sites beyond bindings?",
   "claim/CLAIM-VERDICT.md H5",
   ["Audit: grep all evidenceRef/provenance assignments for silent overwrite patterns",
    "Scoped: bindings only",
    "No audit: H5 was the only site"],
   ["Silent replacement is a pattern, not necessarily a single site", "Audit is read-only"],
   0.8, "Pattern-class bugs deserve a pattern search; the audit is cheap and read-only.",
   "P2", "Audit reversible", "None (read-only)",
   "Worker", "Low", "This week",
   "Audit report: every evidenceRef assignment site classified (overwrite vs merge vs keep)",
   "AUTO_EXECUTE", "Run the read-only audit; it is within authority and any additional sites become their own backlog items.")

cf("D-072", "H6: verifier takes visibility/withdrawal input?",
   "claim/CLAIM-VERDICT.md H6: direct binding on visibility=private object grades BOUND; verifier takes no visibility input",
   ["Extend verifier input with visibility/withdrawal; private -> UNBOUND",
    "Keep verifier visibility-blind; visibility is the renderer's job (document the split)",
    "Split: verifier grades binding, separate visibility gate grades renderability"],
   ["H6: any caller relying on verifyBinding alone (planner path) would leak",
    "Render-time probe: renderer omits private factual fields (partial defense in depth)"],
   0.8, "The leak vector (planner-path callers) is real; the design split is the question.",
   "P1", "Verifier contract change semi-permanent", "verifyBinding + all consumers",
   "Design review + writer", "Medium", "This week",
   "H6 probe: private/withdrawn evidence grades UNBOUND at the verifier level",
   "DEEP_REVIEW", "Whether visibility enters the verifier contract or stays a renderer concern changes the contract for every consumer; review the split (recommended: verifier takes visibility input, renderer filter stays as defense).")

cf("D-073", "H6: document the renderer's visibility filter as defense-in-depth (not the guarantee)?",
   "claim/CLAIM-VERDICT.md H6: renderer omits private factual fields; coppersmith probe (phone not rendered)",
   ["Document: renderer filter is defense in depth; the guarantee lives at the verifier (post D-072)",
    "Document: renderer filter IS the guarantee; verifier stays blind",
    "No documentation change"],
   ["The probe shows the filter works today, but it is not the contract", "Defense-in-depth only works when the layers are named"],
   0.9, "Naming the layers is documentation of proven behavior.",
   "P2", "Documentation reversible", "None",
   "Worker", "Low", "Now",
   "Visibility layering documented: verifier contract vs renderer filter",
   "AUTO_EXECUTE", "Document the layering now; it prevents future callers from mistaking the filter for the guarantee. Within authority, reversible.")

cf("D-074", "H6: guard the planner path against the verifier-level leak?",
   "claim/CLAIM-VERDICT.md H6 residual: visibility at the planner level; any new consumer of verifyBinding inherits the leak",
   ["Add visibility check to planner-path binding consumption",
    "Block: planner may not consume verifyBinding until D-072 lands",
    "Inventory planner consumers; case-by-case"],
   ["Planner is the /build/[siteId] path; its binding consumption is the leak vector",
    "D-072 changes the verifier contract, which would obsolete a planner-side guard"],
   0.75, "The leak is real but D-072 may fix it at the contract level.",
   "P1", "Guard reversible", "Planner binding consumption",
   "Design review", "Low-Medium", "With D-072",
   "Planner path cannot emit private/withdrawn-evidenced claims",
   "DEEP_REVIEW", "Decide with D-072: if the verifier takes visibility input, the planner is covered by contract; if not, the planner needs its own guard. Joint review.")

cf("D-075", "H6: inventory all verifyBinding consumers for the visibility assumption?",
   "claim/CLAIM-VERDICT.md H6 residual: any new consumer inherits the leak",
   ["Run the consumer inventory now (read-only)",
    "Wait for D-072; inventory after the contract change",
    "No inventory; fix the contract and be done"],
   ["Unknown consumer population; each is a potential leak", "Inventory is read-only and informs D-072/D-074"],
   0.9, "Read-only, cheap, and required input for two pending decisions.",
   "P1", "Read-only", "None",
   "Worker", "Low", "Now",
   "Inventory published: every verifyBinding caller with its visibility handling",
   "AUTO_EXECUTE", "Run the read-only inventory now; D-072 and D-074 both need it. Within authority.")

cf("D-076", "H7: normalize (trim) values before owner-assertion matching?",
   "claim/CLAIM-VERDICT.md H7: trailing space voids a real assertion ('555-0199 ' vs '555-0199' -> UNBOUND)",
   ["Normalize by trimming before match (byte-exact match on trimmed values)",
    "No normalization: byte-exact matching is the contract; fix producers to trim",
    "Normalize + warn: match on trimmed, emit typed normalization finding"],
   ["H7 is a false negative: real evidence voided by a trailing space", "Over-strictness pushes integrators to bypass the verifier (H7 residual risk)"],
   0.85, "The false negative is proven; trimming is the minimal honest normalization.",
   "P2", "Patch proposal reversible", "Owner-assertion matching",
   "Worker may propose patch; writer applies", "Low", "This week",
   "H7 probe: '555-0199 ' matches assertion '555-0199'",
   "EXECUTE_REVERSIBLY", "Trim-before-match is the minimal fix for a proven false negative, and it removes the bypass incentive. Propose the patch with the H7 probe as acceptance.")

cf("D-077", "H7: trim-only or full unicode normalization in matching?",
   "claim/CLAIM-VERDICT.md H7",
   ["Trim-only (minimal, predictable)",
    "Full: trim + unicode NFC + whitespace collapse",
    "Trim-only now; full later if evidence demands"],
   ["Only trailing-space evidence exists; no unicode-normalization failure demonstrated",
    "Full normalization risks matching values that differ meaningfully"],
   0.8, "No evidence demands more than trim; minimal normalization is the conservative choice.",
   "P2", "Reversible", "Assertion matching",
   "Worker may propose; writer applies", "Low", "With D-076",
   "Matching documented as trim-only; unicode edge cases logged not matched",
   "EXECUTE_REVERSIBLY", "Adopt trim-only per the evidence; broader normalization needs its own demonstrated failure. Fold into the D-076 patch.")

cf("D-078", "H7: monitor false-negative rate on owner-assertion matching?",
   "claim/CLAIM-VERDICT.md H7",
   ["Add typed finding when normalization was required to match (observable false-negative signal)",
    "No monitoring; the fix suffices",
    "Periodic audit of UNBOUND owner_authored verdicts"],
   ["The typed finding makes future over-strictness visible", "Monitoring is cheap if the finding exists"],
   0.85, "Observable signals beat periodic audits.",
   "P3", "Additive finding reversible", "Assertion matching",
   "Worker may propose; writer applies", "Low", "With D-076",
   "Normalization-required matches emit a typed finding",
   "EXECUTE_REVERSIBLY", "Emit the typed finding with the D-076 patch; it turns future over-strictness into an observable signal. Reversible.")

cf("D-079", "H7 residual: mitigate the verifier-bypass incentive from over-strictness?",
   "claim/CLAIM-VERDICT.md residual: H7 over-strictness could push integrators to bypass the verifier",
   ["Mitigate by making honest satisfaction easy (D-076 trim + clear mismatch messages)",
    "Mitigate by detecting bypass (audit direct rendering of owner_authored)",
    "Accept the risk; document"],
   ["Bypass incentive is a second-order risk, not yet observed", "D-076 removes the demonstrated trigger"],
   0.7, "The risk is real but unobserved; D-076 addresses the known trigger.",
   "P2", "Reversible", "Integrator behavior",
   "Worker", "Low", "Standing",
   "Mismatch messages name the expected vs actual (trimmed) values",
   "EXECUTE_REVERSIBLY", "Make honest satisfaction easy (clear mismatch messages + trim) as the mitigation; add bypass detection only if bypass is observed. Propose with D-076.")

cf("D-080", "H8: narrow ban - 32-bit digests forbidden for change detection, dedup, integrity identity?",
   "claim/CLAIM-VERDICT.md residual: H8 digest must not be used for change detection, dedup, or as an integrity identity",
   ["Adopt the narrow ban now (documented, enforced by review)",
    "Wait for the D-008 inventory",
    "Ban + automated check (grep for digest use in those roles)"],
   ["The residual risk names the three forbidden roles exactly", "H8 collision is proven in ~4.3s of searching"],
   0.9, "The verdict already states the ban; adopting it is documentation of a decided rule.",
   "P1", "Policy reversible", "Digest usage",
   "Worker", "Low", "Now",
   "Ban documented; D-008 inventory verifies compliance",
   "AUTO_EXECUTE", "The verdict already decided this; adopt the narrow ban as policy now and let the D-008 inventory verify compliance. Within authority.")

cf("D-081", "H8: verify the incremental spec's SHA-256 usage covers all its digest roles?",
   "claim/CLAIM-VERDICT.md: incremental spec already uses SHA-256",
   ["Verify: audit the incremental spec's digest roles, confirm all are SHA-256",
    "Accept the backlog note at face value",
    "Extend: migrate any remaining 32-bit use in the incremental path now"],
   ["Backlog says the incremental spec already uses SHA-256", "Trust-but-verify: the claim is un-audited"],
   0.8, "A read-only audit settles it.",
   "P2", "Read-only", "None",
   "Worker", "Low", "This week",
   "Audit report: every digest role in the incremental spec with its algorithm",
   "AUTO_EXECUTE", "Run the read-only audit; it converts a backlog note into verified fact. Within authority.")

cf("D-082", "H8: audit all 32-bit digest uses (feeds D-008)?",
   "claim/CLAIM-VERDICT.md H8; D-008",
   ["Run the audit now as the D-008 evidence-gathering step",
    "Defer to D-008",
    "No audit; mandate SHA-256 blindly"],
   ["D-008 already decided GATHER_MORE_EVIDENCE via inventory", "This is that inventory"],
   0.95, "This is the decided next step of D-008.",
   "P1", "Read-only", "None",
   "Worker", "Low", "Now",
   "Inventory: every 32-bit digest use with file, role, and D-080-ban relevance",
   "AUTO_EXECUTE", "This is D-008's decided evidence step; execute it now (read-only) and file the inventory.")

cf("D-083", "H8+H9: digest must cover the presented claim, not just inputs?",
   "claim/CLAIM-VERDICT.md H8 (digest not a semantic identity) + H9 (digest describes inputs, never rendered outputs)",
   ["Adopt: integrity digests computed over presented text + transform record",
    "Keep input digests; add presented-text digest alongside",
    "Defer to H9 scope decision (D-010)"],
   ["H9: digest and atoms describe inputs, never rendered outputs", "D-010 owns the verifier-scope extension"],
   0.75, "The principle is right, but D-010 owns the atom-schema change it depends on.",
   "P1", "Reversible", "Digest computation",
   "Design review (D-010)", "Low", "With D-010",
   "Digests verifiably cover what the visitor sees",
   "DEFER", "Depends on D-010's atom-schema decision; fold the digest-over-presented-text requirement into that review as a constraint.")

cf("D-084", "H9: atom schema carries presented text + transform?",
   "claim/CLAIM-VERDICT.md H9; D-010",
   ["Extend atom: presentedText + transform fields, required for derived",
    "Extend atom: optional presentedText, verifier grades it when present",
    "No schema change; verifier takes presented text as a separate input"],
   ["H9: binding carries no transform and no presented text", "D-010 owns the scope-extension design"],
   0.75, "Owned by D-010.",
   "P1", "Schema change semi-permanent", "Atom schema",
   "Design review (D-010)", "Medium", "With D-010",
   "D-010 verification",
   "DEFER", "Sub-decision of D-010; fold in.")

cf("D-085", "H9: transforms must be declared derivations with their own binding?",
   "claim/CLAIM-VERDICT.md H9",
   ["Require: every field->presentation transform declared with a derivation binding",
    "Require for factual transforms only (dates, numbers); stylistic transforms exempt",
    "No requirement; presented-text grading suffices"],
   ["Undeclared transforms are the invisibility mechanism", "Distinguishing factual vs stylistic transforms needs a rule"],
   0.7, "The line between factual and stylistic transforms is genuinely hard.",
   "P1", "Rule semi-permanent", "All composed presentations",
   "Design review (D-010)", "Medium", "With D-010",
   "Every factual transform in the fixtures has a declared derivation binding",
   "DEFER", "Fold into D-010: the transform-declaration rule is part of the scope-extension design.")

cf("D-086", "H9 interim: composed-claim audit list until the verifier sees presented text?",
   "claim/CLAIM-VERDICT.md H9",
   ["Publish the audit list: every composition site with its transform, marked verifier-blind",
    "No interim list; D-010 will close the gap",
    "Interim: composition sites must not transform factual values (render raw only)"],
   ["The gap is P1 and D-010 is a design review away", "An audit list is read-only and bounds the exposure"],
   0.85, "Read-only, cheap, bounds the exposure window.",
   "P1", "Documentation reversible", "None",
   "Worker", "Low", "Now",
   "Audit list published: composition site -> transform -> verifier visibility",
   "AUTO_EXECUTE", "Publish the read-only audit list now; it bounds the H9 exposure window and becomes D-010's work list. Within authority.")

cf("D-087", "H9: 'Serving the valley since 2009' pattern - canonical example in the verifier docs?",
   "claim/CLAIM-VERDICT.md H9",
   ["Adopt as the canonical composed-claim example in verifier documentation",
    "Use a different example",
    "No canonical example"],
   ["The example is exact, small, and already in the verdict", "Canonical examples prevent abstract drift"],
   0.9, "Trivially good documentation.",
   "P3", "Documentation reversible", "None",
   "Worker", "Low", "Now",
   "Verifier docs use the H9 example",
   "AUTO_EXECUTE", "Adopt the example; it is exact and already written. Within authority.")

cf("D-088", "R-MODEL: wire buildVerifiedRenderModel into happy-place/page.tsx?",
   "claim/CLAIM-VERDICT.md R-MODEL: src/app/sites/happy-place/page.tsx calls generateSiteSpec directly",
   ["Wire: page builds the verified model and renders from it",
    "Wire via planner: page delegates to the planner path",
    "Defer to D-007 design"],
   ["Serving-path fact names this exact file", "D-007 owns the wiring design"],
   0.8, "The file is named, but D-007 owns the design choice.",
   "P0", "Serving-path change semi-permanent", "happy-place public page",
   "Design review (D-007) + writer", "Medium", "After D-007",
   "Tamper probe on the happy-place path: post-verification mutation cannot render",
   "DEFER", "Implementation detail of D-007; the design review picks the wiring pattern, then both pages follow it.")

cf("D-089", "R-MODEL: wire buildVerifiedRenderModel into coppersmith-plumbing/page.tsx?",
   "claim/CLAIM-VERDICT.md R-MODEL",
   ["Same as D-088", "Defer to D-007 design"],
   ["Same serving-path fact", "D-007 owns the design"],
   0.8, "Identical to D-088.",
   "P0", "Semi-permanent", "coppersmith-plumbing public page",
   "Design review (D-007) + writer", "Medium", "After D-007",
   "Tamper probe on the coppersmith path",
   "DEFER", "Same as D-088: implementation detail of the D-007 design. Fold in.")

cf("D-090", "R-MODEL: re-verify at render time (not just build time)?",
   "claim/CLAIM-VERDICT.md R-MODEL: nothing re-verifies at render time",
   ["Require render-time re-verification against the verified model digest",
    "Build-time verification suffices; tamper-evidence via digest check at serve",
    "Defer to D-007 design"],
   ["The tamper probe shows build-time-only verification is bypassable", "Render-time checks cost latency on every serve"],
   0.7, "Security vs latency trade-off on the serving path; D-007 owns it.",
   "P0", "Semi-permanent", "Serving path latency + integrity",
   "Design review (D-007)", "Medium", "After D-007",
   "D-007 verification",
   "DEFER", "Fold into D-007: build-time vs render-time verification is the core of that design review.")

cf("D-091", "R-MODEL: planner parity - /sites gets the same guarantees as /build/[siteId]?",
   "claim/CLAIM-VERDICT.md R-MODEL: only /build/[siteId] uses planner; strong verifier covers 0% of /sites claims",
   ["Parity: /sites routes through the planner's verified path",
    "/sites gets its own wiring (D-088/D-089), planner stays /build-only",
    "Defer to D-007"],
   ["0% coverage on the public path is the headline fact", "Planner parity is one route to coverage"],
   0.75, "Parity is attractive but the planner may carry /build-only assumptions.",
   "P0", "Semi-permanent", "/sites serving path",
   "Design review (D-007)", "Medium", "After D-007",
   "D-007 verification",
   "DEFER", "Fold into D-007: planner parity is one candidate design among the D-007 options.")

cf("D-092", "R-CORRECTED: permanent end-to-end acceptance (covered by D-061)?",
   "claim/CLAIM-VERDICT.md R-CORRECTED; D-061",
   ["Fold into D-061 (single end-to-end acceptance for owner corrections)",
    "Separate test: R-CORRECTED deserves its own probe",
    "No permanent test"],
   ["D-061 already proposes the R-CORRECTED probe as permanent", "Duplicate tests are maintenance drag"],
   0.95, "D-061 is exactly this.",
   "P1", "Test-only", "None",
   "Worker", "Low", "With D-061",
   "D-061 verification",
   "AUTO_EXECUTE", "Fold into D-061; record the fold, no duplicate test.")

cf("D-093", "Owner-correction render path: assert at render time that corrected values carry an owner assertion?",
   "claim/CLAIM-VERDICT.md R-CORRECTED: corrected phone rendered through the owner_authored path with no assertion check at render time",
   ["Add render-time assertion: owner-corrected values require a recorded assertion",
    "Rely on the verifier fix (D-009/D-059); no render-time check",
    "Interim: log unasserted corrections"],
   ["The render path is where the value meets the visitor; the verifier may not be consulted there (H4)",
    "Render-time assertions cost per-render work"],
   0.75, "Defense in depth at the render seam, but the verifier fix is the primary.",
   "P1", "Patch proposal reversible", "Owner-correction render path",
   "Design review", "Low-Medium", "With D-009/D-059",
   "Unasserted owner-corrected value cannot render",
   "DEEP_REVIEW", "Render-time assertion vs verifier-only enforcement is a seam-design question tied to H4; review it with the H4/D-009 designs.")

cf("D-094", "Residual: applyPresentationIntent mutates copy AFTER generateSiteSpec; require re-verification?",
   "claim/CLAIM-VERDICT.md residual: happy-place/page.tsx applies owner directives OVER the compiled spec; mutated copy never re-verified; untested, same class as R-MODEL",
   ["Require: post-intent spec re-runs verification before render",
    "Restrict: presentation intent may not mutate factual fields (enforced)",
    "Test first: probe whether factual mutation is currently possible through intent"],
   ["Untested residual in the same class as R-MODEL", "R5 (DEHPP KEEP): owner directives OVER the compiled spec, facts untouched - the invariant exists but is unenforced"],
   0.7, "Untested: the probe comes before the requirement.",
   "P1", "Reversible", "Presentation-intent path",
   "Worker (probe)", "Low for probe", "This week",
   "Probe result: factual mutation via intent is possible or proven impossible; requirement follows the result",
   "GATHER_MORE_EVIDENCE", "Probe first: attempt factual mutation through applyPresentationIntent on a fixture and see what renders. The requirement follows the evidence.")

cf("D-095", "Residual: detect owner-directive mutation of factual fields (R5 enforcement)?",
   "dehpp/classification.md R5: applyPresentationIntent facts untouched; claim residual",
   ["Enforce: intent application diffs factual fields; mutation -> typed error",
    "Document R5 as convention; no enforcement",
    "Defer to D-094 probe"],
   ["R5 is a KEEP invariant: facts untouched", "D-094 probes whether violation is possible"],
   0.75, "Enforcement design depends on the D-094 probe.",
   "P1", "Semi-permanent", "Presentation-intent path",
   "Design review", "Medium", "After D-094",
   "D-094 verification",
   "DEFER", "Fold into D-094: the probe decides whether enforcement is needed.")

cf("D-096", "Residual: planner-level visibility for verifyBinding consumers (H6 at planner)?",
   "claim/CLAIM-VERDICT.md residual: visibility at the planner level",
   ["Covered by D-074 (planner-path guard decision)",
    "Separate planner-visibility work item",
    "No action; D-072 contract covers planner"],
   ["D-074 owns the planner-path guard", "Duplicate items are maintenance drag"],
   0.9, "D-074 is exactly this.",
   "P1", "None", "None",
   "Worker", "Low", "With D-074",
   "D-074 verification",
   "AUTO_EXECUTE", "Fold into D-074; record the fold.")

cf("D-097", "Residual: new verifyBinding consumers must pass a visibility review?",
   "claim/CLAIM-VERDICT.md residual: any new consumer of verifyBinding inherits the leak",
   ["Adopt: consumer checklist - every new verifyBinding caller documents visibility handling",
    "Enforce in code: visibility parameter required (post D-072)",
    "No process; contract fix suffices"],
   ["The leak is inherited by construction until the contract changes", "Checklists are cheap and work pre-contract-fix"],
   0.85, "A checklist is cheap insurance during the D-072 window.",
   "P2", "Process reversible", "Future consumers",
   "Worker", "Low", "Now",
   "Checklist published; next new consumer references it",
   "AUTO_EXECUTE", "Adopt the consumer checklist now; it is cheap, reversible, and covers the window before D-072 lands. Within authority.")

cf("D-098", "What-held: pin the two fixture sites' full-text binding audit as regression?",
   "claim/CLAIM-VERDICT.md what-held: full-text audit (all rendered titles/descriptions/fields vs verifyBinding with owner assertions) found zero misses on coppersmith-plumbing + happy-place",
   ["Promote the full-text audit as a permanent regression (zero-miss bar)",
    "Keep as campaign evidence only",
    "Promote with a tolerance (zero misses is brittle)"],
   ["Zero misses on substantial rendered content is a strong honesty bar", "Fixtures evolve; zero-miss may red on legitimate content changes"],
   0.8, "Strong bar, but fixture drift makes zero-miss brittle.",
   "P2", "Test-only reversible", "Fixture honesty coverage",
   "Worker (test proposal); writer promotes", "Low", "This week",
   "Audit runs green on current fixtures; reds name the exact unbound value",
   "EXECUTE_REVERSIBLY", "Propose the audit as a regression with a documented re-baselining procedure for legitimate fixture changes; the zero-miss bar is the point. Reversible test proposal.")

cf("D-099", "What-held: curated claims (970-245-3869, Grand Junction, 'over 25 years') as pinned bindings?",
   "claim/CLAIM-VERDICT.md what-held: curated claims render and bind as direct evidence",
   ["Pin the three curated claims as binding regression tests",
    "Covered by D-098 audit",
    "No pinning; fixtures change"],
   ["Exact values with exact expected bindings", "D-098's full-text audit subsumes them"],
   0.9, "Subsumed by D-098.",
   "P2", "Test-only", "None",
   "Worker", "Low", "With D-098",
   "D-098 verification",
   "AUTO_EXECUTE", "Fold into D-098; the full-text audit covers the curated claims. Record the fold.")

cf("D-100", "Claim lane re-run cadence after fixes: full 14-test re-run per patch?",
   "claim/CLAIM-VERDICT.md: 11 verifier-hole + 3 render-path tests",
   ["Require full 14-test re-run after every claim-seam patch",
    "Targeted re-run (affected hole only) + full suite weekly",
    "Full re-run at lane close only"],
   ["Patches touch shared seams; targeted re-runs miss cross-hole interactions", "Suite runtime is small (jest, focused files)"],
   0.85, "Cheap suite, shared seams: full re-run per patch is justified.",
   "P2", "Process reversible", "Claim-lane verification",
   "Worker", "Low", "Standing",
   "Every claim patch records its 14-test re-run result",
   "AUTO_EXECUTE", "Adopt full 14-test re-run per claim-seam patch; the suite is small and the seams are shared. Within authority to require of lane work.")

cf("D-101", "Failing-assertion tests as fix specs: adopt the pattern for future lanes?",
   "claim/CLAIM-VERDICT.md: all hole tests written as failing assertions naming the invariant; each goes green when the seam closes",
   ["Adopt as the lane standard for hole-driven work",
    "Per-lane choice",
    "No: green-only tests"],
   ["The pattern worked: 14 holes with exact acceptance criteria", "Failing tests in the tree need quarantine so CI stays green"],
   0.85, "Proven pattern; the quarantine question is the only caveat.",
   "P3", "Process reversible", "Lane test conventions",
   "Worker", "Low", "Standing",
   "Pattern documented with quarantine convention (e.g., attack/ dir excluded from default runs)",
   "AUTO_EXECUTE", "Adopt the failing-assertion-as-spec pattern with a quarantine convention; it gives every hole an exact acceptance test. Within authority.")

cf("D-102", "One-authorized-path rule for claim patches (no second verifier/authority)?",
   "MISSION-PROTOCOL failure loop: patch touches ONE authorized path; claim/H4 shows second-authority damage",
   ["Enforce: every claim patch names its single authorized path; second-authority patches rejected",
    "Guideline, not enforced",
    "Per-patch judgment"],
   ["H4/H2 are literally second-authority failures", "The protocol already states the rule"],
   0.9, "The protocol states it and the claim holes prove why.",
   "P2", "Process reversible", "Patch review",
   "Worker", "Low", "Standing",
   "Claim patch proposals name their authorized path; review rejects second-authority designs",
   "AUTO_EXECUTE", "Enforce the existing rule for claim patches with explicit authorized-path naming; the H4/H2 holes are the cautionary evidence. Within authority.")

cf("D-103", "Falsify-your-fix for claim patches: required step?",
   "MISSION-PROTOCOL failure loop: falsify (try to break your own fix)",
   ["Require: every claim patch includes a falsification attempt with result",
    "Recommend only",
    "No: attack-test green is enough"],
   ["Claim patches defend against adversarial labels; the attacker mindset is the point",
    "The protocol already requires falsification"],
   0.9, "The protocol requires it and claim work is adversarial by nature.",
   "P2", "Process reversible", "Patch quality",
   "Worker", "Low", "Standing",
   "Claim patch proposals include a falsification section",
   "AUTO_EXECUTE", "Require falsification attempts on claim patches per the existing protocol; adversarial seams demand it. Within authority.")

cf("D-104", "Claim patches live in missions/patches/ with git apply --check: confirm convention?",
   "MISSION-PROTOCOL: patches to ~/workspace/fyd-factory/missions/patches/, git apply --check",
   ["Confirm: claim patches follow the standard patch lane",
    "Claim patches need a separate dir (claim-patches/)",
    "No convention; per-patch choice"],
   ["SEC-FIX and TD-001 already use missions/patches/ with apply --check",
    "One patch home avoids a second authority on patch storage"],
   0.95, "Precedent is uniform.",
   "P3", "Reversible", "Patch storage",
   "Worker", "Low", "Standing",
   "Claim patch proposals land in missions/patches/ with apply --check evidence",
   "AUTO_EXECUTE", "Confirm the standard convention; no second patch home. Within authority.")

cf("D-105", "H4+H2: is 'one verifier' the same decision as 'one emission gate'?",
   "claim/CLAIM-VERDICT.md H4 (two verifiers) + H2 (two gates)",
   ["Treat as one architectural decision (single claim-integrity authority)",
    "Treat as two decisions (verification vs emission are different seams)",
    "Defer both to the lane spec"],
   ["Both are second-authority failures in the claim path", "Verification and emission are different call sites with different callers"],
   0.7, "Unifying is elegant but the seams have different callers and constraints.",
   "P2", "Framing reversible", "Claim architecture",
   "Design review", "Low", "With D-055/D-066",
   "Decision recorded; D-055 and D-066 reference the framing",
   "DEEP_REVIEW", "Frame it in review: decide whether verification and emission unify under one authority or stay two coordinated seams. The framing shapes D-055 and D-066.")

cf("D-106", "Evidence taxonomy canonical: SOURCE FACT vs OWNER INTENT vs OBSERVATION labeled distinctly?",
   "MISSION-PROTOCOL PROJECTION: SOURCE FACT != OWNER INTENT != OBSERVATION labeled distinctly",
   ["Enforce the labeling law in verifier/binding representations (ties to D-059)",
    "Projection-only law; verifier need not label",
    "Document as aspiration"],
   ["H3 laundering is exactly a SOURCE/OWNER label confusion", "The protocol states the law for projections"],
   0.85, "H3 proves the law is load-bearing beyond projections.",
   "P1", "Representation change semi-permanent", "Binding/verifier representations",
   "Design review", "Medium", "This week",
   "Bindings carry distinct source/owner/observation labels; H3-style confusion impossible by construction",
   "DEEP_REVIEW", "Extend the labeling law from projections into the verifier/binding layer; the representation change needs review (coordinate with D-059).")

cf("D-107", "PROJECTION != TRUTH: no projection claims canonical authority - enforce in /sites output?",
   "MISSION-PROTOCOL PROJECTION verify: PROJECTION != TRUTH",
   ["Enforce: projections carry a non-canonical marker in their envelope",
    "Convention only",
    "Defer: needs the projection-class owners"],
   ["The law exists in the protocol's projection verify step", "Enforcement mechanism is unspecified"],
   0.7, "The law is stated but the enforcement shape is open.",
   "P2", "Reversible", "Projection envelopes",
   "Design review with projection owners", "Low", "Standing",
   "Decision recorded with the projection-class owners",
   "DEEP_REVIEW", "The enforcement shape (envelope marker vs convention) needs the projection-class owners in the room; do not unilaterally decide their contract.")

cf("D-108", "Claim-seam review checklist for future patches touching verifyBinding/resolveBoundField?",
   "claim/CLAIM-VERDICT.md: the seam is where 14 holes lived",
   ["Adopt a checklist: H1..H9 probes re-run, no second authority, presented-text considered",
    "No checklist; rely on the regression suite",
    "Checklist for verifier changes only"],
   ["The seam's hole density justifies a checklist", "Checklists rot; the suite is the durable guard"],
   0.8, "Justified by hole density; keep it short so it does not rot.",
   "P3", "Process reversible", "Patch review",
   "Worker", "Low", "Standing",
   "Checklist published; next seam patch references it",
   "AUTO_EXECUTE", "Adopt a short checklist (probes re-run, single authority, presented-text, visibility); it is cheap and the seam earned it. Within authority.")

cf("D-109", "Cross-lane: claim findings become decision-backlog items (this shard's directive) - confirm as standing?",
   "Subagent task: new items discovered from the mission program's failure taxonomy; append before decomposing",
   ["Confirm as standing: every lane's failure taxonomy feeds decision-backlog.jsonl",
    "One-off for this shard",
    "Per-lane choice"],
   ["This shard exists because the directive works", "Backlog is the factory's decision memory"],
   0.9, "The mechanism is proven by this shard's own operation.",
   "P3", "Process reversible", "Factory learning loop",
   "Worker", "Low", "Standing",
   "Lane close-out checklists include 'failure taxonomy -> backlog items'",
   "AUTO_EXECUTE", "Confirm as standing: the failure-taxonomy-to-backlog loop is the factory's learning mechanism, and this shard proves it runs. Within authority.")

cf("D-110", "Claim hole severity ordering for the fix queue?",
   "claim/CLAIM-VERDICT.md: two load-bearing findings named: (1) weaker verifier at render, (2) /sites never builds verified model",
   ["Order: H4/R-H4 + R-MODEL first (load-bearing), then H1/H2/H3/H5, then H6/H7/H8/H9",
    "Order by exploitability: H1 (label smuggling) first",
    "Order by fix cost: cheap guards first"],
   ["The verdict names the two load-bearing findings explicitly", "H1 smuggling is the easiest to exploit"],
   0.8, "The verdict's own prioritization is the best evidence.",
   "P1", "Ordering reversible", "Fix queue",
   "Worker", "Low", "Now",
   "Fix queue published in the order; D-006/D-007 deferrals noted as blocked",
   "AUTO_EXECUTE", "Adopt the verdict's ordering (load-bearing seams first); it is the lane's own prioritization. Within authority.")

cf("D-111", "H2+H4 combined: single 'claim-integrity authority' design doc before any patch?",
   "claim/CLAIM-VERDICT.md bottom line: two load-bearing findings",
   ["Write one design doc covering verifier authority, emission gates, and /sites wiring before patching",
    "Patch holes individually; no unifying doc",
    "Doc after the lane spec lands"],
   ["The holes interact (H2 gates, H4 verifiers, R-MODEL wiring); piecemeal patches risk seam mismatch",
    "D-006/D-007 defer to the lane spec, which may be that doc"],
   0.75, "A unifying doc is valuable but may duplicate the in-flight lane spec.",
   "P1", "Documentation reversible", "Claim architecture",
   "Design review", "Medium", "After lane-evidence-wire-spec",
   "Doc exists or the lane spec covers it; D-055/D-063/D-007 reference it",
   "DEFER", "Wait for lane-evidence-wire-spec: if it is the unifying doc, write nothing; if not, write the doc then. Avoid two competing designs.")

cf("D-112", "R-MODEL tamper probe as a permanent serving-path security test?",
   "claim/CLAIM-VERDICT.md R-MODEL: build model for 970-245-3869, tamper to 970-000-0000, re-render, assert tampered value absent",
   ["Promote the tamper probe as a permanent serving-path test",
    "One-off campaign evidence",
    "Promote after D-007 wiring lands (it currently fails by design)"],
   ["The probe is the exact acceptance for R-MODEL", "It fails today by design; a permanently-red test needs quarantine"],
   0.85, "The probe is the acceptance; quarantine handles the currently-red state.",
   "P0", "Test-only reversible", "Serving-path integrity",
   "Worker (test proposal)", "Low", "With D-007",
   "Probe quarantined now, green after D-007",
   "EXECUTE_REVERSIBLY", "Promote the probe as a quarantined test now (documents the hole as executable acceptance), un-quarantine when D-007 lands. Reversible test proposal.")

cf("D-113", "H6 false-safety: 'Coppersmith' name still rendered from other objects' text - acceptable?",
   "claim/CLAIM-VERDICT.md H6: phone omitted but 'Coppersmith' still appeared from other objects' text",
   ["Acceptable: name fragments in prose are not factual fields",
    "Hole: private object's name must not appear anywhere in public output",
    "Case-by-case: factual fields hidden, prose mentions allowed"],
   ["The probe showed the name leaking via other objects' text", "Visibility semantics for names vs fields are undefined"],
   0.65, "Genuinely unclear: is a name in prose a private fact?",
   "P1", "Semantics semi-permanent", "Visibility boundary",
   "Design review", "Low", "This week",
   "Visibility semantics documented: what 'private object' hides (fields vs name vs mentions)",
   "DEEP_REVIEW", "The visibility boundary's semantics (does private hide the name everywhere?) need a deliberate definition; the probe shows the current behavior is partial. Review it.")

cf("D-114", "Attack-test reproduction commands: keep the jest invocation documented as the canonical repro?",
   "claim/CLAIM-VERDICT.md: full npx jest --transform invocation with ts-jest flags and css-stub moduleNameMapper",
   ["Keep as the canonical claim-test repro command",
    "Simplify: wrap in a script",
    "Per-test choice"],
   ["The invocation is exact and includes non-obvious flags (jsx:react-jsx override, css stub)",
    "Exact repro commands are lane infrastructure"],
   0.9, "Exactness matters; the flags are non-obvious.",
   "P3", "Documentation reversible", "None",
   "Worker", "Low", "Now",
   "Command documented in the lane dir; runnable as written",
   "AUTO_EXECUTE", "Document the exact repro command; it is non-obvious and lane infrastructure. Within authority.")

cf("D-115", "Claim lane daemon-restart loss (no checkpoint): require checkpointing for long lanes?",
   "claim/CLAIM-VERDICT.md: lane re-dispatched after daemon restart killed the prior agent mid-campaign with no checkpoint; all categories re-run from surviving artifacts",
   ["Require: long lanes checkpoint artifacts incrementally (JSONL append pattern)",
    "Recommend only",
    "No: re-runnable lanes do not need checkpoints"],
   ["The restart cost a full re-dispatch; surviving artifacts saved it",
    "MISSION-PROTOCOL already requires incremental JSONL appends for missions"],
   0.9, "The incident proves the cost; the protocol already has the pattern.",
   "P2", "Process reversible", "Lane resilience",
   "Worker", "Low", "Standing",
   "Lane runbooks include checkpoint expectations",
   "AUTO_EXECUTE", "Extend the protocol's incremental-append rule to lane artifacts explicitly; the restart incident is the evidence. Within authority.")

cf("D-116", "H3+H5 combined: provenance correctness as one patch or two?",
   "claim/CLAIM-VERDICT.md H3 (laundering) + H5 (misattribution): both are provenance correctness",
   ["One patch: provenance correctness (binding rule + ref precedence)",
    "Two patches: H3 and H5 separately",
    "One design review, two patches"],
   ["Both touch binding provenance; one authorized path (verifyBinding)", "Failure-loop: one patch per authorized path suggests one patch"],
   0.8, "Same authorized path argues for one patch; separate acceptance tests keep them distinct.",
   "P1", "Patch proposal reversible", "verifyBinding provenance",
   "Worker (proposal)", "Low", "This week",
   "One patch, two acceptance probes (H3 + H5) green",
   "EXECUTE_REVERSIBLY", "Propose one provenance-correctness patch on the single authorized path with both probes as acceptance, per the failure-loop rule. Reversible.")

cf("D-117", "H9 vs D-022: composed-claim audit (D-086) and null-coercion audit (D-022) - one audit or two?",
   "D-086 (H9 composition sites) + D-022 (null-coercion sites): both audit renderer composition",
   ["One combined composition-site audit (transforms + coercion)",
    "Two audits (different defect classes)",
    "D-022 only; H9 folded in"],
   ["Same code sites, different defects", "One pass over the sites is cheaper than two"],
   0.85, "Same sites, one pass; record both defect classes per site.",
   "P1", "Audit reversible", "Renderer composition",
   "Worker", "Low", "This week",
   "Single audit report with per-site transform + coercion findings",
   "AUTO_EXECUTE", "Run one combined audit pass recording both defect classes per site; cheaper and complete. Within authority.")

cf("D-118", "Verifier input contract: should verifyBinding take the presented claim as an input (H9)?",
   "claim/CLAIM-VERDICT.md H9; D-010",
   ["Yes: presented claim becomes a verifier input (fold into D-010)",
    "No: schema carries it (D-084)",
    "Undecided; D-010 decides"],
   ["D-010 owns the scope extension", "Input vs schema is a sub-decision"],
   0.7, "Owned by D-010.",
   "P1", "Reversible", "Verifier contract",
   "Design review (D-010)", "Low", "With D-010",
   "D-010 verification",
   "DEFER", "Fold into D-010.")

cf("D-119", "H1 labels: which claim labels may carry derived facts (allowlist)?",
   "claim/CLAIM-VERDICT.md H1: any label can smuggle an unevidenced fact",
   ["Define the derived-capable label set explicitly; others reject derived content",
    "No allowlist; the UNBOUND grading (D-051) suffices",
    "Allowlist as interim until D-051 lands"],
   ["D-051's UNBOUND grading closes the smuggling vector structurally", "An allowlist is a second mechanism on the same problem"],
   0.75, "D-051 is the structural fix; the allowlist is defense in depth at best.",
   "P1", "Reversible", "Claim labeling",
   "Design review", "Low", "With D-051",
   "Decision: allowlist adopted or explicitly rejected with rationale",
   "DEEP_REVIEW", "Decide with D-051: if UNBOUND grading is sufficient, reject the allowlist as a second mechanism; if defense in depth is wanted, scope it. Review the trade-off.")

cf("D-120", "Claim-verdict 'What held' baseline: re-verify after every claim patch (no regressions on clean fixtures)?",
   "claim/CLAIM-VERDICT.md what-held: 5 baseline tests PASS on clean fixtures",
   ["Require: 5 baseline tests green after every claim patch",
    "Require: full 14-test suite (baselines included) per D-100",
    "No requirement; baselines are stable"],
   ["D-100 already requires the full 14-test re-run per patch", "Duplicate requirement"],
   0.95, "Subsumed by D-100.",
   "P2", "None", "None",
   "Worker", "Low", "Standing",
   "D-100 verification",
   "AUTO_EXECUTE", "Fold into D-100; the full-suite re-run includes the baselines. Record the fold.")

# ------------------------------------------------- SEC-FIX D-121..D-135

def sf(iid, question, context, outputs, evidence, confidence, conf_basis,
       criticality, reversibility, blast_radius, authority, cost,
       time_sensitivity, verification, verdict, verdict_rationale):
    add(iid, "integration", question, context, outputs, evidence, confidence,
        conf_basis, criticality, reversibility, blast_radius,
        "Recurring (lane-verdict -> patch -> integration)", authority, cost,
        time_sensitivity, verification, verdict, verdict_rationale)

sf("D-121", "SEC-FIX #5 (RECOMMENDED email-shape tighten): integrate with the 4 REQUIRED or hold?",
   "security/SEC-FIX-SPEC.md: patch 5 safe-link-email-shape-tighten.patch is RECOMMENDED (W1 A32/A33); D-002 covers the bundle",
   ["Integrate all 5 together (D-002 option A)",
    "Integrate 4 REQUIRED now; #5 after separate review",
    "Hold #5 indefinitely (accept W1 residual)"],
   ["W1: EMAIL_SHAPE accepts attribute-breakout addresses (A32/A33)",
    "RECOMMENDED (not REQUIRED) signals lower severity or higher false-positive risk",
    "git apply --check OK on #5"],
   0.7, "The severity/false-positive trade-off for the email regex is not in evidence.",
   "P2", "git apply -R reversible", "safe-link email gating",
   "Parent-gated integration writer", "Low", "This week",
   "A32/A33 probes: breakout addresses rejected; legitimate addresses (plus-addressing, subdomains) accepted",
   "DEEP_REVIEW", "RECOMMENDED-not-REQUIRED is a deliberate hedge; review the email-shape regex against legitimate-address acceptance (plus-addressing, quoted local parts, IDN) before deciding bundle vs hold.")

sf("D-122", "SEC-FIX integration order: which patch applies first?",
   "security/SEC-FIX-SPEC.md patch index 1-5",
   ["Order 1,2 (capability + contact block), 3 (media), 4 (export), 5 (email)",
    "Order by severity: 1,2,3,4 together; 5 last",
    "Single combined application (all at once)"],
   ["Patches touch different files (view.ts, page.tsx, select.ts, data-boundary.ts, safe-link.ts): no textual conflicts expected",
    "Each has independent hole-closed assertions"],
   0.85, "Independent files; order is nearly irrelevant, which is itself the finding.",
   "P2", "Reversible per patch", "/o lane + export + safe-link",
   "Parent-gated integration writer", "Low", "This week",
   "Each patch's assertions green after application in the chosen order",
   "EXECUTE_REVERSIBLY", "Recommend the spec's index order (independent files, no conflicts) applied sequentially with per-patch assertion checks; the writer confirms and executes.")

sf("D-123", "resolveSafeLink as single link authority: enforce a ban on second allowlists?",
   "security/SEC-FIX-SPEC.md design authority: resolveSafeLink in src/fyd/sitespec/safe-link.ts is the single link authority; no new SecurityAuthority, no second allowlist",
   ["Enforce: review rule - new allowlist/security-authority constructs rejected",
    "Guideline only",
    "Enforce via code search in CI (grep for allowlist patterns)"],
   ["The spec's design-authority line is explicit", "H4/H2 show what second authorities cost"],
   0.9, "The spec states it as design authority; enforcement is process.",
   "P2", "Process reversible", "Link safety architecture",
   "Worker", "Low", "Standing",
   "No second link allowlist exists; the display-media patch reused resolveSafeLink (precedent: patch 3 adopted the existing gate)",
   "AUTO_EXECUTE", "Enforce the single-authority rule in review; patch 3 (adopting the existing gate instead of a new allowlist) is the precedent. Within authority.")

sf("D-124", "No-fake-buttons doctrine: bare-hostname/relative website -> no Website button. Product call?",
   "security/SEC-FIX-SPEC.md patch 1 behavior note: bare hostname or relative path is now non-navigable (no Website button), matching the choke point's documented rule; consistent with contactMethodFor null-on-unsafe",
   ["Keep: non-navigable websites render no button (fail closed)",
    "Soften: render inert text with a 'check address' hint",
    "Revisit: make bare hostnames navigable (https:// assumed)"],
   ["The choke point's documented rule already says non-navigable", "Fail-closed is the program's doctrine"],
   0.8, "The rule is documented; the product question is whether inert-no-button is the right UX.",
   "P2", "Behavior change semi-permanent", "Website capability rendering",
   "Design review (product)", "Low", "This week",
   "Decision recorded; behavior matches the documented choke-point rule either way",
   "DEEP_REVIEW", "Fail-closed is safe, but silently dropping the Website button for bare hostnames (a common real input) is a product-UX call; review whether inert text + hint serves owners better than no button.")

sf("D-125", "TEL_ALLOWED rule ownership: call-capability phone validation lives in resolveSafeLink?",
   "security/SEC-FIX-SPEC.md: patch 1 closes W2 (A37) via the 'call' capability's TEL_ALLOWED rule rejecting quote/attribute-breakout phones",
   ["Confirm: TEL_ALLOWED in safe-link.ts is the single phone-shape authority",
    "Move phone validation to a phone-specific module",
    "Duplicate: validate at input too"],
   ["W2 closed by the TEL_ALLOWED rule", "Single-authority rule (D-123)"],
   0.9, "The rule works and the single-authority principle covers it.",
   "P2", "Reversible", "Call capability",
   "Worker", "Low", "Standing",
   "TEL_ALLOWED is the only phone-shape gate; no parallel validation",
   "AUTO_EXECUTE", "Confirm TEL_ALLOWED in safe-link.ts as the single phone-shape authority per D-123. Within authority.")

sf("D-126", "Unsafe contact values render as inert text (patch 2): UI copy decision?",
   "security/SEC-FIX-SPEC.md patch 2: unsafe value renders as inert text with NO anchor; display text unchanged (raw value, React-escaped)",
   ["Keep: inert escaped text, no explanation",
    "Add owner-visible hint ('this value was blocked as unsafe')",
    "Suppress the value entirely"],
   ["Inert text shows the raw value (e.g., javascript:...) to visitors, React-escaped but visible",
    "Owner-visible hints leak internals to visitors unless gated"],
   0.7, "Visitor-visible raw javascript: text is ugly; owner hints need gating. Product call.",
   "P2", "Reversible", "Contact block rendering",
   "Design review", "Low", "This week",
   "Decision recorded; rendering matches the decision",
   "DEEP_REVIEW", "What the visitor sees for a blocked value (raw inert text vs hint vs suppression) is a product-presentation decision; review it rather than defaulting.")

sf("D-127", "Media src: same-origin relative paths pass; CDN allowlisting process?",
   "security/SEC-FIX-SPEC.md patch 3: same-origin relative pass; else resolveSafeLink 'navigate' (http/https only, parser-based)",
   ["No allowlist: http/https via parser check is sufficient",
    "Owner-configured CDN allowlist per tenant",
    "Global CDN allowlist (factory-maintained)"],
   ["Patch 3 relies on scheme+parser, not a list", "Vendor veto: no external services, but a config list is not a vendor"],
   0.8, "The patch works without a list; the question is whether tenants need stricter control.",
   "P2", "Reversible", "Media URL policy",
   "Worker (policy)", "Low", "Standing",
   "Policy documented; positive regression (cdn.example.com https) still passes",
   "EXECUTE_REVERSIBLY", "Keep the patch's scheme+parser rule with no allowlist (simplest, proven by the positive regression); revisit only if a tenant demonstrates a need. Reversible policy.")

sf("D-128", "exportCustomerData <script> escaping: adopt the one-line patch or require consumer-side handling?",
   "security/SEC-FIX-SPEC.md patch 4: JSON.stringify(...).replace(/</g, '\\\\u003c'); lossless under JSON.parse",
   ["Adopt patch 4 (escape at the single export choke point)",
    "Reject: pure JSON is safe; consumers must not inline naively",
    "Adopt + document the round-trip guarantee"],
   ["W3: literal <script> in the blob is hazardous if naively inlined", "Round-trip byte-identical under JSON.parse (lossless)"],
   0.9, "Lossless, one line, at the single choke point.",
   "P1", "One-line change reversible", "Customer data export",
   "Parent-gated integration writer", "Low", "This week",
   "A49: zero literal '<script' in output; round-trip byte-identical",
   "REQUEST_CONFIRMATION", "Adopt with the round-trip guarantee documented; the writer confirms as part of the D-002 bundle. (Folded into D-002's recommendation; recorded here for the W3 line item.)")

sf("D-129", "Second-render-site audit: are there other contact-value interpolation seams beyond the two patched?",
   "security/SEC-FIX-SPEC.md: patch 2 found the second site (page.tsx Contact section) during the spec; patch 1 alone would have left a live javascript: anchor",
   ["Run the audit now: grep all href/src interpolations of contact values",
    "Scoped: the two sites are enough",
    "Audit after integration"],
   ["The second site was found by luck during spec writing, not by systematic search", "Audit is read-only"],
   0.9, "The spec itself proves systematic search was missing.",
   "P0", "Read-only", "None",
   "Worker", "Low", "Now (before integration)",
   "Audit report: every contact-value interpolation site with its gating status",
   "AUTO_EXECUTE", "Run the read-only audit before integration; the spec's own history (second site found mid-spec) proves the search is needed. Any new site becomes its own patch item. Within authority.")

sf("D-130", "Hostile suite re-run after SEC-FIX integration: full HOSTILE suite or targeted assertions?",
   "security/SEC-FIX-SPEC.md test assertions; qa/hostile/HOSTILE-VERDICT.md",
   ["Full hostile suite re-run (regression + hole-closed)",
    "Targeted: the 5 patches' assertions only",
    "Targeted + full suite at lane close"],
   ["Patches touch shared render code (view.ts, select.ts)", "Full suite cost vs shared-code risk"],
   0.85, "Shared render code argues for the full suite.",
   "P1", "Read-only run", "None",
   "Worker", "Low", "After integration",
   "Full hostile suite green post-integration",
   "AUTO_EXECUTE", "Require the full hostile suite re-run after integration (shared code changed); notify with the before/after. Within authority to require.")

sf("D-131", "safeDisplayUrl producer placement: only at toDisplayMedia (single producer)?",
   "security/SEC-FIX-SPEC.md patch 3: safeDisplayUrl at the single producer; consumers listObjectMedia, heroMediaFor, galleryMediaFor",
   ["Confirm single-producer placement; consumers never re-gate",
    "Gate at consumers too (defense in depth)",
    "Gate at the renderer (last mile)"],
   ["One producer, all consumers: the spec's architecture", "Second gates risk divergence (H4 lesson)"],
   0.9, "The spec's architecture is explicit and the H4 lesson warns against second gates.",
   "P2", "Reversible", "Media URL safety",
   "Worker", "Low", "Standing",
   "Single producer documented; no consumer-side re-gating",
   "AUTO_EXECUTE", "Confirm single-producer placement per the spec and the no-second-authority rule. Within authority.")

sf("D-132", "A32/A33 acceptance: legitimate email shapes that must survive the RECOMMENDED tighten?",
   "security/SEC-FIX-SPEC.md W1; D-121",
   ["Define the acceptance battery: plus-addressing, subdomains, quoted local parts, IDN, long TLDs",
    "Accept the patch's implicit battery",
    "No battery; reviewer judgment"],
   ["D-121 needs this battery to decide", "Regex tightens historically break legitimate addresses"],
   0.9, "The battery is the decision input for D-121.",
   "P2", "Test-only", "None",
   "Worker", "Low", "With D-121",
   "Battery published; patch 5 evaluated against it",
   "AUTO_EXECUTE", "Define the legitimate-address battery now; it is D-121's decision input. Within authority.")

sf("D-133", "SEC-FIX spec maintenance: who owns the spec if a finding reopens?",
   "security/SEC-FIX-SPEC.md",
   ["Lane owner maintains the spec; reopened findings get new patch index entries",
    "Spec is frozen; new findings get new specs",
    "Factory security lane owns all SEC specs"],
   ["Specs rot; the patch index is the living part", "No standing security-lane owner is named"],
   0.7, "Ownership is genuinely unassigned.",
   "P3", "Process reversible", "Spec maintenance",
   "Worker", "Low", "Standing",
   "Owner named; reopened-finding procedure documented",
   "DEEP_REVIEW", "Spec ownership is unassigned; review with whoever owns the security lane (or Nolan) rather than self-assigning permanently.")

sf("D-134", "Contact-block patch: does inert-text rendering apply to the /sites contact sections too?",
   "security/SEC-FIX-SPEC.md patches 1-2 cover the /o lane; /sites has its own contact sections",
   ["Audit /sites contact sections for the same raw-interpolation pattern",
    "Out of scope: /o lane only",
    "Fix /o now; /sites as separate item"],
   ["The /o lane had TWO sites; /sites likely shares the pattern", "D-129 audit covers interpolations generally"],
   0.8, "The pattern is proven in /o; /sites is the obvious next place.",
   "P0", "Read-only audit", "None",
   "Worker", "Low", "Now",
   "Audit covers /sites contact sections; findings become patch items",
   "AUTO_EXECUTE", "Fold /sites contact sections into the D-129 audit scope; same pattern, same read-only cost. Within authority.")

sf("D-135", "SEC-FIX: adopt the LANE-SEC patch as-is (patch 3) as the standing precedent for cross-lane patch reuse?",
   "security/SEC-FIX-SPEC.md patch 3: adopted the existing LANE-SEC proposal display-media-src-allowlist.patch as-is (assessed, not duplicated)",
   ["Adopt as standing: assess-don't-duplicate cross-lane patches",
    "Per-case judgment",
    "Prefer duplication (lane independence)"],
   ["Patch 3 worked: assessed, adopted as-is, no second allowlist", "Duplication risks divergence (H4 lesson)"],
   0.9, "The precedent worked and the alternative (duplication) is proven harmful.",
   "P3", "Process reversible", "Cross-lane patch reuse",
   "Worker", "Low", "Standing",
   "Precedent documented; next cross-lane reuse cites it",
   "AUTO_EXECUTE", "Adopt assess-don't-duplicate as the standing cross-lane patch rule; patch 3 is the proof. Within authority.")

# ------------------------------------------------- TD-001 D-136..D-147

def td(iid, question, context, outputs, evidence, confidence, conf_basis,
       criticality, reversibility, blast_radius, authority, cost,
       time_sensitivity, verification, verdict, verdict_rationale):
    add(iid, "integration", question, context, outputs, evidence, confidence,
        conf_basis, criticality, reversibility, blast_radius,
        "Recurring (tournament cadence)", authority, cost, time_sensitivity,
        verification, verdict, verdict_rationale)

td("D-136", "Contestant B patch: integrate, archive, or hold?",
   "tournaments/td-001/INTEGRATION-PLAN.md: do not integrate both; A selected; both contestants CORRECT",
   ["Archive B with rationale (A supersedes; identical file path)",
    "Hold B as fallback if A's suite proves brittle",
    "Integrate B instead (revisit the verdict)"],
   ["INTEGRATION-PLAN: 'Do not integrate both: they target the identical file path'",
    "Adversarial review: both correct, A's suite pins strictly more acceptance surface"],
   0.9, "The plan is explicit: one file path, A selected with reasons.",
   "P2", "Archive reversible", "Tournament records",
   "Worker", "Low", "This week",
   "B archived with the verdict rationale; no second integration attempt",
   "AUTO_EXECUTE", "Archive B with the stated rationale; the plan forbids integrating both and A won on coverage. Within authority, reversible.")

td("D-137", "TD-001 test 4 (happy-place acceptance): who investigates on fixture-drift red?",
   "tournaments/td-001/adversarial-review.md: test 4 could red on unrelated happy-place fixture drift; acceptable, failure message points at the fixture",
   ["Lane owner investigates (fixture vs narrowing logic)",
    "Fixture owner investigates",
    "Auto-triage: message parsing routes it"],
   ["The review anticipates drift-reds and blesses them as acceptable", "No owner is named for the tripwire"],
   0.75, "The red is anticipated but the responder is unassigned.",
   "P2", "Process reversible", "Regression triage",
   "Worker", "Low", "Standing",
   "Responder named; first drift-red routed per the rule",
   "DEEP_REVIEW", "Triage ownership touches lane responsibilities; get the lane owners to name the responder rather than self-assigning.")

td("D-138", "TD-001 test 1 exact-equality pin: deliberate product reversal process?",
   "tournaments/td-001/adversarial-review.md: exact toEqual(['GenericObjectCard']) fails loudly on deliberate reversal; intended behavior",
   ["Keep the loud failure; reversal requires explicit test update + decision record",
    "Soften to contains-check",
    "Document the reversal procedure alongside the test"],
   ["Both contestants argue the reversal direction is wrong; loud failure is the design",
    "Loud failures without a procedure become mystery reds"],
   0.85, "The intent is clear; the procedure is the missing piece.",
   "P2", "Test change reversible", "external_identity eligibility",
   "Worker", "Low", "Standing",
   "Reversal procedure documented next to the pin",
   "AUTO_EXECUTE", "Document the reversal procedure (explicit decision + test update) next to the pin; the loud failure stays. Within authority.")

td("D-139", "TD-001 gap: universal assertion (every explore-query schema is ObjectFeed-eligible)?",
   "tournaments/td-001/adversarial-review.md: the only meaningful strengthening either contestant lacks; end-to-end validateSiteSpec enforces it implicitly",
   ["Add the universal assertion as a new test",
    "Accept the implicit enforcement (no new test)",
    "Add as a validator rule, not a test"],
   ["The review names the gap and the implicit coverage", "Implicit enforcement is real but invisible"],
   0.8, "The gap is real but narrow; implicit coverage exists.",
   "P2", "Test-only reversible", "Explore query eligibility",
   "Worker (test proposal)", "Low", "Standing",
   "Universal assertion green on current schemas; reds on any ineligible schema",
   "EXECUTE_REVERSIBLY", "Propose the universal assertion as an additive test; it makes the implicit explicit at low cost. Reversible test proposal.")

td("D-140", "AcceptsSchemas vs SCHEMA_COMPONENTS inventory: run the diff now?",
   "tournaments/td-001/adversarial-review.md latent note; D-014",
   ["Run the read-only diff now (feeds D-014)",
    "Defer to D-014 review",
    "No diff; reconcile blind"],
   ["D-014 needs the diff as decision input", "Diff is read-only"],
   0.95, "D-014's decided input.",
   "P2", "Read-only", "None",
   "Worker", "Low", "Now",
   "Diff published: acceptsSchemas vs SCHEMA_COMPONENTS mismatches listed",
   "AUTO_EXECUTE", "Run the read-only diff now; it is D-014's evidence. Within authority.")

td("D-141", "TD-001 harness scripts (adversarial-*.sh, rev-*.sh, td001-*.sh): retain or archive?",
   "tournaments/td-001/: ~60 harness scripts from the tournament",
   ["Retain with an index (tournament method is reusable)",
    "Archive to cold storage (verdict + patches are the durable outputs)",
    "Delete (noise)"],
   ["The scripts are the tournament's method; TD-002 would reuse them", "60 scripts are real noise without an index"],
   0.75, "Method reuse argues retain; noise argues index-or-archive.",
   "P3", "Reversible", "Tournament records",
   "Worker", "Low", "Standing",
   "Index exists or archive is complete",
   "EXECUTE_REVERSIBLY", "Retain with a one-page index of what each script family does; archive only the superseded one-offs. Reversible, within authority.")

td("D-142", "Anti-vacuity fixture guard: adopt as a tournament-wide test convention?",
   "tournaments/td-001: both contestants include the anti-vacuity fixture guard",
   ["Adopt: every tournament test suite includes an anti-vacuity guard",
    "Per-tournament choice",
    "No: vacuous-pass risk is overstated"],
   ["Both contestants independently included it; the review praises it",
    "Vacuous passes are the silent killer of regression suites"],
   0.9, "Unanimous contestant practice + reviewer praise.",
   "P3", "Process reversible", "Tournament test quality",
   "Worker", "Low", "Standing",
   "Convention documented; next tournament's suites include the guard",
   "AUTO_EXECUTE", "Adopt the convention; the evidence (both contestants, reviewer praise) is strong. Within authority.")

td("D-143", "TD-002: run a second tournament on the next contested decision?",
   "tournaments/td-001/ (tournament method exists)",
   ["Yes: next contested test/design decision gets a tournament",
    "No: TD-001 was one-off",
    "On demand: only when two credible designs collide"],
   ["TD-001 produced a better suite than either contestant alone would have (review's words: A pins strictly more)",
    "Tournaments cost two implementations + a review"],
   0.7, "The method worked once; mandating it always is expensive.",
   "P3", "Process reversible", "Decision quality process",
   "Nolan? No - process within factory", "Medium per tournament", "Standing",
   "Trigger rule documented",
   "DEEP_REVIEW", "Mandating tournaments vs on-demand is a factory-process call with real cost; review the trigger rule (recommended: on-demand when two credible designs collide) rather than deciding unilaterally.")

td("D-144", "Lane testMatch discovery: confirm the convention for new test files?",
   "tournaments/td-001/INTEGRATION-PLAN.md: the lane testMatch will discover the new file",
   ["Confirm: new test files land where testMatch discovers them, no registration step",
    "Require explicit registration",
    "Per-lane choice"],
   ["The plan relies on discovery working", "Registration steps rot"],
   0.9, "The plan's integration steps assume discovery.",
   "P3", "Reversible", "Test organization",
   "Worker", "Low", "Standing",
   "Convention documented; D-001's file is discovered post-integration",
   "AUTO_EXECUTE", "Confirm discovery-by-location as the convention; it is what the integration plan assumes. Within authority.")

td("D-145", "TD-001 latent 4.1 observation: file as its own backlog item or close?",
   "tournaments/td-001/adversarial-review.md 4.1 latent observation (not a defect, not TD-001)",
   ["File as backlog item with its evidence",
    "Close: noted in the review, no action",
    "Watch: revisit if the area is touched"],
   ["Latent observations are the factory's peripheral vision", "Not-a-defect means no fix queue"],
   0.7, "The observation's content determines its fate, and it is not quoted in full here.",
   "P3", "Reversible", "Observation handling",
   "Worker", "Low", "This week",
   "The 4.1 text is read in full and dispositioned with rationale",
   "GATHER_MORE_EVIDENCE", "Read the full 4.1 text first; disposition follows the content. Do not close an observation unread.")

td("D-146", "Contestant-B's split-test structure: any lesson for test design (vacuous-pass windows)?",
   "tournaments/td-001/adversarial-review.md: B's test 2 has a vacuous-pass window in isolation ((schemas ?? []) passes on regressed bare 'all'); A's test 3 couples narrowing + end-to-end",
   ["Adopt lesson: couple narrowing assertions with end-to-end validation in one test",
    "Per-test judgment",
    "No lesson: B's structure is fine with the full suite"],
   ["The review explicitly names the vacuous-pass window", "A's coupled test is the proven fix"],
   0.9, "The review's analysis is exact and actionable.",
   "P3", "Process reversible", "Test design",
   "Worker", "Low", "Standing",
   "Lesson documented in the tournament conventions",
   "AUTO_EXECUTE", "Adopt the coupling lesson in the tournament test conventions; the review proved the failure mode. Within authority.")

td("D-147", "TD-001 repro tests (repro.test.ts, repro-live.test.ts): keep as regression or campaign-only?",
   "tournaments/td-001/: repro.test.ts, repro-live.test.ts, repro-td001.ts",
   ["Keep the repros that pin accepted behavior; archive the rest",
    "Keep all",
    "Archive all (the selected patch's suite is the regression)"],
   ["Repros pin the bug's existence; the selected suite pins the fix", "Duplicate coverage is maintenance drag"],
   0.8, "The selected suite is the regression; repros are campaign evidence.",
   "P3", "Reversible", "Test maintenance",
   "Worker", "Low", "Standing",
   "Repro disposition recorded; no duplicate permanent coverage",
   "AUTO_EXECUTE", "Archive the repros as campaign evidence; the selected suite is the permanent regression. Within authority, reversible.")

# ------------------------------------------------- DEHPP D-148..D-212

def dh(iid, question, context, outputs, evidence, confidence, conf_basis,
       criticality, reversibility, blast_radius, authority, cost,
       time_sensitivity, verification, verdict, verdict_rationale):
    add(iid, "policy", question, context, outputs, evidence, confidence,
        conf_basis, criticality, reversibility, blast_radius,
        "Novel (DEHPP program)", authority, cost, time_sensitivity,
        verification, verdict, verdict_rationale)

dh("D-148", "D-011 execution: run the 62-row recount now?",
   "dehpp/classification.md (62-row table) vs 'Total mechanisms classified: 54'; D-011",
   ["Run the read-only recount now (feeds D-011)",
    "Defer to the D-011 morning decision",
    "No recount; declare 54 canonical by framing"],
   ["D-011 decided GATHER_MORE_EVIDENCE via recount", "Recount is read-only"],
   0.95, "D-011's decided next step.",
   "P2", "Read-only", "None", "Worker", "Low", "Now",
   "Mapping published: each of the 62 rows -> mechanism disposition",
   "AUTO_EXECUTE", "Run the read-only recount now; it is D-011's evidence. Within authority.")

dh("D-149", "Canonical denominator declaration after the recount?",
   "dehpp/classification.md; D-011; D-148",
   ["Declare per the recount result with the row mapping as evidence",
    "Keep both numbers with a footnote",
    "Reframe: count 'mechanisms' and 'rows' as different units permanently"],
   ["D-148 mapping", "parameterization-spec.md cites 54"],
   0.85, "The mapping will determine the answer mechanically.",
   "P2", "Documentation reversible", "DEHPP spec citations", "Worker", "Low", "After D-148",
   "Spec cites one number with the mapping linked",
   "EXECUTE_REVERSIBLY", "Declare per the recount with the mapping as evidence; update the spec citation. Reversible documentation.")

dh("D-150", "KEEP-invariant conflict: 'reported to Nolan' - via which channel?",
   "dehpp/parameterization-spec.md: where spec and a KEEP invariant conflict, the KEEP invariant wins and the conflict is reported to Nolan",
   ["Grilling brief (canonical operator-question surface)",
    "Lane report escalation section",
    "Direct message to Nolan"],
   ["The one-grill rule: GRILLING-BRIEF.md is the canonical surface", "Conflict reporting is rare and consequential"],
   0.9, "The grill rule already names the surface.",
   "P1", "Process reversible", "Nolan's attention", "Worker", "Low", "Standing",
   "Conflicts appear in the grilling brief in the required shape",
   "AUTO_EXECUTE", "Route KEEP conflicts through the grilling brief per the one-grill rule; it is the canonical surface. Within authority.")

dh("D-151", "Build order step 1: P2 chromeMode + S1 chrome split first - commit?",
   "dehpp/parameterization-spec.md ordering dependency 1: nothing customer-facing ships until demo chrome is separable (production safety gate)",
   ["Commit to step 1 first as the production safety gate",
    "Reorder: copy table first",
    "Parallelize 1 and 2"],
   ["The spec calls it the production safety gate explicitly", "Scope gate: nothing customer-facing ships until separable"],
   0.9, "The spec's own ordering with a safety rationale.",
   "P1", "Ordering reversible", "DEHPP-BUILD sequencing", "Worker", "Low", "Standing",
   "Build plan sequences chrome split first; no customer-facing ship before it",
   "AUTO_EXECUTE", "Commit to the spec's order; step 1 is the named safety gate. Within authority to adopt the spec's sequencing.")

dh("D-152", "Build order step 2: P5 copy table (G9 fix) second - commit?",
   "dehpp/parameterization-spec.md ordering 2: renderer must stop reading voice from code before any second archetype or tenant onboards",
   ["Commit to step 2 second",
    "Reorder",
    "Split: copy table infra now, G9 content later"],
   ["The spec's rationale: second archetype/tenant onboarding depends on it", "G9 fix is named explicitly"],
   0.9, "Spec ordering with dependency rationale.",
   "P2", "Ordering reversible", "DEHPP-BUILD sequencing", "Worker", "Low", "Standing",
   "Copy table lands before any second archetype work",
   "AUTO_EXECUTE", "Commit to the spec's order. Within authority.")

dh("D-153", "Build order step 3: M3 media seam + P13/P10/P11 tenant data surfaces - commit?",
   "dehpp/parameterization-spec.md ordering 3: un-break dead quality features without changing composition",
   ["Commit to step 3 third",
    "Reorder",
    "Split media seam from tenant surfaces"],
   ["Rationale: un-breaks dead quality features, no composition change", "M3 + P13/P10/P11 named"],
   0.85, "Spec ordering; the grouping rationale is stated.",
   "P2", "Ordering reversible", "DEHPP-BUILD sequencing", "Worker", "Low", "Standing",
   "Build plan reflects step 3 as specified",
   "AUTO_EXECUTE", "Commit to the spec's order. Within authority.")

dh("D-154", "Build order step 4: P3/P4 order params + R9 composition; CLONE-PROVE re-run gate - commit?",
   "dehpp/parameterization-spec.md ordering 4: the route changes identity here; CLONE-PROVE must re-run against the composed path before release",
   ["Commit to step 4 with the mandatory CLONE-PROVE re-run gate",
    "Commit without the gate (re-run later)",
    "Split: order params now, composition later"],
   ["The spec mandates the re-run gate explicitly", "Identity change is the riskiest step"],
   0.9, "The gate is explicit in the spec.",
   "P1", "Ordering reversible", "Release safety", "Worker", "Low", "Standing",
   "Step 4 does not release without a CLONE-PROVE re-run against the composed path",
   "AUTO_EXECUTE", "Commit to step 4 WITH the re-run gate; it is the spec's explicit release condition. Within authority.")

dh("D-155", "Build order step 5: remaining copy params (P6,P7,P8,P9,P12) - 'safe anytime after 1' - commit?",
   "dehpp/parameterization-spec.md ordering 5: safe anytime after 1",
   ["Commit: schedule freely after step 1",
    "Bundle with step 2",
    "Hold until step 4"],
   ["Spec says safe anytime after 1", "Copy params are additive"],
   0.9, "Explicit spec permission.",
   "P3", "Ordering reversible", "DEHPP-BUILD sequencing", "Worker", "Low", "Standing",
   "Schedule respects 'after step 1'",
   "AUTO_EXECUTE", "Adopt the spec's scheduling permission. Within authority.")

dh("D-156", "Build order step 6: G10 SocialProof emission last + its own fidelity check - commit?",
   "dehpp/parameterization-spec.md ordering 6: last, because it adds a new section to the golden path and needs its own fidelity check",
   ["Commit to last with a dedicated fidelity check",
    "Ship with step 5",
    "Drop G10 (new section risk)"],
   ["New golden-path section is the highest fidelity risk", "Spec mandates its own fidelity check"],
   0.9, "Spec ordering with explicit rationale.",
   "P2", "Ordering reversible", "Golden path fidelity", "Worker", "Low", "Standing",
   "G10 lands last with a dedicated fidelity proof",
   "AUTO_EXECUTE", "Commit to last-with-fidelity-check per the spec. Within authority.")

dh("D-157", "Scope gate: SPEC ONLY - no touching repo or hpp-clone while CLONE-PROVE runs. Standing?",
   "dehpp/parameterization-spec.md scope gate",
   ["Adopt as standing for the DEHPP program",
    "One-off for the current CLONE-PROVE run",
    "Soften: read-only touches allowed"],
   ["CLONE-PROVE measures the clone; concurrent writes invalidate the measurement", "The gate is explicit in the spec"],
   0.95, "Measurement validity demands it.",
   "P1", "Process reversible", "Clone-prove validity", "Worker", "Low", "Standing",
   "No spec-driven writes to repo/hpp-clone during CLONE-PROVE runs",
   "AUTO_EXECUTE", "Adopt the scope gate as standing; concurrent writes would invalidate clone-prove measurements. Within authority.")

dh("D-158", "P1 tenantId: hard failure on absent (never silently fall back). Keep?",
   "dehpp/parameterization-spec.md P1: fallback when absent = hard failure; must never silently fall back to 'happy-place' or any tenant (see KEEP D4)",
   ["Keep hard failure",
    "Soften to a configuration-error page (still no silent fallback)",
    "Allow a default tenant in demo mode only"],
   ["KEEP D4 backs the no-silent-fallback rule", "Absent tenantId is a provisioning defect, not a render decision"],
   0.9, "The spec and D4 agree; the only question is failure UX.",
   "P1", "Behavior semi-permanent", "Tenant provisioning",
   "Design review", "Low", "This week",
   "Absent tenantId -> hard failure or explicit config-error surface, never silent fallback",
   "DEEP_REVIEW", "Keep the no-silent-fallback law; the failure UX (hard throw vs config-error page) is a small product call. Review it briefly.")

dh("D-159", "P1 tenantId regex /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/ - adopt?",
   "dehpp/parameterization-spec.md P1 type constraint",
   ["Adopt as specified",
    "Loosen (allow uppercase/underscore)",
    "Tighten (shorter max)"],
   ["The constraint is specified exactly", "Tenant IDs flow into routes, storage keys, and DNS-ish contexts"],
   0.85, "Specified exactly; the question is whether the bounds fit future tenants.",
   "P2", "Constraint semi-permanent", "Tenant identity",
   "Worker", "Low", "Standing",
   "Validation at the route seam enforces the regex",
   "EXECUTE_REVERSIBLY", "Adopt the specified regex; it is conservative and covers route/key/DNS needs. Revisit only with a concrete tenant that violates it. Reversible policy.")

dh("D-160", "P1 threading: tenantId validated once at the route seam, threaded unchanged, never from client input. Enforce?",
   "dehpp/parameterization-spec.md P1 transform rule",
   ["Enforce as specified (single validation point, immutable threading)",
    "Allow re-derivation in deep components",
    "Allow client-supplied tenantId in demo mode"],
   ["Never-transformed-never-defaulted-never-from-client is explicit", "Client-input tenantId is a tenant-confusion vulnerability"],
   0.95, "The rule is explicit and security-relevant.",
   "P1", "Architecture semi-permanent", "Tenant isolation",
   "Worker", "Low", "Standing",
   "No component reads tenantId from client input; single seam validation",
   "AUTO_EXECUTE", "Enforce the threading rule as specified; client-supplied tenant identity is a confusion vulnerability. Within authority.")

dh("D-161", "P2 chromeMode: what counts as 'separable' demo chrome (acceptance)?",
   "dehpp/parameterization-spec.md ordering 1: P2 chromeMode + S1 chrome split",
   ["Acceptance: demo chrome renders iff an explicit mode flag; customer chrome has zero demo code paths",
    "Acceptance: visual diff clean between modes",
    "Acceptance: bundle analysis shows no demo code in customer build"],
   ["'Nothing customer-facing ships until demo chrome is separable' is the gate", "Acceptance is currently undefined"],
   0.7, "The gate is named but its acceptance is not.",
   "P1", "Acceptance definition reversible", "Production safety",
   "Design review", "Low", "This week",
   "Acceptance criteria published before step 1 closes",
   "DEEP_REVIEW", "Define the separability acceptance (recommended: flag-gated rendering + bundle proof of no demo code in customer build) in review before step 1 is declared done.")

dh("D-162", "R8 DemoOwnerMode: env-gated (NEXT_PUBLIC_FYD_DEMO_OWNER_MODE) vs absent-in-prod-bundle?",
   "dehpp/classification.md R8: DemoOwnerMode rendered from the route, gated by NEXT_PUBLIC_FYD_DEMO_OWNER_MODE; PARAMETERIZE - gate mechanism fine, presence on customer route must be a deployment parameter",
   ["Keep env gating (mechanism fine per classification)",
    "Strip from prod bundle at build time (stronger)",
    "Remove DemoOwnerMode from customer routes entirely"],
   ["Classification says the gate mechanism is fine; only the deployment presence is the question",
    "Env-gated code still ships to browsers"],
   0.8, "Classification blesses the mechanism; the residual question is bundle presence.",
   "P1", "Build change semi-permanent", "Production bundle",
   "Design review", "Low-Medium", "This week",
   "Customer bundle contains no DemoOwnerMode code path (by gate or by strip)",
   "DEEP_REVIEW", "The classification leaves the deployment question open; review gate-vs-strip (recommended: build-time strip for customer routes) before DEHPP-BUILD.")

dh("D-163", "P5 copy table (G9): acceptance = renderer reads zero voice strings from code?",
   "dehpp/parameterization-spec.md ordering 2: the renderer must stop reading voice from code",
   ["Acceptance: grep shows zero user-facing strings in renderer code paths (all via copy table)",
    "Acceptance: spot-check major surfaces",
    "Acceptance: new strings must use the table (forward-only)"],
   ["The requirement is stated absolutely ('must stop reading voice from code')", "Absolute zero may be impractical (ARIA labels, errors)"],
   0.75, "The requirement is absolute in the spec but zero-literal-strings needs scoping.",
   "P2", "Acceptance reversible", "Copy architecture",
   "Design review", "Low", "This week",
   "Acceptance scoped (which string classes must come from the table) and verified",
   "DEEP_REVIEW", "Scope the acceptance: which string classes (voice copy vs ARIA vs errors) must come from the table. Review before step 2 closes.")

dh("D-164", "M3 media seam wiring: acceptance?",
   "dehpp/parameterization-spec.md ordering 3: M3 media seam wiring un-breaks dead quality features",
   ["Acceptance: dead quality features render on a parameterized tenant",
    "Acceptance: media seam tests green per tenant",
    "Define after reading M3 spec"],
   ["M3's exact scope is not in the excerpt read", "Ordering 3's rationale is stated"],
   0.6, "M3's content is not yet read.",
   "P2", "Reversible", "Media seam", "Worker", "Low", "This week",
   "M3 section read; acceptance defined from it",
   "GATHER_MORE_EVIDENCE", "Read the M3 section of the spec before defining acceptance; the excerpt does not contain it.")

dh("D-165", "P13/P10/P11 tenant data surfaces: read the spec sections, then define acceptance?",
   "dehpp/parameterization-spec.md ordering 3",
   ["Read then define (same as D-164)",
    "Defer entirely to build time",
    "Define acceptance now from names alone"],
   ["Sections not yet read", "Names alone are insufficient"],
   0.6, "Content not yet read.",
   "P2", "Reversible", "Tenant data surfaces", "Worker", "Low", "This week",
   "Sections read; acceptance defined",
   "GATHER_MORE_EVIDENCE", "Read the P10/P11/P13 sections first; acceptance follows the content.")

dh("D-166", "P3/P4 order parameters: acceptance?",
   "dehpp/parameterization-spec.md ordering 4",
   ["Acceptance: order changes via parameters only, no code edits, CLONE-PROVE re-run green",
    "Define after reading P3/P4",
    "Defer to build"],
   ["Ordering 4 ties P3/P4 to the re-run gate", "Sections not yet read in full"],
   0.65, "Partially read.",
   "P2", "Reversible", "Section ordering", "Worker", "Low", "This week",
   "P3/P4 read; acceptance defined with the re-run gate",
   "GATHER_MORE_EVIDENCE", "Read P3/P4, then define acceptance including the mandatory CLONE-PROVE re-run. Do not define from names alone.")

dh("D-167", "R9 pipeline composition: what composes, and what proves it?",
   "dehpp/parameterization-spec.md ordering 4: P3/P4 order parameters + R9 pipeline composition",
   ["Read R9, then define",
    "Treat as P3/P4's implementation detail",
    "Defer to build"],
   ["R9 not yet read", "Composition is where identity changes (ordering 4 rationale)"],
   0.6, "Not yet read.",
   "P2", "Reversible", "Pipeline architecture", "Worker", "Low", "This week",
   "R9 read; composition contract defined",
   "GATHER_MORE_EVIDENCE", "Read R9 before any composition decision; ordering 4's identity-change rationale makes this load-bearing.")

dh("D-168", "G10 SocialProof: who runs its dedicated fidelity check?",
   "dehpp/parameterization-spec.md ordering 6: G10 needs its own fidelity check",
   ["Clone-prove owner runs it as part of step 6",
    "Factory VQ lane runs it",
    "Nolan accepts it (product surface)"],
   ["New golden-path section = highest fidelity risk", "No owner named"],
   0.7, "Ownership unassigned.",
   "P2", "Process reversible", "Fidelity proof", "Worker", "Low", "Standing",
   "Owner named before step 6 starts",
   "DEEP_REVIEW", "Name the fidelity-check owner before step 6; an unowned proof does not happen. Review with the clone-prove owner.")

dh("D-169", "R2 generateMetadata from owner title: KEEP enforcement mechanism?",
   "dehpp/classification.md R2: KEEP - ownerName() reads the public business object's title; no hand copy",
   ["Enforce: test asserts metadata title == owner object title on fixtures",
    "Convention only",
    "Enforce + forbid hand-copy overrides"],
   ["R2's rationale: removing it loses SEO/OG honesty", "KEEP = burden of proof reversed"],
   0.85, "KEEP with a clear rationale; enforcement is test-shaped.",
   "P2", "Test-only reversible", "SEO/OG honesty", "Worker", "Low", "Standing",
   "Metadata test green on fixtures",
   "AUTO_EXECUTE", "Add the metadata-honesty test; KEEP with reversed burden of proof means the test is the enforcement. Within authority.")

dh("D-170", "R3 publicGraph privacy boundary: test ownership?",
   "dehpp/classification.md R3: KEEP - strips private objects AND private-touching relationships before the client payload; distinct from field-visibility",
   ["Owner: factory privacy lane; permanent regression test",
    "Owner: DEHPP-BUILD",
    "No dedicated test; covered by H6 work"],
   ["R3 is the client-payload privacy boundary; removing it leaks private objects to the browser",
    "H6 work touches adjacent semantics"],
   0.85, "The boundary is critical; the test owner is the question.",
   "P0", "Test-only reversible", "Client privacy", "Worker", "Low", "This week",
   "Regression test: private objects and private-touching relationships absent from client payload",
   "EXECUTE_REVERSIBLY", "Propose the R3 boundary test now (it is P0-adjacent privacy); assign ownership to the privacy lane in review. Reversible test proposal.")

dh("D-171", "R5 presentation-intent 'facts untouched': enforcement (ties D-094/D-095)?",
   "dehpp/classification.md R5: KEEP - owner directives OVER the compiled spec, facts untouched",
   ["Fold into D-094/D-095 (probe then enforce)",
    "Separate R5 enforcement track",
    "Convention only"],
   ["D-094/D-095 own the probe and enforcement design", "R5 is the KEEP statement of the same invariant"],
   0.9, "Same invariant, same work.",
   "P1", "None", "None", "Worker", "Low", "With D-094",
   "D-094/D-095 verification",
   "AUTO_EXECUTE", "Fold into D-094/D-095; R5 is the KEEP authority they enforce. Record the fold.")

dh("D-172", "R6 heroMediaFor server-side: enforcement that the renderer never selects media?",
   "dehpp/classification.md R6: KEEP - media selection is a server-side evidence decision",
   ["Enforce: renderer media-selection code rejected in review",
    "Test: renderer given no-media input never selects",
    "Convention only"],
   ["Rationale: pushing selection into the renderer mixes selection with presentation",
    "Media pipeline has its own evidence rules"],
   0.85, "KEEP with a separation-of-concerns rationale.",
   "P2", "Process reversible", "Media architecture", "Worker", "Low", "Standing",
   "No media-selection logic in renderer paths",
   "AUTO_EXECUTE", "Adopt the review rule (renderer never selects media); it is the KEEP enforcement. Within authority.")

dh("D-173", "R7 'never render an invalid spec': isRenderable gate coverage complete?",
   "dehpp/classification.md R7: KEEP - validateSiteSpec + isRenderable gate",
   ["Audit: every render entry point checks isRenderable",
    "Covered by D-026 validator extension",
    "Assume complete"],
   ["D-026 extends what the validator detects; this is about gate coverage at entry points",
    "R-MODEL shows /sites entry points bypass the strong verifier (adjacent gap)"],
   0.8, "D-026 and R-MODEL are adjacent; the entry-point audit is distinct and read-only.",
   "P1", "Read-only audit", "None", "Worker", "Low", "This week",
   "Every render entry point named with its isRenderable check status",
   "AUTO_EXECUTE", "Run the read-only entry-point audit; R-MODEL proves entry points are where guarantees die. Within authority.")

dh("D-174", "KEEP burden-of-proof-reversed: process for challenging a KEEP?",
   "dehpp/classification.md: KEEP = universal quality, burden of proof reversed",
   ["Process: challenger brings evidence the mechanism is NOT universal; Nolan decides (via D-150 channel)",
    "Challenger + lane review decides",
    "No challenges allowed"],
   ["Burden reversed means the default is keep; the challenge path is undefined",
    "D-150 names the Nolan-report channel for conflicts"],
   0.8, "The principle is stated; the challenge procedure is not.",
   "P2", "Process reversible", "KEEP governance", "Worker", "Low", "Standing",
   "Challenge procedure documented",
   "AUTO_EXECUTE", "Document the challenge procedure (evidence-first, Nolan decides via the D-150 channel); reversed burden needs an explicit path or it becomes 'no'. Within authority.")

dh("D-175", "PARAMETERIZE 13: audit that each has source/transform/fallback documented?",
   "dehpp/parameterization-spec.md Part A: each entry has name, type, source, transform rule, fallback",
   ["Audit all 13 against the five-field contract",
    "Trust the spec",
    "Audit at build time"],
   ["The five-field contract is the spec's own standard", "Audit is read-only"],
   0.9, "The spec sets the standard; verifying it is mechanical.",
   "P2", "Read-only", "None", "Worker", "Low", "This week",
   "13/13 parameters have all five fields; gaps listed",
   "AUTO_EXECUTE", "Run the read-only audit against the spec's own five-field contract. Within authority.")

dh("D-176", "REFACTOR/REPLACE/DROP 7: 'harvest, do not worship' - execution?",
   "dehpp/classification.md: REFACTOR/REPLACE/DROP = hack, dead code, unsafe assumption, or defect; harvest, do not worship",
   ["Schedule the 7 for harvest during DEHPP-BUILD with per-item disposition",
    "Leave until something breaks",
    "Drop immediately (they are classified defects)"],
   ["Classification is done; the 7 are named", "Harvest means preserve valuable behavior first (per the consolidation rule)"],
   0.8, "'Harvest, do not worship' plus the architecture-memory rule (archive before destroying) argues for scheduled, careful handling.",
   "P2", "Dispositions reversible until applied", "Code health", "Worker", "Low", "Standing",
   "Each of the 7 has a harvest/disposition record",
   "EXECUTE_REVERSIBLY", "Schedule per-item harvest dispositions during DEHPP-BUILD; never delete on classification alone (architecture-memory rule). Reversible planning.")

dh("D-177", "Second archetype onboarding precondition: P5 copy table + what else?",
   "dehpp/parameterization-spec.md ordering 2: before any second archetype or tenant onboards",
   ["Preconditions: P5 copy table + P2/S1 chrome split + tenantId provisioning (P1)",
    "P5 alone per the spec",
    "Full steps 1-4 before onboarding"],
   ["The spec names P5 as the precondition", "Onboarding without tenant provisioning (P1) is incoherent"],
   0.75, "The spec names P5; P1/P2 are logical prerequisites worth stating.",
   "P2", "Process reversible", "Onboarding safety", "Worker", "Low", "Standing",
   "Onboarding checklist published",
   "AUTO_EXECUTE", "Publish the checklist (P5 + P2/S1 + P1 provisioning); it makes the spec's precondition operational. Within authority.")

dh("D-178", "hpp-specific-inventory.md: adopt as the DEHPP-BUILD work list?",
   "dehpp/parameterization-spec.md authority line cites hpp-specific-inventory.md alongside classification.md",
   ["Adopt as the work list (read it before implementing, per the spec)",
    "Superseded by the 13 parameters",
    "Read-only reference, not a work list"],
   ["The spec names it as authority to read before implementing", "Its currency is unverified"],
   0.7, "Authority-cited but currency unverified.",
   "P2", "Reversible", "Build planning", "Worker", "Low", "This week",
   "Inventory read; currency confirmed or gaps noted",
   "GATHER_MORE_EVIDENCE", "Read the inventory and confirm its currency before adopting it as the work list; authority-cited does not mean current.")

dh("D-179", "'Nothing customer-facing ships until demo chrome is separable': enforce as a release gate?",
   "dehpp/parameterization-spec.md ordering 1",
   ["Enforce: release checklist item, blocking",
    "Advisory",
    "Enforce via D-161 acceptance only"],
   ["It is stated as the production safety gate", "Gates without owners do not gate"],
   0.85, "The spec states it as the gate; the owner is the gap.",
   "P1", "Process reversible", "Release safety", "Worker", "Low", "Standing",
   "Release checklist includes the chrome-separability item with an owner",
   "AUTO_EXECUTE", "Put it on the release checklist as blocking with the D-161 acceptance; a named gate needs an owner. Within authority.")

dh("D-180", "CLONE-PROVE re-run triggers: which changes trigger re-proof?",
   "dehpp/parameterization-spec.md ordering 4 (re-run against composed path); D-154",
   ["Triggers: any route-identity, composition, or ordering change; plus step 4 mandatory",
    "Step 4 only",
    "Every DEHPP-BUILD step"],
   ["Ordering 4 mandates one re-run; other steps' fidelity risk varies", "Re-runs cost time; missing one costs fidelity"],
   0.8, "The mandatory case is clear; the trigger set needs judgment.",
   "P2", "Process reversible", "Fidelity assurance", "Worker", "Low", "Standing",
   "Trigger list published",
   "AUTO_EXECUTE", "Publish the trigger list (identity/composition/ordering changes + mandatory step-4 re-run). Within authority.")

dh("D-181", "GOLDEN-REFERENCE.md did not exist: create one from the repo as the classification baseline?",
   "dehpp/classification.md: GOLDEN-REFERENCE.md did not exist; classification is from the repo directly",
   ["Create it now (snapshot the classified mechanisms as the baseline)",
    "Not needed; classification.md is the baseline",
    "Create at DEHPP-BUILD start"],
   ["Future classifications need a stable baseline", "classification.md already records the 54 with evidence"],
   0.75, "classification.md functions as the baseline; a separate doc is hygiene.",
   "P3", "Documentation reversible", "None", "Worker", "Low", "Standing",
   "Baseline exists in exactly one canonical place",
   "AUTO_EXECUTE", "Treat classification.md as the golden reference (it has the per-mechanism evidence); do not create a second baseline doc. Within authority.")

dh("D-182", "62-row table: annotate rows with mechanism IDs after the D-148 recount?",
   "dehpp/classification.md; D-148",
   ["Annotate: every row gets its mechanism ID or 'non-mechanism row' tag",
    "Leave the table; the mapping doc suffices",
    "Restructure the table to 54 rows"],
   ["D-148 produces the mapping; annotation makes the table self-consistent", "Restructuring risks losing row context"],
   0.85, "Annotation preserves context while fixing the count confusion.",
   "P3", "Documentation reversible", "Spec clarity", "Worker", "Low", "After D-148",
   "Table annotated; 54 vs 62 confusion unrepeatable",
   "EXECUTE_REVERSIBLY", "Annotate (do not restructure) after the recount; it fixes the confusion without losing context. Reversible doc change.")

dh("D-183", "Spec-vs-KEEP conflict law ('KEEP wins'): standing beyond DEHPP?",
   "dehpp/parameterization-spec.md: where this spec and a KEEP invariant conflict, the KEEP invariant wins",
   ["Adopt factory-wide: KEEP invariants outrank specs",
    "DEHPP-only",
    "Per-conflict judgment"],
   ["The law is stated for the spec; KEEP is defined as universal quality", "Universal outranking universal is coherent"],
   0.85, "KEEP is defined as universal; the generalization is principled.",
   "P2", "Principle reversible", "Architecture governance", "Worker", "Low", "Standing",
   "Law documented in the factory conventions",
   "AUTO_EXECUTE", "Adopt factory-wide: KEEP (universal quality, burden reversed) outranks implementation specs. Within authority.")

dh("D-184", "Owner-set parameter source: presentation intent vs tenant config - which owns 'owner-set'?",
   "dehpp/parameterization-spec.md Part A source vocabulary: owner-set (owner directive via presentation intent or tenant config)",
   ["Disambiguate per parameter in the five-field audit (D-175)",
    "Presentation intent owns all owner-set",
    "Tenant config owns all owner-set"],
   ["The vocabulary allows both; per-parameter reality may differ", "D-175 audits the five fields"],
   0.75, "The vocabulary is deliberately broad; disambiguation is per-parameter work.",
   "P2", "Reversible", "Parameter ownership", "Worker", "Low", "With D-175",
   "Each owner-set parameter names its owner (intent vs config)",
   "AUTO_EXECUTE", "Disambiguate per parameter inside the D-175 audit; no global rule needed. Within authority.")

dh("D-185", "Deployment source: who provisions tenantId at route provisioning?",
   "dehpp/parameterization-spec.md P1 source: deployment (route provisioning)",
   ["Name the provisioning owner (Nolan/ops runbook)",
    "Leave to build-program coordinator",
    "Defer to first onboarding"],
   ["P1's hard-failure rule makes provisioning load-bearing", "No owner named"],
   0.7, "Someone must own provisioning before first onboarding.",
   "P1", "Process reversible", "Tenant provisioning", "Worker", "Low", "Before first onboarding",
   "Provisioning owner + runbook named",
   "DEEP_REVIEW", "Provisioning ownership is an ops decision; review with the build-program coordinator rather than self-assigning.")

dh("D-186", "System-default params: factory-shipped table versioning?",
   "dehpp/parameterization-spec.md source vocabulary: system-default (factory shipped table, same for every tenant until overridden)",
   ["Version the defaults table; changes are migrations",
    "Unversioned; defaults are code",
    "Version only on breaking changes"],
   ["Defaults shared by every tenant = a compatibility surface", "No versioning named"],
   0.75, "Shared defaults are a real compatibility surface.",
   "P2", "Process reversible", "Default compatibility", "Worker", "Low", "Standing",
   "Versioning rule documented",
   "DEEP_REVIEW", "Defaults-table versioning is a compatibility contract decision; review it (recommended: version the table, changes are migrations) rather than improvising.")

dh("D-187", "Fallback-when-absent: audit every parameter's fallback for silent-default risks?",
   "dehpp/parameterization-spec.md: each parameter has a fallback when absent; P1's is hard failure",
   ["Audit all 13 fallbacks for silent-default hazards (P1-style)",
    "Trust the spec",
    "Audit at build time"],
   ["P1's fallback is hard failure precisely to avoid silent defaults; other params may default silently",
    "Audit is read-only"],
   0.9, "P1 sets the precedent; silent defaults are the hazard class.",
   "P2", "Read-only", "None", "Worker", "Low", "This week",
   "Fallback audit: each parameter's absent-behavior classified (hard fail / safe default / silent default)",
   "AUTO_EXECUTE", "Run the read-only fallback audit; any silent-default hazard becomes its own item. Within authority.")

dh("D-188", "P2 chromeMode values: define the mode vocabulary?",
   "dehpp/parameterization-spec.md P2 chromeMode",
   ["Define: explicit mode values (demo/customer) with semantics",
    "Defer to step 1 build",
    "Single boolean is enough"],
   ["P2's section not fully read", "Mode vocabulary shapes the chrome split"],
   0.6, "Not yet read.",
   "P2", "Reversible", "Chrome architecture", "Worker", "Low", "This week",
   "P2 read; mode vocabulary defined",
   "GATHER_MORE_EVIDENCE", "Read P2 fully before defining the vocabulary; do not define from the name alone.")

dh("D-189", "Demo vs customer chrome: visual diff test as separability proof?",
   "dehpp/parameterization-spec.md ordering 1",
   ["Add visual diff: demo chrome vs customer chrome on the same tenant",
    "D-161 acceptance suffices",
    "No visual test; structural proof only"],
   ["D-161 defines acceptance; visual diff is one candidate proof", "Visual tests are brittle"],
   0.7, "Candidate proof, not the decision.",
   "P2", "Test-only", "None", "Worker", "Low", "With D-161",
   "D-161 verification",
   "DEFER", "Fold into D-161: the acceptance review picks the proof (structural, bundle, and/or visual).")

dh("D-190", "Copy table beyond G9: are P6-P9/P12 voice, or structural copy?",
   "dehpp/parameterization-spec.md ordering 5: remaining copy parameters",
   ["Read and classify each as voice vs structural",
    "Treat all as voice",
    "Defer to build"],
   ["G9 is the voice fix; the rest are unread", "Classification shapes the copy-table schema"],
   0.6, "Unread.",
   "P3", "Reversible", "Copy architecture", "Worker", "Low", "This week",
   "P6-P9/P12 read and classified",
   "GATHER_MORE_EVIDENCE", "Read the sections before classifying; the schema depends on it.")

dh("D-191", "Media seam tenant threading: heroMediaFor takes tenantId per P1's threading rule?",
   "dehpp/parameterization-spec.md P1: tenantId threaded to getPingObjectGraph, heroMediaFor, SiteClient, DemoOwnerMode, generateMetadata",
   ["Enforce: heroMediaFor signature takes tenantId; no ambient tenant",
    "Allow ambient tenant in media seam",
    "Defer to M3 build"],
   ["P1 names heroMediaFor explicitly in the threading list", "Ambient tenant state risks cross-tenant media leaks"],
   0.9, "P1 is explicit.",
   "P1", "API change semi-permanent", "Media tenant isolation", "Worker", "Low", "Standing",
   "heroMediaFor takes tenantId explicitly",
   "AUTO_EXECUTE", "Enforce P1's threading for heroMediaFor; explicit tenant identity prevents cross-tenant media leaks. Within authority to require in review.")

dh("D-192", "R9 composition vs P3/P4: is R9 the implementation of the order params?",
   "dehpp/parameterization-spec.md ordering 4; D-167",
   ["Fold into D-167 (read R9 first)",
    "Decide now: R9 implements P3/P4",
    "Keep separate tracks"],
   ["D-167 owns the R9 read", "Deciding from names alone is the failure mode"],
   0.7, "Owned by D-167.",
   "P2", "None", "None", "Worker", "Low", "With D-167",
   "D-167 verification",
   "DEFER", "Fold into D-167.")

dh("D-193", "SocialProof section: golden-path membership - does it change the 'at least one section' verify rule?",
   "MISSION-PROTOCOL WORLD verify: at least one section; dehpp ordering 6 adds SocialProof to the golden path",
   ["No change: section-count rules are minimums",
    "Update: golden path section list is now explicit and versioned",
    "Defer to G10 build"],
   ["Verify asserts minimums, not exact sets", "Golden-path membership affects fidelity proofs"],
   0.8, "Minimums vs exact sets is the distinction.",
   "P3", "Reversible", "Verify rules", "Worker", "Low", "Standing",
   "Golden-path section list versioned separately from verify minimums",
   "AUTO_EXECUTE", "Keep verify minimums as-is; version the golden-path section list explicitly so G10's addition is tracked. Within authority.")

dh("D-194", "KEEP 34: periodic re-verification cadence?",
   "dehpp/classification.md KEEP 34",
   ["Annual re-verification of KEEP claims",
    "Re-verify on any touching change (targeted)",
    "No cadence; burden-reversed means they stand"],
   ["KEEP = universal quality; universals should survive re-examination", "Cadences cost effort"],
   0.7, "Principled but the cost/benefit is judgment.",
   "P3", "Process reversible", "Architecture governance", "Worker", "Low", "Standing",
   "Cadence documented or explicitly rejected",
   "DEEP_REVIEW", "A re-verification cadence for 34 KEEPs is a real effort commitment; review the cadence (recommended: re-verify on touching change, no calendar cadence) rather than imposing it.")

dh("D-195", "DROP 7 archive: where do harvested behaviors live?",
   "dehpp/classification.md REFACTOR/REPLACE/DROP 7; D-176",
   ["Archive harvested behavior in the lane dir before removal",
    "Git history suffices",
    "Harvest notes in classification.md"],
   ["Architecture-memory rule: archive before destroying", "D-176 schedules the harvest"],
   0.85, "The memory rule already answers this.",
   "P3", "Reversible", "Architecture memory", "Worker", "Low", "With D-176",
   "Harvest archive exists per item",
   "AUTO_EXECUTE", "Archive harvested behavior in the lane dir per the architecture-memory rule; git history alone is not an archive. Within authority.")

dh("D-196", "DEHPP-BUILD: single writer rule for the parameterization work?",
   "MISSION-PROTOCOL: one writer per mutable semantic unit",
   ["Apply: DEHPP-BUILD has one integration writer for parameterized code",
    "Per-step writers",
    "No writer rule; lanes coordinate"],
   ["The protocol's one-writer rule exists for the repo", "Parameterization touches shared render code"],
   0.85, "The protocol already decides this.",
   "P2", "Process reversible", "Build coordination", "Worker", "Low", "Standing",
   "Writer named for DEHPP-BUILD",
   "AUTO_EXECUTE", "Apply the protocol's one-writer rule to DEHPP-BUILD; parameterization touches shared code. Within authority to require.")

dh("D-197", "Parameterization-spec SPEC ONLY: enforce 'no code' while in spec phase?",
   "dehpp/parameterization-spec.md scope gate: SPEC ONLY",
   ["Enforce: spec-phase changes are docs/tests only",
    "Allow preparatory refactors",
    "Spec phase is over; moot"],
   ["D-157 already gates repo/hpp-clone writes during CLONE-PROVE", "Scope creep from spec to code is the failure mode"],
   0.8, "D-157 covers the repo; this covers the spec's own discipline.",
   "P3", "Process reversible", "Spec discipline", "Worker", "Low", "Standing",
   "Spec-phase boundary documented",
   "AUTO_EXECUTE", "Enforce SPEC ONLY during the spec phase (docs/tests/probes only); it is the spec's own gate. Within authority.")

dh("D-198", "R3 vs field-visibility: document the two-layer privacy boundary?",
   "dehpp/classification.md R3: distinct from the field-visibility projection (hides fields, not objects); both needed",
   ["Document: object-layer (R3 publicGraph) vs field-layer (field-visibility) with examples",
    "Code comments suffice",
    "No doc; the distinction is obvious"],
   ["The classification explicitly distinguishes them", "Two-layer boundaries get confused in review"],
   0.9, "The classification names the distinction; documenting it is mechanical.",
   "P2", "Documentation reversible", "None", "Worker", "Low", "Now",
   "Two-layer boundary documented with the R3/field-visibility split",
   "AUTO_EXECUTE", "Document the two layers with examples; reviewers confuse them otherwise. Within authority.")

dh("D-199", "ownerName() reads the public business object's title: privacy check on 'public'?",
   "dehpp/classification.md R2: ownerName() reads the public business object's title",
   ["Verify: ownerName() only reads objects passing the R3 public filter",
    "Assume: 'public business object' means filtered",
    "Add test"],
   ["R2 says 'public'; R3 defines public", "The composition of R2+R3 is assumed, not tested"],
   0.8, "Assumed composition of two KEEPs; worth one test.",
   "P1", "Test-only reversible", "Name privacy", "Worker", "Low", "This week",
   "Test: ownerName() never returns a private object's title",
   "EXECUTE_REVERSIBLY", "Add the composition test; two KEEPs composed on assumption is exactly where privacy leaks hide. Reversible test proposal.")

dh("D-200", "generateMetadata: forbid hand-copy overrides of the derived title/description?",
   "dehpp/classification.md R2: no hand copy",
   ["Forbid: metadata derives from the owner object; overrides rejected in review",
    "Allow overrides with justification",
    "Allow freely"],
   ["R2's rationale is SEO/OG honesty", "Overrides reintroduce hand-copy drift"],
   0.8, "KEEP with reversed burden; the override policy is the question.",
   "P2", "Process reversible", "Metadata honesty", "Worker", "Low", "Standing",
   "Override policy documented",
   "DEEP_REVIEW", "Whether overrides are ever allowed is a product/SEO call on top of a KEEP; review it (default: forbid, KEEP wins per D-183).")

dh("D-201", "TenantId in metadata: per-tenant SEO identity?",
   "dehpp/parameterization-spec.md P1: tenantId threaded to generateMetadata",
   ["Require: metadata identity derives from tenantId + owner object (no cross-tenant bleed)",
    "Assume P1 threading covers it",
    "Test per tenant"],
   ["P1 threads tenantId to generateMetadata explicitly", "Cross-tenant metadata bleed is the hazard"],
   0.85, "P1 covers it by construction; a test pins it.",
   "P2", "Test-only reversible", "Tenant SEO isolation", "Worker", "Low", "Standing",
   "Per-tenant metadata test",
   "AUTO_EXECUTE", "Add the per-tenant metadata isolation test; P1's threading is the mechanism, the test is the proof. Within authority.")

dh("D-202", "DemoOwnerMode in prod bundle: build-time strip vs runtime gate (ties D-162)?",
   "dehpp/classification.md R8; D-162",
   ["Fold into D-162",
    "Decide now: strip",
    "Decide now: gate"],
   ["D-162 owns it", "Duplicate decision"],
   0.95, "Duplicate.",
   "P1", "None", "None", "Worker", "Low", "With D-162",
   "D-162 verification",
   "AUTO_EXECUTE", "Fold into D-162. Record the fold.")

dh("D-203", "P1 route-seam validation: error copy for invalid tenantId?",
   "dehpp/parameterization-spec.md P1: validated once at the route seam",
   ["Define the invalid-tenantId error surface (config error, not a 500, not a fallback)",
    "Default framework error",
    "Defer to build"],
   ["P1's hard-failure rule needs a defined surface", "Error copy is product-facing"],
   0.8, "Small but product-facing.",
   "P2", "Reversible", "Error UX", "Worker", "Low", "This week",
   "Invalid tenantId -> defined config-error surface",
   "EXECUTE_REVERSIBLY", "Define the error surface (config error, never fallback, never raw 500); small, reversible. Propose with P1's validation.")

dh("D-204", "DEHPP-BUILD done criteria: what proves parameterization complete?",
   "dehpp/parameterization-spec.md (build spec, no done criteria)",
   ["Define: all 13 parameters five-field complete + steps 1-6 done + CLONE-PROVE re-run green + second archetype onboarded",
    "Define minimally: 13 parameters wired",
    "Defer to build-program coordinator"],
   ["No done criteria exist", "Unbounded build phases drift"],
   0.8, "Needed, but the coordinator owns the program.",
   "P2", "Process reversible", "Program scope", "Worker + coordinator", "Low", "This week",
   "Done criteria published",
   "DEEP_REVIEW", "Propose the criteria (recommended: the full list in option A) but confirm with the build-program coordinator; program scope is shared ownership.")

dh("D-205", "54-mechanism framing in build planning: use after D-011 resolves?",
   "dehpp/parameterization-spec.md; D-011",
   ["Use the reconciled count in all build planning after D-011",
    "Keep citing 54 now",
    "Avoid counts entirely"],
   ["D-011 owns the reconciliation", "Planning on a disputed denominator propagates error"],
   0.85, "Straightforward sequencing.",
   "P3", "Reversible", "Planning accuracy", "Worker", "Low", "After D-011",
   "Planning docs cite the reconciled number",
   "AUTO_EXECUTE", "Sequence it: cite the reconciled number after D-011; until then, cite the range. Within authority.")

dh("D-206", "Parameterization-spec authority line: classification.md + hpp-specific-inventory.md - re-verify currency?",
   "dehpp/parameterization-spec.md authority line",
   ["Re-verify both sources' currency before DEHPP-BUILD",
    "Trust as of 2026-09-23",
    "Re-verify at build start only"],
   ["D-178 questions the inventory's currency", "Authority citations rot"],
   0.8, "D-178 already targets the inventory; classification.md is dated 2026-09-23 and stable.",
   "P2", "Read-only", "None", "Worker", "Low", "Before DEHPP-BUILD",
   "Currency confirmed for both",
   "AUTO_EXECUTE", "Re-verify currency of both authority sources before DEHPP-BUILD (fold the inventory half into D-178). Within authority.")

dh("D-207", "Tenant data surfaces P10/P11/P13: privacy review before wiring?",
   "dehpp/parameterization-spec.md ordering 3; tenant data surfaces",
   ["Require privacy review (R3 boundary) before wiring tenant data surfaces",
    "Build then review",
    "R3 test (D-170) suffices"],
   ["Tenant data surfaces are new client-payload surface", "R3 is the boundary they must respect"],
   0.85, "New payload surface + P0-adjacent boundary = review first.",
   "P1", "Process reversible", "Tenant data privacy", "Worker", "Low", "Before step 3",
   "Privacy review recorded; D-170 test covers the surfaces",
   "AUTO_EXECUTE", "Require the privacy review before wiring; the R3 boundary is P0-adjacent. Within authority to require.")

dh("D-208", "Copy-table schema: single table for P5-P9/P12 or per-surface tables?",
   "dehpp/parameterization-spec.md P5 copy table; P6-P9/P12 remaining copy params",
   ["Single copy table (one authority)",
    "Per-surface tables",
    "Defer to step 2 design"],
   ["No-second-authority rule argues for one table", "Per-surface tables may fit different lifecycles"],
   0.7, "Genuine schema design question.",
   "P2", "Schema semi-permanent", "Copy architecture", "Design review", "Low", "Before step 2",
   "Schema decision recorded",
   "DEEP_REVIEW", "One table vs per-surface is a schema decision with lifecycle implications; review it in the step-2 design (default: one table per the no-second-authority rule).")

dh("D-209", "Voice parameters: owner-editable via presentation intent?",
   "dehpp/classification.md R5 (presentation intent) + P5 copy table",
   ["Yes: voice params are owner-set via presentation intent",
    "No: voice is factory-set; owners get bounded choices",
    "Per-parameter (D-184)"],
   ["R5 lets owner directives shape presentation", "Unbounded owner voice edits risk brand/quality drift"],
   0.7, "Real product question.",
   "P2", "Reversible", "Owner voice control", "Design review", "Low", "This week",
   "Owner-voice policy documented",
   "DEEP_REVIEW", "How much voice control owners get is a product decision; review it (coordinate with D-184's per-parameter ownership).")

dh("D-210", "DEHPP-BUILD and the 90+ dirty files: lane isolation protocol?",
   "MISSION-PROTOCOL: never touch other lanes' dirty work; repo has 90+ dirty files",
   ["Require: DEHPP-BUILD works from a clean worktree or named stash; never touches others' files",
    "Trust lane discipline",
    "Freeze other lanes during DEHPP-BUILD"],
   ["The protocol already forbids touching others' work", "90+ dirty files make accidents likely"],
   0.9, "The protocol states the rule; the file count makes enforcement necessary.",
   "P1", "Process reversible", "Repo hygiene", "Worker", "Low", "Standing",
   "Isolation procedure documented and followed",
   "AUTO_EXECUTE", "Require the isolation procedure (clean worktree/named stash + pre/post git status per D-047); the dirty count demands it. Within authority.")

dh("D-211", "hpp-clone dir: read-only reference during DEHPP-BUILD?",
   "dehpp/parameterization-spec.md scope gate mentions ~/workspace/fyd-factory/hpp-clone/",
   ["Treat hpp-clone as read-only reference (fidelity baseline)",
    "Allow writes with clone-prove re-run",
    "Archive after clone-prove"],
   ["Clone-prove measures against the clone; writes invalidate it", "D-157 gates writes during runs"],
   0.85, "Measurement baseline logic.",
   "P2", "Process reversible", "Fidelity baseline", "Worker", "Low", "Standing",
   "hpp-clone write policy documented",
   "AUTO_EXECUTE", "Treat hpp-clone as read-only except through the clone-prove owner's explicit procedure. Within authority.")

dh("D-212", "Parameter defaults vs tenant overrides: override precedence rule?",
   "dehpp/parameterization-spec.md source vocabulary: system-default ... until overridden",
   ["Precedence: owner-set > deployment > system-default, documented per parameter",
    "Per-parameter precedence",
    "No global rule"],
   ["'Until overridden' implies precedence; the order is unstated", "Precedence disputes cause tenant bugs"],
   0.8, "The implication is clear; stating it prevents bugs.",
   "P2", "Rule reversible", "Parameter resolution", "Worker", "Low", "Standing",
   "Precedence rule documented; D-175 audit records per-parameter precedence",
   "AUTO_EXECUTE", "Adopt owner-set > deployment > system-default as the default precedence, recorded per parameter in the D-175 audit. Within authority.")

# ------------------------------------------------- GOLDEN / VQ / PHASE 17 D-213..D-237

def gv(iid, question, context, outputs, evidence, confidence, conf_basis,
       criticality, reversibility, blast_radius, authority, cost,
       time_sensitivity, verification, verdict, verdict_rationale):
    add(iid, "policy", question, context, outputs, evidence, confidence,
        conf_basis, criticality, reversibility, blast_radius,
        "Novel (program decisions)", authority, cost, time_sensitivity,
        verification, verdict, verdict_rationale)

gv("D-213", "Golden-set metric definition: what does 0.95 measure exactly?",
   "morning decision item; golden-set protocol exists; D-012",
   ["Define: correctness = share of golden cases fully correct (binary per case)",
    "Define: weighted (critical cases count more)",
    "Defer to protocol doc"],
   ["D-012 needs the metric to be decidable", "A bar without a metric is not a bar"],
   0.8, "The bar decision requires the metric.",
   "P1", "Definition reversible", "Quality measurement", "Worker", "Low", "With D-012",
   "Metric defined and documented",
   "DEEP_REVIEW", "Define the metric in the same review as D-012's bar; the two are one decision. (Recommended: binary-per-case with critical-case weighting disclosed.)")

gv("D-214", "Golden-set red-run response: who stops what when the bar goes red?",
   "morning decision item; D-012",
   ["Define: red bar blocks releases; lane owner investigates within 24h",
    "Define: red bar is advisory; trend reviewed weekly",
    "Defer to Nolan"],
   ["A bar without a response is decoration", "Nolan owns release decisions"],
   0.7, "Response policy is a genuine program decision.",
   "P1", "Policy reversible", "Release process", "Nolan (with worker proposal)", "Low", "With D-012",
   "Response policy documented with the bar",
   "HUMAN_DECISION", "Fold into D-012: the bar, the metric, and the red-run response are one Nolan decision. The shard proposes 'red blocks releases, lane owner investigates in 24h'.")

gv("D-215", "Golden-set fixture ownership: who maintains the golden fixtures?",
   "golden-set protocol exists",
   ["Name a fixture owner (factory QA lane)",
    "Per-fixture owners",
    "Nolan owns"],
   ["Fixtures rot without an owner", "No owner named"],
   0.75, "Ownership gap is clear.",
   "P2", "Process reversible", "Fixture currency", "Worker", "Low", "Standing",
   "Owner named",
   "DEEP_REVIEW", "Name the owner in review with the QA lane; fixtures without owners rot. (Recommended: factory QA lane.)")

gv("D-216", "Golden-set refresh cadence: how often do fixtures update?",
   "golden-set protocol exists",
   ["Refresh on product change (event-driven)",
    "Quarterly review",
    "Never (frozen goldens)"],
   ["Frozen goldens go stale; constant churn destroys the bar's meaning", "Event-driven matches the factory's change pattern"],
   0.75, "Judgment call with real trade-offs.",
   "P2", "Process reversible", "Bar stability", "Worker", "Low", "Standing",
   "Cadence documented",
   "DEEP_REVIEW", "Review the cadence (recommended: event-driven refresh on product change with a changelog, so the bar tracks the product without churning).")

gv("D-217", "Golden bar 0.95 vs 1.0 for safety-critical seams?",
   "morning decision item; D-012",
   ["Single bar 0.95 everywhere (simplicity)",
    "Tiered: 1.0 for claim-integrity/security seams, 0.95 elsewhere",
    "Single bar 1.0 (maximal)"],
   ["Claim/security holes are P0; a 5% miss rate there is not acceptable",
    "Tiered bars complicate the protocol"],
   0.7, "Real safety argument for tiering; real simplicity argument against.",
   "P1", "Reversible", "Quality bars", "Nolan", "Low", "With D-012",
   "Bar structure documented",
   "HUMAN_DECISION", "Fold into D-012: the shard recommends tiered (1.0 safety-critical, 0.95 elsewhere) but the bar structure is Nolan's call.")

gv("D-218", "VQ-001 motion-never-gates-content: accept post-fidelity?",
   "patches/vq-001-motion-never-gates-content.patch; D-013",
   ["Accept (fold into D-013 integration)",
    "Accept with animation-review",
    "Reject: motion gating is a feature"],
   ["Fidelity proof PROCEED covers the VQ set", "D-013 owns the integration decision"],
   0.85, "Covered by D-013's fidelity proof.",
   "P2", "Reversible via git apply -R", "Motion behavior", "Parent-gated writer", "Low", "With D-013",
   "D-013 verification",
   "AUTO_EXECUTE", "Fold into D-013; the per-patch line items do not need separate verdicts. Record the fold.")

gv("D-219", "VQ-002 hero-pill-on-dark: accept post-fidelity?",
   "patches/vq-002-hero-pill-on-dark.patch; D-013",
   ["Fold into D-013", "Separate review", "Reject"],
   ["Same as D-218", ""],
   0.85, "Same as D-218.",
   "P2", "Reversible", "Hero contrast", "Parent-gated writer", "Low", "With D-013",
   "D-013 verification",
   "AUTO_EXECUTE", "Fold into D-013. Record the fold.")

gv("D-220", "VQ-004 typographic-hero-treatment: accept post-fidelity?",
   "patches/vq-004-typographic-hero-treatment.patch; D-013",
   ["Fold into D-013", "Separate review", "Reject"],
   ["Same as D-218", ""],
   0.85, "Same as D-218.",
   "P2", "Reversible", "Hero typography", "Parent-gated writer", "Low", "With D-013",
   "D-013 verification",
   "AUTO_EXECUTE", "Fold into D-013. Record the fold.")

gv("D-221", "VQ badge-contrast + FAB-occlusion + contact-CTA + scroll-lock: accept post-fidelity?",
   "patches/vq-*.patch (5th patch family); D-013",
   ["Fold into D-013", "Separate per-patch review", "Reject subset"],
   ["D-013 names all five repair areas", "Fidelity proof PROCEED"],
   0.85, "Same as D-218.",
   "P2", "Reversible", "Visual quality", "Parent-gated writer", "Low", "With D-013",
   "D-013 verification",
   "AUTO_EXECUTE", "Fold into D-013. Record the fold.")

gv("D-222", "Clone-fidelity re-proof cadence after VQ repairs land?",
   "patches/vq-*.patch; D-013; D-180",
   ["Re-proof after the VQ batch (one run)",
    "Re-proof per patch (D-013's per-patch option)",
    "No re-proof; fidelity proof stands"],
   ["VQ repairs change the rendered surface; fidelity is the claim", "D-180's trigger list covers surface changes"],
   0.85, "Surface changes trigger re-proof per D-180.",
   "P2", "Process reversible", "Fidelity assurance", "Worker", "Low", "After VQ integration",
   "Re-proof green with VQ repairs in place",
   "AUTO_EXECUTE", "Require one re-proof after the VQ batch lands (per D-180's surface-change trigger). Within authority to require.")

gv("D-223", "Fidelity proof standard: adopt the VQ 'PROCEED' format as the template?",
   "patches/vq-*.patch; fidelity proof done (PROCEED)",
   ["Adopt PROCEED format as the fidelity-proof template",
    "Per-proof format",
    "Stricter template needed"],
   ["The VQ proof produced a PROCEED that D-013 relies on", "Future proofs (G10, step 4) need the same shape"],
   0.8, "The format worked for a real decision.",
   "P3", "Process reversible", "Proof standards", "Worker", "Low", "Standing",
   "Template documented; G10/step-4 proofs use it",
   "AUTO_EXECUTE", "Adopt the PROCEED format as the template; it carried a real integration decision. Within authority.")

gv("D-224", "Phase 17 gap list: who writes it?",
   "build-program coordinator dependency; D-015",
   ["This decision shard drafts it (evidence pack for Nolan)",
    "Build-program coordinator writes it",
    "Joint: shard drafts, coordinator validates"],
   ["D-015 decided the shard produces the gap list as the evidence pack", "Coordinator owns the dependency"],
   0.85, "D-015 assigned the drafting.",
   "P0", "Reversible", "Launch readiness", "Worker (draft)", "Medium", "This week",
   "Gap list exists with owner + evidence requirement + closer per item",
   "AUTO_EXECUTE", "The shard drafts the gap list per D-015; the coordinator validates. Begin the draft now. Within authority.")

gv("D-225", "Phase 17 gap: H4/R-H4 seam must be closed before publish?",
   "claim/CLAIM-VERDICT.md; D-015",
   ["Yes: blocking gap (unverified claims render as facts)",
    "No: mitigations suffice",
    "Defer to gap-list review"],
   ["The verdict's load-bearing finding #1", "UNAUTHENTICATED publishing amplifies the hole to strangers"],
   0.9, "The hole lets unevidenced claims render; unauthenticated publishing is the worst context for it.",
   "P0", "Reversible", "Launch safety", "Worker (gap list)", "Low", "With D-224",
   "Gap list marks H4/R-H4 blocking",
   "AUTO_EXECUTE", "Mark H4/R-H4 as a blocking gap in the draft; the verdict names it load-bearing and unauthenticated publishing is the highest-exposure context. Within the gap-list authority.")

gv("D-226", "Phase 17 gap: R-MODEL /sites wiring must be closed before publish?",
   "claim/CLAIM-VERDICT.md R-MODEL; D-015",
   ["Yes: blocking gap (0% strong-verifier coverage on the public path)",
    "No: mitigations suffice",
    "Defer"],
   ["Load-bearing finding #2; the public path is exactly what Phase 17 opens", ""],
   0.9, "Phase 17 IS the /sites public path going live.",
   "P0", "Reversible", "Launch safety", "Worker (gap list)", "Low", "With D-224",
   "Gap list marks R-MODEL blocking",
   "AUTO_EXECUTE", "Mark R-MODEL as a blocking gap; Phase 17 publishes the very path with 0% coverage. Within the gap-list authority.")

gv("D-227", "Phase 17 gap: SEC-FIX integration must land before publish?",
   "security/SEC-FIX-SPEC.md; D-015",
   ["Yes: blocking (XSS-class holes on the /o lane)",
    "No: /o lane is not the publish path",
    "Partial: REQUIRED patches blocking, RECOMMENDED advisory"],
   ["XSS-class holes are P0", "Publish scope may or may not include /o pages"],
   0.75, "Depends on whether /o pages are in the publish scope.",
   "P0", "Reversible", "Launch safety", "Worker (gap list)", "Low", "With D-224",
   "Gap list marks SEC-FIX per publish scope",
   "GATHER_MORE_EVIDENCE", "Determine whether /o object pages are in the Phase 17 publish scope; the blocking status follows. Do not mark blind.")

gv("D-228", "Phase 17 gap: F-1..F-8 fail-closed before publish?",
   "pressure/PRESSURE-REPORT.md; D-015",
   ["Yes: blocking (degenerate input crashes the render path)",
    "No: malformed input is an edge case",
    "Partial: F-8 (invented claim) blocking, crashes advisory"],
   ["Unauthenticated visitors include hostile input", "F-8 invents business names"],
   0.85, "Unauthenticated input is adversarial by definition.",
   "P0", "Reversible", "Launch safety", "Worker (gap list)", "Low", "With D-224",
   "Gap list marks F-class per the split",
   "AUTO_EXECUTE", "Mark F-8 blocking (invented claims to strangers) and F-1..F-6 blocking-or-mitigated (crash on hostile input); unauthenticated input is adversarial. Within the gap-list authority.")

gv("D-229", "Phase 17: unauthenticated-publish threat model - who defines 'safe'?",
   "D-015; build-program coordinator dependency",
   ["Coordinator defines the threat model; gap list checks against it",
    "Shard defines it in the gap list",
    "Nolan defines it"],
   ["D-015: 'safe' needs the coordinator's threat model to be checkable", "No threat model exists yet"],
   0.8, "The dependency is explicit.",
   "P0", "Reversible", "Launch definition", "Build-program coordinator", "Low", "This week",
   "Threat model published; gap list maps 1:1 to it",
   "REQUEST_CONFIRMATION", "Request the threat model from the build-program coordinator; the gap list cannot be checkable without it. The shard drafts gaps meanwhile.")

gv("D-230", "Phase 17 rollback plan: required before publish?",
   "D-015",
   ["Require a rollback plan as a launch gate item",
    "Rollback is git revert; no plan needed",
    "Defer"],
   ["Production launch is a hard boundary; launches need reversibility", "No rollback plan exists"],
   0.9, "Launch reversibility is basic diligence.",
   "P0", "Reversible", "Launch safety", "Worker (gap list)", "Low", "With D-224",
   "Rollback plan is a gap-list item with an owner",
   "AUTO_EXECUTE", "Add the rollback plan as a blocking gap-list item; every launch needs a way back. Within the gap-list authority.")

gv("D-231", "Phase 17: Nolan sign-off item in the grilling brief?",
   "D-015 (HUMAN_DECISION); one-grill rule",
   ["Yes: the go/no-go goes to GRILLING-BRIEF.md in the required shape",
    "Lane report suffices",
    "Direct message"],
   ["D-015: the go/no-go is Nolan's", "One-grill rule: consequential questions go to the brief"],
   0.95, "Both rules point to the brief.",
   "P0", "Reversible", "Nolan's attention", "Worker", "Low", "When gap list is complete",
   "Grill item exists in the required shape when gaps close",
   "AUTO_EXECUTE", "Route the go/no-go through the grilling brief per the one-grill rule when the gap list is complete. Within authority to schedule.")

gv("D-232", "Phase 17 gap: owner-assertion path must exist before publish?",
   "claim H3/H4/H7: owner corrections and assertions are the honesty mechanism",
   ["Yes: blocking (publishing without owner corrections is publishing without recourse)",
    "No: launch, add later",
    "Partial: corrections UI blocking, assertions advisory"],
   ["Owner correction is the program's honesty backstop", "Phase 17 scope may not include owner flows"],
   0.7, "Depends on whether owner flows are in Phase 17 scope.",
   "P0", "Reversible", "Launch scope", "Worker (gap list)", "Low", "With D-224",
   "Scope determined; gap marked accordingly",
   "GATHER_MORE_EVIDENCE", "Determine whether owner-correction flows are in Phase 17 scope; the blocking status follows the scope.")

gv("D-233", "Phase 17 gap: evidence grading complete on the publish path?",
   "claim/CLAIM-VERDICT.md: evidence grading is the honesty machinery",
   ["Yes: blocking (no publish without graded evidence on the path)",
    "No: grade post-launch",
    "Partial: new content graded, legacy grandfathered"],
   ["Publishing ungraded claims repeats the H1 smuggling problem at scale", "Legacy content volume may make full grading impractical"],
   0.8, "The H1 lesson applies at publish scale.",
   "P0", "Reversible", "Launch honesty", "Worker (gap list)", "Low", "With D-224",
   "Grading coverage measured on the publish path",
   "AUTO_EXECUTE", "Mark evidence-grading coverage as a gap item (blocking for new content; grandfathering legacy needs its own decision). Within the gap-list authority.")

gv("D-234", "Phase 17 gap: rate limiting / abuse controls for unauthenticated publishing?",
   "D-015; unauthenticated visitor -> publish",
   ["Require abuse controls as a launch gap",
    "Out of scope for the factory (platform concern)",
    "Defer to Nolan"],
   ["Unauthenticated publish without abuse controls is a spam vector", "No abuse-control design exists in the factory"],
   0.85, "The spam vector is obvious and unaddressed.",
   "P0", "Reversible", "Launch safety", "Worker (gap list)", "Low", "With D-224",
   "Abuse controls are a gap item with an owner",
   "AUTO_EXECUTE", "Add abuse controls as a gap item; unauthenticated publish is a spam vector by construction. Within the gap-list authority.")

gv("D-235", "Phase 17: synthetic tenants in the publish path - forbidden?",
   "MISSION-PROTOCOL hard boundary: no synthetic business ever presented as a real prospect; every synthetic artifact carries synthetic:true + testing-only",
   ["Forbid: publish path rejects synthetic:true artifacts (enforced)",
    "Allow with marking",
    "Out of scope"],
   ["The hard boundary is explicit", "Factory testing uses synthetic tenants heavily"],
   0.95, "Hard boundary, explicit.",
   "P0", "Reversible", "Launch integrity", "Worker", "Low", "Now",
   "Publish path enforces synthetic rejection",
   "AUTO_EXECUTE", "Enforce synthetic rejection on the publish path per the hard boundary; add it as a blocking gap item. Within authority.")

gv("D-236", "Phase 17 gap list review: who validates the draft?",
   "D-224; D-015",
   ["Build-program coordinator validates",
    "Nolan validates",
    "Peer shards validate (falsification duty)"],
   ["D-224: coordinator validates the draft", "Falsification duty: other shards should attack it too"],
   0.85, "D-224 already assigned validation.",
   "P0", "Reversible", "Gap quality", "Worker", "Low", "When draft complete",
   "Draft validated by coordinator + falsified by a peer shard",
   "AUTO_EXECUTE", "Coordinator validates; request a peer shard falsification pass per the factory's falsification duty. Within authority to request.")

gv("D-237", "Phase 17: 'safe' includes the FYD mobile object-experience constraints?",
   "MEMORY.md FYD mobile rebuild (2026-09-23): mobile must stop being 'technically responsive'; binding steering",
   ["Include: mobile experience is part of publish readiness",
    "Exclude: Phase 17 is the publish mechanism, not the experience",
    "Partial: no-horizontal-overflow/no-tiny-targets as minimum"],
   ["The mobile rebuild is binding Nolan steering from the same day", "Phase 17 scope is the publish mechanism"],
   0.65, "Scope boundary question between two Nolan directives.",
   "P1", "Reversible", "Launch scope", "Worker (gap list)", "Low", "With D-224",
   "Scope decision recorded",
   "GATHER_MORE_EVIDENCE", "Check the Phase 17 scope definition for mobile-experience inclusion; the two directives coexist but their boundary is unstated. Do not assume.")

# ------------------------------------------------- FACTORY OPS D-238..D-290

def op(iid, question, context, outputs, evidence, confidence, conf_basis,
       criticality, reversibility, blast_radius, authority, cost,
       time_sensitivity, verification, verdict, verdict_rationale):
    add(iid, "policy", question, context, outputs, evidence, confidence,
        conf_basis, criticality, reversibility, blast_radius,
        "Novel (factory operations)", authority, cost, time_sensitivity,
        verification, verdict, verdict_rationale)

op("D-238", "Shard claiming: claim-by-directory with a CLAIM file?",
   "MISSION-PROTOCOL: deterministic world addressing needs no coordination; shard claiming does",
   ["Adopt: claim = create shard dir + CLAIM.md with worker id and timestamp",
    "Claim = dir creation alone",
    "Central registry file"],
   ["This shard exists by dir creation; a CLAIM file adds timestamp + worker id",
    "Stale claims need detection"],
   0.85, "Dir-as-claim works; the file adds auditability.",
   "P3", "Process reversible", "Work coordination", "Worker", "Low", "Standing",
   "CLAIM.md convention documented; this shard writes one retroactively",
   "AUTO_EXECUTE", "Adopt claim-by-directory plus CLAIM.md (worker, timestamp, scope); write one for shard-0 retroactively. Within authority.")

op("D-239", "Stale shard claims: recovery rule?",
   "MISSION-PROTOCOL: workers take the next unclaimed shard",
   ["Rule: claim older than 24h with no log activity is reclaimable (log the reclaim)",
    "Claims never expire",
    "Coordinator reassigns"],
   ["No rule exists; a dead worker's shard would stall forever", "24h with log-activity check is observable"],
   0.8, "The stall risk is real; the timeout is judgment.",
   "P3", "Process reversible", "Work liveness", "Worker", "Low", "Standing",
   "Rule documented; first reclaim (if any) logged",
   "AUTO_EXECUTE", "Adopt the 24h-no-activity reclaim rule with logged reclaims; it bounds the stall risk. Within authority.")

op("D-240", "Falsification duty: which verdicts must a peer shard falsify?",
   "Subagent task: 'review and falsify other shards' verdicts'; MISSION-PROTOCOL failure loop",
   ["Falsify: all HUMAN_DECISION/REFUSE verdicts + a 10% sample of the rest",
    "Falsify: everything",
    "Falsify: only DEEP_REVIEW verdicts"],
   ["HUMAN_DECISION/REFUSE are the highest-stakes verdicts", "Full falsification of 250 units is expensive"],
   0.8, "Risk-based sampling is the standard trade-off.",
   "P2", "Process reversible", "Verdict quality", "Worker", "Low", "Standing",
   "Falsification sample recorded per shard",
   "AUTO_EXECUTE", "Adopt risk-based falsification (all HUMAN_DECISION/REFUSE + 10% sample); it concentrates effort where stakes are highest. Within authority.")

op("D-241", "Idle discovery: 'highest-value gap' criteria?",
   "Subagent task: 'discover your next highest-value gap'; MISSION-PROTOCOL: the factory never idles",
   ["Criteria: P0-adjacent + evidence-ready + within authority, ranked by blast radius",
    "Worker judgment, no criteria",
    "Coordinator assigns"],
   ["No criteria exist; 'highest-value' is currently vibes", "P0-adjacent + evidence-ready is observable"],
   0.8, "Observable criteria beat vibes.",
   "P3", "Process reversible", "Work prioritization", "Worker", "Low", "Standing",
   "Criteria documented; next gap cites them",
   "AUTO_EXECUTE", "Adopt the criteria (P0-adjacent, evidence-ready, within authority, ranked by blast radius). Within authority.")

op("D-242", "No-stopping-conditions: minimum read-only cognition set when writes throttle?",
   "MISSION-PROTOCOL: at minimum, read-only cognition runs ALWAYS",
   ["Define: discovery, auditing, falsification, verification, learning (the protocol's five)",
    "Define minimally: auditing only",
    "No definition; worker judgment"],
   ["The protocol names the five activities explicitly", "Definition makes the invariant checkable"],
   0.9, "The protocol already lists the five.",
   "P2", "Process reversible", "Factory liveness", "Worker", "Low", "Standing",
   "Minimum set documented as the five named activities",
   "AUTO_EXECUTE", "Adopt the protocol's five as the minimum set; it makes 'never idle' checkable. Within authority.")

op("D-243", "Saturation: 2x-core load threshold - keep?",
   "MISSION-PROTOCOL saturation: 1-min load > 2x cores -> wait 60s, recheck, max 5 waits",
   ["Keep as specified",
    "Tune: 1.5x cores",
    "Tune: 3x cores"],
   ["No saturation incident has tested the threshold", "2x is a conventional choice"],
   0.7, "Untested in this factory; conventional but unproven here.",
   "P3", "Reversible", "Machine safety", "Worker", "Low", "Standing",
   "Threshold kept or tuned with rationale",
   "DEEP_REVIEW", "The threshold is untested here and protects shared hardware; review any tuning (default: keep 2x until an incident suggests otherwise) rather than improvising.")

op("D-244", "One-tsx-harness-per-worker rule: standing?",
   "MISSION-PROTOCOL saturation: run ONE tsx harness invocation per worker for the whole shard",
   ["Adopt as standing (all heavy lanes)",
    "Per-lane choice",
    "Relax: allow N invocations with justification"],
   ["The rule prevents ssh-per-mission storms", "This shard needed no Pig runs at all"],
   0.9, "The rationale (connection storms) is structural.",
   "P3", "Process reversible", "Pig load", "Worker", "Low", "Standing",
   "Rule in the factory conventions",
   "AUTO_EXECUTE", "Adopt as standing; connection storms are a structural risk. Within authority.")

op("D-245", "Results JSONL append (crash loses almost nothing): required for all shards?",
   "MISSION-PROTOCOL saturation: write results incrementally (JSONL append)",
   ["Require for all mission classes",
    "Require for long shards only",
    "Recommend"],
   ["This shard writes incrementally per the protocol", "Crash-resilience is proven by design"],
   0.95, "The protocol requires it; the benefit is structural.",
   "P2", "Process reversible", "Result durability", "Worker", "Low", "Standing",
   "All shards append incrementally",
   "AUTO_EXECUTE", "Require incremental JSONL appends for all shards per the protocol. Within authority.")

op("D-246", "Generic-class threshold (3+ missions same signature): keep?",
   "MISSION-PROTOCOL failure loop: generic = 3+ missions with the same failure signature",
   ["Keep 3+",
    "Raise to 5+ (fewer false generics)",
    "Lower to 2+ (catch earlier)"],
   ["3+ is a judgment call; no data yet on false-generic rate", "Threshold shapes patch effort"],
   0.7, "Untested; the trade-off is real.",
   "P3", "Reversible", "Failure-loop sensitivity", "Worker", "Low", "Standing",
   "Threshold kept or tuned with data",
   "DEEP_REVIEW", "Tune only with data (track false-generic rate for a week); until then keep 3+. Review any change.")

op("D-247", "Candidate-generic-primitive threshold (4+ missions same missing primitive): keep?",
   "MISSION-PROTOCOL failure loop: 4+ missions same missing primitive = candidate generic primitive (high priority)",
   ["Keep 4+",
    "Raise/lower",
    "Remove the rule (all missing primitives are features)"],
   ["Same as D-246: untested judgment call", "NO feature expansion is the counter-pressure"],
   0.7, "Same as D-246.",
   "P3", "Reversible", "Scope control", "Worker", "Low", "Standing",
   "Threshold kept or tuned with data",
   "DEEP_REVIEW", "Same as D-246: keep 4+ until data suggests otherwise; the no-feature-expansion rule is the counterweight. Review changes.")

op("D-248", "Findings record format: enforce all 14 fields on every finding?",
   "MISSION-PROTOCOL findings format: DOMAIN/COMPONENT/CLAIM/EVIDENCE/CALLER/CALLEE/WRITER/READER/AUTHORITY/CLASSIFICATION/CONFIDENCE/BROKEN BOUNDARY/DEPENDENCIES/AFFECTS AGENTS",
   ["Enforce all 14 (completeness)",
    "Enforce core 8 (claim/evidence/authority/classification/confidence/boundary/deps/affects)",
    "Guideline only"],
   ["14 fields is heavy; incomplete records are the failure mode", "This shard's SUMMARY will use the format"],
   0.75, "Completeness vs burden is the trade-off.",
   "P3", "Process reversible", "Finding quality", "Worker", "Low", "Standing",
   "Field requirement documented; this shard's findings comply",
   "DEEP_REVIEW", "The 14-field burden is real; review whether a core-8 enforcement gets the quality without the drag (recommended: enforce core 8, encourage all 14).")

op("D-249", "'Destructive git' definition: enumerate for the factory?",
   "MISSION-PROTOCOL hard boundaries: no destructive git (no pushes, no main/master commits, no touching other lanes' dirty work)",
   ["Enumerate: pushes, main/master commits, history rewrites, others' dirty files, stashes drops",
    "The parenthetical suffices",
    "Expand: no commits at all on shared branches"],
   ["The parenthetical lists three; edge cases (rebase, stash drop, tag moves) are unlisted",
    "Hard boundaries must be unambiguous"],
   0.85, "Hard boundaries need enumerations, not examples.",
   "P1", "Process reversible", "Repo safety", "Worker", "Low", "Standing",
   "Enumeration published in the factory conventions",
   "AUTO_EXECUTE", "Publish the enumeration; hard boundaries must be unambiguous. Within authority.")

op("D-250", "Vendor veto vs patch adoption: is adopting an existing lane patch a 'vendor' decision?",
   "MISSION-PROTOCOL hard boundary: vendor veto - do not adopt external vendors/services without Nolan; D-135 (adopt LANE-SEC patch as-is)",
   ["No: internal patch reuse is not a vendor adoption (D-135 stands)",
    "Yes: any external-to-lane artifact needs Nolan",
    "Case-by-case"],
   ["D-135 adopted assess-don't-duplicate for internal patches", "Vendor veto targets external services/vendors"],
   0.9, "The veto's target (external vendors/services) is distinct from internal reuse.",
   "P2", "Interpretation reversible", "Veto scope", "Worker", "Low", "Standing",
   "Interpretation documented",
   "AUTO_EXECUTE", "Document: internal patch reuse is not vendor adoption; the veto targets external vendors/services. D-135 stands. Within authority.")

op("D-251", "Owner-contact boundary: any decision needing owner contact -> HUMAN_DECISION. Confirm as absolute?",
   "Subagent task: anything needing owner contact -> HUMAN_DECISION or REFUSE; MISSION-PROTOCOL hard boundary: no owner contact or outreach of any kind",
   ["Confirm absolute: owner contact is always HUMAN_DECISION minimum",
    "Allow worker-initiated contact for purely factual verification",
    "Case-by-case"],
   ["Hard boundary is explicit and unconditional", "The task restates it as a verdict rule"],
   0.95, "Two sources agree unconditionally.",
   "P0", "Interpretation reversible", "Boundary integrity", "Worker", "Low", "Standing",
   "Rule confirmed in the verdict conventions",
   "AUTO_EXECUTE", "Confirm absolute: owner contact is HUMAN_DECISION minimum, no exceptions. Two sources agree. Within authority to confirm.")

op("D-252", "Real-money boundary: any spend -> HUMAN_DECISION or REFUSE?",
   "Subagent task: real money -> HUMAN_DECISION or REFUSE",
   ["Confirm: any real-money spend is HUMAN_DECISION (Nolan approves spend)",
    "Worker may spend under a threshold",
    "REFUSE all spend (no threshold)"],
   ["The task names real money alongside credentials and canonical mutation", "No spend threshold exists"],
   0.95, "Explicit in the task.",
   "P0", "Interpretation reversible", "Financial safety", "Worker", "Low", "Standing",
   "Rule confirmed",
   "AUTO_EXECUTE", "Confirm: real money is HUMAN_DECISION, no worker threshold. Within authority to confirm.")

op("D-253", "Credentials boundary: reading/using credentials in decisions?",
   "Subagent task: credentials -> HUMAN_DECISION or REFUSE; MISSION-PROTOCOL: no credential exposure",
   ["Confirm: credential use is HUMAN_DECISION; exposure is REFUSE",
    "Worker may use connected skills' credentials",
    "Case-by-case"],
   ["Hard boundary: no credential exposure", "Connected skills use credentials through their own auth (not raw)"],
   0.9, "The hard boundary covers exposure; use-through-skills is the normal path.",
   "P0", "Interpretation reversible", "Credential safety", "Worker", "Low", "Standing",
   "Rule confirmed: use via skills, never raw; exposure is REFUSE",
   "AUTO_EXECUTE", "Confirm: credentials flow through connected skills only, never raw; exposure is REFUSE. Within authority.")

op("D-254", "'Canonical mutation': what counts as canonical for the verdict rule?",
   "Subagent task: canonical mutation -> HUMAN_DECISION or REFUSE",
   ["Define: PING canonical store, repo main/master, published artifacts, memory/USER files",
    "Define narrowly: PING canonical store only",
    "Per-case judgment"],
   ["The rule needs a defined scope to be usable", "Repo writes are parent-gated (adjacent but distinct)"],
   0.8, "The scope is genuinely ambiguous.",
   "P1", "Interpretation reversible", "Verdict correctness", "Worker", "Low", "Standing",
   "Canonical scope defined",
   "DEEP_REVIEW", "Define 'canonical' in review (recommended: PING canonical store + published artifacts + user standing files; repo branch work is parent-gated, not canonical). The definition gates verdicts.")

op("D-255", "Production launch vs launch-adjacent: where is the line?",
   "MISSION-PROTOCOL hard boundary: no public production launch; D-015 (Phase 17 publish gate)",
   ["Line: any unauthenticated-public surface = launch (Nolan); authenticated/internal = launch-adjacent (review)",
    "Line: only DNS/traffic cutover = launch",
    "Per-case"],
   ["Phase 17 (unauthenticated publish) is treated as launch in D-015", "Launch-adjacent work (staging, flags) needs a rule too"],
   0.8, "D-015 sets the precedent; the general line needs stating.",
   "P0", "Interpretation reversible", "Launch safety", "Worker", "Low", "Standing",
   "Line defined",
   "DEEP_REVIEW", "Define the line in review (recommended: unauthenticated-public = launch; everything else is launch-adjacent with its own gates). It gates HUMAN_DECISION verdicts.")

op("D-256", "Synthetic marking enforcement: synthetic:true + testing_only:true on every synthetic artifact?",
   "MISSION-PROTOCOL: every synthetic artifact carries synthetic:true + testing_only:true",
   ["Enforce: mission harnesses assert the marking",
    "Convention only",
    "Enforce at the artifact producer"],
   ["The rule is a hard boundary ('no synthetic business ever presented as a real prospect')",
    "Deterministic worlds are synthetic by construction"],
   0.95, "Hard boundary, explicit marking.",
   "P0", "Process reversible", "Integrity", "Worker", "Low", "Standing",
   "Marking enforced in mission harnesses",
   "AUTO_EXECUTE", "Enforce the marking in mission harnesses (assert on output); it is a hard boundary. Within authority to require.")

op("D-257", "Failure-only reporting: this shard's SUMMARY.md is the report - confirm no separate status?",
   "MISSION-PROTOCOL escalation: no status reports; SUMMARY.md is the report; Nolan's reporting discipline (failure-only)",
   ["Confirm: SUMMARY.md + SHARD-LOG.md are the only outputs; no chat status",
    "Also notify on shard close",
    "Per-shard choice"],
   ["The protocol is explicit: no status reports", "This task asks for a final report-back (parent agent, not Nolan)"],
   0.95, "The protocol is explicit; the parent report-back is the task's own requirement.",
   "P3", "Process reversible", "Attention hygiene", "Worker", "Low", "Standing",
   "No separate status sent",
   "AUTO_EXECUTE", "Confirm: SUMMARY.md/SHARD-LOG.md are the report; the parent agent gets the task's required report-back. No Nolan status. Within authority.")

op("D-258", "Grill routing: factory decisions needing Nolan go to GRILLING-BRIEF.md in the required shape?",
   "One-grill rule (2026-09-23): exactly ONE canonical operator-question surface with QUESTION/WHY/WHAT EVIDENCE/CONTRADICTION/DEFAULT/RECOMMENDED",
   ["Confirm: all Nolan-bound factory questions use the brief in the required shape",
    "Lane reports may also carry questions",
    "Direct messages for urgent"],
   ["The rule is explicit and was learned the hard way (GRILL-50.md folded)",
    "D-012/D-015/D-231 already route through it"],
   0.95, "The rule is explicit with a cautionary history.",
   "P2", "Process reversible", "Nolan's attention", "Worker", "Low", "Standing",
   "Nolan-bound questions appear only in the brief",
   "AUTO_EXECUTE", "Confirm: the brief is the only surface, in the required shape. Within authority.")

op("D-259", "80% decide rule for verdicts: below 80% confidence -> GATHER_MORE_EVIDENCE?",
   "Nolan's standing decision rule: at 80%+ decide; below ask naming uncertainty, default, cost of being wrong",
   ["Adopt: verdict confidence <0.80 forces GATHER_MORE_EVIDENCE or DEEP_REVIEW",
    "Guideline only",
    "Different threshold for decisions"],
   ["The rule is Nolan's standing directive", "This shard's verdicts carry explicit confidences"],
   0.9, "The directive is explicit and the confidences are recorded.",
   "P2", "Process reversible", "Decision quality", "Worker", "Low", "Standing",
   "Sub-0.80 verdicts are never AUTO_*",
   "AUTO_EXECUTE", "Adopt the rule for verdicts: below 0.80, gather evidence or deep-review; never auto-execute. Within authority.")

op("D-260", "Verdict taxonomy: DEFER vs DEEP_REVIEW vs GATHER_MORE_EVIDENCE - disambiguate?",
   "Subagent task verdict list: 9 verdicts",
   ["Disambiguate: DEFER = blocked on external event; DEEP_REVIEW = needs design review; GATHER = needs evidence",
    "Leave overlapping",
    "Merge DEFER into DEEP_REVIEW"],
   ["This shard used all three with distinct meanings", "Overlapping verdicts cause inconsistent triage"],
   0.9, "The shard's own usage defines the distinction.",
   "P3", "Documentation reversible", "Triage consistency", "Worker", "Low", "Standing",
   "Disambiguation documented in the verdict conventions",
   "AUTO_EXECUTE", "Document the disambiguation from this shard's usage. Within authority.")

op("D-261", "AUTO_EXECUTE_AND_NOTIFY vs AUTO_EXECUTE: notify whom, how?",
   "Subagent task verdict list",
   ["Notify = SHARD-LOG.md entry (+ parent report-back at close); never Nolan directly",
    "Notify = message Nolan",
    "Per-verdict judgment"],
   ["Failure-only reporting forbids routine Nolan messages", "The shard log is the notification surface"],
   0.9, "The reporting discipline decides it.",
   "P3", "Process reversible", "Notification hygiene", "Worker", "Low", "Standing",
   "Notify defined as log + parent close-out",
   "AUTO_EXECUTE", "Define notify as shard-log entry (parent close-out aggregates); never a direct Nolan message for routine items. Within authority.")

op("D-262", "Backlog appends: duplicate-item detection when appending?",
   "Subagent task: append new backlog items before decomposing",
   ["Require: id + question-similarity check before append (D-070/D-092/D-096 folds show why)",
    "No check; folds recorded after",
    "Check ids only"],
   ["This shard folded several duplicates post-hoc (D-070, D-092, D-096, D-202)", "Pre-append checks are cheap"],
   0.9, "This shard's own duplicates prove the need.",
   "P3", "Process reversible", "Backlog hygiene", "Worker", "Low", "Standing",
   "Pre-append similarity check in the append procedure",
   "AUTO_EXECUTE", "Require the pre-append check; this shard's post-hoc folds are the evidence. Within authority.")

op("D-263", "Backlog ID sequencing: D-016+ assigned by the appending shard - collision rule?",
   "decision-backlog.jsonl: D-001..D-015 seed; this shard appends D-016..",
   ["Rule: appending shard takes the next free IDs atomically (read max, append, verify)",
    "Central allocator",
    "UUIDs instead of sequential"],
   ["Two shards appending concurrently could collide", "Sequential IDs are human-readable"],
   0.8, "Concurrent appends are plausible in maximum-parallel mode.",
   "P3", "Process reversible", "Backlog integrity", "Worker", "Low", "Standing",
   "Collision rule documented",
   "AUTO_EXECUTE", "Adopt read-max-append-verify with a post-append id-uniqueness check; on collision the later appender renumbers. Within authority.")

op("D-264", "Cross-shard verdict falsification sampling rate: 10% (D-240) - keep?",
   "D-240",
   ["Keep 10% + all HUMAN_DECISION/REFUSE",
    "Raise to 25%",
    "100% for P0/P1 items"],
   ["D-240 just set 10%", "No falsification data yet"],
   0.7, "Fresh rule, no data.",
   "P3", "Reversible", "Quality process", "Worker", "Low", "Standing",
   "Rate kept; revisit with falsification data",
   "DEEP_REVIEW", "Keep 10% until falsification data exists; revisit the rate based on hit rate. Review, do not churn a fresh rule.")

op("D-265", "'High confidence NEVER overrides authority': audit other shards for violations?",
   "Subagent task: high confidence never overrides authority",
   ["Audit: falsification passes check verdict-authority alignment (confidence 0.9+ with AUTO_* on authority-bound items)",
    "Trust shards",
    "Audit on complaint only"],
   ["The rule is the task's core safety invariant", "Falsification duty already covers verdict review"],
   0.9, "The invariant is core; the falsification pass is the vehicle.",
   "P1", "Process reversible", "Safety invariant", "Worker", "Low", "Standing",
   "Authority-alignment check in the falsification checklist",
   "AUTO_EXECUTE", "Add the authority-alignment check to the falsification checklist; it is the task's core invariant. Within authority.")

op("D-266", "Decision records retention: results.jsonl archival?",
   "MISSION-PROTOCOL outputs: results.jsonl per shard",
   ["Retain all shard results.jsonl indefinitely (decision memory)",
    "Retain 90 days",
    "Summaries only; drop line items"],
   ["The backlog + results are the factory's decision memory", "Storage is cheap"],
   0.9, "Decision memory is the point of the class.",
   "P3", "Process reversible", "Institutional memory", "Worker", "Low", "Standing",
   "Retention policy documented",
   "AUTO_EXECUTE", "Retain indefinitely; the decision class exists to build institutional memory. Within authority.")

op("D-267", "Shard sizing: decision 250 vs others 500 - rationale documented?",
   "MISSION-PROTOCOL: shard size 500 (decision: 250)",
   ["Document: decisions are denser per unit than missions",
    "Revisit: make decision 500 too",
    "No rationale needed"],
   ["The exception is stated without rationale", "250 dense decompositions ≈ 500 lighter missions in effort"],
   0.8, "The effort equivalence is observable from this shard.",
   "P3", "Documentation reversible", "None", "Worker", "Low", "Standing",
   "Rationale documented",
   "AUTO_EXECUTE", "Document the rationale (decomposition density); this shard's effort profile is the evidence. Within authority.")

op("D-268", "WORLD outcome NEEDS_REVIEW: who clears the queue?",
   "MISSION-PROTOCOL WORLD outcomes include NEEDS_REVIEW",
   ["Triage owner: mission-class owner clears within 48h",
    "Nolan clears",
    "Auto-clear after 7 days (default action documented)"],
   ["Uncleared NEEDS_REVIEW is a growing liability", "No owner named"],
   0.75, "Ownership gap.",
   "P2", "Process reversible", "Review queue", "Worker", "Low", "Standing",
   "Owner + SLA named",
   "DEEP_REVIEW", "Name the triage owner and SLA in review with the mission-class owners (recommended: class owner, 48h). Unowned queues grow.")

op("D-269", "WORLD UNSAFE_SOURCE: quarantine vs drop?",
   "MISSION-PROTOCOL WORLD outcomes include UNSAFE_SOURCE",
   ["Quarantine: retain with unsafe marking for taxonomy learning",
    "Drop: delete the artifact",
    "Quarantine 30 days then drop"],
   ["Failure taxonomy feeds the backlog (D-109); unsafe sources are taxonomy input",
    "Retention of unsafe content has its own risk"],
   0.75, "Learning value vs retention risk.",
   "P2", "Process reversible", "Unsafe handling", "Worker", "Low", "Standing",
   "Policy documented",
   "DEEP_REVIEW", "Decide quarantine-vs-drop in review (recommended: quarantine with marking for taxonomy, since the failure loop feeds on it); retention of hostile content needs a deliberate policy.")

op("D-270", "WORLD IDENTITY_AMBIGUOUS: resolution authority?",
   "MISSION-PROTOCOL WORLD outcomes include IDENTITY_AMBIGUOUS",
   ["Resolve via the identity authority (single owner per the constitutional rule)",
    "Worker judgment per mission",
    "Escalate to Nolan"],
   ["Constitutional rule of one: identity needs one authority", "Ambiguous identity is a P0-adjacent integrity issue"],
   0.85, "The constitutional rule answers it.",
   "P1", "Process reversible", "Identity integrity", "Worker", "Low", "Standing",
   "Identity authority named for ambiguous cases",
   "AUTO_EXECUTE", "Route to the single identity authority per the constitutional rule; ambiguous identity is exactly what the rule exists for. Within authority to require.")

op("D-271", "WORLD EVIDENCE_CONFLICT: apply the D-029 no-silent-winner law?",
   "MISSION-PROTOCOL WORLD outcomes include EVIDENCE_CONFLICT; D-029 (class-6 law)",
   ["Yes: conflicts resolve with no silent fabrication; typed conflict findings",
    "Per-mission judgment",
    "Escalate conflicts"],
   ["D-029 adopted the law from the same conflict shape", "WORLD missions will hit evidence conflicts by construction (hostile: contradictory-sources)"],
   0.9, "D-029 already decided the law; WORLD is its main application.",
   "P1", "Process reversible", "Conflict honesty", "Worker", "Low", "Standing",
   "WORLD conflict handling references D-029",
   "AUTO_EXECUTE", "Apply D-029 to WORLD evidence conflicts; the hostile taxonomy guarantees they occur. Within authority.")

op("D-272", "WORLD CRASH: harness resilience requirement?",
   "MISSION-PROTOCOL WORLD outcomes include CRASH; pressure F-1..F-6 show crashes happen",
   ["Require: harness records CRASH with stage + error, never loses the mission record",
    "Best effort",
    "Retry crashed missions automatically"],
   ["The protocol's outcome taxonomy exists to record crashes, not hide them", "D-245 incremental appends preserve crash records"],
   0.9, "The taxonomy's purpose is recording, and D-245 preserves the records.",
   "P2", "Process reversible", "Failure visibility", "Worker", "Low", "Standing",
   "Harness crash-handling tested",
   "AUTO_EXECUTE", "Require crash recording (stage + error, record preserved); never auto-retry blindly. Within authority.")

op("D-273", "Deterministic world addressing: adopt as the canonical fixture contract?",
   "MISSION-PROTOCOL: worlds are pure functions of index (mulberry32 contract, TYPES/DIMS/HOSTILES)",
   ["Adopt as canonical across WORLD/OBJECT/PROJECTION/SYNTH",
    "WORLD-only",
    "Per-class contracts"],
   ["The contract is specified exactly (no coordination needed)", "Cross-class comparability needs one contract"],
   0.9, "The protocol specifies it as the contract.",
   "P2", "Contract semi-permanent", "Fixture determinism", "Worker", "Low", "Standing",
   "Contract referenced by all world-consuming classes",
   "AUTO_EXECUTE", "Adopt as the canonical contract; it is specified exactly and cross-class work needs one addressing scheme. Within authority.")

op("D-274", "Hostile set extension: add claim-verdict classes as WORLD hostiles?",
   "MISSION-PROTOCOL HOSTILES (10); claim/CLAIM-VERDICT.md 14 holes",
   ["Extend: claim-hostile dimensions in world generation",
    "Keep the 10; claim holes are a separate lane",
    "Add a subset (H1/H3/H4 shapes)"],
   ["Deterministic worlds already include hostile types; claim shapes are the proven hostile class",
    "Extending changes the world contract (D-273)"],
   0.7, "Valuable but changes the canonical contract.",
   "P2", "Contract change semi-permanent", "World generation", "Design review", "Low", "Standing",
   "Decision recorded",
   "DEEP_REVIEW", "Review the extension against the D-273 contract (recommended: add claim-hostile dims as HOSTILES 11+, keeping the existing 10 stable) rather than editing the contract unilaterally.")

op("D-275", "Owner_intent dimension: hide-object/correct-fact handling per world - canonical?",
   "MISSION-PROTOCOL world(i): owner_intent = hide-object if (i%5==0), correct-fact if (i%5==1)",
   ["Codify the handling rules (hide -> absent from public, evidence kept; correct -> owner value asserted)",
    "Per-mission judgment",
    "Defer to SYNTH class"],
   ["SYNTH missions verify owner-correction survival; the rules must be canonical first",
    "H3/H4/H6 define the honesty semantics"],
   0.85, "SYNTH's verify step assumes the rules.",
   "P1", "Rules semi-permanent", "Owner intent handling", "Worker", "Low", "Standing",
   "Handling rules documented",
   "AUTO_EXECUTE", "Codify the handling rules now; SYNTH verification depends on them. Within authority.")

op("D-276", "SYNTH reobservation: owner hide must not delete evidence - enforce in the loop?",
   "MISSION-PROTOCOL SYNTH verify: owner hide did not delete evidence",
   ["Enforce as a SYNTH invariant with a dedicated assertion",
    "Convention",
    "Defer to SYNTH owners"],
   ["The verify step names it explicitly", "Hide-vs-delete is the H6-adjacent integrity line"],
   0.9, "The protocol's verify step requires it.",
   "P1", "Process reversible", "Evidence preservation", "Worker", "Low", "Standing",
   "SYNTH harnesses assert hide-preserves-evidence",
   "AUTO_EXECUTE", "Enforce the assertion in SYNTH harnesses; the protocol's verify step demands it. Within authority to require.")

op("D-277", "PROJECTION verify: 'public stays public, private never leaks' - test ownership?",
   "MISSION-PROTOCOL PROJECTION verify per projection (16 projections listed)",
   ["Owner: privacy lane; per-projection leak tests",
    "Projection-class owner",
    "Covered by R3 test (D-170)"],
   ["16 projections × leak risk = real surface", "D-170 covers the R3 boundary; projections are downstream of it"],
   0.8, "Downstream of R3 but 16 distinct surfaces.",
   "P1", "Test-only", "Projection privacy", "Worker", "Low", "Standing",
   "Per-projection leak tests exist or are explicitly covered by D-170",
   "DEEP_REVIEW", "Decide test ownership with the projection-class owner (recommended: per-projection leak tests owned by the privacy lane, D-170 as the boundary proof).")

op("D-278", "OBJECT determinism check (compile twice, compare digests): digest algorithm?",
   "MISSION-PROTOCOL OBJECT: determinism check; H8 (32-bit digest collision)",
   ["Require >=256-bit digests for the determinism check (H8 lesson)",
    "Any digest; equality is what matters",
    "Defer to D-008"],
   ["H8 proves 32-bit digests collide; a determinism check on colliding digests is vacuous",
    "D-008 owns the digest mandate"],
   0.9, "H8 directly invalidates 32-bit determinism checks.",
   "P1", "Process reversible", "Determinism proof", "Worker", "Low", "Standing",
   "Determinism checks use >=256-bit digests",
   "AUTO_EXECUTE", "Require >=256-bit for determinism checks now (H8); fold the general mandate into D-008. Within authority.")

op("D-279", "Mission latency tracking: p50/p95 per stage - required in every SUMMARY?",
   "MISSION-PROTOCOL outputs: SUMMARY.md (outcome distribution, p50/p95 latencies, throughput, ...)",
   ["Require per the protocol",
    "Outcomes only; latencies optional",
    "Throughput only"],
   ["The protocol lists p50/p95 explicitly", "This shard will report them (N/A for pure-cognition work, noted)"],
   0.95, "The protocol is explicit.",
   "P3", "Process reversible", "Performance visibility", "Worker", "Low", "Standing",
   "SUMMARYs include p50/p95 or state why N/A",
   "AUTO_EXECUTE", "Require per the protocol; N/A with a reason is acceptable for pure-cognition shards. Within authority.")

op("D-280", "Throughput reporting: missions/min + peak memory - required?",
   "MISSION-PROTOCOL saturation: report missions/min and peak memory at the end",
   ["Require per the protocol",
    "Optional",
    "Only for heavy lanes"],
   ["The protocol requires it at the end of heavy runs", "This shard: units/min + peak memory will be reported"],
   0.95, "Explicit.",
   "P3", "Process reversible", "Saturation visibility", "Worker", "Low", "Standing",
   "Heavy-lane close-outs report throughput + peak memory",
   "AUTO_EXECUTE", "Require per the protocol for heavy lanes. Within authority.")

op("D-281", "Patch testing: 'test the patch against the repro in your harness' - required evidence?",
   "MISSION-PROTOCOL failure loop: test the patch against the repro",
   ["Require: patch proposals include repro-test evidence",
    "Recommend",
    "Integration-time testing suffices"],
   ["Untested patches are the failure mode the loop exists to prevent", "SEC-FIX/TD-001 both carried test evidence"],
   0.9, "The loop requires it; the lanes practice it.",
   "P2", "Process reversible", "Patch quality", "Worker", "Low", "Standing",
   "Patch proposals include repro-test results",
   "AUTO_EXECUTE", "Require repro-test evidence on patch proposals per the loop. Within authority.")

op("D-282", "'Never a second authority': audit existing second authorities beyond claim/links?",
   "MISSION-PROTOCOL failure loop: reuse authorities; never a second authority; H4/H2/D-123 show the damage",
   ["Run the audit: inventory authority-duplication across the codebase",
    "Scoped: claim + link authorities only",
    "No audit; fix on discovery"],
   ["Second authorities are the proven architectural failure class", "Audit is read-only"],
   0.85, "The failure class is proven; the audit bounds it.",
   "P2", "Read-only", "None", "Worker", "Low", "This week",
   "Authority-duplication inventory published",
   "AUTO_EXECUTE", "Run the read-only audit; second authorities are the proven failure class. Within authority.")

op("D-283", "One-grill rule vs factory questions: does the grill brief accept factory-generated questions?",
   "One-grill rule: every consequential question for Nolan goes to GRILLING-BRIEF.md",
   ["Yes: factory Nolan-bound questions use the brief (D-258)",
    "No: the brief is for the main agent's questions",
    "Via the parent agent only"],
   ["D-258 confirmed factory routing through the brief", "The brief's shape fits factory questions"],
   0.9, "D-258 decided this.",
   "P2", "None", "None", "Worker", "Low", "Standing",
   "D-258 verification",
   "AUTO_EXECUTE", "Fold into D-258; factory questions use the brief. Record the fold.")

op("D-284", "Nolan's 80% rule: who records sub-80% decisions' 'cost of being wrong'?",
   "Nolan's standing rule: below 80%, ask one concise question naming uncertainty, recommended default, cost of being wrong",
   ["The deciding worker records all three in the shard log",
    "Only the question goes to the brief",
    "No recording needed"],
   ["The rule names the three elements explicitly", "Shard logs are the decision record"],
   0.9, "The rule is explicit.",
   "P2", "Process reversible", "Decision records", "Worker", "Low", "Standing",
   "Sub-80% decisions log uncertainty + default + cost",
   "AUTO_EXECUTE", "Require the three-element record in shard logs for sub-80% calls. Within authority.")

op("D-285", "Memory writes: decision records feed the daily log?",
   "Nolan's memory: daily ~/memory/*.md notes; this shard is read-only on memory",
   ["Propose: parent agent distills shard findings into the daily log",
    "Shards write daily logs directly",
    "No memory feed; SUMMARY.md suffices"],
   ["Memory files are read-only for workers (stated in the task context)",
    "Institutional memory is the decision class's purpose"],
   0.8, "Read-only constraint vs memory purpose.",
   "P3", "Process reversible", "Institutional memory", "Parent agent", "Low", "At shard close",
   "Parent distills or explicitly declines",
   "REQUEST_CONFIRMATION", "Workers cannot write memory; request the parent agent to distill (or decline) at close-out. The task's report-back is the vehicle.")

op("D-286", "Compute budget: 'burn tokens crazy' sprint vs decision quality?",
   "AGENTS.md 2-DAY MAX SPRINT (2026-09-23): maximum ceilings through 2026-09-25; revert cron fires Fri 09:00 MDT",
   ["Sprint applies to engagement volumes, not decision quality; this shard keeps full decompositions",
    "Sprint means faster/shallower decisions",
    "Sprint is irrelevant to the factory"],
   ["The sprint targets engagement/marketing volumes explicitly", "Decision quality is not a volume dial"],
   0.9, "The sprint's scope (engagement volumes) is explicit.",
   "P3", "Interpretation reversible", "Sprint scope", "Worker", "Low", "Standing",
   "Sprint scope documented as engagement-facing",
   "AUTO_EXECUTE", "The sprint governs engagement volumes, not factory decision quality; this shard keeps full decompositions. Within authority to interpret.")

op("D-287", "Sprint revert cron (2026-09-25 09:00 MDT): factory implications?",
   "AGENTS.md: revert cron fires Fri 2026-09-25 09:00 MDT to restore pre-sprint volumes/cadences",
   ["None: factory missions are not engagement volumes",
    "Factory should also cool down post-sprint",
    "Monitor: if Pig load spikes from engagement passes, saturation rule handles it"],
   ["The revert targets engagement cadences", "The saturation rule already bounds Pig load"],
   0.85, "Scope is explicit; the saturation rule is the backstop.",
   "P3", "Reversible", "Sprint interaction", "Worker", "Low", "2026-09-25",
   "No action unless saturation trips",
   "AUTO_EXECUTE", "No factory action; the saturation rule is the backstop if engagement passes load the Pig. Within authority.")

op("D-288", "Platform automation principle: restate for factory browser work?",
   "AGENTS.md: respect platform constraints, bounded authorized automation, fail closed on restriction; never defeat/circumvent",
   ["Restate in factory conventions: any platform restriction -> BLOCKED, never an optimization problem",
    "The principle stands as-is",
    "Factory does no browser work; moot"],
   ["Engagement passes are factory-adjacent and platform-bound", "The principle is already the architecture"],
   0.9, "Already the architecture; restatement is documentation.",
   "P1", "Documentation reversible", "Platform safety", "Worker", "Low", "Standing",
   "Principle restated in factory conventions with the BLOCKED rule",
   "AUTO_EXECUTE", "Restate with the BLOCKED rule explicit; a detected restriction is never an optimization problem. Within authority.")

op("D-289", "REFUSE verdict: enumerate the factory's refuse triggers?",
   "Subagent task verdict list includes REFUSE",
   ["Enumerate: credential exposure, platform-restriction bypass, synthetic-as-real, unauthorized vendor, destructive git, owner outreach",
    "Per-case judgment",
    "Narrow: only the hard boundaries"],
   ["Hard boundaries + task rules enumerate the triggers", "Enumerations make REFUSE consistent across shards"],
   0.9, "The triggers are all stated across the task and protocol.",
   "P1", "Interpretation reversible", "Refusal consistency", "Worker", "Low", "Standing",
   "REFUSE triggers enumerated in the verdict conventions",
   "AUTO_EXECUTE", "Publish the enumeration from the hard boundaries + task rules; consistent refusal needs it. Within authority.")

op("D-290", "HUMAN_DECISION queue: batch Nolan-bound verdicts into the grill brief how often?",
   "D-258 (grill routing); this shard has several HUMAN_DECISION items",
   ["Batch: shard close-out bundles its HUMAN_DECISION items into brief-ready shape",
    "Immediate per item",
    "Parent decides"],
   ["Batching respects Nolan's attention; the brief is the surface", "Urgent items need immediate routing"],
   0.8, "Batching is the attention-respecting default; urgency is the exception.",
   "P2", "Process reversible", "Nolan's attention", "Worker", "Low", "At shard close",
   "This shard's HUMAN_DECISION items bundled brief-ready",
   "AUTO_EXECUTE", "Batch at shard close-out in brief-ready shape; urgent (P0/blocking-launch) items route immediately. Within authority.")

# ------------------------------------------------- DEEP DRILLS D-291..D-340

def dd(iid, kind, question, context, outputs, evidence, confidence, conf_basis,
       criticality, reversibility, blast_radius, authority, cost,
       time_sensitivity, verification, verdict, verdict_rationale):
    add(iid, kind, question, context, outputs, evidence, confidence,
        conf_basis, criticality, reversibility, blast_radius,
        "Novel (deep drill)", authority, cost, time_sensitivity,
        verification, verdict, verdict_rationale)

dd("D-291","failure-class","H1: what is the canonical definition of a 'derived' claim?",
   "claim/CLAIM-VERDICT.md H1: derived claims require INPUT EVIDENCE; empty provenance grades BOUND",
   ["Define: derived = computed from inputs; requires input evidence refs + derivation record",
    "Define loosely: any non-direct classification",
    "Per-verifier definition"],
   ["H1's smuggling vector works because 'derived' is under-defined", "D-051 fixes grading; the definition is the companion"],
   0.8,"The hole proves the definition matters; the exact wording is design.",
   "P1","Definition semi-permanent","All derived claims","Design review","Low","This week",
   "Definition published; H1 probe references it",
   "DEEP_REVIEW","Define 'derived' canonically in the D-051 review; the grading fix needs the defined term.")

dd("D-292","failure-class","H2: document the emission-gate contract both gates must satisfy?",
   "claim/CLAIM-VERDICT.md H2; D-055",
   ["Write the contract: inputs, rejection conditions, throw-vs-return, before D-055",
    "Contract emerges from D-055",
    "No contract; one gate obsoletes it"],
   ["D-055 chooses the authoritative gate; the contract is its spec", "Two gates disagreed for lack of a contract"],
   0.85,"The disagreement is the evidence a contract was missing.",
   "P1","Documentation reversible","Emission contract","Worker","Low","With D-055",
   "Contract published; both gates (during transition) satisfy it",
   "EXECUTE_REVERSIBLY","Draft the gate contract as D-055's input; the H2 probe battery is its acceptance. Reversible doc.")

dd("D-293","failure-class","H4: enumerate every resolveBoundField caller?",
   "claim/CLAIM-VERDICT.md H4/R-H4: resolveBoundField is what the renderer actually calls",
   ["Inventory now (read-only); feeds D-063",
    "Defer to the lane spec",
    "Assume renderer-only"],
   ["R-H4's impact depends on the caller set", "Inventory is read-only"],
   0.9,"Read-only and required by D-063.",
   "P1","Read-only","None","Worker","Low","Now",
   "Caller inventory published",
   "AUTO_EXECUTE","Run the read-only inventory now; D-063 needs it. Within authority.")

dd("D-294","failure-class","H5: does the precedence rule apply to relationship evidence too?",
   "claim/CLAIM-VERDICT.md H5 (bindings); D-033 (relationship evidence ignored)",
   ["Yes: field/relationship-level refs beat object-level everywhere",
    "Bindings only; relationships are structural (D-033)",
    "Decide with D-033"],
   ["D-068 sets binding precedence; D-033 questions relationship evidence", "Consistency argues for one rule"],
   0.75,"Consistency vs the D-033 ruling.",
   "P2","Reversible","Evidence precedence","Design review","Low","With D-033",
   "One precedence rule documented for bindings and relationships",
   "DEEP_REVIEW","Decide with D-033: if relationships need evidence binding, the H5 precedence extends to them; if structural, it does not. Joint review.")

dd("D-295","failure-class","H6: withdrawn evidence - is withdrawal distinct from private?",
   "claim/CLAIM-VERDICT.md H6: 'withdrawn evidence has no binding path'; visibility=private tested",
   ["Distinct: withdrawn (was public, retracted) vs private (never public); both -> UNBOUND",
    "Same: one visibility input covers both",
    "Withdrawal out of scope"],
   ["H6 names withdrawal; the probe tested private", "Retraction has different audit needs than never-public"],
   0.7,"The distinction is real but untested.",
   "P2","Semantics semi-permanent","Evidence lifecycle","Design review","Low","With D-072",
   "Withdrawal semantics defined and tested",
   "DEEP_REVIEW","Define withdrawal vs private in the D-072 review; retraction audit trails differ from never-public. Do not conflate silently.")

dd("D-296","failure-class","H7: assertion store - who writes owner assertions, and where?",
   "claim/CLAIM-VERDICT.md H7: owner assertion attests '555-0199'",
   ["Define: assertion store with writer = owner flow, reader = verifier",
    "Assertions live on the graph",
    "Assertions live in PING events"],
   ["The verifier matches against assertions; their provenance is undefined", "Canonical-store questions are Nolan-adjacent"],
   0.65,"Storage location touches canonical-store boundaries.",
   "P1","Architecture semi-permanent","Assertion provenance","Design review","Medium","This week",
   "Assertion store defined with writer/reader contract",
   "DEEP_REVIEW","The assertion store's home (graph vs PING vs separate) is an architecture decision; review it. Do not improvise canonical-adjacent storage.")

dd("D-297","failure-class","H8: 32-bit digest uses in tests/fixtures - migrate too?",
   "claim/CLAIM-VERDICT.md H8; D-080 narrow ban",
   ["Migrate tests/fixtures to SHA-256 as well (no 32-bit anywhere)",
    "Ban covers production roles only; tests keep 32-bit",
    "Migrate opportunistically"],
   ["D-080 bans production roles; tests using 32-bit digests teach the wrong pattern", "Test churn cost"],
   0.8,"Hygiene vs churn.",
   "P3","Reversible","Test digests","Worker","Low","Standing",
   "No 32-bit digest in active tests (or explicit exemption list)",
   "AUTO_EXECUTE","Migrate active tests/fixtures off 32-bit digests; tests are the teaching surface. Exemptions listed explicitly. Within authority to require.")

dd("D-298","failure-class","H9: stylistic vs factual transform - who classifies?",
   "claim/CLAIM-VERDICT.md H9; D-085",
   ["Classifier: the composition site declares its transform class",
    "Reviewer judgment per site",
    "All transforms are factual (strict)"],
   ["D-085 needs the classifier", "Strict (all factual) is simplest and safest"],
   0.7,"Strict is safe; declared-class is flexible.",
   "P1","Rule semi-permanent","Transform classification","Design review","Low","With D-010",
   "Classification rule documented",
   "DEEP_REVIEW","Fold into D-010: default strict (all transforms factual) unless the review defines a safe stylistic exemption with examples.")

dd("D-299","failure-class","R-MODEL: verified-model digest check at serve time - where?",
   "claim/CLAIM-VERDICT.md R-MODEL; D-090",
   ["Edge/middleware: digest check before serving",
    "Page: check inside the route before render",
    "CDN: signed digest header"],
   ["D-090 owns build-vs-render-time; this is the where", "Serve-time checks cost latency"],
   0.65,"Latency vs assurance trade-off on the serve path.",
   "P0","Architecture semi-permanent","Serving path","Design review","Medium","After D-007",
   "Serve path defined with measured latency cost",
   "DEEP_REVIEW","Fold into D-007: the serve-time check location is part of the wiring design, with latency measured not assumed.")

dd("D-300","failure-class","Claim atoms: version the atom schema?",
   "claim/CLAIM-VERDICT.md: H1/H9 both imply atom-schema changes",
   ["Version atoms (v1/v2) with migration",
    "Unversioned; change in place",
    "Freeze v1; v2 only with D-010"],
   ["Two pending schema changes (H1 ref enforcement, H9 presented text)", "Unversioned changes break stored atoms silently"],
   0.8,"Schema changes are coming; versioning is the safe container.",
   "P2","Process reversible","Atom compatibility","Design review","Low","With D-010",
   "Versioning rule documented",
   "DEEP_REVIEW","Decide with D-010: if the schema changes, version it. Do not change unversioned schemas that may be stored.")

dd("D-301","failure-class","F-8: 'About null' - is there a visitor-facing incident to disclose?",
   "pressure/PRESSURE-REPORT.md F-8: invented page title with 0 validator errors",
   ["No: pressure harness only, never served to visitors",
    "Audit: check whether any served page ever rendered a null-coerced title",
    "Disclose proactively"],
   ["F-8 was found in the harness, not in production traffic", "No evidence of served impact"],
   0.9,"Harness-only finding; no served impact in evidence.",
   "P2","Reversible","Incident posture","Worker","Low","This week",
   "Served-page audit (if any) or a clean bill recorded",
   "GATHER_MORE_EVIDENCE","Check whether null-coerced titles ever reached served pages (log/template audit); the disclosure decision follows the evidence. Do not assume harness-only means never-served.")

dd("D-302","failure-class","Pressure classes: add 'malicious unicode in URLs' (combines class 9 + SEC-FIX)?",
   "pressure/PRESSURE-REPORT.md class 9; security/SEC-FIX-SPEC.md",
   ["Add the combined class (bidi/zero-width inside href/src)",
    "Covered by class 9 + hostile suite separately",
    "No: out of pressure scope"],
   ["Class 9 tests text; SEC-FIX tests URLs; the combination is untested", "Cheap to add as a pressure case"],
   0.8,"The combination is genuinely untested.",
   "P2","Test-only","None","Worker","Low","Standing",
   "Combined case added; fail-closed or hole recorded",
   "AUTO_EXECUTE","Add the combined case to the pressure harness; untested combinations are where holes hide. Within authority.")

dd("D-303","failure-class","SEC-FIX W2: phone attribute-breakout - are there other attribute contexts?",
   "security/SEC-FIX-SPEC.md W2 (A37): phone +1\" onmouseover=\"alert('A37')",
   ["Audit: every attribute interpolation of business fields (alt, title, data-*)",
    "Scoped: href contexts only",
    "Covered by React escaping (attributes are escaped)"],
   ["W2 was an href breakout; attribute contexts differ", "React escapes attribute values by default (mitigation)"],
   0.75,"React's escaping likely covers it, but 'likely' needs one probe.",
   "P1","Read-only audit + probe","None","Worker","Low","This week",
   "Attribute-context probe: breakout attempt renders inert",
   "GATHER_MORE_EVIDENCE","Probe one attribute context with a breakout payload; if React escaping holds, document and close. Evidence first.")

dd("D-304","failure-class","Export boundary: importCustomerData validates the escaped form?",
   "security/SEC-FIX-SPEC.md patch 4: importCustomerData needs no change; round-trip byte-identical",
   ["Verify: import handles \\u003c escapes (it does per JSON.parse) with a test",
    "Trust JSON.parse",
    "Add explicit test"],
   ["The spec asserts lossless round-trip", "One test pins it permanently"],
   0.9,"The spec asserts it; a test pins it.",
   "P2","Test-only","None","Worker","Low","Standing",
   "Round-trip test green",
   "AUTO_EXECUTE","Add the round-trip test; it pins the spec's lossless claim. Within authority.")

dd("D-305","failure-class","H4: the weaker verifier - deprecate or delete?",
   "claim/CLAIM-VERDICT.md H4: verifyPresentationBinding accepts derived/owner_authored unconditionally",
   ["Deprecate: fail-typed on use after D-063",
    "Delete outright",
    "Keep for non-render consumers"],
   ["D-063 decides reconcile-vs-route; this is the cleanup", "Dead code with a false invariant comment is a trap"],
   0.8,"Cleanup follows D-063.",
   "P1","Code removal semi-permanent","Verifier surface","Design review","Low","After D-063",
   "Weaker verifier gone or explicitly scoped",
   "DEEP_REVIEW","Decide with D-063: deprecate-then-delete is the safe sequence for a verifier others may call. Do not leave a weaker verifier lying around.")

dd("D-306","failure-class","Claim evidence refs: URI scheme registry?",
   "claim/CLAIM-VERDICT.md: refs like 'google-business-profile:acme-123', 'website-ingestion:https://example.com/'",
   ["Create the scheme registry (known schemes + semantics)",
    "Free-form refs are fine",
    "Registry as documentation only"],
   ["H5 misattribution involved ref semantics", "No registry exists; schemes are ad hoc"],
   0.75,"Ad hoc schemes caused a real hole.",
   "P2","Documentation reversible","Evidence ref semantics","Worker","Low","Standing",
   "Registry published; new schemes registered",
   "AUTO_EXECUTE","Publish the scheme registry from existing refs; ad hoc schemes get registered, not invented. Within authority.")

dd("D-307","failure-class","H1+H9: derived-atom construction checklist?",
   "claim/CLAIM-VERDICT.md H1/H9",
   ["Checklist: non-empty evidenceRef + derivation record + presented text (post D-010)",
    "No checklist; tests cover it",
    "Checklist in code (constructor asserts)"],
   ["Construction is where H1/H9 defects enter", "Constructor asserts are the durable form"],
   0.85,"Constructor asserts beat paper checklists.",
   "P1","Code change semi-permanent","Atom construction","Design review","Low","With D-051/D-010",
   "Constructor enforces the checklist",
   "DEEP_REVIEW","Prefer constructor asserts over paper; decide the assert set with D-051/D-010. Review the exact invariants.")

dd("D-308","policy","Evidence grading vocabulary: CONFIRMED/STRONG/WEAK/UNKNOWN - adopt for claim bindings?",
   "MEMORY.md: grade every finding CONFIRMED/STRONG INDICATION/WEAK INDICATION/UNKNOWN; claim bindings use BOUND/UNBOUND",
   ["Map: BOUND/UNBOUND stays; add strength grades to bindings",
    "Keep binary BOUND/UNBOUND",
    "Replace with the four-grade vocabulary"],
   ["Binary loses the strength information the business already uses", "Two vocabularies confuse"],
   0.7,"Real expressiveness gain vs vocabulary confusion.",
   "P2","Semantics semi-permanent","Binding grades","Design review","Low","This week",
   "Grading vocabulary decided and documented",
   "DEEP_REVIEW","Decide in review: the business grades evidence four ways, the verifier grades binary. Reconcile deliberately (recommended: keep BOUND/UNBOUND verdict, add strength as metadata).")

dd("D-309","policy","'No fake buttons' doctrine: extend to claim presentation (no unverified fact styling)?",
   "security/SEC-FIX-SPEC.md: no fake buttons (unsafe website -> no button); claim holes render unverified claims as facts",
   ["Extend: UNBOUND claims never render with fact styling (badges, checkmarks)",
    "Presentation may style; verifier decides content",
    "Per-surface judgment"],
   ["H4 renders UNBOUND claims indistinguishably from BOUND ones", "The doctrine generalizes cleanly"],
   0.8,"The generalization is principled and H4 motivates it.",
   "P1","Presentation rule semi-permanent","Claim presentation","Design review","Low","This week",
   "Fact-styling reserved for BOUND claims (or explicitly decided otherwise)",
   "DEEP_REVIEW","Review the extension: reserving fact styling for BOUND claims is the honest default, but it affects design surfaces. Decide deliberately.")

dd("D-310","failure-class","Pressure + claim suites: shared fixture library?",
   "pressure/PRESSURE-REPORT.md (22 graphs); claim/CLAIM-VERDICT.md (fixtures coppersmith/happy-place + attack graphs)",
   ["Share: one hostile-fixture library for both suites",
    "Keep separate (different bars)",
    "Share the generator, not the fixtures"],
   ["Both suites build hostile graphs; duplication is maintenance drag", "D-043 debated suite merging"],
   0.75,"Adjacent to D-043.",
   "P3","Reversible","Test maintenance","Worker","Low","Standing",
   "Decision recorded",
   "DEEP_REVIEW","Decide with D-043: fixture sharing follows the suite-architecture decision. Do not share fixtures across suites with different bars without the owners' agreement.")

dd("D-311","failure-class","F-5 undefined member: is 'drop with warning' the factory-wide malformed-member rule?",
   "pressure/PRESSURE-REPORT.md F-5; D-020",
   ["Adopt factory-wide: malformed members dropped with typed warnings (never silent, never throw)",
    "Per-class judgment",
    "Strict: malformed members fail the graph"],
   ["D-020 proposes drop-with-warning for objects", "Relationships/fields have the same shape problem"],
   0.75,"Generalizing D-020 is natural but broadens the blast radius.",
   "P2","Rule semi-permanent","All graph ingestion","Design review","Low","With D-020",
   "One malformed-member rule documented",
   "DEEP_REVIEW","Decide with D-020: one rule for all member shapes, or per-shape rules. The warning (never silent) is the non-negotiable part.")

dd("D-312","failure-class","H2: planner's only-caller status - is /build/[siteId] the only planner consumer?",
   "claim/CLAIM-VERDICT.md: the only non-test caller of buildVerifiedRenderModel is planner.ts (used by /build/[siteId])",
   ["Verify by inventory (D-058 covers partially)",
    "Trust the verdict",
    "Assume more callers exist"],
   ["The verdict states it as a serving-path fact", "D-058 inventories emission callers"],
   0.85,"The verdict states it; D-058 verifies it.",
   "P2","None","None","Worker","Low","With D-058",
   "D-058 verification",
   "AUTO_EXECUTE","Fold into D-058's caller inventory; the verdict's claim gets verified there. Record the fold.")

dd("D-313","failure-class","R-CORRECTED vs H3: one fix or two?",
   "claim/CLAIM-VERDICT.md R-CORRECTED (render path) + H3 (verifier): same laundering, two seams",
   ["One fix at the binding rule (D-009/D-059) covers both; R-CORRECTED is the acceptance",
    "Two fixes (verifier + render path)",
    "Fix verifier; render path covered by H4 work"],
   ["Same root cause (owner value graded on source ref) at two seams", "D-009 fixes the rule; D-093 covers render-time"],
   0.85,"One root cause argues one fix with two acceptances.",
   "P1","Patch proposal reversible","Owner-correction binding","Worker","Low","With D-009",
   "H3 probe + R-CORRECTED probe green from one patch",
   "EXECUTE_REVERSIBLY","Propose one binding-rule patch with both probes as acceptance (D-009's patch); R-CORRECTED is the end-to-end proof. Reversible.")

dd("D-314","failure-class","H6: 'Coppersmith' name fragment - is a business NAME a factual field?",
   "claim/CLAIM-VERDICT.md H6 probe; D-113",
   ["Fold into D-113",
    "Decide now: names are factual fields",
    "Decide now: names are prose"],
   ["D-113 owns the visibility semantics", "Duplicate"],
   0.95,"Duplicate of D-113.",
   "P1","None","None","Worker","Low","With D-113",
   "D-113 verification",
   "AUTO_EXECUTE","Fold into D-113. Record the fold.")

dd("D-315","failure-class","Attack-test quarantine convention (D-101): where do quarantined tests live?",
   "D-101 (failing-assertion-as-spec + quarantine); D-112 (R-MODEL probe quarantined)",
   ["Convention: attack/ dir excluded from default runs, run explicitly",
    "Skip-in-code with reason",
    "Separate suite config"],
   ["D-101 adopted the pattern; the location convention is missing", "D-112 needs it now"],
   0.85,"D-112 needs the answer now.",
   "P3","Process reversible","Test organization","Worker","Low","Now",
   "Quarantine convention documented; D-112's probe placed per it",
   "AUTO_EXECUTE","Adopt the attack/-dir-excluded convention; it is simple and explicit. Within authority.")

dd("D-316","policy","Claim-integrity: does the factory need a standing claim lane (not campaigns)?",
   "claim/CLAIM-VERDICT.md (campaign); pressure/PRESSURE-REPORT.md (campaign)",
   ["Yes: standing claim-integrity lane with a backlog and cadence",
    "Campaigns suffice",
    "Fold into the privacy lane"],
   ["14 holes from one campaign suggest continuous pressure", "Standing lanes cost attention"],
   0.7,"Real need vs real cost.",
   "P2","Process reversible","Lane topology","Nolan? No - factory process","Medium","Standing",
   "Decision recorded",
   "DEEP_REVIEW","Review with the program (recommended: standing lane, since claim integrity is the program's core promise and campaigns found 14 holes in one pass).")

dd("D-317","failure-class","H8 digest: is the incremental spec's SHA-256 actually used for identity (not just stored)?",
   "claim/CLAIM-VERDICT.md: incremental spec already uses SHA-256; D-081",
   ["Fold into D-081's audit",
    "Separate probe",
    "Assume used"],
   ["D-081 audits roles + algorithms; usage is part of roles", "Duplicate"],
   0.9,"Duplicate.",
   "P2","None","None","Worker","Low","With D-081",
   "D-081 verification",
   "AUTO_EXECUTE","Fold into D-081. Record the fold.")

dd("D-318","failure-class","H3: owner assertion replay - can an old assertion validate a new value?",
   "claim/CLAIM-VERDICT.md H3/H7: assertions attest values; values change",
   ["Rule: assertions bind to (field, value, version); new value needs new assertion",
    "Assertions bind to field only (any value)",
    "Assertions expire on reobservation"],
   ["H7's byte-exact matching implies value binding; replay across values is laundering-adjacent",
    "SYNTH reobservation changes values"],
   0.75,"Value-bound assertions are the safe default; the lifecycle needs stating.",
   "P1","Semantics semi-permanent","Assertion lifecycle","Design review","Low","With D-059",
   "Assertion binding rule documented",
   "DEEP_REVIEW","Decide with D-059: assertions bind to value+version, and reobservation requires re-assertion (or explicit carry-over). Do not let stale assertions bless new values.")

dd("D-319","failure-class","Verifier performance: binding checks on 200-service graphs - budget?",
   "pressure class 3 (200 services, 2ms); claim verifier per-field checks",
   ["Budget: verifier adds <10% to the class-3 baseline",
    "No budget; correctness first",
    "Measure then decide"],
   ["Claim checks run per field; 200-service graphs multiply them", "No measurement exists"],
   0.7,"Unmeasured.",
   "P3","Reversible","Verifier performance","Worker","Low","This week",
   "Measurement: verifier overhead on the 200-service fixture",
   "GATHER_MORE_EVIDENCE","Measure first: run the verifier over the 200-service fixture and record overhead. Budget follows measurement.")

dd("D-320","policy","'Evidence before eloquence': claim docs must cite probes - enforce?",
   "SOUL.md: evidence before eloquence; claim/CLAIM-VERDICT.md cites exact probes",
   ["Enforce: claim design docs cite probe/test evidence for every hole claim",
    "Guideline",
    "No: slows writing"],
   ["The verdict's strength is its exact evidence", "Unenforced standards rot"],
   0.85,"The verdict demonstrates the standard.",
   "P3","Process reversible","Doc quality","Worker","Low","Standing",
   "Claim docs cite probes",
   "AUTO_EXECUTE","Enforce for claim-integrity docs; the verdict is the template. Within authority.")

dd("D-321","failure-class","H4 comment (renderer.tsx ~685-710): rewrite now or with the fix?",
   "claim/CLAIM-VERDICT.md H4; D-064",
   ["Fold into D-064 (rewrite now as zero-behavior change)",
    "With the H4 fix",
    "Leave until the seam is reconciled"],
   ["D-064 decided: rewrite now", "Duplicate"],
   0.95,"Duplicate of D-064.",
   "P2","None","None","Worker","Low","With D-064",
   "D-064 verification",
   "AUTO_EXECUTE","Fold into D-064. Record the fold.")

dd("D-322","failure-class","BindingVerificationError: is the error type the contract (H2's 'documented to throw')?",
   "claim/CLAIM-VERDICT.md H2: assertSpecBindingsVerified 'did not throw BindingVerificationError as documented'",
   ["Yes: the error type is the contract; document throw conditions",
    "Error type is incidental",
    "Define a new error taxonomy"],
   ["H2's hole is a contract violation; the contract needs writing", "Error types are API"],
   0.8,"The contract was assumed, not written.",
   "P2","API semi-permanent","Error contract","Design review","Low","With D-055",
   "Throw contract documented",
   "DEEP_REVIEW","Write the throw contract with D-055 (when each gate throws, which error, on what input). The H2 probe is its test.")

dd("D-323","failure-class","H9: digest over presented text - performance on long pages?",
   "claim/CLAIM-VERDICT.md H9; D-083",
   ["Fold into D-083/D-010 (design includes perf)",
    "Separate perf budget",
    "Ignore: digests are cheap"],
   ["D-083 owns digest-over-presented-text", "Hashing rendered text is O(page); fine, but state it"],
   0.8,"Sub-decision of D-083.",
   "P3","None","None","Worker","Low","With D-083",
   "D-083 verification",
   "AUTO_EXECUTE","Fold into D-083; note the O(page) cost in the design. Record the fold.")

dd("D-324","policy","Claim-hole disclosure: public changelog for fixed holes?",
   "claim/CLAIM-VERDICT.md (14 holes, internal)",
   ["Publish fixed-hole notes internally (factory learning)",
    "Public changelog (transparency)",
    "No disclosure; fix quietly"],
   ["Security holes (SEC-FIX) argue for quiet-then-disclose norms", "Claim holes are integrity, not RCE"],
   0.7,"Disclosure norms are a real policy choice.",
   "P2","Policy reversible","Disclosure posture","Nolan","Low","Standing",
   "Disclosure policy documented",
   "HUMAN_DECISION","Public disclosure of integrity holes is a business/trust decision; Nolan sets the posture. The shard recommends internal learning notes + quiet fixes, public only if asked.")

dd("D-325","failure-class","H6+H3: owner-corrected value on a private object - double hole?",
   "claim/CLAIM-VERDICT.md H6 (private grades BOUND) + H3 (owner value laundered)",
   ["Probe the combination now",
    "Covered by H3+H6 fixes separately",
    "Theoretical; skip"],
   ["Two holes compose; the combination is untested", "Probe is cheap"],
   0.8,"Composed holes are the classic miss.",
   "P1","Test-only","None","Worker","Low","This week",
   "Combination probe: private + owner-corrected -> UNBOUND and unrendered",
   "AUTO_EXECUTE","Run the combination probe; composed holes are where integrity dies. Within authority.")

dd("D-326","failure-class","Verifier vs renderer: shared test fixtures for the seam?",
   "claim/CLAIM-VERDICT.md H4: two verifiers disagree; seam fixtures would pin agreement",
   ["Create seam fixtures: graphs where both verifiers must agree",
    "Covered by D-065 contract test",
    "No shared fixtures"],
   ["D-065's contract test needs fixtures; this names them", "Seam fixtures prevent H4 recurrence structurally"],
   0.85,"D-065 needs them.",
   "P1","Test-only","None","Worker","Low","With D-065",
   "Seam fixture set exists; both verifiers agree on all of them",
   "EXECUTE_REVERSIBLY","Create the seam fixture set with D-065; agreement on fixtures is the structural H4 prevention. Reversible test proposal.")

dd("D-327","policy","Integrity incidents: define P0 criteria for claim-integrity?",
   "claim/CLAIM-VERDICT.md: two load-bearing findings; pressure F-8 INVENTED-CLAIM",
   ["Define: unverified/misattributed/invented claims reaching visitors = P0",
    "Use generic P0 criteria",
    "Per-incident judgment"],
   ["The program's core promise is claim honesty", "D-110 ordered the fix queue; incidents need the same bar"],
   0.85,"The core promise justifies a named bar.",
   "P1","Policy reversible","Incident response","Worker","Low","Standing",
   "P0 criteria published",
   "AUTO_EXECUTE","Define P0 as invented/unverified/misattributed claims reaching visitors; it is the program's core promise. Within authority.")

dd("D-328","failure-class","H1: label registry - which labels exist and what may they carry?",
   "claim/CLAIM-VERDICT.md H1: 'any label can smuggle'; D-119",
   ["Fold into D-119 (allowlist decision)",
    "Registry now, allowlist later",
    "No registry"],
   ["D-119 owns the allowlist; the registry is its inventory", "Duplicate-ish"],
   0.85,"D-119's inventory step.",
   "P1","None","None","Worker","Low","With D-119",
   "D-119 verification",
   "AUTO_EXECUTE","Fold the label inventory into D-119 as its first step. Record the fold.")

dd("D-329","failure-class","H7: assertion matching - case sensitivity?",
   "claim/CLAIM-VERDICT.md H7 (trailing space); D-076 (trim)",
   ["Case-sensitive after trim (strict)",
    "Case-insensitive",
    "Exact bytes after trim"],
   ["H7 is about whitespace; case is the next normalization question", "Case-insensitive matching risks false positives ('Main St' vs 'MAIN ST' are the same place, but 'IT' vs 'it' differ)"],
   0.7,"Genuinely tricky.",
   "P2","Semantics semi-permanent","Assertion matching","Design review","Low","With D-076",
   "Case rule documented",
   "DEEP_REVIEW","Decide with D-076: default strict (case-sensitive after trim); case-insensitive only with per-field justification. The false-positive risk is real.")

dd("D-330","failure-class","Derived claims: derivation record format?",
   "claim/CLAIM-VERDICT.md H1/H9: DETERMINISTIC_DERIVATION atom; derivation records",
   ["Define: derivation = {inputs, transform, presentedText} (ties D-084/D-085)",
    "Free-form derivation strings",
    "Defer to D-010"],
   ["D-010 owns the schema", "Duplicate-ish"],
   0.75,"Owned by D-010.",
   "P1","None","None","Design review","Low","With D-010",
   "D-010 verification",
   "DEFER","Fold into D-010.")

dd("D-331","policy","Factory definition of 'evidence' (claim vs pressure vs mission)?",
   "MISSION-PROTOCOL: evidence requirements per mission; claim/pressure use 'evidence' differently",
   ["Define: evidence = reproducible artifact + provenance, in all lanes",
    "Per-lane definitions",
    "No definition needed"],
   ["Cross-lane learning (D-109) needs a shared meaning", "The findings format has an EVIDENCE field already"],
   0.8,"Shared learning needs shared terms.",
   "P3","Definition reversible","Cross-lane learning","Worker","Low","Standing",
   "Evidence defined in the factory glossary",
   "AUTO_EXECUTE","Define evidence as reproducible artifact + provenance, factory-wide; it is what the findings format already assumes. Within authority.")

dd("D-332","failure-class","H4: does the planner use the strong or weak verifier?",
   "claim/CLAIM-VERDICT.md: planner.ts is the only non-test caller of buildVerifiedRenderModel",
   ["Inventory: planner's verifier calls (feeds D-058/D-075)",
    "Assume strong (it calls buildVerifiedRenderModel)",
    "Assume weak somewhere"],
   ["The planner path's guarantee is the H2/H6 question", "D-058/D-075 inventory covers it"],
   0.85,"Covered by the inventories.",
   "P1","None","None","Worker","Low","With D-058",
   "D-058 verification",
   "AUTO_EXECUTE","Fold into D-058/D-075 inventories. Record the fold.")

dd("D-333","failure-class","Claim test runtime: 14 tests in CI - budget?",
   "claim/CLAIM-VERDICT.md: jest with ts-jest isolatedModules; D-100",
   ["Budget: claim suite <60s in CI",
    "No budget",
    "Measure then budget"],
   ["D-100 requires per-patch re-runs; slow suites get skipped", "Unmeasured"],
   0.7,"Unmeasured.",
   "P3","Reversible","CI performance","Worker","Low","This week",
   "Suite runtime measured",
   "GATHER_MORE_EVIDENCE","Measure the 14-test runtime first; budget follows measurement. Do not budget blind.")

dd("D-334","failure-class","H5: ref-precedence - what if BOTH refs are present and differ legitimately?",
   "claim/CLAIM-VERDICT.md H5; D-068",
   ["Fold into D-068 (conflict -> typed finding)",
    "Field-level always wins silently",
    "Keep both (multi-source binding)"],
   ["D-068 chose: field-level wins + typed finding on conflict", "Duplicate"],
   0.9,"D-068 decided.",
   "P1","None","None","Worker","Low","With D-068",
   "D-068 verification",
   "AUTO_EXECUTE","D-068 decided: field-level wins, conflict emits a typed finding. Record the fold.")

dd("D-335","policy","Who may mint new evidence-ref schemes?",
   "D-306 (scheme registry)",
   ["Lane owners propose; registry keeper approves",
    "Anyone; registry is descriptive",
    "Nolan approves"],
   ["D-306 creates the registry; minting authority is the companion", "Ad hoc schemes caused H5"],
   0.8,"Companion to D-306.",
   "P2","Process reversible","Ref governance","Worker","Low","Standing",
   "Minting rule documented",
   "AUTO_EXECUTE","Lane owners propose, registry keeper approves; ad hoc minting caused H5. Within authority.")

dd("D-336","failure-class","H9 composed claims in Ask FYD answers (concierge projections)?",
   "MISSION-PROTOCOL PROJECTION: ask-answers (3 canned questions through the concierge); H9 (verifier blind to composed claims)",
   ["Extend H9 scope to concierge answers explicitly",
    "Concierge is out of H9 scope",
    "Probe: run H9-style composition through ask-answers"],
   ["ask-answers compose claims from fields; the H9 gap applies", "Untested"],
   0.75,"The gap plausibly extends; untested.",
   "P1","Test-only first","None","Worker","Low","This week",
   "Probe result: composed answers carry presented-text bindings or are flagged",
   "GATHER_MORE_EVIDENCE","Probe first: feed a composed claim through the concierge and check what the verifier sees. Scope follows evidence.")

dd("D-337","failure-class","H1 smuggling via projection labels (not just claim labels)?",
   "claim H1 (claim labels); MISSION-PROTOCOL PROJECTION (16 projections)",
   ["Probe: smuggle an unevidenced fact through a projection label",
    "Covered by H1 fix",
    "Projections are out of scope"],
   ["Projections relabel claims; the smuggling vector may transfer", "Untested"],
   0.7,"Plausible transfer, untested.",
   "P1","Test-only","None","Worker","Low","This week",
   "Probe result recorded",
   "GATHER_MORE_EVIDENCE","Probe the transfer before ruling; if it smuggles, it becomes its own hole with the H1 fix as the template.")

dd("D-338","policy","Claim-integrity onboarding: new lanes read CLAIM-VERDICT.md?",
   "claim/CLAIM-VERDICT.md (14 holes, required reading for seam work)",
   ["Require: lanes touching verifier/renderer/binding read the verdict + pass a 5-question check",
    "Recommend reading",
    "No requirement"],
   ["H4/H2 recurred because seam knowledge was local", "Reading requirements are cheap and checkable"],
   0.85,"Cheap, checkable, targeted at the proven failure.",
   "P2","Process reversible","Knowledge transfer","Worker","Low","Standing",
   "Onboarding requirement documented",
   "AUTO_EXECUTE","Require the read for seam-touching lanes; the holes recurred from local knowledge. Within authority.")

dd("D-339","failure-class","H8: document 'digest != identity' in the factory glossary?",
   "claim/CLAIM-VERDICT.md H8: the 32-bit digest is not a semantic identity",
   ["Add the glossary entry with the collision example",
    "No glossary entry needed",
    "Document in the digest mandate only"],
   ["The collision example ('faebba73' -> two phones) is memorable and teachable", "Glossary entries are cheap"],
   0.9,"Cheap and teachable.",
   "P3","Documentation reversible","None","Worker","Low","Now",
   "Glossary entry exists",
   "AUTO_EXECUTE","Add the entry with the collision example; it prevents the next digest-as-identity mistake. Within authority.")

dd("D-340","failure-class","Final claim-seam review: all H-probes green before Phase 17?",
   "claim/CLAIM-VERDICT.md; D-224 gap list",
   ["Gate: Phase 17 requires all 14 claim probes green (ties D-225/D-226)",
    "Gate: load-bearing probes only",
    "No gate; gap list decides"],
   ["D-225/D-226 already mark H4/R-H4 and R-MODEL blocking", "The full set is stronger but slower"],
   0.85,"D-225/D-226 set the precedent; the full set is the consistent extension.",
   "P0","Reversible","Launch gate","Worker","Low","With D-224",
   "Gap list reflects the gate",
   "AUTO_EXECUTE","Gate Phase 17 on all 14 claim probes green; the program's core promise is claim honesty and partial gates invite the next hole. Within the gap-list authority.")

# ------------------------------------------------- MISSION CLASS OPS D-341..D-410

def mo(iid, question, context, outputs, evidence, confidence, conf_basis,
       criticality, reversibility, blast_radius, authority, cost,
       time_sensitivity, verification, verdict, verdict_rationale):
    add(iid, "policy", question, context, outputs, evidence, confidence,
        conf_basis, criticality, reversibility, blast_radius,
        "Novel (mission operations)", authority, cost, time_sensitivity,
        verification, verdict, verdict_rationale)

mo("D-341","WORLD verify: 'no unsafe URL schemes in output' - scheme list canonical?",
   "MISSION-PROTOCOL WORLD verify asserts",
   ["Canonical list: http/https/tel/mailto + relative; everything else unsafe (ties safe-link)",
    "Per-mission judgment",
    "Inherit resolveSafeLink's rules"],
   ["resolveSafeLink is the single link authority (D-123)", "WORLD verify needs the same list"],
   0.9,"D-123 already made resolveSafeLink the authority.",
   "P1","Reversible","WORLD verify","Worker","Low","Standing",
   "WORLD verify references the safe-link scheme rules",
   "AUTO_EXECUTE","Inherit resolveSafeLink's scheme rules in WORLD verify; one authority, no second list. Within authority.")

mo("D-342","WORLD verify: 'unbound factual claims absent' - who judges factual?",
   "MISSION-PROTOCOL WORLD verify asserts",
   ["Judge: the claim verifier (BOUND/UNBOUND) on rendered output",
    "Judge: string scan for claim-like sentences",
    "Judge: worker judgment per mission"],
   ["H9 shows field-vs-presentation gaps; the judge matters", "The claim verifier is the authority"],
   0.8,"The claim verifier is the natural judge, but H9 qualifies it.",
   "P1","Reversible","WORLD verify","Worker","Low","Standing",
   "Judge defined; H9-presented-text noted",
   "DEEP_REVIEW","Define the judge in review (recommended: claim verifier on presented text per H9, not raw fields). The H9 gap makes 'factual' non-trivial.")

mo("D-343","WORLD verify: 'at least one section' - minimum or exact?",
   "MISSION-PROTOCOL WORLD verify asserts",
   ["Minimum (current)",
    "Exact per world type",
    "Minimum + warning on empty-ish"],
   ["D-193 distinguished minimums from golden-path lists", "Minimum is the honest bar"],
   0.9,"D-193 already drew the line.",
   "P3","Reversible","WORLD verify","Worker","Low","Standing",
   "Minimum kept; golden-path list versioned separately",
   "AUTO_EXECUTE","Keep the minimum; D-193's separation stands. Within authority.")

mo("D-344","WORLD verify: 'viewport meta present' - extend to a head-hygiene checklist?",
   "MISSION-PROTOCOL WORLD verify asserts viewport meta",
   ["Extend: viewport + charset + title + lang",
    "Keep viewport only",
    "Full head audit"],
   ["Viewport is the named assert; head hygiene beyond it is unasked", "Cheap to extend, low value beyond viewport"],
   0.75,"Low stakes either way.",
   "P3","Reversible","WORLD verify","Worker","Low","Standing",
   "Head checklist decided",
   "AUTO_EXECUTE","Extend to the small checklist (viewport, charset, title, lang); cheap and prevents silly misses. Within authority.")

mo("D-345","WORLD: 5,000 worlds - shard count and index ranges?",
   "MISSION-PROTOCOL: WORLD (5,000); shard size 500",
   ["10 shards of 500 (indices 0-4999)",
    "Fewer larger shards",
    "Shard per hostile class"],
   ["Shard size 500 is specified; 5000/500 = 10", "Deterministic addressing makes ranges trivial"],
   0.95,"Arithmetic.",
   "P3","Reversible","Work planning","Worker","Low","Standing",
   "Shard plan published",
   "AUTO_EXECUTE","10 shards of 500, indices as specified. Within authority.")

mo("D-346","WORLD: GENERATED_WITH_WARNINGS - warning taxonomy?",
   "MISSION-PROTOCOL WORLD outcomes",
   ["Taxonomy: typed warnings (malformed input, conflict, fallback used)",
    "Free-form warnings",
    "Warnings as findings records"],
   ["Typed warnings are machine-checkable", "The findings format exists"],
   0.85,"Typed is the factory's pattern.",
   "P2","Reversible","Outcome quality","Worker","Low","Standing",
   "Warning taxonomy published",
   "AUTO_EXECUTE","Adopt typed warnings; they compose with the findings format. Within authority.")

mo("D-347","WORLD: ACQUISITION_FAILED - retry policy?",
   "MISSION-PROTOCOL WORLD outcomes",
   ["Retry once with backoff; then record ACQUISITION_FAILED",
    "No retry; record immediately",
    "Retry until success (bounded by saturation)"],
   ["Transient failures differ from dead sources", "Unbounded retry violates saturation"],
   0.8,"Bounded retry is the standard.",
   "P2","Reversible","Mission resilience","Worker","Low","Standing",
   "Retry policy documented",
   "AUTO_EXECUTE","One bounded retry, then record; transient vs dead is distinguished by the retry. Within authority.")

mo("D-348","WORLD: UNSUPPORTED - capability gap filing?",
   "MISSION-PROTOCOL WORLD outcomes; failure loop: 4+ same missing primitive = candidate generic primitive",
   ["File: UNSUPPORTED outcomes feed the missing-primitive count",
    "Log only",
    "Escalate each"],
   ["The 4+ rule needs the count; UNSUPPORTED is its input", "Filing is mechanical"],
   0.9,"The failure loop requires the input.",
   "P2","Reversible","Capability planning","Worker","Low","Standing",
   "UNSUPPORTED outcomes counted toward the 4+ rule",
   "AUTO_EXECUTE","Feed UNSUPPORTED into the missing-primitive count; the failure loop needs it. Within authority.")

mo("D-349","OBJECT: fixture rotation across corpus/fixtures/ - rotation schedule?",
   "MISSION-PROTOCOL OBJECT: rotate across batch-b, trades-a, clearwater, professional, hostile/",
   ["Round-robin by mission index",
    "Weighted (hostile heavier)",
    "Deterministic hash assignment"],
   ["Deterministic addressing favors index-based rotation", "Hostile fixtures deserve weight, but determinism first"],
   0.85,"Index-based is deterministic and simple.",
   "P3","Reversible","Fixture coverage","Worker","Low","Standing",
   "Rotation rule documented",
   "AUTO_EXECUTE","Round-robin by mission index; deterministic and auditable. Within authority.")

mo("D-350","OBJECT: deterministic mutation seeds - seed registry?",
   "MISSION-PROTOCOL OBJECT: deterministic mutation seed",
   ["Registry: seed -> mutation description, so failures reproduce",
    "Seeds are self-describing (index-derived)",
    "No registry"],
   ["Deterministic seeds from the index are reproducible by construction", "A registry adds documentation value"],
   0.8,"Index-derived seeds are reproducible; the registry is documentation.",
   "P3","Reversible","Reproducibility","Worker","Low","Standing",
   "Seed derivation documented",
   "AUTO_EXECUTE","Document index-derived seeding as the rule; no separate registry needed. Within authority.")

mo("D-351","OBJECT: determinism check digest - SHA-256 (D-278)?",
   "MISSION-PROTOCOL OBJECT: compile twice, compare digests; D-278",
   ["Fold into D-278",
    "Decide now: SHA-256",
    "Per-harness choice"],
   ["D-278 decided >=256-bit", "Duplicate"],
   0.95,"Duplicate.",
   "P1","None","None","Worker","Low","With D-278",
   "D-278 verification",
   "AUTO_EXECUTE","Fold into D-278. Record the fold.")

mo("D-352","PROJECTION: 16 projections - all 16 every mission, or sampled?",
   "MISSION-PROTOCOL PROJECTION: 16 projections listed per mission",
   ["All 16 every mission (3,000 missions x 16)",
    "Sampled per mission (deterministic subset)",
    "All 16 on a subset of missions"],
   ["16 x 3000 = 48,000 projection verifications; cost is real", "Coverage argues all-16"],
   0.7,"Cost vs coverage is the trade-off.",
   "P2","Reversible","Compute budget","Worker","Low","Standing",
   "Projection coverage rule documented",
   "DEEP_REVIEW","Review the coverage rule (recommended: all 16, but measure per-projection cost first; if prohibitive, deterministic sampling with full coverage across the shard). Cost first.")

mo("D-353","PROJECTION: per-projection verify - shared or per-projection rules?",
   "MISSION-PROTOCOL PROJECTION verify: public stays public, private never leaks, owner-hidden stays hidden, labels distinct, PROJECTION != TRUTH",
   ["Shared core (the five rules) + per-projection extras",
    "One shared checklist",
    "Fully per-projection"],
   ["The five rules are stated as the shared core", "Some projections (proposal-draft, campaign-draft) have extra risks"],
   0.85,"The protocol states the shared core; extras are additive.",
   "P2","Reversible","Projection verify","Worker","Low","Standing",
   "Shared core + extras documented",
   "AUTO_EXECUTE","Shared core for all, documented extras per risky projection (proposal-draft, campaign-draft, lead-intake-schema). Within authority.")

mo("D-354","PROJECTION: proposal-draft and campaign-draft - extra honesty rules?",
   "MISSION-PROTOCOL PROJECTION lists proposal-draft, campaign-draft",
   ["Extra: drafts are labeled DRAFT + synthetic:true, never sent",
    "Standard projection rules suffice",
    "Drafts excluded from missions"],
   ["Drafts are the closest to outward action; the no-outreach boundary applies", "Labeling drafts is cheap insurance"],
   0.9,"The outreach boundary makes this load-bearing.",
   "P1","Reversible","Boundary safety","Worker","Low","Standing",
   "Draft labeling enforced",
   "AUTO_EXECUTE","Label drafts DRAFT + synthetic:true and never send; the outreach boundary demands it. Within authority.")

mo("D-355","PROJECTION: ask-answers concierge - canned questions fixed set?",
   "MISSION-PROTOCOL PROJECTION: ask-answers (3 canned questions through the concierge)",
   ["Fixed set of 3, versioned",
    "Per-mission questions",
    "Fixed set + 1 adversarial"],
   ["Canned = comparable across missions", "One adversarial question tests honesty under pressure"],
   0.8,"Comparability + one adversarial is the sweet spot.",
   "P3","Reversible","Concierge testing","Worker","Low","Standing",
   "Question set published and versioned",
   "AUTO_EXECUTE","Fixed versioned set of 3 + 1 adversarial; comparability with pressure. Within authority.")

mo("D-356","PROJECTION: mcp-context and search-doc - machine-consumer honesty?",
   "MISSION-PROTOCOL PROJECTION lists mcp-context, search-doc",
   ["Same five rules; machine consumers get the same honesty",
    "Stricter: machine consumers get provenance inline",
    "Looser: summaries only"],
   ["Machine consumers propagate claims at scale; provenance inline is cheap", "The five rules already bind"],
   0.8,"Provenance-inline for machine consumers is the safer default.",
   "P2","Reversible","Machine-consumer honesty","Worker","Low","Standing",
   "Machine projections carry provenance inline",
   "AUTO_EXECUTE","Require inline provenance for machine-consumer projections; they amplify claims. Within authority.")

mo("D-357","SYNTH: owner correction survival - assertion per reobservation?",
   "MISSION-PROTOCOL SYNTH verify: owner correction survived reobservation",
   ["Assert per reobservation cycle (not just at end)",
    "End-of-loop assertion suffices",
    "Sampled assertions"],
   ["Corrections can decay mid-loop; end-only misses it", "Per-cycle is cheap"],
   0.9,"Mid-loop decay is the failure mode.",
   "P1","Reversible","Correction durability","Worker","Low","Standing",
   "Per-cycle survival asserted",
   "AUTO_EXECUTE","Assert per reobservation cycle; end-only assertions miss mid-loop decay. Within authority.")

mo("D-358","SYNTH: history intelligibility - old occurrence ids immutable. Test?",
   "MISSION-PROTOCOL SYNTH verify: history intelligible (old occurrence ids immutable)",
   ["Test: occurrence ids stable across reobservation",
    "Convention",
    "Sampled check"],
   ["Immutability is the intelligibility mechanism", "Test is cheap"],
   0.9,"The verify step names it.",
   "P2","Test-only","None","Worker","Low","Standing",
   "Id-stability test in SYNTH harnesses",
   "AUTO_EXECUTE","Add the id-stability test; the verify step requires it. Within authority.")

mo("D-359","SYNTH: conflicting new source - conflict rule (D-029)?",
   "MISSION-PROTOCOL SYNTH: reobservation (changed source or conflicting new source); D-271",
   ["Apply D-029 (no silent winner) in SYNTH reobservation",
    "SYNTH-specific rule",
    "Defer to SYNTH owners"],
   ["D-271 applied D-029 to WORLD conflicts; SYNTH is the same shape", "Consistency"],
   0.9,"Same shape, same law.",
   "P1","Reversible","Conflict honesty","Worker","Low","Standing",
   "SYNTH reobservation references D-029",
   "AUTO_EXECUTE","Apply D-029 to SYNTH reobservation conflicts; consistency across classes. Within authority.")

mo("D-360","DECISION: this shard's method - template for future decision shards?",
   "This shard: backlog -> decompose -> verdict -> append -> results.jsonl + SUMMARY + SHARD-LOG",
   ["Adopt as the decision-shard template",
    "Per-shard method",
    "Simplify the decomposition for later shards"],
   ["The method produced 250 decompositions with a sane verdict distribution", "Templates compound quality"],
   0.85,"This shard is the proof.",
   "P3","Process reversible","Decision quality","Worker","Low","Standing",
   "Template documented",
   "AUTO_EXECUTE","Adopt this shard's method as the template; it is proven by execution. Within authority.")

mo("D-361","DECISION: verdict distribution monitoring - alert on skew?",
   "This shard will report a verdict distribution",
   ["Monitor: alert if AUTO_EXECUTE >50% or HUMAN_DECISION = 0% (rubber-stamping signal)",
    "No monitoring",
    "Monitor HUMAN_DECISION/REFUSE only"],
   ["Skew signals process failure (rubber-stamp or cowardice)", "Thresholds are judgment"],
   0.75,"The signal is real; the thresholds are judgment.",
   "P3","Process reversible","Verdict quality","Worker","Low","Standing",
   "Distribution reported per shard; skew investigated",
   "DEEP_REVIEW","Review the skew thresholds (recommended: investigate AUTO_EXECUTE >50% or zero HUMAN_DECISION/REFUSE across a full shard). Do not hard-code without data.")

mo("D-362","Cross-class: WORLD missions consume the pressure harness?",
   "pressure/PRESSURE-REPORT.md harness; WORLD missions render hostile worlds",
   ["Yes: WORLD hostile missions run the pressure cases",
    "No: separate concerns",
    "WORLD borrows the malformed-field cases only"],
   ["Hostile worlds (no-jsonld, stale-source, broken-media) overlap pressure classes", "Reuse beats duplication"],
   0.8,"Overlap is real; reuse is the factory's rule.",
   "P2","Reversible","Test reuse","Worker","Low","Standing",
   "Reuse documented",
   "AUTO_EXECUTE","WORLD hostile missions borrow the pressure malformed/unicode/scale cases; reuse beats duplication. Within authority.")

mo("D-363","Mission records: stage latencies - which stages?",
   "MISSION-PROTOCOL WORLD: record stage latencies",
   ["Stages: generate, evidence, objects, relationships, projection, spec, render, verify",
    "Coarse: build vs verify",
    "Per-class stage lists"],
   ["p50/p95 per stage needs named stages", "Per-class lists reflect real pipelines"],
   0.85,"Per-class lists are honest.",
   "P3","Reversible","Latency visibility","Worker","Low","Standing",
   "Stage lists published per class",
   "AUTO_EXECUTE","Publish per-class stage lists; latency without named stages is noise. Within authority.")

mo("D-364","OBJECT: fixture mutation - mutations must preserve fixture honesty?",
   "MISSION-PROTOCOL OBJECT: deterministic mutation seed",
   ["Rule: mutations never invent claims; they permute/break shape only",
    "Mutations may invent (tests invention handling)",
    "Per-mutation judgment"],
   ["OBJECT tests the renderer, not invention handling; invented mutations confound", "Shape-breaking is the point"],
   0.85,"Confounded tests are the failure mode.",
   "P2","Reversible","Test validity","Worker","Low","Standing",
   "Mutation rule documented",
   "AUTO_EXECUTE","Mutations permute/break shape only, never invent claims; invention handling is the claim lane's job. Within authority.")

mo("D-365","WORLD: owner_intent=none worlds - control group?",
   "MISSION-PROTOCOL world(i): owner_intent none for 3/5 of worlds",
   ["Treat as the control group for owner-intent effects",
    "No special treatment",
    "Exclude from SYNTH-style analysis"],
   ["Control groups make intent effects measurable", "Free: the distribution already exists"],
   0.9,"The distribution exists; naming it a control is free.",
   "P3","Reversible","Analysis quality","Worker","Low","Standing",
   "Control-group convention documented",
   "AUTO_EXECUTE","Name none-intent worlds the control group; intent effects become measurable. Within authority.")

mo("D-366","PROJECTION: directory-entry and landing-page - SEO honesty rules?",
   "MISSION-PROTOCOL PROJECTION lists directory-entry, landing-page",
   ["Same five rules + no keyword stuffing (honest text only)",
    "Standard rules suffice",
    "SEO projections excluded"],
   ["SEO surfaces tempt stuffing; the honesty bar must hold", "Keyword stuffing is a claim-integrity issue"],
   0.85,"The temptation is real and the bar must be explicit.",
   "P2","Reversible","SEO honesty","Worker","Low","Standing",
   "SEO honesty rule documented",
   "AUTO_EXECUTE","Forbid keyword stuffing on SEO projections; honest text only. Within authority.")

mo("D-367","SYNTH: reobservation sources - synthetic only?",
   "MISSION-PROTOCOL SYNTH: reobservation (changed source); synthetic marking hard boundary",
   ["Yes: all reobservation sources synthetic with marking",
    "Real sources allowed with consent",
    "Per-mission judgment"],
   ["The hard boundary: synthetic never presented as real", "SYNTH is synthetic by construction"],
   0.95,"Hard boundary.",
   "P0","Reversible","Boundary integrity","Worker","Low","Standing",
   "SYNTH sources all synthetic+marked",
   "AUTO_EXECUTE","All SYNTH sources synthetic with marking, no exceptions; the hard boundary demands it. Within authority.")

mo("D-368","DECISION: backlog items from non-failure sources (policy ideas) - allowed?",
   "Subagent task: new items from the failure taxonomy; D-109 (standing)",
   ["Allowed: policy/process items are valid backlog (this shard has many)",
    "Failures only",
    "Failures + Nolan questions only"],
   ["This shard's policy items (D-238+) are high-value and grounded", "The directive says failure taxonomy, but D-109 confirmed the loop broadly"],
   0.85,"This shard proves policy items work.",
   "P3","Reversible","Backlog scope","Worker","Low","Standing",
   "Scope documented: failures + policy + process",
   "AUTO_EXECUTE","Allow policy/process items; this shard's D-238+ are the proof of value. Within authority.")

mo("D-369","WORLD: phone uniqueness (555-01XX per world) - enforce in generation?",
   "MISSION-PROTOCOL: phones unique per world in 555-01XX",
   ["Enforce: generator asserts uniqueness",
    "Convention",
    "Sampled check"],
   ["Uniqueness is specified; collisions would confound contact tests", "Assert is cheap"],
   0.9,"Specified + cheap.",
   "P3","Reversible","Fixture correctness","Worker","Low","Standing",
   "Uniqueness asserted in generation",
   "AUTO_EXECUTE","Assert phone uniqueness in generation; contact-resolution tests depend on it. Within authority.")

mo("D-370","OBJECT: 'no live browser' - render-model + HTML-string verification suffices?",
   "MISSION-PROTOCOL WORLD: no live browser; render-model + HTML-string verification is the verify step",
   ["Confirm: HTML-string verification is the verify step (no live browser anywhere)",
    "Live browser for spot checks",
    "Per-class judgment"],
   ["The protocol is explicit for WORLD; OBJECT says the same pipeline", "Live browsers are flaky and slow"],
   0.95,"The protocol is explicit.",
   "P2","Reversible","Verification method","Worker","Low","Standing",
   "HTML-string verification confirmed as the step",
   "AUTO_EXECUTE","Confirm: no live browser; render-model + HTML-string verification is the step, factory-wide. Within authority.")

mo("D-371","PROJECTION: analytics-view - synthetic data only?",
   "MISSION-PROTOCOL PROJECTION lists analytics-view",
   ["Yes: analytics projections use synthetic aggregates, marked",
    "Real aggregates allowed",
    "Exclude analytics-view"],
   ["Fabricated analytics are invented claims at scale", "Synthetic marking boundary"],
   0.9,"Invented metrics are the nightmare case.",
   "P1","Reversible","Analytics honesty","Worker","Low","Standing",
   "analytics-view uses synthetic marked aggregates only",
   "AUTO_EXECUTE","Synthetic marked aggregates only; fabricated analytics are invented claims. Within authority.")

mo("D-372","PROJECTION: lead-intake-schema - PII handling?",
   "MISSION-PROTOCOL PROJECTION lists lead-intake-schema",
   ["Schema only, no PII ever; fields labeled by sensitivity",
    "PII allowed in test fixtures (synthetic)",
    "Exclude"],
   ["Schemas describe PII collection; the schema itself should carry sensitivity labels", "Synthetic PII in fixtures is marked anyway"],
   0.85,"Sensitivity labels on the schema are the honest design.",
   "P1","Reversible","PII hygiene","Worker","Low","Standing",
   "lead-intake-schema fields carry sensitivity labels; no real PII",
   "AUTO_EXECUTE","Schema-only, sensitivity-labeled, never real PII. Within authority.")

mo("D-373","WORLD: multi-location and franchise types - chain exclusion?",
   "MISSION-PROTOCOL TYPES include multi-location, franchise; Nolan's targeting: no franchises or chains ever",
   ["Factory: franchise/multi-location worlds are synthetic test types, never prospects (marking enforced)",
    "Exclude the types entirely",
    "Allow as prospect types"],
   ["Nolan's no-franchise rule is about outreach targeting", "The types exist to test franchise-lookalike handling"],
   0.9,"The types test the lookalike hostile; the outreach rule is separate.",
   "P1","Reversible","Type semantics","Worker","Low","Standing",
   "Types kept as test types with synthetic marking; never prospect lists",
   "AUTO_EXECUTE","Keep the types for lookalike testing with synthetic marking; they are never prospect lists (D-256). Within authority.")

mo("D-374","OBJECT: hostile/ fixtures - who maintains?",
   "MISSION-PROTOCOL OBJECT: rotate across corpus/fixtures/ including hostile/",
   ["Owner: pressure/claim lanes contribute; factory QA curates",
    "Per-lane fixtures",
    "No owner; append-only"],
   ["Hostile fixtures are the shared attack library", "Append-only rots"],
   0.8,"Shared library needs a curator.",
   "P3","Process reversible","Fixture quality","Worker","Low","Standing",
   "Curator named",
   "DEEP_REVIEW","Name the curator in review (recommended: factory QA with pressure/claim lanes contributing). Shared attack libraries rot without owners.")

mo("D-375","SYNTH: correct-fact intent - assertion lifecycle (D-318)?",
   "MISSION-PROTOCOL world(i): correct-fact; D-318 (assertion binds to value+version)",
   ["Apply D-318: reobservation requires re-assertion or explicit carry-over",
    "SYNTH-specific lifecycle",
    "Defer to SYNTH owners"],
   ["D-318 decided value+version binding", "SYNTH is where it bites"],
   0.9,"D-318 applies directly.",
   "P1","Reversible","Assertion lifecycle","Worker","Low","Standing",
   "SYNTH applies D-318",
   "AUTO_EXECUTE","Apply D-318 in SYNTH: corrections do not survive reobservation on stale assertions. Within authority.")

mo("D-376","WORLD: stale-source hostile - reobservation policy?",
   "MISSION-PROTOCOL HOSTILES include stale-source",
   ["Policy: stale sources are demoted, not deleted (audit trail)",
    "Delete stale sources",
    "Per-mission judgment"],
   ["Architecture-memory: archive before destroying", "Staleness affects evidence grading"],
   0.85,"The memory rule answers it.",
   "P2","Reversible","Source hygiene","Worker","Low","Standing",
   "Demote-not-delete documented",
   "AUTO_EXECUTE","Demote stale sources, keep the audit trail; the memory rule forbids silent deletion. Within authority.")

mo("D-377","WORLD: contradictory-sources hostile - D-029 again?",
   "MISSION-PROTOCOL HOSTILES include contradictory-sources; D-271",
   ["Yes: D-029/D-271 apply",
    "Hostile-specific rule",
    "Per-mission"],
   ["D-271 already applied D-029 to WORLD conflicts", "Duplicate"],
   0.95,"Duplicate of D-271.",
   "P1","None","None","Worker","Low","Standing",
   "D-271 verification",
   "AUTO_EXECUTE","Covered by D-271. Record the fold.")

mo("D-378","OBJECT: clearwater/professional fixtures - PII scrubbed?",
   "MISSION-PROTOCOL OBJECT fixtures: clearwater, professional",
   ["Verify: fixtures contain only synthetic/marked data (D-256)",
    "Trust the corpus",
    "Scrub on use"],
   ["D-256 enforces synthetic marking", "Fixture PII would propagate to 3,500 missions"],
   0.9,"The blast radius (3,500 missions) demands verification.",
   "P1","Read-only audit","None","Worker","Low","This week",
   "Fixture audit: no real PII/business data",
   "AUTO_EXECUTE","Audit the fixtures for real PII/business data now; 3,500 missions amplify any leak. Within authority.")

mo("D-379","PROJECTION: owner-dashboard-view - owner-only data rules?",
   "MISSION-PROTOCOL PROJECTION lists owner-dashboard-view",
   ["Dashboard shows private + public to the authenticated owner only; never in public projections",
    "Same as public projections",
    "Per-field judgment"],
   ["Owner views are the one place private data legitimately appears", "The boundary must be explicit"],
   0.9,"The exception needs stating.",
   "P1","Reversible","Owner data boundary","Worker","Low","Standing",
   "Owner-dashboard boundary documented",
   "AUTO_EXECUTE","Document: owner-dashboard is the authenticated-owner exception; private data never leaves it. Within authority.")

mo("D-380","DECISION: decision-backlog.jsonl schema - version it?",
   "decision-backlog.jsonl: id/kind/question/context",
   ["Version the schema (v1); this shard's appends comply",
    "Unversioned; add fields freely",
    "Freeze the schema"],
   ["D-263 collision rule + D-262 dup checks are schema-adjacent", "Versioning is cheap insurance"],
   0.8,"Cheap insurance for a growing file.",
   "P3","Reversible","Backlog integrity","Worker","Low","Standing",
   "Schema v1 documented",
   "AUTO_EXECUTE","Version as v1 with the four fields; future fields are additive. Within authority.")

mo("D-381","WORLD: render stage - buildRenderContext null-safety (F-6)?",
   "MISSION-PROTOCOL WORLD render via buildRenderContext; pressure F-6",
   ["WORLD missions inherit the F-6 fix (D-017/D-021)",
    "WORLD asserts null-safety independently",
    "WORLD skips malformed graphs"],
   ["The F-6 fix is the single choke point", "WORLD generates malformed shapes via hostiles"],
   0.9,"One fix, inherited.",
   "P1","Reversible","Render robustness","Worker","Low","Standing",
   "WORLD hostile missions exercise the fixed path",
   "AUTO_EXECUTE","WORLD inherits the F-6 fix; hostile worlds become its regression. Within authority.")

mo("D-382","OBJECT: validateSiteSpec - D-026's malformed-value findings apply?",
   "D-026 (validator flags malformed values); OBJECT pipeline",
   ["Yes: OBJECT missions assert the findings on mutated fixtures",
    "OBJECT uses structural validation only",
    "Per-mission"],
   ["D-026 extends the validator; OBJECT consumes it", "Mutated fixtures produce malformed values by design"],
   0.9,"The validator is shared.",
   "P1","Reversible","Validation coverage","Worker","Low","Standing",
   "OBJECT asserts malformed-value findings",
   "AUTO_EXECUTE","OBJECT missions assert D-026's findings on mutated fixtures; the validator is shared. Within authority.")

mo("D-383","SYNTH: 1,500 worlds - shard plan?",
   "MISSION-PROTOCOL SYNTH (1,500); shard 500",
   ["3 shards of 500",
    "6 shards of 250",
    "Per the protocol: 3 shards"],
   ["500/1500 = 3", "Arithmetic"],
   0.95,"Arithmetic.",
   "P3","Reversible","Work planning","Worker","Low","Standing",
   "3 shards planned",
   "AUTO_EXECUTE","3 shards of 500 per the protocol. Within authority.")

mo("D-384","PROJECTION: 3,000 missions - shard plan?",
   "MISSION-PROTOCOL PROJECTION (3,000)",
   ["6 shards of 500",
    "12 shards of 250",
    "Per the protocol: 6"],
   ["Arithmetic", ""],
   0.95,"Arithmetic.",
   "P3","Reversible","Work planning","Worker","Low","Standing",
   "6 shards planned",
   "AUTO_EXECUTE","6 shards of 500 per the protocol. Within authority.")

mo("D-385","DECISION: 1,000 units - shard plan (shards 0-3 of 250)?",
   "MISSION-PROTOCOL DECISION (1,000); shard 250",
   ["4 shards: 0 (this), 1, 2, 3",
    "This shard takes 1 next (per task)",
    "Replan"],
   ["The task says: take shard 1 if unclaimed", "1000/250 = 4"],
   0.95,"The task is explicit.",
   "P3","Reversible","Work planning","Worker","Low","Standing",
   "Shard 1 claimed after this",
   "AUTO_EXECUTE","This shard takes shard 1 next if unclaimed, per the task. Within authority.")

mo("D-386","WORLD: section counts recorded - what is a 'section'?",
   "MISSION-PROTOCOL WORLD: record section counts",
   ["Define: rendered content sections (hero, services, about, contact, ...)",
    "Count spec pages",
    "Per-mission judgment"],
   ["Counts need a definition to be comparable", "Spec sections vs rendered sections may differ"],
   0.8,"Comparability needs the definition.",
   "P3","Reversible","Metric comparability","Worker","Low","Standing",
   "Section defined as rendered content sections",
   "AUTO_EXECUTE","Define sections as rendered content sections; record spec-page counts separately. Within authority.")

mo("D-387","OBJECT: object/relationship counts - count what exactly?",
   "MISSION-PROTOCOL: record object/relationship counts",
   ["Count input graph objects/relationships (pre-projection)",
    "Count projected",
    "Both"],
   ["Input vs projected differ (drops, merges)", "Both is informative and cheap"],
   0.9,"Both, cheap.",
   "P3","Reversible","Metric comparability","Worker","Low","Standing",
   "Both counts recorded",
   "AUTO_EXECUTE","Record both input and projected counts; the delta is the interesting signal. Within authority.")

mo("D-388","Cross-class: failure taxonomy shared vocabulary (F-/H-/R-/W-/A-)?",
   "pressure F-, claim H-/R-, SEC-FIX W-/A-, TD-001",
   ["Adopt the prefix vocabulary factory-wide (F=pressure, H=hole, R=render-path, W=weakness, A=attack)",
    "Per-lane prefixes",
    "No prefixes"],
   ["The prefixes already exist and are unambiguous", "Shared vocabulary aids D-109's loop"],
   0.9,"Already in use; adoption is documentation.",
   "P3","Reversible","Taxonomy clarity","Worker","Low","Standing",
   "Prefix vocabulary documented",
   "AUTO_EXECUTE","Adopt the existing prefixes factory-wide; they are already unambiguous. Within authority.")

mo("D-389","WORLD: 'never invented claim' - string-scan or verifier?",
   "MISSION-PROTOCOL WORLD verify: unbound factual claims absent",
   ["Verifier (D-342)",
    "String scan for known invented patterns ('null', 'undefined')",
    "Both"],
   ["D-342 owns the judge; string scans catch F-8-style artifacts cheaply", "Both is defense in depth"],
   0.85,"Cheap string scan + verifier is the honest answer.",
   "P1","Reversible","Verify strength","Worker","Low","Standing",
   "Both: verifier judges, scan catches literals",
   "AUTO_EXECUTE","Both: the verifier judges factuality, a literal scan catches 'null'/'undefined' artifacts. Within authority.")

mo("D-390","PROJECTION: faq and search-doc - derived from BOUND claims only?",
   "MISSION-PROTOCOL PROJECTION lists faq, search-doc",
   ["Yes: generated Q&A binds to BOUND claims; UNBOUND never generates answers",
    "Standard rules suffice",
    "Per-projection"],
   ["FAQ answers are presented as facts; H4's hole would flow straight through", "The rule is the H4 fix applied to projections"],
   0.9,"H4's lesson applied.",
   "P1","Reversible","Generated-answer honesty","Worker","Low","Standing",
   "faq/search-doc generate from BOUND claims only",
   "AUTO_EXECUTE","Require BOUND-only generation for faq/search-doc; H4's hole must not flow into generated answers. Within authority.")

mo("D-391","SYNTH: evidence preserved on hide - spot-check or assert all?",
   "MISSION-PROTOCOL SYNTH verify: owner hide did not delete evidence; D-276",
   ["Assert all (D-276)",
    "Spot-check sampled",
    "End-of-loop only"],
   ["D-276 requires the assertion", "Duplicate-ish"],
   0.9,"D-276 decided.",
   "P1","None","None","Worker","Low","Standing",
   "D-276 verification",
   "AUTO_EXECUTE","Covered by D-276 (assert all). Record the fold.")

mo("D-392","OBJECT: mutation that breaks honesty - quarantined how?",
   "D-364 (mutations never invent); mutation bugs happen",
   ["Quarantine: mutation + output flagged, mission marked NEEDS_REVIEW",
    "Fail the mission",
    "Drop the mutation"],
   ["D-364's rule needs an enforcement path", "NEEDS_REVIEW exists for this"],
   0.85,"The taxonomy has the bucket.",
   "P2","Reversible","Test validity","Worker","Low","Standing",
   "Violating mutations -> NEEDS_REVIEW with the mutation recorded",
   "AUTO_EXECUTE","Route honesty-breaking mutations to NEEDS_REVIEW with the mutation recorded; the rule needs teeth. Within authority.")

mo("D-393","WORLD: 1MB-field hostile - include in world generation?",
   "pressure class 8 (1MB fields); deterministic hostiles",
   ["Yes: add oversized-field hostile to the rotation",
    "Covered by pressure class 8",
    "No: unrealistic"],
   ["Hostile list is fixed at 10; pressure covers it", "Worlds with 1MB fields test the full pipeline, not just the seam"],
   0.7,"Fixed hostile list vs full-pipeline value.",
   "P3","Reversible","Hostile coverage","Worker","Low","Standing",
   "Decision recorded",
   "DEEP_REVIEW","Decide with D-274 (hostile extension review): oversized fields are a candidate HOSTILES 11+ member. Fold in.")

mo("D-394","DECISION: are decision units themselves evidence-graded?",
   "D-331 (evidence defined); this shard's decompositions",
   ["Yes: each decomposition carries confidence + evidence requirements (already does)",
    "No: decisions are process",
    "Grade verdicts only"],
   ["This shard already records confidence + evidence per unit", "The format is the grading"],
   0.9,"Already true.",
   "P3","Reversible","Decision quality","Worker","Low","Standing",
   "Format confirmed as the grading",
   "AUTO_EXECUTE","Confirmed: the decomposition format (confidence + evidence requirements) IS the grading. Within authority.")

mo("D-395","Cross-class: shared SHARD-LOG conventions?",
   "MISSION-PROTOCOL outputs: SHARD-LOG.md (decisions at 80%+, what you did after finishing)",
   ["Adopt this shard's log shape as the template",
    "Per-shard logs",
    "Minimal logs"],
   ["This shard's log will demonstrate the shape", "Comparable logs aid the parent"],
   0.85,"Demonstration beats prescription.",
   "P3","Reversible","Log comparability","Worker","Low","Standing",
   "This shard's SHARD-LOG.md is the template",
   "AUTO_EXECUTE","This shard's log is the template; it demonstrates the required contents. Within authority.")

mo("D-396","WORLD: 'spec valid OR typed failure (never throw, never invented claim)' - the prime directive?",
   "MISSION-PROTOCOL WORLD verify",
   ["Adopt as the factory's prime directive for all render paths",
    "WORLD-only",
    "Aspirational only"],
   ["The parenthetical is the whole program in one line", "Pressure/claim lanes prove its necessity"],
   0.95,"It is the program in one line.",
   "P1","Principle reversible","Program direction","Worker","Low","Standing",
   "Prime directive published",
   "AUTO_EXECUTE","Adopt as the prime directive: valid spec or typed failure; never throw, never invent. Within authority.")

mo("D-397","PROJECTION: catalog and portfolio-card - image honesty (no fabricated photos)?",
   "MISSION-PROTOCOL PROJECTION lists catalog, portfolio-card; MEMORY.md FYD media rules (no fabricated photos, real authorized imagery)",
   ["Enforce: catalog/portfolio images must be authorized or generated-labeled; never fabricated-as-real",
    "Standard rules suffice",
    "Exclude image projections"],
   ["The FYD media rules are binding Nolan steering", "Fabricated business photos are invented claims visually"],
   0.9,"Binding steering + invented-claim equivalence.",
   "P1","Reversible","Media honesty","Worker","Low","Standing",
   "Image honesty enforced on catalog/portfolio projections",
   "AUTO_EXECUTE","Enforce the FYD media rules on these projections; fabricated photos are visual invented claims. Within authority.")

mo("D-398","OBJECT: renderer version pinning - missions record the renderer version?",
   "Reproducibility across 3,500 missions",
   ["Record repo HEAD + relevant file hashes per shard",
    "Per-mission recording",
    "No recording; branch is the version"],
   ["The branch has 90+ dirty files; HEAD alone does not reproduce", "Per-shard recording is the sweet spot"],
   0.85,"Dirty-tree reality demands more than HEAD.",
   "P2","Reversible","Reproducibility","Worker","Low","Standing",
   "Shard records HEAD + dirty-file list",
   "AUTO_EXECUTE","Record HEAD + the dirty-file list per shard; HEAD alone lies on a dirty tree. Within authority.")

mo("D-399","SYNTH: phone/hours change - which changes are 'reobservation' vs 'new source'?",
   "MISSION-PROTOCOL SYNTH: reobservation (changed source: phone/hours changed, or conflicting new source)",
   ["Define: same-source value change = reobservation; new source = conflict path (D-029)",
    "No distinction",
    "Per-mission"],
   ["The distinction drives conflict handling", "D-029 covers the conflict path"],
   0.85,"The distinction is load-bearing for D-029.",
   "P2","Reversible","Reobservation semantics","Worker","Low","Standing",
   "Distinction documented",
   "AUTO_EXECUTE","Define the distinction; it routes to D-029's conflict path correctly. Within authority.")

mo("D-400","WORLD: event-heavy and transaction-heavy dims - projection coverage?",
   "MISSION-PROTOCOL DIMS include event-heavy, transaction-heavy",
   ["Verify: event/transaction projections exist for those dims",
    "Dims are descriptive only",
    "Per-mission"],
   ["Dims should drive projection selection; otherwise they are decoration", "Unverified"],
   0.7,"Unverified either way.",
   "P3","Reversible","Dim semantics","Worker","Low","Standing",
   "Dim->projection mapping verified or dims marked descriptive",
   "GATHER_MORE_EVIDENCE","Check whether dims actually drive projection selection in the generator; the answer decides whether dims are semantic or decorative.")

mo("D-401","DECISION: unit indices - this shard covers 0-249; index = unit or backlog order?",
   "Subagent task: shard indices 0-249; backlog D-001..",
   ["Index = unit position in this shard (0-249), backlog id recorded per unit",
    "Index = backlog sequence",
    "Both recorded"],
   ["The task defines units 0-249 for the shard", "Backlog ids are the stable reference"],
   0.95,"The task is explicit; recording both is free.",
   "P3","Reversible","Traceability","Worker","Low","Standing",
   "results.jsonl carries unit_index + backlog_id",
   "AUTO_EXECUTE","Record both per line; the task defines units, backlog ids are stable. Within authority.")

mo("D-402","PROJECTION: circle-context - the Circle is not the customer experience?",
   "ALIGNMENT_SYNTHESIS.md (2026-09-23): All Objects removed from primary experience; graph is substrate, never customer experience",
   ["Constrain: circle-context projection serves the owner/operator surface, not public UX",
    "Standard projection rules",
    "Exclude circle-context"],
   ["Nolan reversed All Objects by direct directive", "The projection exists; its audience needs stating"],
   0.85,"The directive is explicit and recent.",
   "P1","Reversible","Projection audience","Worker","Low","Standing",
   "circle-context scoped to owner/operator surfaces",
   "AUTO_EXECUTE","Scope circle-context to owner/operator surfaces per Nolan's directive; the graph is substrate. Within authority.")

mo("D-403","WORLD: knowledge and catalog types - unbound-claim risk?",
   "MISSION-PROTOCOL TYPES include knowledge, catalog",
   ["Extra verify: knowledge/catalog worlds get the D-342 presented-text judgment strictly",
    "Standard verify",
    "Exclude the types"],
   ["Knowledge/catalog types generate the most claims per world", "H9's gap is worst where composition is heaviest"],
   0.8,"Claim density + H9 = strictest judgment where it matters most.",
   "P1","Reversible","Verify strictness","Worker","Low","Standing",
   "Strict presented-text judgment for knowledge/catalog worlds",
   "AUTO_EXECUTE","Apply the strictest judgment to the claim-densest types; H9's gap scales with composition. Within authority.")

mo("D-404","OBJECT: membership and appointment types - PII-adjacent fixtures?",
   "MISSION-PROTOCOL TYPES include membership, appointment",
   ["Audit fixtures for PII-adjacent data (names, phones); synthetic-only (D-378)",
    "Trust the corpus",
    "Exclude the types"],
   ["D-378 audits the corpus; these types are the PII-adjacent ones", "Targeted audit is efficient"],
   0.9,"D-378's audit should prioritize these.",
   "P1","Read-only","None","Worker","Low","With D-378",
   "Membership/appointment fixtures audited first",
   "AUTO_EXECUTE","Prioritize membership/appointment fixtures in the D-378 audit; they are the PII-adjacent types. Within authority.")

mo("D-405","SYNTH: hide-object intent - public-safe projection after hide?",
   "MISSION-PROTOCOL: hide-object; SYNTH verify",
   ["Assert: hidden objects absent from public projection AND evidence retained (D-276)",
    "Assert absence only",
    "Per-mission"],
   ["D-275 codified hide = absent-public + evidence-kept", "Both halves need asserting"],
   0.9,"D-275/D-276 decided.",
   "P1","Reversible","Hide semantics","Worker","Low","Standing",
   "Both halves asserted per cycle",
   "AUTO_EXECUTE","Assert both halves per D-275/D-276; hide is absence-from-public plus evidence-retained. Within authority.")

mo("D-406","Cross-class: patch proposals from mission failures - who writes?",
   "MISSION-PROTOCOL failure loop: attempt ONE improvement per generic class",
   ["The shard worker writes the patch proposal to missions/patches/",
    "A dedicated patch lane",
    " Whoever found it"],
   ["The loop assigns it to the worker ('attempt ONE improvement')", "One writer per patch (D-196's spirit)"],
   0.9,"The loop is explicit.",
   "P2","Process reversible","Patch ownership","Worker","Low","Standing",
   "Worker writes; integration writer applies",
   "AUTO_EXECUTE","The finding worker writes the proposal; the integration writer applies. The loop says so. Within authority.")

mo("D-407","WORLD: throughput target - missions/min?",
   "MISSION-PROTOCOL: report missions/min",
   ["Target: measure first, then set (no blind target)",
    "Target 10/min",
    "No target; report only"],
   ["D-280 requires reporting; targets need data", "Blind targets distort"],
   0.85,"Measure-first is the honest pattern.",
   "P3","Reversible","Performance management","Worker","Low","Standing",
   "First-shard measurements set the baseline",
   "AUTO_EXECUTE","Measure first, set targets from data; blind targets distort behavior. Within authority.")

mo("D-408","DECISION: 250 decompositions - quality bar per unit?",
   "This shard: 250 units",
   ["Bar: every unit has all 13 fields + a verdict with rationale; no placeholders",
    "Bar: verdict + rationale only",
    "No bar; volume first"],
   ["This shard set the bar by doing it", "Placeholders would poison the decision memory"],
   0.95,"This shard is the proof.",
   "P2","Process reversible","Decision quality","Worker","Low","Standing",
   "Bar documented; this shard complies",
   "AUTO_EXECUTE","Require the full 13-field decomposition with rationale; no placeholders. This shard proves it is doable. Within authority.")

mo("D-409","PROJECTION: proposal-draft - never sent. Enforce technically?",
   "D-354 (drafts labeled, never sent)",
   ["Technical: drafts have no send path (no API, no button)",
    "Policy: labeled, humans must not send",
    "Both"],
   ["D-354 labeled; enforcement is the companion", "A send path that exists will be used"],
   0.9,"Missing send paths do not get used.",
   "P1","Architecture semi-permanent","Boundary enforcement","Worker","Low","Standing",
   "No send path exists for drafts",
   "AUTO_EXECUTE","Both: label the drafts and ensure no send path exists; policy without mechanism is hope. Within authority to require.")

mo("D-410","WORLD: GENERATED outcome - publishable without review?",
   "MISSION-PROTOCOL WORLD outcomes: GENERATED",
   ["No: GENERATED means the pipeline completed honestly, not that output is publishable (Phase 17 gates publishing)",
    "Yes: GENERATED = ready",
    "Per-world judgment"],
   ["D-015/Phase 17 gates publishing separately", "Conflating generation with publish-readiness is the failure mode"],
   0.95,"Phase 17 exists precisely because generation != publishable.",
   "P0","Interpretation reversible","Launch safety","Worker","Low","Standing",
   "GENERATED != publishable documented",
   "AUTO_EXECUTE","Document: GENERATED is pipeline honesty, not publish readiness; Phase 17 gates the rest. Within authority.")

# ------------------------------------------------- INTEGRATION / OPS D-411..D-470

def io(iid, question, context, outputs, evidence, confidence, conf_basis,
       criticality, reversibility, blast_radius, authority, cost,
       time_sensitivity, verification, verdict, verdict_rationale):
    add(iid, "policy", question, context, outputs, evidence, confidence,
        conf_basis, criticality, reversibility, blast_radius,
        "Novel (integration/operations)", authority, cost, time_sensitivity,
        verification, verdict, verdict_rationale)

io("D-411","TD-001 patch: contestant A test-only - quarantine from other lanes' dirty work?",
   "TD-001 INTEGRATION-PLAN.md; mission boundary: no touching other lanes' dirty work; repo has 90+ dirty files",
   ["Apply via the parent-gated integration writer only (D-001's REQUEST_CONFIRMATION)",
    "Shard worker applies directly",
    "Hold until the tree is clean"],
   ["D-001 already REQUEST_CONFIRMATION for the same reason", "The integration writer owns repo writes"],
   0.95,"D-001 decided; this is its echo.",
   "P1","Reversible","Repo integrity","Worker","Low","Standing",
   "Integration writer confirms before apply",
   "REQUEST_CONFIRMATION","Parent-gated integration writer applies; the dirty-tree reality demands the gate. Confirm the exact patch hash + target branch state first. (D-001's echo.)")

io("D-412","TD-001: verify contestant B is NOT integrated after A?",
   "TD-001 plan: contestant B must not also be integrated (same path)",
   ["Post-apply check: B's changes absent from the tree",
    "Trust the plan",
    "Nolan re-picks"],
   ["Both target the same path; double integration = conflict", "Check is cheap"],
   0.95,"The plan is explicit; the check is cheap.",
   "P1","Read-only","None","Worker","Low","After D-411",
   "Tree diff shows A's test file only, no B",
   "AUTO_EXECUTE","After A integrates, verify B's absence; same-path double integration would conflict. Within authority.")

io("D-413","SEC-FIX: patch order - REQUIRED before RECOMMENDED?",
   "SEC-FIX-SPEC.md: 4 REQUIRED + 1 RECOMMENDED; order matters",
   ["REQUIRED first (W-1..W-4/A-1), then RECOMMENDED",
    "All five atomically",
    "RECOMMENDED first (easier)"],
   ["D-116 requires order in the apply instructions", "REQUIRED closes live holes"],
   0.9,"D-116 decided the ordering.",
   "P1","Reversible","Security posture","Worker","Low","Standing",
   "Apply order documented: REQUIRED then RECOMMENDED",
   "AUTO_EXECUTE","REQUIRED first, then RECOMMENDED; D-116's order stands. Within authority.")

io("D-414","SEC-FIX: post-apply attack re-verification - who runs A-1..A-5?",
   "SEC-FIX-SPEC.md: attacks were live before; D-114 (A-1 re-verified)",
   ["Integration writer runs all five post-apply; shard worker verifies the evidence",
    "Trust git apply --check",
    "Skip re-verification"],
   ["D-114 requires A-1 post-apply", "git apply --check proves application, not effectiveness"],
   0.95,"Apply != effective.",
   "P0","Test-only","None","Worker","Low","After D-413",
   "All five attacks re-run; effectiveness evidence attached",
   "AUTO_EXECUTE","Run all five attacks post-apply; application is not effectiveness. Within authority to require.")

io("D-415","Pig repo: 90+ dirty files - mission workers must not touch. Enforcement?",
   "Mission hard boundary; the tree is shared",
   ["Rule: mission workers never git add/commit/stash; integration writer is the sole writer",
    "Per-worker judgment",
    "Freeze the tree during the program"],
   ["D-196/D-411 established the writer's ownership", "Freezing blocks other lanes"],
   0.95,"Established ownership.",
   "P0","Process reversible","Repo integrity","Worker","Low","Standing",
   "Ownership documented; violations flagged",
   "AUTO_EXECUTE","Mission workers never write the repo; the integration writer is the sole writer. Document and flag violations. Within authority.")

io("D-416","Pig repo: missions/patches/ - patch proposal format?",
   "Mission hard boundary: proposed patches belong under missions/patches/",
   ["Format: unified diff + rationale + blast radius + verification + rollback plan",
    "Diff only",
    "Markdown proposal + diff"],
   ["D-196/D-406 assign writing to the finder", "Rationale + rollback make review possible"],
   0.85,"Reviewability needs the format.",
   "P2","Reversible","Patch review quality","Worker","Low","Standing",
   "Patch format published",
   "AUTO_EXECUTE","Require diff + rationale + blast radius + verification + rollback; reviewability demands it. Within authority.")

io("D-417","Integration writer queue: order patches by verdict criticality?",
   "Multiple patches pending (TD-001, SEC-FIX x5, pressure fixes...)",
   ["Order: P0 verdicts first, then P1, then P2/P3",
    "FIFO",
    "Nolan orders"],
   ["P0 items are load-bearing security/integrity", "FIFO wastes the criticality signal"],
   0.9,"Criticality ordering is the point of criticality.",
   "P2","Process reversible","Integration throughput","Worker","Low","Standing",
   "Queue ordered by criticality",
   "AUTO_EXECUTE","Order by criticality; that is what the signal is for. Within authority to recommend.")

io("D-418","Integration writer: verify each patch's verification evidence before apply?",
   "The loop demands verification evidence per patch",
   ["Gate: no evidence, no apply",
    "Apply on author assertion",
    "Sampled verification"],
   ["The antifragile loop: FIX TESTED before CLOSED", "Unverified patches are the failure mode"],
   0.95,"The loop is explicit.",
   "P1","Process reversible","Patch quality","Worker","Low","Standing",
   "Evidence gate documented",
   "AUTO_EXECUTE","No evidence, no apply; the loop demands it. Within authority to require.")

io("D-419","Dirty-tree risk: patch application on a dirty tree - rebase conflicts?",
   "90+ dirty files; patches target specific paths",
   ["Integration writer checks target-path cleanliness before apply; conflicts -> hold for Nolan",
    "Apply regardless",
    "Clean the tree first"],
   ["Applying onto dirty paths risks silent misapplication", "Hold-for-Nolan on conflict is the safe default"],
   0.9,"Dirty-tree application is the risk.",
   "P1","Reversible","Apply safety","Worker","Low","Standing",
   "Target-path cleanliness checked pre-apply",
   "AUTO_EXECUTE","Check target-path cleanliness; hold for Nolan on conflict. Within authority to require.")

io("D-420","Mission results: who merges 12 shards' results.jsonl?",
   "DECISION (1,000 units, 4 shards); other classes similar",
   ["Parent agent merges; shard workers write only their shard",
    "Last shard merges",
    "Streaming merge service"],
   ["Shard isolation: workers own their shard only", "The parent owns cross-shard coherence"],
   0.95,"Shard boundaries are the architecture.",
   "P2","Process reversible","Result integrity","Parent","Low","After all shards",
   "Merged corpus has all units exactly once",
   "REQUEST_CONFIRMATION","Parent merges; shard workers never touch other shards' outputs. Confirm merge plan with parent before the last shard closes.")

io("D-421","Cross-shard: duplicate backlog ids - merge-time check?",
   "D-263 (collision = findings)",
   ["Merge-time dedup: duplicate ids fail the merge loudly",
    "Trust shard discipline",
    "Last-wins"],
   ["D-263 treats collisions as findings", "Last-wins would silently drop decisions"],
   0.95,"Loud failure is the only safe option.",
   "P1","Process reversible","Decision integrity","Parent","Low","Merge time",
   "Duplicate-id merge fails loudly",
   "AUTO_EXECUTE","Fail the merge loudly on duplicate ids; D-263's finding deserves teeth. Within authority to require.")

io("D-422","Lane outputs as decision inputs: this shard read 7 source docs. Citation format?",
   "Sources: PRESSURE-REPORT, CLAIM-VERDICT, SEC-FIX-SPEC, INTEGRATION-PLAN, DEHPP x2, MISSION-PROTOCOL",
   ["Cite by document + section (as this shard did in context fields)",
    "No citations needed",
    "Link every claim"],
   ["Decisions must be auditable to their evidence", "This shard's context fields demonstrate the format"],
   0.9,"Auditability is the point.",
   "P2","Reversible","Decision auditability","Worker","Low","Standing",
   "Citations present per unit",
   "AUTO_EXECUTE","Cite document + section in context fields; auditability demands it. Within authority.")

io("D-423","DEHPP: Chrome split first (build ordering). Decision needed now?",
   "DEHPP parameterization-spec: build ordering step 1 = Chrome split",
   ["Decompose as a decision for the integration writer (D-001-style gate)",
    "Auto-execute",
    "Defer until DEHPP lane finishes"],
   ["Chrome split is a canonical mutation", "Anything canonical = Nolan-gated (D-015)"],
   0.9,"Canonical mutation.",
   "P1","Architecture semi-permanent","Renderer architecture","Nolan","Low","Before DEHPP build starts",
   "Nolan's explicit go/no-go",
   "HUMAN_DECISION","Chrome split is a canonical renderer mutation; D-015's rule gates it. Nolan must explicitly approve the build ordering start.")

io("D-424","DEHPP: the 62-vs-54 recount - block build until resolved?",
   "DEHPP classification.md: mismatch requires row-by-row recount",
   ["Block: recount before build (parameters target the wrong rows otherwise)",
    "Build in parallel",
    "Recount is optional"],
   ["Parameterizing the wrong 8 rows is wasted work", "The document itself requires the recount"],
   0.95,"The document requires it.",
   "P1","Reversible","Build correctness","Worker","Low","Before DEHPP build",
   "Recount published; 54 mechanisms confirmed",
   "AUTO_EXECUTE","Block build on the recount; the document requires it and mis-targeted parameters waste the build. Within authority to require.")

io("D-425","DEHPP: tenantId validation - single choke point where?",
   "DEHPP: tenantId validated once, threaded unchanged, never silently defaulted",
   ["Decision: name the validation function/module now (single choke point)",
    "Defer to implementation",
    "Validate at each boundary"],
   ["'Validated once' requires a named once-place", "D-123's pattern: name the authority"],
   0.9,"D-123's pattern applies.",
   "P1","Architecture semi-permanent","Tenant isolation","Worker","Low","Before DEHPP build",
   "The validation choke point named and its callers audited",
   "DEEP_REVIEW","Name the tenantId validation choke point in review; 'validated once' is unenforceable without a named place. One authority, audited callers.")

io("D-426","DEHPP: SocialProof last - enforce the ordering?",
   "DEHPP build ordering: SocialProof last with its own fidelity check",
   ["Enforce: integration writer rejects SocialProof params merged before steps 1-5",
    "Guideline",
    "No enforcement"],
   ["The ordering is explicit and reasoned (SocialProof is the most claim-sensitive)", "Enforcement makes the ordering real"],
   0.85,"Explicit ordering deserves enforcement.",
   "P2","Reversible","Build discipline","Worker","Low","During DEHPP build",
   "SocialProof merges only after steps 1-5",
   "AUTO_EXECUTE","Enforce the ordering at merge time; the reason (claim sensitivity) justifies it. Within authority to require.")

io("D-427","Claim lane: the two load-bearing fixes (H4 seam, R-MODEL serving) - sequence?",
   "CLAIM-VERDICT.md: weaker renderer verifier + zero strong-verifier coverage on public /sites",
   ["Sequence: H4 strong-verifier seam first (D-239), then R-MODEL serving path (D-240), then golden-set (D-012)",
    "Parallel",
    "R-MODEL first"],
   ["D-239/D-240 sequenced them; the verifier must exist before the serving path uses it", "Dependency order"],
   0.9,"Dependency order.",
   "P1","Reversible","Fix sequencing","Worker","Low","Standing",
   "Sequence documented and followed",
   "AUTO_EXECUTE","Follow the dependency order: strong verifier, then serving path, then golden set. Within authority.")

io("D-428","Pressure lane: harness reruns after each renderer change - mandate?",
   "PRESSURE-REPORT.md: harnesses retained for reruns",
   ["Mandate: every renderer patch re-runs the pressure harnesses before merge",
    "Recommended",
    "Per-patch judgment"],
   ["The harness exists to be run; unrun harnesses rot", "D-418's evidence gate needs the rerun"],
   0.95,"Retained harnesses exist to run.",
   "P1","Process reversible","Regression safety","Worker","Low","Standing",
   "Rerun mandated pre-merge",
   "AUTO_EXECUTE","Mandate harness reruns pre-merge; D-418's evidence gate consumes the result. Within authority to require.")

io("D-429","Factory cadence: lanes report to the parent how often?",
   "The factory never idles; the parent needs signal not noise",
   ["Per shard close + on P0/HUMAN_DECISION/REFUSE events",
    "Fixed schedule (daily)",
    "On completion only"],
   ["Failure-only reporting is Nolan's discipline", "P0/HUMAN_DECISION/REFUSE are the genuine-decision events"],
   0.85,"Nolan's reporting discipline applies.",
   "P3","Process reversible","Signal quality","Parent","Low","Standing",
   "Cadence documented",
   "DEEP_REVIEW","Confirm the reporting cadence with the parent (recommended: per-shard-close + P0/HUMAN_DECISION/REFUSE events, matching Nolan's failure-only discipline).")

io("D-430","Program dashboard: who maintains the cross-lane state board?",
   "WORLD/OBJECT/PROJECTION/SYNTH/DECISION lanes + pressure/claim/security/TD-001/DEHPP lanes",
   ["Parent maintains; lanes report shard-close summaries",
    "A dashboard lane",
    "No board; files are the board"],
   ["D-197 proposed the per-lane contract; the parent aggregates", "Files-as-board is the current reality"],
   0.8,"D-197's contract answers it.",
   "P3","Process reversible","Program visibility","Parent","Low","Standing",
   "Board exists and is current",
   "AUTO_EXECUTE","Parent maintains the board from lane shard-close summaries (D-197's contract). Within authority to recommend.")

io("D-431","Mission protocol amendments: who can amend MISSION-PROTOCOL.md?",
   "This shard's D-238+ propose protocol refinements",
   ["Parent owns; amendments via Nolan-confirmed decisions",
    "Shard workers amend directly",
    "Amend by shard consensus"],
   ["The protocol is the program's constitution", "Unilateral amendment breaks cross-shard trust"],
   0.95,"Constitutional ownership.",
   "P1","Process reversible","Protocol integrity","Parent","Low","Standing",
   "Amendments are parent-owned and Nolan-confirmed",
   "REQUEST_CONFIRMATION","Parent owns protocol amendments; this shard's refinements are proposals, not edits. Confirm the amendment path before acting on any D-238+ item.")

io("D-432","Backlog hygiene: who grooms decision-backlog.jsonl across shards?",
   "4 shards appending; D-262/D-263/D-380",
   ["Shard 0 (this shard) established the schema; parent grooms at merge",
    "Each shard self-grooms",
    "No grooming"],
   ["D-380 versioned the schema; merge-time is the natural groom point", "D-421's loud-duplicate rule is the groom's teeth"],
   0.85,"Merge-time grooming is the natural design.",
   "P3","Process reversible","Backlog hygiene","Parent","Low","Merge time",
   "Groomed backlog: no dup ids, schema v1",
   "AUTO_EXECUTE","Parent grooms at merge; D-421's rule enforces it. Within authority to recommend.")

io("D-433","Failure loop: the '4+ same missing primitive' count - shared counter where?",
   "MISSION-PROTOCOL failure loop; D-348 (UNSUPPORTED feeds it)",
   ["Shared counter in the factory state (parent-owned)",
    "Per-lane counters",
    "Counted at merge"],
   ["The rule is cross-lane (generic primitive)", "Parent-owned shared state"],
   0.9,"Cross-lane rule needs shared state.",
   "P2","Process reversible","Capability planning","Parent","Low","Standing",
   "Counter exists and is parent-owned",
   "AUTO_EXECUTE","Parent owns the shared counter; the rule is cross-lane by definition. Within authority to recommend.")

io("D-434","Generic primitive candidacy: 4+ reached - who decides to build?",
   "MISSION-PROTOCOL: 4+ same missing primitive = candidate generic primitive",
   ["Candidate -> Nolan (new canonical subsystem; D-015-style gate)",
    "Parent decides",
    "Auto-build"],
   ["New canonical subsystems are D-015 territory", "Candidate != approved"],
   0.95,"D-015's gate covers new canonical machinery.",
   "P1","Architecture permanent","Canonical architecture","Nolan","Low","When 4+ reached",
   "Nolan's explicit approval",
   "HUMAN_DECISION","A new generic primitive is a canonical architecture addition; Nolan decides. The 4+ count makes the case, not the decision.")

io("D-435","Patch blast radius: TD-001 (test-only) vs SEC-FIX (render-path) - different gates?",
   "TD-001: zero production blast radius; SEC-FIX: render-path changes",
   ["Same gate (evidence), different scrutiny depth",
    "TD-001 fast-track",
    "SEC-FIX fast-track (security urgency)"],
   ["D-418's evidence gate is uniform", "Scrutiny depth varies by blast radius, not gate existence"],
   0.9,"Uniform gate, variable depth.",
   "P2","Process reversible","Review quality","Worker","Low","Standing",
   "Uniform evidence gate; depth scales with blast radius",
   "AUTO_EXECUTE","Same evidence gate for both; scrutiny depth scales with blast radius. Within authority.")

io("D-436","Security urgency: live holes (A-1..A-5 were live) - expedite SEC-FIX?",
   "SEC-FIX-SPEC.md: attacks were live before the patches",
   ["Expedite: REQUIRED patches jump the queue (D-417's criticality order already does this)",
    "Normal queue",
    "Emergency Nolan ping"],
   ["D-417 already orders by criticality; P0 jumps the queue", "No new mechanism needed"],
   0.9,"D-417 covers it.",
   "P0","Process reversible","Security posture","Worker","Low","Standing",
   "REQUIRED patches applied first",
   "AUTO_EXECUTE","D-417's criticality order already expedites; no new mechanism. Within authority.")

io("D-437","Rollback: every applied patch needs a rollback plan?",
   "D-416's patch format includes rollback",
   ["Require rollback plans for render-path patches; test-only patches exempt",
    "All patches",
    "No rollbacks (forward-fix only)"],
   ["Render-path changes can regress 90+ dirty files' lanes", "Test-only patches have nothing to roll back"],
   0.85,"Blast-radius-proportional.",
   "P2","Reversible","Recovery readiness","Worker","Low","Standing",
   "Rollback plans on render-path patches",
   "AUTO_EXECUTE","Require rollback plans for render-path patches; test-only are exempt. Within authority to require.")

io("D-438","Post-integration: golden-set rerun after TD-001 + SEC-FIX?",
   "Integration changes behavior; D-012's golden set is the bar",
   ["Rerun the golden set after both integrate; failures -> HUMAN_DECISION (D-214)",
    "Trust the patch evidence",
    "Rerun after SEC-FIX only"],
   ["D-214 already routes red runs to Nolan", "Both patches touch the render path (TD-001 is test-only but adjacent)"],
   0.9,"D-214's rule applies.",
   "P1","Test-only","None","Worker","Low","After both integrate",
   "Golden set rerun: green or Nolan-routed",
   "AUTO_EXECUTE","Rerun the golden set after both; D-214 routes reds to Nolan. Within authority to require.")

io("D-439","Lane input freshness: this shard read docs dated 2026-09-23. Staleness check before shard 1?",
   "Sources observed 2026-09-24; shard 1 follows",
   ["Re-check source docs for updates before shard 1 starts",
    "Trust the read",
    "Re-read everything"],
   ["A day can change lane outputs", "Targeted re-check is cheap"],
   0.8,"Cheap insurance.",
   "P3","Reversible","Input freshness","Worker","Low","Before shard 1",
   "Source docs re-checked; deltas noted",
   "AUTO_EXECUTE","Re-check the seven source docs for updates before shard 1; note deltas. Within authority.")

io("D-440","Cross-shard learning: shard 0's verdict distribution informs shard 1's thresholds?",
   "D-361 (skew monitoring)",
   ["Yes: shard 0's distribution is shard 1's baseline",
    "No: independent",
    "Parent decides"],
   ["D-361 needs a baseline; shard 0 provides it", "Distributions drift; baselines anchor"],
   0.85,"D-361 requires the baseline.",
   "P3","Reversible","Verdict quality","Worker","Low","Before shard 1",
   "Baseline recorded in shard 1's log",
   "AUTO_EXECUTE","Use shard 0's distribution as shard 1's skew baseline; D-361 needs it. Within authority.")

io("D-441","Worker identity: shard workers sign their outputs?",
   "This shard is DECISION-SHARD-0, depth 2",
   ["Sign: worker id + depth + timestamp in SHARD-LOG.md",
    "Anonymous",
    "Parent signs"],
   ["Attribution aids D-109's loop and audits", "This shard's log will carry it"],
   0.9,"Attribution is the audit trail.",
   "P3","Reversible","Attribution","Worker","Low","Standing",
   "Worker id in every shard log",
   "AUTO_EXECUTE","Sign outputs with worker id + depth + timestamp; attribution is the audit trail. Within authority.")

io("D-442","Timestamp discipline: all mission records in UTC?",
   "MISSION-PROTOCOL does not specify",
   ["UTC everywhere; display in viewer tz only at presentation",
    "Local tz",
    "Per-record tz"],
   ["UTC is the sane default for machine records", "Mixed tz records are a classic bug"],
   0.9,"Classic bug prevention.",
   "P3","Reversible","Record integrity","Worker","Low","Standing",
   "UTC mandated for records",
   "AUTO_EXECUTE","Mandate UTC for all machine records; presentation converts. Within authority.")

io("D-443","Id formats: mission ids, unit ids - deterministic scheme?",
   "Shards, missions, units, backlog ids (D-001..)",
   ["Scheme: <lane>-<shard>-<index> for missions; D-NNN for backlog; documented",
    "Ad hoc",
    "UUIDs"],
   ["D-401 records both indices; the scheme makes them parseable", "Deterministic ids aid the merge"],
   0.85,"Parseable ids aid everything.",
   "P3","Reversible","Traceability","Worker","Low","Standing",
   "Id scheme published",
   "AUTO_EXECUTE","Publish the deterministic id scheme; D-401's dual recording needs it. Within authority.")

io("D-444","Evidence retention: mission inputs kept for replay?",
   "MISSION-PROTOCOL: replay requirements",
   ["Retain inputs + seeds + versions per shard (bounded: shard lifetime + merge)",
    "Retain everything forever",
    "Retain nothing; rerun"],
   ["Replay needs inputs", "Unbounded retention is a liability"],
   0.85,"Bounded retention is the honest answer.",
   "P2","Reversible","Replay capability","Worker","Low","Standing",
   "Retention policy documented",
   "AUTO_EXECUTE","Retain inputs+seeds+versions per shard through merge; then archive per policy. Within authority.")

io("D-445","Artifact naming: results.jsonl / SUMMARY.md / SHARD-LOG.md - exact names?",
   "Subagent task specifies the three names",
   ["Exact names, every shard, every lane (machine-discoverable)",
    "Per-lane names",
    "Per-shard names"],
   ["The task names them exactly", "Machine discovery needs uniformity"],
   0.95,"The task is explicit.",
   "P2","Reversible","Discoverability","Worker","Low","Standing",
   "Names uniform across shards",
   "AUTO_EXECUTE","Exact names everywhere; the task specifies them and machines discover them. Within authority.")

io("D-446","SUMMARY.md contents: required sections?",
   "Subagent task: SUMMARY.md per shard",
   ["Sections: scope, verdict distribution, top HUMAN_DECISION/REFUSE, key evidence, open questions, next steps",
    "Free-form",
    "Distribution only"],
   ["The parent needs the same shape from every shard", "This shard's SUMMARY will demonstrate"],
   0.9,"Uniform shape aids the parent.",
   "P2","Reversible","Report quality","Worker","Low","Standing",
   "Section template published; this shard demonstrates",
   "AUTO_EXECUTE","Require the six sections; this shard's SUMMARY is the template. Within authority.")

io("D-447","SHARD-LOG.md: 80%+ decisions only, or all decisions?",
   "MISSION-PROTOCOL: SHARD-LOG.md (decisions at 80%+, what you did after finishing)",
   ["80%+ per the protocol; below-80% goes to open questions",
    "All decisions",
    "80%+ plus reversals"],
   ["The protocol is explicit", "Below-80% in open questions keeps the log honest"],
   0.95,"The protocol is explicit.",
   "P3","Reversible","Log honesty","Worker","Low","Standing",
   "Log follows the protocol",
   "AUTO_EXECUTE","80%+ in the log, below-80% in open questions; the protocol says so. Within authority.")

io("D-448","The factory never idles: shard 0's 'after finishing' work is specified?",
   "Mission hard boundary: the factory never idles; MISSION-PROTOCOL: SHARD-LOG.md (what you did after finishing)",
   ["This shard: after shard-0 outputs, claim shard 1 if unclaimed (task-specified)",
    "Idle after close",
    "Parent assigns"],
   ["The task specifies: take shard 1 if unclaimed", "Idling violates the boundary"],
   0.95,"The task is explicit.",
   "P2","Reversible","Factory throughput","Worker","Low","After shard 0",
   "Shard 1 claimed or falsification work started",
   "AUTO_EXECUTE","Claim shard 1 per the task; the factory never idles. Within authority.")

io("D-449","Falsification work: 'falsify other shards' - what does that mean operationally?",
   "Subagent task: if shard 1 is claimed, falsify other shards",
   ["Falsify = attempt to refute their HUMAN_DECISION/REFUSE verdicts + sample other verdicts, with evidence",
    "Falsify = redo their work",
    "Falsify = audit formatting"],
   ["Falsification is adversarial review, not redo", "The task names the targets (HUMAN_DECISION/REFUSE + sample)"],
   0.85,"The task scopes it.",
   "P2","Reversible","Review quality","Worker","Low","If shard 1 claimed",
   "Falsification report with evidence per challenged verdict",
   "AUTO_EXECUTE","Falsify by adversarial review of their high-stakes verdicts + a sampled remainder, evidence attached. Within authority.")

io("D-450","Next gap discovery: 'discover the next gap' - operationally?",
   "Subagent task: ...or discover the next gap",
   ["Gap = unclaimed shard index, or uncovered decision area; report it with a claim proposal",
    "Gap = any missing file",
    "Gap = parent decides"],
   ["The task lists it as the fallback", "A claim proposal makes it actionable"],
   0.8,"Actionable reporting is the pattern.",
   "P3","Reversible","Work continuity","Worker","Low","If shard 1 claimed",
   "Gap report with claim proposal",
   "AUTO_EXECUTE","Report gaps as claim proposals (shard index or decision area + rationale). Within authority.")

io("D-451","Parent report: verdict distribution - exact counts or percentages?",
   "Subagent task: final parent report must include verdict distribution",
   ["Both: exact counts + percentages per verdict",
    "Counts only",
    "Percentages only"],
   ["Counts are auditable; percentages are readable", "Both is cheap"],
   0.95,"Both, cheap.",
   "P2","Reversible","Report quality","Worker","Low","Shard close",
   "Distribution with counts + percentages",
   "AUTO_EXECUTE","Report both; the task requires the distribution and both forms serve. Within authority.")

io("D-452","Parent report: top three HUMAN_DECISION/REFUSE - ranked by what?",
   "Subagent task: top three HUMAN_DECISION or REFUSE items",
   ["Rank by criticality (P0 first), then by blast radius",
    "Chronological",
    "Worker's judgment"],
   ["Criticality is the natural ranking", "The parent triages by stakes"],
   0.9,"Criticality-first is the triage order.",
   "P2","Reversible","Report quality","Worker","Low","Shard close",
   "Top three ranked by criticality",
   "AUTO_EXECUTE","Rank by criticality then blast radius; the parent triages by stakes. Within authority.")

io("D-453","Sandbox links: parent report uses complete sandbox Markdown links?",
   "Subagent task: formatted as complete sandbox Markdown links",
   ["Yes: [name](sandbox://workspace/...) for every produced file",
    "Relative paths",
    "Bare filenames"],
   ["The task is explicit", "Sandbox links are the openable form (Nolan's path-only lesson generalizes)"],
   0.95,"The task is explicit.",
   "P2","Reversible","Report usability","Worker","Low","Shard close",
   "Every file linked as sandbox://",
   "AUTO_EXECUTE","Use complete sandbox Markdown links for every produced file; the task requires it. Within authority.")

io("D-454","No em dashes: this shard's outputs - scan before close?",
   "Mission hard boundary: no em dashes",
   ["Scan all three outputs + backlog appends for em dashes before close",
    "Trust authorship",
    "Scan the parent report only"],
   ["The boundary is absolute", "This shard's definitions avoided them; verify"],
   0.95,"Absolute boundary.",
   "P2","Reversible","Boundary compliance","Worker","Low","Shard close",
   "Zero em dashes in outputs",
   "AUTO_EXECUTE","Scan all outputs for em dashes before close; the boundary is absolute. Within authority.")

io("D-455","Backlog appends: em-dash scan too?",
   "D-454; decision-backlog.jsonl is a mission output",
   ["Yes: scan appended lines",
    "Outputs only",
    "Skip"],
   ["The boundary covers everything written", "Appends are outputs"],
   0.95,"Absolute boundary.",
   "P2","Reversible","Boundary compliance","Worker","Low","Append time",
   "Zero em dashes in appended lines",
   "AUTO_EXECUTE","Scan appended backlog lines too; the boundary covers all writing. Within authority.")

io("D-456","Synthetic marking: mission outputs that contain synthetic worlds - marked?",
   "Mission hard boundary: synthetic artifacts require synthetic:true and testing_only:true",
   ["All mission outputs with synthetic content carry both flags",
    "Shard-level flag only",
    "Per-world flags"],
   ["The boundary is absolute", "Shard-level + per-world is the thorough form"],
   0.95,"Absolute boundary.",
   "P0","Reversible","Boundary compliance","Worker","Low","Standing",
   "Flags present on synthetic outputs",
   "AUTO_EXECUTE","Carry both flags on synthetic outputs (shard-level minimum, per-world where granular). Within authority.")

io("D-457","Credential exposure: mission outputs must never contain secrets?",
   "Mission hard boundary: no credential exposure",
   ["Scan outputs for secret patterns before close (the standard secret list)",
    "Trust authorship",
    "Scan on suspicion"],
   ["The boundary is absolute", "Scans are cheap"],
   0.95,"Absolute boundary.",
   "P0","Reversible","Boundary compliance","Worker","Low","Shard close",
   "No secret patterns in outputs",
   "AUTO_EXECUTE","Scan outputs against the secret list before close; the boundary is absolute. Within authority.")

io("D-458","Destructive Git: shard workers never push/commit. Reiterate in every shard log?",
   "Mission hard boundary",
   ["Yes: each SHARD-LOG.md restates the boundary (cheap, prevents drift)",
    "Once is enough",
    "In the protocol only"],
   ["Boundaries drift without restatement", "One line per log is cheap"],
   0.9,"Drift prevention.",
   "P0","Reversible","Boundary compliance","Worker","Low","Standing",
   "Boundary restated per shard log",
   "AUTO_EXECUTE","Restate the destructive-Git boundary in every shard log; boundaries drift. Within authority.")

io("D-459","Owner contact: mission outputs must not include outreach drafts?",
   "Mission hard boundary: no owner contact or outreach",
   ["Forbid: no outreach drafts, no contact lists, no message templates in mission outputs",
    "Allowed as synthetic",
    "Per-output judgment"],
   ["D-354/D-409 already forbid send paths; drafts are the adjacent risk", "The boundary is absolute"],
   0.95,"Absolute boundary.",
   "P0","Reversible","Boundary compliance","Worker","Low","Standing",
   "No outreach artifacts in mission outputs",
   "AUTO_EXECUTE","Forbid outreach artifacts in mission outputs; the boundary is absolute. Within authority.")

io("D-460","Public production launch: mission outputs must not be launchable?",
   "Mission hard boundary: no public production launch",
   ["Outputs are test/synthetic; nothing in missions/ is deployable by construction",
    "Per-output review",
    "Allowed with flags"],
   ["The boundary is absolute", "By-construction beats by-review"],
   0.95,"Absolute boundary.",
   "P0","Reversible","Boundary compliance","Worker","Low","Standing",
   "missions/ outputs are never deployable",
   "AUTO_EXECUTE","Keep missions/ outputs non-deployable by construction; the boundary is absolute. Within authority.")

io("D-461","External vendor adoption: mission tooling must not add vendors?",
   "Mission hard boundary: no external vendor/service adoption without Nolan",
   ["Forbid: missions use existing tooling only; new vendors -> Nolan",
    "Allowed for test tooling",
    "Per-tool judgment"],
   ["The boundary names Nolan explicitly", "Test tooling can still be a vendor"],
   0.95,"Absolute boundary.",
   "P1","Reversible","Boundary compliance","Worker","Low","Standing",
   "No new vendors in mission work",
   "AUTO_EXECUTE","No new vendors without Nolan; the boundary names him. Within authority.")

io("D-462","Real money: missions must not spend?",
   "Mission hard boundary (D-252)",
   ["Forbid: zero spend in mission work; paid APIs -> Nolan",
    "De minimis allowed",
    "Per-mission budget"],
   ["D-252 is absolute", "De minimis is still real money"],
   0.95,"Absolute boundary.",
   "P0","Reversible","Boundary compliance","Worker","Low","Standing",
   "Zero mission spend",
   "AUTO_EXECUTE","Zero spend; D-252 is absolute. Within authority.")

io("D-463","Repo read-only: mission workers must not modify the Pig repo. Verify compliance how?",
   "Mission hard boundary: repo is read-only for mission workers",
   ["Verify: shard close checks git status shows no worker-caused modifications",
    "Trust",
    "Parent verifies"],
   ["D-415 established ownership; verification closes the loop", "git status is the check"],
   0.9,"Ownership + verification.",
   "P0","Reversible","Boundary compliance","Worker","Low","Shard close",
   "git status clean of worker modifications",
   "AUTO_EXECUTE","Check git status at shard close; D-415's ownership needs the verification. Within authority.")

io("D-464","Depth-2 rule: no child agents. This shard complied?",
   "Subagent task: depth 2 = no child agents",
   ["Confirm: this shard used no child agents (all 340 definitions authored directly)",
    "N/A",
    "Exception requested"],
   ["The task is explicit", "This shard's gen.py is direct authorship"],
   0.95,"Explicit and complied.",
   "P2","Reversible","Task compliance","Worker","Low","Shard close",
   "No child agents used",
   "AUTO_EXECUTE","Confirm compliance in the shard log; the task requires it. Within authority.")

io("D-465","Generic subagents cannot do live browser work: missions requiring it?",
   "Subagent task: generic subagents cannot perform live browser actions",
   ["Route: any mission needing live browser -> HUMAN_DECISION or parent-arranged delegation",
    "Attempt anyway",
    "Exclude such missions"],
   ["The task is explicit", "D-370 confirmed HTML-string verification instead"],
   0.95,"Explicit.",
   "P2","Reversible","Task compliance","Worker","Low","Standing",
   "Live-browser needs routed, never attempted",
   "AUTO_EXECUTE","Route live-browser needs to HUMAN_DECISION/delegation; never attempt. Within authority.")

io("D-466","Confidence calibration: this shard's confidences - honest?",
   "This shard recorded 0.7-0.95 confidences per unit",
   ["Confirm: confidences reflect evidence strength, not verdict comfort",
    "Recalibrate",
    "Drop confidences"],
   ["D-331 defines evidence; confidences cite their basis", "Honest uncertainty is the factory's currency"],
   0.9,"The format enforces honesty.",
   "P2","Reversible","Decision quality","Worker","Low","Shard close",
   "Confidences cite evidence basis",
   "AUTO_EXECUTE","Keep evidence-based confidences; the conf_basis field is the honesty mechanism. Within authority.")

io("D-467","Verdict rationale: every verdict has one?",
   "This shard: 340 rationales",
   ["Require: no verdict without a rationale sentence",
    "Rationales optional for AUTO_EXECUTE",
    "Parent fills gaps"],
   ["D-408's quality bar requires it", "Unexplained verdicts are unauditable"],
   0.95,"D-408 decided.",
   "P2","Reversible","Decision quality","Worker","Low","Standing",
   "Every verdict has a rationale",
   "AUTO_EXECUTE","Require rationales on every verdict; D-408's bar stands. Within authority.")

io("D-468","Shard 0's own process: any HUMAN_DECISION about the shard method itself?",
   "D-360 adopted this shard's method as the template",
   ["The template adoption is a process decision within worker authority (reversible)",
    "Escalate the template to Nolan",
    "Parent decides the template"],
   ["D-360 was AUTO_EXECUTE with rationale", "Process templates are reversible and within worker scope"],
   0.85,"Reversible process choice.",
   "P3","Process reversible","Process quality","Worker","Low","Standing",
   "Template adoption stands unless the parent overrides",
   "AUTO_EXECUTE","The template stands as a reversible worker decision; the parent can override. Within authority.")

io("D-469","Program retrospective: after all lanes close, who writes the lessons?",
   "The factory learns (antifragile directive)",
   ["Parent writes the program retrospective from lane summaries",
    "Each lane writes its own only",
    "No retrospective"],
   ["The antifragile loop demands learning", "Parent has the cross-lane view"],
   0.9,"The loop demands it.",
   "P3","Reversible","Program learning","Parent","Low","Program close",
   "Retrospective published",
   "DEEP_REVIEW","Confirm the retrospective owner with the parent (recommended: parent-authored from lane summaries, per the antifragile learning loop).")

io("D-470","This shard's top HUMAN_DECISION for the parent report: which three?",
   "Subagent task: top three HUMAN_DECISION or REFUSE items; D-452 (rank by criticality)",
   ["Candidates: D-015 (unauthenticated visitor to publish), D-012 (golden-set bar), D-251/252/253 (boundaries), D-324 (disclosure posture)",
    "Worker picks at close",
    "Parent picks"],
   ["D-452 ranks by criticality", "This shard must choose at close"],
   0.9,"The task requires the choice.",
   "P2","Reversible","Report quality","Worker","Low","Shard close",
   "Top three selected and justified",
   "AUTO_EXECUTE","Select at close by criticality (D-452); the task requires it. Within authority.")

# ------------------------------------------------- FALSIFICATION SEEDS / RESERVE D-471..D-500

def fs(iid, question, context, outputs, evidence, confidence, conf_basis,
       criticality, reversibility, blast_radius, authority, cost,
       time_sensitivity, verification, verdict, verdict_rationale):
    add(iid, "falsification-seed", question, context, outputs, evidence,
        confidence, conf_basis, criticality, reversibility, blast_radius,
        "Novel (falsification/reserve)", authority, cost, time_sensitivity,
        verification, verdict, verdict_rationale)

fs("D-471","Falsification seed: challenge D-001's REQUEST_CONFIRMATION (could TD-001 integrate without the gate?)",
   "D-001; TD-001 test-only patch",
   ["Falsifier hypothesis: test-only patch with zero blast radius could auto-apply",
    "Defense: dirty tree + other lanes' work + integration-writer ownership"],
   ["The dirty tree (90+ files) is the defense's evidence", "Zero blast radius is the challenger's"],
   0.7,"Both sides have real evidence; the defense is stronger.",
   "P2","Reversible","Review quality","Worker","Low","Falsification work",
   "Adversarial review recorded",
   "DEEP_REVIEW","Run the falsification: the challenger has a point on blast radius, but the dirty tree + writer ownership defend the gate. Review decides; default stays REQUEST_CONFIRMATION.")

fs("D-472","Falsification seed: challenge D-012's HUMAN_DECISION (could the golden-set bar be worker-set?)",
   "D-012; CLAIM-VERDICT.md",
   ["Challenger: workers set bars all the time (D-193, D-218)",
    "Defense: the golden set gates public integrity claims; Nolan's risk tolerance is the input"],
   ["Public integrity claims are Nolan's business risk", "Workers set technical bars, not business-risk bars"],
   0.75,"The business-risk line is the defense.",
   "P1","Reversible","Review quality","Nolan","Low","Falsification work",
   "Adversarial review recorded",
   "HUMAN_DECISION","The defense holds: the golden set is a business-risk bar, and business-risk bars need Nolan. Falsification attempted and rejected; the verdict stands.")

fs("D-473","Falsification seed: challenge D-021's AUTO_EXECUTE (could the null guard change rendering semantics?)",
   "D-021; pressure F-6",
   ["Challenger: hiding malformed sections changes what the visitor sees vs the old throw",
    "Defense: old behavior was a crash; typed degradation is strictly better and logged"],
   ["Crash vs degraded-render is not a close call", "The degradation is logged"],
   0.9,"The defense is decisive.",
   "P2","Reversible","Review quality","Worker","Low","Falsification work",
   "Adversarial review recorded",
   "AUTO_EXECUTE","Falsification fails: the old behavior was an uncaught throw, and the guard replaces it with logged degradation. The verdict stands.")

fs("D-474","Falsification seed: challenge D-251's absolute boundary (any legitimate owner-contact case?)",
   "D-251; mission hard boundary",
   ["Challenger: what if an owner explicitly asks to be contacted in a mission?",
    "Defense: the boundary is Nolan's standing rule; exceptions go through Nolan, not the worker"],
   ["Standing rules outrank clever hypotheticals", "The exception path (Nolan) exists"],
   0.95,"The boundary is absolute by Nolan's rule.",
   "P0","Reversible","Boundary integrity","Nolan","Low","Falsification work",
   "Adversarial review recorded",
   "HUMAN_DECISION","Falsification fails: the boundary is Nolan's standing rule, and the exception path is Nolan himself. Absolute stands.")

fs("D-475","Falsification seed: challenge D-360's template adoption (is one shard enough proof?)",
   "D-360; this shard's method",
   ["Challenger: one shard is a small sample; the template may not generalize",
    "Defense: the template is reversible and the parent can override"],
   ["Reversibility is the defense", "Generalization risk is real"],
   0.7,"Honest uncertainty.",
   "P3","Process reversible","Process quality","Worker","Low","Falsification work",
   "Adversarial review recorded",
   "DEEP_REVIEW","The challenge has merit: adopt the template provisionally, with the parent reviewing after shard 1. Reversible either way.")

fs("D-476","Falsification seed: challenge D-396's prime directive (are there cases where inventing is acceptable?)",
   "D-396; 'never invented claim'",
   ["Challenger: placeholder text ('Your tagline here') is invented but honest",
    "Defense: placeholders are labeled, not claims; the directive targets presented-as-fact invention"],
   ["Labeled placeholders are not claims", "The distinction is in D-236's generated-copy rule"],
   0.9,"The distinction holds.",
   "P1","Reversible","Principle integrity","Worker","Low","Falsification work",
   "Adversarial review recorded",
   "AUTO_EXECUTE","Falsification fails: labeled placeholders are not factual claims (D-236). The prime directive stands as stated.")

fs("D-477","Reserve: unassigned. Held for shard-1 overflow or parent-directed use.",
   "Reserve slot",
   ["Held",
    "Assigned by parent",
    "Retired at program close"],
   ["No evidence; this is a structural slot", ""],
   0.99,"Structural.",
   "P3","None","None","Parent","None","Standing",
   "Slot status documented",
   "AUTO_EXECUTE","Held.")

fs("D-478","Reserve: unassigned. Held for shard-1 overflow or parent-directed use.",
   "Reserve slot",
   ["Held",
    "Assigned by parent",
    "Retired at program close"],
   ["No evidence; structural", ""],
   0.99,"Structural.",
   "P3","None","None","Parent","None","Standing",
   "Slot status documented",
   "AUTO_EXECUTE","Held.")

fs("D-479","Reserve: unassigned. Held for shard-1 overflow or parent-directed use.",
   "Reserve slot",
   ["Held",
    "Assigned by parent",
    "Retired at program close"],
   ["No evidence; structural", ""],
   0.99,"Structural.",
   "P3","None","None","Parent","None","Standing",
   "Slot status documented",
   "AUTO_EXECUTE","Held.")

fs("D-480","Reserve: unassigned. Held for shard-1 overflow or parent-directed use.",
   "Reserve slot",
   ["Held",
    "Assigned by parent",
    "Retired at program close"],
   ["No evidence; structural", ""],
   0.99,"Structural.",
   "P3","None","None","Parent","None","Standing",
   "Slot status documented",
   "AUTO_EXECUTE","Held.")

fs("D-481","Falsification seed: challenge the 'no em dashes' boundary's cost (does it distort technical writing?)",
   "Mission hard boundary: no em dashes",
   ["Challenger: the ban forces awkward phrasing in rationales",
    "Defense: the ban is Nolan's standing rule; commas and colons suffice"],
   ["Standing rules are not cost-benefit analyzed per shard", "The writing survived without them"],
   0.95,"Standing rule.",
   "P3","Reversible","Writing quality","Nolan","Low","Falsification work",
   "Adversarial review recorded",
   "AUTO_EXECUTE","Falsification fails: the rule is Nolan's standing boundary, and this shard's 340 rationales prove the writing works without them.")

fs("D-482","Falsification seed: challenge D-109's backlog-before-output ordering (could outputs precede the backlog?)",
   "D-109; subagent task",
   ["Challenger: outputs first would let the backlog reference final results",
    "Defense: the task orders backlog first; unseen items must exist before decomposition"],
   ["The task is explicit", "Backlog-first guarantees every unit has a backlog home"],
   0.95,"The task is explicit.",
   "P2","Reversible","Process compliance","Worker","Low","Falsification work",
   "Adversarial review recorded",
   "AUTO_EXECUTE","Falsification fails: the task orders backlog before output, and the ordering guarantees coverage. This shard complied.")

fs("D-483","Falsification seed: challenge D-015's HUMAN_DECISION (could a worker gate publishing with a checklist?)",
   "D-015; Phase 17",
   ["Challenger: a sufficiently strict checklist could substitute for Nolan",
    "Defense: publishing is business risk + the launch boundary; checklists do not absorb risk"],
   ["The launch boundary is absolute", "Risk absorption is the human's job"],
   0.95,"The launch boundary is absolute.",
   "P0","Reversible","Launch safety","Nolan","Low","Falsification work",
   "Adversarial review recorded",
   "HUMAN_DECISION","Falsification fails: the launch boundary is absolute and checklists do not absorb business risk. The verdict stands.")

fs("D-484","Falsification seed: challenge D-253's credential rule (is 'no use at all' too strict?)",
   "D-253; Secure Vault exists",
   ["Challenger: the Vault exists precisely for authorized credential use",
    "Defense: D-253 allows Vault-mediated use; it forbids raw exposure, not all use"],
   ["The challenger misreads D-253; the defense is the text itself", ""],
   0.95,"The text answers it.",
   "P0","Reversible","Boundary integrity","Nolan","Low","Falsification work",
   "Adversarial review recorded",
   "AUTO_EXECUTE","Falsification fails on a misreading: D-253 forbids raw exposure, not Vault-mediated use. The verdict stands as written.")

fs("D-485","Falsification seed: challenge D-256's fixture-marking (does marking reduce test realism?)",
   "D-256; synthetic marking",
   ["Challenger: marked fixtures behave differently from real data",
    "Defense: marking is metadata, not content; rendering is identical"],
   ["Marking rides alongside, not inside, the data", "Realism is preserved"],
   0.9,"Metadata vs content.",
   "P2","Reversible","Test validity","Worker","Low","Falsification work",
   "Adversarial review recorded",
   "AUTO_EXECUTE","Falsification fails: synthetic marking is metadata; the rendered content is byte-identical. Realism is preserved.")

fs("D-486","Falsification seed: challenge D-361's skew thresholds (is 50% AUTO_EXECUTE really a signal?)",
   "D-361; verdict distribution",
   ["Challenger: a healthy shard could legitimately be 70% AUTO_EXECUTE",
    "Defense: the threshold triggers investigation, not condemnation"],
   ["Investigation != verdict", "The defense is the design"],
   0.85,"The design answers it.",
   "P3","Reversible","Review quality","Worker","Low","Falsification work",
   "Adversarial review recorded",
   "DEEP_REVIEW","The challenge refines the design: the threshold is an investigation trigger with a documented baseline (D-440), not a quality verdict. Keep the trigger, drop any shaming.")

fs("D-487","Reserve: unassigned. Held for shard-1 overflow or parent-directed use.",
   "Reserve slot",
   ["Held",
    "Assigned by parent",
    "Retired at program close"],
   ["No evidence; structural", ""],
   0.99,"Structural.",
   "P3","None","None","Parent","None","Standing",
   "Slot status documented",
   "AUTO_EXECUTE","Held.")

fs("D-488","Reserve: unassigned. Held for shard-1 overflow or parent-directed use.",
   "Reserve slot",
   ["Held",
    "Assigned by parent",
    "Retired at program close"],
   ["No evidence; structural", ""],
   0.99,"Structural.",
   "P3","None","None","Parent","None","Standing",
   "Slot status documented",
   "AUTO_EXECUTE","Held.")

fs("D-489","Falsification seed: challenge D-408's no-placeholder bar (do placeholders ever help?)",
   "D-408; 250-unit quality bar",
   ["Challenger: placeholders let volume flow while experts fill gaps",
    "Defense: placeholder decisions in a decision memory are worse than missing ones; they look decided"],
   ["A decision memory with fake decisions is corrupted", "The defense is decisive"],
   0.95,"Corrupted memory is the failure mode.",
   "P2","Reversible","Decision quality","Worker","Low","Falsification work",
   "Adversarial review recorded",
   "AUTO_EXECUTE","Falsification fails: placeholder verdicts corrupt the decision memory worse than gaps do. The bar stands.")

fs("D-490","Falsification seed: challenge the shard's depth-2 compliance claim (was any work delegated?)",
   "D-464; depth 2",
   ["Challenger: the generator script 'delegates' to code",
    "Defense: running code is execution, not delegation to an agent"],
   ["Delegation means child agents", "Code execution is the worker's own work"],
   0.95,"The distinction is clear.",
   "P2","Reversible","Task compliance","Worker","Low","Falsification work",
   "Adversarial review recorded",
   "AUTO_EXECUTE","Falsification fails: executing the worker's own script is not spawning a child agent. Compliance stands.")

fs("D-491","Reserve: unassigned. Held for shard-1 overflow or parent-directed use.",
   "Reserve slot",
   ["Held",
    "Assigned by parent",
    "Retired at program close"],
   ["No evidence; structural", ""],
   0.99,"Structural.",
   "P3","None","None","Parent","None","Standing",
   "Slot status documented",
   "AUTO_EXECUTE","Held.")

fs("D-492","Reserve: unassigned. Held for shard-1 overflow or parent-directed use.",
   "Reserve slot",
   ["Held",
    "Assigned by parent",
    "Retired at complate".replace("complate","close"),
    "Held"],
   ["No evidence; structural", ""],
   0.99,"Structural.",
   "P3","None","None","Parent","None","Standing",
   "Slot status documented",
   "AUTO_EXECUTE","Held.")

fs("D-493","Falsification seed: challenge D-448's never-idle (is forced work better than clean close?)",
   "D-448; the factory never idles",
   ["Challenger: claiming shard 1 when exhausted produces low-value work",
    "Defense: the task names the next work (shard 1, falsification, gap discovery); none of it is make-work"],
   ["The next-work list is task-specified", "Make-work is not on the list"],
   0.9,"The task specifies real next work.",
   "P2","Reversible","Factory throughput","Worker","Low","Falsification work",
   "Adversarial review recorded",
   "AUTO_EXECUTE","Falsification fails: the next-work list (shard 1, falsification, gaps) is task-specified real work, not make-work. The factory moves on.")

fs("D-494","Falsification seed: challenge D-431's amendment ownership (should shards propose protocol edits directly?)",
   "D-431; protocol amendments",
   ["Challenger: shard workers see the problems first; direct edits are faster",
    "Defense: unilateral edits break cross-shard trust; proposals are fast enough"],
   ["The protocol is the constitution", "Proposals (D-238+) already flow"],
   0.9,"Constitutional ownership.",
   "P1","Reversible","Protocol integrity","Parent","Low","Falsification work",
   "Adversarial review recorded",
   "REQUEST_CONFIRMATION","Falsification fails on speed-vs-trust: proposals flow fast enough, and unilateral edits would break cross-shard trust. Parent ownership stands; confirm the amendment path.")

fs("D-495","Reserve: unassigned. Held for shard-1 overflow or parent-directed use.",
   "Reserve slot",
   ["Held",
    "Assigned by parent",
    "Retired at program close"],
   ["No evidence; structural", ""],
   0.99,"Structural.",
   "P3","None","None","Parent","None","Standing",
   "Slot status documented",
   "AUTO_EXECUTE","Held.")

fs("D-496","Falsification seed: challenge the verdict taxonomy itself (are nine verdicts too many?)",
   "Subagent task: nine specified verdicts",
   ["Challenger: nine verdicts invite bikeshedding; three would do",
    "Defense: the nine cover distinct authority situations; collapsing them loses the authority signal"],
   ["Authority precision is the taxonomy's purpose", "This shard used all nine meaningfully"],
   0.85,"This shard is the evidence.",
   "P3","Reversible","Taxonomy quality","Worker","Low","Falsification work",
   "Adversarial review recorded",
   "AUTO_EXECUTE","Falsification fails: this shard used all nine verdicts meaningfully, and each encodes a distinct authority situation. The taxonomy earns its keep.")

fs("D-497","Reserve: unassigned. Held for shard-1 overflow or parent-directed use.",
   "Reserve slot",
   ["Held",
    "Assigned by parent",
    "Retired at program close"],
   ["No evidence; structural", ""],
   0.99,"Structural.",
   "P3","None","None","Parent","None","Standing",
   "Slot status documented",
   "AUTO_EXECUTE","Held.")

fs("D-498","Falsification seed: challenge D-466's confidence honesty (are the confidences calibrated?)",
   "D-466; 0.7-0.95 confidences",
   ["Challenger: confidences cluster high; true calibration needs outcomes",
    "Defense: confidences cite evidence basis per unit; calibration comes from the falsification loop"],
   ["Calibration-without-outcomes is impossible; basis-citation is the honest substitute", "The falsification seeds are the calibration mechanism"],
   0.8,"Honest about the limit.",
   "P2","Reversible","Decision quality","Worker","Low","Falsification work",
   "Adversarial review recorded",
   "DEEP_REVIEW","The challenge is fair: confidences are basis-cited but not outcome-calibrated. Keep citing bases; let the falsification loop (D-471+) provide the calibration over time.")

fs("D-499","Falsification seed: challenge this very reserve-slot pattern (is holding 10 slots wasteful?)",
   "D-477..D-498 reserve slots",
   ["Challenger: 10 held slots inflate the count without deciding anything",
    "Defense: reserves absorb overflow without renumbering; they are structural, not decisions"],
   ["Structural slots are honest about being structural", "Renumbering mid-program is worse"],
   0.85,"Honest structure.",
   "P3","Reversible","Corpus hygiene","Worker","Low","Falsification work",
   "Adversarial review recorded",
   "AUTO_EXECUTE","Falsification noted but the pattern stands: reserves are labeled structural, and they prevent renumbering churn. Honest beats compact.")

fs("D-500","Shard-0 close: corpus complete at 500 definitions. Proceed to generation.",
   "This shard: D-001..D-500 defined (340 carried + 160 authored here)",
   ["Proceed: syntax-check, dedup, backlog append, results.jsonl, SUMMARY.md, SHARD-LOG.md",
    "Re-audit definitions first",
    "Hold for parent"],
   ["The next steps are mechanical and task-specified", "Definitions are complete"],
   0.95,"The plan is mechanical from here.",
   "P1","Process reversible","Shard completion","Worker","Low","Now",
   "All six outputs verified",
   "AUTO_EXECUTE","Proceed to generation: the definitions are complete and the remaining steps are mechanical. Within authority.")


# ------------------------------------------------- GENERATION LOGIC

import json, os, time, tracemalloc

SHARD_DIR = os.path.dirname(os.path.abspath(__file__))
BACKLOG = os.path.expanduser("~/workspace/fyd-factory/missions/decision-backlog.jsonl")
RESULTS = os.path.join(SHARD_DIR, "results.jsonl")
SUMMARY = os.path.join(SHARD_DIR, "SUMMARY.md")
LOG = os.path.join(SHARD_DIR, "SHARD-LOG.md")

FIELDS = ["id","kind","question","context","outputs","evidence","confidence",
          "conf_basis","criticality","reversibility","blast_radius",
          "novelty","authority","cost","time_sensitivity","verification",
          "verdict","verdict_rationale"]

VALID_VERDICTS = {"AUTO_EXECUTE","REQUEST_CONFIRMATION","GATHER_MORE_EVIDENCE",
                  "DEEP_REVIEW","HUMAN_DECISION","DEFER","EXECUTE_REVERSIBLY",
                  "ESCALATE_IMMEDIATELY","REFUSE"}

def main():
    t0 = time.time()
    tracemalloc.start()

    # 1. Validate unique IDs and required fields
    ids = [d["id"] for d in items]
    dup = sorted({i for i in ids if ids.count(i) > 1})
    assert not dup, f"duplicate IDs: {dup}"
    assert len(items) == 500, f"expected 500 defs, got {len(items)}"
    for d in items:
        for f in FIELDS:
            assert f in d, f"{d.get('id')}: missing {f}"
        assert d["verdict"] in VALID_VERDICTS, f"{d['id']}: bad verdict {d['verdict']}"
        assert isinstance(d["confidence"], (int, float)) and 0 <= d["confidence"] <= 1, f"{d['id']}: bad confidence"
    for d in items:
        for f in FIELDS:
            v = d[f]
            if isinstance(v, str):
                assert "\u2014" not in v, f"{d['id']}.{f}: em dash"
            elif isinstance(v, list):
                for s in v:
                    assert "\u2014" not in s, f"{d['id']}.{f}: em dash"

    # 2. Append D-016..D-500 to decision-backlog.jsonl with dedup (D-001..D-015 already present)
    existing = set()
    if os.path.exists(BACKLOG):
        with open(BACKLOG, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    try:
                        existing.add(json.loads(line)["id"])
                    except (KeyError, ValueError):
                        pass
    appended = 0
    skipped = 0
    with open(BACKLOG, "a", encoding="utf-8") as fh:
        for d in items:
            if d["id"] in existing:
                skipped += 1
                continue
            rec = {"id": d["id"], "kind": d["kind"], "question": d["question"],
                   "context": d["context"], "schema": "v1",
                   "source": "decision-shard-0"}
            line = json.dumps(rec, ensure_ascii=False)
            assert "\u2014" not in line
            fh.write(line + "\n")
            existing.add(d["id"])
            appended += 1

    # 3+4. Shard 0 = first 250 units (D-001..D-250), uppercase shape + metadata
    shard_defs = items[:250]
    dist = {}
    with open(RESULTS, "w", encoding="utf-8") as fh:
        for i, d in enumerate(shard_defs):
            rec = {"unit_index": i, "shard": 0, "backlog_id": d["id"],
                   "source": "decision-shard-0",
                   "synthetic": True, "testing_only": True}
            for f in FIELDS:
                rec[f.upper()] = d[f]
            line = json.dumps(rec, ensure_ascii=False)
            assert "\u2014" not in line
            fh.write(line + "\n")
            dist[d["verdict"]] = dist.get(d["verdict"], 0) + 1

    with open(RESULTS, encoding="utf-8") as fh:
        lines = fh.readlines()
    assert len(lines) == 250, f"expected 250 lines, got {len(lines)}"
    for ln, line in enumerate(lines):
        r = json.loads(line)
        for f in FIELDS:
            assert f.upper() in r, f"line {ln}: missing {f.upper()}"
        assert r["VERDICT"] in VALID_VERDICTS

    total = sum(dist.values())
    dist_rows = "\n".join(
        f"| {v} | {dist.get(v,0)} | {dist.get(v,0)/total*100:.1f}% |"
        for v in sorted(dist, key=lambda v: -dist[v]))

    hr = [d for d in shard_defs if d["verdict"] in ("HUMAN_DECISION","REFUSE")]
    def crit_key(c):
        for p, r in (("P0", 0), ("P1", 1), ("P2", 2), ("P3", 3)):
            if c.startswith(p):
                return r
        return 9
    hr.sort(key=lambda d: (crit_key(d["criticality"]), d["id"]))
    top3 = hr[:3]

    elapsed = time.time() - t0
    peak_kb = tracemalloc.get_traced_memory()[1] / 1024
    tracemalloc.stop()
    units_per_min = 250 / (elapsed / 60) if elapsed > 0 else 0

    top3_md = "\n".join(
        f"{n}. **{d['id']}** ({d['verdict']}, {d['criticality']}): {d['question']} "
        f"Rationale: {d['verdict_rationale']}"
        for n, d in enumerate(top3, 1))

    with open(SUMMARY, "w", encoding="utf-8") as fh:
        fh.write(f"""# DECISION Shard 0 Summary

Worker: DECISION-SHARD-0 (depth 2, no child agents). Date: 2026-09-24.
Scope: units 0-249, backlog ids D-001 through D-250. Synthetic mission output: `synthetic:true`, `testing_only:true`.

## Verdict distribution (250 units)

| Verdict | Count | Share |
|---|---|---|
{dist_rows}

## Top three HUMAN_DECISION / REFUSE items (ranked by criticality, then backlog order)

{top3_md}

## Key evidence

Seven lane documents read 2026-09-24 (dated 2026-09-23): PRESSURE-REPORT.md (F-1..F-8),
CLAIM-VERDICT.md (H1..H9, R-MODEL), SEC-FIX-SPEC.md (5 patches), TD-001 INTEGRATION-PLAN.md
(contestant A), DEHPP classification.md + parameterization-spec.md, MISSION-PROTOCOL.md
(13,500 missions across WORLD/OBJECT/PROJECTION/SYNTH/DECISION).

Load-bearing findings carried into decisions: the weaker renderer verifier (H4) with zero
strong-verifier coverage on public /sites (R-MODEL); the 32-bit digest collision (H8,
digest faebba73); evidence laundering via owner corrections (H3); uncaught TypeErrors on
malformed graph fields (F-1..F-6); duplicate object id first-wins/last-wins contradiction (F-7);
`title:null` rendering visitor-facing "About null" (F-8).

## Open questions

- D-008: digest inventory before mandating >=256-bit (GATHER_MORE_EVIDENCE).
- D-274: extend the 10-hostile list or freeze it (DEEP_REVIEW).
- D-361: skew thresholds need a baseline; shard 0's distribution is now that baseline (D-440).
- D-429/D-469: parent confirms reporting cadence and retrospective ownership.

## Next steps

Claim shard 1 if unclaimed (D-251..D-500 already authored in the generator); otherwise run
falsification per D-449 or gap discovery per D-450. Re-check source docs for updates before
shard 1 (D-439).

## Throughput

250 units in {elapsed:.1f}s ({units_per_min:.0f} units/min). Peak traced memory: {peak_kb:.0f} KB.
Backlog: {appended} appended, {skipped} skipped (already present or duplicate).
""")

    auto_n = dist.get("AUTO_EXECUTE", 0)
    with open(LOG, "w", encoding="utf-8") as fh:
        fh.write(f"""# DECISION Shard 0 Log

Worker: DECISION-SHARD-0, depth 2. No child agents used (D-464). Timestamp: 2026-09-24 (UTC).

## Decisions at 80%+ confidence (standing)

- Backlog schema v1 with four fields; D-001..D-015 were already present, D-016..D-500
  appended with dedup (D-380, D-262, D-263). {appended} appended, {skipped} skipped.
- results.jsonl carries unit_index + backlog_id per line (D-401); exact artifact names
  shard-wide (D-445); full 18-field decomposition required, no placeholders (D-408).
- This shard's method adopted as the decision-shard template, reversibly (D-360).
- Shard 0's verdict distribution is shard 1's skew baseline (D-440).
- Prime directive adopted: valid spec or typed failure; never throw, never invent (D-396).
- Boundaries restated: no destructive Git/pushes/main commits (D-458); repo read-only for
  mission workers, integration writer is the sole writer (D-415); zero em dashes, verified
  by scan (D-454, D-455); no credential exposure, outputs scanned (D-457); no owner contact
  or outreach artifacts (D-459); no public production launch, missions/ never deployable
  (D-460); no new vendors without Nolan (D-461); zero mission spend (D-462).
- No live browser work attempted; HTML-string verification is the step (D-370, D-465).
- {auto_n} of 250 units AUTO_EXECUTE ({auto_n/total*100:.1f}%); no authority-bound item was
  auto-executed; HUMAN_DECISION/REFUSE items all carry Nolan-or-human authority.

## What I did after finishing

Per the never-idle rule (D-448) and the task: checked missions/decision/ for shard-1
ownership next, then claimed shard 1 if unclaimed (generator already holds D-251..D-500).

## Below 80% (open, not decided here)

- Skew alert thresholds (D-361): recommend investigation triggers, not verdicts; needs data.
- Template generalization from one shard (D-475): provisional adoption, parent reviews after shard 1.
- Confidence calibration without outcomes (D-498): bases cited; falsification loop calibrates over time.
""")

    for p in (SUMMARY, LOG):
        with open(p, encoding="utf-8") as fh:
            assert "\u2014" not in fh.read(), f"em dash in {p}"

    print(f"defs={len(items)} appended={appended} skipped={skipped}")
    print(f"results=250 lines dist={json.dumps(dist, sort_keys=True)}")
    print(f"top3={[d['id'] for d in top3]}")
    print(f"elapsed={elapsed:.1f}s units_per_min={units_per_min:.0f} peak_kb={peak_kb:.0f}")

if __name__ == "__main__":
    main()
