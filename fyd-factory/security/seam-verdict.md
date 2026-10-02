# Projection Seam Security Verdict

Lane: LANE-SEC | Date: 2026-09-23 | Branch: fyd-factory (Pig: /home/nolan/projects/ping)
Gauntlet: `src/fyd/boundary/__tests__/projection-seam-attack.test.ts` (new file, 668 lines, 20 tests)
Result: **20/20 PASS. Zero bypasses found.** The invariant holds on both builder paths.

Invariant: NO EXECUTABLE SOURCE CONTENT CROSSES THE PROJECTION SEAM
(source fixture data -> rendered public HTML).

No new SecurityAuthority was created. No source files were edited
(the branch's modified files are pre-existing lane work; the only
addition is the untracked test file above).

## What was attacked

Real render path, both production builders:
- Path A (existing test precedent): hostile ObjectGraph -> generateSiteSpec
  (proceduralize) -> buildRenderContext -> renderToStaticMarkup(SitePageView)
  for every page.
- Path B (what src/app/build/[siteId]/page.tsx actually uses):
  hostile ObjectGraph -> planSite (builder/planner) -> buildRenderContext
  -> renderToStaticMarkup(SitePageView). Includes a kitchen-sink graph
  carrying every payload class at once, plus the full hostile-URL and
  malformed-URL loops through planSite.

Attack battery (each payload carries a unique SEAM marker):
- URLs: javascript:, mixed-case JaVaScRiPt:, leading/trailing whitespace,
  tab/newline/null-byte smuggling (java\tscript:), data:text/html (raw and
  base64), vbscript:, file:, blob:, HTML-entity scheme (&#106;avascript:),
  in website/email/url/phone fields and a related website object's url field.
- Markup in title/description/fields: <script> (upper and mixed case),
  <iframe>, <object>, <embed>, <img onerror>, quote-breakout
  ("><svg onload>), <svg><g onload>, SVG <image xlink:href="javascript:">,
  MathML <mi xlink:href="javascript:">, <form action="javascript:">,
  <a href="javascript:">, <div style="background:url(javascript:)">,
  <div style="width:expression()">, <style> blocks, single-quote /
  double-quote / backtick / ${} / {{constructor}} breakouts,
  single-encoded (&lt;script&gt;) and double-encoded
  (&amp;lt;script&amp;gt;) entities.
- Hostile object ids: svc-evil"><img src=x onerror=...> used in
  relationships, detailHref, data-fyd-affordance, view-transition names.
- CSS: expression(), url(javascript:), -moz-binding in style-adjacent fields.
- Unicode: U+202A/U+202C embeddings, U+202E RTL override, U+200B/U+200C/U+FEFF
  zero-width chars, null bytes.
- Robustness: 1MB string field, malformed URLs (http://[::1:80, bare
  scheme, empty host, inner space, leading null byte).
- Visibility: private objects (hostile markers + script payloads),
  owner-HIDE field decisions, private related objects.

Detector (in-test): no raw <script>/<iframe>/<object>/<embed> tags; no
event-handler attribute NAMES on real tags (quote-aware, value-stripped so
escaped payload text inside aria-label/data attributes cannot false-positive);
no javascript:/data:/vbscript:/file:/blob: scheme in any href/src/action/
xlink:href value; no expression()/javascript:/-moz-binding in any style
attribute; plus per-payload raw-echo assertions and canary markers proving
the hostile data actually reached the renderer (tests are not vacuous).

Two apparent failures during development were detector false positives,
confirmed by probe: the output was `&lt;img src=x onerror=&quot;...&quot;&gt;`
fully escaped inert text. The detector was fixed (attribute-name-only
scanning); the seam never broke.

## What the seam stops (verified)

1. Hostile URLs: resolveSafeLink (sitespec/safe-link.ts) is the single
   choke point. Parser-based (real URL parser, not scheme regex),
   http:/https: allowlist only, control characters rejected before parsing,
   relative URLs non-navigable without an itself-safe base. All 12 hostile
   URLs plus 6 malformed ones: no executable href emitted, no throw.
2. Hostile markup: zero dangerouslySetInnerHTML in src/fyd (grep-verified).
   All source text renders as React children/attributes and is entity-escaped.
   No raw script/iframe/object/embed/svg-onload/mathml/form-action payload
   reached the output on either builder path.
3. Event handlers: no on* attribute names on any real tag in any render.
   Hostile text that lands inside aria-label/data-fyd-affordance values is
   escaped inert text.
4. CSS: source fields never flow into style props (code scan: style values
   are theme constants or literals). expression()/url(javascript:) payloads
   in fields never reached a style attribute.
5. Entity smuggling: double-encoded payloads render double-escaped
   (&amp;amp;lt;), visible as text, never decoded-then-executed. React
   escapes & < > " ' in both text and attribute values, so source can never
   inject raw markup, quotes, or entities that decode to markup.
6. Id breakout: encodeURIComponent on detailHref; ids in attributes escaped.
7. Visibility: private objects never enter public pages (resolveQuery pub
   filter + planner assertNoPrivateLeak); owner-HIDE fields are dropped from
   the projection while source truth is untouched; private related objects
   leak nothing.
8. Robustness: null bytes and 1MB fields render without throwing and without
   executable content. mailto: values containing "javascript:" stay inert
   (mailto: scheme; the javascript: text is part of the address local-part).

## What the seam does NOT stop (residual, no bypass found)

1. Bidi/zero-width passthrough: U+202E, U+200B etc. pass through as inert
   text. Not executable, but usable for visual spoofing (e.g. a displayed
   string that reads differently than its bytes). Documented behavior;
   optional hardening below.
2. DisplayMedia.src has no render-seam URL gate: <img src> values come from
   pipeline manifests (FYD-minted same-origin /fyd-media/<hash>/ paths;
   ingest fetch is SSRF-gated to http/https). A poisoned manifest on disk
   would flow straight into src. Outside the tested invariant (manifests
   are FYD-generated, not source fixture data), but one compromised write
   away from scriptless-HTML injection (e.g. src="javascript:" does not
   execute on <img>, but data: URLs / event handlers are not the risk here;
   the risk is exfiltration-style src). Defense-in-depth patch below.
3. media.sourceUrl (observed remote URL) renders as evidence text in
   WhyThis/hero affordances: React-escaped, inert. Reviewed, safe.
4. Theme tokens: planner takes input.designTokens (owner-override path).
   Values flow into React style props; modern browsers do not execute
   script from inline styles. Low risk, noted.

## Coverage gaps (not tested, flagged for follow-up)

- Object detail pages (src/app/o/[objectId]/page.tsx -> object/node.tsx):
  code-scanned (text escaped, hrefs internal/safe-link-gated, img src from
  manifests) but not gauntleted. Same for portal-rail and ask panels.
- planSite's "generated" hero-copy slot (GENERATED_PRESENTATION): generated
  copy is not source fixture data, out of this invariant's scope.
- The boundary lane's own jest config cannot run this test as-is (CSS
  transform gap): patch 1 fixes.

## Fix proposals (in ~/workspace/fyd-factory/patches/)

1. boundary-jest-css-stub.patch (REQUIRED for the deliverable): adds the
   components lane's CSS stub to src/fyd/boundary/jest.config.cjs
   moduleNameMapper, so the gauntlet runs under the lane's own config
   (`npx jest --config src/fyd/boundary/jest.config.cjs`). Test-only config
   change; no product code touched.
2. display-media-src-allowlist.patch (OPTIONAL hardening): gates
   DisplayMedia src/blurUrl in media/select.ts to same-origin paths or
   resolveSafeLink-allowlisted http(s) URLs; drops (never renders) anything
   else. Closes residual risk 2.

## Reproduction

On the Pig, branch fyd-factory:
  npx jest --config '{"testEnvironment":"node","rootDir":"/home/nolan/projects/ping","testMatch":["<rootDir>/src/fyd/boundary/__tests__/projection-seam-attack.test.ts"],"moduleNameMapper":{"^@/(.*)$":"<rootDir>/src/$1","\\.css$":"<rootDir>/src/fyd/components/__tests__/css-stub.js"},"transform":{"^.+\\.tsx?$":["ts-jest",{"tsconfig":{"target":"ES2017","module":"commonjs","moduleResolution":"node","jsx":"react-jsx","esModuleInterop":true,"strict":true,"skipLibCheck":true}}]}}'
After patch 1 lands, the plain lane command works:
  npx jest --config src/fyd/boundary/jest.config.cjs

## Bottom line

The projection seam holds. The choke points are real and singular:
resolveSafeLink for every external href, React escaping for every text
node (no dangerouslySetInnerHTML anywhere in src/fyd), the binding
verifier for factual fields, and the visibility projection for
private/hidden data. Twenty attacks, two production builder paths, zero
bypasses. Recommended next: land patch 1, consider patch 2, extend the
gauntlet to the /o/[objectId] node path.
