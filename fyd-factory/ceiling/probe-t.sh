#!/bin/bash
# F5-CEILING probe T: resolveQuery import in render-model
set -e
cd /home/nolan/projects/ping
sed -n '1,40p' src/fyd/sitespec/render-model.ts | grep -n "import" 
grep -n "resolveQuery" src/fyd/sitespec/render-model.ts | head
