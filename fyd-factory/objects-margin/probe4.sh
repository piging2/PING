#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "##### object-layer/types.ts #####"
sed -n '1,120p' src/fyd/ui/object-layer/types.ts
echo "##### object/view.ts (80) #####"
sed -n '1,80p' src/fyd/object/view.ts
echo "##### object/card.tsx (60) #####"
sed -n '1,60p' src/fyd/object/card.tsx
echo "##### object/node.tsx (60) #####"
sed -n '1,60p' src/fyd/object/node.tsx
