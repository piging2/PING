# BROWSER PROOF SPEC (for parent browser-task delegation)

Subagent cannot operate a live browser. This is prepped for the parent to
delegate via the approved browser-task route.

## Target
- Pig house Chrome via CDP http://127.0.0.1:9223 (sanctioned target per
  ~/workspace/AGENTS.md; do NOT launch a second Chrome with
  --remote-debugging-port from WSL, pipe FD issue).
- Driver: portable Windows node
  (C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe) +
  playwright-core, chromium.connectOverCDP. Run node from WSL as
  /mnt/c/.../node.exe C:/path/script.cjs. Screenshots: launch with
  headless:false plus "--headless=new" in args (page.screenshot throws
  under default headless).
- WSL cannot reach Windows CDP via 127.0.0.1; run the driver from the
  Windows side. Windows reaches WSL :3100 via the WSL VM IP from
  `hostname -I`, but the house browser on Windows reaches WSL localhost
  ports directly (wslrelay): use http://localhost:3102 and
  http://localhost:3101.

## Surfaces
- http://localhost:3102 = FROZEN visual surface (build-edge-port @
  fb520d79, BUILD_ID 80gQ93GztEoYvvMHeCN0Y). NOLAN VISUAL CHECK READY.
  Read-only; never disturb.
- http://localhost:3101 = integrated build under test. Interaction proof
  goes here.

## Matrix (directive section 14)
320, 360, 375, 390, 430, desktop. Full-page screenshots per width on
:3102. Assert: no horizontal overflow (the 320px doorway-pill fix is the
regression to watch), 44px-class usable targets, safe-area behavior.

## Interaction proof (directive sections 16-17, on :3101)
For every tested edge object: real graph -> eligibility -> contextual
selection -> projection -> margin object -> tap -> INDIVIDUAL OBJECT
OVERLAY -> typed information -> relationship -> related object -> Ask ->
evidence -> action -> Back -> exact previous site context.
Prove: backdrop dismissal, Escape, keyboard, focus trap, focus
restoration, background inertness, scroll preservation (EXACT scroll
return, not close enough), browser Back semantics, rotation/resize
survival, screen-reader expand/collapse. No "All Objects" blob, no dead
buttons, no identity fork.

## Reference
Prior mobile proof: ~/workspace/sprint-2026-09-24/evidence/mobile/
(rendered-proof.md + screenshots). The 10/10 matrix at 320/360/375/390/430
is the baseline to re-prove live.
