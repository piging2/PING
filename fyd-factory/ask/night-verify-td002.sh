#!/bin/bash
cd /home/nolan/projects/ping
echo "=== visitor-answer.ts: contract line, applyFieldVisibility, composeAskFyd ==="
sed -n '10,20p' src/fyd/ask/visitor-answer.ts
grep -n "applyFieldVisibility(graph" src/fyd/ask/visitor-answer.ts
grep -n "composeAskFyd" src/fyd/ask/visitor-answer.ts
echo ""
echo "=== ask-composer.ts: location read ==="
grep -n 'fieldOf(target, "location")' src/lib/ping/ask-composer.ts
echo ""
echo "=== field-visibility.ts: HIDE drop ==="
sed -n '95,115p' src/fyd/sitespec/field-visibility.ts
echo ""
echo "=== resolveFieldVisibility name heuristic ==="
grep -n "address" src/fyd/sitespec/field-visibility.ts | head -10
echo ""
echo "=== answer.ts imports (concierge absent?) ==="
sed -n '1,20p' src/fyd/ask/answer.ts | grep -n "import"
grep -c "concierge" src/fyd/ask/answer.ts || echo "no concierge refs in answer.ts"
echo ""
echo "=== ask-pipeline imports answerAskFyd ==="
grep -n "answerAskFyd" src/app/api/fyd/ask/ask-pipeline.ts | head -3
echo ""
echo "=== projectPublicFacts docstring claim ==="
grep -rn "Ask FYD" src/fyd/owner-mode/visibility-policy.ts | head -5
