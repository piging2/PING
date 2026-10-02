#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
PD=/home/nolan/fyd-preview-patches
cd "$WT"
for p in display-media-src-allowlist.patch export-customer-data-script-escape.patch safe-link-email-shape-tighten.patch; do
  echo "=== APPLY $p ==="
  git apply --verbose "$PD/$p" 2>&1 && echo "APPLIED: $p" || echo "APPLY_FAIL: $p"
done
echo "=== WT STATUS ==="
git status --porcelain
echo "=== FAILED PATCH HUNK DETAIL ==="
for p in o-capability-safe-link.patch o-contact-block-safe-link.patch; do
  echo "--- $p ---"
  git apply --check --verbose "$PD/$p" 2>&1 | head -12
done
echo "=== TARGET FILE SNIPPETS (clean tree) ==="
echo "--- src/fyd/object/view.ts head ---"
sed -n '28,45p' src/fyd/object/view.ts
echo "--- src/app/o/[objectId]/page.tsx head ---"
sed -n '18,35p' 'src/app/o/[objectId]/page.tsx'
