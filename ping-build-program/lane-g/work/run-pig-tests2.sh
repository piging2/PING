#!/bin/bash
set -u
cd /home/nolan/projects/ping
npx jest --config src/fyd/ask/jest.config.cjs src/fyd/ask/__tests__/context-compiler.test.ts > /tmp/laneg-jest.log 2>&1
echo "exit=$?"
tail -30 /tmp/laneg-jest.log
