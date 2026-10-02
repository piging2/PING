#!/bin/bash
cd /home/nolan/projects/ping || exit 1
python3 - <<'PYEOF'
p = "src/fyd/lineage/verify-tracer.ts"
s = open(p).read()
old = 'sections: "home:Services:2,services:Services:0",'
new = 'sections: ["home:Services:2", "services:Services:0"],'
assert s.count(old) == 2, f"expected 2 occurrences, found {s.count(old)}"
s = s.replace(old, new)
open(p, "w").write(s)
print("patched sections to arrays")
PYEOF
npx tsx --import ./src/fyd/lineage/register-css.mjs src/fyd/lineage/verify-tracer.ts 2>&1 | grep -v "at section\|at SectionShell\|at ServicesSection\|Warning:" | head -12
