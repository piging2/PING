#!/bin/bash
cd /home/nolan/projects/ping
echo "=== applyFieldVisibility ==="; sed -n '99,190p' src/fyd/sitespec/field-visibility.ts
echo "=== resolveQuery owner kind ==="; sed -n '72,150p' src/fyd/components/renderer.tsx
