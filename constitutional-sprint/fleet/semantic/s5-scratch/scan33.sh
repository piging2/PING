#!/bin/bash
cd /home/nolan/ping
echo "=== canonical_workers ReplayWorker ==="; sed -n '255,365p' ping-runtime/workers/canonical_workers.js
echo "=== agents/replay_worker.js importers ==="; grep -rln "agents/replay_worker" --include='*.js' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v worktrees | head -5
