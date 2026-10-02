#!/bin/bash
cd /home/nolan/projects/ping
echo "===== data/fyd-owner ====="; ls data/fyd-owner/ 2>/dev/null
echo; echo "===== tenant refs in object dir ====="; grep -rn "tenant\|Tenant" src/fyd/object/owner-store.ts src/fyd/object/owner-events.ts 2>/dev/null | head
echo; echo "===== projection dir ====="; ls /home/nolan/ping/var/fyd-projections/ 2>/dev/null || echo "no /home/nolan/ping/var/fyd-projections"; echo "FYD_PROJECTION_DIR=$FYD_PROJECTION_DIR"
echo; echo "===== fyd-tenant-graph ids ====="; grep -n "getFydTenantIds\|TENANT\|siteIds" src/fyd/data/fyd-tenant-graph.ts | head -20
