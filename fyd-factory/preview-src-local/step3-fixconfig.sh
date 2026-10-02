#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
python3 - "$WT" <<'PYEOF'
import sys
wt = sys.argv[1]
p = wt + "/next.config.ts"
s = open(p).read()
addition = (
    "  experimental: {\n"
    "    // NIGHT PREVIEW (worktree-only): bundle the PING projection JSONs into\n"
    "    // serverless functions that read them with fs at request time. On the\n"
    "    // Pig these come from /home/nolan/ping/var/fyd-projections instead.\n"
    '    outputFileTracingIncludes: {\n'
    '      "/**": ["./fyd-night-projections/*.json"],\n'
    "    },\n"
    "  },\n"
)
assert "outputFileTracingIncludes" not in s, "already present"
anchor = "};\n\nexport default nextConfig;"
assert anchor in s, "anchor missing"
s = s.replace(anchor, addition + anchor, 1)
open(p, "w").write(s)
print("next.config.ts patched")
PYEOF
tail -16 "$WT/next.config.ts"
echo "=== tsc check of new pages only (quick) ==="
cd "$WT" && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "fyd-night" | head -20; echo "TSC_FYD_NIGHT_DONE"
