#!/bin/bash
set -uo pipefail
echo "=== find main repo ==="
ls -d /home/nolan/projects/* 2>/dev/null | head -10
echo ""
echo "=== worktree git remote ==="
cd /home/nolan/fyd-preview-wt && git remote -v 2>&1 | head -5
echo ""
echo "=== worktree git status (should be clean except preview files) ==="
cd /home/nolan/fyd-preview-wt && git status --short | head -20
