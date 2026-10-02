#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -n "KNOWN_SCHEMAS" src/app/sites/happy-place/page.tsx | head -3
grep -n "interface PingProjection" -A 12 src/fyd/data/ping-object-source.ts | head -14
