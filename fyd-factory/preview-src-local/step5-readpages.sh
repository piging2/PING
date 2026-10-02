#!/bin/bash
set -uo pipefail
S=/home/nolan/fyd-preview-staging
echo "=== ask/page.tsx ==="
cat "$S/ask/page.tsx"
echo "=== owner-console/page.tsx head ==="
head -60 "$S/owner-console/page.tsx"
