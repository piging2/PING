#!/bin/bash
# Recovery transfer for the FYD lane (orders G+J) after the FL-20260921-072
# Pig bridge outage. Run once the bridge is back:
#   ~/workspace/fyd-lane/transfer-remaining.sh
# Every file is md5-verified by pig-put.sh. Safe to re-run: transfers are
# idempotent (same content, same md5).
set -u
PUT=~/workspace/bin/pig-put.sh
BRIDGE=~/workspace/pig/pigwsl-run.sh
REPO=/home/nolan/projects/ping

echo "=== 0. bridge check ==="
$BRIDGE 'echo bridge-ok' < /dev/null || { echo "bridge still down"; exit 1; }

echo "=== 1. claim lane: retransfer edited files ==="
$PUT ~/workspace/fyd-lane/claim/store.ts $REPO/src/fyd/claim/store.ts
$PUT ~/workspace/fyd-lane/claim/__tests__/machine.test.ts $REPO/src/fyd/claim/__tests__/machine.test.ts

echo "=== 2. onboarding lane ==="
$BRIDGE "mkdir -p $REPO/src/fyd/onboarding/__tests__" < /dev/null
$PUT ~/workspace/fyd-lane/onboarding/extractor.ts $REPO/src/fyd/onboarding/extractor.ts
$PUT ~/workspace/fyd-lane/onboarding/anonymous-preview.ts $REPO/src/fyd/onboarding/anonymous-preview.ts
$PUT ~/workspace/fyd-lane/onboarding/index.ts $REPO/src/fyd/onboarding/index.ts
$PUT ~/workspace/fyd-lane/onboarding/__tests__/extractor.test.ts $REPO/src/fyd/onboarding/__tests__/extractor.test.ts
$PUT ~/workspace/fyd-lane/onboarding/__tests__/anonymous-preview.test.ts $REPO/src/fyd/onboarding/__tests__/anonymous-preview.test.ts

echo "=== 3. single shared jest config (no 13th config) ==="
$PUT ~/workspace/fyd-lane/net/jest.config.cjs $REPO/src/fyd/net/jest.config.cjs
$BRIDGE "rm -f $REPO/src/fyd/claim/jest.config.cjs && echo extra-config-removed" < /dev/null

echo "=== 4. API routes + page ==="
for f in "api/fyd/onboarding/preview/route.ts" \
         "api/fyd/claims/verification-methods/route.ts" \
         "api/fyd/claims/identity/route.ts" \
         "api/fyd/claims/[resourceId]/route.ts" \
         "api/fyd/claims/[resourceId]/claim/route.ts" \
         "api/fyd/claims/[resourceId]/verify/route.ts" \
         "api/fyd/claims/[resourceId]/release/route.ts"; do
  dest="$REPO/src/app/$f"
  $BRIDGE "mkdir -p \"\$(dirname \"$dest\")\"" < /dev/null
  $PUT ~/workspace/fyd-lane/routes/$f "$dest"
done
$PUT ~/workspace/fyd-lane/routes/app/fyd/page.tsx $REPO/src/app/fyd/page.tsx

echo "=== 5. lane jest suite ==="
$BRIDGE "cd $REPO && npx jest --config src/fyd/net/jest.config.cjs 2>&1 | tail -6" < /dev/null

echo "=== 6. typecheck new/changed TS ==="
$BRIDGE "cd $REPO && npx tsc --noEmit -p tsconfig.json 2>&1 | head -20; echo tsc-done" < /dev/null

echo "=== 7. status ==="
$BRIDGE "cd $REPO && git status --short" < /dev/null
echo "transfer-remaining done"
