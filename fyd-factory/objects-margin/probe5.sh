#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "##### o/[objectId]/page.tsx (60) #####"
sed -n '1,60p' src/app/o/\[objectId\]/page.tsx
echo "##### objects route (50) #####"
sed -n '1,50p' src/app/api/fyd/objects/\[objectId\]/route.ts
echo "##### portal-rail #####"
find src/app/portal-rail -type f | head; sed -n '1,50p' src/app/portal-rail/page.tsx 2>/dev/null
echo "##### MobileSheet (70) #####"
sed -n '1,70p' src/fyd/ui/object-layer/MobileSheet.tsx
echo "##### PeekCard (50) #####"
sed -n '1,50p' src/fyd/ui/object-layer/PeekCard.tsx
