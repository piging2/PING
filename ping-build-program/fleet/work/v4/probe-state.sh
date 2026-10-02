#!/bin/bash
echo "=== backup artifacts (/opt/ping/backups) ==="
ls -lht /opt/ping/backups/ 2>/dev/null | head -25
echo "=== qdrant snapshots ==="
ls -lht /qdrant/snapshots/ 2>/dev/null | head -10
ls -lht /qdrant/snapshots/knowledge/ 2>/dev/null | head -10
find / -maxdepth 4 -name "*.snapshot" -newermt "2026-09-17" 2>/dev/null | head -10
echo "=== qdrant collection knowledge ==="
curl -s -m 10 http://127.0.0.1:6333/collections/knowledge 2>/dev/null | head -c 600; echo
echo "=== host memory ==="
free -m
echo "=== swap ==="
swapon -s 2>/dev/null; echo "swap_exit=$?"
echo "=== disk ==="
df -h / /opt 2>/dev/null
echo "=== OOM kills in journal (96h) ==="
journalctl --since "4 days ago" -k 2>/dev/null | grep -ci "out of memory\|oom-kill" || echo "no journal access"
echo "=== RPO/RTO docs ==="
grep -ril "rpo\|rto" /opt/ping/*.md /opt/ping/docs/ 2>/dev/null | head -5 || echo "no docs dir hits"
