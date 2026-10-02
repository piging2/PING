#!/usr/bin/env python3
"""Build ~/workspace/jev-eval/backlog-dataset/items.jsonl.

53 labeled backlog-disposition items for Jev backlog-classification calibration.
Every label traces to a verified coordinator/falsifier disposition. No invented labels.
Run: python3 build_dataset.py
"""
import json, pathlib

OUT = pathlib.Path.home() / "workspace" / "jev-eval" / "backlog-dataset" / "items.jsonl"

FALS = "~/workspace/sprint-2026-09-24/convergence/BACKLOG_FALSIFICATION.md"
FALS_BY = "Lane 9 falsifier (2026-09-25 ~20:30 MDT read-only falsification against actual code, no builds/tests run; verdicts acknowledged by coordinator in convergence/CONVERGENCE_MATRIX.md)"
FALS_AT = "2026-09-25"
FALS_LATER = ("2026-09-25 coordinator record (CONVERGENCE_MATRIX.md): verdicts acknowledged; "
              "the 12 promoted candidates were NOT added to the canonical backlog (promotion awaits "
              "product/constitutional call); the 15 plan-owned items are tasked by the approved compiler plan "
              "(Phases 0/2/4/9), no new backlog item needed.")

PP = "~/workspace/BACKLOG_PING.md (NOW frontier falsification records; probes in goals/ping-agent-execution-stack/hidden_files/perfecting-pass-2026-09-26/)"

items = [
 # item_id, evidence_summary, disposition, verified_by, verified_at, later_outcome, source_ref
 ("gap-01",
  "Family.css @imports resolve to src/builder/tokens/out/ which is absent from the tree (real artifacts live at builder/tokens/out/). This exact defect produced the unstyled Coppersmith V2 screenshot. No build-time resolution assertion exists anywhere.",
  "PROVEN_DEFECT", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-02",
  "No element-overlap/collision mechanism anywhere in src/ (grep for overlap|collis returns zero hits). Compiler plan Phase 9 lists it as to-add.",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-03",
  "No general duplicate-visible-fact detector exists. Only point checks: exactly-one-H1 and no-repeated-Why-this tests. The broken screenshot rendered the identity block twice. Compiler plan Phase 2 owns this.",
  "PROVEN_DEFECT", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-04",
  "No duplicate-media detector: ingest dedupes exact bytes by digest, but each makeSection builds its own mediaBindings array with no plan-global used-asset registry, so one assetId can bind to multiple roles/sections (the 'one condenser image across every card' failure documented in score.test.ts:195). Lane commit ceb3248 claims a fix but is unpushed and unverified.",
  "PROVEN_DEFECT", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-05",
  "No horizontal-overflow assertion on generated pages. Only 'overflow' hits are CSS classes, never an assertion. An older template commit fixed one 375px overflow as a point fix, not a gate. Plan Phase 9 lists it as to-add.",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-06",
  "Touch-target minimum assertion exists: family-page.test.tsx:130-168 requires 44px targets for every a/button/input/select/summary (exempt prose links allowed), and shared.tsx:27-28 defines the TARGET_44 contract.",
  "ALREADY_IMPLEMENTED", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-07",
  "Heading-hierarchy assertion exists: family-page.test.tsx:80-101 enforces exactly one H1, never the legal name, for both HPP-like and Coppersmith-like fixtures. Residual (unasserted): h2/h3 ordering.",
  "ALREADY_IMPLEMENTED", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-08",
  "No render-pipeline gate asserting img src is never empty/missing, and no onError fallback. Components null-guard and planner tests assert no media binding references a failed asset, but no render-time gate exists. Plan Phase 9 lists it as to-add.",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-09",
  "No console-error/hydration-error gate on the generated-page path. family-generation.test.tsx asserts SSR byte-identity, not console cleanliness. Plan Phase 9 lists both as to-add.",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-10",
  "Token pipeline validates dangling aliases and the theme-seam test asserts no inlined values, but NOTHING cross-checks family utilities (text-h2, bg-cta-primary-background, rounded-pill) against compiled token definitions. A utility with no token behind it fails exactly like the theme outage: silently. Falsifier promoted it as a new backlog candidate.",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-11",
  "Planner rationale cites the rule per placement: planner.ts:454-455 rationale: string[], EligibilityRecord {component, variant, eligible, ruleId, reason} with a full eligibility ledger and pushEligibility NAV-ELIG records.",
  "ALREADY_IMPLEMENTED", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-12",
  "No fact-consumption map exists: rationale mentions 'signal consumption' only as prose; the CtaHierarchy placementMap covers CTA tiers per placement, not fact-to-primary-owner-to-secondary-allowlist. Repetitions have no attributable cause and no deny-by-default rule. Compiler plan Phase 2 core owns this.",
  "PROVEN_DEFECT", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-13",
  "Cross-entity compiler test cannot exist until gap-12's mechanism exists: rendering is tested on two fixture entities, but the consumption-map generalization test (feed two different entity graphs, assert no fact renders in two unlisted placements) is blocked on the missing map. Plan Phase 2.",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-14",
  "The proposed 'consumption ledger machine-readable artifact' is the same missing map as gap-12: HomePagePlan is machine-readable, but the fact-to-placements ledger is resolved by the same Phase 2 work. Not a separate item.",
  "DUPLICATE", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-15",
  "Planner eligibility omits ineligible sections and variants fail closed, but no render test feeds empty-services / no-phone / no-address fixtures and asserts no ghost sections in the output HTML. Falsifier promoted it as a new backlog candidate.",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-16",
  "Navigation.tsx:50 uses hidden md:flex (breakpoint collapse exists as markup); planner responsiveIntent is prose. No test asserts collapse-before-collision. Plan Phase 4 tasks the automated collision check.",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-17",
  "Navigation.tsx:22 and Hero.tsx:132 both bind logo-mark; the broken screenshot rendered the identity block twice. No test counts identity renders. Plan Phase 4 tasks the one-identity assertion.",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-18",
  "Navigation.tsx:33 is sticky top-0 z-40; no overlap assertion against hero content exists. Plan Phase 4.",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-19",
  "flex-wrap classes exist in Hero/ContactCTA/FeaturedService; no test pins intentional CTA wrapping. Family tests assert 375/390 contracts through class contracts, not behavior. Plan Phase 4.",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-20",
  "Cta maps tier to style (BTN_PRIMARY/BTN_SECONDARY/tertiary underline/HOOK_LINK, shared.tsx:30-56, 96-138): the mechanism exists, but no test pins the tier-to-style contract, so a future flatten (the exact broken-screenshot failure) has no alarm. Falsifier promoted it.",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-21",
  "ctaHref default returns '#': a silent dead CTA for any unexpected kind. Planner kind vocabulary is closed and intent-guards validates kinds, but no rendered-output test asserts zero href='#' / dead CTAs, and 'unsupported capability yields no CTA' is unenforced at render. Falsifier promoted it.",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-22",
  "URL allowlisting at the projection/render boundary exists: safe-link.test.ts 16 tests including mixed-case javascript:, whitespace-prefixed, control-character smuggling, percent-encoded tricks; projection-boundary.test.ts 5/5 hostile-URL tests; re-proven PASS 2026-09-22. Builder-branch renderer is allowlist-by-construction. Residual noted: builder branch should inherit safe-link at merge.",
  "ALREADY_IMPLEMENTED", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-23",
  "Phone CTA tel: link format validation exists: family-generation.test.tsx asserts a tel: href above the fold and visible text never raw E.164 (test fixture number only); PhoneLink/ctaHref normalize the tel: prefix; formatPhoneDisplay tested.",
  "ALREADY_IMPLEMENTED", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-24",
  "Media ingest rights/source-policy field exists: rightsSource 3-value vocabulary plus rightsBasis on FydMediaObject and MediaProvenanceRecord; RIGHTS GATE classifies before any bytes move (media/ingest.ts:112-121); R5 tests.",
  "ALREADY_IMPLEMENTED", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-25",
  "Derived-asset relationship exists: ProvenanceDerivedAsset {derivedFrom, servedFrom, digest} in media/provenance.ts:23-36; planDerivatives in media/derivatives.ts:67.",
  "ALREADY_IMPLEMENTED", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-26",
  "Designed fallback for zero usable media exists: HERO-V5 'fallback is identity-led with typographic treatment, never a fake photo' (planner.test.ts:463); media bar rejects failed assets rather than degrading.",
  "ALREADY_IMPLEMENTED", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-27",
  "Ingest downloads bytes and serves derivatives and render consumes MediaManifest with FYD-controlled URLs, but NO test enforces the invariant 'no rendered img src is an original hotlink'. The policy is architecture, not an enforced gate. Falsifier promoted it.",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-28",
  "Media relevance scoring exists in code: media/score.ts R1-R6 (relevance, documentary, resolution, aspect, rights, near-duplicate uniqueness) plus score.test.ts 20+ tests including the documented Coppersmith condenser rejection (:195).",
  "ALREADY_IMPLEMENTED", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-29",
  "Suggested-question chips from graph schema roles do not exist (suggestedActions are capability actions, not question chips). 30-questions Q11 ('chips in this sprint, or after the core proof lands?') is undecided by the owner, so the item cannot be promoted until decided.",
  "FUTURE", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-30",
  "No INSUFFICIENT_EVIDENCE owner-escalation path exists in ask code (grep escalat|lead returns zero). The refusal itself is honest (ok:true, refusal:true); 30-questions Q9 ('route to owner, or just stop?') is undecided, so routing is a product decision for later.",
  "FUTURE", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-31",
  "Claim-level taxonomy exists (AskClaimClassification: DIRECT_FACT/DERIVED_FACT/INFERENCE/GENERATED_COPY/USER_OVERRIDE) and honest-refusal is tested. A question-level taxonomy (competitor intel vs unknowable pricing) is refinement; the fail-closed behavior it would guard already exists. Genuine product nice-to-have, not sprint-blocking.",
  "FUTURE", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-32",
  "POST /api/fyd/ask/[siteId] is anonymous by design ('mode visitor (default): anonymous, public objects only'); grep rate|throttle returns zero in the route, ask-pipeline.ts, and src/middleware.ts. Open endpoint with no abuse guard (LLM-backed endpoint = cost plus prompt-injection surface). Falsifier promoted it.",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-33",
  "Public citation rendering exists: AskFydCitation {source, basis, last-checked, claimClass}; the widget renders a 'Why this?' disclosure per citation; the privacy P0 lane hardened it so citations drop internal ids.",
  "ALREADY_IMPLEMENTED", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-34",
  "Before/after proposal review card exists: customize-panel.tsx reviewCard {title, before, after, operationCount} rendered as Before/After in the demo owner panel; approve journals the overlay event.",
  "ALREADY_IMPLEMENTED", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-35",
  "No undo/revert/supersede for applied owner changes in owner-mode/ or POST /api/fyd/customize (grep returns zero). Journal shows appliedIntentIds; nothing reverses one. Mitigated but not replaced by preview-to-approve. Falsifier promoted it.",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-36",
  "refresh/conflict.ts detectConflicts and diff.ts diffSnapshots/ChangeRecord exist (temporal-refresh lane): the detector is real. But no notification path to the owner exists, so silent drift under customizations can still occur. Promoted but deferred: no real owner in sprint.",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-37",
  "The demo panel's inspect view lists journaled directives, but that is a dev view, not an owner-facing changelog. Genuine product need, but no real owner exists in this sprint; not sprint-blocking.",
  "FUTURE", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-38",
  "Owner changes have journal provenance (intentId, proposalDigest, approvedBy, approvedAt, eventId) and refresh/ records what changed (ChangeRecord), but per-value regeneration cause (source re-observation vs owner override vs conflict resolution) is recorded nowhere; src/fyd/regen/ is empty at HEAD and on the branch. Promoted but deferred: regen lane not yet running.",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-39",
  "No pixel-diff visual regression harness exists in source (no pixelmatch/screenshot-diff; only transitive axe-core in package-lock.json). Plan Phase 0 keeps before/ screenshots as evidence; Phase 9 tasks the harness.",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-40",
  "Partial accessibility coverage exists: alt-text tests, 44px targets, focus rings, reduced-motion. Missing: contrast assertions, focus-order assertions, no axe/pa11y/lighthouse gate in source. Falsifier promoted it.",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-41",
  "The v2 demo page happens to set generateMetadata title+description ad hoc, but nothing in the compiler enforces title/meta per generated site. No assertion. Falsifier promoted it.",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-42",
  "No not-found.tsx under src/app (Next default 404 serves). Single-page demo; branded 404 is polish, not proof-blocking.",
  "FUTURE", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-43",
  "The gap asserted 'renderer javascript: URL sink still open (FL-20260921-032)' but the failure ledger shows it closed DONE_VERIFIED 2026-09-23 (commit 56f164e6: 16/16 safe-link tests plus static href-sink audit; hostile probe re-proven PASS 2026-09-22). The gap text was stale. Residual: ensure the builder branch inherits safe-link at merge.",
  "SUPERSEDED", FALS_BY, FALS_AT, "Ledger contradiction resolved at evidence level; no later outcome changes the SUPERSEDED verdict.", FALS),
 ("gap-44",
  "No favicon/icon anywhere under src/app. Cosmetic: browsers show a default icon, not 'nothing'.",
  "FUTURE", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-45",
  "Port :3105 serve provenance unrecorded: no artifact identifies which process/worktree/build serves the demo port. MEMORY's note (copper-v2 worktree @ 541a419, 500 during rebuild) is a lead, not a recorded artifact. Compiler plan Phase 0.3 owns this.",
  "PROVEN_DEFECT", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-46",
  "The charter requires authorized deployment/restart coordination for :3105, but no checklist exists for demo updates; TOOLS.md documents the :3100 restart protocol as the template. Manual coordination with missed-step risk. Falsifier promoted it (ops item).",
  "MISSING_TEST", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-47",
  "Sprint wake-lock reliability over 24h is unproven, but the mechanism exists (scoped wake inhibition pig-fb/wake-wrap.ps1, sprint holder PIG-SPRINT-WAKELOCK-20260925, battery guard below 20%). 'Unproven over 24h' can only be resolved by the sprint elapsing: validation accrues, not a defect to fix.",
  "FUTURE", FALS_BY, FALS_AT, FALS_LATER, FALS),
 ("gap-48",
  "Battery drain rate under sprint load is unknown, but measuring it now would violate the owner's Q4 power policy FINAL (2026-09-25 ~19:56 MDT): keep the Pig plugged in, no deliberate battery-discharge policy in the sprint; drain measurement deferred to a separate measured experiment.",
  "SUPERSEDED", FALS_BY, FALS_AT, "Superseded by owner policy decision (MEMORY.md 2026-09-25 ~19:56 MDT); no later outcome reverses this.", FALS),
 ("gap-49",
  "Sprint run record exists and is being written: FYD-COORDINATOR-LOG-2026-09-25.md (live), critical-path-log.md (327 lines), SCOREBOARD.md (490 lines).",
  "ALREADY_IMPLEMENTED", FALS_BY, FALS_AT, FALS_LATER, FALS),
]

NOW_BY = "ping-perfecting-pass falsifier (read-only falsification probes, local plane; results recorded in BACKLOG_PING.md NOW frontier)"
now_items = [
 ("FYD-009",
  "Cited evidence_refs existence check: baseline untampered graph answers with 6 citations and zero unknowns; CASE A (evidence_ref tampered to a ref with no observation record) fails closed at the composer gate; CASE B (ref resolves but the citing object's source_digest no longer matches the record's snapshot pointer) fails closed at the post-answer FYD-009 validator, dropping the citation and recomposing from the remaining 5 citations with the gap named as an unknown. Probe: fyd009-dangling-ref.probe.test.ts, jest 3/3 PASS 2026-09-26 ~01:55 MDT. Scope note: covers the fyd-build lane copy carrying the ask/evidence machinery; older directory copies are earlier generations without this validator.",
  "ALREADY_IMPLEMENTED", NOW_BY, "2026-09-26",
  "NOW-3 marked DONE_VERIFIED 2026-09-26 on this probe; no later outcome recorded for older directory copies.", PP),
 ("FYD-010",
  "Field-level privacy gate for Ask FYD: buildAskFydContext with viewer.mode='visitor' over a PUBLIC business object carrying phone and home address returns the context with BOTH fields intact (received phone value where undefined was required). The FYD-010 visibility policy (src/fyd/visibility/policy.ts) is OBJECT-level only; filterGraphForViewer explicitly leaves 'fields untouched; field visibility is a separate concern' by its own comment; context-builder.ts filters whole objects only; answer.ts reads ctx objects verbatim. No field-level gate exists on the ask path. Probe: fyd010-askfield.probe.test.ts. Owning lane (fyd-build) to implement.",
  "PROVEN_DEFECT", NOW_BY, "2026-09-26",
  "NOW-5 stays OPEN; gap reproduced mechanically; no fix recorded yet.", PP),
 ("FYD-012",
  "Binding verifier coverage audit: the live fyd-build renderer (src/fyd/components/renderer.tsx, inside the lane's tsconfig) has ZERO verifyPresentationBinding/resolveBoundField call sites; the lane's graph.ts exports only resolveWebsiteUrl (the verifier was never absorbed). Unbound factual reads in the live path: Hero renders o.title/o.description directly; LinksSection reads o.fields['socials'] gated only by URL safety; SocialProofSection renders o.fields['reviews'] with no binding gate; site-client.tsx:274 renders {o.title}. Object-level visibility and safe-links ARE wired. The 3 disciplined copies (fyd-lane/repo, fyd-grill-contact/src, fyd-grill-compose/work) are CLEAN: 14/14 direct reads justified. Delivered mechanism: fyd012-binding-coverage.py plus allowlist; verified PASS on the 3 disciplined copies and FAIL on the live renderer and on an injected-bypass scratch. Owning lane (fyd-build) to absorb the verifier.",
  "PROVEN_DEFECT", NOW_BY, "2026-09-26",
  "NOW-7 stays OPEN; audit delivered to the owning lane; no fix recorded yet.", PP),
 ("FYD-037",
  "Wrong-journal fail-closed guard: falsification 2026-09-23 reproduced on the inspectable emit path (fyd-lane/lane-e/emit-overlay.py, mirror of the Pig-side script): with FYD_GATEWAY_URL pointed at a bogus journal and the bridge POST stubbed, emit() returned 0 and attempted the POST to the wrong journal; exactly 1 subprocess call (the POST itself), zero verification calls; zero marker/guard terms in the source. A misconfigured FYD_GATEWAY_URL would silently write an FYD overlay into the wrong journal. Dump path has no local copy; Pig-side unverifiable from this plane. Minimal guard shape recorded (journal-identity marker pre-flight, fail closed with typed WRONG_JOURNAL failure); implementation belongs to an authorized lane.",
  "PROVEN_DEFECT", NOW_BY, "2026-09-23",
  "NOW-9 stays OPEN; guard design recorded, implementation pending in an authorized lane.", PP),
]

def obj(item_id, evidence_summary, disposition, verified_by, verified_at, later_outcome, source_ref):
    return {"item_id": item_id, "evidence_summary": evidence_summary,
            "verified_disposition": disposition, "verified_by": verified_by,
            "verified_at": verified_at, "later_outcome": later_outcome,
            "source_ref": source_ref}

rows = [obj(*r) for r in items + now_items]
assert len(rows) == 53, len(rows)
allowed = {"PROVEN_DEFECT","MISSING_TEST","ALREADY_IMPLEMENTED","DUPLICATE",
           "SUPERSEDED","FUTURE","UNKNOWN"}
for r in rows:
    assert r["verified_disposition"] in allowed, r
    assert r["item_id"] and r["evidence_summary"] and r["verified_by"] and r["source_ref"]

OUT.parent.mkdir(parents=True, exist_ok=True)
with OUT.open("w", encoding="utf-8") as f:
    for r in rows:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")
print(f"wrote {len(rows)} items to {OUT}")
from collections import Counter
print(Counter(r["verified_disposition"] for r in rows))
