#!/bin/bash
# AGENT-17 probe 18: dual OAuth flows + practice session (READ-ONLY)
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== auth/google/start vs auth/link/google/start ==="
head -30 src/app/api/fyd/auth/google/start/route.ts
echo "----- link -----"
head -30 src/app/api/fyd/auth/link/google/start/route.ts
echo "=== practice session: what identity ==="
head -50 src/app/api/practice/session/route.ts
echo "=== who links to auth start URLs (buttons) ==="
grep -rln 'auth/google/start\|auth/link/google/start' src --include='*.tsx' | grep -v 'src/app/api' | head
echo "=== components dirs ==="
ls src/components/ && echo "--- fyd/ui count ---" && ls src/fyd/ui | head -40
