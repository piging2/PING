#!/bin/bash
# swarm-08 probe 5: read mission_control.js lines 400-681 (read-only)
set -u
sed -n '400,681p' /home/nolan/ping/gateway/routes/mission_control.js
