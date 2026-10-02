#!/bin/bash
# swarm-08 probe 23: bootstrap wiring + health checks + tenant registry store (read-only)
set -u
echo "### createMissionControlRoutes call site + services ==="
timeout 60 grep -rn "createMissionControlRoutes" /home/nolan/ping/gateway --include='*.js' 2>/dev/null | grep -v node_modules | grep -v "routes/mission_control" | head -5
echo ""
echo "### aiRuntime healthCheckAll ==="
timeout 60 grep -rn "healthCheckAll" /home/nolan/ping/ping-runtime --include='*.js' 2>/dev/null | grep -v node_modules | grep -v dormant | head -5
echo ""
echo "### tenant registry backing ==="
timeout 60 grep -rln "TenantRegistry\|tenant_registry" /home/nolan/ping/ping-runtime --include='*.js' 2>/dev/null | grep -v node_modules | grep -v dormant | head -5
timeout 60 grep -rn "CREATE TABLE" /home/nolan/ping/ping-runtime/tenants/*.js 2>/dev/null | head -5
ls /home/nolan/ping/ping-runtime/ | head -40
