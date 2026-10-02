#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== recursive node: import check from renderer.tsx ==="
cd "$WT/src"
# Find all files transitively imported by renderer.tsx (one level deep for speed)
# and check for node: imports
for f in fyd/components/registry.ts fyd/components/ask-fyd-widget.tsx fyd/components/object-rail.tsx fyd/object/card.tsx fyd/ui/object-circle.tsx fyd/ui/why-this.tsx fyd/sitespec/graph.ts fyd/sitespec/field-visibility.ts fyd/sitespec/safe-link.ts fyd/object/object-projection.ts fyd/components/contact-link.tsx fyd/sitespec/schemas.ts fyd/components/compose-motion.ts; do
  if [ -f "$f" ]; then
    hits=$(grep -c "node:" "$f" 2>/dev/null || echo "0")
    if [ "$hits" != "0" ]; then
      echo "FOUND node: in $f ($hits hits)"
    fi
  fi
done
echo "Direct dependency check complete"
echo "=== check second-level: what does registry.ts import? ==="
grep -n "^import" "$WT/src/fyd/components/registry.ts" | head -10
