#!/bin/bash
# STEP 11: add deployment-safe bundled-projection fallback to projectionDir().
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
F="$WT/src/fyd/data/ping-object-source.ts"
cp "$F" "$F.prebundled.bak"
python3 - "$F" <<'PYEOF'
import sys
p = sys.argv[1]
s = open(p).read()
old_import = 'import { readFileSync, readdirSync } from "node:fs";'
new_import = 'import { existsSync, readFileSync, readdirSync } from "node:fs";'
assert old_import in s, "import line not found"
s = s.replace(old_import, new_import, 1)
old_fn = '''function projectionDir(): string {
  return (
    process.env.FYD_PROJECTION_DIR ?? "/home/nolan/ping/var/fyd-projections"
  );
}'''
new_fn = '''function projectionDir(): string {
  if (process.env.FYD_PROJECTION_DIR) return process.env.FYD_PROJECTION_DIR;
  // Protected preview (Vercel): projections are bundled with the deployment
  // via next.config.ts outputFileTracingIncludes. Prefer the bundled copy
  // when it exists; otherwise keep the production PING var-dir default.
  const bundled = join(process.cwd(), "fyd-night-projections");
  if (existsSync(bundled)) return bundled;
  return "/home/nolan/ping/var/fyd-projections";
}'''
assert old_fn in s, "projectionDir not found"
s = s.replace(old_fn, new_fn, 1)
open(p, "w").write(s)
print("patched ok")
PYEOF
rm "$F.prebundled.bak"
grep -n "existsSync" "$F" | head -3
