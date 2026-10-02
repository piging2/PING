#!/bin/bash
# STEP 6c: inspect cohort page source for navigation link text; check /o/happy-place content.
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "--- cohort page component: link/back text ---"
grep -rn -i "back\|href" "$WT/src/app/fyd-night/cohort/[siteId]/page.tsx" | head -10
echo "--- /o/[objectId] object route check ---"
grep -rn "notFound\|ObjectHeader\|objectId" "$WT/src/app/o/[objectId]/page.tsx" 2>/dev/null | head -8
ls "$WT/src/app/o" 2>/dev/null
