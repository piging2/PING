#!/bin/bash
# swarm-08 probe 31: UI consumers of /mc/* and /orchestration/* (read-only)
set -u
echo "### fetch /mc in ping repo ==="
timeout 60 grep -rln "fetch.*['\"]\/mc\|\"\/mc\/\|'/mc/" /home/nolan/ping --include='*.js' --include='*.tsx' --include='*.ts' --include='*.html' 2>/dev/null | grep -v node_modules | grep -v worktrees | grep -v test_ | head -8
echo "### fetch /mc in constitutional-runtime ==="
timeout 60 grep -rln "'/mc/\|\"/mc/\|/orchestration/engine" /home/nolan/projects/constitutional-runtime --include='*.tsx' --include='*.ts' 2>/dev/null | grep -v node_modules | head -8
echo "### MissionControlHeader usage ==="
timeout 60 grep -rln "MissionControlHeader" /home/nolan/projects/constitutional-runtime --include='*.tsx' 2>/dev/null | grep -v node_modules | head -5
