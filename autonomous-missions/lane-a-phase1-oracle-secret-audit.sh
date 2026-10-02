#!/bin/bash
# READ-ONLY secret-hygiene audit, ORACLE plane (ping-core-01).
# Prints env/mount/file NAMES ONLY. Values are never printed; every value is replaced with [REDACTED].
set -u

echo "=== ENV VAR NAMES per container (values suppressed) ==="
for c in ping-gateway ping-postgres ping-qdrant; do
  echo "--- container: $c (image config env) ---"
  docker inspect "$c" --format '{{range .Config.Env}}{{println .}}' 2>/dev/null | cut -d= -f1 | sort || echo "(inspect failed)"
done

echo
echo "=== RUNTIME env var names (docker exec env | cut) ==="
for c in ping-gateway ping-postgres ping-qdrant; do
  echo "--- container: $c (live process env) ---"
  docker exec "$c" sh -c 'env' 2>/dev/null | cut -d= -f1 | sort -u || echo "(exec failed)"
done

echo
echo "=== WHICH secrets lookups are flagged: flag any var name matching secret-ish patterns ==="
for c in ping-gateway ping-postgres ping-qdrant; do
  echo "--- $c ---"
  docker inspect "$c" --format '{{range .Config.Env}}{{println .}}' 2>/dev/null | cut -d= -f1 | \
    grep -iE 'pass|secret|token|key|cred|auth|bearer' || echo "(none)"
done

echo
echo "=== MOUNTS per container (source -> dest, read-only flag) ==="
for c in ping-gateway ping-postgres ping-qdrant; do
  echo "--- $c ---"
  docker inspect "$c" --format '{{range .Mounts}}{{.Type}} {{.Source}} -> {{.Destination}} RO={{.RW}}{{println}}{{end}}' 2>/dev/null || echo "(inspect failed)"
done

echo
echo "=== /opt/ping: secret-bearing file PRESENCE (names + perms only, never contents) ==="
find /opt/ping -maxdepth 3 \( -iname '*env*' -o -iname '*secret*' -o -iname '*cred*' -o -iname '*.pem' -o -iname '*.key' -o -iname '*pass*' -o -iname '*.pgpass' \) -printf '%M %p\n' 2>/dev/null | head -50
echo "(end of secret-file presence list)"

echo
echo "=== compose files: env var assignments as NAME + LITERAL/INTERPOLATED (values never printed) ==="
for f in $(find /opt/ping/releases -maxdepth 4 -name 'docker-compose*.yml' 2>/dev/null | head -5); do
  echo "--- $f ---"
  awk 'match($0, /^\s*-\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/, m) { v=substr($0, RSTART+RLENGTH); if (v ~ /\$\{|\$[A-Za-z_]/) tag="INTERPOLATED"; else tag="LITERAL-VALUE-PRESENT"; print m[1] " :: " tag }' "$f" | grep -iE 'pass|secret|token|key|cred|auth|bearer' || echo "(no secret-ish assignments)"
done

echo
echo "=== home/ubuntu: ssh keys / .pgpass presence (names only) ==="
ls -la ~/.ssh/ 2>/dev/null | awk '{print $1, $NF}' | head -20
test -f ~/.pgpass && echo "PGPASS-FILE-PRESENT" || echo "(no ~/.pgpass)"

echo
echo "=== crons touching ping (presence only) ==="
ls /var/spool/cron/crontabs/ 2>/dev/null; ls /etc/cron.d/ 2>/dev/null

echo
echo "=== unknown prober check: PG log lines for failed auth (counts only, no values) ==="
docker logs ping-postgres --since 72h 2>&1 | grep -c 'FATAL:' || echo 0
