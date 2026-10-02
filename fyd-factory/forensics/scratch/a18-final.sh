#!/bin/bash
cd /home/nolan/projects/ping
echo "===== F-8 / about-null ====="; grep -rin "about-null\|about_null\|F-8" --include="*.ts" --include="*.tsx" src/fyd/ 2>/dev/null | grep -v __tests__ | head -10
echo; echo "===== widget fetch target ====="; grep -n "fetch(" src/fyd/components/ask-fyd-widget.tsx | head -5
echo; echo "===== trusted path users ====="; grep -rln "api/fyd/ask/" --include="*.tsx" src/fyd/ui/ 2>/dev/null | head -5
