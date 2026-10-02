#!/bin/bash
# PING website surgical upgrade: install prepared files + apply targeted edits.
set -euo pipefail

T=/mnt/c/Users/nolan/transfer/ping-upgrade
R=/home/nolan/projects/ping

cd "$T"
echo "--- checksum verify ---"
sha256sum -c MANIFEST.sha256

echo "--- copy files into place ---"
cp effects-provider.tsx   "$R/src/components/effects-provider.tsx"
cp effects-toggle.tsx      "$R/src/components/effects-toggle.tsx"
cp hero-intro.tsx          "$R/src/components/hero-intro.tsx"
cp scroll-reveal.tsx       "$R/src/components/scroll-reveal.tsx"
cp blueprint-grid.tsx      "$R/src/components/blueprint-grid.tsx"
cp lenis-provider.tsx      "$R/src/components/lenis-provider.tsx"
cp hero-evidence-card.tsx  "$R/src/components/architecture/hero-evidence-card.tsx"
cat effects-append.css >> "$R/src/app/globals.css"

echo "--- apply targeted edits ---"
python3 apply-edits.py

echo "--- resulting status ---"
cd "$R"
git status --short
echo "INSTALL COMPLETE"
