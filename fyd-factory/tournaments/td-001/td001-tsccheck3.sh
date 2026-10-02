#!/bin/bash
cd /home/nolan/projects/ping
cat > /home/nolan/td001-check/tsconfig.json <<'TSEOF'
{
  "extends": "/home/nolan/projects/ping/tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "types": ["jest", "node"],
    "typeRoots": ["/home/nolan/projects/ping/node_modules/@types"]
  },
  "include": ["test.ts"]
}
TSEOF
npx tsc -p /home/nolan/td001-check/tsconfig.json 2>&1 | head -20
echo "tsc done"
