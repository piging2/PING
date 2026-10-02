cd /home/nolan/projects/ping
git apply --cached --check /tmp/whythis-renderer-auto.patch && git apply --cached /tmp/whythis-renderer-auto.patch && echo "STAGED_RENDERER_HUNKS"
git add src/fyd/object/why-this-steps.ts src/fyd/object/__tests__/why-this-steps.test.ts
git status --short | head -30
echo "--- cached stat ---"
git diff --cached --stat
