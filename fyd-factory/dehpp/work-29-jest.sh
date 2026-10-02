#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== root jest config ==="
ls jest.config* 2>/dev/null; grep -n "jest" package.json | head -5
cat jest.config.cjs 2>/dev/null | head -40
echo ""
echo "=== link node_modules into worktree ==="
ln -s /home/nolan/projects/ping/node_modules /home/nolan/fyd-dehpp-wt/node_modules
ls /home/nolan/fyd-dehpp-wt/node_modules/.bin/ | grep -E "^(tsx|jest|tsc)$"
