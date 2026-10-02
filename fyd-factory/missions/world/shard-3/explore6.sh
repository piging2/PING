#!/bin/bash
# check SCHEMA_ROLES keys + safe-link behavior + ObjectVisibility detail
cd /home/nolan/projects/ping
echo "=== SCHEMA_ROLES keys ==="; grep -n "SCHEMA_ROLES" src/fyd/sitespec/schemas.ts | head -3; sed -n "$(grep -n 'export const SCHEMA_ROLES' src/fyd/sitespec/schemas.ts | cut -d: -f1),+40p" src/fyd/sitespec/schemas.ts
echo "=== safe-link ==="; sed -n '1,80p' src/fyd/sitespec/safe-link.ts
echo "=== visibility type line 85-95 ==="; sed -n '80,100p' src/lib/ping/types.ts
