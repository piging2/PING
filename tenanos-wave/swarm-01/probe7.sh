#!/bin/bash
# SWARM-01 probe 7: gateway middleware, event schema, ingest/runtime tenant handling (read-only)
G=/home/nolan/ping/gateway
echo "########## route_middleware.js ##########"
sed -n 1,120p $G/route_middleware.js 2>/dev/null
echo "########## ExteriorAuthMiddleware location ##########"
grep -rl "ExteriorAuthMiddleware" /home/nolan/ping --include="*.js" --include="*.py" --include="*.ts" 2>/dev/null | grep -v node_modules | head
echo "########## database dir ##########"
ls /home/nolan/ping/database/ 2>/dev/null | head -40
echo "########## canonical_events.sql (tenant cols) ##########"
grep -in "tenant" /home/nolan/ping/database/canonical_events.sql 2>/dev/null | head -20
echo "########## events.sql (tenant cols) ##########"
grep -in "tenant" /home/nolan/ping/database/events.sql 2>/dev/null | head -20
echo "########## tenant in ingest.js ##########"
grep -n "tenant" $G/routes/ingest.js 2>/dev/null | head -30
echo "########## tenant in canonical_events.js route ##########"
grep -n "tenant" $G/routes/canonical_events.js 2>/dev/null | head -30
echo "########## tenant in runtime.js route ##########"
grep -n "tenant" $G/routes/runtime.js 2>/dev/null | head -40
