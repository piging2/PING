#!/bin/bash
cd /home/nolan/ping
echo "=== provider definition ==="; grep -n "KernelReplayExecutionProvider" ping-runtime/workers/canonical_workers.js | head -3
