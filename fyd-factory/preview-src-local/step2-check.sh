#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
PATCHES=/home/nolan/fyd-preview-patches
cd "$WT"
for p in o-capability-safe-link.patch o-contact-block-safe-link.patch display-media-src-allowlist.patch export-customer-data-script-escape.patch safe-link-email-shape-tighten.patch; do
  echo "=== CHECK $p ==="
  if git apply --check --verbose "$PATCHES/$p" 2>&1; then
    echo "CHECK_OK: $p"
  else
    echo "CHECK_FAIL: $p"
  fi
done
