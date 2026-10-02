cd /home/nolan/projects/ping || exit 1
echo '=== proceduralize/runs ==='
ls src/fyd/proceduralize/runs/ 2>/dev/null | head -20
echo '=== proceduralize/raw ==='
ls src/fyd/proceduralize/raw/ 2>/dev/null | head -20
echo '=== repo corpus/manifest hits ==='
find . -path ./node_modules -prune -o -type d \( -iname "*corpus*" -o -iname "*manifest*" \) -print 2>/dev/null | head
find . -path ./node_modules -prune -o -type f -iname "*manifest*.json" -print 2>/dev/null | head
echo '=== graph files count ==='
find src/fyd -name "*graph*.ts" | grep -v __tests__ | head -20
