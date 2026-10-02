#!/bin/bash
cd /home/nolan/projects/ping
echo "=== owner-mode suite ==="
npx jest --config src/fyd/owner-mode/jest.config.cjs 2>&1 | tail -40
echo "=== customize suite ==="
npx jest --config src/fyd/customize/jest.config.cjs 2>&1 | tail -40
