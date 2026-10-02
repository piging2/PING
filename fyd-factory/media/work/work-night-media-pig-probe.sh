cd /home/nolan/projects/ping
git rev-parse --abbrev-ref HEAD
git log --oneline -1
echo "=== resolveSafeLink defs ==="
grep -rn "resolveSafeLink" --include="*.ts" --include="*.tsx" src/ 2>/dev/null | grep -i "export\|function\|const" | head -10
echo "=== A44 / DisplayMedia.src refs ==="
grep -rln "DisplayMedia" --include="*.tsx" --include="*.ts" src/fyd 2>/dev/null | head -10
