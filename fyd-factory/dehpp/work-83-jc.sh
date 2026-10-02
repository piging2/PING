#!/bin/bash
cd /home/nolan/projects/ping
cat src/fyd/jest.config.cjs
echo "====="
cat src/fyd/owner-mode/jest.config.cjs 2>/dev/null | head -20
