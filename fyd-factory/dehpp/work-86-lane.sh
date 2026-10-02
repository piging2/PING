#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
L=$(python3 -c "import base64;print(base64.b64encode(open('/home/hatch/workspace/fyd-factory/dehpp/staged/src/fyd/compose/jest.config.cjs','rb').read()).decode())")
echo "$L" | base64 -d > src/fyd/compose/jest.config.cjs
echo WROTE
node_modules/.bin/jest --config src/fyd/compose/jest.config.cjs 2>&1 | tail -12