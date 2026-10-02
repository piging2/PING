#!/bin/bash
CORE=/home/nolan/ping
echo "=== compose.yaml worker services (full) ==="
sed -n '190,345p' "$CORE/compose.yaml"
echo
echo "=== docker ps: worker containers actually running? ==="
docker ps --format '{{.Names}}|{{.Image}}|{{.Status}}' 2>/dev/null | sort
echo "=== all containers incl stopped, worker-named ==="
docker ps -a --format '{{.Names}}|{{.Image}}|{{.Status}}' 2>/dev/null | grep -i -e 'worker' -e 'digestion' -e 'newsletter' | head -20
echo
echo "=== Dockerfile.worker-runtime ==="
cat "$CORE/Dockerfile.worker-runtime" 2>/dev/null | head -40
echo "=== other Dockerfiles at root ==="
ls "$CORE"/Dockerfile* 2>/dev/null
echo
echo "=== gateway/test_dormant_worker_gate.js head ==="
head -c 2500 "$CORE/gateway/test_dormant_worker_gate.js"; echo
