#!/bin/bash
echo "=== docker ps ==="
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
echo "=== docker stats (current) ==="
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.CPUPerc}}'
echo "=== gateway inspect: network/ports/restart/health ==="
docker inspect ping-gateway --format '{{json .HostConfig.PortBindings}}' 2>/dev/null; echo
docker inspect ping-gateway --format 'Image={{.Config.Image}} Restart={{.HostConfig.RestartPolicy.Name}} Health={{json .Config.Healthcheck}}' 2>/dev/null; echo
echo "=== gateway container count on 8080/8081 ==="
docker ps --format '{{.Names}} {{.Ports}}' | grep -e 808
echo "=== compose? ==="
ls ~/docker-compose.yml /opt/*/docker-compose.yml 2>/dev/null; docker compose ls 2>/dev/null | head
echo "=== gateway entrypoint/cmd ==="
docker inspect ping-gateway --format 'Entrypoint={{json .Config.Entrypoint}} Cmd={{json .Config.Cmd}}' 2>/dev/null; echo
echo "=== gateway env KEYS only (no values) ==="
docker inspect ping-gateway --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | sed 's/=.*$/=<redacted>/'
echo "=== gateway mounts/networks ==="
docker inspect ping-gateway --format 'Mounts={{json .Mounts}}' 2>/dev/null; echo
docker inspect ping-gateway --format 'Networks={{json .NetworkSettings.Networks}}' 2>/dev/null | head -c 600; echo
echo "=== postgres/qdrant images ==="
docker inspect ping-postgres --format '{{.Config.Image}}' 2>/dev/null; echo
docker inspect ping-qdrant --format '{{.Config.Image}}' 2>/dev/null; echo
