#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== site-client.tsx (140-200) ====="
sed -n '1,60p;140,200p' src/app/sites/_shared/site-client.tsx
echo "===== contact-link.tsx (1-100) ====="
sed -n '1,100p' src/fyd/components/contact-link.tsx
echo "===== renderer.tsx (1630-1700) ====="
sed -n '1630,1700p' src/fyd/components/renderer.tsx
echo "===== generator.ts (290-340) ====="
sed -n '290,340p' src/fyd/proceduralize/generator.ts
