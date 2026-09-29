#!/bin/bash
# X engagement runner (likes-only). Drives the Pig's headed X Chrome
# (x-profile, CDP :9225) through x-like.js, one closed action set per run.
# Usage: x-engage.sh <actions.json> <results.json>
#   actions.json: [{"account":"@handle","url":"https://x.com/<handle>/status/<id>"}, ...]
#   results.json: written as [{"account","url","action":"like","ok":true/false,"note"}, ...]
#
# ONE-DRIVER RULE: never drives the X Chrome while the entrepreneur follow
# batch or the discovery probe is mid-flight. Before each like it checks the
# Pig for a running x-follow/x-discover node process and waits (up to ~10 min);
# it holds
# C:\Windows\Temp\x-engage.lock for the whole run so a follow invocation
# waits its turn (x-follow-run.ps1 honors the lock). Lock is always removed
# on exit via trap. Halts the run (exit 3) on any restriction signal from
# the driver; the caller records outcomes and surfaces it.
source "$(dirname "$0")/pig-ssh.sh"
source "$(dirname "$0")/wake-bracket.sh"  # job-scoped wake lease (2026-09-27)
# Authority gate (2026-09-29, Nolan 90h GO): a schedule is NOT authorization.
# authority-check.py consumes AUTHORITY.json, platform tripwires, and recent
# pass logs; a nonzero exit halts with zero external effects (fail closed).
"$(dirname "$0")/../outreach/authority-check.py" x || { echo "x-engage.sh: authority gate denied; failing closed" >&2; exit 2; }
[ $# -eq 2 ] || { echo "usage: x-engage.sh <actions.json> <results.json>" >&2; exit 2; }
ACTIONS="$1"; RESULTS="$2"
[ -f "$ACTIONS" ] || { echo "actions file missing: $ACTIONS" >&2; exit 2; }
LOCK_PS='C:/Windows/Temp/x-engage.lock'

pig() { PIG_TIMEOUT=150 pig_ssh "$@" < /dev/null 2>&1; }

follow_active() {
  # 2026-09-29 (interval 08): also waits out the read-only discovery probe
  # (*x-discover-run.js*). A write batch starting under a running probe
  # stalled pass x-20260929-1723's probe for its full 3120s bound.
  pig 'powershell -NoProfile -Command "if (Get-CimInstance Win32_Process -Filter \"Name=''node.exe''\" | Where-Object { ($_.CommandLine -like ''*x-follow*'') -or ($_.CommandLine -like ''*x-discover-run.js*'') }) { ''ACTIVE'' } else { ''IDLE'' }"' | tr -d '\r\n ' | grep -q ACTIVE
}

lock()   { pig 'powershell -NoProfile -Command "New-Item -ItemType File -Path C:/Windows/Temp/x-engage.lock -Force | Out-Null"'; }
unlock() { pig 'powershell -NoProfile -Command "Remove-Item -Force -ErrorAction SilentlyContinue C:/Windows/Temp/x-engage.lock"'; }
trap unlock EXIT

# write_sidecar <empty_state> <reason>: records the run classification next to
# the results file as <results>.state.json. The caller (cron pass agent)
# forwards this to x-tier-record.py so the adaptive state stays truthful.
write_sidecar() {
  python3 - "$1" "$2" "$RESULTS" <<'PYEOF'
import json, sys
state, reason, results = sys.argv[1], sys.argv[2], sys.argv[3]
recs = json.load(open(results))
side = {"empty_state": state, "reason": reason,
        "attempted": len(recs), "succeeded": sum(1 for r in recs if r.get("ok"))}
json.dump(side, open(results + ".state.json", "w"), indent=1)
PYEOF
}

# Preflight: Pig must be reachable, otherwise fail the run cleanly.
if ! PIG_TIMEOUT=25 pig_ssh "echo PIG_OK" < /dev/null 2>&1 | grep -q PIG_OK; then
  echo "x-engage: Pig unreachable; aborting run" >&2
  python3 -c "import json; json.dump([], open('$RESULTS','w'))"
  write_sidecar CANDIDATES_BUT_ALL_BLOCKED pig_unreachable
  exit 4
fi

# Wait out any in-flight follow before taking the lock.
waited=0
while follow_active && [ $waited -lt 600 ]; do sleep 30; waited=$((waited+30)); done
if follow_active; then
  echo "x-engage: follow batch or probe still active after 10 min; aborting run" >&2
  python3 -c "import json; json.dump([], open('$RESULTS','w'))"
  write_sidecar CANDIDATES_BUT_ALL_BLOCKED follow_lock_timeout
  exit 4
fi
lock

# Job-scoped wake lease (2026-09-27, Nolan): each like gets its own lease
# around the remote driver call. Warn-and-proceed on deploy failure; the
# bracket degrades to today's behavior (no inhibition).
wake_wrap_deploy "x-engage.sh"

count=$(python3 -c "import json; print(len(json.load(open('$ACTIONS'))))")
i=0
: > "$RESULTS.tmp"
echo "[" > "$RESULTS.tmp"
first=1
while IFS= read -r item; do
  account=$(python3 -c "import json,sys; print(json.loads(sys.argv[1]).get('account',''))" "$item")
  url=$(python3 -c "import json,sys; print(json.loads(sys.argv[1]).get('url',''))" "$item")
  i=$((i+1))
  if [ $i -gt 1 ]; then
    nap=$((60 + RANDOM % 61))
    sleep $nap
    # Re-check: never like while a follow or probe started mid-run.
    waited=0
    while follow_active && [ $waited -lt 600 ]; do sleep 30; waited=$((waited+30)); done
  fi
  # Each like runs under its own job-scoped wake lease (quiet mode: no wake
  # telemetry lines, so $out stays purely the driver's stdout and the
  # tail -1 / rc=3 contract below is unchanged). The driver's exit code
  # propagates via $LASTEXITCODE -> exit $c.
  X_RUN_ID="x-like-$(date +%Y%m%d-%H%M%S)-$i"
  X_PS=$(cat <<EOF
$(wake_ps_acquire "$X_RUN_ID" "X like driver ($account)" 1)
\$c = 0
& 'C:/Windows/Temp/x-like-run.ps1' '$url'
\$c = \$LASTEXITCODE
$(wake_ps_release "$X_RUN_ID" 1)
exit \$c
EOF
)
  X_B64=$(printf '%s' "$X_PS" | iconv -t UTF-16LE | base64 -w0)
  out=$(pig "powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand $X_B64")
  rc=$?
  line=$(printf '%s' "$out" | tail -1)
  if [ $rc -eq 3 ]; then
    note="HALT: restriction signal :: $line"
    ok=false
    halt=1
  elif [ $rc -eq 0 ]; then
    note="$line"; ok=true
  else
    note="driver failed rc=$rc :: $line"; ok=false
  fi
  [ $first -eq 1 ] || echo "," >> "$RESULTS.tmp"
  first=0
  python3 - "$account" "$url" "$([ "$ok" = true ] && echo true || echo false)" "$note" >> "$RESULTS.tmp" <<'PYEOF'
import json, sys
rec = {"account": sys.argv[1], "url": sys.argv[2], "action": "like",
       "ok": sys.argv[3] == "true", "note": sys.argv[4]}
sys.stdout.write(json.dumps(rec))
PYEOF
  if [ "${halt:-0}" -eq 1 ]; then
    echo "" >> "$RESULTS.tmp"; echo "]" >> "$RESULTS.tmp"
    mv "$RESULTS.tmp" "$RESULTS"
    write_sidecar RESTRICTION_HALT "restriction signal at item $i/$count"
    echo "x-engage: HALT on restriction signal at item $i/$count" >&2
    exit 3
  fi
done < <(python3 -c "import json; [print(json.dumps(x)) for x in json.load(open('$ACTIONS'))]")
echo "" >> "$RESULTS.tmp"; echo "]" >> "$RESULTS.tmp"
mv "$RESULTS.tmp" "$RESULTS"
# Completed run: distinguish the empty states. >=1 ok -> USEFUL_PASS;
# attempted but all failed -> CANDIDATES_BUT_ACTION_FAILED; empty action
# set (defensive; the caller normally never invokes us with zero actions).
python3 - "$RESULTS" <<'PYEOF'
import json, sys
results = sys.argv[1]
recs = json.load(open(results))
att = len(recs); ok = sum(1 for r in recs if r.get("ok"))
state = "USEFUL_PASS" if ok > 0 else ("CANDIDATES_BUT_ACTION_FAILED" if att > 0 else "NO_CANDIDATES")
json.dump({"empty_state": state, "reason": "run completed",
           "attempted": att, "succeeded": ok},
          open(results + ".state.json", "w"), indent=1)
PYEOF
echo "x-engage: done $i/$count"
exit 0
