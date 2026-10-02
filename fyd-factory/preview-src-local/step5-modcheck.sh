#!/bin/bash
set -uo pipefail
echo "=== in clean worktree ==="
ls /home/nolan/fyd-preview-wt/src/fyd/ask/concierge.ts 2>&1
ls /home/nolan/fyd-preview-wt/src/fyd/owner-mode/demo-owner-console.tsx 2>&1
echo "=== in main repo (dirty tree) ==="
ls /home/nolan/projects/ping/src/fyd/ask/concierge.ts 2>&1
ls /home/nolan/projects/ping/src/fyd/owner-mode/demo-owner-console.tsx 2>&1
echo "=== what ask/owner-mode have in worktree ==="
ls /home/nolan/fyd-preview-wt/src/fyd/ask/ | head -20
ls /home/nolan/fyd-preview-wt/src/fyd/owner-mode/
