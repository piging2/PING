#!/bin/bash
# READ-ONLY pass 3 (scoped, fast). NAMES/flags only; values never printed.
set -u
echo "=== ping-qdrant secret-ish env NAMES (names only) ==="
docker exec ping-qdrant sh -c 'env' 2>/dev/null | cut -d= -f1 | grep -iE 'key|token|secret' | sort -u
echo
echo "=== compose.yaml exists? services (names only) ==="
ls -la /mnt/c/Users/nolan/PING/compose.yaml 2>/dev/null || echo "(compose.yaml not found at windows path)"
echo "=== vault service env in compose.yaml: NAME + LITERAL/INTERPOLATED (no values) ==="
python3 - << 'PYEOF' 2>/dev/null || echo "(python3 unavailable)"
import re
p='/mnt/c/Users/nolan/PING/compose.yaml'
text=open(p).read()
lines=text.split('\n')
in_vault=False; in_env=False
for i,l in enumerate(lines):
    if re.match(r'^  vault:', l): in_vault=True; continue
    if in_vault and re.match(r'^  [a-z]', l) and not re.match(r'^  vault:', l): break
    if in_vault and re.match(r'^    environment:', l): in_env=True; continue
    if in_env and re.match(r'^    [a-z]', l): in_env=False; continue
    if in_vault and in_env:
        m=re.match(r'^\s+-?\s*([A-Za-z_][A-Za-z0-9_]*)\s*[:=]', l)
        if m:
            tag="INTERPOLATED" if ("${" in l or re.search(r'\$[A-Za-z_]', l)) else "LITERAL-VALUE-IN-FILE"
            print(m.group(1), "::", tag)
PYEOF
echo
echo "=== Pig ping-gateway Config.Env NAMES (docker inspect, names only) ==="
docker inspect ping-gateway --format '{{range .Config.Env}}{{println .}}' 2>/dev/null | cut -d= -f1 | sort -u | head -30
echo
echo "=== key NAMES in /mnt/c/Users/nolan/PING/.env (names only) ==="
cut -d= -f1 /mnt/c/Users/nolan/PING/.env 2>/dev/null | sort
echo
echo "=== key NAMES in /home/nolan/ping-gateway-src/gateway/.env.muse (names only) ==="
cut -d= -f1 /home/nolan/ping-gateway-src/gateway/.env.muse 2>/dev/null | sort
echo
echo "=== key NAMES in worktree real .env files (names only) ==="
for f in /home/nolan/worktrees/ping-oracle-deploy/.env /home/nolan/worktrees/ping-oracle-deploy/.env.local; do
  echo "--- $f ---"; cut -d= -f1 "$f" 2>/dev/null | sort
done
