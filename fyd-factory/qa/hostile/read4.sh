#!/bin/bash
cd /home/nolan/projects/ping
ls src/fyd/components/
echo "======== grep resolveQuery ========"
grep -rln --include="*.tsx" --include="*.ts" "resolveQuery" src/fyd/ | head
echo "======== grep dangerous ========"
grep -rn --include="*.tsx" --include="*.ts" "dangerouslySetInnerHTML\|innerHTML" src/fyd/ | head -20
