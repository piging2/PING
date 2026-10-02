#!/bin/bash
cd /home/nolan/ping
echo "=== event_queue.js: emit / emitChain / persistence (1-205) ==="
cat -n ping-runtime/orchestration/execution/event_queue.js | sed -n '26,180p'
