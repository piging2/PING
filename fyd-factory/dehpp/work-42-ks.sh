#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -n "KNOWN_SCHEMAS\s*=" src/app/sites/happy-place/page.tsx src/app/sites/_shared/*.tsx 2>/dev/null
grep -rn "KNOWN_SCHEMAS" src/fyd --include=*.ts | grep -v test | head -5
