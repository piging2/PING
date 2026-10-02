#!/bin/bash
cd /home/nolan/projects/ping
echo "=== registry files ==="
ls src/fyd/components/
echo "=== registry component names ==="
grep -rn "export function getComponentDef\|COMPONENTS\s*=\|registerComponent" src/fyd/components/registry* 2>/dev/null | head
echo "########## sitespec/types.ts (head 300) ##########"
sed -n '1,300p' src/fyd/sitespec/types.ts
