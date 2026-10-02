#!/bin/bash
cd /home/nolan/ping
echo "=== bootstrap canonical worker registration 505-535 ==="; sed -n '500,535p' gateway/bootstrap/gateway_runtime.js
echo "=== mission_scheduler ==="; wc -l ping-runtime/orchestration/mission_scheduler.js; cat ping-runtime/orchestration/mission_scheduler.js
