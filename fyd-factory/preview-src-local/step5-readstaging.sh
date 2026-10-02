#!/bin/bash
set -uo pipefail
S=/home/nolan/fyd-preview-staging
echo "=== staging dir ==="
ls -la "$S"
echo "=== README ==="
cat "$S/STAGING-README.md"
echo "=== sha256 ==="
sha256sum "$S/ask/page.tsx" "$S/owner-console/page.tsx"
