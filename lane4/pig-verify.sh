#!/bin/bash
# LANE 4 SECURITY POSTURE REVIEW — PIG plane verification. STRICTLY READ-ONLY.
# Redaction method: print key NAMES, line numbers, perms, counts, value-lengths
# (lengths prove literal-vs-interpolated without revealing values). NEVER values.
set -u
echo "===== [P1] docker-compose.yml literal POSTGRES_PASSWORD ====="
DC=/mnt/c/Users/nolan/PING/docker-compose.yml
if [ -f "$DC" ]; then
  stat -c 'perms=%a owner=%U:%G mtime=%y size=%s file=%n' "$DC"
  echo "--- POSTGRES_PASSWORD-ish lines: line :: KEYNAME :: INTERPOLATED|LITERAL :: valuelen ---"
  grep -nE 'POSTGRES_PASSWORD' "$DC" | while IFS=: read -r ln rest; do
    name=$(printf '%s' "$rest" | sed -E 's/^[[:space:]-]*([A-Za-z_][A-Za-z0-9_]*).*/\1/')
    # extract raw value text after = or : for length measurement only
    vlen=$(printf '%s' "$rest" | sed -E 's/^[^=:]*[=:]//' | tr -d ' \t"' | wc -c)
    if printf '%s' "$rest" | grep -qE '\$\{[^}]+\}|\$[A-Za-z_]'; then tag=INTERPOLATED; else tag=LITERAL-VALUE-IN-FILE; fi
    echo "line $ln :: $name :: $tag :: valuelen=$vlen"
  done
  echo "--- surrounding context (keys only, values redacted at source) ---"
  awk '/postgres:/{f=1} f{gsub(/: .*/," : [VALUE-REDACTED]"); gsub(/=.*/," = [VALUE-REDACTED]"); print NR": "$0} f&&/networks:|volumes:/{exit}' "$DC" | head -40
else echo "absent: $DC"; fi
echo
echo "===== [P2] .env files: perms + key-names-only + active-vs-comment counts ====="
for p in /mnt/c/Users/nolan/PING/.env /home/nolan/ping-gateway-src/gateway/.env.muse /home/nolan/ping/.env; do
  if [ -e "$p" ]; then
    stat -c 'perms=%a owner=%U:%G mtime=%y file=%n' "$p"
    echo "  key names: $(cut -d= -f1 "$p" 2>/dev/null | grep -vE '^$|^#' | sort -u | tr '\n' ' ')"
    echo "  active_assignments=$(grep -cE '^[A-Za-z_][A-Za-z0-9_]*=' "$p") commented_lines=$(grep -cE '^[[:space:]]*#' "$p")"
  else echo "absent: $p"; fi
done
echo
echo "===== [P3] ping-vault dev-mode token exposure (counts only) ====="
echo "root-token-log-lines=$(docker logs ping-vault 2>&1 | grep -ciE 'root token')"
echo "unseal-key-log-lines=$(docker logs ping-vault 2>&1 | grep -ciE 'unseal key')"
echo "vault-env-names=$(docker exec ping-vault sh -c 'env' 2>/dev/null | cut -d= -f1 | sort -u | tr '\n' ' ')"
echo "vault-image-cmd: $(docker inspect ping-vault --format '{{join .Config.Cmd " "}}' 2>/dev/null)"
echo
echo "===== [P4] gateway env: secret-ish KEY NAMES only ====="
for c in ping-gateway ping-rc-gateway brain-postgres; do
  hits=$(docker exec "$c" sh -c 'env' 2>/dev/null | cut -d= -f1 | grep -iE 'pass|secret|token|key|cred|auth|bearer' | sort -u | tr '\n' ' ')
  echo "$c :: ${hits:-(none)}"
done
echo
echo "===== [P5] broad-env-scoping check: secret-ish names on non-gateway containers ====="
for c in ping-qdrant ping-redis open-webui cosyvoice-tts ollama; do
  hits=$(docker exec "$c" sh -c 'env' 2>/dev/null | cut -d= -f1 | grep -iE 'pass|secret|token|key|cred|auth|bearer' | sort -u | tr '\n' ' ')
  echo "$c :: ${hits:-(none)}"
done
echo
echo "===== [P6] secret-value leakage probe in gateway logs (values redacted, presence counts only) ====="
LG=$(docker logs ping-gateway 2>&1 | tail -5000)
echo "MUSE_LEVEL_1_KEY-assignments-in-logs=$(printf '%s' "$LG" | grep -cE 'MUSE_LEVEL_1_KEY=[^ ]' || true)"
echo "MUSE_LEVEL_2_KEY-assignments-in-logs=$(printf '%s' "$LG" | grep -cE 'MUSE_LEVEL_2_KEY=[^ ]' || true)"
echo "POSTGRES_PASSWORD-assignments-in-logs=$(printf '%s' "$LG" | grep -cE 'POSTGRES_PASSWORD=[^ ]' || true)"
echo "sk-ant-looking-strings=$(printf '%s' "$LG" | grep -cE 'sk-ant-[A-Za-z0-9_-]{8,}' || true)"
echo
echo "===== [P7] crons / scheduled tasks on Pig WSL ====="
crontab -l 2>&1 | head -5
echo "--- /etc/cron.d ---"; ls /etc/cron.d/ 2>/dev/null
echo "--- systemd timers ---"; systemctl list-timers --no-pager 2>/dev/null | head -8 || echo "(no systemd)"
echo
echo "===== [P8] brain-postgres backup evidence (names+meta only) ====="
docker exec brain-postgres sh -c 'ls -la /var/lib/postgresql/data/backup* /var/lib/postgresql/data/*.gz /var/lib/postgresql/data/*.sql 2>/dev/null' || echo "(no backup files inside brain-postgres data dir)"
echo "--- volume compose_postgres_data mountpoint perms ---"
docker volume inspect compose_postgres_data --format '{{.Mountpoint}}' 2>/dev/null
echo
echo "===== [P9] docker-compose projects on Pig (which compose files exist) ====="
ls -la /mnt/c/Users/nolan/PING/compose.yaml /mnt/c/Users/nolan/PING/docker-compose.yml 2>&1
docker compose ls 2>/dev/null || docker-compose ls 2>/dev/null || echo "(compose ls unavailable)"
echo "--- compose project labels per container (names only) ---"
for c in ping-qdrant ping-redis ping-vault brain-postgres ping-postgres; do
  echo "$c :: $(docker inspect "$c" --format '{{index .Config.Labels "com.docker.compose.project"}}/{{index .Config.Labels "com.docker.compose.project.config_files"}}' 2>/dev/null)"
done
echo
echo "===== [P10] FYD repo state (piging2/fyd) ====="
git -C /home/nolan/projects/ping rev-parse HEAD 2>&1
git -C /home/nolan/projects/ping status -sb 2>&1 | head -5
git -C /home/nolan/projects/ping cat-file -t a69bb68f 2>&1
echo "--- any .env files tracked in git (names only) ---"
git -C /home/nolan/projects/ping ls-files | grep -E '\.env' | head -20 || echo "(none tracked)"
echo "--- pre-deploy secret scan artifacts (names only) ---"
find /home/nolan/projects/ping -maxdepth 3 \( -iname '*secret*scan*' -o -iname '*scan*secret*' -o -iname 'pre-deploy*' -o -iname '*gitleaks*' \) -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | head -10
echo "--- vercel.json / vercel-related config (names) ---"
find /home/nolan/projects/ping -maxdepth 2 -iname '*vercel*' -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | head -10
echo DONE
