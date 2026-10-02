#!/bin/bash
# swarm-08 probe 30: checkpoint table + replay provider stats (read-only, final probe)
set -u
echo "### checkpoint table name ==="
grep -n "FROM \|INSERT INTO\|checkpoints" /home/nolan/ping/gateway/repositories/checkpoint_repository.js | head -8
echo ""
echo "### kernel_replay_execution_provider getStats ==="
grep -n "getStats\|_engineVersion\|this\._replays\|this\._events\|this\._failures" /home/nolan/ping/gateway/kernel_replay_execution_provider.js | head -12
echo ""
echo "### tag check (read-only) ==="
cd /home/nolan/projects/ping && git tag -l "tenanos-wave-base-20260923" && git rev-parse "tenanos-wave-base-20260923^{commit}" 2>/dev/null
