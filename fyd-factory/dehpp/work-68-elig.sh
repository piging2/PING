#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -n "ObjectFeed" src/fyd/sitespec/schemas.ts | head -5
grep -n "eligibleComponents" src/fyd/sitespec/schemas.ts | head -3
