#!/bin/bash
cd /home/nolan/projects/ping
echo "=== real skip/xit/focused tests in src/fyd ==="
grep -rn --include='*.ts' --include='*.tsx' --include='*.js' -E '(^|[^a-zA-Z])(describe|test|it)\.(skip|todo)\(|(^|[^a-zA-Z])(xit|xtest|xdescribe|fit|fdescribe)\(' src/fyd 2>/dev/null | head -20
echo "=== TEST/GATE known failures in test files (expect/todo) ==="
grep -rn --include='*.ts' --include='*.tsx' --include='*.js' -i 'todo(' src/fyd/__tests__ src/fyd/**/__tests__ 2>/dev/null | head -10
echo "=== git log: FYD-001 hero/claim commits detail ==="
git show --stat 0dec40f5 | head -20; echo ---; git show --stat fa0f7efa | head -20
echo "=== commit messages with known/honest/safe/unsafe in fyd ==="
git log --format='%h %ad %s' --date=short -i --grep="honest\|unsafe\|claim" -- src/fyd | head -20
