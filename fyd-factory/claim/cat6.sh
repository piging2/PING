#!/bin/bash
cd /home/nolan/projects/ping
echo "########## ContactMethod 755-800 ##########"
sed -n '755,800p' src/fyd/components/renderer.tsx
echo
echo "########## JSON-LD / schema.org emission ##########"
grep -rn "application/ld+json\|jsonLd\|JSON-LD\|schema.org" src/fyd --include="*.tsx" --include="*.ts" | grep -v __tests__ | head -20
echo
echo "########## find demo sites ##########"
grep -rln "coppersmith" src --include="*.ts" --include="*.tsx" -i | head -20
echo "---happy-place---"
grep -rln "happy-place\|happy_place\|happyPlace" src --include="*.ts" --include="*.tsx" -i | head -20
