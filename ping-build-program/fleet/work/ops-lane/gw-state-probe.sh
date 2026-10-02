#!/bin/bash
date -u +%FT%TZ
docker ps --format '{{.Names}} {{.Status}} {{.Image}}' | grep -e gateway -e postgres -e qdrant
echo "--- gateway health ---"
docker inspect ping-gateway --format 'health={{.State.Health.Status}} mem_limit={{.HostConfig.Memory}} image={{.Config.Image}}' 2>/dev/null
echo "--- /health ---"
curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' http://127.0.0.1:8080/health
