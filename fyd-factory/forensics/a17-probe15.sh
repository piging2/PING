#!/bin/bash
# AGENT-17 probe 15: page wiring + remaining stores (READ-ONLY)
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== follows storage ==="
grep -n 'FYD_FOLLOWS_DIR\|readFile\|writeFile\|KV_REST_API' src/fyd/object/follows.ts | head -8
echo "=== fydGatewayBaseUrl ==="
grep -rn 'function fydGatewayBaseUrl' src --include='*.ts' | head -3
echo "=== claim store backing ==="
grep -n 'FYD_CLAIM_DIR\|readFile\|writeFile\|KV_REST_API' src/fyd/claim/store.ts | head -8
echo "=== onboarding/preview caller ==="
grep -rn 'api/fyd/onboarding/preview' src --include='*.ts' --include='*.tsx' | grep -v 'src/app/api/fyd/onboarding' | head -3
echo "=== objects/[objectId] API callers ==="
grep -rln 'api/fyd/objects/' src --include='*.ts' --include='*.tsx' | grep -v 'src/app/api/fyd/objects' | head
echo "=== page data sources: feed, fyd, practice, node, embed, dev/objects, o/manage ==="
for p in src/app/feed/page.tsx src/app/practice/page.tsx 'src/app/node/[id]/page.tsx' src/app/embed/object/page.tsx src/app/dev/objects/page.tsx 'src/app/o/[objectId]/manage/page.tsx'; do
  echo "--- $p"; grep -n 'fetch(\|getPingObject\|loadObjectView\|import.*from "@/' "$p" | head -12
done
