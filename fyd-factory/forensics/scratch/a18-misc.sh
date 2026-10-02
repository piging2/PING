#!/bin/bash
cd /home/nolan/projects/ping
echo "===== mission refs ====="; grep -rln "mission" --include="*.ts" src/fyd/ | grep -v __tests__ | head -10
echo; echo "===== worker refs ====="; grep -rln "worker\|Worker" --include="*.ts" src/fyd/ | grep -v __tests__ | head -10
echo; echo "===== td-002 test head ====="; head -80 src/fyd/ask/__tests__/td-002-hostile.test.ts
