#!/bin/bash
cd /home/nolan/projects/ping
grep -n "buildRenderContext" src/fyd/sitespec/binding-verifier.ts src/fyd/sitespec/render-model.ts | head
echo "---render-model.ts head---"
sed -n '1,60p' src/fyd/sitespec/render-model.ts
