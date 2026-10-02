#!/bin/bash
# SWARM-01 probe 2: tenant file inventory + substrate dirs (read-only)
cd /home/nolan/projects/ping
echo "=== TENANT FILES ==="
find . -path ./node_modules -prune -o -iname "*tenant*" -print 2>/dev/null | grep -v node_modules | sort
echo "=== src/lib/ping ==="
ls -R src/lib/ping 2>/dev/null | head -60
echo "=== src/services ==="
ls -R src/services 2>/dev/null | head -40
echo "=== src/lib/infrastructure ==="
ls -R src/lib/infrastructure 2>/dev/null | head -40
echo "=== src/fyd/tenant src/fyd/boundary src/fyd/identity ==="
ls -R src/fyd/tenant src/fyd/boundary src/fyd/identity 2>/dev/null | head -60
echo "=== src/app/api/ping routes ==="
find src/app/api/ping -type f | sort | head -60
echo "=== src/app/api top ==="
find src/app/api -maxdepth 2 -type d | sort | head -40
