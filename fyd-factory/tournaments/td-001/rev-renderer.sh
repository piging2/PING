#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== renderer.tsx:100-135 ==="
sed -n '100,135p' src/fyd/components/renderer.tsx
echo "=== registry.ts:70-95 (ObjectFeed acceptsSchemas) ==="
sed -n '70,95p' src/fyd/components/registry.ts
