#!/bin/bash
cd /home/nolan/projects/ping
cat src/fyd/TEST-GATE.md
echo "======== PROJ? ========"
ls src/fyd/builder/ src/fyd/sitespec/ 2>/dev/null
echo "======== grep sanitize ========"
grep -ril --include="*.ts" --include="*.tsx" -E "sanitize|escapeHtml|escape_html|xss|DOMPurify|dangerouslySetInnerHTML" src/fyd/ | head -30
