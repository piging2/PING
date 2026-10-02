#!/bin/bash
# SWARM-01 probe 1: repo structure + tenant surface inventory (read-only)
cd /home/nolan/projects/ping
echo "=== SRC TREE (depth 3) ==="
find src -maxdepth 3 -type d | sort
echo "=== ROOT FILES ==="
ls -la | head -40
echo "=== TENANT.PING CONFIG ==="
find . -path ./node_modules -prune -o -name "*tenant*" -print 2>/dev/null | grep -v node_modules | head -40
echo "=== GREP tenant (filenames, ts/tsx/py/js, excl node_modules) ==="
grep -rl "tenant" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.py" --include="*.json" src scripts 2>/dev/null | grep -v node_modules | head -80
