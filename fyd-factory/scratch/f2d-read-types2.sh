#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "########## ObjectProvenanceKind ##########"
grep -n "ObjectProvenanceKind" src/lib/ping/types.ts | head -5
grep -n -A8 "type ObjectProvenanceKind" src/lib/ping/types.ts | head -14
echo "########## relationship rules 280-300 ##########"
sed -n '280,330p' src/fyd/sitespec/schemas.ts
echo "########## PingObject interface ##########"
grep -n -B2 -A22 "export interface PingObject" src/lib/ping/types.ts | head -40
