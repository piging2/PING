grep -rn "findBusinessObject" /home/nolan/projects/ping/src --include=*.ts --include=*.tsx 2>/dev/null | grep -v __tests__ | head
echo "====="
grep -n "business" /home/nolan/projects/ping/src/fyd/data/ping-object-source.ts | head -20
