# PHASE 0 — Worktree Safety Record

Date: 2026-09-23 (sprint start ~18:35 MDT)

## Directive expectation vs reality
- Directive assumed branch `constitutional-convergence-v2` already existed. It did NOT exist.
- Decision: created it fresh (non-destructive: new ref + new worktree). No existing state disturbed.

## Sprint worktree (MINE)
- Path: /home/nolan/projects/ping-constitutional
- Branch: constitutional-convergence-v2 (new)
- HEAD: a69bb68fc84620a5635e071030cf49a633df7394 ("Gate owner mutation behind demo-owner-mode", main tip)
- `git status --short`: CLEAN (empty)
- Base chosen: main tip (2 commits ahead of fyd-factory: a69bb68f, f89e9a2c). Rationale: stable constitutional base; factory lane's churn stays isolated.

## Main worktree (FACTORY LANE — DO NOT TOUCH)
- Path: /home/nolan/projects/ping
- Branch: fyd-factory @ e48ef710cb889bf4d59b833ef9766067a9e2bbf0
- Status: 66 entries — 23 modified (unstaged, 0 staged), 43 untracked
- Modified files: package.json, src/app/* (build/[siteId], o/[objectId], page.tsx, portal-rail, sites/_shared, sites/coppersmith-plumbing, sites/happy-place), src/fyd/builder/{owner-intent,site-vectors}.ts, src/fyd/components/{fyd-motion-fallback,object-affordance,renderer}.tsx, src/fyd/object/{__tests__/view.test.ts,card,evidence-chrome,node,types,view}.tsx/ts, src/fyd/preview/pipeline.ts, src/fyd/ui/{portal-circle,portal-host}.tsx, src/middleware.ts
- Untracked: .github/, geometry-regression.mjs, scripts/test-circle-reset.ts, src/app/objects/, src/fyd/ask/*, src/fyd/builder/{__tests__,infer-strategy,strategies,strategy-for-site}.*, src/fyd/components/__tests__/*, src/fyd/media/*, src/fyd/proceduralize/__fixtures__/redacted-batch-c-*, src/fyd/spatial/*, src/fyd/ui/{__tests__,follow-button,global-ask-dock,home-circles,identity-object,like-button,object-layer/*,reference-button,spatial}/
- Full list: phase0/main-worktree-status.txt, phase0/main-worktree-unstaged.txt (cached diff empty)
- Other worktrees: ping-deploy-head (detached 0dec40f5), ping-fyd-deploy (fyd-deploy ade4ee50), ping-wave1-build (detached e48ef710), ping-wave1-check (detached e48ef710) — all untouched.

## Prohibited operations (acknowledged, binding)
No: git reset / restore / checkout -- . / clean / add -A / add . / force push / history rewrite / deleting untracked files / discarding others' modifications. No commits (sprint grants none). No touching .graph/ or "stray file 0" without proven necessity. No secret exposure.

## Transport note for investigators
Remote pattern: ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -c "cd /home/nolan/projects/ping-constitutional && <cmd>"'
RULE: no pipe characters inside the remote <cmd> (transport breaks). Redirect large output to local files under ~/workspace/constitutional-sprint/<domain>/ and process locally.
