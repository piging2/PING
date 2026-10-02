# Adjudication Re-run — Fresh Captures (2026-09-27, ~09:30 MDT)

Re-run of the 19:00 adjudication against the v3-polish RE-LAND (Nolan's binding order 2026-09-27).
Comparison page: `index.html`. The original falsification evidence in `adjudication/` is untouched.

## Capture list (15 fresh frames + 2 supplementary re-shoots)

Captured via the Pig house Windows Chrome (CDP :9223), portable node,
`C:/Users/nolan/design-sprint/adjud-shots.cjs` + `adjud-run.ps1` (same sanctioned harness as the original adjudication).
Every page returned HTTP 200; the run manifest reports `"pageerrors": []`
(zero page errors across all 15 frames). Full-page PNG, valid image data, pulled via pig-rsync.

| # | File | Subject | Route / source | Nominal width |
|---|------|---------|----------------|---------------|
| 1 | shots/orig-hpp-fresh-320.png | Original HPP | https://happy-place-platform.vercel.app/ | 320 |
| 2 | shots/orig-hpp-fresh-375.png | Original HPP | https://happy-place-platform.vercel.app/ | 375 |
| 3 | shots/orig-hpp-fresh-390.png | Original HPP | https://happy-place-platform.vercel.app/ | 390 |
| 4 | shots/orig-hpp-fresh-768.png | Original HPP | https://happy-place-platform.vercel.app/ | 768 |
| 5 | shots/orig-hpp-fresh-1440.png | Original HPP | https://happy-place-platform.vercel.app/ | 1440 |
| 6 | shots/hpp-v3-polish-320.png | Generated HPP | http://172.21.65.209:3200/sites/happy-place | 320 |
| 7 | shots/hpp-v3-polish-375.png | Generated HPP | http://172.21.65.209:3200/sites/happy-place | 375 |
| 8 | shots/hpp-v3-polish-390.png | Generated HPP | http://172.21.65.209:3200/sites/happy-place | 390 |
| 9 | shots/hpp-v3-polish-768.png | Generated HPP | http://172.21.65.209:3200/sites/happy-place | 768 |
| 10 | shots/hpp-v3-polish-1440.png | Generated HPP | http://172.21.65.209:3200/sites/happy-place | 1440 |
| 11 | shots/copper-v3-polish-320.png | Coppersmith | http://172.21.65.209:3200/sites/coppersmith-plumbing | 320 |
| 12 | shots/copper-v3-polish-375.png | Coppersmith | http://172.21.65.209:3200/sites/coppersmith-plumbing | 375 |
| 13 | shots/copper-v3-polish-390.png | Coppersmith | http://172.21.65.209:3200/sites/coppersmith-plumbing | 390 |
| 14 | shots/copper-v3-polish-768.png | Coppersmith | http://172.21.65.209:3200/sites/coppersmith-plumbing | 768 |
| 15 | shots/copper-v3-polish-1440.png | Coppersmith | http://172.21.65.209:3200/sites/coppersmith-plumbing | 1440 |

Supplementary (fix-8 verification, see note below):
- shots/copper-re-390.png — viewport re-shoot, copper hero at true 390px, fonts loaded
- shots/hpp-re-390.png — viewport re-shoot, HPP hero at true 390px, fonts loaded

Note on pixel widths: the shared headed browser constrains the tab viewport slightly, so actual full-page PNG widths are 305 / 360 / 375 / 753 / 1425 px rather than exactly 320 / 375 / 390 / 768 / 1440. CSS breakpoints still apply at the nominal widths; frames are full-page and valid. Same constraint as the original adjudication.

## The three bound digests (re-verified at capture time, ~09:24 MDT)

(a) Pinned HEAD of the served worktree (`/home/nolan/worktrees/design-sprint-visual-v1`, clean apart from untracked node_modules):
`9c8c21939eff073a5b87817e4ef1674d9aabebc5` — matches the bound digest exactly.

(b) Build digest: `.next/BUILD_ID` live content is `6QmE00XdDC5Sa_Lrobgt0` (21 bytes, xxd-verified, no trailing newline).
DISCREPANCY NOTE: `rework/digests.md` records a 64-char BUILD_ID (`6QmE00XdDC5Sa_Lrobgt05a1accff691a827882ae2e7dfbb1f544d90214cf51c54e4e321423863c3023dd`). The live file holds only the 21-char prefix. The served HTML on both routes is byte-identical to the bound hashes (see c), which is only possible if the build is unchanged since the rework verification; the 64-char string was a transcription error in digests.md, not a rebuild. Recorded here with the raw evidence so the record is honest.

(c) Served asset digests (sha256 of the full HTML body, re-fetched at capture time):
- `/sites/happy-place`: `aacaa7e5c97bf89ce553ff8fe84031989d94bab40e97cd30e47fbe955a65bef0` (98,980 bytes) — MATCHES bound digest exactly.
- `/sites/coppersmith-plumbing`: `3651a10f7d8a6479e0f3fcba8d88b99556e4655abf5f4f95dc431282b9dcda3f` (100,171 bytes) — MATCHES bound digest exactly.

Serving state: :3200 PID 26533 (`npm exec next start -p 3200`), process env contains `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1`, both routes HTTP 200.
Wake chain: `pig-wake-resume.status` reads `VERDICT: DONE` (2026-09-27T15:17:23Z), lane commit `cd280d39`, merge `9c8c2193`.

## Fix-8 note: copper 390 fullPage artifact

The batch fullPage frame `copper-v3-polish-390.png` shows the copper hero H1 and locality lead clipped at the right viewport edge. This reproduced 2/2 under the batch harness. Two independent CDP layout measurements (fresh page; and batch-like shared page after an hpp-1440 navigation, both with fonts loaded) show zero horizontal overflow: `documentElement.scrollWidth == clientWidth == 375`, H1 `scrollWidth == clientWidth`, H1 bounding rect right edge exactly at the viewport edge. The clipping appears only in the fullPage screenshot path, not in live layout. The viewport re-shoots (`copper-re-390.png`, `hpp-re-390.png`, true 390px, fonts loaded) show both heroes wrapping cleanly. Fix 8 is therefore visually confirmed; the artifact is documented, not hidden, and the clean frames are staged alongside.

## Original-site baseline defects (fresh frames, live vercel)

Both still present on the ORIGINAL. They are baseline facts about the live original, not v3 failures, and do not affect the v3 verdict:
1. Reviews section renders literal HTML entities: "We&apos;re building our public review portfolio. In the meantime, we&apos;re happy to provide references..." (escaping bug, visible in orig-hpp-fresh-390.png).
2. Restoration and Drywall service cards show large empty gray boxes above the copy where media should be (visible in orig-hpp-fresh-390.png).

Fixes exist uncommitted in /tmp/hpp-src; no authorized deploy path, so the original is unchanged.

## Pig-side scripts used

- `C:/Users/nolan/design-sprint/adjud-shots.cjs` + `adjud-run.ps1` (pre-existing, reused unmodified)
- `C:/Users/nolan/design-sprint/measure-overflow.cjs`, `reshoot-hero.cjs`, `batchlike-measure.cjs` (written for this re-run; measurement/verification only, no Pig state changed)
- Raw Pig capture dirs: `C:/Users/nolan/design-sprint/shots/adjud-rerun/` (15 canonical), `C:/Users/nolan/design-sprint/shots/adjud-rerun2/` (repeat batch for artifact confirmation)

## Staging location

- This directory: `~/workspace/design-sprint-2026-09-26/adjudication-rerun/`
- Comparison page: `adjudication-rerun/index.html`
- Frames: `adjudication-rerun/shots/*.png` (15 canonical + 2 supplementary)
- Verdict: `adjudication-rerun/VERDICT.md`
