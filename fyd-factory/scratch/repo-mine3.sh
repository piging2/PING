#!/bin/bash
cd /home/nolan/projects/ping
echo "=== fix commits touching src/fyd (last 40, with body snippet) ==="
git log --format='%h %ad %s' --date=short -i --grep="fix" -- src/fyd | head -40
echo "=== FYD lanes failing test markers ==="
grep -rln "describe.skip\|test.skip\|xit\|fit(" src/fyd --include='*.ts' --include='*.tsx' --include='*.js' 2>/dev/null | head
echo "=== FYD2 entries anywhere in repo docs ==="
grep -rn "FL-20260921-FYD" src/fyd --include='*.md' 2>/dev/null | head -10
echo "=== known-failure comments ==="
grep -rn -i --include='*.ts' --include='*.tsx' --include='*.js' "known.fail\|known fail\|not yet impl\|not implemented\|known bug\|known issue\|known defect" src/fyd 2>/dev/null | grep -vi test | head -20
