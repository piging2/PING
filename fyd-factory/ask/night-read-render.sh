#!/bin/bash
cd /home/nolan/projects/ping
echo "=== claimsUnknowns rendering ==="
grep -n "claimsUnknowns\|function renderAnswer" -A 40 src/fyd/ask/concierge.ts | sed -n '1,120p'
echo ""
echo "=== claimClass values used ==="
grep -n "claimClass" src/fyd/ask/concierge.ts | head -20
echo ""
echo "=== AskClaimClassification type ==="
grep -n "AskClaimClassification\|AskEvidenceRef" -A 10 src/fyd/ask/types.ts | head -40
