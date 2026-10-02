#!/bin/bash
cd /home/nolan/projects/ping
echo "##### apply.test.ts"
cat src/fyd/archetypes/__tests__/apply.test.ts
echo "##### jest.config.cjs"
cat src/fyd/archetypes/jest.config.cjs
echo "##### FYDSiteArchetype in sitespec/types"
grep -n "FYDSiteArchetype" src/fyd/sitespec/types.ts | head -10
grep -n -A 10 "FYDSiteArchetype =" src/fyd/sitespec/types.ts | head -30
