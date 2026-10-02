#!/usr/bin/env python3
"""Generate a Pig-side transfer script from the staged files."""
import base64
import os

STAGED = "/home/hatch/workspace/fyd-factory/dehpp/staged"
WT = "/home/nolan/fyd-dehpp-wt"

# (staged relative path, worktree relative path)
FILES = [
    ("src/fyd/copy/defaults.ts", "src/fyd/copy/defaults.ts"),
    ("src/fyd/compose/profile.ts", "src/fyd/compose/profile.ts"),
    ("src/fyd/compose/params.ts", "src/fyd/compose/params.ts"),
    ("src/app/sites/_shared/customer-site.tsx", "src/app/sites/_shared/customer-site.tsx"),
    ("src/app/sites/_shared/demo-chrome.tsx", "src/app/sites/_shared/demo-chrome.tsx"),
    ("src/app/sites/_shared/compose-site.ts", "src/app/sites/_shared/compose-site.ts"),
    ("src/app/sites/happy-place/composition.ts", "src/app/sites/happy-place/composition.ts"),
    ("src/app/sites/happy-place/page.tsx", "src/app/sites/happy-place/page.tsx"),
    ("src/fyd/compose/__tests__/composition.test.ts", "src/fyd/compose/__tests__/composition.test.ts"),
    ("src/fyd/compose/__tests__/params.test.ts", "src/fyd/compose/__tests__/params.test.ts"),
    ("src/fyd/copy/__tests__/defaults.test.ts", "src/fyd/copy/__tests__/defaults.test.ts"),
    ("src/fyd/proceduralize/__tests__/composition.test.ts", "src/fyd/proceduralize/__tests__/composition.test.ts"),
    ("edit-renderer.py", "/tmp/dehpp/edit-renderer.py"),
    ("edit-generator.py", "/tmp/dehpp/edit-generator.py"),
    ("edit-types-validator.py", "/tmp/dehpp/edit-types-validator.py"),
]

lines = ["#!/bin/bash", "set -e", f"mkdir -p {WT}/src/fyd/copy {WT}/src/fyd/compose/__tests__ {WT}/src/fyd/copy/__tests__ /tmp/dehpp"]
for staged_rel, wt_rel in FILES:
    with open(os.path.join(STAGED, staged_rel), "rb") as f:
        blob = base64.b64encode(f.read()).decode()
    lines.append(f"base64 -d > {wt_rel if wt_rel.startswith('/tmp') else WT + '/' + wt_rel} <<'B64EOF'")
    # 76-char wrapped
    for i in range(0, len(blob), 76):
        lines.append(blob[i:i+76])
    lines.append("B64EOF")
lines.append("echo TRANSFER_OK")
lines.append(f"cd {WT} && python3 /tmp/dehpp/edit-types-validator.py && python3 /tmp/dehpp/edit-generator.py && python3 /tmp/dehpp/edit-renderer.py")

out = "/home/hatch/workspace/fyd-factory/dehpp/work-70-transfer.sh"
with open(out, "w") as f:
    f.write("\n".join(lines) + "\n")
print(f"wrote {out}, {len(lines)} lines")
