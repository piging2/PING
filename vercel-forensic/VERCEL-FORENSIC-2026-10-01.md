# Vercel Forensic: "No entrypoint found in /vercel/path0"
Date: 2026-10-01 ~08:05 MDT | Analyst: subagent (vercel-forensic-side-quest)
Repo: github.com/piging2/PING | Failed branch: security/secret-redaction-2026-09-28
Failed build: 2026-10-01 13:53:56 UTC (iad1), commit 9652896

## Verdict
YES. Vercel is building the repository root when the actual web application lives two levels below it at `lane-p01/tree/`. This is a deployment configuration problem, not broken code. The FYD/PING code builds green.

## 9652896 TREE
Commit 965289637c8eeb46c43f4adef33ac8e78ab00448 ("P0-SECRET-01: secret-class redaction for worker prompt construction") IS the HEAD of branch security/secret-redaction-2026-09-28. There is no diff between 9652896 and current HEAD; they are the same commit.

Repo root at 9652896:
- NO package.json (git cat-file: "path 'package.json' does not exist")
- NO vercel.json (0 matches in full recursive tree)
- NO next.config.* anywhere in the branch
- NO pnpm-workspace.yaml, turbo.json, lerna.json (no monorepo tooling)
- Root contains only: AGENTS.md, BACKLOG*.md, FAILURE_LEDGER.md, GRILLING-BRIEF.md, *.md audits, and lane dirs: bin, connectors, convergence, fyd-lane, fyd-product-lane, goals, lane-p01, mission-control, orca, orca-adapter, orca-mc-convergence, outreach, ping-ui-contract, sprint-2026-09-24, tandem, your_files
- Exactly ONE package.json in the entire branch: lane-p01/tree/package.json

## CURRENT TREE
Identical to 9652896 (same commit). No moves/renames to diff.

## ACTUAL WEB APP ROOT
`lane-p01/tree/`
- Next.js 15.5.24 (App Router: src/app/...), React 18.3.1
- Scripts: dev/build/start = next dev / next build / next start
- packageManager: npm@10.9.2; engines: node 24.x
- Routes built include: /sites/happy-place, /sites/coppersmith-plumbing, /fyd, /o/[objectId], /o/[objectId]/manage, /node/[id], /objects, /build, /mission-control, /api/fyd/ask/[siteId], middleware (32.5 kB)
- No next.config file (Next.js defaults); no vercel.json (nothing to override Root Directory)

## VERCEL CONFIGURED ROOT
UNKNOWN. Access attempts:
- custom.vercel credential = user piging85@gmail.com (piging85-8833), defaultTeamId team_Oh057Nhv2fadjIFFbEfyHC0t
- GET /v9/projects -> 0 projects (user scope and teamId scope)
- GET /v6/deployments -> 0 deployments
- GET /v2/teams -> 403 forbidden
The Vercel project that built piging2/PING lives under a different Vercel account/team than this credential can see. The failed build log proves Vercel ran "vercel build" at /vercel/path0 (repo root).

## ROOT CAUSE
Vercel's project Root Directory points at the repository root, but the branch security/secret-redaction-2026-09-28 has no application at its root. Vercel found no package.json, detected no framework, found no entrypoint file -> "No entrypoint found in /vercel/path0".

Contributing history:
- Branch origin/fyd-deploy DOES have a full Next.js app at repo root (package.json, next.config.ts, vercel.json with framework: nextjs, buildCommand "npm run build", outputDirectory ".next", installCommand "npm install --include=optional"). The Vercel project was almost certainly configured against the fyd-deploy branch shape (root = app).
- The failing deployment targeted security/secret-redaction-2026-09-28, whose root never had an app (that branch's web app has always lived at lane-p01/tree/).
- Fix is configuration, not code.

## LOCAL PROD BUILD: PASS
- SHA: 965289637c8eeb46c43f4adef33ac8e78ab00448 (fresh git worktree, detached HEAD)
- APP ROOT: lane-p01/tree
- PACKAGE MANAGER: npm 10.9.4 (repo pins npm@10.9.2)
- NODE VERSION: v24.20.0 (engines: 24.x)
- INSTALL COMMAND: npm install --include=optional --no-audit --no-fund -> 729 packages, exit 0, no errors
- BUILD COMMAND: npm run build (next build) -> exit 0
- OUTPUT (tail): full route manifest; /sites/happy-place + /sites/coppersmith-plumbing + /fyd + object routes all generated; First Load JS shared 103 kB; middleware 32.5 kB. No build errors.
- Note: /tmp is a 512MB tmpfs and filled during first install attempt (ENOSPC corrupted it); redo under ~/workspace succeeded. node_modules/.next removed after proof to save space; worktree retained.

## VERCEL BUILD
Not triggered (per task constraint). Config state only: Root Directory unknown (see above); the build will keep failing until Root Directory is set to lane-p01/tree.

## WHAT THE FIX IS
In the Vercel dashboard for the PING project: Settings -> General -> Root Directory -> set to `lane-p01/tree`. Then redeploy the security/secret-redaction-2026-09-28 branch. No code changes. Do NOT add root app.js/index.js/server.js, do NOT add a fake package.json main, do NOT move the app, do NOT duplicate it.

WHO MUST APPLY IT: Nolan (or whoever owns the Vercel project) in the Vercel dashboard. The connected custom.vercel credential cannot see the project, so this cannot be applied via API from here. To grant API access later: connect the Vercel account/team that owns the project, or have the owner apply the one-field change.

Alternative (not recommended): switch the production branch back to fyd-deploy (root app), but that deploys different code than the security branch; per the deployment law, fix the Root Directory instead.

## DEPLOYED URL
Unknown. No PING deployment URL is documented in the repo. (Only happy-place-platform.vercel.app appears, an unrelated demo reference.)

## Evidence retained
- Bare clone: ~/workspace/vercel-forensic/ping-repo (branch security/secret-redaction-2026-09-28)
- Worktree at 9652896: ~/workspace/vercel-forensic/wt-9652896
- This report: ~/workspace/vercel-forensic/VERCEL-FORENSIC-2026-10-01.md
