#!/bin/bash
# SWARM-01 probe 8: gateway entrypoint, auth chain, mission control endpoint (read-only)
G=/home/nolan/ping/gateway
echo "########## gateway entrypoint candidates ##########"
ls $G/*.js | head -30
echo "########## server/app bootstrap: auth middleware ##########"
for f in $G/server.js $G/app.js $G/index.js $G/gateway_server.js; do
  if [ -f "$f" ]; then echo "--- $f ---"; grep -n -i -E "auth|bearer|token|passport|jwt|tenant" "$f" | head -40; fi
done
echo "########## where tenants routes mounted ##########"
grep -rn "createTenantRoutes\|tenants.js" $G --include="*.js" 2>/dev/null | grep -v test_ | grep -v node_modules | head
echo "########## mission_control_authority_endpoint.py head ##########"
sed -n 1,80p /home/nolan/ping/mission_control_authority_endpoint.py 2>/dev/null
echo "########## ingest.js namespace handling ##########"
sed -n 1,80p $G/routes/ingest.js 2>/dev/null
