#!/bin/bash
cd /home/nolan/projects/ping
echo "===== td-002 refs anywhere ====="; grep -rln "td-002\|TD-002" --include="*.ts" --include="*.tsx" --include="*.md" src/ 2>/dev/null | head; grep -rln "TD-002" /home/hatch/workspace/fyd-factory/ 2>/dev/null | head -5
echo; echo "===== concierge test count ====="; grep -c "it(\|test(" src/fyd/ask/__tests__/concierge.test.ts
echo; echo "===== ask jest suite files ====="; cat src/fyd/ask/jest.config.cjs
