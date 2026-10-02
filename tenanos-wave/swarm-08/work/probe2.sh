#!/bin/bash
# swarm-08 probe 2: locate gateway / mission backend repos on the Pig
set -u
echo "=== projects dir ==="
ls /home/nolan/projects/ 2>/dev/null
echo "=== find mission_control.js anywhere in home (bounded, excl node_modules) ==="
timeout 60 find /home/nolan -name 'mission_control.js' -not -path '*/node_modules/*' 2>/dev/null | head -10
echo "=== find gateway dirs ==="
timeout 60 find /home/nolan -maxdepth 4 -type d -name 'gateway' -not -path '*/node_modules/*' 2>/dev/null | head -10
echo "=== find *MissionControl* tsx/ts ==="
timeout 60 find /home/nolan/projects -iname '*missioncontrol*' -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | head -20
echo "=== port 3100 server cwd ==="
ls -l /proc/22198/cwd 2>/dev/null || echo "pid 22198 not readable"
echo "=== docker: ping-gateway container ==="
docker ps --format '{{.Names}}\t{{.Ports}}' 2>/dev/null | head -20 || echo "no docker"
