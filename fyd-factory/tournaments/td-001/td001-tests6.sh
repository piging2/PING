#!/bin/bash
cd /home/nolan/projects/ping || exit 1
timeout 600 npx jest --config src/fyd/sitespec/jest.config.cjs 2>&1 | tail -8
echo "====="
timeout 600 npx jest --config src/fyd/builder/jest.config.cjs 2>&1 | tail -8
