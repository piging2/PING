#!/bin/bash
# Locate event_registry.json in the gateway runtime (src + container)
echo "== disk gateway src =="
ls -d /home/nolan/ping-gateway-src 2>/dev/null || echo "no /home/nolan/ping-gateway-src"
find /home/nolan/ping-gateway-src -maxdepth 3 -name "event_registry.json" 2>/dev/null | head -3
echo "== containers =="
docker ps --format '{{.Names}}\t{{.Image}}\t{{.RunningFor}}' 2>/dev/null | head -10
echo "== registry in ping-gateway container =="
docker exec ping-gateway find /app -maxdepth 4 -name "event_registry.json" 2>/dev/null | head -3
