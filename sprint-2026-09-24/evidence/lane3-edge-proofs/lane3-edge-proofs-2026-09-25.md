# LANE 3 — EDGE PROOFS: desktop extreme-right FYD objects + mobile extreme-right overlay

**When:** 2026-09-25 ~06:35-06:38 MDT. **Where:** http://localhost:3101/sites/happy-place (the FYD demo surface, `:3101` serving HTTP 200).
**Served code (verified 06:38 MDT via pigwsl):** `:3101` is Pig-localhost-only, served from worktree `/home/nolan/build-edge-port` at detached HEAD **8faf96d0** ("Q-J-07: accept owner NL 'move X first' as promote_first"), **5 commits ahead of 28e4ba00** (Nolan's actual Tailscale surface :3100 runs 28e4ba00 exactly). The edge layer under test shipped in a75c6784 ("restore page-level margin/edge object layer"), an ancestor of this HEAD. Edge proofs ran against the Pig-local browser as instructed; the served commit is newer than the :3100 surface.
**How:** Fresh headless Chromium on the Pig (own instance, own user-data-dir, CDP on :9224), NOT the house headed Chrome on CDP :9223 / profile nolanpigi, which was never touched. Instance and temp dir removed after the run; no restarts performed; :3100/:3102 untouched.

## Per-claim verdicts

| Claim | Verdict | Evidence |
|---|---|---|
| Objects at extreme right, desktop 1440px | **green** | 6 `margin-object` wrappers, each 40x40, x=1376 (right edge at 1416 = 24px from the 1440 viewport edge). Visible in `desktop-full.png` as the purple lettered pills at the extreme right edge. |
| Sparse + contextually anchored | **green** | 6 objects spread y=957..1691 (~140px apart, `desktop-top.json`); each sits next to its related content section (Services cards, locations). |
| Page-anchored (scroll moves objects away, NO viewport-fixed chips) | **green** | CSS `position: absolute` on every `margin-object` wrapper (not `fixed`). After scrolling 1500px, all viewport rects shifted by exactly -1500 (e.g. 957 -> -543), verified numerically in `desktop-scrolled.json`; zero `position:fixed` elements in the whole document (top and scrolled). `desktop-scrolled.png` shows the scrolled-in view with only the newly-adjacent pills. |
| Mobile 390px extreme-right overlay | **green** | 6 `mobile-object-pill` buttons, 44x44px (>=44px touch target), x=340 (right edge 384, 6px from the 390 edge), `position: absolute`, document-anchored. Visible in `mobile-full.png` overlaying the right edge of service cards, each beside its section. |
| Zero horizontal overflow (mobile) | **green** | `document.documentElement.scrollWidth` = 390, `window.innerWidth` = 390. `390 <= 390` holds. Desktop: 1425 <= 1440. |
| Center of page is the normal website | **green** | Both screenshots show the untouched site (hero, services, contact, Ask FYD) with no center chrome added; objects confined to the margin. |

## Measurements

- Desktop top: 6 objects, x=1376, y in {957,1097,1237,1377,1517,1691}, size 40x40, position=absolute; fixed elements=0.
- Desktop scrolled 1500px: same 6 objects at y in {-543,-403,-263,-123,17,191} (delta exactly -1500), position=absolute; fixed elements=0.
- Mobile 390x844: 6 pills, x=340, size 44x44, position=absolute; fixed elements=0; scrollWidth=390, innerWidth=390.
- CSS positioning actually used: `position: absolute` (document-anchored layer); inner trigger buttons `position: relative`. No `position: fixed` anywhere on the page. Matches the corrected 18:47 design (absolute/page-anchored, scroll moves them out of view, no viewport-glued chips).

## Defects

None. No fix attempted, none needed.

## Files

- `desktop-full.png` — full-page desktop 1440px screenshot (proofs extreme-right, sparse, anchored)
- `desktop-scrolled.png` + `desktop-scrolled.json` — 1500px scroll state (proofs page-anchoring)
- `desktop-top.json` — raw DOM measurements, desktop
- `mobile-full.png` + `mobile.json` — mobile 390px screenshot and measurements (overlay, overflow, touch-target size)
