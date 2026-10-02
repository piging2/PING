#!/bin/bash
cd /home/nolan/projects/ping
echo "##### hardcoded HPP strings in fyd + route"
grep -rni "happy place\|happy-place\|willamette\|carpentry" src/fyd/components/ src/fyd/proceduralize/generator.ts src/fyd/sitespec/validator.ts src/fyd/media/select.ts src/app/sites/happy-place/page.tsx src/app/sites/_shared/site-client.tsx 2>/dev/null | grep -v __tests__ | grep -v "//" | head -30
echo "##### footer search"
grep -rni "<footer\|Footer" src/fyd/components/renderer.tsx src/app/sites/_shared/site-client.tsx | head -10
echo "##### generator pages emitted"
grep -n 'add("' src/fyd/proceduralize/generator.ts
echo "##### generator page names"
grep -n "slug:" src/fyd/proceduralize/generator.ts | head -20
