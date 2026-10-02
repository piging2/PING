#!/bin/bash
cd /home/nolan/projects/ping
grep -rn "buildRenderContext" src --include="*.tsx" | grep -v __tests__ | head
echo "--- SiteClient ---"
grep -rln "SiteClient" src/fyd/components/ | head -3
