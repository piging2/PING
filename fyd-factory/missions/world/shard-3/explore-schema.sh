#!/bin/bash
cd /home/nolan/projects/ping
ls src/fyd/components/ | head -40
echo "=== schema-roles files ==="; ls src/fyd/components/schema-roles* src/fyd/sitespec/schema-roles* 2>&1
echo "=== the import line ==="; grep -n "schema-roles" src/fyd/components/registry.ts
