# ORCA Q-E — Dirty-file ownership inventory

**Scan:** 2026-09-25 ~20:45 MDT, live, READ-ONLY.
**Method:** `git status --porcelain=v1 -uall` per repo (via pigwsl-run.sh), plus per-file `stat` (size/mtime) and `git log -1 --format='%h %ad %s' -- <path>` for ownership; `git check-ignore -v` on artifact paths; `git rev-parse` for branch/HEAD verification. No checkout, clean, reset, stash, or any write to any repo. Ports 3100-3106 untouched.

## Repo verification

| Repo | Branch | HEAD | Expected | Match |
|---|---|---|---|---|
| `/home/nolan/projects/ping` | `fyd/sprint-integration-2026-09-24` | `c93a7ced6161ffe2b103ddb506a7bf18a6aee15e` | `c93a7ced` | yes |
| `/home/nolan/build-edge-port` | (detached HEAD) | `8faf96d0b1e964c0240450d2166c6389b71682e9` | `8faf96d0` | yes |
| `/home/nolan/projects/happy-place-platform` | `devin/hpp-ping-boundary` | `6dd11bedd5e2b945186793bc1e8d9df4fb8303d5` | `6dd11bed` | yes |
| `/home/nolan/build-template1` | `fyd/template-001-hpp-clone` | `e4819ce88d1ae82005704c9d3381fd234967e64e` | `e4819ce8` | yes |

**Global finding:** every dirty entry in all four repos is `??` (untracked). Zero modified, zero deleted, zero staged tracked files anywhere. There are no uncommitted source changes in any repo.

## 1. ping — 829 dirty (all `??`)

All 829 are untracked. Grouped by generating process (all mtimes 2026-09-25 12:55:59 - 12:56:00 MDT, i.e. one build session):

| Path pattern | Files | Size | Status | Likely ownership |
|---|---|---|---|---|
| `.next.pre-purehead-20260924/` | 639 | 270760 KB | ?? | Next.js build output from the 12:55 integration build; Q-MAIN lane work on `fyd/sprint-integration-2026-09-24`. Disposable build artifact. |
| `.next.integration-build-20260924/` | 157 | 2703 KB | ?? | Same build session, second dist-dir output. Disposable build artifact. |
| `public/fyd-media/<sha>/*.webp` | 25 | 1139 KB | ?? | Generated responsive image variants (blur-10w / card-768w / thumbnail-480w / hero-1600w) from the FYD media pipeline during the build. Regenerable. |
| `src/fyd/media/manifests/*.json` | 3 | 85 KB | ?? | Generated media manifests (`coppersmith-plumbing-live.json`, `happy-place-live.json`, `live-9d13c4196b4f.json`). Regenerable. |
| `var/fyd-intake/live-*/result.json` | 3 | 56 KB | ?? | FYD intake pipeline run results. Runtime data, disposable. |
| `tsconfig.arrow6.tsbuildinfo` | 1 | 143 KB | ?? | tsc incremental build info. Disposable. |
| `tools/fyd-site-projection/__pycache__/dump.cpython-314.pyc` | 1 | 35 KB | ?? | Python bytecode cache. Disposable. |

Non-`.next` detail (the 33 entries that are not raw build output; all `??`, all mtime 2026-09-25 12:56:00 MDT):

| Path | Size (bytes) | Ownership |
|---|---|---|
| `public/fyd-media/0814931246c2c278dd2a94e9924b14800d67d0e4b223200601354cc78c85b4f9/blur-10w.webp` | 92 | media pipeline, build 12:55 |
| `public/fyd-media/0814931246c2c278dd2a94e9924b14800d67d0e4b223200601354cc78c85b4f9/card-768w.webp` | 118316 | media pipeline, build 12:55 |
| `public/fyd-media/0814931246c2c278dd2a94e9924b14800d67d0e4b223200601354cc78c85b4f9/thumbnail-480w.webp` | 56044 | media pipeline, build 12:55 |
| `public/fyd-media/16052e5f595077bf9828ec6ad98059568b2c9bacadcd262e7a03e905ee51bdb1/blur-10w.webp` | 70 | media pipeline, build 12:55 |
| `public/fyd-media/16052e5f595077bf9828ec6ad98059568b2c9bacadcd262e7a03e905ee51bdb1/card-768w.webp` | 51564 | media pipeline, build 12:55 |
| `public/fyd-media/16052e5f595077bf9828ec6ad98059568b2c9bacadcd262e7a03e905ee51bdb1/hero-1600w.webp` | 115136 | media pipeline, build 12:55 |
| `public/fyd-media/16052e5f595077bf9828ec6ad98059568b2c9bacadcd262e7a03e905ee51bdb1/thumbnail-480w.webp` | 30598 | media pipeline, build 12:55 |
| `public/fyd-media/2ae2a4014e626e2deadfd27ce6fe7bded0a2d4afcbae9e4e07d93407793e390e/blur-10w.webp` | 172 | media pipeline, build 12:55 |
| `public/fyd-media/2ae2a4014e626e2deadfd27ce6fe7bded0a2d4afcbae9e4e07d93407793e390e/thumbnail-256w.webp` | 6774 | media pipeline, build 12:55 |
| `public/fyd-media/53a4ae9b18a8111b52578e38ee0c42c7cb5b3c200b35fd2d8c23ba8473b3b77d/blur-10w.webp` | 74 | media pipeline, build 12:55 |
| `public/fyd-media/53a4ae9b18a8111b52578e38ee0c42c7cb5b3c200b35fd2d8c23ba8473b3b77d/card-768w.webp` | 79832 | media pipeline, build 12:55 |
| `public/fyd-media/53a4ae9b18a8111b52578e38ee0c42c7cb5b3c200b35fd2d8c23ba8473b3b77d/thumbnail-480w.webp` | 33356 | media pipeline, build 12:55 |
| `public/fyd-media/8071322c6849680a0ae7d0fd218d9dd3b5f81aa73b8c517a38aa2e492132889d/blur-10w.webp` | 96 | media pipeline, build 12:55 |
| `public/fyd-media/8071322c6849680a0ae7d0fd218d9dd3b5f81aa73b8c517a38aa2e492132889d/card-768w.webp` | 147634 | media pipeline, build 12:55 |
| `public/fyd-media/8071322c6849680a0ae7d0fd218d9dd3b5f81aa73b8c517a38aa2e492132889d/thumbnail-480w.webp` | 64374 | media pipeline, build 12:55 |
| `public/fyd-media/8b10a331c651857abb4e2d64caa7c38c1f7fb3b875213d322d124ae03257eb34/blur-10w.webp` | 92 | media pipeline, build 12:55 |
| `public/fyd-media/8b10a331c651857abb4e2d64caa7c38c1f7fb3b875213d322d124ae03257eb34/card-768w.webp` | 193278 | media pipeline, build 12:55 |
| `public/fyd-media/8b10a331c651857abb4e2d64caa7c38c1f7fb3b875213d322d124ae03257eb34/thumbnail-480w.webp` | 79502 | media pipeline, build 12:55 |
| `public/fyd-media/8ea630c93e213c2303862194d7706eda0c9f728dc2e26a76e852708e8d1799fa/blur-10w.webp` | 106 | media pipeline, build 12:55 |
| `public/fyd-media/8ea630c93e213c2303862194d7706eda0c9f728dc2e26a76e852708e8d1799fa/thumbnail-480w.webp` | 70218 | media pipeline, build 12:55 |
| `public/fyd-media/c588c3642476b63889da79171eb4298dabc807cfb1e4d50d0e5cfbe56c0849df/blur-10w.webp` | 88 | media pipeline, build 12:55 |
| `public/fyd-media/c588c3642476b63889da79171eb4298dabc807cfb1e4d50d0e5cfbe56c0849df/card-768w.webp` | 77718 | media pipeline, build 12:55 |
| `public/fyd-media/c588c3642476b63889da79171eb4298dabc807cfb1e4d50d0e5cfbe56c0849df/thumbnail-480w.webp` | 34956 | media pipeline, build 12:55 |
| `public/fyd-media/eecbf99794e531e35a4f17a1c331d3e583124abbd0d3ae213d1d1588dd6df4fb/blur-10w.webp` | 78 | media pipeline, build 12:55 |
| `public/fyd-media/eecbf99794e531e35a4f17a1c331d3e583124abbd0d3ae213d1d1588dd6df4fb/thumbnail-480w.webp` | 5670 | media pipeline, build 12:55 |
| `src/fyd/media/manifests/coppersmith-plumbing-live.json` | 27934 | media pipeline manifest generation, build 12:55 |
| `src/fyd/media/manifests/happy-place-live.json` | 29330 | media pipeline manifest generation, build 12:55 |
| `src/fyd/media/manifests/live-9d13c4196b4f.json` | 29331 | media pipeline manifest generation, build 12:55 |
| `tools/fyd-site-projection/__pycache__/dump.cpython-314.pyc` | 35477 | Python bytecode from projection tooling |
| `tsconfig.arrow6.tsbuildinfo` | 146440 | tsc incremental build info |
| `var/fyd-intake/live-9d13c4196b4f/result.json` | 55469 | FYD intake pipeline result |
| `var/fyd-intake/live-d5541dbe8037/result.json` | 882 | FYD intake pipeline result |
| `var/fyd-intake/live-e5602f1d749c/result.json` | 1087 | FYD intake pipeline result |

Hygiene note (no action taken): `git check-ignore -v` returned empty for all of the above paths, so none of these build artifacts are gitignored in this repo. They will keep showing as dirty on every build until a lane adds ignore rules.

## 2. build-edge-port — 650 dirty (all `??`)

| Path pattern | Files | Size | Mtime | Status | Likely ownership |
|---|---|---|---|---|---|
| `.next.bak-workerG-qf06/` | 650 | 296032 KB (~289 MB) | 2026-09-25 05:34:39 | ?? | Renamed backup copy of a Next.js build output (`server/` 348, `static/` 148, `types/` 96, `cache/` 42, `diagnostics/` 2, plus root manifests; `BUILD_ID` = `_F_Iwzm7Po_Lhv0Vi6gw`). The `bak-workerG` naming indicates an agent worker's manual backup taken before a rebuild. Disposable build artifact. Not gitignored. |

## 3. happy-place-platform — 10 dirty (all `??`)

All untracked; `git log -- <path>` returns nothing for each. Dated 2026-09-09 through 2026-09-16, i.e. pre-existing work on the `devin/hpp-ping-boundary` line, predating tonight's sprint:

| Path | Size (bytes) | Mtime | Status | Likely ownership |
|---|---|---|---|---|
| `PRODUCTION_REPAIR_QUICK_REFERENCE.md` | 3625 | 2026-09-11 07:53 | ?? | Doc from the 2026-09-11 production-repair session |
| `PRODUCTION_STATUS.md` | 12947 | 2026-09-11 07:53 | ?? | Doc from the 2026-09-11 production-repair session |
| `commit-message-login-fix.txt` | 1014 | 2026-09-09 19:14 | ?? | Leftover commit-message draft |
| `commit-message.txt` | 2169 | 2026-09-09 18:56 | ?? | Leftover commit-message draft |
| `website/scripts/sync-static-media-to-kv.mjs` | 4232 | 2026-09-10 18:18 | ?? | Media sync script, pre-existing work |
| `website/src/config/media.v1.json.backup.2026-09-10T00-54-31-724Z` | 56565 | 2026-09-09 05:34 | ?? | Config backup |
| `website/src/config/projects.v1.json.backup.2026-09-10T00-54-31-724Z` | 23229 | 2026-09-09 18:54 | ?? | Config backup |
| `website/src/lib/__tests__/hpp-ping-boundary.test.ts` | 7419 | 2026-09-16 06:40 | ?? | Boundary test matching this branch's purpose (`devin/hpp-ping-boundary`); looks like intentional work product, candidate to keep/track |
| `website/src/scripts/test-media-resolution.mjs` | 1534 | 2026-09-11 10:21 | ?? | Test script |
| `website/src/scripts/test-real-assignment-loop.mjs` | 4572 | 2026-09-11 10:09 | ?? | Test script |

Disposition: NOT disposable-by-default. Needs a lane/human decision before any cleanup; do not bulk-clean. The boundary test in particular may be deliberate work product for Q-D's diff context.

## 4. build-template1 — 0 dirty

Working tree clean. Nothing to attribute.

## Reconciliation against the "23 unrelated dirty files"

- **Live totals (2026-09-25 ~20:45 MDT):** ping 829 + edge-port 650 + hpp 10 + template1 0 = **1489 untracked files**; 0 tracked modifications anywhere.
- **Collapsed top-level entries** (what plain `git status --porcelain` without `-uall` shows): ping 7, edge-port 1, hpp 5, template1 0 = **13**.
- The charter's **"23" matches neither counting method** on live state. H8's "28" (17 + 1 + 10), written ~20:40 MDT after the 12:55 build that produced ping's ~796 `.next` files, also matches neither method and does not describe live state.
- **Verdict: the "23 unrelated dirty files" figure is stale and should be retired.** The live inventory is 1489 untracked files / 13 collapsed entries. The discrepancy is explained by (a) the 12:55 MDT integration build creating ~796 new `.next` files in ping and the 05:34 `.next.bak-workerG-qf06` dir (650 files) in edge-port, and (b) earlier counts using collapsed-directory counting instead of `-uall`.

## Bottom-line ownership summary

- **Q-MAIN lane build outputs** (`fyd/sprint-integration-2026-09-24`, tonight's 12:55 MDT integration build): ping's 829 files. Disposable/regenerable; safe to leave in place or clean at the lane's discretion. Not this lane's call.
- **Agent-worker backup**: edge-port's 650 files (`.next.bak-workerG-qf06/`, created 05:34 MDT). Disposable build artifact.
- **Genuinely unknown / needs human decision**: hpp's 10 files. Pre-existing Devin-line work artifacts (2026-09-09..16); the `hpp-ping-boundary.test.ts` may be intentional. Do not bulk-clean; route to the owning lane.
- **Clean**: build-template1 (0 dirty).
- **No modified or deleted tracked files in any repo**: no uncommitted source changes exist anywhere, so there is nothing to cherry-pick and nothing at risk of being clobbered by a build or a future clean.
- Read-only constraint honored: only `status`, `log`, `rev-parse`, `check-ignore`, and `stat` were executed against the repos.
