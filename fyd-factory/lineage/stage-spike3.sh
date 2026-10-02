#!/bin/bash
cd /home/nolan/projects/ping || exit 1
cat > src/fyd/lineage/tsconfig.tracer.json <<'JSON'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
JSON
echo "tsconfig staged"
npx tsx --tsconfig src/fyd/lineage/tsconfig.tracer.json --import ./src/fyd/lineage/register-css.mjs src/fyd/lineage/spike-trace.ts 2>&1 | head -80
