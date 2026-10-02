#!/bin/bash
cd /home/nolan/projects/ping || exit 1
ls src/fyd/sitespec/jest.config.cjs src/fyd/builder/jest.config.cjs 2>/dev/null
echo "===== full proceduralize lane ====="
timeout 600 npx jest --config src/fyd/proceduralize/jest.config.cjs 2>&1 | tail -8
