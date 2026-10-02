#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== renderer diff stat ==="
git diff --stat src/fyd/components/renderer.tsx src/fyd/proceduralize/generator.ts src/fyd/sitespec/types.ts src/fyd/sitespec/validator.ts
echo "=== check the removed comment context ==="
git diff src/fyd/components/renderer.tsx | grep -B8 'Maya Alvarez' | head -20
echo "=== fix em dashes in compose-site.ts ==="
python3 - <<'PYEOF'
p = "src/app/sites/_shared/compose-site.ts"
src = open(p).read()
n = src.count("\u2014")
src = src.replace(" \u2014 ", " - ").replace("\u2014", "-")
open(p, "w").write(src)
print(f"replaced {n} em dashes")
PYEOF
grep -c $'\u2014' src/app/sites/_shared/compose-site.ts || echo "0 em dashes remain"