#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== recent log on generator/validator/schemas/registry ====="
git log --oneline -8 -- src/fyd/proceduralize/generator.ts
echo "--- validator.ts ---"
git log --oneline -8 -- src/fyd/sitespec/validator.ts
echo "--- schemas.ts ---"
git log --oneline -8 -- src/fyd/sitespec/schemas.ts
echo "--- registry.ts ---"
git log --oneline -8 -- src/fyd/components/registry.ts
echo
echo "===== object-projection.ts line 210 context ====="
sed -n '190,240p' src/fyd/object/object-projection.ts
