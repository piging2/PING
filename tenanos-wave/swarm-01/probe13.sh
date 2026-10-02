#!/bin/bash
# SWARM-01 probe 13: tenant registry impl, qdrant collections, orca loop, live gateway (read-only)
P=/home/nolan/ping
echo "########## tenant_registry.js ##########"
grep -n "executeRegisterTenant\|executeResolveTenant\|executeListTenants\|class TenantRegistry" -A 25 $P/ping-runtime/runtime/tenant_registry.js | head -80
echo "########## qdrant collections created ##########"
sed -n 30,65p $P/gateway/memory_vector_store_authority.js
echo "########## orca control loop tenant ##########"
grep -n -i "tenant\|namespace" /home/nolan/workspace/orca-remediation/orca_control_loop.js | head -20
echo "--- dispatch test copy ---"
grep -n -i "tenant\|namespace" /home/nolan/workspace/orca-dispatch-test/orca_control_loop.js | head -20
echo "########## LIVE gateway probes (read-only GET) ##########"
curl -s -m 8 http://localhost:8080/health | head -c 400; echo
echo "--- GET /tenants ---"
curl -s -m 8 http://localhost:8080/tenants | head -c 600; echo
echo "########## ping-gateway container mounts ##########"
docker inspect ping-gateway --format '{{range .Mounts}}{{.Source}} -> {{.Destination}} {{end}}' 2>/dev/null | head -c 800; echo
