# FYD Portal Circle: Proof Matrix (Portal Lane C)

Run date: 2026-09-21. All measurements taken on the Pig against the local
Next.js dev server at `http://localhost:3100/` (Next 15.5.24, branch
`fyd/sitespec-generator`).

- Browser: headless Chromium 153.0.8010.12 via Playwright 1.63.0
- `LD_LIBRARY_PATH=~/browser-libs/usr/lib/x86_64-linux-gnu` (Pig WSL lacks
  browser system libs; see FAILURE_LEDGER FL-20260921-215)
- Harness: `portal-proof/` in the repo (committed locally, see bottom)

## Coverage statement

This proof covers the FYD portal Circle UI on the homepage (`<PortalHost>`
with two business portals) as rendered by headless Chromium:

- 2 businesses: Happy Place Carpentry LLC, Coppersmith Plumbing - HVAC - Mechanical
- 7 viewport configurations: 1920x1080, 1440x900, 1280x800, 834x1112,
  390x844, 1440x900-zoom150 (960x600 CSS px at deviceScaleFactor 1.5, which
  is what 150% browser zoom renders at 1440x900 device px),
  1440x900-reduced-motion (`prefers-reduced-motion: reduce` emulated)
- 6 states at 1440x900 for both businesses: collapsed, aware (hover),
  engaged, ask, following, liked
- collapsed + engaged at every other viewport; plus narrow-fallback at 390x844
- Total: 38 screenshots, all captured, all valid PNGs, none empty
- Performance: 8 probes, 5 iterations each at 1440x900, medians reported

What this proves: the circle renders and engages at every tested viewport;
the dock pill appears at 1440x900 and below; peripheral band slots are used
at 1920x1080; Ask FYD returns the evidence-bounded refusal; Follow and Like
persist through their API round trips; engagement settles without long tasks
at a steady 60 fps in headless Chromium; host-page scroll releases
engagement. See Findings for one behavior that does NOT match the code's
stated intent (resize while engaged).

## Placement observed (probe-slots.mjs)

`data-ping-host` marks both slotted wrappers and the dock pill, so placement
was probed with `[data-ping-host]:not([data-ping-slot])` for the dock:

- 1920x1080: Happy Place in `slot:band-right` (x=1728), Coppersmith in
  `slot:band-left` (x=128). No dock pill. Collapsed circles are 64x64.
- 1440x900, 1280x800, 834x1112, 390x844, zoom150, reduced-motion: both
  circles in the bottom-center dock pill. No band slots used.

## Screenshot matrix

"Engaged Ø" is the engaged dialog diameter in px recorded at capture time
(`null` for collapsed/aware). Placement: `slot` or `dock`.

### Happy Place Carpentry LLC

| Viewport | State | Placement | Engaged Ø | Screenshot |
|---|---|---|---|---|
| 1920x1080 | collapsed | slot | null | [collapsed](sandbox://workspace/fyd-portal-proof/shots/happy-place/1920x1080/collapsed.png) |
| 1920x1080 | engaged | slot | 234 | [engaged](sandbox://workspace/fyd-portal-proof/shots/happy-place/1920x1080/engaged.png) |
| 1440x900 | collapsed | dock | null | [collapsed](sandbox://workspace/fyd-portal-proof/shots/happy-place/1440x900/collapsed.png) |
| 1440x900 | aware | dock | null | [aware](sandbox://workspace/fyd-portal-proof/shots/happy-place/1440x900/aware.png) |
| 1440x900 | engaged | dock | 340 | [engaged](sandbox://workspace/fyd-portal-proof/shots/happy-place/1440x900/engaged.png) |
| 1440x900 | ask | dock | 340 | [ask](sandbox://workspace/fyd-portal-proof/shots/happy-place/1440x900/ask.png) |
| 1440x900 | following | dock | 340 | [following](sandbox://workspace/fyd-portal-proof/shots/happy-place/1440x900/following.png) |
| 1440x900 | liked | dock | 340 | [liked](sandbox://workspace/fyd-portal-proof/shots/happy-place/1440x900/liked.png) |
| 1280x800 | collapsed | dock | null | [collapsed](sandbox://workspace/fyd-portal-proof/shots/happy-place/1280x800/collapsed.png) |
| 1280x800 | engaged | dock | 340 | [engaged](sandbox://workspace/fyd-portal-proof/shots/happy-place/1280x800/engaged.png) |
| 834x1112 | collapsed | dock | null | [collapsed](sandbox://workspace/fyd-portal-proof/shots/happy-place/834x1112/collapsed.png) |
| 834x1112 | engaged | dock | 340 | [engaged](sandbox://workspace/fyd-portal-proof/shots/happy-place/834x1112/engaged.png) |
| 390x844 | collapsed | dock | null | [collapsed](sandbox://workspace/fyd-portal-proof/shots/happy-place/390x844/collapsed.png) |
| 390x844 | engaged | dock | 240 | [engaged](sandbox://workspace/fyd-portal-proof/shots/happy-place/390x844/engaged.png) |
| 390x844 | narrow-fallback | dock | null | [narrow-fallback](sandbox://workspace/fyd-portal-proof/shots/happy-place/390x844/narrow-fallback.png) |
| 1440x900-zoom150 | collapsed | dock | null | [collapsed](sandbox://workspace/fyd-portal-proof/shots/happy-place/1440x900-zoom150/collapsed.png) |
| 1440x900-zoom150 | engaged | dock | 340 | [engaged](sandbox://workspace/fyd-portal-proof/shots/happy-place/1440x900-zoom150/engaged.png) |
| 1440x900-reduced-motion | collapsed | dock | null | [collapsed](sandbox://workspace/fyd-portal-proof/shots/happy-place/1440x900-reduced-motion/collapsed.png) |
| 1440x900-reduced-motion | engaged | dock | 340 | [engaged](sandbox://workspace/fyd-portal-proof/shots/happy-place/1440x900-reduced-motion/engaged.png) |

### Coppersmith Plumbing - HVAC - Mechanical

| Viewport | State | Placement | Engaged Ø | Screenshot |
|---|---|---|---|---|
| 1920x1080 | collapsed | slot | null | [collapsed](sandbox://workspace/fyd-portal-proof/shots/coppersmith-plumbing/1920x1080/collapsed.png) |
| 1920x1080 | engaged | slot | 234 | [engaged](sandbox://workspace/fyd-portal-proof/shots/coppersmith-plumbing/1920x1080/engaged.png) |
| 1440x900 | collapsed | dock | null | [collapsed](sandbox://workspace/fyd-portal-proof/shots/coppersmith-plumbing/1440x900/collapsed.png) |
| 1440x900 | aware | dock | null | [aware](sandbox://workspace/fyd-portal-proof/shots/coppersmith-plumbing/1440x900/aware.png) |
| 1440x900 | engaged | dock | 340 | [engaged](sandbox://workspace/fyd-portal-proof/shots/coppersmith-plumbing/1440x900/engaged.png) |
| 1440x900 | ask | dock | 340 | [ask](sandbox://workspace/fyd-portal-proof/shots/coppersmith-plumbing/1440x900/ask.png) |
| 1440x900 | following | dock | 340 | [following](sandbox://workspace/fyd-portal-proof/shots/coppersmith-plumbing/1440x900/following.png) |
| 1440x900 | liked | dock | 340 | [liked](sandbox://workspace/fyd-portal-proof/shots/coppersmith-plumbing/1440x900/liked.png) |
| 1280x800 | collapsed | dock | null | [collapsed](sandbox://workspace/fyd-portal-proof/shots/coppersmith-plumbing/1280x800/collapsed.png) |
| 1280x800 | engaged | dock | 340 | [engaged](sandbox://workspace/fyd-portal-proof/shots/coppersmith-plumbing/1280x800/engaged.png) |
| 834x1112 | collapsed | dock | null | [collapsed](sandbox://workspace/fyd-portal-proof/shots/coppersmith-plumbing/834x1112/collapsed.png) |
| 834x1112 | engaged | dock | 340 | [engaged](sandbox://workspace/fyd-portal-proof/shots/coppersmith-plumbing/834x1112/engaged.png) |
| 390x844 | collapsed | dock | null | [collapsed](sandbox://workspace/fyd-portal-proof/shots/coppersmith-plumbing/390x844/collapsed.png) |
| 390x844 | engaged | dock | 240 | [engaged](sandbox://workspace/fyd-portal-proof/shots/coppersmith-plumbing/390x844/engaged.png) |
| 390x844 | narrow-fallback | dock | null | [narrow-fallback](sandbox://workspace/fyd-portal-proof/shots/coppersmith-plumbing/390x844/narrow-fallback.png) |
| 1440x900-zoom150 | collapsed | dock | null | [collapsed](sandbox://workspace/fyd-portal-proof/shots/coppersmith-plumbing/1440x900-zoom150/collapsed.png) |
| 1440x900-zoom150 | engaged | dock | 340 | [engaged](sandbox://workspace/fyd-portal-proof/shots/coppersmith-plumbing/1440x900-zoom150/engaged.png) |
| 1440x900-reduced-motion | collapsed | dock | null | [collapsed](sandbox://workspace/fyd-portal-proof/shots/coppersmith-plumbing/1440x900-reduced-motion/collapsed.png) |
| 1440x900-reduced-motion | engaged | dock | 340 | [engaged](sandbox://workspace/fyd-portal-proof/shots/coppersmith-plumbing/1440x900-reduced-motion/engaged.png) |

State notes (recorded in `shots/manifest.json`):

- ask: submitted "What services do you offer?" for both businesses; the API
  returned the evidence-bounded refusal (`ok:true, refusal:true`), and the UI
  shows "I do not have evidence for that yet." with "No evidence found,
  nothing invented". The ask screenshots prove the refusal path, not a
  successful answer.
- following: clicked Follow, reached the Following state (tooltip + filled
  icon visible in the screenshots). Both businesses were unfollowed before
  the run, so the toggle was exercised fresh.
- liked: clicked Like, reached the Liked state. Same freshness as follow.
- narrow-fallback: the harness scrolled the host page (y=600) while engaged;
  scrolling releases engagement by design, so these shots show the collapsed
  dock pill after scroll-release at 390x844. They prove the dock fallback,
  not an engaged narrow state.
- aware: hover rim highlight on the collapsed circle (subtle; the manifest
  records the hover was performed).

Methodology correction: the first version of the harness probed dock
activity with `[data-ping-host]`, which also matches slotted circle
wrappers. Placement was re-probed with `probe-slots.mjs` using
`[data-ping-host]:not([data-ping-slot])`, and `manifest.json` was patched
with the corrected values (the patch is recorded in the manifest notes).

## Performance (1440x900, median of 5 runs)

Raw data: [perf-results.json](sandbox://workspace/fyd-portal-proof/perf-results.json).
Each probe ran 5 iterations on a fresh page; medians below. All timings are
rAF-timestamp based in headless Chromium on the Pig.

| Probe | Median | All 5 runs | What it measures |
|---|---|---|---|
| rest_to_engaged | 509 ms | 496, 507, 509, 511, 512 | click to animation settle (engaged diameter stable <0.75px for 6 frames) |
| engaged_to_rest | 230 ms | 229, 230, 230, 230, 230 | Close click to collapsed button restored (dialog gone, opacity 1, stable 6 frames) |
| scroll_release_while_engaged | 195 ms | 186, 195, 198, 201, 210 | host scroll to dialog fully unmounted; release trigger itself is synchronous, the 195 ms is the exit animation |
| target_out_of_viewport | FAILED | n/a | probe could not run: the homepage has no `[data-ping-object]` elements |
| resize_while_engaged | NOT RELEASED | 0/5 released | 1440x900 to 1280x800 while engaged; dialog still open after 3 s in all 5 runs (see Findings) |
| longtask_during_engage | 0 long tasks | 0, 0, 0, 0, 0 | PerformanceObserver longtasks during engage + 2.5 s window; total 0 ms, max 0 ms every run |
| frame_timing_during_engage | 60 fps | 60 fps every run | rAF deltas during engage: median frame 16.7 ms, 0 dropped frames, 0 frames over 50 ms, 30 frames sampled per run |
| paint_entries_on_load | FP 140 ms, FCP 140 ms | single recorded sample | `performance.getEntriesByType('paint')` on fresh load; the harness stored one iteration, so this is a sample, not a median |

Notes:

- Forced synchronous reflow counts are not observable through standard web
  APIs. Longtask entries are reported as the proxy; all five engage runs
  had zero long tasks, so there is no main-thread jank signal from the
  engage transition in this environment.
- fps numbers describe the headless Chromium compositor pipeline on the
  Pig, not a physical display. A steady 60 fps with zero dropped frames
  across all runs is still evidence the engage animation is cheap.
- rest_to_engaged (509 ms) is the full spring settle to a stable diameter,
  not the time to first visible change. engaged_to_rest (230 ms) is
  strikingly consistent (within 1 ms across runs).

## Findings

### 1. Resize while engaged does NOT release (contradicts code comment)

`src/fyd/ui/portal-circle.tsx` says: "Resize while engaged: the slot
geometry changed, so release rather than sit on stale measurements." The
implementation debounces the window resize event by 200 ms, then calls
`onRelease`.

Observed: in all 5 perf runs plus 2 dedicated debug runs, resizing
1440x900 to 1280x800 while engaged left the dialog open 3.5 s later.
The window `resize` event fires (1 event observed in-page). The slot
manager does recompute on resize: the other (collapsed) circle moved from
x=728 to x=648, re-centering the dock at the new viewport width.

Likely mechanism: the resize effect in `portal-circle.tsx` lists the whole
`props` object in its dependency array, so the effect (and its cleanup,
which calls `clearTimeout` on the pending 200 ms release timer) re-runs on
every render. The resize-triggered slot recompute re-renders within the
200 ms debounce window, cancelling the release before it fires. This is a
diagnosis from code reading plus the two observed facts above, not a
line-by-line trace; the behavioral finding (no release, 7/7 trials) is
verified.

Impact: after a viewport resize, an engaged circle keeps the geometry it
computed for the old viewport until the user closes it or scrolls. This
lane does not fix code; the fix belongs to whoever owns the portal work.

### 2. Semantic-target probe could not run on this page

The `target_out_of_viewport` probe assumed the demo page renders
`[data-ping-object]` semantic targets. It renders none
(`document.querySelectorAll('[data-ping-object]').count() === 0`), so all
5 iterations recorded `target-not-found`. The "semantic target leaves the
viewport while engaged" behavior is untested, not passing. It needs a demo
page that actually renders semantic targets.

### 3. Placement boundary is between 1440 and 1920 px wide

At 1920x1080 both circles sit in peripheral band slots; at 1440x900 and
every narrower tested viewport they fall back to the bottom-center dock
pill. Whether the dock fallback at 1440x900 is intended design or a slot
scoring outcome is a product question; the proof records what renders.

## UNVERIFIED

These were not proven by this run and should not be claimed:

- Physical-display and high-refresh behavior: all rendering ran in
  headless Chromium. The 60 fps figure is the headless compositor clock,
  not a measured display vsync.
- Real browser UI zoom: the zoom150 configuration uses
  deviceScaleFactor 1.5 at 960x600 CSS px, which matches what 150% browser
  zoom renders at 1440x900 device px, but it is a simulation, not the
  browser's own zoom control.
- True composite-thread/GPU behavior: headless Chromium's compositing
  path differs from headed GPU compositing; paint and frame numbers may
  not transfer.
- Forced synchronous reflow attribution: only aggregate longtask counts
  were measured (zero in all runs). A forced reflow cannot be uniquely
  identified from these counters without additional tracing.
- Semantic-target release behavior: untested (Finding 2).
- The resize-release mechanism (Finding 1) is diagnosed from code reading
  plus observed facts, not from an instrumented trace of the timer
  cancellation.
- Touch interaction, keyboard-only interaction, and screen-reader
  behavior were not exercised.
- Follow/Like persistence beyond the session: the toggles completed their
  API round trips in this run; cross-session durability was not tested.

## Harness and raw data

- Harness (committed locally in the repo, `portal-proof/`):
  `capture-matrix.mjs`, `measure-perf.mjs`, `probe-slots.mjs`,
  `verify-launch.mjs`, `debug-resize.mjs`, `debug-resize2.mjs`, `README.md`
- [shots/manifest.json](sandbox://workspace/fyd-portal-proof/shots/manifest.json):
  per-shot dock/placement state, engaged diameters, notes, and the slot
  probe results
- [slots-probe.json](sandbox://workspace/fyd-portal-proof/slots-probe.json):
  raw per-viewport placement probe
- [perf-results.json](sandbox://workspace/fyd-portal-proof/perf-results.json):
  full 8-probe, 5-iteration results

Repro: on the Pig, in `/home/nolan/projects/ping`,
`LD_LIBRARY_PATH=~/browser-libs/usr/lib/x86_64-linux-gnu
PORTAL_BASE=http://localhost:3100/ node portal-proof/capture-matrix.mjs`
writes `/tmp/portal-proof/shots/`; `node portal-proof/measure-perf.mjs`
writes `/tmp/portal-proof/perf-results.json`. See `portal-proof/README.md`.
