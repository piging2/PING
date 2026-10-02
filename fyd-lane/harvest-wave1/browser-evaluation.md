# FYD Browser Evaluation Harness: Harvest Wave 1 (READ-ONLY lane)

Date: 2026-09-21. Lane: browser evaluation. Budget: ZERO GitHub API calls (confirmed at 0; budget frozen by parent during Patch 7 verification).

Bounded question: after any renderer change, what is the smallest set of automated browser checks that proves same graph to same render, motion respects reduced-motion, no horizontal overflow on mobile, zero console errors, and basic a11y passes, without building a new framework?

Short answer: one Node script (~230 lines) on the Pig, reusing the existing playwright-core CDP pattern, plus two tiny npm libraries (axe-core for a11y, pixelmatch for screenshot diffing). Everything else in the six checks is Playwright built-ins or logic already on disk in this lane.

## 1. Proposed harness shape: `fyd-browser-gate.js`

One file. One command. No test framework, no runner, no CI service, no external screenshot service.

```
node fyd-browser-gate.js --url https://<demo>/sites/happy-place --goldens ../work/goldens [--update-goldens]
```

Runs on the Pig via the existing `~/workspace/pig/pigwsl-run.sh` bridge, connecting to the Pig's Chrome over CDP exactly like `fyd-lane/console-capture.js` already does (`chromium.connectOverCDP`, `require('playwright-core')`). Exit 0 = all gates pass. Exit 1 = JSON report on stdout listing each failed check with evidence (diff PNG path, violating selectors, console lines). `--update-goldens` regenerates golden PNGs after a deliberate renderer change; a human reviews the diff PNG first.

The gate runs each demo site (happy-place, coppersmith-plumbing) at two viewports: mobile 375x812 (`isMobile: true, hasTouch: true`) and desktop 1280x800. Per page load it executes the six checks below. Renderer changes are gated on both sites at both viewports.

### Check 1: deterministic render (screenshot diff vs golden)

- Runs: wait for `document.fonts.ready` and network idle, then `page.screenshot({ animations: 'disabled', caret: 'initial' })`. Decode PNG via pngjs, compare to the committed golden with pixelmatch `{ threshold: 0.1, includeAA: false }`.
- Passes: identical dimensions AND differing-pixel count <= maxDiffPixels (budget: 0.01% of pixels, min 4 px, set in one constant).
- Fails: dimension change, or diff count above budget. Writes a diff PNG next to the golden for human review.
- Flake controls (the tolerance story): `animations: 'disabled'` freezes CSS animations at a deterministic frame; `caret: 'initial'` kills the blinking cursor; `document.fonts.ready` kills webfont pop-in; deviceScaleFactor 1; no exact-byte compare anywhere. Anti-aliased pixels are excluded from the count, so subpixel font-render jitter does not fail the gate.
- Est. LOC: ~60. Reuses: Playwright screenshot built-ins; pixelmatch (external, see card 2); pngjs (folded into card 2 as the decode primitive).

### Check 2: prefers-reduced-motion respected

- Runs: `await page.emulateMedia({ reducedMotion: 'reduce' })`, reload, then in-page evaluate: for every element with a computed `animation-name` not equal to `none` or a nonzero `transition-duration`, record it. Then take two screenshots 500 ms apart and pixelmatch them.
- Passes: zero elements with surviving motion under `reduce`, AND the two frames are pixel-identical (diff count 0).
- Fails: any animation or transition still runs, or the frames differ. Reports the offending selectors.
- Est. LOC: ~30. Reuses: Playwright `emulateMedia` built-in; pixelmatch from check 1. No new dependency.

### Check 3: no horizontal overflow on mobile

- Runs: at 375 px viewport, in-page evaluate: find every element where `el.scrollWidth > el.clientWidth + 1`, and check `document.documentElement.scrollWidth <= window.innerWidth + 1`. Verdict rule reused from `fyd-lane/mobile-overflow-trace.js` (FL-20260921-033): the FIRST ancestor (nearest the content) where scrollWidth > clientWidth owns the bug; report that element's selector.
- Passes: zero overflowing elements.
- Fails: any overflow; reports owning selector plus clientWidth/scrollWidth so the fix lands on the right element (min-width: 0 / minmax(0,1fr)), not sprayed blindly.
- Est. LOC: ~25. Reuses: the overflow-trace logic already on disk in this lane, converted from console diagnostic to pass/fail gate.

### Check 4: zero console errors and zero page errors

- Runs: attach `page.on('console', m => m.type() === 'error')` and `page.on('pageerror')` listeners BEFORE `page.goto` (listener-before-navigation is the correctness point), plus `page.on('requestfailed')` for same-origin requests. Settle 3 s after load, then evaluate.
- Passes: zero console errors, zero pageerrors, zero failed same-origin requests.
- Fails: any of the above; prints the first five with truncated text and the first six stack lines.
- Est. LOC: ~20. Reuses: `fyd-lane/console-capture.js` nearly verbatim; that file is the proven pattern in this lane.

### Check 5: basic a11y (axe-core, WCAG 2.2 AA)

- Runs: `page.addScriptTag({ content: require('axe-core').source })`, then `page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }))`. Note: axe-core has no `wcag22a` tag; the 2.2 additions it automates are all AA, so the tag set above is complete and normative. Best-practice rules are excluded to keep the gate deterministic.
- Passes: `violations.length === 0` after subtracting a documented in-file allowlist (each allowlist entry carries a rule id and a one-line justification; empty by default).
- Fails: any violation outside the allowlist; prints rule id, help text, node count, first three selectors.
- Est. LOC: ~35 including the allowlist. Reuses: axe-core (external, see card 1). No adapter library needed.

### Check 6: mobile viewport sanity

- Runs: viewport 375x812 with `isMobile: true, hasTouch: true`. In-page evaluate: (a) `<meta name="viewport">` exists with `width=device-width`; (b) interactive elements (`a, button, [role=button], input, select, textarea`) with non-inline display have bounding boxes >= 24x24 CSS px (WCAG 2.5.8 minimum); (c) the hero `h1` is within the first viewport (`getBoundingClientRect().top < innerHeight`).
- Passes: viewport meta correct, zero undersized tap targets, h1 above the fold.
- Fails: otherwise, with the failing selectors and measured sizes.
- Est. LOC: ~40. Reuses: Playwright viewport emulation built-in; pure DOM queries, no dependency.

Total: ~210 to 250 lines, one file, plus golden PNGs in `fyd-lane/work/goldens/<site>/<viewport>.png`. New npm dependencies: exactly two (axe-core, pixelmatch + its decode partner pngjs, folded into card 2). No framework, no service, no browser vendor lock beyond the Chromium already on the Pig.

Renderer-change flow: run the gate on both demo sites at both viewports. Any diff above threshold fails the gate. Reviewer opens the diff PNG: if the change is intentional, rerun with `--update-goldens` and commit; if not, it is a renderer bug. Goldens are only ever regenerated deliberately, never auto-updated on failure.

## 2. External project cards (2 max)

### CARD 1: axe-core

- PROJECT: dequelabs/axe-core (https://github.com/dequelabs/axe-core)
- PINNED SHA: not pinned this lane. GitHub API budget is frozen, so no SHA was resolved. Recommendation: npm exact pin `axe-core@4.10.3` in package.json plus a lockfile. SHA pinning is for git dependencies; for an npm package the exact version plus lockfile is the correct pin. A commit SHA can be resolved when the budget releases.
- LICENSE: MPL-2.0 (stated in the repo README Licenses section; third-party bundle terms in LICENSE-3RD-PARTY.txt).
- RECENT ACTIVITY: actively maintained. README and CHANGELOG crawled 3 days ago show updates within the last 4 days; the 4.10.x line is the current stable series (4.10.3 referenced in Deque's 2025 release notes; develop branch has steady commit activity).
- FYD PROBLEM: the "basic a11y passes" gate needs a deterministic, maintained rule engine. Hand-rolled a11y heuristics rot and produce false positives that train the team to ignore the gate.
- MECHANISM: an in-page audit engine. Inject `axe.min.js` into the page, call `axe.run(context, options)`, get back structured results: `violations` (rule id, help, nodes with CSS selectors), `incomplete` (needs manual review), `passes`. Rule corpus covers WCAG 2.0, 2.1, 2.2 levels A/AA/AAA plus best practices, with `runOnly` tag filtering so the gate runs exactly the normative 2.2 AA set and nothing else. Deque's documented figure: about 57% of WCAG issues are automatable; the rest are honestly reported as incomplete, not silently passed.
- EXACT IMPLEMENTATION: files: `node_modules/axe-core/axe.min.js` (loaded via `page.addScriptTag`), or `require('axe-core').source` for the raw source string. Symbols: `axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa'] } })`, `results.violations[].id`, `results.violations[].nodes[].target`. FYD wrapper: inject, evaluate, assert zero violations minus the in-file allowlist. Tests that prove the wiring: a fixture page with an unlabeled image input must yield >= 1 violation; a clean fixture must yield 0.
- CLAIM EVIDENCE: Deque README documents the WCAG 2.x rule corpus and the ~57% automation figure; the engine is the same one embedded in Chrome DevTools (Lighthouse) and Microsoft's accessibility tooling, which is field evidence of determinism at scale.
- SOURCE EVIDENCE: dequelabs/axe-core README.md and CHANGELOG.md (both crawled within the last 4 days), Deque Developer Hub 2025 release notes referencing axe-core 4.10.3, all read via web search this lane. No GitHub API used.
- RUNTIME EVIDENCE: not executed in this lane (read-only, no npm install per lane rules). The inject-and-run pattern is the documented standard integration and is proven inside Chrome DevTools on millions of pages.
- DEPENDENCY COST: one npm package, zero runtime dependencies, dev-only. Loaded per page via addScriptTag (no network fetch at gate time). Risk is rule-version drift between pins; mitigated by the exact pin plus lockfile and the in-file allowlist for version-sensitive rules.
- WHAT FYD ALREADY HAS: nothing. There is no a11y gate anywhere in fyd-lane today.
- WHAT THEY DO BETTER: a maintained corpus of 90+ rules with WCAG mapping, false-positive discipline from a dedicated team, and a community that reports bad rules. FYD cannot replicate this by hand.
- WHAT FYD DOES BETTER: nothing here; this is pure gap fill, not a competition.
- SMALLEST HARVESTABLE PRIMITIVE: the `axe.run` API plus the `runOnly` tag filter. Do NOT take `@axe-core/playwright`, `axe-playwright`, or `axe-cli`; they are thin adapters around six lines of Playwright code FYD already writes.
- REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: DEPEND ON LIBRARY (npm package, exact pin).
- CAN IT: the seven attested FYD harvest questions from harvest-report.md (2026-09-21) are answered below. The card template asks for ten; lane records attest only seven. The three unrecorded questions are marked NOT ON RECORD rather than invented.
  - REMOVE CODE? No. It adds a dependency, but it removes the need for any hand-rolled a11y heuristic code that would otherwise be written and maintained.
  - REMOVE AMBIGUITY? Yes. "Basic a11y passes" becomes a named rule set (WCAG 2.2 AA) with named violations and selectors, not a vague claim.
  - IMPROVE TRUST? Yes. Violations are deterministic per pinned version and each carries a rule id and WCAG mapping, so failures are explainable.
  - MAKE REGENERATION MORE CORRECT? Partially. It gates the rendered output after regen; it does not fix the generator.
  - MAKE ACTION SAFER? Partially. It is a read-only observation; safety comes from blocking bad renders before they ship.
  - REDUCE AI USE? Yes. Deterministic rules replace any temptation to have an LLM "review" accessibility.
  - ENABLE ANOTHER PROJECTION LATER? Partially. The same gate runs against any future projection (Circle, feed cards) that renders to HTML.
  - (8-10) NOT ON RECORD: no eighth, ninth, or tenth harvest question found in lane artifacts.
- FALSIFICATION EXPERIMENT: pin axe-core@4.10.3, run the gate against the two demo pages. The DEPEND verdict is falsified if axe reports violations on markup that is plainly correct (false positives the allowlist cannot sanely absorb), or if a single run takes more than 30 s on these small pages (performance disqualification), or if two runs of the same pinned version on the same page disagree (nondeterminism).

### CARD 2: pixelmatch

- PROJECT: mapbox/pixelmatch (https://github.com/mapbox/pixelmatch)
- PINNED SHA: not pinned this lane (budget frozen, no SHA resolved). Recommendation: npm exact pin `pixelmatch@7.2.0` in package.json plus a lockfile. 7.2.0 is the current latest, published about 3 months ago.
- LICENSE: ISC (permissive; confirmed by npm/jsDelivr metadata).
- RECENT ACTIVITY: maintained. 7.2.0 published ~3 months ago; 22 released versions; zero known vulnerabilities in the latest ReversingLabs SAFE assessment (refreshed 2026-09-08).
- FYD PROBLEM: the "same graph to same render" gate needs image diffing with a real tolerance story. Naive byte comparison of screenshots is flaky by design (font rasterization, subpixel anti-aliasing), and flaky gates get disabled, which kills the whole harness.
- MECHANISM: per-pixel comparison with perceptual color distance in YIQ space plus an anti-aliased-pixel detector. Returns the count of differing pixels. Options: `threshold` (default 0.1, color-distance sensitivity) and `includeAA` (whether anti-aliased pixels count as differences). The tolerance story is therefore explicit and tunable: perceptual threshold for color, AA exclusion for rasterization jitter, and a max-differing-pixels budget for the gate.
- EXACT IMPLEMENTATION: files: `node_modules/pixelmatch/index.js` (~150 lines, zero dependencies). Symbols: `pixelmatch(img1, img2, diffOutput, width, height, { threshold: 0.1, includeAA: false })` returning differing-pixel count. Inputs are raw RGBA buffers, so PNG decode comes from `pngjs` (MIT, zero dependencies), folded into this card as the decode primitive rather than a third card: `PNG.sync.read(buffer).data`. FYD wrapper: decode golden and fresh screenshot, assert same dimensions, pixelmatch, compare count to the budget constant, write the diff PNG on failure. Tests that prove the wiring: identical renders must yield 0; a render with one intentionally changed button must yield a small nonzero count within budget or above it, matching expectation.
- CLAIM EVIDENCE: "the smallest and fastest pixel-level image comparison library", ~150 lines, zero dependencies (README via npm mirror); it is the differ Playwright itself uses for screenshot assertions, which is field evidence that its threshold behavior is trusted for exactly this job.
- SOURCE EVIDENCE: jsDelivr pixelmatch page (7.2.0, ISC), ReversingLabs Spectra Assure versions/vulnerabilities pages, socket.dev version history, npm.io README mirror, all read via web search this lane. No GitHub API used.
- RUNTIME EVIDENCE: not executed in this lane (read-only, no npm install). Behavior is field-proven as Playwright's own screenshot differ.
- DEPENDENCY COST: ~2 KB of pure JS, zero dependencies of its own; co-requires pngjs (also zero-dep, MIT) for PNG decode. Total new dependency weight is negligible and both are deterministic pure functions.
- WHAT FYD ALREADY HAS: nothing for visual diffing. Screenshot capture exists only ad hoc (`pig-fb/diag-metaai-shot.js`, `pig-fb/feed-shot.js`); no comparison logic anywhere.
- WHAT THEY DO BETTER: the anti-alias-aware perceptual diff is the specific mechanism that makes screenshot gating non-flaky. A hand-rolled differ would rediscover this the hard way.
- WHAT FYD DOES BETTER: nothing here; pure gap fill.
- SMALLEST HARVESTABLE PRIMITIVE: the `pixelmatch()` function itself. Do NOT take `puppeteer-pixelmatch`, `@loki/diff-pixelmatch`, `png-visual-compare`, or any screenshot-service wrapper; they add frameworks around a 150-line function.
- REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: DEPEND ON LIBRARY (npm package, exact pin; pngjs as co-dependency).
- CAN IT:
  - REMOVE CODE? No, but it removes the need to write and maintain a custom differ (the classic false economy).
  - REMOVE AMBIGUITY? Yes. "Same render" becomes a number: differing-pixel count vs a named budget, with a diff PNG as evidence.
  - IMPROVE TRUST? Yes. The gate fails with a visible diff artifact, so a renderer change is reviewable instead of debatable.
  - MAKE REGENERATION MORE CORRECT? Partially. It detects render drift after regen; it does not fix the generator.
  - MAKE ACTION SAFER? Partially. Read-only observation that blocks bad renders before they ship.
  - REDUCE AI USE? Yes. Deterministic pixel math replaces any "does this look right" judgment call.
  - ENABLE ANOTHER PROJECTION LATER? Yes. The same capture-and-diff pattern gates any future HTML projection.
  - (8-10) NOT ON RECORD: no eighth, ninth, or tenth harvest question found in lane artifacts.
- FALSIFICATION EXPERIMENT: render the same demo page twice in one session (fonts ready, animations disabled) and pixelmatch the two screenshots at threshold 0.1. The DEPEND verdict is falsified if identical renders persistently differ above the pixel budget after the flake controls are applied, or if a one-pixel intentional change is not detected (sensitivity failure). Either outcome means the threshold story does not hold in this browser/environment.

## 3. KILL LIST (one-line rejections)

- @playwright/test `toHaveScreenshot`: a full test-runner framework with snapshot bookkeeping for what is six checks; playwright-core plus a script is enough.
- Percy / Chromatic / Applitools Eyes: external screenshot services with network dependencies and per-shot pricing; the lane rule rejects external services.
- BackstopJS: config-heavy Puppeteer-era wrapper with a history of flakes and no clean threshold story; we already have CDP on the Pig.
- Cypress: full E2E framework with its own browser management; massive overkill for six checks and duplicates the Pig's Chrome.
- Lighthouse CI: performance scores fluctuate run to run, which is flaky-by-design gating; use targeted axe-core for a11y instead of the whole Lighthouse bundle.
- pa11y: thin CLI wrapper around axe-core; adds a process layer we do not need when six lines of Playwright inject axe directly.
- @axe-core/playwright and axe-playwright adapters: thin adapters around `addScriptTag` plus `evaluate`; they buy nothing.
- jest-image-snapshot: ties diffing to the Jest framework; pixelmatch direct is framework-free.
- Resemble.js: unmaintained and heavier, with no anti-alias story as clean as pixelmatch's.
- odiff: fast native binary but ships via postinstall binary download with single-maintainer risk; pixelmatch is pure JS, zero-dep, and already Playwright's own differ.
- eslint-plugin-jsx-a11y as a substitute: static lint on source, not the rendered DOM in a real browser; a complement at best, not the gate.
- Puppeteer as a new driver: Playwright over CDP already exists and is proven on the Pig; a second driver duplicates the capability.

## 4. GitHub API calls used

0. All external evidence came from web search and project docs. No api.github.com call was made by any route. SHA pins for axe-core and pixelmatch are deferred until the parent releases the budget; npm exact-version pins plus a lockfile are the recommended pinning mechanism in the meantime.

## 5. Falsification story: what would prove this harness insufficient or flaky

Insufficient (passes but the product is broken):
- A renderer change that alters which business data is bound but keeps the layout identical on both demo sites could still pass if the golden pages happen to share the changed content. Mitigation: goldens are per site and per viewport, and the binding layer (verifyPresentationBinding) owns data correctness; this harness owns rendering invariants only. A same-screenshot wrong-data incident would prove the harness needs a DOM-text assertion check added.
- A layout break at an intermediate width (e.g. 768 px tablet) passes because only 375 and 1280 are gated. A tablet-only overflow incident would prove a third viewport is needed.
- axe-core automates roughly 57% of WCAG; a keyboard trap or broken focus order would pass the a11y gate. That would prove the gate needs a small scripted keyboard walk (Tab order assertion), not that axe is wrong.
- A console error thrown after the 3 s settle window (lazy chunk, idle callback) would pass the console gate. A late-error incident would prove the settle needs to cover idle callbacks or the gate needs a longer window.
- Reduced-motion verified by emulation: a compositor-driven animation that ignores the media query would pass emulation but move for real users. A user report of motion under OS reduce-motion would prove the need for a real-OS-setting run, not just emulation.

Flaky (fails but the product is fine):
- pixelmatch reporting diffs on consecutive identical runs after fonts.ready and disabled animations would prove the threshold story does not hold in this browser/GPU environment; the fix is a larger pixel budget or masked regions, not deleting the gate.
- axe rule drift between pins changing verdicts would prove the exact pin plus lockfile discipline failed and the allowlist needs version comments.
- CDP connection drops on the Pig failing the run would prove infra failure is being misattributed to the product; the gate must distinguish DRIVER_FAIL (infra, retry) from GATE_FAIL (product, block), exactly as console-capture.js already distinguishes DRIVER_FAIL with its own exit path.
- The tap-target heuristic flagging legitimate inline links would prove the inline-display exclusion needs refinement, not that the check is wrong.

The core honesty clause: this harness proves rendering invariants in a real browser. It does not prove the graph to spec projection is correct; that belongs to the binding verifier and the WHY THIS evidence chain. If a future incident shows a correct screenshot of incorrect business facts, the gap is in the projection layer, and this harness stays as is.
