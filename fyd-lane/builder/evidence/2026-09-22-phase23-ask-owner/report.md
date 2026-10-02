# FYD Phase 2+3 report: Ask FYD classes + owner patch loop (2026-09-22)

## Status: SUCCEEDED

All Phase 2+3 objectives are implemented, tested, and proven with live
server evidence. Two commits on branch fyd/builder-composition. No push.

## Branch / commits

- Branch: fyd/builder-composition (unchanged throughout; no push, no reset,
  no history rewrite)
- 43c34341 fyd: Ask FYD 3-class answers and digest-bound owner patch loop
- 4c45780d fyd: owner patch panel on the /build surface
- The other lane's 60b77425 (Phase-4 semantic diff) was already on the
  branch; it does not touch this worker's paths.

## What was built

### Ask FYD: SUPPORTED / DERIVED / UNKNOWN

- Every citation carries claimClass ("supported" | "derived"). Answer-level
  class: refusal or no citations -> "unknown"; any derived citation ->
  "derived"; otherwise "supported".
- Derived classifications: DERIVED_FACT, derived, INFERENCE, GENERATED_COPY.
- New trusted route /api/fyd/ask/[siteId] derives the tenant from route
  params; body tenant claims that disagree are refused (400 tenant_mismatch);
  matching claims are ignored. mode:"owner" grants no additional access.
- Shared pipeline (ask-pipeline.ts) serves the flat and trusted routes.

### Owner patch loop

- propose (interpret only, never writes): before/after, evidence impact,
  capability impact, actor disclosure, three digests.
- approve: echoes baseStateDigest + baseViewDigest + patchDigest. Missing or
  malformed digests -> 400 approval_not_bound. Tampered command ->
  400 patch_mismatch, nothing written. Either base moved -> 409
  stale_proposal, nothing written, naming what moved.
- baseViewDigest is the canonical hash of the composed ObjectView: the
  current build-state equivalent of the requested base SiteSpec/state digest.
  A source refresh under an unchanged owner journal still invalidates the
  approval.
- Server-seeded demo actor context on every mutation; body actor claims are
  ignored. Capability chain evaluated before mutation (denied -> 403).
- Every JSON response, success or error, carries DEMO OWNER CONTEXT labeling.
- Revert runs through the same propose/approve loop.
- Build UI: [ Customize with FYD ] opens the conversational owner panel
  (request -> preview -> one-tap approve -> receipt -> revert), with the
  demo banner always visible and stale handling built in.

### Gaps closed

- G3: cross-tenant ask refused (400 tenant_mismatch), adversarial tests.
- G4: cross-tenant overrides refused (400); body actor claims ("mallory")
  provably ignored, adversarial test.

## Tests (all on the Pig, 2026-09-22)

- Ask route suite: 3 suites, 46 tests passed (includes the owner-correction
  integration test: real owner store apply -> real trusted route -> answer
  contains +1 541 555 0123, cited as owner correction, claimClass supported)
- Overrides route suite: 17 tests passed (digest binding, tampered command,
  tampered view digest -> 409, stale -> 409 with nothing written, body actor
  ignored, demo labels on every response, persistence, revert)
- Builder regression: 9 suites, 69 tests passed
- Tenant regression: 5 suites, 28 tests passed
- TypeScript: tsc --noEmit clean on all worker surfaces (ask, overrides,
  visitor-answer, build UI). Full-project tsc has unrelated pre-existing
  errors outside these surfaces.

## Live evidence (raw transcripts in raw/)

16/16 probes passed against localhost:3100 (SUMMARY.txt):

- Build page 200, shows source phone +15412865190
- Ask SUPPORTED: phone answered with supported citation
- Ask DERIVED: none fabricated live (demo sites carry no derived claims;
  the class is proven by the unit suite); pipeline does not mislabel
- Ask UNKNOWN: refusal on "Do you offer free estimates?"
- Visitor privacy probe: owner-private fact refused in both visitor and
  owner modes
- G3: body siteId coppersmith-plumbing on happy-place route -> 400
- G4: body siteId mismatch on overrides -> 400 with demo label
- Full loop: propose -> approve (bound digests, event ac709ab9...) ->
  Ask answers +1 541 555 0123 citing owner correction -> build page shows
  corrected phone
- Stale proposal -> 409, nothing written
- Revert -> +15412865190 restored
- Restart: dev server process killed and restarted (new PID); correction
  still answered post-restart; then reverted. True restart persistence
  proven (r-ask-post-restart.json).

## Warnings / unresolved

- The shared AskFydWidget (src/fyd/components/ask-fyd-widget.tsx) posts to
  the flat /api/fyd/ask route and accepts no endpoint prop. It was left
  untouched (outside the single-writer surfaces). Wiring /build Ask calls
  to the trusted /api/fyd/ask/[siteId] path needs a coordinated change to
  the shared widget or renderer. The flat route runs the same pipeline and
  answers the correct tenant today.
- The DERIVED answer class has unit-test proof but no live demo data
  exercises it (neither demo site has a PostalAddress entity to coarsen).
  If live derived evidence is required, ingest a fixture business with an
  address entity.
- The dev server was restarted as mandated; it is running again (serving
  200). The live owner dir (/home/nolan/projects/ping/data/fyd-owner)
  is back to its original state (correction applied then reverted).
- Full-project tsc still reports errors outside this worker's surfaces;
  they are pre-existing and unrelated.
