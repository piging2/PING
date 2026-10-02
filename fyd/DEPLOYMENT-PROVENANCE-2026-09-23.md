# FYD Deployment Provenance — 2026-09-23

READ-ONLY investigation. No push, no merge, no rebase, no force, no deploy, no Vercel project created. All git commands were inspection-only (`remote -v`, `rev-parse`, `ls-remote`, `git show <sha>:<path>`, `git grep <sha>`); nothing was checked out and the dirty worktree on `fyd/builder-composition` was left untouched.

## Discrepancy resolution

The "piging2/PING has main and fyd-deploy (1 behind / 105 ahead)" view is a DIFFERENT REPOSITORY from the FYD app. Anonymous `git ls-remote` on `https://github.com/piging2/PING.git` (public) returns:

- `refs/heads/main` = `81b324805611d75e7697cf698f6f304d8914b394`
- `refs/heads/fyd-deploy` = `de4ee50127085d9be1fb3749cfec8d6de2e9719`

Neither is `a69bb68f`. `piging2/PING` is the CRX runtime mirror (the local PING repo at `/home/nolan/ping` pushes to `ngesk2/crx-runtime`, whose `main` = `6c4b5317f60b3501a5730e42c9474724c8ab1539`). Its `fyd-deploy` branch is runtime-repo work, not FYD app deployment state. It is preserved untouched and must NOT be imported into Vercel for FYD.

The FYD app remote is `git@github.com:piging2/fyd.git` (private, SSH), and there `a69bb68f` exists exactly at `refs/heads/main`.

## Report

REPOSITORY: piging2/fyd
REMOTE URL: git@github.com:piging2/fyd.git (fetch and push)
DEFAULT BRANCH: fyd/builder-composition (remote HEAD resolves to e48ef710; GitHub default is the first-pushed branch, not main)
DEFAULT SHA: e48ef710cb889bf4d59b833ef9766067a9e2bbf0
CANDIDATE BRANCH: main
CANDIDATE SHA: a69bb68fc84620a5635e071030cf49a633df7394
a69bb68f LOCATION: refs/heads/main of piging2/fyd (and nowhere else on any queried remote: not on piging2/fyd HEAD/fyd/builder-composition, not on piging2/PING main/fyd-deploy, not on ngesk2/crx-runtime main)
AHEAD: 2 (main = a69bb68f is exactly 2 commits past fyd/builder-composition = e48ef710: f89e9a2c middleware regression test, a69bb68f owner-mutation gate; merged --ff-only)
BEHIND: 0
VERCEL BUILD COMPATIBLE: YES — Next.js 15.5.24 app at repo root with a committed vercel.json (buildCommand `npm run build`, installCommand `npm install --include=optional`, outputDirectory `.next`, framework nextjs); packageManager npm@10.9.2; engines node 24.x; platform-native deps (sharp, tailwind oxide, lightningcss) declared as optionalDependencies with SHARP_IGNORE_GLOBAL_LIBVIPS=1 in vercel.json; the same app shell was previously deployed to Vercel as happy-place-platform.vercel.app; `next build` passed on the exact candidate SHA in acceptance.
PUBLIC APP REQUIRES SECRET/RUNTIME ACCESS: NO — for the proven product surface (/sites, /sites/happy-place, /sites/coppersmith-plumbing, /api/fyd/ask, visitor read paths) no secret is required and none must be provisioned. Details:
  - Mutation routes (overrides propose/approve, claims verify, customize) are fail-closed without NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 on a private host; that variable must stay UNSET on any public deployment (default OFF proven).
  - The PING journal integration (src/fyd/social/*) resolves FYD_PING_GATEWAY_BASE_URL || PING_GATEWAY_BASE_URL, defaulting to http://127.0.0.1:18199 when unset. On Vercel that loopback fails fast with connection refused; the /sites pages do not import the social readers (verified via git grep at the SHA), and Ask FYD without a gateway returns an honest `projection_unavailable` unknown (ask-pipeline.ts) rather than inventing. Per .env.example, leave gateway vars unset on Vercel "until a legitimate server-to-server gateway exists".
  - Follow/like/identity demo-state writes default to data/<name> under the working directory (FYD_FOLLOWS_DIR, FYD_LIKES_DIR, FYD_IDENTITY_DIR, FYD_CLAIM_DIR, FYD_OWNER_DIR). Vercel serverless filesystems are read-only outside /tmp, so these visitor interactions cannot persist there. This is a product-behavior caveat for the smoke test (ephemeral or erroring follow/like), NOT a secret leak and not in the directive's acceptance gate list.
  - No Postgres dependency exists in the FYD app tree (the gateway's database is backend, not bundled). No PING signing keys are needed (FYD_DEV_KEY_DIR / PING_DEV_KEY_DIR default to a Pig path but are only consumed by server-side signing features that require demo mode). Legacy happy-place env vars in .env.example (Kit, Google OAuth, Upstash Redis, Vercel Blob, Workbench password, GitHub token) belong to the legacy carpentry-site routes, not to FYD; none are required for the FYD product surface and none should be provisioned for it.
CORRECT VERCEL IMPORT TARGET: piging2/fyd — NOT piging2/PING (that is the runtime repo; importing it would deploy the wrong application, and its fyd-deploy branch is 105 commits of unrelated runtime work)
CORRECT REF: refs/heads/main (a69bb68fc84620a5635e071030cf49a633df7394). NOTE: the GitHub default branch of piging2/fyd is currently fyd/builder-composition, so a Vercel import will NOT select main automatically — main must be chosen explicitly at import (or the repo default branch changed in GitHub settings first).
DEPLOYMENT PROVENANCE: PASS — CODE (tested tree a69bb68f, 113 suites / 1237 tests) → TESTED SHA (a69bb68f, fresh-checkout acceptance: boot PASS, both /sites HTTP 200, visitor mutation DENIED, demo default OFF, tenant-specific code ZERO, secret scan CLEAN) → REMOTE SHA (origin/main of piging2/fyd = a69bb68f, verified via git ls-remote) is one continuous chain. No drift: local origin/main tracking ref matches the remote exactly.
FIRST BLOCKER: none on the technical chain. Remaining action is the operator's one-time Vercel import (vercel.com/new → Import piging2/fyd → select branch main, not the default fyd/builder-composition), then let the existing pipeline deploy it. No alternate deployment machinery was built.

## Local state observed (for the record)

- /home/nolan/projects/ping HEAD = e48ef710 on branch fyd/builder-composition, with 9 modified + ~30 untracked files from another lane's uncommitted work — left untouched.
- Local origin/main = a69bb68f, identical to the remote. The merge to main was performed in a temp worktree (since removed) via --ff-only, so main = the exact proven SHA.

## Boundary map (public deployment)

PUBLIC FYD WEB (/sites, /api/fyd read + ask)
  → SANITIZED FYD/BFF API (demo mutation endpoints: fail-closed 403 without demo-owner-mode on private host)
  → PING OBJECT/CAPABILITY RUNTIME: NOT bundled; journal reads via HTTP gateway, unset on Vercel, fail closed
  → CANONICAL EVENT/EVIDENCE SUBSTRATE: NOT reachable from the public app

Withheld from any public deployment (none required): Postgres credentials, PING signing private keys, provider secrets (Kit/Google/Upstash/Blob), raw journal access, Oracle admin credentials, Pig filesystem paths.
