#!/bin/bash
# swarm-08 probe 24: bootstrap services object + tenant registry store (read-only)
set -u
echo "### gateway_runtime.js services for /mc (around 810) ==="
sed -n '770,815p' /home/nolan/ping/gateway/bootstrap/gateway_runtime.js
echo ""
echo "### tenant_registry backing store ==="
grep -n "CREATE TABLE\|_pool\|this\._store\|Map()" /home/nolan/ping/ping-runtime/runtime/tenant_registry.js | head -15
