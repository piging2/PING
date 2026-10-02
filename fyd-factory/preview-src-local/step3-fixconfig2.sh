#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
python3 - "$WT" <<'PYEOF'
import sys
wt = sys.argv[1]
p = wt + "/next.config.ts"
s = open(p).read()
old = """  experimental: {
    // NIGHT PREVIEW (worktree-only): bundle the PING projection JSONs into
    // serverless functions that read them with fs at request time. On the
    // Pig these come from /home/nolan/ping/var/fyd-projections instead.
    outputFileTracingIncludes: {
      "/**": ["./fyd-night-projections/*.json"],
    },
  },
"""
new = """  // NIGHT PREVIEW (worktree-only): bundle the PING projection JSONs into
  // serverless functions that read them with fs at request time. On the
  // Pig these come from /home/nolan/ping/var/fyd-projections instead.
  // (Next 15: top-level key, not experimental.)
  outputFileTracingIncludes: {
    "/**": ["./fyd-night-projections/*.json"],
  },
"""
assert old in s, "old block missing"
s = s.replace(old, new, 1)
open(p, "w").write(s)
print("config fixed")
PYEOF
grep -n -A5 "NIGHT PREVIEW" "$WT/next.config.ts"
