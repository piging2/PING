#!/bin/bash
echo "=== existing backup artifacts ==="
ls -lat /home/ubuntu/backups 2>/dev/null | head; echo "---"
ls -lat /opt/ping/backups 2>/dev/null | head; echo "---"
find /home/ubuntu /opt/ping -maxdepth 3 -name '*.dump' -o -maxdepth 3 -name '*.sql*' 2>/dev/null | head -10
echo "=== crontab ==="
crontab -l 2>&1; echo "--- root crontab:"; sudo -n crontab -l 2>&1 | head -5
echo "=== pg tools ==="
docker exec ping-postgres pg_dump --version 2>&1
echo "=== DB size ==="
docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT pg_size_pretty(pg_database_size('crx_runtime'));" 2>&1
echo "=== table/row counts (top tables) ==="
docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT 'ping_events:' || count(*) FROM ping_events;" 2>&1
docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT tablename FROM pg_tables WHERE schemaname='public';" 2>&1 | head -20
echo "=== disk space ==="
df -h / /var/lib/docker 2>/dev/null | head -5
echo "=== off-host infra? (existing rsync targets, rclone, s3 config) ==="
which rclone aws 2>/dev/null; ls ~/.config/rclone 2>/dev/null || echo "no rclone config"
cat /home/ubuntu/.ssh/config 2>/dev/null | head -10 || echo "no ssh config"
echo "=== docker images available for isolated restore ==="
docker images --format '{{.Repository}}:{{.Tag}}' | grep -e postgres -e qdrant
