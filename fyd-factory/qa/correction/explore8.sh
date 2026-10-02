cd /home/nolan/projects/ping
echo "===== grep confirm/correct in customize + owner-mode ====="
grep -rni "confirm\|correction" src/fyd/customize/*.ts src/fyd/owner-mode/*.ts src/fyd/owner-mode/*.tsx 2>/dev/null | grep -vi "confirming" | head -30
echo ""
echo "===== grep edit_copy ====="
grep -rn "edit_copy" src/fyd --include="*.ts" --include="*.tsx" -l | grep -v __tests__ | head
echo ""
echo "===== server.ts head ====="
head -100 src/fyd/customize/server.ts
