#!/bin/bash
# LANE-ARCH probe G: harvest depth + constraint evidence (read-only)
set -u
REPO=/home/nolan/projects/ping
cd "$REPO"
echo "=== metrics.ts ==="
grep -E '^export (class|function|const|type|interface)' src/lib/metrics.ts | head -20
echo "=== grants.ts ==="
cat src/lib/ping/grants.ts | head -60
echo "=== ask-composer exports ==="
grep -E '^export (class|function|const|type|interface)' src/lib/ping/ask-composer.ts | head -30
echo "=== FydGrant def ==="
grep -n "FydGrant" src/lib/ping/types.ts | head -5
echo "=== CONSTRAINT: no customer JSX rule ==="
grep -rn "customer-specific JSX\|customer JSX\|No customer fact\|hand-layout" src/fyd/TEST-GATE.md src/app/sites/coppersmith-plumbing/page.tsx 2>/dev/null | head -8
echo "=== CONSTRAINT: motion never gates content ==="
head -50 src/fyd/components/fyd-motion-fallback.tsx
echo "=== CONSTRAINT: Ask FYD real-or-hidden (global-ask-dock head) ==="
head -60 src/fyd/ui/global-ask-dock.tsx
echo "=== CONSTRAINT: em dash rule ==="
grep -rni "em dash\|no em-dash" src/fyd/TEST-GATE.md src/fyd --include='*.md' | head -8
echo "=== CONSTRAINT: all-objects explorer removal ==="
grep -rni "all objects\|all-objects" src/fyd --include='*.ts' --include='*.tsx' | grep -vi test | head -10
echo "=== TEST-GATE.md head ==="
head -80 src/fyd/TEST-GATE.md
