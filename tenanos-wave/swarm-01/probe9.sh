#!/bin/bash
# SWARM-01 probe 9: gateway_runtime bootstrap auth + authorizeNamespace (read-only)
G=/home/nolan/ping/gateway
echo "########## gateway_runtime.js: middleware/auth/tenant (first 120 lines) ##########"
sed -n 1,120p $G/bootstrap/gateway_runtime.js
echo "########## gateway_runtime.js: app.use lines ##########"
grep -n "app.use\|authenticate\|bearer\|requireAuth\|authMiddleware" $G/bootstrap/gateway_runtime.js | head -40
echo "########## authorizeNamespace implementation ##########"
grep -rln "authorizeNamespace" $G --include="*.js" | grep -v test_ | grep -v node_modules | head
