#!/bin/bash
# X comment runner. Drives the Pig's headed X Chrome (x-profile, CDP :9225)
# through x-comment.js via x-comment-run.ps1, one closed action set per run.
# Usage: x-comment.sh <actions.json> <results.json>
#   actions.json: [{"account":"@handle",
#                   "url":"https://x.com/<handle>/status/<id>",
#                   "comment_file":"/local/path/to/comment.txt"}, ...]
#   results.json: written as [{"account","url","action":"comment","comment",
#                             "ok":true/false,"note"}, ...]
#
# The comment text is drafted by the caller; this runner ships each comment
# file to the Pig (C:/Windows/Temp/x-comment-<n>.txt) and passes the Windows
# path to the driver, which posts verbatim. Comment files are removed from
# the Pig after the run.
#
# ONE-DRIVER RULE: never drives the X Chrome while a follow batch, like run,
# or discovery probe is mid-flight. Before each comment it checks the Pig for
# a running x-follow/x-like/x-discover node process and waits (up to ~10 min);
# it holds
# C:\Windows\Temp\x-engage.lock for the whole run so follow/like invocations
# wait their turn. Lock is always removed on exit via trap. Halts the run
# (exit 3) on any restriction signal from the driver; the caller records
# outcomes and surfaces it. Pacing: 60-120s between comments.
source "$(dirname "$0")/pig-ssh.sh"
# Authority gate (2026-09-29, Nolan 90h GO): a schedule is NOT authorization.
# authority-check.py consumes AUTHORITY.json, platform tripwires, and recent
# pass logs; a nonzero exit halts with zero external effects (fail closed).
"$(dirname "$0")/../outreach/authority-check.py" x || { echo "x-comment.sh: authority gate denied; failing closed" >&2; exit 2; }
[ $# -eq 2 ] || { echo "usage: x-comment.sh <actions.json> <results.json>" >&2; exit 2; }
ACTIONS="$1"; RESULTS="$2"
[ -f "$ACTIONS" ] || { echo "actions file missing: $ACTIONS" >&2; exit 2; }
LOCK_PS='C:/Windows/Temp/x-engage.lock'

pig() { PIG_TIMEOUT=150 pig_ssh "$@" < /dev/null 2>&1; }

other_driver_active() {
  # 2026-09-29 (interval 08): also waits out the read-only discovery probe
  # (*x-discover-run.js*). A write batch starting under a running probe
  # stalled pass x-20260929-1723's probe for its full 3120s bound.
  pig 'powershell -NoProfile -Command "if (Get-CimInstance Win32_Process -Filter \"Name=''node.exe''\" | Where-Object { ($_.CommandLine -like ''*x-follow*'') -or ($_.CommandLine -like ''*x-like*'') -or ($_.CommandLine -like ''*x-discover-run.js*'') }) { ''ACTIVE'' } else { ''IDLE'' }"' | tr -d '\r\n ' | grep -q ACTIVE
}

lock()   { pig 'powershell -NoProfile -Command "New-Item -ItemType File -Path C:/Windows/Temp/x-engage.lock -Force | Out-Null"'; }
unlock() { pig 'powershell -NoProfile -Command "Remove-Item -Force -ErrorAction SilentlyContinue C:/Windows/Temp/x-engage.lock; Remove-Item -Force -ErrorAction SilentlyContinue C:/Windows/Temp/x-comment-*.txt"'; }
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
  echo "x-comment: Pig unreachable; aborting run" >&2
  python3 -c "import json; json.dump([], open('$RESULTS','w'))"
  write_sidecar CANDIDATES_BUT_ALL_BLOCKED pig_unreachable
  exit 4
fi

# Wait out any in-flight follow/like before taking the lock.
waited=0
while other_driver_active && [ $waited -lt 600 ]; do sleep 30; waited=$((waited+30)); done
if other_driver_active; then
  echo "x-comment: follow/like/probe still active after 10 min; aborting run" >&2
  python3 -c "import json; json.dump([], open('$RESULTS','w'))"
  write_sidecar CANDIDATES_BUT_ALL_BLOCKED driver_lock_timeout
  exit 4
fi
lock

count=$(python3 -c "import json; print(len(json.load(open('$ACTIONS'))))")
i=0
: > "$RESULTS.tmp"
echo "[" > "$RESULTS.tmp"
first=1
while IFS= read -r item; do
  account=$(python3 -c "import json,sys; print(json.loads(sys.argv[1]).get('account',''))" "$item")
  url=$(python3 -c "import json,sys; print(json.loads(sys.argv[1]).get('url',''))" "$item")
  cfile=$(python3 -c "import json,sys; print(json.loads(sys.argv[1]).get('comment_file',''))" "$item")
  ctext=$(python3 -c "import json,sys; print(open(json.loads(sys.argv[1]).get('comment_file','')).read().strip())" "$item" 2>/dev/null || echo "")
  i=$((i+1))
  if [ $i -gt 1 ]; then
    nap=$((60 + RANDOM % 61))
    sleep $nap
    # Re-check: never comment while a follow/like/probe started mid-run.
    waited=0
    while other_driver_active && [ $waited -lt 600 ]; do sleep 30; waited=$((waited+30)); done
  fi
  # Owner-hold re-check at the last responsible boundary (2026-10-02, owner-hold
  # authority repair): the hold is re-read from CURRENT holds.json before EVERY
  # comment. A hold that landed mid-run denies here; the run stops with zero
  # new external effects (already-recorded comments stay as historical evidence).
  if ! "$(dirname "$0")/../outreach/authority-check.py" x >/dev/null 2>&1; then
    echo "x-comment.sh: owner hold re-check denied at pre-action boundary; stopping run" >&2
    break
  fi
  if [ ! -f "$cfile" ]; then
    note="comment file missing: $cfile"; ok=false
  else
    # Ship the comment text to the Pig; the driver reads it from disk
    # (avoids all shell-quoting hazards with the comment body).
    remote="C:/Windows/Temp/x-comment-$i.txt"
    if pig_scp "$cfile" "$PIG:$remote" >/dev/null 2>&1; then
      out=$(pig "powershell -NoProfile -ExecutionPolicy Bypass -File C:/Windows/Temp/x-comment-run.ps1 $url $remote")
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
    else
      note="scp of comment file to Pig failed"; ok=false
    fi
  fi
  [ $first -eq 1 ] || echo "," >> "$RESULTS.tmp"
  first=0
  python3 - "$account" "$url" "$([ "$ok" = true ] && echo true || echo false)" "$note" "$ctext" >> "$RESULTS.tmp" <<'PYEOF'
import json, sys
rec = {"account": sys.argv[1], "url": sys.argv[2], "action": "comment",
       "comment": sys.argv[5], "ok": sys.argv[3] == "true", "note": sys.argv[4]}
sys.stdout.write(json.dumps(rec))
PYEOF
  if [ "${halt:-0}" -eq 1 ]; then
    echo "" >> "$RESULTS.tmp"; echo "]" >> "$RESULTS.tmp"
    mv "$RESULTS.tmp" "$RESULTS"
    write_sidecar RESTRICTION_HALT "restriction signal at item $i/$count"
    echo "x-comment: HALT on restriction signal at item $i/$count" >&2
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
echo "x-comment: done $i/$count"
exit 0
