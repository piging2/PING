#!/bin/bash
# LANE 4 — ORACLE plane verification. STRICTLY READ-ONLY. Names/counts/perms only, never values.
set -u
echo "===== [O1] UNKNOWN PROBER: exact FATAL lines from ping-postgres logs ====="
echo "--- all FATAL lines 2026-09-21..2026-09-23 (timestamps included) ---"
docker logs ping-postgres --since 2026-09-21T00:00:00Z --until 2026-09-23T23:59:59Z 2>&1 | grep -E 'FATAL' | head -30
echo "--- FATAL counts by distinct message ---"
docker logs ping-postgres --since 2026-09-21T00:00:00Z --until 2026-09-23T23:59:59Z 2>&1 | grep -oE 'FATAL:  (database|role) "[^"]+" does not exist' | sort | uniq -c
echo "--- connection-received lines in same window (source IP evidence) ---"
docker logs ping-postgres --since 2026-09-21T00:00:00Z --until 2026-09-23T23:59:59Z 2>&1 | grep -E 'connection (received|authorized)' | head -40
echo "--- log_line_prefix (does the log even record client IP?) ---"
docker exec ping-postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U ping -d crx_runtime -tAc "SHOW log_line_prefix;"' 2>&1
echo "--- log_connections / log_disconnections settings ---"
docker exec ping-postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U ping -d crx_runtime -tAc "SHOW log_connections; SHOW log_disconnections;"' 2>&1
echo
echo "===== [O2] pg_hba trust posture (config read only, no change) ====="
docker exec ping-postgres sh -c 'grep -vE "^\s*#|^\s*$" "$PGDATA/pg_hba.conf" 2>/dev/null || grep -vE "^\s*#|^\s*$" /var/lib/postgresql/data/pg_hba.conf' 2>&1 | sed -E 's/[A-Fa-f0-9]{8,}/[HEX]/g'
echo
echo "===== [O3] env file perms + key-name counts (no values) ====="
for p in /opt/ping/.env /opt/ping/infrastructure/oracle/.env /opt/ping/.env.bak-20260921-p0rotate /opt/ping/.env.bak-20260917 /opt/ping/gateway/root_private_key.pem; do
  if [ -e "$p" ]; then
    stat -c 'perms=%a owner=%U:%G mtime=%y size=%s file=%n' "$p"
    case "$p" in *.env*) echo "  key names: $(cut -d= -f1 "$p" 2>/dev/null | grep -vE '^$|^#' | sort -u | tr '\n' ' ')";; esac
  else echo "absent: $p"; fi
done
echo
echo "===== [O4] backup file: encrypted? (type+perms, not contents) ====="
for p in /opt/ping/releases/pgdata-backup-2026-09-16.sql.gz /opt/ping/releases/ping-source-clean-2026-09-16.tar.gz; do
  stat -c 'perms=%a owner=%U:%G size=%s file=%n' "$p" 2>&1
  file "$p" 2>&1
done
echo
echo "===== [O5] gateway API-auth env names (presence only) ====="
docker exec ping-gateway sh -c 'env' 2>/dev/null | cut -d= -f1 | sort -u | grep -iE 'bearer|token|auth|key|secret|pass' || echo "(no auth-ish env names)"
echo "--- gateway listening sockets (loopback vs wildcard) ---"
ss -ltnp 2>/dev/null | grep -E ':(8080|5432|6333)' || netstat -ltnp 2>/dev/null | grep -E ':(8080|5432|6333)' || echo "(ss/netstat unavailable)"
echo
echo "===== [O6] crons / timers on Oracle ====="
ls /var/spool/cron/crontabs/ 2>&1; echo "--- /etc/cron.d ---"; ls /etc/cron.d/ 2>&1
echo "--- systemd timers ---"; systemctl list-timers --no-pager 2>/dev/null | head -10 || echo "(no systemd timers listed)"
echo
echo "===== [O7] secret-value leakage probe in gateway logs (redacted presence counts) ====="
LG=$(docker logs ping-gateway 2>&1 | tail -3000)
echo "POSTGRES_PASSWORD-assignments=$(printf '%s' "$LG" | grep -cE 'POSTGRES_PASSWORD=[^ $]' || true)"
echo "BEARER/TOKEN-assignments=$(printf '%s' "$LG" | grep -ciE '(bearer|api[_-]?token)\s*[:=]\s*[^ $]' || true)"
echo "sk-ant-looking=$(printf '%s' "$LG" | grep -cE 'sk-ant-[A-Za-z0-9_-]{8,}' || true)"
echo DONE
