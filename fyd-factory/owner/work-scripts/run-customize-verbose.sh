#!/bin/bash
cd /home/nolan/projects/ping
npx jest --config src/fyd/customize/jest.config.cjs -t "owner" --verbose 2>&1 | grep -E "✓|✕|●" | head -60
