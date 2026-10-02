#!/bin/bash
set -e
cd /home/nolan/projects/ping
echo "===== capabilities dir ====="
ls src/fyd/capabilities/
echo "===== grep phone/capability in sitespec types ====="
grep -n -i "action\|capabilit\|phone" src/fyd/sitespec/types.ts | head -30
echo "===== customize-panel.tsx labels ====="
grep -n -i "demo\|OBJECTS\|CONTENT\|VISIBILITY\|SITE\|ASK FYD\|EVIDENCE" src/fyd/owner-mode/customize-panel.tsx | head -30
