#!/bin/bash
# READ-ONLY pass 2. NAMES/flags only; values never printed.
set -u
echo "=== ping-qdrant secret-ish env NAMES (names only) ==="
docker exec ping-qdrant sh -c 'env' 2>/dev/null | cut -d= -f1 | grep -iE 'key|token|secret|api' | sort -u
echo
echo "=== compose.yaml: does it exist and what services (names only) ==="
ls -la /mnt/c/Users/nolan/PING/compose.yaml 2>/dev/null
grep -nE '^[[:space:]]{2}[a-z][a-z0-9_-]+:' /mnt/c/Users/nolan/PING/compose.yaml 2>/dev/null | head -20
echo
echo "=== vault service env in compose.yaml: NAME + LITERAL/INTERPOLATED (no values) ==="
awk '/^[[:space:]]{2}vault:/,/^[[:space:]]{2}[a-z]/' /mnt/c/Users/nolan/PING/compose.yaml 2>/dev/null | grep -E '^\s+-?\s*[A-Za-z_][A-Za-z0-9_]*\s*[:=]' | while IFS= read -r line; do
  name=$(echo "$line" | sed -E 's/^\s*-?\s*([A-Za-z_][A-Za-z0-9_]*).*/\1/')
  if echo "$line" | grep -qE '\$\{|\$[A-Za-z_]'; then tag=INTERPOLATED; else tag=LITERAL-VALUE-IN-FILE; fi
  echo "$name :: $tag"
done | head -20
echo
echo "=== Pig ping-gateway: how was env injected? Config.Env NAMES (names only) ==="
docker inspect ping-gateway --format '{{range .Config.Env}}{{println .}}' 2>/dev/null | cut -d= -f1 | sort -u | head -30
echo "=== docker run provenance: labels (no compose labels expected) ==="
docker inspect ping-gateway --format '{{json .Config.Labels}}' 2>/dev/null | head -c 600; echo
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
echo
echo "=== VAULT_DEV_ROOT_TOKEN_ID: is the literal in compose config or env_file? (presence of interpolation only) ==="
grep -rn 'VAULT_DEV_ROOT_TOKEN_ID' /mnt/c/Users/nolan/PING/ 2>/dev/null | grep -v Binary | sed -E 's/=(.*)/= [value-redacted-by-audit]/' | head -5
