cd /home/nolan/projects/ping
echo "=== pre-commit status ==="
git status --porcelain | head -60
git add \
  src/app/api/fyd/ask/\[siteId\]/route.ts \
  src/app/api/fyd/ask/route.ts \
  src/app/api/fyd/ask/ask-pipeline.ts \
  src/app/api/fyd/why-this/route.ts \
  src/app/api/fyd/ask/__tests__/ask-classes-tenant.test.ts \
  src/app/api/fyd/ask/__tests__/object-scope.test.ts \
  src/app/api/fyd/ask/__tests__/ask-support-classes.test.ts \
  src/fyd/ask/visitor-answer.ts \
  src/fyd/ask/types.ts \
  src/fyd/ask/site-patch.ts \
  src/fyd/ask/__tests__/demo-classification.test.ts \
  src/fyd/ask/__tests__/lane-e-battery.test.ts \
  src/fyd/object/commands.ts \
  src/fyd/object/why-this-steps.ts \
  src/fyd/object/__tests__/confirm-command.test.ts \
  src/fyd/object/__tests__/consequence-detection.test.ts \
  src/lib/ping/ask-composer.ts
echo "=== staged ==="
git diff --cached --stat | tail -20
git commit -m "Ask: claim grouping population for multi-evidence classification; 5 support classes + 3 coarse states; Why This; 4-tier approval (Lanes K+Q)"
echo "=== new HEAD ==="
git log --oneline -2
echo "=== remaining dirty (other lanes) ==="
git status --porcelain | head -40
