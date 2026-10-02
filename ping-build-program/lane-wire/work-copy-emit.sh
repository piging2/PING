#!/bin/bash
# Copy the emit function of unified_event_runtime.js (lines ~60-160) for exact dry-run formula
sed -n '55,170p' /home/nolan/ping-gateway-src/ping-runtime/events/unified_event_runtime.js > /mnt/c/Users/nolan/transfer/emit-fn.js
wc -l /mnt/c/Users/nolan/transfer/emit-fn.js
