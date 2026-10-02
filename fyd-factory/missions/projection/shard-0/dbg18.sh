#!/bin/bash
cat > /tmp/dbg18.ts <<'EOF'
// replicate mission 18 mutation + website-sections to find stale value in text
import * as fs from "node:fs";
const src = fs.readFileSync("/home/nolan/fyd-projection-harness/harness.ts", "utf8");
// pull mutateGraph + SDK pieces via a targeted eval is messy; instead re-run harness with a debug hook env var
EOF
# simpler: add temporary debug print via env PROJ_DEBUG=18 in a scratch copy of the harness
cp /home/nolan/fyd-projection-harness/harness.ts /tmp/harness-dbg.ts
python3 - <<'PYEOF'
p='/tmp/harness-dbg.ts'
t=open(p).read()
old="""        if (claimText.includes(s.ownerCorrection.sourceValue))
          findings.push(F("MISLABEL", p.kind, "Stale source phone value presented in public claim text after owner correction.", `projection=${p.kind} stale=${s.ownerCorrection.sourceValue}`, "SOURCE SAYS X / OWNER SAYS Y precedence", `mislabel:${p.kind}:stale-source-value`, 0.9));"""
new="""        if (claimText.includes(s.ownerCorrection.sourceValue)) {
          findings.push(F("MISLABEL", p.kind, "Stale source phone value presented in public claim text after owner correction.", `projection=${p.kind} stale=${s.ownerCorrection.sourceValue}`, "SOURCE SAYS X / OWNER SAYS Y precedence", `mislabel:${p.kind}:stale-source-value`, 0.9));
          for (const cl of p.claims) if (cl.text.includes(s.ownerCorrection.sourceValue)) console.log("DBG", p.kind, JSON.stringify(cl.text.slice(0,160)));
        }"""
assert old in t
open(p,'w').write(t.replace(old,new))
print("debug hook added")
PYEOF
cd /home/nolan/projects/ping && ./node_modules/.bin/tsx /tmp/harness-dbg.ts --start=18 --end=19 --fixture-dir=/home/nolan/fyd-fixtures-p0 --out=/tmp/dbgout 2>&1 | grep -E "DBG|outcome" | head -20
