#!/usr/bin/env python3
"""Generate step3-install.sh: embeds the 3 new files as base64 for Pig WSL install."""
import base64
from pathlib import Path

NEWFILES = Path.home() / "workspace/fyd-factory/preview-src-local/newfiles"
OUT = Path.home() / "workspace/fyd-factory/preview-src-local/step3-install.sh"

FILES = [
    "src/app/fyd-night/page.tsx",
    "src/app/fyd-night/cohort/[siteId]/page.tsx",
    "src/app/fyd-night/cohort/_data/manifest.json",
]

lines = [
    "#!/bin/bash",
    "set -uo pipefail",
    "WT=/home/nolan/fyd-preview-wt",
    'mkdir -p "$WT/fyd-night-projections" "$WT/src/app/fyd-night/cohort/[siteId]" "$WT/src/app/fyd-night/cohort/_data"',
    "cp /home/nolan/ping/var/fyd-projections/happy-place.json \"$WT/fyd-night-projections/happy-place.json\"",
    "cp /home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json \"$WT/fyd-night-projections/coppersmith-plumbing.json\"",
    'sha256sum "$WT/fyd-night-projections/"*.json',
    'cmp /home/nolan/ping/var/fyd-projections/happy-place.json "$WT/fyd-night-projections/happy-place.json" && echo PROJ_HP_IDENTICAL',
    'cmp /home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json "$WT/fyd-night-projections/coppersmith-plumbing.json" && echo PROJ_CP_IDENTICAL',
]

for f in FILES:
    b64 = base64.b64encode((NEWFILES / f).read_bytes()).decode()
    lines.append(f'base64 -d > "$WT/{f}" <<\'FILEEOF64\'')
    lines.append(b64)
    lines.append("FILEEOF64")

lines += [
    'echo "=== next.config.ts edit ==="',
    'python3 - "$WT" <<PYEOF',
    "import sys",
    "wt = sys.argv[1]",
    'p = wt + "/next.config.ts"',
    "s = open(p).read()",
    "addition = (",
    '    "  experimental: {\\n"',
    '    "    // NIGHT PREVIEW (worktree-only): bundle the PING projection JSONs into\\n"',
    '    "    // serverless functions that read them with fs at request time. On the\\n"',
    '    "    // Pig these come from /home/nolan/ping/var/fyd-projections instead.\\n"',
    '    "    outputFileTracingIncludes: {\\n"',
    '    "      \\"/**\\": [\\"./fyd-night-projections/*.json\\"],\\n"',
    '    "    },\\n"',
    '    "  },\\n"',
    ")",
    'assert "outputFileTracingIncludes" not in s, "already present"',
    'stripped = s.rstrip()',
    'assert stripped.endswith("};"), "unexpected config tail"',
    'idx = s.rfind("};")',
    's = s[:idx] + addition + s[idx:]',
    'open(p, "w").write(s)',
    'print("next.config.ts patched")',
    "PYEOF",
    'tail -14 "$WT/next.config.ts"',
    'echo "=== WT STATUS ==="',
    'cd "$WT" && git status --porcelain',
]

OUT.write_text("\n".join(lines) + "\n")
print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")
