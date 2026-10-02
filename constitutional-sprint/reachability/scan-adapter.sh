#!/bin/bash
# Adapter test archaeology scan — run on Pig via stdin
BASE=/home/nolan/projects/ping-constitutional
cd "$BASE" || exit 1
echo "### JEST CONFIG"
ls jest.config.* babel.config.* 2>/dev/null
grep -o '"jest"[^}]*}' package.json | head -c 300; echo
grep -A8 '"jest"' package.json | head -20
echo "### TOTAL TEST FILES"
find src tests scripts -type f -name "*.test.ts" -o -type f -name "*.test.tsx" 2>/dev/null | wc -l
echo "### TESTS MENTIONING REPLAY"
grep -rl "replay" --include="*.test.ts" --include="*.test.tsx" src | head
echo "### FYD/SOCIAL TESTS (write authority lane)"
ls src/fyd/social/__tests__ 2>/dev/null || echo "NONE - no __tests__ dir under src/fyd/social"
echo "### PER-FILE SCAN"
scan() {
  f="$1"
  echo "--- $f"
  echo "lines=$(wc -l < "$f") its=$(grep -cE '^\s*(it|test)\(' "$f") expects=$(grep -cE '\bexpect\(' "$f") asserts=$(grep -cE '\bassert\.' "$f") mocks=$(grep -cE 'jest\.mock|vi\.mock' "$f")"
  echo "imports-of-real-modules:"
  grep -E '^\s*(import|require)' "$f" | grep -vE '__tests__|jest' | head -12
}
scan src/fyd/object/__tests__/owner-events.test.ts
scan src/fyd/object/__tests__/owner-store.test.ts
scan src/fyd/identity/__tests__/principal.test.ts
scan src/fyd/identity/__tests__/session.test.ts
scan src/fyd/identity/__tests__/file-store.test.ts
scan src/fyd/ui/__tests__/capability-runtime.test.ts
scan src/fyd/object/__tests__/owner-capability.test.ts
scan src/lib/ping/__tests__/lane-a.test.ts
scan src/fyd/tenant/__tests__/d-worker.test.ts
scan src/fyd/wiring/__tests__/action-verifier.test.ts
scan src/fyd/claim/__tests__/machine.test.ts
scan src/app/api/fyd/ask/__tests__/route.test.ts
echo "### ASSERTION-COUNT DISTRIBUTION (expects per file, sorted)"
for f in $(find src -name "*.test.ts" -o -name "*.test.tsx"); do
  echo "$(grep -cE '\bexpect\(' "$f") $f"
done | sort -n | head -25
echo "### FILES WITH ZERO expect() CALLS"
for f in $(find src -name "*.test.ts" -o -name "*.test.tsx"); do
  n=$(grep -cE '\bexpect\(' "$f"); [ "$n" = "0" ] && echo "$f"
done
