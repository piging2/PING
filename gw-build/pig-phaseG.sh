#!/usr/bin/env bash
# GW-BUILD Phase G: commit the permanent gates + leakage audit. No push.
set -u
WT=/home/nolan/ping/worktrees/gw-repair-build
B=/tmp/gw-build
cd "$WT"
echo "=== G1. install gate files ==="
mkdir -p gateway/regression-gates
cp "$B/gates/gate-replay-converge.mjs" gateway/regression-gates/
cp "$B/gates/repro-witness-remint.mjs" gateway/regression-gates/
cp "$B/gates/gate-auth-posture.sh" gateway/regression-gates/
cp "$B/gates/README.md" gateway/regression-gates/
chmod +x gateway/regression-gates/gate-auth-posture.sh
node --check gateway/regression-gates/gate-replay-converge.mjs
node --check gateway/regression-gates/repro-witness-remint.mjs
bash -n gateway/regression-gates/gate-auth-posture.sh
echo "=== G2. npm script entries ==="
python3 - <<'PYEOF'
import json, collections
p = 'gateway/package.json'
d = json.load(open(p), object_pairs_hook=collections.OrderedDict)
s = d.get('scripts', collections.OrderedDict())
s['gate:witness-remint'] = 'node regression-gates/repro-witness-remint.mjs'
s['gate:replay-converge'] = 'node regression-gates/gate-replay-converge.mjs'
s['gate:auth-posture'] = './regression-gates/gate-auth-posture.sh'
d['scripts'] = s
json.dump(d, open(p, 'w'), indent=2)
open(p, 'a').write('\n')
print("scripts added")
PYEOF
git diff -- gateway/package.json | head -20
echo "=== G3. commit ==="
git add gateway/regression-gates gateway/package.json
git status --short
git commit -m "gateway: permanent regression gates for auth posture and retry identity

Commits the gates so the 2026-09-24 regressions can never silently return:
- gateway/regression-gates/repro-witness-remint.mjs (W-1 retry identity)
- gateway/regression-gates/gate-replay-converge.mjs (W-2 retry identity)
- gateway/regression-gates/gate-auth-posture.sh (7-route 401 posture)
- npm scripts: gate:witness-remint, gate:replay-converge, gate:auth-posture

The runbook's failure was treating 'gated' as verdict-forgery only; the
HTTP auth posture is now a first-class regression gate alongside the
worker retry-identity gates."
git log --oneline -3
echo "=== G4. leakage audit (GATE-SECRET-001a) ==="
echo "--- secret-shaped scan over branch diff (this lane's commits) ---"
git log -p -2 --format='%H' | grep -nE "MUSE_LEVEL_[12]_KEY=|pk_[0-9a-f]{32,}|BEGIN [A-Z ]*PRIVATE KEY" | head -5 || echo "no secret shapes in committed diff"
echo "--- worktree scan for stray key material ---"
grep -rnE "MUSE_LEVEL_[12]_KEY\s*=\s*['\"]?[A-Za-z0-9_+/=-]{16,}" gateway/regression-gates/ gateway/package.json 2>/dev/null | head -5 || echo "no key material in gate files"
echo "--- untracked files check ---"
git status --short
echo "--- /tmp/gw-build artifacts scan ---"
grep -rE "pk_[0-9a-f]{64}" /tmp/gw-build/ 2>/dev/null | head -3 || echo "no test-key residue in /tmp/gw-build"
ls /tmp/gw-build/scratch.env 2>/dev/null && echo "SCRATCH ENV STILL PRESENT" || echo "scratch env shredded/absent"
echo "=== PHASE G COMPLETE ==="
