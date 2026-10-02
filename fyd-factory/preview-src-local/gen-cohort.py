#!/usr/bin/env python3
"""Generate step5-cohort.sh: bundles cohort JSONs + rewritten cohort page into the worktree."""
import base64
import hashlib
from pathlib import Path

HOME = Path.home()
ACQ = HOME / "workspace/fyd-factory/cohort/acquisitions"
NEWFILES = HOME / "workspace/fyd-factory/preview-src-local/newfiles"
OUT = HOME / "workspace/fyd-factory/preview-src-local/step5-cohort.sh"

# Only bundle complete acquisitions (graph + sitespec present)
COMPLETE = []
for f in sorted(ACQ.glob("*.json")):
    import json
    d = json.loads(f.read_text())
    if d.get("graph") and d.get("sitespec") and d.get("site_id") == f.stem:
        COMPLETE.append(f.stem)
    else:
        print(f"SKIP incomplete: {f.name}")

print("bundling:", COMPLETE)

lines = [
    "#!/bin/bash",
    "set -uo pipefail",
    'WT=/home/nolan/fyd-preview-wt',
    'DD="$WT/src/app/fyd-night/cohort/_data"',
    'mkdir -p "$DD"',
]

for site_id in COMPLETE:
    src = ACQ / f"{site_id}.json"
    data = src.read_bytes()
    sha = hashlib.sha256(data).hexdigest()
    lines.append(f"echo 'expect {site_id}.json sha256={sha}'")
    lines.append(f'base64 -d > "$DD/{site_id}.json" <<\'JSONEOF64\'')
    lines.append(base64.b64encode(data).decode())
    lines.append("JSONEOF64")
    lines.append(f'sha256sum "$DD/{site_id}.json"')

# manifest
import json as _json
manifest = _json.dumps({"siteIds": COMPLETE}, indent=2) + "\n"
lines.append("cat > \"$DD/manifest.json\" <<'MANIFESTEOF'")
lines.append(manifest.rstrip("\n"))
lines.append("MANIFESTEOF")
lines.append('cat "$DD/manifest.json"')

# rewritten cohort page
page = (NEWFILES / "src/app/fyd-night/cohort/[siteId]/page.tsx").read_bytes()
lines.append('base64 -d > "$WT/src/app/fyd-night/cohort/[siteId]/page.tsx" <<\'PAGEEOF64\'')
lines.append(base64.b64encode(page).decode())
lines.append("PAGEEOF64")
lines.append('echo "cohort page replaced"; wc -l "$WT/src/app/fyd-night/cohort/[siteId]/page.tsx"')
lines.append('ls "$DD"')

OUT.write_text("\n".join(lines) + "\n")
print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")
