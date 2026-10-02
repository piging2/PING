#!/bin/bash
echo "### served site identity: /home/nolan/projects/ping"
cd /home/nolan/projects/ping 2>/dev/null && git rev-parse HEAD 2>/dev/null; git status --short 2>/dev/null | head -5; git log -1 --format=%ci 2>/dev/null
ls /home/nolan/projects/ping/src/fyd/social/actions.ts 2>/dev/null && echo "HAS src/fyd/social/actions.ts"
echo "### other deploys"
for d in ping-deploy-head ping-fyd-deploy; do
  echo "--- $d:"; cd /home/nolan/projects/$d 2>/dev/null && git rev-parse HEAD 2>/dev/null && git log -1 --format=%ci 2>/dev/null
done
echo "### diff served vs sprint worktree (quick)"
diff -rq /home/nolan/projects/ping/src/fyd/social /home/nolan/projects/ping-constitutional/src/fyd/social 2>/dev/null | head -5
echo "### gateway health route definitions"
grep -rn "get('/health\|get(\"/health\|'/health'" /home/nolan/ping/gateway/*.js 2>/dev/null | head -8
echo "### ping-rc-gateway identity"
docker inspect ping-rc-gateway --format '{{.Config.Image}} started={{.State.StartedAt}}' 2>/dev/null
echo "### ping-gateway env: what port/db (metadata only, no values)"
docker inspect ping-gateway --format '{{json .Config.Env}}' 2>/dev/null | tr ',' '\n' | grep -oE '^[A-Z_]+' | head -20
echo "### adapter reader: which gateway URL does the ADAPTER expect?"
grep -rn "GATEWAY_URL\|localhost:8080\|127.0.0.1:8080" /home/nolan/projects/ping-constitutional/src/lib/ping/ping-object-reader.ts /home/nolan/projects/ping-constitutional/src/fyd/social/config.ts 2>/dev/null | head -10
echo "### ask-fyd grant assertions"
sed -n '295,340p' /home/nolan/projects/ping-constitutional/src/fyd/ask/__tests__/ask-fyd.test.ts
