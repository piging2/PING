#!/bin/bash
cd /home/nolan/projects/ping
echo "=== renderer.tsx imports (1-70) ==="; sed -n '1,70p' src/fyd/components/renderer.tsx
echo "=== field-visibility exports ==="; grep -n "export" src/fyd/sitespec/field-visibility.ts | head
echo "=== FieldVisibilityDecision shape ==="; grep -n "interface FieldVisibilityDecision" -A 20 src/fyd/sitespec/field-visibility.ts | head -30
