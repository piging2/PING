#!/bin/bash
# READ-ONLY secret-hygiene audit, PIG plane. Prints NAMES/flags/counts only; values never printed.
set -u
echo "=== runtime env var NAMES per container (docker exec env | cut; values suppressed) ==="
for c in ping-gateway ping-rc-gateway brain-postgres brain-qdrant ping-vault ping-redis ping-postgres ping-test-pg open-webui; do
  echo "--- $c ---"
  docker exec "$c" sh -c 'env' 2>/dev/null | cut -d= -f1 | sort -u | grep -viE '^(PATH|HOME|HOSTNAME|PWD|SHLVL|LANG|LC_|TERM|_)$' || echo "(exec failed / empty)"
done
echo
echo "=== secret-ish env names across all above (flag list) ==="
for c in ping-gateway ping-rc-gateway brain-postgres brain-qdrant ping-vault ping-redis ping-postgres ping-test-pg open-webui; do
  hits=$(docker exec "$c" sh -c 'env' 2>/dev/null | cut -d= -f1 | grep -iE 'pass|secret|token|key|cred|auth|bearer' | sort -u | tr '\n' ' ')
  echo "$c :: ${hits:-(none)}"
done
echo
echo "=== ping-gateway mounts (src -> dst, RW flag) ==="
docker inspect ping-gateway --format '{{range .Mounts}}{{.Type}} {{.Source}} -> {{.Destination}} RW={{.RW}}{{println}}{{end}}'
echo
echo "=== ping-vault dev mode: root-token presence in logs (COUNT only, never the value) ==="
docker logs ping-vault 2>&1 | grep -ciE 'root token' || echo 0
echo "=== ping-vault: unseal-key presence in logs (COUNT only) ==="
docker logs ping-vault 2>&1 | grep -ciE 'unseal key' || echo 0
echo
echo "=== .env / credential file PRESENCE on Pig (names+perms only, never contents) ==="
for p in /mnt/c/Users/nolan/PING/.env /home/nolan/ping/.env /home/nolan/PING/.env /home/nolan/.pgpass /home/nolan/.netrc /home/nolan/.aws/credentials; do
  if [ -e "$p" ]; then stat -c '%a %n' "$p"; else echo "absent: $p"; fi
done
echo "--- find .env files under /home/nolan (depth 3, names only) ---"
find /home/nolan -maxdepth 3 -name '.env*' -not -path '*/node_modules/*' -printf '%M %p\n' 2>/dev/null | head -30
echo
echo "=== compose.yaml env_file references (paths only) ==="
grep -n -A4 'env_file' /mnt/c/Users/nolan/PING/compose.yaml 2>/dev/null | grep -oE '[^ ]*\.env[^ ]*' | sort -u || echo "(no compose.yaml or no env_file)"
echo "=== secret-ish env assignments in compose.yaml (NAME + INTERPOLATED/LITERAL only) ==="
grep -nE '^\s*-?\s*[A-Za-z_][A-Za-z0-9_]*\s*[:=]' /mnt/c/Users/nolan/PING/compose.yaml 2>/dev/null | grep -iE 'pass|secret|token|key|cred|auth|bearer' | while IFS=: read -r ln rest; do
  name=$(echo "$rest" | sed -E 's/^\s*-?\s*([A-Za-z_][A-Za-z0-9_]*).*/\1/')
  if echo "$rest" | grep -qE '\$\{|\$[A-Za-z_]'; then tag=INTERPOLATED; else tag=LITERAL-VALUE-IN-FILE; fi
  echo "line $ln :: $name :: $tag"
done
echo
echo "=== qdrant API key configured? (env name presence only) ==="
for c in brain-qdrant ping-qdrant; do
  echo "$c :: $(docker exec $c sh -c 'env' 2>/dev/null | cut -d= -f1 | grep -ciE 'qdrant.*(key|token|api)' || echo 0) qdrant-key-ish vars"
done
echo
echo "=== open-webui: any API-key-ish env names ==="
docker exec open-webui sh -c 'env' 2>/dev/null | cut -d= -f1 | grep -iE 'key|token|secret|auth' || echo "(none)"
