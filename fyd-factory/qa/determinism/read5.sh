#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== css imports in render chain ==="
grep -rn "\.css" src/fyd/components/renderer.tsx src/fyd/components/object-rail.tsx src/fyd/components/ask-fyd-widget.tsx src/fyd/object/card.tsx src/fyd/ui/object-circle.tsx src/fyd/ui/why-this.tsx src/fyd/components/contact-link.tsx 2>/dev/null | head
echo "=== resolveQuery location ==="
grep -n "export function resolveQuery\|export async function resolveQuery" src/fyd/components/renderer.tsx
echo "=== ViewerContext + ObjectGraph types ==="
sed -n '18,60p' src/fyd/sitespec/types.ts
