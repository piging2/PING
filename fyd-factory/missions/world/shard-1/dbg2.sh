cd /home/nolan/projects/ping
ls src/fyd/components/schema-roles* 2>&1
echo "---"
grep -rn "schema-roles" src/fyd --include="*.ts" --include="*.tsx" -l | head
echo "--- git status of these files ---"
git status --short src/fyd/components/registry.ts src/fyd/sitespec/schemas.ts 2>&1
echo "--- diff registry vs HEAD (first 40 lines) ---"
git diff HEAD -- src/fyd/components/registry.ts 2>&1 | head -60
