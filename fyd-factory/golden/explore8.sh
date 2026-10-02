#!/bin/bash
cd /home/nolan/projects/ping
echo "=== fyd-tenant-graph happy-place entry ==="
sed -n '90,140p' src/fyd/data/fyd-tenant-graph.ts
echo "=== presentationIntent shape ==="
grep -n "presentationIntent" src/fyd/data/ping-object-source.ts | head -5
echo "=== :3100 listener ==="
(ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null) | grep ":3100" | head -5
echo "=== commit dates ==="
git log -1 --format="%H %ad %s" --date=iso HEAD
git -C /home/nolan/projects/happy-place-platform log -1 --format="%H %ad %s" --date=iso HEAD
git cat-file -t 3e30503b3b819d820c276d4dc379048baba7c27e 2>&1
git log -1 --format="%ad %s" --date=iso 3e30503b3b819d820c276d4dc379048baba7c27e 2>&1
