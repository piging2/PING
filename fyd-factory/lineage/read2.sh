#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== data dir ====="
ls -la src/fyd/data/
echo "===== builder/dogfood ====="
ls -la src/fyd/builder/dogfood/ 2>/dev/null
echo "===== where do coppersmith/happy-place facts live ====="
grep -rl "coppersmith" src --include="*.ts" --include="*.tsx" --include="*.json" -i | grep -vi test | grep -vi node_modules | head -30
