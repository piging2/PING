#!/bin/bash
# Apply wiring reconcile (a): UNSUPPORTED into FailureCode enum. Uncommitted diff only.
set -e
WT=/home/nolan/projects/ping-bcq-substrate
cd "$WT"
F=src/fyd/connectors/kit/types.ts
python3 - "$F" <<'EOF'
import sys
p = sys.argv[1]
s = open(p).read()
old = """  TRANSIENT = 'TRANSIENT',
  PERMANENT = 'PERMANENT',
}"""
new = """  TRANSIENT = 'TRANSIENT',
  PERMANENT = 'PERMANENT',
  /** Lane K taxonomy v1.0.0 \u00a72.9: operation not offered by this source
   *  (e.g. HTTP 405/501, never worked). Not retried; dead-lettered; registry
   *  marks the capability unsupported. Added by wiring reconcile 2026-09-23. */
  UNSUPPORTED = 'UNSUPPORTED',
}"""
assert old in s, "anchor not found"
assert s.count("UNSUPPORTED") == 0, "already present"
open(p, "w").write(s.replace(old, new, 1))
print("edit applied")
EOF
echo "== diff =="
git diff -- "$F" | head -30
echo "== typecheck with repo tsconfig (strict) =="
npx --yes -p typescript tsc --noEmit --strict --noUnusedLocals --noUnusedParameters --target es2022 --module nodenext --moduleResolution nodenext src/fyd/connectors/kit/types.ts 2>&1 | head -10
echo "tsc-exit=$?"
