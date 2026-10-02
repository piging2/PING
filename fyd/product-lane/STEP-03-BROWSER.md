# Step 3: Real Browser Proof — PASS (6/6)

Date: 2026-09-23. Real Chromium 153 (headless, local Playwright) against
`http://localhost:3111` serving the candidate tree production build.

## Result

| Site | Desktop 1280 | Mobile 375 | Mobile 320 |
|---|---|---|---|
| happy-place | PASS | PASS | PASS |
| coppersmith-plumbing | PASS | PASS | PASS |

Every viewport check verified: HTTP 200, body renders (>200 chars),
no horizontal overflow, no console errors, no page errors, no
placeholder text, internal navigation click lands on a real object page,
tap-native controls (no hover dependency).

Content causality in the browser:
- Coppersmith: People section present ("The people"), person
  `coppersmithplm` visible.
- Happy Place: no People section; Pergola service visible.

Evidence: `hidden_files/step3-evidence/step3-results.json`,
`hidden_files/step3-evidence/*.png` (home screenshots for both sites,
both widths). Proof script: `step3-browser-proof.py`.

## Defects found and fixed (generic, no customer branches)

1. Same-document view-transition helpers (`src/fyd/ui/object-layer/view-transitions.ts`,
   `src/fyd/components/compose-motion.ts`) caught only synchronous throws.
   The transition can abort asynchronously after the call returns; the
   unhandled rejection surfaced as a page error. Fix: attach a no-op catch
   to the returned transition's `finished` promise. UI update already ran;
   abort is benign.

2. Cross-document opt-in (`@view-transition { navigation: auto }` emitted
   by `FydMotionStyles`) aborts on browsers where the feature is disabled
   (headless, some webviews). Chromium surfaces the abort as an
   `unhandledrejection` (InvalidStateError) on the new document BEFORE its
   own scripts run, so a body-level guard cannot catch it. Fix: first-in-
   `<head>` guard script in `src/app/layout.tsx` that calls
   `preventDefault()` only for the ViewTransition InvalidStateError; every
   other rejection passes through untouched.

Both fixes are in shared generic code paths. `tsc --noEmit` clean,
`next build` clean (46/46 pages), proof rerun 6/6 after rebuild.

## Notes

- The candidate tree's jest/babel setup cannot parse its own test files
  (`import type` syntax error in compose.test.ts); pre-existing, unrelated
  to this step, not touched.
- Earlier managed-browser failure (leased VM localhost) was an execution-
  environment limitation, resolved by installing real Chromium locally.
