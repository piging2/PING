# Portal rail proof (lane E2)

Visual + geometric proof for the FYD side-rail default-rule decision. 50 spec rows, 48 unique screenshots, captured 2026-09-21 on the Pig via `portal-proof/rail-capture/rail-capture.mjs` against the dev server on :3100 (`/portal-rail?business=...&side=...&mode=...`). `window.__railMetrics` was present on all 50 rows; every PNG verified non-zero with a valid PNG header (analysis: `portal-proof/rail-capture/analyze-rail.py`, result COMPLETE).

Businesses: `happy-place` (Happy Place Carpentry LLC), `coppersmith-plumbing` (Coppersmith Plumbing - HVAC - Mechanical). All screenshots are representative placement fixtures, not the businesses' real websites.

## Invariant verdict

Required invariants: overlapPx == 0 and hOverflowPx == 0 for every capture.

- overlapPx: 0 on all 50 rows. No violations.
- hOverflowPx: 0 on 46 of 50 rows. 4 violations, all the same failure:

| capture | file | overlapPx | hOverflowPx | portalBox |
|---|---|---|---|---|
| core-03 | happy-place/1280x800/right-static-s0.png | 0 | 12 | 64x64@1228,105 |
| core-04 | happy-place/1280x800/right-sticky-s0.png | 0 | 12 | 64x64@1228,96 |
| core-15 | coppersmith-plumbing/1280x800/right-static-s0.png | 0 | 12 | 64x64@1228,105 |
| core-16 | coppersmith-plumbing/1280x800/right-sticky-s0.png | 0 | 12 | 64x64@1228,96 |

Forced-right at 1280x800 puts the 64px portal at x=1228, so 12px hangs past the 1280 viewport edge. The screenshot shows the circle visibly clipped by the right edge. Forced-left at 1280x800 passes the numeric invariants (hOverflowPx=0) but the portal lands at x=-12, so 12px of the circle is clipped off the left edge of the viewport (visible in the left-static/left-sticky shots). At 1280 neither forced side renders cleanly.

## Auto-rule chosen side

| business | 1280x800 | 1440x900 | 1920x1080 |
|---|---|---|---|
| happy-place | none (leftFree=0, rightFree=40) | right (leftFree=16, rightFree=120) | right (leftFree=256, rightFree=360) |
| coppersmith-plumbing | none (leftFree=0, rightFree=40) | right (leftFree=16, rightFree=120) | right (leftFree=256, rightFree=360) |

Identical for static and sticky modes. At 1280 the rule picks no rail at all (portalBox null); the screenshots show the fallback: a small black "N" launcher circle at bottom-left instead of a rail.

## Sticky vs static verdict: sticky wins, confirmed visually

Sticky scroll series at 1440x900 (auto, right rail), both businesses: the portal stays pinned at 64x64@1348,96 at scrollY 0, 724 (mid), and bottom. `verticalState` = fully-visible on all six sticky captures. The smid screenshots show the circle fixed at the right edge while the page content has scrolled to the About/Contact sections.

Static scroll check at 1440x900 (auto, right rail), both businesses: at scrollY 724 the portal is at y=-619 (happy-place) and y=-568 (coppersmith), `verticalState` = scrolled-away-above. The static smid screenshots show no portal anywhere in the viewport. The static portal scrolls away with the page; the sticky portal stays reachable. This matches Nolan's expectation.

## Narrow-collapse verification (390x844)

Both businesses: portalBox null, railSide none, pingHostPresent false, dialogCount 0, fixedBottomCount 0. No rail and no bottom portal rendered; the rail collapses cleanly at phone width. Minor visual note: the fallback "N" launcher circle sits bottom-left and slightly touches the edge of the first service card in the narrow screenshots. It is not a fixed bottom bar (fixedBottomCount=0) and no overlap metric was recorded for it.

## Engaged-in-rail measurements (1440x900, auto)

All four rows (both businesses, static and sticky): overlapPx = 0, hOverflowPx = 0. The engaged panel is 512x512 at (936,-8):

- panelContentOverlapPx = 0 (harness metric, measured against the `#rail-content` element, not the main page column; see unverified section)
- panelWiderThanRail = true (512px panel vs 120px rail width)
- panelClippedByViewport = true (panel right edge at 1448 > 1440, top edge at -8 < 0; 8px clipped on each of those sides)

Visually the engaged panel is a large circular overlay covering the right portion of the hero area. It does not cover the headline text in these fixtures.

## Default-rule recommendation

**Right rail for both businesses.**

Grounded in the shots and numbers: at 1440x900 and 1920x1080 the auto rule resolves right for both businesses with zero invariant violations, and the right-side screenshots show the portal circle sitting cleanly in the empty rail gutter (rightFree 120px at 1440, 360px at 1920). Right free space exceeds left free space at every viewport where a rail fits (16 vs 120 at 1440; 256 vs 360 at 1920). At 1280x800 the rule correctly collapses to no rail because neither side fits: forced-right overflows 12px (measured violation), forced-left clips 12px off-viewport (visible in the shots). Left is never the better pick in this matrix.

## Full measurements table

50 rows. Two sticky-scroll s0 rows are deduped captures shared with the auto-sticky s0 rows (noted in the shot column).

| id | business | viewport | side param | resolved | mode | scroll | contentW | leftFree | rightFree | overlapPx | hOverflowPx | portalBox | shot |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| core-01 | happy-place | 1280x800 | left | left | static | s0 | 1200 | 0 | 40 | 0 | 0 | 64x64@-12,105 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1280x800/left-static-s0.png) |
| core-02 | happy-place | 1280x800 | left | left | sticky | s0 | 1200 | 0 | 40 | 0 | 0 | 64x64@-12,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1280x800/left-sticky-s0.png) |
| core-03 | happy-place | 1280x800 | right | right | static | s0 | 1200 | 0 | 40 | 0 | 12 | 64x64@1228,105 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1280x800/right-static-s0.png) |
| core-04 | happy-place | 1280x800 | right | right | sticky | s0 | 1200 | 0 | 40 | 0 | 12 | 64x64@1228,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1280x800/right-sticky-s0.png) |
| core-05 | happy-place | 1440x900 | left | left | static | s0 | 1200 | 16 | 120 | 0 | 0 | 64x64@28,105 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1440x900/left-static-s0.png) |
| core-06 | happy-place | 1440x900 | left | left | sticky | s0 | 1200 | 16 | 120 | 0 | 0 | 64x64@28,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1440x900/left-sticky-s0.png) |
| core-07 | happy-place | 1440x900 | right | right | static | s0 | 1200 | 16 | 120 | 0 | 0 | 64x64@1348,105 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1440x900/right-static-s0.png) |
| core-08 | happy-place | 1440x900 | right | right | sticky | s0 | 1200 | 16 | 120 | 0 | 0 | 64x64@1348,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1440x900/right-sticky-s0.png) |
| core-09 | happy-place | 1920x1080 | left | left | static | s0 | 1200 | 256 | 360 | 0 | 0 | 64x64@148,105 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1920x1080/left-static-s0.png) |
| core-10 | happy-place | 1920x1080 | left | left | sticky | s0 | 1200 | 256 | 360 | 0 | 0 | 64x64@148,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1920x1080/left-sticky-s0.png) |
| core-11 | happy-place | 1920x1080 | right | right | static | s0 | 1200 | 256 | 360 | 0 | 0 | 64x64@1708,105 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1920x1080/right-static-s0.png) |
| core-12 | happy-place | 1920x1080 | right | right | sticky | s0 | 1200 | 256 | 360 | 0 | 0 | 64x64@1708,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1920x1080/right-sticky-s0.png) |
| core-13 | coppersmith-plumbing | 1280x800 | left | left | static | s0 | 1200 | 0 | 40 | 0 | 0 | 64x64@-12,105 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1280x800/left-static-s0.png) |
| core-14 | coppersmith-plumbing | 1280x800 | left | left | sticky | s0 | 1200 | 0 | 40 | 0 | 0 | 64x64@-12,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1280x800/left-sticky-s0.png) |
| core-15 | coppersmith-plumbing | 1280x800 | right | right | static | s0 | 1200 | 0 | 40 | 0 | 12 | 64x64@1228,105 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1280x800/right-static-s0.png) |
| core-16 | coppersmith-plumbing | 1280x800 | right | right | sticky | s0 | 1200 | 0 | 40 | 0 | 12 | 64x64@1228,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1280x800/right-sticky-s0.png) |
| core-17 | coppersmith-plumbing | 1440x900 | left | left | static | s0 | 1200 | 16 | 120 | 0 | 0 | 64x64@28,105 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1440x900/left-static-s0.png) |
| core-18 | coppersmith-plumbing | 1440x900 | left | left | sticky | s0 | 1200 | 16 | 120 | 0 | 0 | 64x64@28,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1440x900/left-sticky-s0.png) |
| core-19 | coppersmith-plumbing | 1440x900 | right | right | static | s0 | 1200 | 16 | 120 | 0 | 0 | 64x64@1348,105 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1440x900/right-static-s0.png) |
| core-20 | coppersmith-plumbing | 1440x900 | right | right | sticky | s0 | 1200 | 16 | 120 | 0 | 0 | 64x64@1348,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1440x900/right-sticky-s0.png) |
| core-21 | coppersmith-plumbing | 1920x1080 | left | left | static | s0 | 1200 | 256 | 360 | 0 | 0 | 64x64@148,105 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1920x1080/left-static-s0.png) |
| core-22 | coppersmith-plumbing | 1920x1080 | left | left | sticky | s0 | 1200 | 256 | 360 | 0 | 0 | 64x64@148,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1920x1080/left-sticky-s0.png) |
| core-23 | coppersmith-plumbing | 1920x1080 | right | right | static | s0 | 1200 | 256 | 360 | 0 | 0 | 64x64@1708,105 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1920x1080/right-static-s0.png) |
| core-24 | coppersmith-plumbing | 1920x1080 | right | right | sticky | s0 | 1200 | 256 | 360 | 0 | 0 | 64x64@1708,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1920x1080/right-sticky-s0.png) |
| auto-hp-1280x800-static | happy-place | 1280x800 | auto | none | static | s0 | 1200 | 0 | 40 | 0 | 0 | null | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1280x800/auto-static-s0.png) |
| auto-hp-1280x800-sticky | happy-place | 1280x800 | auto | none | sticky | s0 | 1200 | 0 | 40 | 0 | 0 | null | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1280x800/auto-sticky-s0.png) |
| auto-hp-1440x900-static | happy-place | 1440x900 | auto | right | static | s0 | 1200 | 16 | 120 | 0 | 0 | 64x64@1348,105 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1440x900/auto-static-s0.png) |
| auto-hp-1440x900-sticky | happy-place | 1440x900 | auto | right | sticky | s0 | 1200 | 16 | 120 | 0 | 0 | 64x64@1348,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1440x900/auto-sticky-s0.png) |
| auto-hp-1920x1080-static | happy-place | 1920x1080 | auto | right | static | s0 | 1200 | 256 | 360 | 0 | 0 | 64x64@1708,105 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1920x1080/auto-static-s0.png) |
| auto-hp-1920x1080-sticky | happy-place | 1920x1080 | auto | right | sticky | s0 | 1200 | 256 | 360 | 0 | 0 | 64x64@1708,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1920x1080/auto-sticky-s0.png) |
| auto-cs-1280x800-static | coppersmith-plumbing | 1280x800 | auto | none | static | s0 | 1200 | 0 | 40 | 0 | 0 | null | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1280x800/auto-static-s0.png) |
| auto-cs-1280x800-sticky | coppersmith-plumbing | 1280x800 | auto | none | sticky | s0 | 1200 | 0 | 40 | 0 | 0 | null | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1280x800/auto-sticky-s0.png) |
| auto-cs-1440x900-static | coppersmith-plumbing | 1440x900 | auto | right | static | s0 | 1200 | 16 | 120 | 0 | 0 | 64x64@1348,105 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1440x900/auto-static-s0.png) |
| auto-cs-1440x900-sticky | coppersmith-plumbing | 1440x900 | auto | right | sticky | s0 | 1200 | 16 | 120 | 0 | 0 | 64x64@1348,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1440x900/auto-sticky-s0.png) |
| auto-cs-1920x1080-static | coppersmith-plumbing | 1920x1080 | auto | right | static | s0 | 1200 | 256 | 360 | 0 | 0 | 64x64@1708,105 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1920x1080/auto-static-s0.png) |
| auto-cs-1920x1080-sticky | coppersmith-plumbing | 1920x1080 | auto | right | sticky | s0 | 1200 | 256 | 360 | 0 | 0 | 64x64@1708,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1920x1080/auto-sticky-s0.png) |
| engaged-hp-static | happy-place | 1440x900 | auto | right | static | engaged | 1200 | 16 | 120 | 0 | 0 | 64x64@1348,105 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1440x900/auto-static-engaged.png) |
| engaged-hp-sticky | happy-place | 1440x900 | auto | right | sticky | engaged | 1200 | 16 | 120 | 0 | 0 | 64x64@1348,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1440x900/auto-sticky-engaged.png) |
| engaged-cs-static | coppersmith-plumbing | 1440x900 | auto | right | static | engaged | 1200 | 16 | 120 | 0 | 0 | 64x64@1348,105 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1440x900/auto-static-engaged.png) |
| engaged-cs-sticky | coppersmith-plumbing | 1440x900 | auto | right | sticky | engaged | 1200 | 16 | 120 | 0 | 0 | 64x64@1348,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1440x900/auto-sticky-engaged.png) |
| sticky-scroll-hp-s0 | happy-place | 1440x900 | auto | right | sticky | s0 | 1200 | 16 | 120 | 0 | 0 | 64x64@1348,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1440x900/auto-sticky-s0.png) |
| sticky-scroll-hp-smid | happy-place | 1440x900 | auto | right | sticky | smid | 1200 | 0 | 120 | 0 | 0 | 64x64@1348,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1440x900/auto-sticky-smid.png) |
| sticky-scroll-hp-sbottom | happy-place | 1440x900 | auto | right | sticky | sbottom | 1200 | 0 | 120 | 0 | 0 | 64x64@1348,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1440x900/auto-sticky-sbottom.png) |
| sticky-scroll-cs-s0 | coppersmith-plumbing | 1440x900 | auto | right | sticky | s0 | 1200 | 16 | 120 | 0 | 0 | 64x64@1348,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1440x900/auto-sticky-s0.png) |
| sticky-scroll-cs-smid | coppersmith-plumbing | 1440x900 | auto | right | sticky | smid | 1200 | 0 | 120 | 0 | 0 | 64x64@1348,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1440x900/auto-sticky-smid.png) |
| sticky-scroll-cs-sbottom | coppersmith-plumbing | 1440x900 | auto | right | sticky | sbottom | 1200 | 0 | 120 | 0 | 0 | 64x64@1348,96 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1440x900/auto-sticky-sbottom.png) |
| static-scroll-hp-smid | happy-place | 1440x900 | auto | right | static | smid | 1200 | 0 | 120 | 0 | 0 | 64x64@1348,-619 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/1440x900/auto-static-smid.png) |
| static-scroll-cs-smid | coppersmith-plumbing | 1440x900 | auto | right | static | smid | 1200 | 0 | 120 | 0 | 0 | 64x64@1348,-568 | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/1440x900/auto-static-smid.png) |
| narrow-hp | happy-place | 390x844 | auto | none | sticky | s0 | 390 | 0 | 0 | 0 | 0 | null | [png](sandbox://workspace/fyd-portal-proof/shots-rail/happy-place/390x844/auto-sticky-s0.png) |
| narrow-cs | coppersmith-plumbing | 390x844 | auto | none | sticky | s0 | 390 | 0 | 0 | 0 | 0 | null | [png](sandbox://workspace/fyd-portal-proof/shots-rail/coppersmith-plumbing/390x844/auto-sticky-s0.png) |

## HONEST UNVERIFIED

- panelContentOverlapPx = 0 is only as strong as its selector. The harness measured panel-vs-`#rail-content` (the rail slot element), not panel-vs-main-content-column. The engaged screenshots show the 512px panel covering the right hero background area. Whether the panel overlaps main content chrome is unverified by these numbers.
- The fallback "N" launcher circle shown at side=none viewports (1280x800 auto, 390x844) has no overlap or placement metrics; its slight touch of the service card edge at 390px is a visual observation from two screenshots, not a measured invariant.
- The two deduped rows (sticky-scroll s0) were not captured independently; they reuse the auto-sticky s0 PNGs by design (identical URL, viewport, and actions).
- The capture process (PID 84650) was still alive in teardown after writing the manifest at 12:33 MDT; all 48 PNGs and the manifest were verified complete and valid, so this did not affect the data.
- Findings are for the two fixture businesses and the three tested desktop widths plus one phone width. Other businesses, widths, and real (non-fixture) page layouts were not captured.
