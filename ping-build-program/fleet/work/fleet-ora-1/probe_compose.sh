#!/bin/bash
echo "== compose/manifest search (read-only) =="
find /home/ubuntu /opt /srv /etc/docker -maxdepth 5 \( -name "docker-compose*.y*ml" -o -name "compose.y*ml" -o -name "Dockerfile*" \) 2>/dev/null | head -20
echo "== search for js-worker-a string in yaml/json (shallow) =="
for d in /home/ubuntu /srv /opt; do
  [ -d "$d" ] && grep -rl "js-worker-a" "$d" --include="*.yml" --include="*.yaml" --include="*.json" 2>/dev/null | head -5
done
echo "== docker present? images? (read-only list) =="
which docker && docker image ls --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | head -25
echo "== done =="
