# Adjudication Evidence — Fresh Captures (2026-09-27, ~08:28 MDT)

Side-by-side comparison page: `index.html` (copy of `adjudication-shell.html`),
expects frames at `shots/<prefix>-<width>.png`.

## Capture list (15 frames, all fresh today)

Captured via the Pig house Windows Chrome (CDP :9223), portable node,
`C:/Users/nolan/design-sprint/adjud-shots.cjs` (modeled on sprint-shots.cjs).
Every page returned HTTP 200; the run manifest reports `"pageerrors": []`
(zero page errors across all 15 frames). Full-page PNG, valid image data.

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

Note on pixel widths: the shared headed browser constrains the tab viewport
slightly, so actual PNG widths are 305 / 360 / 375 / 753 / 1425 px rather than
exactly 320 / 375 / 390 / 768 / 1440. CSS breakpoints still apply at the
nominal widths; frames are full-page and valid.

## What :3200 is serving (verified, not assumed)

- Wake chain verdict: DONE (pig-wake-resume.status, 13:25-13:28 UTC / 07:25-07:28 MDT).
- HEAD of served worktree: `8dc68e4a` "sprint: merge design/fix-evidence-ref-current".
  `.next/BUILD_ID` timestamp Sep 27 07:26 is NEWER than the HEAD commit, so the
  running build matches the current tree.
- `design/lane-polish-f1` tip is an ANCESTOR of HEAD (the branch holds no
  commits of its own); the wake-chain commit step reported "no changes added
  to commit" and the merge step reported "Already up to date."

## Defects found during capture (all visible in the fresh frames)

CRITICAL: the served v3 tree does NOT contain the twelve claimed polish fixes.
Spot-checked at 390px on both generated sites; source confirmed on the Pig:

1. Header still reads "FYD SOCIAL" (fix #3 claimed business wordmark). FAIL.
2. "Featured object" pill still rendered (fix #6 claimed removed). Source:
   `renderer.tsx:2336` still has `heading={presentation.heading ?? "Featured object"}`. FAIL.
3. Generic "Business: Happy Place Carpentry ..." / "Business: Coppersmith
   Plumbing..." object pill still in hero (fix #5 claimed removed). FAIL.
4. "Visit website" CTA still present in hero and in "Start the conversation"
   (fix #12 claimed removed). Source: `renderer.tsx:1359` plus a COMMITTED TEST
   `hero-contact.test.ts` that ASSERTS "CTA order is Call, then Visit website,
   then Ask FYD" and `expect(hero).toContain("Visit website")`. FAIL.
5. Contact area still renders raw stacked links (+15412865190 /
   taylor@happyplacecarpentry.com / https://happyplacecarpentry.com/) with no
   composed contact section (fix #11 claimed contact composed as a section). FAIL.
6. Headline is the legal name ("Happy Place Carpentry LLC"), not a benefit /
   positioning line (fix #12 headline claim). FAIL.
7. Large blank gaps remain (e.g. Coppersmith 390 between service cards and the
   business card; HPP 390 between services and the business card) — fix #10
   claimed empty sections omitted. FAIL.
8. Raw internal semantics rendered as public copy on Coppersmith:
   "coppersmithplm — Person described in the website's structured data." and
   "Coarse public location claim from the website's structured data."
   (falsifier gate: no raw internal semantics as copy).
9. Coppersmith services list shows near-duplicate taxonomy: "Heating & Cooling"
   AND "HVAC" as separate cards.

Conclusion: the lane-polish-f1 worker report is FALSIFIED as a shipped state.
The served build is v2-equivalent for the visitor projection; the twelve fixes
exist nowhere in the served source or its tests. This is a NO-GO per the
runbook section 5 (missing fixes, visitor impurity).

Defects in the ORIGINAL (live vercel, captured fresh, HTTP 200):

10. Reviews section renders literal HTML entities: "We&apos;re building our
    public review portfolio..." (escaping bug on the live original).
11. Service cards (Restoration, Drywall, Fencing at 390) show large empty gray
    boxes above the copy where media should be.

## Staging location

- This directory: `~/workspace/design-sprint-2026-09-26/adjudication/`
- Comparison page: `adjudication/index.html`
- Frames: `adjudication/shots/*.png` (15 files)
- Pig-side capture scripts (reusable): `C:/Users/nolan/design-sprint/adjud-shots.cjs`,
  `C:/Users/nolan/design-sprint/adjud-run.ps1`
- Raw pull copy: /tmp/adjud-pull/ (ephemeral)
