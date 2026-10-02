#!/bin/bash
cd /home/nolan/projects/ping || exit 1
cat src/fyd/proceduralize/jest.config.cjs | head -40
echo "===== run generator tests with lane config ====="
timeout 300 npx jest --config src/fyd/proceduralize/jest.config.cjs generator 2>&1 | tail -12
