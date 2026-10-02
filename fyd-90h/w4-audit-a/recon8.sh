#!/bin/bash
# W4 Audit A - recon8: fa0f7efa provenance rename vs ping-fyd.json dump date
set -u
WT=/tmp/w4-audit-ping
echo "=== A. fa0f7efa on HEAD ancestry + date ==="
git -C "$WT" merge-base --is-ancestor fa0f7efa f877c3919941978f07d5014909595df4751ec258 && echo "fa0f7efa IS ancestor of HEAD" || echo "NOT ancestor"
git -C "$WT" show -s --format="%h %ad %s" --date=iso fa0f7efa
echo "=== B. what fa0f7efa changed in types.ts ==="
git -C "$WT" show fa0f7efa -- src/lib/ping/types.ts | head -60
echo "=== C. projection dump date vs commit ==="
python3 -c "
import json
p=json.load(open('/home/nolan/ping/var/fyd-projections/ping-fyd.json'))
print('dumpedAt:', p['meta'].get('dumpedAt'), '| generatedAt:', p['meta'].get('generatedAt'), '| dumperVersion:', p['meta'].get('dumperVersion'))
"
echo "=== D. does HEAD dumper still exist / what kind does it emit ==="
grep -rn "overlay-authored\|owner-asserted" "$WT/src/fyd/data/" 2>/dev/null | head -10
ls "$WT/src/fyd/data/" 2>/dev/null | head -20
