#!/bin/bash
# AGENT-17 probe 3: sites + sitespec + binding verifier (READ-ONLY)
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== sitespec dir ==="
ls -R src/fyd/sitespec 2>/dev/null | head -40
echo "=== sites pages: imports + generateSiteSpec/BindingVerifier usage ==="
for f in src/app/sites/happy-place/page.tsx src/app/sites/coppersmith-plumbing/page.tsx; do
  echo "--- $f (first 80 lines) ---"; head -80 "$f"
done
echo "=== grep BindingVerifier across src ==="
grep -rln 'BindingVerifier' src --include='*.ts' --include='*.tsx' | sort
echo "=== grep generateSiteSpec across src ==="
grep -rln 'generateSiteSpec' src --include='*.ts' --include='*.tsx' | sort
echo "=== grep verifyPresentationBinding across src ==="
grep -rln 'verifyPresentationBinding' src --include='*.ts' --include='*.tsx' | sort
