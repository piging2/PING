#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== jest config ==="
ls jest.config.* babel.config.* .babelrc 2>/dev/null
cat jest.config.js 2>/dev/null | head -30
echo "=== tsx available? ==="
ls node_modules/.bin/tsx 2>/dev/null && echo yes
