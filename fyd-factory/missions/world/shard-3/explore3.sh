#!/bin/bash
# explore render-to-string path + graph types
cd /home/nolan/projects/ping
echo "=== renderer.tsx exports ==="; grep -n "^export" src/fyd/components/renderer.tsx
echo "=== renderToString usage in repo ==="; grep -rln "renderToStaticMarkup\|renderToString" src --include="*.ts" --include="*.tsx" | head
echo "=== ObjectGraph def ==="; grep -rn "interface ObjectGraph\|type ObjectGraph" src --include="*.ts" | head -5
echo "=== sitespec types.ts top exports ==="; grep -n "^export" src/fyd/sitespec/types.ts | head -30
echo "=== PingObject type ==="; grep -rn "interface PingObject\b" src --include="*.ts" | head -3
