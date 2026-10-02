# ORCA HOLD / UNKNOWN REGISTER

Compact resolution log. Fields: hold · evidence · disposition · reason · reopen trigger. Nolan sees only material ones unless requested.

## H1 — Privacy branch refs lost; fix appears merged (HOLD: verify, don't re-implement)
- **Evidence (2026-09-25 ~20:38 MDT, live reobserve):** Branch `fyd/privacy-projection-p0` and commits `ecd2ef9`/`7e6b81c`/`f5d2de4` not found in `/home/nolan/projects/ping` or `/home/nolan/workspace`; worktree `/home/nolan/worktrees/fyd-privacy-p0` is git-orphaned (gitdir metadata gone) and contains no `src/` checkout. BUT the fix content is present and committed in `/home/nolan/projects/ping` on `fyd/sprint-integration-2026-09-24`: `src/fyd/sitespec/field-visibility.ts` contains the fail-closed language; `git log` shows `136bf9a6` ("UNIT-4 EDGE MERGE: … 4-leak Q-P0-01 privacy lane … into fyd/sprint-integration-2026-09-24"), `568b3e5e` ("6 gallery files + 3 privacy files + ask-privacy-probe test"), `3dfa164d` ("UNIT-3-Ask-FYD-fail-closed-conflict-plus-hide-traversal") touching `field-visibility.ts` and `src/fyd/ask/visitor-answer.ts`. Working tree clean for those paths.
- **Disposition:** HOLD. Do not re-implement the privacy fix.
- **Reopen trigger:** Q-MAIN phase 2 or a falsifier diffs the merged content against the privacy lane's RED/GREEN test evidence (7 RED tests in `ecd2ef9`, SiteSpec 116/116, Ask 127 pass, components 82/82, tenant 28/28) and confirms behavioral equivalence. If it diverges: escalate, do not silently patch.

## H2 — Orphaned worktrees (UNKNOWN)
- **Evidence:** `/home/nolan/worktrees/copper-v2`, `fyd-privacy-p0`, `orca-autonomy` (and possibly others) have `.git` files pointing at `/home/nolan/workspace/.git/worktrees/<name>`, but that metadata dir now contains only `audit-beyond-backlog-2026-09-19`. Git commands in those worktrees fail ("not a git repository").
- **Disposition:** UNKNOWN. Leave them alone.
- **Reopen trigger:** Identify which (if any) are still needed (Q-MAIN's 05:00 build worktree in particular); then deliberately re-register (`git worktree repair`) or remove. Do NOT auto-prune.

## H3 — :3105 zombie server (KNOWN, out of review)
- **Evidence:** pid 48581 `next-server` listening on :3105 with cwd `/home/nolan/worktrees/copper-v2 (deleted)` — running from a deleted tree.
- **Disposition:** Known-broken; already out of review until the 05:00 rebuild. Do not send Nolan there.
- **Reopen trigger:** Q-MAIN's 05:00 build replaces it; then the zombie can be killed and the port re-proven.

## H4 — Secret-shaped DATABASE_URL in ~/.bash_history line 37 (2026-09-16) (HOLD)
- **Disposition:** HOLD per Nolan. Do not print, purge, copy, or rotate without his explicit decision.

## H5 — Tenant isolation proof Q-P0-06 incomplete (HOLD)
- **Disposition:** HOLD. Public Ask FYD opens only after grounding, isolation, and abuse-control hostile tests pass.

## H6 — Restaurant / third business deferred (Nolan decision)
- **Disposition:** No third site until HPP + Coppersmith pass. Not selectable by the queue.

## H7 — identity_5 / identity_6 authorization (UNKNOWN, under investigation)
- **Evidence:** Convergence swarm: `identity_5`/`identity_6` in live quota state; registry authorizes only 1–4. Possible live authorization hole, not proven.
- **Disposition:** UNKNOWN. Q-ID lane investigating read-only.
- **Reopen trigger:** Q-ID proves or disproves a reached unauthorized spend path.

## H8 — Dirty-file ownership (RESOLVED 2026-09-25 ~20:42 MDT, Q-E lane)
- **Evidence:** `~/workspace/sprint-2026-09-24/orca/DIRTY-FILES.md`. Live totals: **1489 untracked files, zero modified/deleted tracked files** across all four repos. `projects/ping`: 829 untracked (796 Next.js build outputs from tonight's 12:55–12:56 MDT integration build — 264 MB — plus 25 generated webp variants, 3 media manifests, 3 intake result.json, tsbuildinfo, pycache; none gitignored). `build-edge-port`: 650 untracked (worker's `.next.bak-workerG-qf06/` backup, 05:34 MDT). `happy-place-platform`: 10 untracked pre-existing work artifacts (2026-09-09–16; docs, scripts, config backups, `hpp-ping-boundary.test.ts`) — NOT disposable-by-default, needs a lane/human decision. `build-template1`: clean.
- **Disposition:** RESOLVED. The "23 unrelated dirty files" figure is stale — retire it and use the live inventory. 1479 files are disposable build artifacts; the 10 hpp files must not be bulk-cleaned. No uncommitted source changes exist anywhere: nothing to cherry-pick, nothing at risk.
- **Reopen trigger:** Only if a lane needs one of the 10 hpp files attributed or moved — then attribute individually, never bulk-clean.
