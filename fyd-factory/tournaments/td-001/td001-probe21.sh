#!/bin/bash
cd /home/nolan/projects/ping || exit 1
ls -la | grep -iE "babel|jest|vitest" ; echo "---"
find . -maxdepth 2 -name "jest.config*" -o -maxdepth 2 -name "babel.config*" -o -maxdepth 2 -name ".babelrc" 2>/dev/null | grep -v node_modules | head
echo "--- components jest.config.cjs ---"
cat src/fyd/components/jest.config.cjs 2>/dev/null | head -30
