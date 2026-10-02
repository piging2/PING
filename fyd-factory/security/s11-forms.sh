#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "=== <form occurrences ==="
grep -rn '<form' src/fyd --include='*.tsx' | grep -v __tests__ | head -10
echo "=== href/src/action= in fyd components (non-renderer) ==="
grep -rn 'href={\|src={\|action={' src/fyd/components src/fyd/object src/fyd/ui --include='*.tsx' | grep -v __tests__ | grep -v 'renderer.tsx' | head -30
echo "=== any raw interpolation into attributes in contact-link / object-rail / ask-fyd-widget ==="
for f in src/fyd/components/contact-link.tsx src/fyd/components/object-rail.tsx src/fyd/components/ask-fyd-widget.tsx src/fyd/ui/why-this.tsx src/fyd/object/card.tsx; do echo "--- $f"; [ -f "$f" ] && grep -n 'href\|src=\|action=' "$f" | head -8; done
