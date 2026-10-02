# STEP0 — Served-tree inventory (:3100 FYD demo)

Lane: read-only inventory, 2026-09-28 ~18:26 MDT. All commands executed via
`ssh -F ~/.ssh/pig-config pigwsl 'wsl -- bash -c "..."'`. Nothing modified.

## SERVER PROCESS

- pid: **23046**
- command line: `next-server (v15.5.24)` (that is the full argv; truncated cmdline)
- started: **Mon Sep 28 06:38:33 2026**
- listens: `*:3100` (confirmed via `ss -tlnp`, `users:(("next-server (v1",pid=23046,fd=21))`)
- `readlink /proc/23046/cwd`: **/home/nolan/projects/ping**
- env: **NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 present** in process environ.
  `PORT` and `NODE_ENV` are NOT in the process environment (no match).
- Two other next-server processes exist but are NOT :3100:
  pid 49851 (started 16:17:38, pts/8), pid 50657 (started 16:18:41, pts/8).

## SERVED TREE

- path: /home/nolan/projects/ping
- branch: fyd/builder-harvest-trackc-2026-09-28
- HEAD: f877c3919941978f07d5014909595df4751ec258
  (`trackc: 16 tests for the staged SitePatch pipeline`, committed 2026-09-28 16:59:43 -0600)
- dirty: **144 files** (`git status --porcelain | wc -l`)
- `.next/BUILD_ID`: `DqZQX-gQgkpciv6rpLgG3` (21 bytes, no trailing newline; verified via od)
- `.next/BUILD_ID` mtime: **2026-09-27 21:00:24.243946745 -0600** (build time)
- `.next/` listing (key entries): BUILD_ID, app-build-manifest.json,
  app-path-routes-manifest.json, build-manifest.json, cache/, diagnostics/
  (build-diagnostics.json, framework.json), export-marker.json,
  images-manifest.json, next-minimal-server.js.nft.json, next-server.js.nft.json,
  package.json, prerender-manifest.json, react-loadable-manifest.json,
  required-server-files.json, routes-manifest.json, server/, static/
- The running server (started Sep 28 06:38) serves the Sep 27 21:00 build.

## JOURNAL

- Journal gateway process: pid **64173**, cmd `node server.mjs`,
  started **Mon Sep 28 17:03:58 2026**, cwd
  **/home/nolan/projects/ping/tools/fyd-journal-gateway**
- Listens: 127.0.0.1:18199 (node, fd 23)
- Identity GET `/` returns:
  `{"ok":true,"service":"fyd-journal-gateway","store":"/home/nolan/projects/ping/data/fyd-journal/events.jsonl","journal":"fyd-demo-journal@8d6956c1caca"}`
- Journal file: /home/nolan/projects/ping/data/fyd-journal/events.jsonl
  (exists, 53173 bytes, **65 lines**, mtime Sep 28 18:15 MDT)
- No `journal`/`gateway` process other than this (only systemd-journald matched
  the name otherwise).

## PROJECTIONS (/home/nolan/ping/var/fyd-projections/)

- happy-place.json — 17844 bytes, mtime Sep 28 18:15.
  meta: siteId=happy-place, dumpedAt=2026-09-29T00:15:42.247654+00:00
  (18:15:42 MDT), dumperVersion=fyd-projection-dump@1.2.1,
  baseDigest=eacaa6113180f2cf601e7d592f10dfa1a783da25c8e0f86004d5922e65510679,
  fixtureHeader="Happy Place graph fixture: MACHINE-GENERATED, not hand-written.",
  overlayEventIds starts [fyd-seed-ovl-001 ... fyd-seed-ovl-007, fyd-ovl-mufgsyxx-...],
  presentationIntentDigest present (1 match).
- coppersmith-plumbing.json — 15411 bytes, mtime Sep 28 17:04.
  meta: dumpedAt=2026-09-28T23:04:07.154271+00:00 (17:04:07 MDT),
  dumperVersion=fyd-projection-dump@1.2.1,
  baseDigest=8eaf11fc761a49ff51e52844ac610c993f43b7443c173e3b2d7d6f73f3cc5d8b,
  overlayEventIds starts [fyd-ovl-mufh0cte-41aef0c10164, ...].
- tenant-e2e-synth.json — 7261 bytes, mtime Sep 27 21:05.
  meta: dumpedAt=2026-09-28T03:05:51.401067+00:00 (Sep 27 21:05 MDT),
  dumperVersion=fyd-projection-dump@1.2.1.
- happy-place-carpentry-decks-fences-remod-2f7098.json — 13006 bytes, mtime
  Sep 26 18:45. meta: dumpedAt=2026-09-27T00:45:44.455Z,
  dumperVersion=fyd-presence-compiler@1.0.0 (different dumper), overlayEventIds=[].
- ping-fyd.json — 6515 bytes, mtime Sep 21 20:46. No meta header (older format;
  starts directly with "graph").
- Backups in dir: happy-place.json.bak-prod2-20260928T032404Z (Sep 27 20:09),
  happy-place.json.lane-c-backup (Sep 21 14:37), bak-20260924*/ dirs, _compiler/ dir.
- Note: projection mtimes 17:04 and 18:15 exactly track the two most recent
  journal updates (journal mtime 18:15).

## DUMP TOOLING

- Path: /home/nolan/projects/ping/tools/fyd-site-projection/dump.py
  (plus __pycache__/dump.cpython-314.pyc, test_dump.py)
- Journal resolution (dump.py line 92):
  `OVERLAY_JOURNAL = os.environ.get("FYD_OVERLAY_JOURNAL", "main")`
- "demo" mode reads overlays from the repo-booted JSONL journal gateway at
  `FYD_JOURNAL_GATEWAY_URL` (default http://127.0.0.1:18199) — the store the
  customize approve route journals to and the store the :3100 FYD site server reads.
- "main" mode reads from the 8080 deployment gateway's Postgres via the
  ping-gateway container (`FYD_MAIN_GATEWAY_URL`, default http://127.0.0.1:8080);
  currently fails closed as unreadable-marker until FYD_SITE_OVERLAY lands in the
  main registry (FL-20260921-231). Docstring: the demo Postgres shadow
  (ping-test-pg:55433, db ping-fyd-demo) was retired as a read source 2026-09-24
  (double-apply abort); rows left intact.
- :8080 main gateway state: **listening on *:8080 with no WSL process
  attribution in ss**, and `GET /` returns **404** (prior expectation of 503 was
  wrong; something answers 404 at root). No "gateway" process in ps.

## ROUTES PRESENT (served tree)

- Site pages (static per-site routes; NO src/app/sites/[site] param route):
  - src/app/sites/page.tsx
  - src/app/sites/layout.tsx
  - src/app/sites/happy-place/page.tsx
  - src/app/sites/coppersmith-plumbing/page.tsx
  - src/app/sites/_shared/site-client.tsx (references NEXT_PUBLIC_FYD_DEMO_OWNER_MODE)
  - src/app/sites/_shared/site-metadata.ts
- Customize API: src/app/api/fyd/customize/route.ts (gates on
  NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1, line 74)
- Ask route: src/app/api/fyd/ask/route.ts (+ ask-pipeline.ts, ask/[siteId]/)
- Why-this route: src/app/api/fyd/why-this/route.ts
- Also present: /api/fyd/claims/[resourceId], /api/fyd/edge/object/route.ts,
  /api/fyd/objects/[objectId]/overrides/route.ts
- /api/readyz (served, live): {"ok":true,"ready":true,"service":"fyd","at":"2026-09-29T00:26:58.688Z"}

## BUILD-IDENTITY SEAM

- **None found.** Grepped the demo routes (src/app/sites, src/app/api/fyd) for
  BUILD_ID, buildId, NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA, gitCommitSha, __BUILD,
  build_id: zero matches.
- /api/diagnostics contains only a `sharp` sub-route.
- .next/diagnostics/build-diagnostics.json contains only
  buildStage=static-generation and buildOptions.useBuildWorker=true; no commit/branch.
- /api/readyz exposes no build identity (only service name + timestamp).
- In short: there is NO way for the served demo to report which HEAD/branch/BUILD_ID
  it was built from. Source-vs-serve binding is not introspectable at runtime.

## SOURCE-vs-SERVE SKEW

- Build time (BUILD_ID mtime): 2026-09-27 21:00:24 MDT.
- HEAD commit: f877c3919941978f07d5014909595df4751ec258, committed 2026-09-28
  16:59:43 MDT — ~20h AFTER the build.
- Tree dirty: 144 modified/untracked files.
- **Every demo-route source file checked is newer than the build** (find
  -newermt "2026-09-27 21:00" under src/app/sites, src/app/api/fyd,
  tools/fyd-site-projection, tools/fyd-journal-gateway): both site page.tsx
  files, _shared/site-client.tsx, _shared/site-metadata.ts, ask/route.ts,
  ask-pipeline.ts, customize/route.ts, why-this/route.ts,
  objects/[objectId]/overrides/route.ts, edge/object/route.ts, dump.py,
  journal-gateway server.mjs, start.sh, README.md.
- CONCLUSION: :3100 serves a build that predates the current source tree and the
  current HEAD commit. Source tree ≠ served bytes today.
