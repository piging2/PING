#!/bin/bash
echo "== scheduler + litellm + gateway compose blocks =="
sed -n '/^  scheduler:/,/^  litellm:/p' /opt/ping/infrastructure/oracle/docker-compose.oracle.yml | head -40
sed -n '/^  litellm:/,$p' /opt/ping/infrastructure/oracle/docker-compose.oracle.yml | head -30
echo "== gateway depends_on / image =="
sed -n '/^  gateway:/,/^  scheduler:/p' /opt/ping/infrastructure/oracle/docker-compose.oracle.yml | grep -E "image:|build:|depends_on|dockerfile" 
echo "== clean-snapshot compose services =="
grep -E "^  [a-z0-9_-]+:" /opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/compose.yaml | sed 's/://' | head -30
echo "== Dockerfiles in /opt/ping/infrastructure/oracle =="
ls /opt/ping/infrastructure/oracle/ 2>/dev/null
echo "== all images on host =="
docker image ls --format '{{.Repository}}:{{.Tag}} {{.Size}}' 2>/dev/null
echo "== running baseline containers (names only, read-only) =="
docker ps --format '{{.Names}} {{.Image}} {{.Status}}' 2>/dev/null
