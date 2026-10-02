#!/bin/bash
# swarm-08 probe 4: read mission_control.js lines 120-681 (read-only)
set -u
sed -n '120,400p' /home/nolan/ping/gateway/routes/mission_control.js
