#!/bin/bash
# WIRING reconcile (a): add lane K 13th class UNSUPPORTED to BCQ kit FailureCode.
# Target: isolated worktree /home/nolan/projects/ping-bcq-substrate, branch lane/bcq-connector-substrate.
# No commits; uncommitted diff only.
set -e
WT=/home/nolan/projects/ping-bcq-substrate
cd "$WT"
echo "== repo check =="
git worktree list --porcelain | head -6
git branch --show-current
git status --short | head -10
F=src/fyd/connectors/kit/types.ts
echo "== enum before =="
grep -n "PERMANENT = 'PERMANENT'" "$F"
echo "== check for exhaustiveness switches on FailureCode =="
grep -rn "FailureCode\." src/fyd/connectors/kit/*.ts | grep -v "types.ts" | head -20
