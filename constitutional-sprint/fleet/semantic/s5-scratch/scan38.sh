#!/bin/bash
cd /home/nolan/ping
echo "=== gateway/replay/kernel ==="; ls gateway/replay/kernel/ 2>/dev/null | head -20; echo "exit=$?"
echo "=== what _buildReplayEvents returns ==="; grep -n "_buildReplayEvents" ping-runtime/workers/canonical_workers.js | head -3
