#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== src/fyd/components/registry.ts ====="
grep -n "acceptsSchemas\|ObjectFeed\|external_identity" src/fyd/components/registry.ts
echo
echo "===== src/fyd/sitespec/schemas.ts (ObjectFeed part) ====="
grep -n "ObjectFeed\|acceptsSchemas\|external_identity" src/fyd/sitespec/schemas.ts | head -30
