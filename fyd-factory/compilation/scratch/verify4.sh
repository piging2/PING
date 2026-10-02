#!/bin/bash
cd /home/nolan/projects/ping
echo "=== non-type @/ imports in renderer.tsx ==="
grep -n 'from "@/' src/fyd/components/renderer.tsx | grep -v "import type" | head
echo "=== non-type @/ imports anywhere under src/fyd (top 15) ==="
grep -rn 'from "@/' src/fyd --include=*.ts --include=*.tsx | grep -v "import type" | head -15
echo "=== does renderer import chain hit any? (field-visibility, generated-presentation) ==="
grep -n 'from "@/' src/fyd/sitespec/field-visibility.ts src/fyd/builder/generated-presentation.ts 2>/dev/null | grep -v "import type" | head
