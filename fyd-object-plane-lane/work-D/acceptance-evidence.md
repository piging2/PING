# FYD object-plane lane — acceptance worker D evidence
Date: 2026-09-22. Live dev page http://localhost:3100/ on the Pig, real Chromium
(Playwright 1.63 bundled chromium-1243, headless), repo branch fyd/builder-composition (uncommitted).

## Tooling
- geometry-regression.mjs (pre-existing lane harness, run as documented:
  LD_LIBRARY_PATH=/home/nolan/pwlibs/usr/lib/x86_64-linux-gnu node ./geometry-regression.mjs)
  -> covers protocol checks 3 (center geometry) and 9 (mobile), plus relationship nav.
- work-D/accept-protocol.mjs (custom, covers checks 1,2,4,5,6,7,8,10).
  Note: script lived OUTSIDE the repo at /home/nolan/accept-protocol.mjs during the run
  (repo is read-only for this role); module resolution via a /home/nolan/node_modules
  symlink to the repo's node_modules. Both removed after the run.

## geometry-regression.mjs output (exit 0, ALL GEOMETRY CHECKS PASSED)

--- desktop-wide 1440x900 ---
PASS desktop-wide: layer absent when disabled
PASS desktop-wide: object layer mounted with expected projection
PASS desktop-wide: geometry unchanged [data-object-anchor="happy-place"]
PASS desktop-wide: geometry unchanged [data-object-anchor="coppersmith-plumbing"]
PASS desktop-wide: geometry unchanged h1
PASS desktop-wide: geometry unchanged h2
PASS desktop-wide: no new horizontal overflow
PASS desktop-wide: slots rendered
PASS desktop-wide: two object triggers
PASS desktop-wide: one card after first expand
PASS desktop-wide: expansion does not move content
PASS desktop-wide: still exactly one card after second expand
PASS desktop-wide: second card displaced the first
PASS desktop-wide: content stable after re-expand
PASS desktop-wide: relationship link rendered
PASS desktop-wide: peer jump keeps exactly one card
PASS desktop-wide: peer jump opened the related object

--- desktop-normal 1100x800 ---
PASS desktop-normal: layer absent when disabled
PASS desktop-normal: object layer mounted with expected projection
PASS desktop-normal: geometry unchanged [data-object-anchor="happy-place"]
PASS desktop-normal: geometry unchanged [data-object-anchor="coppersmith-plumbing"]
PASS desktop-normal: geometry unchanged h1
PASS desktop-normal: geometry unchanged h2
PASS desktop-normal: no new horizontal overflow
PASS desktop-normal: slots rendered
PASS desktop-normal: two object triggers
PASS desktop-normal: one card after first expand
PASS desktop-normal: expansion does not move content
PASS desktop-normal: still exactly one card after second expand
PASS desktop-normal: second card displaced the first
PASS desktop-normal: content stable after re-expand
PASS desktop-normal: relationship link rendered
PASS desktop-normal: peer jump keeps exactly one card
PASS desktop-normal: peer jump opened the related object

--- tablet 800x900 ---
PASS tablet: layer absent when disabled
PASS tablet: object layer mounted with expected projection
PASS tablet: geometry unchanged [data-object-anchor="happy-place"]
PASS tablet: geometry unchanged [data-object-anchor="coppersmith-plumbing"]
PASS tablet: geometry unchanged h1
PASS tablet: geometry unchanged h2
PASS tablet: no new horizontal overflow
PASS tablet: slots rendered
PASS tablet: two object triggers
PASS tablet: one card after first expand
PASS tablet: expansion does not move content
PASS tablet: still exactly one card after second expand
PASS tablet: second card displaced the first
PASS tablet: content stable after re-expand
PASS tablet: relationship link rendered
PASS tablet: peer jump keeps exactly one card
PASS tablet: peer jump opened the related object

--- mobile 390x844 ---
PASS mobile: layer absent when disabled
PASS mobile: object layer mounted with expected projection
PASS mobile: geometry unchanged [data-object-anchor="happy-place"]
PASS mobile: geometry unchanged [data-object-anchor="coppersmith-plumbing"]
PASS mobile: geometry unchanged h1
PASS mobile: geometry unchanged h2
PASS mobile: no new horizontal overflow
PASS mobile: mobile edge tab present
PASS mobile: tap opens bottom sheet
PASS mobile: sheet does not move content
PASS mobile: sheet lists objects
PASS mobile: object card shows in sheet
PASS mobile: relationship link on mobile card
PASS mobile: mobile peer jump shows the related object
PASS mobile: sheet closes

ALL GEOMETRY CHECKS PASSED

## accept-protocol.mjs output (exit 0, ACCEPTANCE: ALL CHECKS PASSED)

INFO CHECK 1 :: served-fresh DOM markers
PASS 1: object-layer mounted exactly once :: got 1
PASS 1: data-projection=dual at 1440x900 :: got dual
PASS 1: happy-place slot (data-object-id) present :: got 1
PASS 1: coppersmith-plumbing slot (data-object-id) present :: got 1
PASS 1: two [data-object-anchor] elements :: got 2
PASS 1: no stale inline/modal markers in live DOM :: []
INFO CHECK 2/4/10 :: desktop-wide 1440x900
INFO desktop-wide: baseline slots :: {"happy-place":{"docY":1393.59,"viewY":1393.59,"x":1352,"position":"absolute"},"coppersmith-plumbing":{"docY":1973.75,"viewY":1973.75,"x":1352,"position":"absolute"}}
PASS 2(desktop-wide): happy-place docY stable @scroll500 :: delta=0.00px
PASS 2(desktop-wide): happy-place docY stable @scroll1000 :: delta=0.00px
PASS 2(desktop-wide): happy-place viewportY delta ~-500 :: delta=-500.0px
PASS 2(desktop-wide): happy-place viewportY delta ~-1000 :: delta=-1000.0px
PASS 10(desktop-wide): happy-place not viewport-fixed :: position=absolute
PASS 2(desktop-wide): coppersmith-plumbing docY stable @scroll500 :: delta=0.00px
PASS 2(desktop-wide): coppersmith-plumbing docY stable @scroll1000 :: delta=0.00px
PASS 2(desktop-wide): coppersmith-plumbing viewportY delta ~-500 :: delta=-500.0px
PASS 2(desktop-wide): coppersmith-plumbing viewportY delta ~-1000 :: delta=-1000.0px
PASS 10(desktop-wide): coppersmith-plumbing not viewport-fixed :: position=absolute
PASS 2(desktop-wide): anchor[happy-place] docY stable :: delta=0.00px
PASS 2(desktop-wide): anchor[coppersmith-plumbing] docY stable :: delta=0.00px
PASS 4(desktop-wide): happy-place docY jitter-free over 14 scroll stops :: max-min=0.00px
INFO desktop-wide: happy-place docY series :: 1393.6,1393.6,1393.6,1393.6,1393.6,1393.6,1393.6,1393.6,1393.6,1393.6,1393.6,1393.6,1393.6,1393.6
PASS 4(desktop-wide): coppersmith-plumbing docY jitter-free over 14 scroll stops :: max-min=0.00px
INFO desktop-wide: coppersmith-plumbing docY series :: 1973.8,1973.8,1973.8,1973.8,1973.8,1973.8,1973.8,1973.8,1973.8,1973.8,1973.8,1973.8,1973.8,1973.8
INFO desktop-wide: scroll-listener attribution :: {"onLayer":[],"onWindow":1,"onDocument":1,"other":["NEXTJS-PORTAL","ShadowRoot","BODY","DIV"]}
PASS 4(desktop-wide): no scroll listener inside object-layer subtree :: []
INFO CHECK 2/4/10 :: desktop-normal 1100x800
INFO desktop-normal: baseline slots :: {"happy-place":{"docY":1509.73,"viewY":1509.73,"x":1024,"position":"absolute"},"coppersmith-plumbing":{"docY":2089.89,"viewY":2089.89,"x":1024,"position":"absolute"}}
PASS 2(desktop-normal): happy-place docY stable @scroll500 :: delta=0.00px
PASS 2(desktop-normal): happy-place docY stable @scroll1000 :: delta=0.00px
PASS 2(desktop-normal): happy-place viewportY delta ~-500 :: delta=-500.0px
PASS 2(desktop-normal): happy-place viewportY delta ~-1000 :: delta=-1000.0px
PASS 10(desktop-normal): happy-place not viewport-fixed :: position=absolute
PASS 2(desktop-normal): coppersmith-plumbing docY stable @scroll500 :: delta=0.00px
PASS 2(desktop-normal): coppersmith-plumbing docY stable @scroll1000 :: delta=0.00px
PASS 2(desktop-normal): coppersmith-plumbing viewportY delta ~-500 :: delta=-500.0px
PASS 2(desktop-normal): coppersmith-plumbing viewportY delta ~-1000 :: delta=-1000.0px
PASS 10(desktop-normal): coppersmith-plumbing not viewport-fixed :: position=absolute
PASS 2(desktop-normal): anchor[happy-place] docY stable :: delta=0.00px
PASS 2(desktop-normal): anchor[coppersmith-plumbing] docY stable :: delta=0.00px
PASS 4(desktop-normal): happy-place docY jitter-free over 14 scroll stops :: max-min=0.00px
INFO desktop-normal: happy-place docY series :: 1509.7 x14
PASS 4(desktop-normal): coppersmith-plumbing docY jitter-free over 14 scroll stops :: max-min=0.00px
INFO desktop-normal: coppersmith-plumbing docY series :: 2089.9 x14
INFO desktop-normal: scroll-listener attribution :: {"onLayer":[],"onWindow":1,"onDocument":1,"other":["NEXTJS-PORTAL","ShadowRoot","BODY","DIV"]}
PASS 4(desktop-normal): no scroll listener inside object-layer subtree :: []
INFO CHECK 5 :: cluster determinism at narrow desktop widths
INFO 5: width 1024 :: projection=single singles=["happy-place","coppersmith-plumbing"] clusters=[]
INFO 5: width 1000 :: projection=edge singles=["happy-place","coppersmith-plumbing"] clusters=[]
INFO 5: width 960 :: projection=edge singles=["happy-place","coppersmith-plumbing"] clusters=[]
INFO 5: width 900 :: projection=edge singles=["happy-place","coppersmith-plumbing"] clusters=[]
INFO 5: no cluster engaged at 1024/1000/960/900px (singles only); scroll-flicker N/A
INFO CHECK 7/8 :: hover/click state machine + ornate ring (1440x900)
INFO 7: HP trigger box :: {"x":1352,"y":1393.59375,"width":64,"height":64}
PASS 7: hover rest circle opens card (preview) :: cards=1
INFO 7: mouse destination (far from CU slot) :: {"dest":{"x":60,"y":60},"cu":{"x":1384,"y":1029.75}}
PASS 7: click while hover-open pins (stays open after mouse leaves) :: cards=1 label="Happy Place Carpentry LLC: follow, like, website actions"
PASS 8: ornate ring present in DOM when expanded :: {"found":true,"ariaHidden":"true","peNone":true,"opacity":"1","tag":"DIV"}
PASS 8: ring is decorative aria-hidden :: aria-hidden=true
PASS 8: ring is pointer-events-none overlay :: peNone=true
PASS 7: click again closes the card :: cards=0
PASS 8: ring absent at rest (no card) :: ringInfo null at rest
INFO 8: ring opacity :: t~60ms=0.347574 t~1000ms=1 (RING_FADE_MS=280)
PASS 8: ring fades in to full opacity :: late=1
INFO CHECK 6 :: relationship nav: Happy Place -> Coppersmith (1440x900)
PASS 6: HP card relation targets coppersmith-plumbing :: got coppersmith-plumbing
PASS 6: exactly one card after peer jump :: got 1: ["Coppersmith Plumbing - HVAC - Mechanical: follow, like, website actions"]
PASS 6: open card is Coppersmith (HP collapsed) :: ["Coppersmith Plumbing - HVAC - Mechanical: follow, like, website actions"]
PASS 6: Coppersmith card opened in its own slot :: card not found inside coppersmith slot
PASS 6: page scrolled the Coppersmith slot into view :: scrollY 0->1556, cuViewY=417.75

ACCEPTANCE: ALL CHECKS PASSED

## Notes
- Raw SSR curl showed data-object-id slots absent (client-rendered after mount); live-DOM
  check 1 confirms they render. data-projection is also set client-side.
- Scroll listeners exist on window/document/NEXTJS-PORTAL/ShadowRoot/BODY/DIV (app/Next.js),
  but NONE inside the [data-testid="object-layer"] subtree (spy via addInitScript wrapping
  EventTarget.prototype.addEventListener, attributed post-run).
- Cluster path (MarginCluster) never engaged: the two anchors sit ~580px apart in document Y
  (1393.6 vs 1973.8 at 1440x900), so no width produced a cluster. Cluster determinism is
  UNCOVERED by real-browser evidence in this lane (would need test content with close anchors).
- Repo untouched by this worker: no files added/modified in /home/nolan/projects/ping.
  Pig temp files (/home/nolan/accept-protocol.mjs*, /home/nolan/diag.mjs, /home/nolan/patch*.py,
  /home/nolan/node_modules symlink) removed after the run.
- Cosmetic wart in accept-protocol.mjs: the `check()` helper prints its detail string on PASS
  too, so "PASS 6: Coppersmith card opened in its own slot :: card not found inside
  coppersmith slot" means the boolean was TRUE (card WAS found in the slot); the detail
  text is a static failure-explanation string. Same for "PASS 8: ring absent at rest ::
  ringInfo non-null at rest" (ringInfo was null, boolean true).
