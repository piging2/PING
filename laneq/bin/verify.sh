cd /home/nolan/projects/ping
echo "=== composer grouping markers ==="
grep -c "offers these services" src/lib/ping/ask-composer.ts
grep -c "associationsClaim" src/lib/ping/ask-composer.ts
echo "=== visitor-answer re-export ==="
grep -n "export type { AskClaimClassification }" src/fyd/ask/visitor-answer.ts
echo "=== git status (my two files) ==="
git status --porcelain src/lib/ping/ask-composer.ts src/fyd/ask/visitor-answer.ts
