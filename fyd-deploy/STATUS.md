# FYD UI Deploy — status 2026-09-22 ~19:15 MDT

## Done
- Worktree: /home/nolan/projects/ping-fyd-deploy (clean, branch fyd-deploy)
- Base HEAD: 0dec40f5c5823a8040bcd1f710e25c3103d499c3 (fyd/builder-composition)
- Deploy commit: ade4ee50127085d9be1fb3749cfec8d6de2e9719
  - delta vs base: narrow /build/* restriction (src/middleware.ts, 404 on /build and /build/* only)
  - plus fyd-deploy-manifest.json (DATA_MODE=PROJECTION, tenant mapping, build/test record)
  - NOT included: uncommitted grill lane work, broad Circle-Only middleware, PING core
- Gate: 1023/1023 across 21 committed jest configs, 0 failures (re-ran, did not trust remembered numbers)
- Build: production build green (exit 0)
- Smoke (local prod server, port 3210): / 200, /sites/happy-place 200,
  /sites/coppersmith-plumbing 200, /build 404, /build/abc 404, /sites/coppersmith 404 (expected)
- Ask FYD: POST /api/fyd/ask/happy-place returns evidence-bounded answer,
  answerClass supported, citations with claimClass, tenantId, no unknowns
- URL safety: 0 javascript: occurrences in rendered HTML of both sites;
  safe-link.ts neutralizes javascript:/data:/vbscript:/file:/blob: + whitespace smuggling
- Binding verifier: active (generated-presentation.ts, covered by builder tests 71/71)
- Visibility override: active (sitespec/field-visibility.ts, covered by tests)
- Viewport meta present; committed mobile fixes in base (375px status-strip, 320px Ask FYD, 44px targets)
- GitHub: branch fyd-deploy pushed to piging2/PING (ade4ee50); main untouched (81b32480, placeholder)
  - push used a temporary SSH deploy key (added via API, removed after push; Pig private key deleted)
  - repo branches now: main, fyd-deploy

## Blocked
- Vercel project creation via API: HTTP 403 "You don't have permission to create the project"
  (action create, resource project). Token pinging85-8833 is read-scoped.
  This is a known token-scope boundary, not fixable from here.
- Needed from Nolan (2 min, the HPP pattern from DEPLOYMENT.md):
  vercel.com -> Add New -> Project -> import piging2/PING -> framework Next.js -> Deploy.
  (Initial deploy targets main/placeholder; the real Preview comes from fyd-deploy next.)

## Resume plan (once the Vercel project exists)
1. Get project id/name from Nolan (or list via API).
2. Trigger Preview of fyd-deploy: push a trigger commit via SSH deploy key
   (re-add temp key, push, remove key) OR POST /v13/deployments if token allows.
3. Enable deployment protection for Preview (project settings).
4. Verify via protection-bypass: / 200, both sites 200, /build/* blocked,
   Ask FYD + citations, console/network errors, secret scan of browser bundle.
5. Viewport screenshots (320/375/desktop) via Pig Chrome CDP tunnel against Preview URL.
6. Hand Nolan the Preview URL. NEVER promote to production.

## Useful refs
- Push script (API method, unused): ~/workspace/fyd-deploy/push-via-api.py
- Screenshot script: ~/workspace/fyd-deploy/shots.js (needs CDP tunnel on 19223)
- CDP tunnel: ssh -L 19223:127.0.0.1:9223 via pig-ssh.sh
- Skills: ~/workspace/skills/vercel/bin/vercel-api.py, ~/workspace/skills/github/bin/gh-api.py
