#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -n "KNOWN_SCHEMAS" src/app/sites/happy-place/page.tsx | head -5
grep -rn "KNOWN_SCHEMAS" src/app/ | head -5
