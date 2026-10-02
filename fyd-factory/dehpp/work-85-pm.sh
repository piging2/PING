#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -n "testMatch" -A 6 src/fyd/proceduralize/jest.config.cjs
echo "====="
ls src/fyd/*/jest.config.cjs 2>/dev/null
