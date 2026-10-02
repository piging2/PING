cd /home/nolan/projects/ping
echo "=== predicates in fyd generator/builder ==="
grep -rhoE '"(offers|located_at|employs|member_of|works_for|has_website|authored_by|published|authored|presents|testifies|documents)"' src/fyd --include='*.ts' | sort | uniq -c | sort -rn
echo "=== article schema refs ==="
grep -rn 'ping.social.article@1\|ping.social.project@1' src/fyd --include='*.ts' -l | grep -v __tests__ | head
echo "=== article predicates in renderer ==="
grep -rnoE 'predicate: "[a-z_]+"' src/fyd/generator/*.ts src/fyd/builder/*.ts 2>/dev/null | head; ls src/fyd
