#!/bin/bash
set -u
python3 - <<'PYEOF'
import io
p = "/home/nolan/projects/ping/src/app/sites/_shared/site-metadata.ts"
s = io.open(p, encoding="utf-8").read()
old = '''} from "@/fyd/sitespec/binding-verifier";
import type { PingObject } from "@/lib/ping/types";
import type { ObjectGraph } from "@/fyd/sitespec/types";'''
new = '''} from "@/fyd/sitespec/binding-verifier";
import type { ObjectGraph } from "@/fyd/sitespec/types";'''
assert old in s, "anchor missing"
io.open(p, "w", encoding="utf-8").write(s.replace(old, new))
print("unused import removed")
PYEOF
