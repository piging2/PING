cd /home/nolan/projects/ping
echo "=== composer diff ==="
git diff --stat src/lib/ping/ask-composer.ts src/fyd/ask/visitor-answer.ts
git diff src/lib/ping/ask-composer.ts | head -100
echo "=== visitor-answer diff ==="
git diff src/fyd/ask/visitor-answer.ts | head -40
