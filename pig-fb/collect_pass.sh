#!/bin/bash
# collect_pass.sh -- SHORT IDEMPOTENT COLLECTOR for Facebook engagement passes.
# (2026-09-24, orphan model: dispatch and collection are separate. The old
# run_pass.sh fused both in one process that had to survive a 95-170 minute
# synchronous wait; the runtime kills supervisors in 4-18 minutes, so ~1 in
# 3 passes orphaned and collection never ran.)
#
# What this actually does (the old in-dispatch "reaper" only downloaded
# files and its comment overclaimed that it "recorded them in the ledger";
# it never called record-outcomes). This collector:
#   1. lists job-*.result.json and job-*.progress.jsonl in the Pig inbox,
#   2. downloads each one not yet in .collected-results,
#   3. records every action's OBSERVATION into the intent ledger via
#      action-intent-ledger.py record-outcomes (EXECUTED/FAILED per action,
#      NOT_ATTEMPTED where the worker proves it never acted),
#   4. marks the file collected in .collected-results only after the ledger
#      write succeeded.
# Progress files are consumed INCREMENTALLY: the .collected-progress sidecar
# tracks how many complete lines were already recorded, so a worker that is
# still appending is safe to re-read each interval; only complete lines
# (file ends with \n) are consumed, so a torn final line is never recorded.
#
# Idempotency: record-outcomes only targets OPEN intents and the ledger fold
# is first-record-wins, so re-running this collector, or SIGKILLing it
# mid-run, can never create duplicate observations. Killing it between the
# ledger write and the .collected-results append just means the next run
# re-records against already-closed intents (a no-op) and then marks
# collected.
#
# Usage: collect_pass.sh. Exit 0 with a summary JSON on stdout. Runs every
# ~15 minutes. Never launches a worker, never retries an unknown effect.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
source "${PIG_SSH_LIB:-$HERE/pig-ssh.sh}"
# FB_COLLECT_STATE_DIR / FB_JOBS_DIR are test seams; production uses $HERE.
STATE_DIR="${FB_COLLECT_STATE_DIR:-$HERE}"
LEDGER="$STATE_DIR/.collected-results"
PROGRESS_STATE="$STATE_DIR/.collected-progress"
JOBS_DIR="${FB_JOBS_DIR:-$HERE/jobs}"
INBOX_WIN='C:/Users/nolan/.local/share/pigi/fb-engage/inbox'
TMPD="$(mktemp -d /tmp/fb-collect-XXXXXX)"
trap 'rm -rf "$TMPD"' EXIT
mkdir -p "$JOBS_DIR" && touch "$LEDGER" "$PROGRESS_STATE"

collected() { grep -qxF "$1" "$LEDGER" 2>/dev/null; }
mark_collected() { printf '%s\n' "$1" >> "$LEDGER"; }
progress_offset() { awk -v n="$1" '$1==n{print $2}' "$PROGRESS_STATE" 2>/dev/null | tail -1; }
set_progress_offset() {
  local name="$1" off="$2" tmp
  tmp="$(mktemp /tmp/fb-progstate-XXXXXX)"
  grep -v "^$(printf '%s' "$name" | sed 's/[^A-Za-z0-9_.-]/\\&/g') " "$PROGRESS_STATE" 2>/dev/null >"$tmp" || true
  printf '%s %s\n' "$name" "$off" >>"$tmp"
  mv "$tmp" "$PROGRESS_STATE"
}

pass_id_for() {
  # $1 = downloaded file path, $2 = inbox filename (job-TS.json.result.json etc.)
  local pid
  pid=$(python3 -c "
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(1)
p = d.get('pass_id')
if p: print(p)
" "$1" 2>/dev/null) || true
  if [ -n "$pid" ]; then printf '%s' "$pid"; return 0; fi
  # Legacy path: resolve via the dispatch job record.
  local ts
  ts=$(printf '%s' "$2" | sed -n 's/^job-\([0-9-]*\)\.json.*/\1/p')
  if [ -n "$ts" ] && [ -f "$JOBS_DIR/fb-$ts.json" ]; then
    python3 -c "import json;print(json.load(open('$JOBS_DIR/fb-$ts.json'))['pass_id'])"
    return 0
  fi
  return 1
}

# NOTE: strip CR bytes; PowerShell emits CRLF and a trailing \r silently
# breaks both the scp path and the ledger match. Capture the ssh exit code
# BEFORE the tr pipeline (a pipeline's $? is the last command's).
INBOX_RAW=$(pig_ssh "powershell -NoProfile -Command \"Get-ChildItem '$INBOX_WIN/job-*' -ErrorAction SilentlyContinue | Where-Object { \$_.Name -like '*.result.json' -or \$_.Name -like '*.progress.jsonl' } | ForEach-Object { \$_.Name }\"" 2>/dev/null)
SSH_RC=$?
INBOX_LIST=$(printf '%s' "$INBOX_RAW" | tr -d '\r')
if [ "$SSH_RC" -ne 0 ]; then
  echo '{"ok":false,"infra":"pig_probe_failed","note":"could not list the Pig inbox; will retry next interval"}'
  exit 0
fi

RESULTS_DONE=0; RESULTS_FAILED=0; PROG_LINES=0; PROG_FAILED=0; SKIPPED=0
for rf in $INBOX_LIST; do
  case "$rf" in
    job-unfollow-*.result.json)
      # Unfollow batches are not engagement passes: they carry no pass_id and
      # must never enter the engagement intent ledger. Skip silently instead of
      # flagging as a collection failure every interval.
      echo "[collect_pass] skipping unfollow artifact: $rf (not an engagement result)" >&2
      SKIPPED=$((SKIPPED+1)); continue;;
    *.result.json)
      collected "$rf" && { SKIPPED=$((SKIPPED+1)); continue; }
      if ! pig_scp "$PIG:$INBOX_WIN/$rf" "$TMPD/$rf" >/dev/null 2>&1; then
        echo "[collect_pass] download failed: $rf (retry next interval)" >&2
        RESULTS_FAILED=$((RESULTS_FAILED+1)); continue
      fi
      if ! python3 -c "import json;json.load(open('$TMPD/$rf'))" 2>/dev/null; then
        echo "[collect_pass] $rf is not complete JSON yet (worker mid-write); retry next interval" >&2
        RESULTS_FAILED=$((RESULTS_FAILED+1)); continue
      fi
      PID_PASS=$(pass_id_for "$TMPD/$rf" "$rf") || PID_PASS=""
      if [ -z "$PID_PASS" ]; then
        echo "[collect_pass] WARNING: no pass_id for $rf; leaving uncollected" >&2
        RESULTS_FAILED=$((RESULTS_FAILED+1)); continue
      fi
      OUTCOME_JSON=$(python3 -c "
import json
d = json.load(open('$TMPD/$rf'))
print(json.dumps({'pass_id': d.get('pass_id'), 'results': d.get('results', [])}))
" >"$TMPD/$rf.out.json" 2>/dev/null && echo "$TMPD/$rf.out.json") || OUTCOME_JSON=""
      # Feed through --result-json so the abort/logged-out/NOT_ATTEMPTED
      # semantics stay in the one ledger implementation. record-outcomes
      # only targets OPEN intents, so re-recording a file whose actions
      # were already observed from progress lines is a safe no-op.
      if ~/workspace/outreach/action-intent-ledger.py record-outcomes \
          --platform facebook --pass-id "$PID_PASS" --result-json "$TMPD/$rf" >&2; then
        mark_collected "$rf"
        # The sibling progress file is fully covered by the result; stop
        # re-reading it and drop its incremental offset.
        PROG_SIBLING="${rf%.result.json}.progress.jsonl"
        mark_collected "$PROG_SIBLING"
        set_progress_offset "$PROG_SIBLING" 0
        RESULTS_DONE=$((RESULTS_DONE+1))
        echo "[collect_pass] collected result: $rf (pass $PID_PASS)" >&2
      else
        echo "[collect_pass] record-outcomes failed for $rf (retry next interval)" >&2
        RESULTS_FAILED=$((RESULTS_FAILED+1))
      fi
      ;;
    *.progress.jsonl)
      collected "$rf" && { SKIPPED=$((SKIPPED+1)); continue; }
      SIBLING="${rf%.progress.jsonl}.result.json"
      if collected "$SIBLING"; then mark_collected "$rf"; SKIPPED=$((SKIPPED+1)); continue; fi
      if ! pig_scp "$PIG:$INBOX_WIN/$rf" "$TMPD/$rf" >/dev/null 2>&1; then
        echo "[collect_pass] download failed: $rf (retry next interval)" >&2
        PROG_FAILED=$((PROG_FAILED+1)); continue
      fi
      PID_PASS=$(python3 -c "
import json
p = None
for line in open('$TMPD/$rf', encoding='utf-8'):
    line = line.strip()
    if not line: continue
    try: p = json.loads(line).get('pass_id') or p
    except Exception: pass
if p: print(p)
" 2>/dev/null) || PID_PASS=""
      [ -z "$PID_PASS" ] && PID_PASS=$(pass_id_for "$TMPD/$rf" "$rf" 2>/dev/null) || true
      if [ -z "$PID_PASS" ]; then
        echo "[collect_pass] WARNING: no pass_id for $rf; leaving uncollected" >&2
        PROG_FAILED=$((PROG_FAILED+1)); continue
      fi
      OFF=$(progress_offset "$rf"); [ -z "$OFF" ] && OFF=0
      # Consume only complete lines; a trailing torn fragment (worker
      # mid-write) stays for the next interval.
      NEW_JSON="$TMPD/$rf.new.json"
      NEW_COUNT=$(python3 - "$TMPD/$rf" "$OFF" "$PID_PASS" "$NEW_JSON" <<'PYEOF'
import json, sys
src, off, pid, dst = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
raw = open(src, encoding="utf-8").read()
complete = raw.endswith("\n")
lines = [l for l in raw.split("\n") if l.strip()]
if not complete and lines:
    lines = lines[:-1]
new = []
for l in lines[off:]:
    try:
        e = json.loads(l)
    except Exception:
        continue
    if e.get("type") == "abort":
        new.append({"type": "abort", "ok": False, "note": e.get("note")})
    else:
        new.append({"type": e.get("type"), "url": e.get("url"),
                    "ok": bool(e.get("ok")), "note": e.get("note")})
json.dump({"pass_id": pid, "results": new}, open(dst, "w"))
print(len(lines))
PYEOF
) || NEW_COUNT=""
      if [ -z "$NEW_COUNT" ]; then
        echo "[collect_pass] WARNING: could not parse $rf; retry next interval" >&2
        PROG_FAILED=$((PROG_FAILED+1)); continue
      fi
      if [ "$NEW_COUNT" -gt "$OFF" ]; then
        if ~/workspace/outreach/action-intent-ledger.py record-outcomes \
            --platform facebook --pass-id "$PID_PASS" --result-json "$NEW_JSON" >&2; then
          set_progress_offset "$rf" "$NEW_COUNT"
          PROG_LINES=$((PROG_LINES + NEW_COUNT - OFF))
          echo "[collect_pass] progress $rf: recorded $((NEW_COUNT - OFF)) new lines (pass $PID_PASS)" >&2
        else
          echo "[collect_pass] record-outcomes failed for $rf (retry next interval)" >&2
          PROG_FAILED=$((PROG_FAILED+1))
        fi
      fi
      ;;
  esac
done

# Stale-dispatch watchdog: a dispatch record older than 4h with no collected
# result and no progress lines means the worker died before writing anything.
# The intents stay open and the next pass's refuse filter closes them as
# UNKNOWN_EXECUTION (fail closed); this is a heads-up, not a retry.
# After 8h with zero evidence, the ledger's sweep-stale-dispatches (run by
# the facebook-engagement-collect cron after this script) appends a
# dispatch_lifecycle RECONCILIATION_REQUIRED record: the DISPATCH moves to
# deliberate reconciliation while every intent's outcome stays UNKNOWN.
# Never infers FAILED, never retries.
NOW=$(date +%s)
for jr in "$JOBS_DIR"/fb-*.json; do
  [ -f "$jr" ] || continue
  TS8=$(python3 -c "import json;print(json.load(open('$jr'))['ts'])" 2>/dev/null) || continue
  AGE_H=$(( (NOW - $(date -d "${TS8:0:8} ${TS8:9:2}:${TS8:11:2}:${TS8:13:2}" +%s 2>/dev/null || echo $NOW)) / 3600 ))
  RESF="job-$TS8.json.result.json"
  PROGF="job-$TS8.json.progress.jsonl"
  if [ "$AGE_H" -ge 4 ] && ! collected "$RESF"; then
    OFF=$(progress_offset "$PROGF"); [ -z "$OFF" ] && OFF=0
    if [ "$OFF" -eq 0 ]; then
      echo "[collect_pass] STALE: $(basename "$jr") dispatched ${AGE_H}h ago, no result and no progress lines; worker likely died before writing. Intents stay open for the refuse filter." >&2
    fi
  fi
done

echo "{\"ok\":true,\"results_collected\":$RESULTS_DONE,\"results_failed\":$RESULTS_FAILED,\"progress_lines_recorded\":$PROG_LINES,\"progress_failed\":$PROG_FAILED,\"skipped_collected\":$SKIPPED}"
exit 0
