#!/bin/bash
echo "=== qdrant snapshots INSIDE container ==="
docker exec ping-qdrant ls -lht /qdrant/snapshots/ 2>&1 | head -10
docker exec ping-qdrant ls -lht /qdrant/snapshots/knowledge/ 2>&1 | head -10
echo "=== backup artifacts anywhere on host ==="
find /opt /home /srv /var/backups -maxdepth 5 \( -name "*.sql.gz" -o -name "*.dump" -o -name "*backup*" -o -name "*.snapshot" -o -name "*.tar.gz" \) 2>/dev/null | grep -v -e proc -e sys | head -20
echo "=== backup cron ==="
crontab -l 2>/dev/null | head -10; echo "---system cron---"; ls /etc/cron.d/ 2>/dev/null | head; grep -rl "backup\|pg_dump\|snapshot" /etc/cron.d/ 2>/dev/null | head -3
echo "=== gateway last restart reason (logs tail, read-only) ==="
docker logs --tail 15 ping-gateway 2>&1 | head -20
echo "=== unknown :46699 listener ==="
ss -tlnp 2>/dev/null | grep 46699
