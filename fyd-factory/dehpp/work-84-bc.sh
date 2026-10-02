#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
ls src/fyd/builder/jest.config.cjs src/fyd/proceduralize/jest.config.cjs 2>&1
echo "====="
cat src/fyd/builder/jest.config.cjs 2>/dev/null | head -30
