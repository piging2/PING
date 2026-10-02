#!/bin/bash
set -uo pipefail
cd /home/nolan/fyd-preview-wt
echo "=== jest config files ==="
ls jest.config.* babel.config.* .babelrc* 2>/dev/null; echo "---"
grep -n '"jest"' -A 30 package.json | head -40
echo "=== how does main repo run tests? check CI/workflows ==="
ls .github/workflows/ 2>/dev/null | head
