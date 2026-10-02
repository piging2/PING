#!/bin/bash
cd /home/nolan/projects/ping || exit 1
cat > src/fyd/lineage/tsconfig.tracer.json <<'JSON'
{
  "extends": "/home/nolan/projects/ping/tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
JSON
npx tsx --tsconfig /home/nolan/projects/ping/src/fyd/lineage/tsconfig.tracer.json --import ./src/fyd/lineage/register-css.mjs src/fyd/lineage/spike-trace.ts 2>&1 | head -80
