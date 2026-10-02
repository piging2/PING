#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -n "business:\|service:\|location:\|person:\|post:" src/fyd/sitespec/schemas.ts | head -8
grep -n "ping.social" src/fyd/proceduralize/__tests__/generator.test.ts | head -6
