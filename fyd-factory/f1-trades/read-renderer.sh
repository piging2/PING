#!/bin/bash
cd /home/nolan/projects/ping
echo "=== renderer.tsx size ==="
wc -l src/fyd/components/renderer.tsx src/app/sites/_shared/site-client.tsx src/fyd/components/object-affordance.tsx
echo "=== renderer section-name switch ==="
grep -n "case \"" src/fyd/components/renderer.tsx | head -50
echo "=== sticky/mobile/call mentions in renderer ==="
grep -n -i "sticky\|thumb\|mobile\|safeArea\|safe-area\|tel:\|stickyCall" src/fyd/components/renderer.tsx | head -30
echo "=== CTA section render ==="
grep -n -i "CTA" src/fyd/components/renderer.tsx | head -20
