#!/bin/bash
grep -n "createHealthRoutes" /opt/ping/gateway/bootstrap/gateway_runtime.js | head -3
echo "--- health route impl ---"
awk '/function createHealthRoutes|const createHealthRoutes|createHealthRoutes =/,0' /opt/ping/gateway/bootstrap/gateway_runtime.js | head -80
