#!/bin/bash
# swarm-08 probe 25: services keys + tenant_registry storage (read-only)
set -u
GR=/home/nolan/ping/gateway/bootstrap/gateway_runtime.js
echo "### services keys present ==="
for k in deadLetterAuthority replayProvider aiRuntime googleConnector workerRuntime missionScheduler eventBridge eventToMissionBridge knowledgeGraph unifiedEventRuntime missionRuntime tenantRegistry; do
  n=$(grep -c "$k" "$GR" 2>/dev/null)
  echo "$k: $n mentions"
done
echo ""
echo "### tenant_registry.js head ==="
head -80 /home/nolan/ping/ping-runtime/runtime/tenant_registry.js
