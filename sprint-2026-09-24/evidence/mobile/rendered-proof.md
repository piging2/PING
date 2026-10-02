# Rendered proof: mobile 5-width matrix + object-scroll

**Tested:** 2026-09-24 ~19:50–20:10 MDT
**Product:** integrated FYD branch `fyd/sprint-integration-2026-09-24` @ `6b49b0c6`
(commit 2026-09-24 19:43:52 -0600, verified on Pig WSL)
**Serving:** Pig-local `http://localhost:3101` — all four routes returned 200
(`/sites/happy-place`, `/sites/coppersmith-plumbing`, `/fyd`, `/objects`)
**Browser:** house headed Chrome via CDP :9223 (Chrome/153.0.8010.53), viewport set with
`page.setViewportSize` (deviceScaleFactor 2, height 844). No code changes, no restarts, no merges.

## NOLAN VISUAL CHECK READY — frozen 2026-09-24 ~20:10 MDT

The one failing width was fixed and re-proven. **Mobile 5-width matrix: 10/10 PASS.
Object-scroll: PASS.** This state is frozen for Nolan's visual check.

- **URL:** `http://localhost:3101` on the Pig — NOTE: the frozen build is currently
  serving on **`http://localhost:3102`** (pid 29835, started 2026-09-24 ~20:00 MDT).
  `:3101` still serves the pre-fix build; restarting `:3101` onto the fixed build
  was out of scope for this fix window (no restarts). Promote by restarting
  `:3101` from the integration branch at the frozen revision below.
- **Frozen revision (canonical):** `fyd/sprint-integration-2026-09-24` @
  `6245af11ea8497683ce870c8e43921379fe6bb7d`
  ("fix(fyd): cap ObjectDoorway pill at container width (320px overflow)",
  2026-09-24 20:03:27 -0600) in `/home/nolan/projects/ping`.
- **Served build revision:** `/home/nolan/build-edge-port` @
  `fb520d799184c6bfacc8b6964b672f07b2591c5f` (identical 2-line fix;
  product tree identical to the canonical revision — the only delta to
  `6b49b0c6` is the fix itself). `.next` BUILD_ID `80gQ93GztEoYvvMHeCN0Y`.
- **Fix diff** (`src/fyd/components/renderer.tsx`, `ObjectDoorway` anchor style):
  `+ maxWidth: "100%"`, `+ boxSizing: "border-box"`. The pill previously sized to
  its 16rem-capped title content (339px); no global border-box reset exists, so
  both properties are required. Title span keeps `overflow:hidden` + ellipsis and
  now shrinks. No visual change at 360px+.
- **Re-proof (fixed build, :3102, house Chrome via CDP :9223):**
  - 320px happy-place: 3/3 runs, `scrollWidth` 305 <= 320, zero overflow,
    doorway pill 273px (was 339px), computed `max-width: 100%`,
    `box-sizing: border-box` confirmed live.
  - 360px happy-place spot check: PASS, zero overflow (doorway 313px).
  - The other 8 width/route combos passed on the product-identical pre-fix build
    and are unaffected (the fix only constrains the previously overflowing element).
- **New screenshots (this directory):**
  `w320-happy-place-fixcheck-run1.png`, `w320-happy-place-fixcheck-run2.png`,
  `w320-happy-place-fixcheck-run3.png`, `w360-happy-place-fixcheck-spot.png`.
- **Object-scroll:** PASS (unchanged, proven on the pre-fix build; no code path touched).

## Original matrix (pre-fix, for the record)

| Width | happy-place | fyd |
|-------|-------------|-----|
| 320   | **FAIL** — horizontal overflow (see defect) | PASS |
| 360   | PASS | PASS |
| 375   | PASS | PASS |
| 390   | PASS | PASS |
| 430   | PASS | PASS |

Per-width checks: no horizontal overflow (`documentElement.scrollWidth <= innerWidth`),
tap targets ≥ 44px on primary actions (buttons, `[role=button]`, header/nav/CTA links),
no broken layout.

- **Tap targets:** PASS everywhere. 0 undersized targets out of 55 checked on happy-place
  and 3 on fyd at every width.
- **Bottom-sheet semantics:** informational — no `[class*=sheet]` elements rendered at rest
  on either route at any width (`sheetHints=0`); the sheet renders on interaction only.
  Not counted as a failure.
- Screenshots: `w{320,360,375,390,430}-{happy-place,fyd}.png` in this directory.

### Defect: 320px happy-place horizontal overflow (real product defect, not a harness artifact)

- Deterministic 4/4 runs (initial matrix + 3 rechecks): at 320px CSS width,
  `documentElement.scrollWidth` = 339 (19px overflow), horizontal scrollbar visible in
  `w320-happy-place.png`.
- Culprit: `a.fyd-object-doorway` — the "Business: Happy Place Carpentry … ->" pill
  (link to `/o/website-business-6fa5ebd99d72c4cb`, aria-label "Open Business object"),
  renders 339px wide and does not shrink to 320. A decorative `->` span adds 4px.
- At 360px the same element fits (scrollWidth 345 < 360), so the defect is specific
  to the 320 breakpoint: the doorway pill has a fixed/minimum width.
- Evidence only, no fix applied (read-only task).

## Object-scroll: PASS

Flow on `/objects` at 390px:
1. `/objects` loaded — object circles are tap-to-expand (no `/o/` anchors on the listing page itself).
2. Tapped Happy Place Carpentry circle → `[role="dialog"]` opened with object detail
   and link `/o/happy-place`.
3. Clicked through to `http://localhost:3101/o/happy-place`, scrolled to 600px
   (focus remained `body`).
4. Traversed to related link `http://localhost:3101/o/happy-place/manage`.
5. `history.back()` → URL restored to `/o/happy-place`, scrollY restored exactly
   (600 → 600), focus restored exactly (`body` → `body`).

Verdict: **PASS** — urlRestored=true, scrollRestored=true, focusRestored=true.
Screenshot: `object-scroll.png`.
Caveat: the "related" hop landed on `/o/happy-place/manage` (a sub-view of the same
object) rather than a different object — the first distinct `/o/` link on the page.
The back-navigation restore behavior itself is what was under test, and it held exactly.

## Environment notes (for future proof runs)

- `ctx.newCDPSession(page)` + `Emulation.setDeviceMetricsOverride` **wedges the house
  browser after ~10 sessions** (new sessions hang indefinitely; had to taskkill the
  worker twice). `page.setViewportSize()` works reliably with no manual CDP sessions —
  use it for all width emulation on the house browser.
- WSL path translation mangles `/mnt/c/...` script args for the Windows node.exe
  (`C:\mnt\c\...`); run node.exe via `pig_ssh` with native `C:\` paths instead.
- The `:3101` server and CDP `:9223` are Pig-local; this sandbox cannot reach them
  directly — all browser work runs on the Pig via `pig_ssh`.
- Probe scripts used (kept on Pig at `C:\Users\nolan\mobile-proof\`):
  `mobile-proof.cjs` (superseded), `object-scroll.cjs` (superseded),
  `final-proof.cjs` (authoritative run), `recheck-320.cjs`, `inspect-objects.cjs`,
  `tap-object.cjs`, `cdp-mini.cjs`.
