#!/bin/bash
cd /home/nolan/projects/ping
echo "=== css imports in fyd ==="; grep -rln "\.css['\"]" src/fyd --include="*.tsx" --include="*.ts" | head -20
echo "=== jest css handling ==="; grep -n "css\|moduleNameMapper" src/fyd/jest.config.cjs jest.config.* 2>/dev/null | head
echo "=== tsx --help require/import ==="; ./node_modules/.bin/tsx --help 2>&1 | grep -i "require\|import\|preload" | head
