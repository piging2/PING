#!/bin/bash
C=/home/nolan/ping
B=/home/nolan/projects/ping-constitutional
echo "### CORE package.json scripts + test config"
grep -A15 '"scripts"' "$C/package.json" 2>/dev/null | head -20
echo "--- pytest config:"
ls "$C/pytest.ini" "$C/setup.cfg" "$C/pyproject.toml" "$C/tox.ini" 2>/dev/null
grep -l "pytest" "$C/pyproject.toml" 2>/dev/null && grep -A5 "pytest" "$C/pyproject.toml" | head -10
echo "### GATEWAY dir (adapter_compiler?)"
ls "$C/gateway" | head -30
echo "### tests/certification + tests/corpus"
ls "$C/tests/certification" 2>/dev/null | head -20; echo ---; ls "$C/tests/corpus" 2>/dev/null | head -10
echo "### evals dir"
ls "$C/evals" 2>/dev/null | head -20
echo "### _test_auth.py head"
head -40 "$C/_test_auth.py"
echo "### _test_lineage.py head"
head -30 "$C/_test_lineage.py"
echo "### constitutional_replay.test.js body (tail)"
tail -60 "$C/test/constitutional_replay.test.js"
echo "### ADAPTER: jest config block in package.json?"
grep -B2 -A15 '"jestConfig"\|"jest":' "$B/package.json" | head -30
echo "### ADAPTER: .github/workflows"
ls "$B/.github/workflows" 2>/dev/null
echo "### CORE: .github/workflows"
ls "$C/.github/workflows" 2>/dev/null
echo "### grants.ts test check"
ls "$B/src/lib/ping/__tests__/" | grep -i grant; grep -rl "grantsForViewer" "$B/src" --include="*.test.ts" 2>/dev/null
echo "### ADAPTER refresh zero-expect files: do they use node:assert?"
grep -l "node:assert" "$B/src/fyd/refresh/__tests__/"*.test.ts 2>/dev/null; echo "(none above = truly assertion-free)"
grep -c "test(" "$B/src/fyd/refresh/__tests__/diff.test.ts" "$B/src/fyd/refresh/__tests__/conflict.test.ts" "$B/src/fyd/refresh/__tests__/dependency-index.test.ts" 2>/dev/null
