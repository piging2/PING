#!/bin/bash
echo "=== docker ps ==="
docker ps --format '{{.Names}}|{{.Image}}|{{.Status}}' 2>/dev/null
echo "=== inspect: memory limits, healthcheck, restart ==="
for c in ping-gateway ping-postgres ping-qdrant; do
  echo "--- $c ---"
  docker inspect "$c" 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)[0]
hc=d['HostConfig']
print('Memory(limit bytes):', hc.get('Memory'))
print('MemorySwap:', hc.get('MemorySwap'))
print('RestartPolicy:', hc.get('RestartPolicy',{}).get('Name'))
cfg=d['Config']
print('Healthcheck:', cfg.get('Healthcheck'))
print('State.Health:', d['State'].get('Health',{}).get('Status'))
"
done
echo "=== docker stats (one shot) ==="
docker stats --no-stream --format '{{.Name}}|{{.MemUsage}}|{{.MemPerc}}' 2>/dev/null
echo "=== exit 137 / OOM in events ==="
docker events --since '96h' --filter 'event=die' --format '{{.Actor.Attributes.name}} exit={{.Actor.Attributes.exitCode}}' 2>/dev/null | head -20 || echo "events not readable"
