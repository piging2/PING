#!/bin/bash
# LANE BCQ: symlink node_modules into the isolated worktree (gitignored env
# setup, NOT part of the diff), then run the scoped jest suite.
set -u
WT=/home/nolan/projects/ping-bcq-substrate
echo "=== gitignore covers node_modules? ==="
grep -n "node_modules" "$WT/.gitignore" | head -3
if [ ! -e "$WT/node_modules" ]; then
  ln -s /home/nolan/projects/ping/node_modules "$WT/node_modules"
  echo "SYMLINKED"
fi
echo "=== status (must show only src/fyd/connectors/) ==="
git -C "$WT" status --short | head
echo "=== jest scoped ==="
cd "$WT" && ./node_modules/.bin/jest --config src/fyd/connectors/kit/jest.config.cjs 2>&1 | tail -12
