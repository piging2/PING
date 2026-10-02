#!/bin/bash
cd /home/nolan/projects/ping || exit 1
wc -l src/fyd/sitespec/schemas.ts
grep -n "predicate" src/fyd/sitespec/schemas.ts
