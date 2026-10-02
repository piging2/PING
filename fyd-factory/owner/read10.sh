#!/bin/bash
set -e
cd /home/nolan/projects/ping
echo "===== owner-events.ts (head 80) ====="
head -80 src/fyd/object/owner-events.ts
echo ""
echo "===== owner-store.ts (head 60) ====="
head -60 src/fyd/object/owner-store.ts
