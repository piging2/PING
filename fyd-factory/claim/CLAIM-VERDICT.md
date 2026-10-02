# LANE-CLAIM VERDICT: FAIL

Claim-integrity attacks against the FYD render path (not markup injection:
LANE-SEC covered XSS/projection-seam at 20/20 PASS). The lane attacks the
BindingVerifier / render-path seam with hostile or malformed claim content to
find where a claim can render as supported when it is not (overclaim, evidence
laundering, unbound claims rendering as facts).

Target: /home/nolan/projects/ping, branch fyd-factory. Repo was GIT READ-ONLY
for this lane: no commits, no fixes, no pushes. A real hole is a valid result
and is reported, not fixed.

Date of verdict: 2026-09-23 (MDT). Lane was re-dispatched after a daemon
restart killed the prior agent mid-campaign with no checkpoint. All attack
categories were re-run from the surviving artifacts; nothing was skipped.

## Verdict: FAIL

11 of 11 verifier-hole attack tests confirmed genuine holes. 3 of 3
render-path attack tests confirmed genuine holes. The baseline holds on the
two fixture sites (see "What held"), but the claim-integrity machinery has
multiple real, reproducible holes, including two that let unverified or
misattributed claims render as facts through the production path.

## Categories tested

Suite A: src/fyd/claim/__tests__/attack-verifier-holes.test.ts (11 attack tests)
Suite B: src/fyd/claim/__tests__/attack-render-path.test.ts (8 tests: 5 baseline + 3 attacks)
Recon probes: scratch tsx probes run on the Pig (then deleted) for serving-path
and visibility behavior.

Reproduction (Pig, /home/nolan/projects/ping, fyd-factory branch):
  npx jest --transform '{"^.+\\.tsx?$":["ts-jest",{"isolatedModules":true,"tsconfig":{"jsx":"react-jsx","target":"es2020","module":"commonjs","esModuleInterop":true,"allowSyntheticDefaultImports":true,"skipLibCheck":true}}]}' --moduleNameMapper '{"^@/(.*)$":"<rootDir>/src/$1","\\.css$":"<rootDir>/src/fyd/claim/__tests__/css-stub.js"}' src/fyd/claim/__tests__/attack-verifier-holes.test.ts
  npx jest (same flags) src/fyd/claim/__tests__/attack-render-path.test.ts

Note: the CSS stub (src/fyd/claim/__tests__/css-stub.js) is required because
the renderer chain imports a CSS module; the repo tsconfig sets jsx:preserve
so the jsx:react-jsx transform override is required.

## What held

5 baseline tests PASS on the two fixture sites (coppersmith-plumbing,
happy-place):
- Both sites render substantial factual content through the real path
  (generateSiteSpec + SitePageView + renderToStaticMarkup; text > 1000 chars).
- Every rendered factual value in the fixtures binds as direct evidence: the
  full-text audit (all rendered titles, descriptions, fields checked against
  verifyBinding with owner assertions) found zero misses.
- Curated claims render and bind: phone 970-245-3869, locality Grand Junction,
  tenure "over 25 years" all present and BOUND as direct evidence.

So on clean, evidenced fixtures the baseline is honest. The holes are all in
the machinery's behavior at its seams, not in the fixture data.

## Holes found (exact evidence)

H1 (attack): derived claims require INPUT EVIDENCE. CONFIRMED HOLE.
  A derived claim whose object has an EMPTY provenance ref grades BOUND
  (expected UNBOUND), and its DETERMINISTIC_DERIVATION atom carries an empty
  evidenceRef. Any label can smuggle an unevidenced fact through as BOUND.
  Evidence: verifyBinding({objectId:"ghost-biz", field:"yearsInBusiness",
  classification:"derived"}, graph, []) -> status "BOUND" (expected "UNBOUND");
  atom.evidenceRef == "" (expected non-empty).

H2 (attack): generated factual atoms must bind to evidence, in BOTH emission
gates. CONFIRMED HOLE.
  The two exported emission gates disagree on the same binding. For a generated
  atom with no evidence ref: assertSpecBindingsVerified PASSES (did not throw
  BindingVerificationError as documented), while buildVerifiedRenderModel
  THROWS. The documented "emission gate that throws before any spec is
  produced" does not throw; the guarantee depends on which gate the caller
  happened to pick.

H3 (attack): owner-corrected values must not grade as direct evidence.
CONFIRMED HOLE (evidence laundering).
  Owner correction (source value 555-0100, owner value 555-0199, fields[] carry
  the owner-winning value): verifyBinding direct grades the OWNER's value
  "555-0199" as BOUND with source "evidence-ref" (expected: not
  "evidence-ref"). The provenance ref covers the SOURCE value; grading the
  owner value as evidence-ref launders owner authorship as direct evidence.

H4 (attack): the render-path gate must enforce the owner-assertion rule.
CONFIRMED HOLE (the central seam).
  verifyBinding says UNBOUND for owner_authored with NO recorded assertion,
  but resolveBoundField (what the renderer actually calls) returns the value
  ("555-0100" in fixture; "970-245-3869" on the coppersmith render). Root
  cause: verifyPresentationBinding in src/fyd/sitespec/graph.ts (the verifier
  the renderer calls through resolveBoundField) accepts "derived" and
  "owner_authored" UNCONDITIONALLY:
    case "derived":
    case "owner_authored":
      return { ok: true, value };
  This is a DIFFERENT, weaker verifier than BindingVerifier, and the renderer's
  comment block (renderer.tsx ~685-710) claims resolveBoundField is "the
  presentation-binding verifier" with the invariant "no binding, no factual
  output." The invariant holds only relative to the weaker verifier. Any
  content labeled derived or owner_authored passes with no evidence or
  assertion check at all.

H5 (attack): per-field evidence must be honored. CONFIRMED HOLE (misattribution).
  A binding carrying its own evidenceRef "google-business-profile:acme-123"
  has it silently replaced with the object-level ref
  "website-ingestion:https://example.com/". Source B's claim is misattributed
  to source A.

H6 (attack): withdrawn evidence has no binding path. CONFIRMED HOLE (verifier
level; render-time impact limited).
  A direct binding on a visibility=private object grades BOUND (expected
  UNBOUND): the verifier takes no visibility/withdrawal input. HOWEVER, a
  render-time probe (coppersmith fixture, biz object set private, real
  generateSiteSpec + SitePageView + renderToStaticMarkup) shows the renderer
  omits the private object's factual fields: the phone 970-245-3869 did NOT
  render (text length 4294, no phone), though "Coppersmith" still appeared
  (from other objects' text). So this is a genuine verifier-correctness hole
  with a renderer-side visibility filter as partial defense in depth. Any
  caller that relies on verifyBinding alone (the planner path) would leak.

H7 (attack): owner-assertion matching must survive trivial normalization.
CONFIRMED DEFECT (false negative, not an overclaim vector).
  A trailing space on the effective value voids a real owner assertion:
  verifyBinding owner_authored on a corrected graph with value "555-0199 "
  returns UNBOUND though the owner assertion attests "555-0199". Byte-exact
  matching voids real evidence. This is over-strictness, not an integrity
  hole, but it is a correctness defect in the same matching machinery.

H8 (attack): the 32-bit digest is not a semantic identity. CONFIRMED HOLE
(empirically).
  A real collision was found in ~4.3 seconds of searching: digest "faebba73"
  maps to both "555-61245" and "555-83635". The digest cannot back change
  detection or dedup; distinct fact sets map to one digest.

H9 (attack): the verifier grades the field value, not the presented claim.
CONFIRMED HOLE (semantic gap).
  For a derived presentation ("Serving the valley since 2009" composed from
  foundingDate "2009"), the binding carries no transform and no presented
  text; verifyBinding returns the RAW value "2009" (expected: the composed
  claim). The verifier never sees the composed claim, so the digest and the
  atoms describe inputs, never rendered outputs. Any transform between field
  value and rendered text is invisible to verification.

R-H4 (render path): the render path resolves owner_authored claims the
BindingVerifier refuses. CONFIRMED HOLE.
  Through the real render path on the coppersmith fixture, resolveBoundField
  returned "970-245-3869" for owner_authored with no recorded assertion while
  verifyBinding grades it UNBOUND. Same seam as H4, confirmed end to end.

R-MODEL (render path): rendering is not gated by the verified render model.
CONFIRMED HOLE.
  buildVerifiedRenderModel was built for phone=970-245-3869; the graph was
  then tampered (phone=970-000-0000) and re-rendered: the renderer published
  "970-000-0000", a value the verified model never saw. Serving-path fact:
  src/app/sites/happy-place/page.tsx and coppersmith-plumbing/page.tsx call
  generateSiteSpec DIRECTLY and never call buildVerifiedRenderModel. The only
  non-test caller of buildVerifiedRenderModel is planner.ts (used by
  /build/[siteId]). The strong verifier covers 0% of claims on the public
  /sites pages by construction; nothing re-verifies at render time.

R-CORRECTED (render path): an owner-corrected number renders, then grades as
direct evidence. CONFIRMED HOLE.
  Owner-corrected phone 970-000-0001 renders through the render path (through
  the owner_authored path, no assertion check at render time), and a direct
  binding grades the OWNER's value as BOUND with source "evidence-ref" whose
  ref covers the SOURCE value 970-245-3869. Same laundering as H3, confirmed
  end to end.

## Residual risks (not turned into attack tests this campaign)

- applyPresentationIntent seam: happy-place/page.tsx applies owner directives
  OVER the compiled spec (copy/headings) AFTER generateSiteSpec. Mutated copy
  is never re-verified. Untested; same class as R-MODEL.
- H2 gate disagreement means the planner path's guarantee depends on which
  gate the caller picked; only /build/[siteId] uses planner at all.
- H7 over-strictness could push integrators to bypass the verifier rather than
  fix matching (normalization incentive risk).
- Visibility at the planner level: H6's verifier hole is only papered over by
  the renderer's visibility filter; any new consumer of verifyBinding inherits
  the leak.
- The H8 digest should not be used for change detection, dedup, or as an
  integrity identity anywhere in the pipeline.

## Patch / fix notes

No fixes were made (repo git read-only for this lane; a real hole is reported,
not fixed). All hole tests are written as failing assertions that name the
invariant; each becomes green when the corresponding verifier seam is closed.
Patch proposals, if any, belong under ~/workspace/fyd-factory/patches/.

## Bottom line

FAIL. The claim-integrity story is honest on clean fixtures, but the machinery
has 14 confirmed holes/defects across the verifier and the render path. The
two load-bearing findings: (1) the renderer uses a weaker verifier
(verifyPresentationBinding in graph.ts) that passes derived/owner_authored
unconditionally, while the strong BindingVerifier is never consulted at render
time; (2) the public /sites pages never build a VerifiedRenderModel at all, so
render-time integrity on the production path rests entirely on the weaker
verifier. Until the seams are closed, an unevidenced or misattributed claim
can render as a supported fact by choosing the right classification label.
