#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
python3 - <<'PYEOF'
p = "src/fyd/compose/params.ts"
src = open(p).read()
old = '* renders as "65-83" (or "65" when start == end); when eventSequences is'
new = '* renders as "start-end" (or "start" when start == end); when eventSequences is'
assert src.count(old) == 1
open(p, "w").write(src.replace(old, new))
print("comment reworded")
PYEOF
grep -rn "65-83" src/ --include="*.ts" --include="*.tsx" | grep -v "__fixtures__" | grep -v "site-client.tsx" | head -5
echo "(only legacy site-client should remain)"