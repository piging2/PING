# Visual critique harness (shared: mobile + desktop lanes)

Do not duplicate this. Both lanes use the same capture path and output dir.

## Capture path

CDP on the Pig Windows Chrome is reachable ONLY from the Windows side
(`http://localhost:9223`; verified Chrome/153 via `pig` + curl.exe). It is
not reachable from WSL. The pig-fb execution pattern is:

1. Write a Node script locally (playwright-core `chromium.connectOverCDP`).
2. `pig_scp` it to `C:/Users/nolan/.local/share/pigi/fb-engage/` (see
   `~/workspace/pig-fb/pig-ssh.sh`).
3. Run it with `C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe`
   via `~/workspace/bin/pig '...'`.
4. `require('playwright-core')` resolves from
   `C:/Users/nolan/.local/share/pigi/fb-engage/node_modules`.

Target URL from Windows Chrome: `http://100.79.154.43:3100/...` (Pig WSL dev
server; the Tailscale IP is the reliable host path).

## Pulling results back

Windows-side files are staged through WSL, then scp'd via the pigwsl host:

```
~/workspace/pig/pigwsl-run.sh 'mkdir -p /mnt/c/Users/nolan/transfer/<dir> && cp /mnt/c/Users/nolan/.local/share/pigi/fb-engage/<dir>/* /mnt/c/Users/nolan/transfer/<dir>/'
scp -F /home/hatch/.ssh/pig-config -o BatchMode=yes 'pigwsl:C:/Users/nolan/transfer/<dir>/*' <local-dest>/
```

## This lane (mobile)

- Script: `~/workspace/fyd-factory/visual/mobile-capture.js`
- FAB probe: `~/workspace/fyd-factory/visual/fab-probe.js`
- Shots + per-width DOM analysis: `~/workspace/fyd-factory/visual/shots/`
- Verdicts: `~/workspace/fyd-factory/visual/mobile-critique.json`
- Widths: 320, 360, 375, 390, 430 (+ 1280 parity reference)

## Rules both lanes follow

- Never fake a screenshot. If CDP is unreachable, report static analysis +
  precise capture escalation instead.
- New background tabs only; never click/type in Nolan's tabs except
  deliberate single-control probes on dev routes (the FAB probe pattern).
- Every issue is filed as FALSE POSITIVE or REPRODUCIBLE FAILURE with
  width, selector, and generic cause.
- The 320 px findings feed the permanent responsive regression test;
  mobile-critique.json carries them under `regression_320_notes`.

## This lane (desktop)

- Script: `~/workspace/fyd-factory/visual/visual-capture.js` (+ `visual-zoom.js`
  for clipped forensics, `visual-motion.js` for the motion-gating probe,
  `visual-deep.js` for descendant inventory).
- Verdicts: `~/workspace/fyd-factory/visual/desktop-critique.json`
- Widths: 1440, 1280. Viewport height 900. Full-page PNG + DOM metrics JSON
  per width.
- Browser isolation: the desktop lane does NOT use the :9223 production
  browser at all. It launches a dedicated headless Chrome
  (`--headless=new --remote-debugging-port=9334+ --user-data-dir=<fresh>`)
  and drives it via `connectOverCDP('http://127.0.0.1:<port>')` from the same
  Windows node process. Verified 2026-09-23.
- Target URL from the headless Chrome: `http://localhost:3100/sites/<slug>`
  (verified 200 from Windows; `http://127.0.0.1:3100` refuses connection from
  the Windows side, the Tailscale IP also works).
- Scroll-through protocol (MANDATORY before full-page capture): FYD entrance
  motion (`data-motion="enter"`) holds below-fold cards at opacity 0 until
  IntersectionObserver fires, so a naive full-page capture photographs blank
  sections. Scroll top to bottom in viewport steps with settle time first,
  then capture. Separately probe one motion-gated section WITHOUT pre-scroll
  and record computed opacity: that is the motion-gating test.
- wsl-run.sh lesson: `powershell.exe`/`cmd.exe` slurp the script's stdin and
  eat the rest of the script. Always `< /dev/null` on those invocations;
  write Windows-side stdout to a log file, then `cat` it.
- Checklist per critique: visual hierarchy, spacing, typography, density,
  visual rhythm, empty space, CTA prominence, navigation, media quality,
  card repetition, section monotony, awkward wrapping, generic AI-site
  appearance, excessive gradients/cards, weak hero, dead visual zones,
  over/under-animation.
- Scope: `/sites/<slug>` includes the demo shell (header/nav, provenance
  strip, "Customize this site" panel). Critique the FYD site; log shell
  weight separately as SH-nnn.
