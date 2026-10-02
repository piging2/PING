#!/bin/bash
cd /home/nolan/ping
echo "=== _buildReplayEvents ==="; sed -n '424,470p' ping-runtime/workers/canonical_workers.js
echo "=== git/patch/commit in canonical_workers ==="; grep -n "git\|child_process\|execSync\|spawn" ping-runtime/workers/canonical_workers.js | head -10
echo "=== synthesize in cognitive supervisor ==="; sed -n '180,259p' runtime/cognitive/supervisor.py
