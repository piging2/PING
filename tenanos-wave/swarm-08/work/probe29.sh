#!/bin/bash
# swarm-08 probe 29: checkpoint repo + replay execution provider (read-only)
set -u
echo "### checkpoint_repository ==="
grep -n "CREATE TABLE\|async " /home/nolan/ping/gateway/repositories/checkpoint_repository.js | head -20
echo ""
echo "### KernelReplayExecutionProvider ==="
timeout 60 grep -rln "KernelReplayExecutionProvider" /home/nolan/ping --include='*.js' 2>/dev/null | grep -v node_modules | grep -v worktrees | grep -v test | head -5
