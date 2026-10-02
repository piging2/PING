#!/bin/bash
C=/home/nolan/ping
B=/home/nolan/projects/ping-constitutional
echo "### (a) adapter_compiler existence"
ls "$C/gateway/" | grep -E "adapter_compiler|index\.js$" ; echo "rc=$?"
ls "$C/gateway/adapter_compiler"* 2>/dev/null || echo "NOT FOUND: gateway/adapter_compiler.*"
echo "### (b) ask-fyd.test.ts grantsForViewer usage"
grep -n "grantsForViewer\|jest.mock\|vi.mock" "$B/src/fyd/ask/__tests__/ask-fyd.test.ts" | head -10
echo "### (c1) replay-determinism-1000x.test.ts imports+asserts"
head -50 "$C/tests/certification/replay-determinism-1000x.test.ts"
echo "### (c2) replay_determinism.test.js imports"
head -40 "$C/tests/certification/replay_determinism.test.js"
echo "### (c3) what do certification tests require (real modules?)"
grep -h "require(\|from '" "$C/tests/certification/replay-mutation.test.ts" "$C/tests/certification/replay-witness-regeneration.test.ts" 2>/dev/null | sort -u | head -15
echo "### (d) adapter package.json top-level jest key"
python3 -c "
import json
p=json.load(open('$B/package.json'))
print('top-level keys with jest:', [k for k in p if 'jest' in k.lower()])
print('has jest config key:', 'jest' in p and not isinstance(p.get('jest'),str))
"
echo "### refresh assert counts (node:assert)"
for f in diff conflict dependency-index website-observe; do
  echo "$f: asserts=$(grep -c 'assert\.' $B/src/fyd/refresh/__tests__/$f.test.ts)"
done
