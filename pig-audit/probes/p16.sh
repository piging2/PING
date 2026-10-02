#!/bin/bash
cd /home/nolan/ping
echo "=== JS spawning python / child_process in gateway+ping-runtime (live paths) ==="
grep -rn "child_process" --include="*.js" gateway ping-runtime | grep -v node_modules | grep -vE "generated|test|spec|harness|audit|report" | head -20
echo "=== 'python' string in gateway/ping-runtime JS ==="
grep -rln "python3\|python " --include="*.js" gateway ping-runtime | grep -v node_modules | head -10
echo "=== python DB: which DB does runtime use ==="
grep -rn "POSTGRES\|DATABASE_URL\|psycopg\|5432" --include="*.py" runtime/constitutional_runtime.py runtime/supervisor.py 2>/dev/null | head -10
echo "=== python requirements for DB ==="
ls runtime/*.py | head; grep -rn "database.*crx\|dbname.*crx" --include="*.py" runtime 2>/dev/null | head -5
