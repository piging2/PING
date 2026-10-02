#!/bin/bash
# swarm-08 probe 17: dead letter authority methods, replay provider, orca orig-engine, ops dashboard (read-only)
set -u
echo "### dead_letter_authority methods ==="
grep -n "async getStats\|async getDeadLettersByJobType\|async getDeadLettersByMission\|CREATE TABLE" /home/nolan/ping/gateway/dead_letter_authority.js | head -10
echo ""
echo "### replay provider getStats ==="
timeout 60 grep -rn "getStats" /home/nolan/ping/ping-runtime/replay/*.js 2>/dev/null | head -5
timeout 60 find /home/nolan/ping/ping-runtime -iname '*replay*' -not -path '*/node_modules/*' 2>/dev/null | grep -v dormant | head -8
echo ""
echo "### orca orig-engine still in repo? ==="
timeout 60 find /home/nolan/ping -name 'orig-engine.js' -not -path '*/node_modules/*' 2>/dev/null | grep -v worktrees | head -3
echo ""
echo "### ops.js dashboard route ==="
grep -n "router.get\|/dashboard" /home/nolan/ping/gateway/routes/ops.js | head -20
