cd /home/nolan/projects/ping
echo "=== privacy hunk ==="
grep -n "decisionsForGraph(overlaid.graph, siteId)" src/app/api/fyd/ask/ask-pipeline.ts
echo "=== PII flow check: any logging/emitting of claims in composer/visitor-answer ==="
grep -n "console\.\|emit\|vector\|learn" src/lib/ping/ask-composer.ts | head -10
grep -n "console\.\|emit(\|vector" src/fyd/ask/visitor-answer.ts | head -10
echo "=== tsc ==="
ls tsconfig*.json 2>/dev/null
