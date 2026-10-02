# 19:00 MDT Adjudication Runbook — Design Sprint Visual Checkpoint (2026-09-27)

Sprint clock ends ~18:55 MDT. Nolan judges at ~19:00 MDT: original HPP vs generated HPP side by side, plus Coppersmith, via rendered URLs.

## 0. Preconditions and where the state lives

- Wake-resume chain (auto): `~/workspace/design-sprint-2026-09-26/pig-wake-resume.sh`, polled every 15m by cron `pig-wake-watch-polish`. State file: `pig-wake-resume.state` (step completions). Verdict file: `pig-wake-resume.status`.
- The chain, on Pig wake: worktree+branch -> rsync 30 files -> Pig tsc + 6 targeted suites -> commit on Pig -> merge into design/sprint-visual-v1 -> rebuild -> PID-scoped :3200 restart (NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1) -> curl 200 on both routes -> 18 v3 screenshots to C:/Users/nolan/design-sprint/shots/v3-polish -> VERDICT: DONE (cron then removes itself and reports).
- Current verified status (07:25 MDT): state file is 0 bytes (zero steps done), status file 0 bytes, cron firing every 15m and exiting quietly at the reachability probe. The twelve polish fixes exist ONLY as uncommitted files in ~/work/design-lane-polish-f1 (30/30 present locally). Nothing is committed, merged, rebuilt, served, or screenshotted.

## 1. Post-recovery verification sequence (run in this order)

1. Read `pig-wake-resume.status`. Expect a line `VERDICT: DONE`. If it says `FAILED`, note the failing step and resume manually from the script's step mapping (the state file tells you which steps are done; each step is idempotent). Do NOT re-run completed steps blindly: confirm each step's evidence before marking done.
2. Confirm the Pig-side commit: `git log --oneline -1` on worktree design-lane-polish-f1, and the merge commit on design/sprint-visual-v1 (expect message "sprint: merge design/lane-polish-f1"). Record both hashes.
3. Confirm the :3200 server is serving the merged tree: process env contains NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1, `.next/BUILD_ID` is newer than the merge commit, and both routes return 200: `/sites/happy-place`, `/sites/coppersmith-plumbing`.
4. Verify the v3-polish shot set: 18 files in C:/Users/nolan/design-sprint/shots/v3-polish, every file non-empty, and the run-shots.ps1 tail output shows `"pageerrors":[]`. Pull the set to the local evidence dir (workspace mirror) before judging.
5. Spot-verify the twelve claimed fixes against the v3 shots (see section 3). A claim is not a fix until a screenshot shows it.
6. Capture fresh original-HPP shots: https://happy-place-platform.vercel.app/ at 320/375/390/768/1440 with the existing harness (sprint-shots.cjs + run-shots.ps1 pattern). Do this close to 19:00 so the comparison is current.
7. Populate `adjudication-shell.html` (paths: shots/v3-polish/*, shots/orig-hpp-fresh/*), confirm every frame loads, then give Nolan the two rendered URLs (see section 4) plus the comparison page.

## 2. Adjudication screenshot matrix

- Generated HPP (v3-polish, :3200 /sites/happy-place): 320 / 375 / 390 / 768 / 1440.
- Original HPP (fresh capture, vercel URL): 320 / 375 / 390 / 768 / 1440.
- Generated Coppersmith (v3-polish, :3200 /sites/coppersmith-plumbing): 320 / 375 / 390 / 768 / 1440.
- Optional if time: PING tenant v3 at 768/1440 for the brand check.

## 3. The twelve claimed fixes (UNVERIFIED until seen in v3 shots)

From the worker report (local files only):
1. MarginObjectLayer not mounted in visitor projection (gated on viewerKind).
2. FydMark not rendered on visitor cards.
3. Business wordmark in visitor header (replaces hardcoded "FYD SOCIAL").
4. Provenance narration blocked from public copy (no kindLabel prefixes, no "Featured object" default heading).
5. No generic "Business: ..." object pill in hero.
6. No empty "Featured object" label with thin content.
7. Real tel: and mailto: anchors as primary contact actions (not details-disclosure).
8. Hero overflow fixed at 390px (overflow-wrap + planner rule).
9. Hero media ranked by aspect/luminance fitness (not ingest order).
10. Empty sections omitted (no large gaps).
11. Contact composed as a section, not floating raw links.
12. No self-referential "Visit website" CTA; headline prefers benefit/positioning over legal name.

Falsifier gates every frame must also pass: no invented claims, no invented reviews, no invented media, no debug/governance copy in the visitor projection, no raw internal semantics as copy, no PII leakage.

## 4. Rendered URLs for Nolan

- Original HPP: https://happy-place-platform.vercel.app/
- Generated HPP: Pig LAN URL, http://<PIG-WSL-IP>:3200/sites/happy-place (WSL IP changes on wake; resolve at adjudication time).
- Generated Coppersmith: http://<PIG-WSL-IP>:3200/sites/coppersmith-plumbing
- Comparison page: the populated adjudication-shell.html (serve locally or ship as artifact).

## 5. Go / no-go criteria

GO (present the comparison) when ALL hold:
- pig-wake-resume.status reads VERDICT: DONE, with recorded commit + merge hashes.
- :3200 serves the merged tree, DEMO_OWNER_MODE=1 confirmed in env, both routes 200.
- 18 v3-polish shots exist, non-empty, zero page errors.
- All twelve fixes visibly present in the v3 frames (spot check 390 and 1440 per site).
- Fresh original-HPP frames captured at the same widths.
- Falsifier gates pass on every frame.

NO-GO (tell Nolan plainly, do not present as a win):
- Pig still unreachable at ~18:30 MDT: present the verified state (v2 evidence locally) and the unproven worker report as a hypothesis. The checkpoint becomes a status call; propose a revised adjudication time.
- Any VERDICT: FAILED step: report which step, the evidence, and what is blocked on.
- Any page 500, page errors, debug leakage in visitor frames, invented content, or a missing fix: no-go until the lane is fixed and re-shot.
- Determinism check fails (regenerate produces different bytes for identical graph + intent + renderer version): no-go on the determinism gate.

## 6. Hard rules for this runbook

- No pushes. No commits on main. No broad process kills (PID-scoped only).
- :3100 restarts only via /home/nolan/start-3100.sh.
- Read-only with respect to the Pig until the wake chain runs; the wake chain is the only sanctioned Pig mutation.
- The worker's fix report stays a hypothesis until v3 screenshots falsify or confirm it. Never promote it to fact.
- No em dashes in anything Nolan reads.
