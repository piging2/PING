#!/bin/bash
echo "== gateway Dockerfile =="
cat /opt/ping/gateway/Dockerfile 2>/dev/null | head -60
echo "== gateway compose block env/ports/healthcheck =="
sed -n '/^  gateway:/,/^  # ===/p' /opt/ping/infrastructure/oracle/docker-compose.oracle.yml | grep -vE "^  #" | head -50
