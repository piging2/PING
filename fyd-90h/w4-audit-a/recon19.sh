#!/bin/bash
# W4 Audit A - recon19: final details
set -u
WT=/tmp/w4-audit-ping
echo "=== A. 3235804d vs HEAD ==="
git -C "$WT" merge-base --is-ancestor 3235804d f877c3919941978f07d5014909595df4751ec258 && echo "3235804d IS ancestor of HEAD" || echo "3235804d NOT ancestor of HEAD"
git -C "$WT" merge-base --is-ancestor f877c3919941978f07d5014909595df4751ec258 3235804d && echo "HEAD is ancestor of 3235804d" || echo "HEAD NOT ancestor of 3235804d"
echo "=== B. approval-seam.ts rest (150-182) ==="
sed -n '150,182p' "$WT/src/fyd/sitepatch/approval-seam.ts"
echo "=== C. served render: title + mobile viewport + media queries ==="
grep -o "<title>[^<]*</title>" /home/nolan/ping/var/fyd-dogfood-renders/ping-fyd-home.html
grep -c "media" /home/nolan/ping/var/fyd-dogfood-renders/ping-fyd-home.html
grep -o "name=\"viewport\"[^>]*" /home/nolan/ping/var/fyd-dogfood-renders/ping-fyd-home.html | head -2
echo "=== D. ping-fyd.json relationships ==="
python3 -c "
import json
p=json.load(open('/home/nolan/ping/var/fyd-projections/ping-fyd.json'))
print('relationships:', len(p['graph']['relationships']))
for r in p['graph']['relationships']: print(' ', r['id'], r['subject'], '->', r['predicate'], '->', r['object'])
print('presentationIntent keys:', list(p.get('presentationIntent', {}).keys()))
"
echo "=== E. served render age vs HEAD ==="
grep -o "PING Social[^<]\{0,80\}" /home/nolan/ping/var/fyd-dogfood-renders/ping-fyd-home.html | head -5
