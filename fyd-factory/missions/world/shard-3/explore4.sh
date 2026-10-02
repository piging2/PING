#!/bin/bash
# explore types and test render approach
cd /home/nolan/projects/ping
echo "=== ObjectGraph (types.ts 1-60) ==="; sed -n '1,60p' src/fyd/sitespec/types.ts
echo "=== PingObject (types.ts 100-160) ==="; sed -n '100,160p' src/lib/ping/types.ts
echo "=== render.test.ts head ==="; sed -n '1,60p' src/fyd/components/__tests__/render.test.ts
echo "=== FYDSiteSpec (types.ts 314-340) ==="; sed -n '306,345p' src/fyd/sitespec/types.ts
echo "=== generator GeneratorOptions ==="; sed -n '41,80p' src/fyd/proceduralize/generator.ts
