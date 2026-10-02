#!/bin/bash
# run-mkt-groups.sh — cron runner: when no FB engagement worker is active,
# enumerate the List-in-more-places dialog, pick groups per Nolan's rules,
# apply (uncheck 3 pending, check up to 3 new), verify, mark done.
# Fails closed; quiet when the browser is busy or work is done.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
MARKER="$HERE/groups-done.marker"
LOCKDIR="$HOME/workspace/pig-fb/.locks"
TITLE='2008 Toyota Avalon XLS, only ~61k miles'

[ -f "$MARKER" ] && exit 0

# 1. Is a Facebook engagement worker driving the Pig Chrome right now? (one Pig call)
# NOTE (2026-09-23): pigwsl-run.sh has no timeout; a stalled ssh can burn the
# whole tick budget. Bound it; on any failure we cannot confirm the browser is
# free, so fail closed = exit quietly and retry next tick.
CLS=$(timeout 90 "$HOME/workspace/pig/pigwsl-run.sh" "powershell.exe -NoProfile -Command \"Get-CimInstance Win32_Process -Filter \\\"Name='node.exe'\\\" | Select-Object -ExpandProperty CommandLine\"" < /dev/null 2>/dev/null)
if [ -z "$CLS" ]; then
  echo "busy-check inconclusive (pigwsl hung), retry later"
  exit 0
fi
if echo "$CLS" | grep -qiE "fb-engage|facebook-engagement"; then
  echo "fb engagement worker busy, retry later"
  exit 0
fi

# 2. Lock + deploy + enumerate (read-only)
# Node runs on WINDOWS (hermes node.exe): Pig WSL cannot reach the Chrome CDP
# port because Chrome binds 127.0.0.1 on the Windows host. Scripts and their
# outputs live in C:/Users/nolan/transfer/mkt-groups (visible from WSL).
source "$HOME/workspace/pig-fb/browser-lock.sh"
browser_lock_acquire fb mkt-groups-cron || { echo "lock busy"; exit 0; }
# Lock is fd-based: the kernel releases it when this shell exits (see browser-lock.sh).
WINWORK='/mnt/c/Users/nolan/transfer/mkt-groups'
win_node() {
  # usage: win_node <script.js> [args...] — runs a deployed script under Windows node.
  # Bound so a hung node can't burn the whole tick budget.
  local script="$1"; shift
  local args=""
  for a in "$@"; do args="$args '$a'"; done
  timeout 600 "$HOME/workspace/pig/pigwsl-run.sh" "powershell.exe -NoProfile -Command \"& 'C:\\Users\\nolan\\AppData\\Local\\hermes\\node\\node.exe' 'C:\\Users\\nolan\\transfer\\mkt-groups\\$script'$args\"" < /dev/null 2>&1
}
"$HOME/workspace/pig/pigwsl-run.sh" "mkdir -p $WINWORK" < /dev/null 2>/dev/null
for f in mkt-groups-enumerate.js mkt-groups-action-v3.js; do
  "$HOME/workspace/pig/pigwsl-put.sh" "$HERE/$f" "$WINWORK/$f" || { echo "deploy failed: $f"; exit 1; }
done
# Pin the work dir to CommonJS: a stray {"type":"module"} package.json appeared in the
# parent C:/Users/nolan/transfer/ on 2026-09-23 and would flip every .js here to ESM.
"$HOME/workspace/pig/pigwsl-put.sh" "$HERE/mkt-groups-package.json" "$WINWORK/package.json" >/dev/null 2>&1 || { echo "deploy failed: package.json"; exit 1; }
sha256sum "$HERE/mkt-groups-enumerate.js" | awk '{print $1}' > /tmp/mkt-enum.sha
"$HOME/workspace/pig/pigwsl-run.sh" "sha256sum $WINWORK/mkt-groups-enumerate.js" < /dev/null 2>/dev/null | grep -q "$(cat /tmp/mkt-enum.sha)" || { echo "deploy verify failed"; exit 1; }
# Re-check busyness AFTER the slow deploy: an engagement worker may have started
# while we were copying files (2026-09-23: a pass launched mid-tick). Fail closed.
CLS2=$(timeout 90 "$HOME/workspace/pig/pigwsl-run.sh" "powershell.exe -NoProfile -Command \"Get-CimInstance Win32_Process -Filter \\\"Name='node.exe'\\\" | Select-Object -ExpandProperty CommandLine\"" < /dev/null 2>/dev/null)
if [ -z "$CLS2" ] || echo "$CLS2" | grep -qiE "fb-engage|facebook-engagement"; then
  echo "fb worker started during deploy; retry later"
  exit 0
fi
ENUM_OUT=$(win_node mkt-groups-enumerate.js "$TITLE" | tail -3)
echo "$ENUM_OUT"
echo "$ENUM_OUT" | grep -q "^RESULT: ok" || { echo "enumerate failed"; exit 1; }
"$HOME/workspace/pig/pigwsl-run.sh" "cat $WINWORK/mkt-groups-rows.json" < /dev/null 2>/dev/null | sed -n '/^\[/,$p' > /tmp/mkt-groups-rows.json
python3 -c "import json; json.load(open('/tmp/mkt-groups-rows.json'))" || { echo "rows json invalid"; exit 1; }

# 3. Pick groups per Nolan's rules
PICKED=$(python3 - "$TITLE" <<'EOF'
import json, re, sys
rows = json.load(open('/tmp/mkt-groups-rows.json'))
def members(label):
    m = re.search(r'([\d.,]+)\s*([Kk])?\s*members?', label)
    if not m: return 0
    n = float(m.group(1).replace(',', ''))
    return int(n * 1000) if m.group(2) else int(n)
def name_of(label):
    # first line-ish chunk before member count
    return re.split(r'\d[\d.,]*\s*[Kk]?\s*members?', label, 1)[0].strip()[:120]
cands = []
for r in rows:
    lab = r['label']
    nm = name_of(lab)
    cands.append({'name': nm, 'checked': r['checked'], 'members': members(lab),
                  'join': bool(re.search(r'\bjoin\b', lab, re.I)),
                  'pending': bool(re.search(r'pending', lab, re.I))})
pend = [c['name'] for c in cands if c['checked'] and c['pending']][:3]
local = re.compile(r'grand junction|fruita|palisade|mesa county|western colorado|\bcolorado\b|clifton|\bloma\b|\bmack\b|de beque|\bdelta\b', re.I)
bs = re.compile(r'buy|sell|marketplace|classified|garage sale|yard sale|message board|trading post', re.I)
pool = [c for c in cands if not c['checked'] and not c['join'] and local.search(c['name'])]
pool_bs = sorted([c for c in pool if bs.search(c['name'])], key=lambda c: -c['members'])
pool_gen = sorted([c for c in pool if not bs.search(c['name'])], key=lambda c: -c['members'])
new = [c['name'] for c in (pool_bs + pool_gen)[:3]]
print(json.dumps({'pending': pend, 'new': new, 'pool_sizes': [len(pool_bs), len(pool_gen)]}))
EOF
)
echo "PICKED: $PICKED"

# 4. Apply + verify
PEND=$(echo "$PICKED" | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)['pending']))")
NEWG=$(echo "$PICKED" | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)['new']))")
ACT_OUT=$(win_node mkt-groups-action-v3.js "$PEND" "$NEWG" "$TITLE" | tail -8)
echo "$ACT_OUT"
if echo "$ACT_OUT" | grep -q "RESULT: verify=OK"; then
  date -u +"%Y-%m-%dT%H:%M:%SZ" > "$MARKER"
  echo "DONE marker written"
  exit 0
fi
echo "action did not verify; will retry next tick"
exit 1
