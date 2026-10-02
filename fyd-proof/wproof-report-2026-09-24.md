# W-PROOF report: FYD FIRST BROKEN STEP boundary proof (2026-09-24)

Worker: W-PROOF. Pipeline commit 6d5ee8ff4449 (fyd-factory). No pushes. No destructive git.
SECRET MATERIAL FOUND: NO.

## CANONICAL TEST
450/450 GREEN at commit 6d5ee8ff (jest per-lane configs): proceduralize 85, builder 100,
sitespec 92, boundary 26, components 93, customize 54. (The directive's "127/127" is a
stale frontier count; the current suites total 450.)

## WEBSITE A CURRENT GRAPH (happy-place)
- Projection: fyd-projection-dump@1.2.1, dumpedAt 2026-09-24T12:27:53Z,
  generatedAt 2026-09-21T12:00:00.000Z, eventSequences [65, 83]
- SOURCE DIGEST (base): eacaa6113180f2cf601e... ; GRAPH DIGEST: 40ad3c430350d299f24e...
  (digest-verified inside getPingObjectGraph; tamper = hard failure)
- Overlays: 9 (fyd-seed-ovl-001..007 + fyd-ovl-mufgsyxx-3836bf09f4a4 + fyd-ovl-mufgw6px-737a81b0326c)
- OBJECTS (8): business "Happy Place Carpentry LLC" (public), location "Adair Village, OR, US"
  (public), 5 services public (Repairs, Fencing, Painting, Drywall, Restoration), 1 service
  private ("Pergola Design Consultations")
- RELATIONSHIPS (7): 5x offers (incl. 1 to the private object), 1x located_at

## WEBSITE B CURRENT GRAPH (coppersmith-plumbing)
- Projection: fyd-projection-dump@1.2.1, dumpedAt 2026-09-24T12:27:28Z,
  generatedAt 2026-09-21T12:01:10.844Z, eventSequences none
- SOURCE DIGEST (base): 8eaf11fc761a49ff51e5... ; GRAPH DIGEST: 8eaf11fc761a49ff51e5...
- Overlays: 6 (fyd-ovl-mufh0cte-41aef0c10164, mufh2e3o, mufhf8y2, mufhfclg, mufhgy03, mufhj55z)
- OBJECTS (8): business "Coppersmith Plumbing - HVAC - Mechanical" (public),
  external_identity "coppersmithplumbing.com" (public), location
  "Grand Junction, Colorado, 81501, United States" (public), person "coppersmithplm"
  (public), 4 services public (Plumbing, Heating & Cooling, HVAC, Ventilation)
- RELATIONSHIPS (7): 4x offers, 1x works_for (person -> business), 1x links_to
  (person -> external_identity), 1x located_at

## SITE SPEC A (happy-place) - digest a65884998368c2fe9872... (pre-intent 02488593904c...)
- home: Hero(1) BusinessSummary(1) Services(5) Locations(1) Contact(1) Links(1) CTA(1)
  AskFYD(0) ObjectRail(5)
- about: BusinessSummary(1)
- services: Services(5)
- explore: ObjectFeed(5)
- nav: Home/About/Services/Explore. Determinism: generateSiteSpec run TWICE, byte-identical.
  Validator: 0 findings, renderable true.

## SITE SPEC B (coppersmith-plumbing) - digest d68d873b0c18d8227b5a... (pre-intent 7519065d6a06...)
- home: Hero(1) BusinessSummary(1) Services(4) Locations(1) People(1) Contact(1) Links(1)
  CTA(1) AskFYD(0) ObjectRail(5)
- about: BusinessSummary(1) People(1)
- services: Services(4)
- explore: ObjectFeed(4)
- nav: Home/About/Services/Explore. Determinism: byte-identical. Validator: 0 findings,
  renderable true.

Full per-section OBJECT -> SECTION dependencies (resolvedObjectIds) are recorded in
/home/nolan/fyd-proof-run/wproof-steps1-2.json.

## STRUCTURAL DIFF (existing diffSiteSpecs, planner fyd-site-planner@2)
- pagesOnlyInA: [] / pagesOnlyInB: []
- home: onlyInB=[People]; about: onlyInB=[People]; services/explore: no component differences
- orderChanged: false on every shared page. tokenDiffs: 0. presenceDiffs: []. archetype: null/null.
- materiallyDifferent: true. Reasons: section set differs on home, section set differs on about.

## MATERIALLY DIFFERENT: YES, and explainable
B's graph contains a ping.social.person@1 object linked to the owner by works_for; the
generic planner rule (works_for/employs/member_of/has_employee/has_member drive People
sections + about-page composition, commit 6d5ee8ff) fires for B and correctly does not
fire for A (A has zero person objects). Everything else is deterministically similar
because the evidence shape is similar: same page set, same component order, same tokens.
Cardinality differences also track the graph: Services resolves 5 (A) vs 4 (B); ObjectFeed
5 vs 4. No AI-randomness difference anywhere.

## CUSTOMER-SPECIFIC CODE: ZERO
Grep over generator.ts, planner.ts, eligibility.ts, renderer.tsx, schema-roles.ts,
spec-pipeline.ts, apply-layer.ts: the only mention of a demo slug is a doc comment
("Public site slug (e.g. \"happy-place\")"). No conditionals on either tenant anywhere
in the pipeline.

## DESKTOP A-B: PASS
Real headless Chrome (Windows Chrome via CDP, PowerShell route): both pages HTTP 200,
0 console errors, 0 page errors, served h2 order matches spec section order on both,
People section renders on B only, all expected facts present, zero cross-site fact leaks,
private "Pergola Design Consultations" object withheld from A's render, nav About/Home
round-trip click changes rendered content. Screenshots inspected: both render complete
real UI (hero, about, service cards, locations, people, contact, links, CTA, Ask FYD,
featured object with source URL, demo owner-mode customize panel).

## MOBILE A-B: PASS (375px)
No horizontal overflow measured (scrollWidth == innerWidth on both), 0 console/page
errors, nav wraps and stays clickable, all primary content visible and readable,
touch-sized buttons (mobile shows an extra "Call 970-245-3869" CTA), no essential
content behind hover (Why-this affordances are click targets), People section renders
on B mobile. Screenshots inspected.

## SOURCE CONTENT SAFETY: PASS
8 hostile cases through the REAL path (generateSiteSpec -> renderToStaticMarkup with
SitePageView): <script> in title entity-escaped, <img onerror> escaped, javascript: URLs
neutralized/dropped (website + socials), malformed URL dropped, "&amp;" correctly
double-escaped, quote-break in phone field neutralized, <svg onload> escaped.

## FIRST BROKEN STEP
NONE. The boundary OBJECT GRAPH -> SITE SPEC -> RENDERER -> BROWSER is GREEN.
The SITE-PLANNER-IS-TOO-GENERIC tripwire did not fire: the planner is generic AND the
graph semantics change the experience.

## NEXT
Per the directive, the next boundary is RENDERED EXPERIENCE -> ASK FYD -> EVIDENCE:
implement the smallest Ask FYD proof. One hard question: "What services does this
business offer, and how do you know?" Answer must come from the CURRENT object/evidence
graph. Return ANSWER, EVIDENCE REFERENCES, SOURCE URL(S), DIRECT/DERIVED/INFERRED
classification. No generic chatbot answer.

## OPERATIONAL NOTES
- :3100 was rebuilt (npm run build, exit 0) AFTER the planner commit and restarted; it
  is currently running in the W-PROOF held exec session (foreground, verified Ready,
  both pages 200). Earlier setsid-detached attempts failed to produce a responsive
  server (one bound :3100 but never answered HTTP). Start script kept at
  /home/nolan/fyd-proof-run/start-3100.sh if a durable restart is needed; verify with
  curl before relying on it.
- Served pages compile specs dynamically at render time through the shared seam
  (compileSiteSpecWithIntent), so "regeneration" = current projection -> generateSiteSpec;
  there are no stale generated artifacts to clear.
- The directive's frontier graph counts (A: 2 objects/1 rel, B: 4 objects/3 rels) are
  stale; current projections have 8 objects / 7 relationships each after owner overlays.
- Playwright's bundled Chromium cannot run on Pig WSL (missing libnspr4.so, no
  passwordless sudo for apt). Browser proof used the Pig's Windows Chrome headless with
  a TCP CDP port driven from PowerShell (the same side the existing CDP workers use).
- Artifacts: /home/nolan/fyd-proof-run/wproof-steps1-2.json (full boundary report),
  /home/nolan/fyd-proof-run/wproof-step4.json, /home/nolan/fyd-proof-run/shots/
  (4 screenshots), C:/Temp/fyd-proof/ (Windows-side copies). Scripts:
  /home/nolan/fyd-proof-run/wproof-steps1-2.ts, wproof-step4-win.cjs, run-step4.ps1.
