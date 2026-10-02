#!/bin/bash
# LANE BCQ: verification probes in the isolated worktree (read-only)
set -u
WT=/home/nolan/projects/ping-bcq-substrate
echo "=== strict? ==="
grep -n '"strict"' "$WT/tsconfig.json"
echo "=== jest config ==="
ls "$WT"/jest.config.* 2>/dev/null
grep -n "testMatch\|roots\|testEnvironment" "$WT/jest.config.cjs" 2>/dev/null | head -8
echo "=== runtimes ==="
which bun node npx 2>/dev/null
node --version 2>/dev/null
echo "=== tsc binary ==="
ls /home/nolan/projects/ping/node_modules/.bin/tsc 2>/dev/null || echo NO_TSC
