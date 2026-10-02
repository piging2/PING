#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== planner.ts lines 180-260 ====="
sed -n '180,260p' src/fyd/builder/planner.ts
echo
echo "===== validator.ts top: knownSchemas ====="
sed -n '1,60p' src/fyd/sitespec/validator.ts
