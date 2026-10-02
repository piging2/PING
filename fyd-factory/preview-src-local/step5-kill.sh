#!/bin/bash
set -uo pipefail
# Kill the stuck Next.js server
pkill -f "next start -p 3102" 2>/dev/null || true
sleep 2
echo "Server killed"
ps aux | grep "next start" | grep -v grep | wc -l
