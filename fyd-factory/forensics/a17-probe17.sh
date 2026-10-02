#!/bin/bash
# AGENT-17 probe 17: live check, remaining wiring, TD-001 (READ-ONLY)
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== LIVE: GET /api/health on Pig :3100 ==="
curl -s -m 10 http://127.0.0.1:3100/api/health | head -c 400; echo
echo "=== LIVE: GET /sites/happy-place status ==="
curl -s -m 15 -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3100/sites/happy-place
echo "=== LIVE: GET /objects (should 404 per middleware) ==="
curl -s -m 10 -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3100/objects
echo "=== newsletter subscribe caller ==="
grep -rln 'api/newsletter/subscribe' src --include='*.tsx' | grep -v 'src/app/api' | head -3
echo "=== TD-001 / narrow in ask ==="
grep -rn 'narrow' src/fyd/ask/*.ts 2>/dev/null | grep -v __tests__ | head -8
ls src/fyd/ask/ | head -20
echo "=== auth link vs google ==="
grep -n 'api/fyd/auth' src/fyd/identity/provider.ts | head -8
