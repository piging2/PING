cd /home/nolan/projects/ping
grep -rn 'project@1' src/fyd --include='*.ts' | grep -v __fixtures__ | grep -v '__tests__' | head -20
echo "=== project predicate ==="
grep -rhoE 'predicate: "[a-z_]+".{0,60}project|project.{0,60}predicate' src/fyd --include='*.ts' 2>/dev/null | head
echo "=== case study mentions ==="
grep -rni 'case.study\|case_study' src/fyd --include='*.ts' | grep -vi test | head
