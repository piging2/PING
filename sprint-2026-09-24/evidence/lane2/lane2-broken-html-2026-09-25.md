# LANE 2 — Broken HTML on Nolan's surface — 2026-09-25 ~06:35-06:50 MDT

Worker: browser-verification wave, Lane 2. Pig reached via `ssh -F ~/.ssh/pig-config` nolan route
(nolan@100.79.154.43 through hatch-egress-proxy:3130; the documented muse-ssh route was not used
per coordinator correction). The always-on headed Chrome (CDP :9223, profile nolanpigi) was never
touched: all browser work ran in a separate headless Chrome with a fresh profile
(`C:\Users\nolan\lane2-chrome`, since removed).

## Surfaces

- **:3100 = PRIMARY PATIENT.** Nolan's actual Tailscale surface (`http://100.79.154.43:3100` via
  netsh portproxy). Served by WSL `next-server (v15.5.24)` **PID 10404**, cwd
  `/home/nolan/projects/ping`, branch `fyd/sprint-integration-2026-09-24` at `28e4ba00`.
  **Status: red** (renders as unstyled HTML).
- :3101 = SECONDARY. Pig-localhost only (`[::1]:3101` via wslrelay, NOT reachable over Tailscale).
  Served by `next-server` **PID 62734** (started 05:40 today), cwd `/home/nolan/build-edge-port`,
  detached HEAD `8faf96d0`. **Status: green** (fully styled, verified in real browser).
- :3102: 200, untouched, out of scope.

## Classification (single, real-browser only): **stale .next**

Not malformed document (HTML is well-formed, 194KB, title
"PING: Continuity infrastructure for AI agents"). Not wrong artifact, not base-path, not
hydration failure (JS-disabled screenshot is pixel-identical to JS-enabled — no client JS runs at
all because the runtime chunk 404s). The asset 404s are the proximate symptom; the first broken
boundary is the stale build directory under the running process.

## First broken boundary

`/home/nolan/projects/ping/.next` was **rebuilt/replaced at 2026-09-24 19:24:18 MDT underneath
the running :3100 server**.

| Event | Time (MDT) |
|---|---|
| `.next.pre-purehead-20260924` build dir created (backup of earlier build) | Sep 24 16:59 |
| :3100 `next-server` PID 10404 started (loads build manifest into memory) | Sep 24 18:59:56 |
| `.next.integration-build-20260924` build dir created | Sep 24 19:09 |
| Current `.next/BUILD_ID` written (`DzgiCMfZMcbU_YLytD277`) — .next replaced | Sep 24 19:24:18 |

The running server still serves the 18:59 build's HTML manifest, which references hashed assets
that no longer exist on disk (the old build's static output is gone — `find` over both stray
`.next*` dirs returns nothing for the missing files).

Browser-captured references (from the real rendered DOM, `dom-3100.html`) vs :3100 status:

| Referenced asset | :3100 status | On disk (current .next) |
|---|---|---|
| `/_next/static/css/67bea96c31455aff.css` | **404** | absent (disk has 45393bd6/49f45562/6e7b4dfc/ef491f3d) |
| `/_next/static/css/6e7b4dfc4271dafa.css` | 200, but **content is @font-face declarations only** (11KB, zero rules) | present |
| `/_next/static/chunks/webpack-7d553bcc58f896fe.js` | **404** | absent (disk has webpack-c348787e843e1466.js) |
| `/_next/static/chunks/app/layout-00b73aed229ce0bc.js` | **404** | absent |
| `/_next/static/chunks/app/page-87055bfff1e9705b.js` | **404** | absent |
| `/_next/static/chunks/main-app-76d394a2c25f3b3e.js` | **404** | absent |

Full sweep of :3100's served HTML: 23 static refs, **13 x 200, 10 x 404**. The page looks
*completely* unstyled (not partially) because the only stylesheet that loads carries no rules.

## Browser proof (all on the Pig, fresh headless Chromium)

- `shot-3100-1440.png` — desktop 1440x900, JS on: unstyled HTML (blue links, serif, no layout).
- `shot-3100-390.png` — mobile 390x844, JS on: unstyled, same.
- `shot-3100-nojs.png` — desktop, `--disable-javascript`: byte-identical render to JS-on.
  Proves the failure is not hydration/JS — it is missing CSS at the network level.
- `dom-3100.html` — rendered DOM dump (193,874 bytes); references the 404ing assets above.
- `console-3100.log` — zero page console errors / page errors (only a Chrome policy INFO line;
  expected: no page JS executes since the webpack runtime 404s).
- `shot-3101-1440.png` — :3101 desktop: FULLY STYLED, dark theme, gold accents, nav, hero
  "Systems that remember, agents you can trust", evidence cards. Inspected: green.
- `raw-3101-before.html` — raw :3101 HTML (first fetch; mislabeled during the run, renamed).
- Every capture used a cold load with a fresh profile (stronger than a hard reload); the house
  :9223 browser was never touched.

## Minimal fix (NOT executed — :3100 is read-only for this lane)

Restart :3100 **only** via the sanctioned `/home/nolan/start-3100.sh` (setsid detach, exports
`NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1`, health-checks `/sites/happy-place`). The current `.next`
is a COMPLETE build (BUILD_ID, build-manifest.json, app-build-manifest.json, 4 CSS, 26 chunks,
webpack chunk, 15 media, server/app/page.js all present), so a restart serves self-consistent
HTML+assets. After restart, verify `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` in the process env
(it is currently present on the stale process; the script exports it). Do NOT hand-copy old
assets into `.next`, do NOT `pkill -f next-server` (would hit :3101/:3102), do NOT touch :3102.

## Proof matrix

| Leg | Result |
|---|---|
| Hard reload / cold load | green (fresh profile every run, no cache) |
| Fresh browser context | green (own `--user-data-dir`, house browser untouched) |
| JS enabled, desktop 1440 | **red** — unstyled |
| JS enabled, mobile 390 | **red** — unstyled |
| JS disabled, desktop 1440 | **red** — identical render (rules out hydration failure) |
| Real-browser console/page errors | green (none) |
| :3101 secondary surface | **green** — fully styled, all referenced assets 200 |
| Restart + re-verify :3100 | **waiting** — needs coordinator/Nolan: run `/home/nolan/start-3100.sh`, then re-screenshot |
| Same reproducible artifact | green — all files in this directory |

## Q-J-01 note

Browser proof corroborates that Q-J-01's edge restoration is visible on the real :3101 surface:
the edge worktree build (`8faf96d0`) serves a fully styled page with all assets 200 and zero
console errors. A status record is appended to `WORK-QUEUE.jsonl`. (Caveat: :3101 is
Pig-localhost-only, so Nolan cannot see it; his broken surface is :3100.)

## Changes made

**None** to code, config, builds, or processes. Read-only probing only. Temp artifacts created on
the Pig (`C:\Users\nolan\lane2\*`, `C:\Users\nolan\lane2-chrome`) were removed after the screenshots
were pulled. No restarts, no file edits, no credential actions, no :3102 contact.
