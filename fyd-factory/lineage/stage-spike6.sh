#!/bin/bash
cd /home/nolan/projects/ping || exit 1
# Insert the React-global shim at the top of the spike (classic JSX fallback).
python3 - <<'PY'
p = "src/fyd/lineage/spike-trace.ts"
t = open(p).read()
shim = 'import * as React from "react";\n(globalThis as any).React = React;\n'
if "(globalThis as any).React" not in t:
    t = t.replace('import { createHash } from "node:crypto";', shim + 'import { createHash } from "node:crypto";', 1)
    open(p, "w").write(t)
    print("shim inserted")
else:
    print("shim already present")
PY
TSX_TSCONFIG_PATH=/home/nolan/projects/ping/src/fyd/lineage/tsconfig.tracer.json npx tsx --import ./src/fyd/lineage/register-css.mjs src/fyd/lineage/spike-trace.ts 2>&1 | head -60
