#!/bin/bash
# run_pass.sh -- DISPATCH one Facebook engagement pass on the Pig.
# (2026-09-24, orphan model: dispatch and collection are separate processes.
# This script used to fuse both in one process that had to survive a 95-170
# minute synchronous wait; the runtime kills supervisors in 4-18 minutes, so
# ~1 in 3 passes orphaned and the in-process collection never ran.)
#
# This script is now SHORT: guard filter -> refuse filter -> write intents ->
# pre-flight -> scp job + worker -> mark EXECUTION (after successful scp) ->
# launch the detached worker -> return immediately with a dispatch receipt.
# It never waits for the worker. Collection is the job of collect_pass.sh,
# which runs every ~15 minutes, downloads result/progress files from the Pig
# inbox, and records OBSERVATIONS into the intent ledger. A dead supervisor
# is harmless: the worker is detached, the progress file is fsync'd per
# action, and the collector is idempotent.
#
# Usage: run_pass.sh <local-job.json>
# Prints a dispatch receipt JSON to stdout. Exit 0 on dispatched (even if
# the worker later fails; the collector reports that). Exit 2 on infra or
# guard problems (nothing was launched).
set -u
JOB="$1"
TS=$(date +%Y%m%d-%H%M%S)
# Authority gate (2026-09-29, Nolan 90h GO): a schedule is NOT authorization.
# authority-check.py consumes AUTHORITY.json, platform tripwires, and recent
# pass logs; a nonzero exit halts with zero external effects (fail closed).
"$(dirname "$0")/../outreach/authority-check.py" facebook || { echo "run_pass.sh: authority gate denied; failing closed" >&2; exit 2; }
INBOX_WIN='C:/Users/nolan/.local/share/pigi/fb-engage/inbox'
REMOTE_JOB="$INBOX_WIN/job-$TS.json"
REMOTE_RESULT="$REMOTE_JOB.result.json"
REMOTE_PROGRESS="$REMOTE_JOB.progress.jsonl"
WORKER_REMOTE='C:/Users/nolan/.local/share/pigi/fb-engage/engage.js'
WAKE_WRAP_REMOTE='C:/Users/nolan/.local/share/pigi/wake-wrap.ps1'
source "${PIG_SSH_LIB:-$(dirname "$0")/pig-ssh.sh}"  # shared SSH helper; PIG_TIMEOUT default 25

# Browser mutual-exclusion (2026-09-21, FL-20260921-016): the fb-profile
# Chrome (:9223) is shared with the FB unfollow worker and Meta AI passes.
# Hold the profile lock for the dispatch's lifetime. The detached worker is
# protected after launch by fb-worker-probe.sh (fail-closed), not by this
# lock: the lock is a local flock and releases when this shell exits.
source "$(dirname "$0")/browser-lock.sh"
browser_lock_acquire fb "run_pass.sh" || exit 2

# In-flight worker guard (2026-09-24, orphan model; replaces the old inline
# probe): refuse to launch when ANY node process is driving the fb profile
# (engage.js, fb-unfollow.js, meta-ask.js). A silent probe failure is
# UNKNOWN, never "clear": exit 2, the pass ends quietly per the stay-on rule.
PROBE_PID="$(mktemp /tmp/fb-probe-pid-XXXXXX)"
# NOTE: capture the exit code on its own line; $? inside `if ! cmd; then`
# would read the inverted status, not the probe's.
"$(dirname "$0")/fb-worker-probe.sh" >"$PROBE_PID" 2>/tmp/fb-probe.err
PROBE_RC=$?
if [ "$PROBE_RC" -ne 0 ]; then
  PID_OUT=$(cat "$PROBE_PID")
  rm -f "$PROBE_PID"
  if [ "$PROBE_RC" -eq 1 ]; then
    echo "{\"ok\":false,\"dispatched\":false,\"infra\":\"fb_worker_in_flight\",\"pid\":\"$PID_OUT\",\"note\":\"A previous fb-profile worker is still running on the Pig; not launching a concurrent job. Its result/progress files will be collected by collect_pass.sh.\"}"
  else
    echo "{\"ok\":false,\"dispatched\":false,\"infra\":\"fb_worker_probe_unknown\",\"note\":\"Could not probe the Pig for in-flight fb-profile workers; refusing to launch blind.\"}"
    cat /tmp/fb-probe.err >&2
  fi
  exit 2
fi
rm -f "$PROBE_PID"

# Mechanical never-re-engage guard (2026-09-14): the job's actions are
# filtered against the durable engagement history BEFORE anything is copied
# to the Pig. Blocked actions are stripped with a durable audit line in
# facebook-engagement.md; if none remain eligible the pass ends without
# touching the Pig. This runs inside the wrapper so it cannot be bypassed
# by forgetting a rule in the task brief.
GUARD_OUT="$(mktemp /tmp/fb-guard-job-XXXXXX.json)"
GUARD_REPORT="$(mktemp /tmp/fb-guard-report-XXXXXX.json)"
if ! ~/workspace/outreach/engagement-guard.py filter --platform facebook \
    --fb-job --in "$JOB" --out "$GUARD_OUT" --audit >"$GUARD_REPORT" 2>/tmp/fb-guard.err; then
  echo '{"ok":false,"dispatched":false,"infra":"guard_fail_closed"}'
  cat /tmp/fb-guard.err >&2
  rm -f "$GUARD_OUT" "$GUARD_REPORT"
  exit 2
fi
ELIGIBLE_COUNT=$(python3 -c "import json;print(len(json.load(open('$GUARD_OUT')).get('actions',[])))")
BLOCKED_COUNT=$(python3 -c "import json;print(len(json.load(open('$GUARD_REPORT')).get('blocked',[])))")
echo "[run_pass] guard: eligible=$ELIGIBLE_COUNT blocked=$BLOCKED_COUNT (see facebook-engagement.md)" >&2
if [ "$ELIGIBLE_COUNT" -eq 0 ]; then
  echo "{\"ok\":false,\"dispatched\":false,\"guard\":\"all_actions_blocked\",\"eligible\":0,\"blocked\":$BLOCKED_COUNT}"
  rm -f "$GUARD_OUT" "$GUARD_REPORT"
  exit 0
fi
JOB="$GUARD_OUT"

# Engagement eligibility envelope (2026-10-01 P0): the plan-time gate stamps
# per-action eligibility evidence; the dispatch-time gate verifies it.
# curate runs the single eligibility function over the guard-filtered job
# and stamps a tamper-evident envelope on every surviving action.
# evidence-check then refuses missing, tampered, or stale envelopes.
# The guard filter above already re-evaluated the full reason set live and
# never trusts the envelope for the decision; this step binds the evidence
# to the dispatched actions so a worker can verify before each effect.
CURATE_OUT="$(mktemp /tmp/fb-curate-job-XXXXXX.json)"
if ! ~/workspace/outreach/engagement-guard.py curate --platform facebook \
    --in "$JOB" --out "$CURATE_OUT" >/tmp/fb-curate-report.json 2>/tmp/fb-curate.err; then
  echo '{"ok":false,"dispatched":false,"infra":"eligibility_curate_fail_closed"}'
  cat /tmp/fb-curate.err >&2
  rm -f "$GUARD_OUT" "$GUARD_REPORT" "$CURATE_OUT"
  exit 2
fi
ELIG_CHECK="$(mktemp /tmp/fb-elig-check-XXXXXX.json)"
if ! ~/workspace/outreach/engagement-guard.py evidence-check \
    --in "$CURATE_OUT" >"$ELIG_CHECK" 2>/tmp/fb-elig-check.err; then
  echo '{"ok":false,"dispatched":false,"infra":"eligibility_evidence_refused"}'
  cat "$ELIG_CHECK" >&2
  cat /tmp/fb-elig-check.err >&2
  rm -f "$GUARD_OUT" "$GUARD_REPORT" "$CURATE_OUT" "$ELIG_CHECK"
  exit 2
fi
CURATE_ELIGIBLE=$(python3 -c "import json;print(json.load(open('/tmp/fb-curate-report.json'))['eligible'])")
echo "[run_pass] eligibility: stamped=$CURATE_ELIGIBLE envelopes_verified=ok" >&2
if [ "$CURATE_ELIGIBLE" -eq 0 ]; then
  echo "{\"ok\":false,\"dispatched\":false,\"guard\":\"all_actions_blocked\",\"eligible\":0,\"blocked\":$BLOCKED_COUNT}"
  rm -f "$GUARD_OUT" "$GUARD_REPORT" "$CURATE_OUT" "$ELIG_CHECK"
  exit 0
fi
JOB="$CURATE_OUT"

# Unknown-execution filter (2026-09-14): refuse candidates whose
# (account, platform, action) has an unresolved intent from an older pass
# (a previous worker died between intent and outcome). Refused with the
# truthful UNKNOWN_EXECUTION state, never silently skipped. If the ledger
# cannot be consulted the filter fails closed and the pass does not run.
PASS_ID="fb-$TS"
INTENT_JOB="$(mktemp /tmp/fb-intent-job-XXXXXX.json)"
INTENT_REFUSE="$(mktemp /tmp/fb-intent-refuse-XXXXXX.json)"
if ! ~/workspace/outreach/action-intent-ledger.py refuse --platform facebook \
    --fb-job --in "$GUARD_OUT" --out "$INTENT_JOB" --pass-id "$PASS_ID" \
    >"$INTENT_REFUSE" 2>/tmp/fb-intent-refuse.err; then
  echo '{"ok":false,"dispatched":false,"infra":"intent_ledger_unavailable"}'
  cat /tmp/fb-intent-refuse.err >&2
  rm -f "$GUARD_OUT" "$GUARD_REPORT" "$CURATE_OUT" "$ELIG_CHECK" "$INTENT_JOB" "$INTENT_REFUSE"
  exit 2
fi
REFUSED_COUNT=$(python3 -c "import json,sys;print(len(json.load(open(sys.argv[1])).get('refused',[])))" "$INTENT_REFUSE" || echo 0)
ELIGIBLE_COUNT=$(python3 -c "import json,sys;print(len(json.load(open(sys.argv[1])).get('actions',[])))" "$INTENT_JOB" || echo 0)
echo "[run_pass] intent-ledger: eligible=$ELIGIBLE_COUNT refused_unknown_execution=$REFUSED_COUNT" >&2
if [ "$REFUSED_COUNT" -gt 0 ]; then
  python3 - "$INTENT_REFUSE" >&2 <<'PYEOF'
import json, sys
for r in json.load(open(sys.argv[1]))["refused"]:
    sys.stderr.write("  - %s | %s | %s\n    %s\n" % (
        r.get("account"), r.get("action"), r.get("url"), r.get("reason")))
PYEOF
fi
if [ "$ELIGIBLE_COUNT" -eq 0 ]; then
  echo "{\"ok\":false,\"dispatched\":false,\"guard\":\"all_actions_blocked\",\"eligible\":0,\"blocked\":$BLOCKED_COUNT,\"intent_refused\":$REFUSED_COUNT}"
  rm -f "$GUARD_OUT" "$GUARD_REPORT" "$CURATE_OUT" "$ELIG_CHECK" "$INTENT_JOB" "$INTENT_REFUSE"
  exit 0
fi
JOB="$INTENT_JOB"

# Action intent is durable BEFORE any browser action (2026-09-14, states
# refined per Nolan's directive: ACTION_INTENT_DURABLE -> EXECUTION ->
# OBSERVATION -> FINALIZATION, terminals EXECUTED/FAILED/UNKNOWN_EXECUTION/
# NOT_ATTEMPTED). One intent record per action is appended before the job
# is copied to the Pig. If this script or the Pig worker dies before
# outcomes are recorded, the next pass refuses these candidates as
# UNKNOWN_EXECUTION until an explicit reconciliation clears them. If intent
# writing fails, the pass does not run.
if ! ~/workspace/outreach/action-intent-ledger.py write-intents \
    --platform facebook --fb-job --in "$JOB" --pass-id "$PASS_ID" >&2; then
  echo '{"ok":false,"dispatched":false,"infra":"intent_write_failed"}'
  rm -f "$GUARD_OUT" "$GUARD_REPORT" "$CURATE_OUT" "$ELIG_CHECK" "$INTENT_JOB" "$INTENT_REFUSE"
  exit 2
fi

# Stamp the pass identity into the job the worker will read: engage.js
# echoes pass_id into its result.json and every progress.jsonl line, so the
# collector can attribute files without local state.
STAMPED_JOB="$(mktemp /tmp/fb-job-stamped-XXXXXX.json)"
python3 - "$JOB" "$STAMPED_JOB" "$PASS_ID" <<'PYEOF'
import json, sys
job = json.load(open(sys.argv[1]))
job["pass_id"] = sys.argv[3]
json.dump(job, open(sys.argv[2], "w"), indent=1)
PYEOF

# Pre-flight: headed Chrome/CDP substrate recovery via the existing PigiFBLogin task.
# (FB_ENSURE_CDP is a test seam; production always uses ensure-cdp.sh.)
record_not_attempted() {
  # proven-non-execution path: the job provably never reached the worker,
  # so the intents close as NOT_ATTEMPTED (terminal), never UNKNOWN_EXECUTION.
  ~/workspace/outreach/action-intent-ledger.py record-outcomes \
    --platform facebook --pass-id "$PASS_ID" --not-attempted \
    --reason "$1" --evidence "run_pass.sh pre-flight" >&2 || \
    echo "[run_pass] WARNING: could not record not-attempted outcomes." >&2
}
"${FB_ENSURE_CDP:-$(dirname "$0")/ensure-cdp.sh}" >/dev/null 2>&1 || { echo '{"ok":false,"dispatched":false,"infra":"cdp_down_after_relaunch"}'; record_not_attempted "CDP down after relaunch; job never reached the Pig"; rm -f "$GUARD_OUT" "$GUARD_REPORT" "$CURATE_OUT" "$ELIG_CHECK" "$INTENT_JOB" "$INTENT_REFUSE" "$STAMPED_JOB"; exit 2; }

# Copy the stamped job AND the current worker code (2026-09-24, orphan
# model: the dispatched worker version is pinned to this dispatch, never a
# stale Pig-side copy; run_unfollow.sh already copies its worker per run).
pig_scp "$STAMPED_JOB" "$PIG:$REMOTE_JOB" >/dev/null 2>&1 || { echo '{"ok":false,"dispatched":false,"infra":"scp_failed"}'; record_not_attempted "scp to Pig failed; worker never launched"; rm -f "$GUARD_OUT" "$GUARD_REPORT" "$CURATE_OUT" "$ELIG_CHECK" "$INTENT_JOB" "$INTENT_REFUSE" "$STAMPED_JOB"; exit 2; }
pig_scp "$(dirname "$0")/engage.js" "$PIG:$WORKER_REMOTE" >/dev/null 2>&1 || { echo '{"ok":false,"dispatched":false,"infra":"scp_failed"}'; record_not_attempted "worker scp to Pig failed; job never launched"; rm -f "$GUARD_OUT" "$GUARD_REPORT" "$CURATE_OUT" "$ELIG_CHECK" "$INTENT_JOB" "$INTENT_REFUSE" "$STAMPED_JOB"; exit 2; }
pig_scp "$(dirname "$0")/wake-wrap.ps1" "$PIG:$WAKE_WRAP_REMOTE" >/dev/null 2>&1 || { echo '{"ok":false,"dispatched":false,"infra":"scp_failed"}'; record_not_attempted "wake-wrap scp to Pig failed; worker never launched"; rm -f "$GUARD_OUT" "$GUARD_REPORT" "$CURATE_OUT" "$ELIG_CHECK" "$INTENT_JOB" "$INTENT_REFUSE" "$STAMPED_JOB"; exit 2; }

# Owner-hold re-check at the last responsible boundary (2026-10-02, owner-hold
# authority repair): re-read CURRENT holds.json immediately before dispatch,
# AFTER scp but BEFORE mark-execution. A hold that landed after the top gate
# (stale schedule, queued worker, restart, manual trigger) denies here with
# zero new external effects: the pass intents are recorded NOT_ATTEMPTED
# (proven non-execution, the worker never launched) and the staged remote
# job is removed from the Pig inbox.
"$(dirname "$0")/../outreach/authority-check.py" facebook || {
  echo "run_pass.sh: owner hold re-check denied at pre-launch boundary; failing closed" >&2
  record_not_attempted "owner hold in force at pre-launch re-check; worker never launched"
  pig_ssh "powershell -NoProfile -EncodedCommand $(printf '%s' "Remove-Item '$REMOTE_JOB' -ErrorAction SilentlyContinue" | iconv -t UTF-16LE | base64 -w0)" >/dev/null 2>&1 || true
  rm -f "$GUARD_OUT" "$GUARD_REPORT" "$CURATE_OUT" "$ELIG_CHECK" "$INTENT_JOB" "$INTENT_REFUSE" "$STAMPED_JOB"
  exit 2
}

# Mark EXECUTION (2026-09-24, orphan model: AFTER successful scp, not
# before). A crash between scp and this point leaves intents in
# ACTION_INTENT_DURABLE (never launched, never UNKNOWN); a crash after this
# point leaves them in EXECUTION with no worker, which the next pass's
# refuse filter closes as UNKNOWN_EXECUTION. Either way the ledger's refuse
# semantics stay authoritative and nothing is silently retried.
if ! ~/workspace/outreach/action-intent-ledger.py mark-execution \
    --platform facebook --pass-id "$PASS_ID" >&2; then
  echo '{"ok":false,"dispatched":false,"infra":"intent_ledger_failed"}'
  rm -f "$GUARD_OUT" "$GUARD_REPORT" "$CURATE_OUT" "$ELIG_CHECK" "$INTENT_JOB" "$INTENT_REFUSE" "$STAMPED_JOB"
  exit 2
fi

# Launch the worker DETACHED and return immediately. The worker MUST survive
# this SSH session dropping. Start-Process -NoNewWindow does NOT survive:
# OpenSSH for Windows places session processes in a Job Object with
# KILL_ON_JOB_CLOSE, and Start-Process children inherit that job, so the
# worker is killed ~1-2 min after this SSH session exits (pass 113 and the
# first launch of pass 114 both died this way, 2026-09-24, with zero output
# and no result/progress files). WMI Win32_Process.Create spawns outside the
# SSH session's job object, so the worker survives (verified 2026-09-24:
# WMI-launched sleeper alive at 90s+, Start-Process sleeper dead).
# No WaitForExit here. The PID is captured as launch proof. Stale result /
# progress files for this fresh job name are removed first (the name is a
# fresh timestamp and the in-flight guard above rules out a concurrent
# worker, so nothing live can be writing to them).
REMOTE_PS=$(cat <<EOF
\$job = '$REMOTE_JOB'
Remove-Item (\$job + '.result.json') -ErrorAction SilentlyContinue
Remove-Item (\$job + '.progress.jsonl') -ErrorAction SilentlyContinue
\$node = 'C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe'
\$eng = 'C:/Users/nolan/.local/share/pigi/fb-engage/engage.js'
# Scoped wake inhibition (2026-09-25, Nolan): the worker runs as a CHILD of
# wake-wrap.ps1, which holds SetThreadExecutionState(ES_CONTINUOUS |
# ES_SYSTEM_REQUIRED) for exactly the worker lifetime. Worker exit/crash ->
# wrapper WaitForExit returns -> release. Wrapper killed -> kernel thread
# teardown releases it. No OS power-policy change, ever.
\$wrap = 'C:/Users/nolan/.local/share/pigi/wake-wrap.ps1'
\$psbin = 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe'
\$runId = '$PASS_ID'
\$ret = ([wmiclass]'Win32_Process').Create("\$psbin -NoProfile -ExecutionPolicy Bypass -File \$wrap -RunId \$runId -Reason \`"FB engagement pass\`" -WorkerExe \$node -WorkerArgsCsv \$eng,\$job -MaxWaitMinutes 240")
if (\$ret.ReturnValue -ne 0) { Write-Error ("WMI Create failed rc=" + \$ret.ReturnValue); exit 1 }
"FBWORKERPID=\$(\$ret.ProcessId)"
EOF
)
# PID parse (2026-09-24: PowerShell may wrap stdout in CLIXML with progress
# records, e.g. "#< CLIXML" + "Preparing modules for first use" blobs, so a
# bare numeric PID no longer round-trips. The remote script emits a tagged
# FBWORKERPID=<n> line; grep extracts it regardless of CLIXML noise.)
WORKER_PID=$(pig_ssh "powershell -NoProfile -EncodedCommand $(printf '%s' "$REMOTE_PS" | iconv -t UTF-16LE | base64 -w0)" 2>/dev/null | tr -d '\r' | grep -oE 'FBWORKERPID=[0-9]+' | head -1 | cut -d= -f2)
if ! printf '%s' "$WORKER_PID" | grep -qE '^[0-9]+$'; then
  echo "{\"ok\":false,\"dispatched\":false,\"infra\":\"worker_launch_failed\",\"note\":\"Detached worker launch returned no PID; intents are in EXECUTION and the next pass will refuse them as UNKNOWN_EXECUTION until reconciled.\"}" >&2
  echo '{"ok":false,"dispatched":false,"infra":"worker_launch_failed"}'
  rm -f "$GUARD_OUT" "$GUARD_REPORT" "$CURATE_OUT" "$ELIG_CHECK" "$INTENT_JOB" "$INTENT_REFUSE" "$STAMPED_JOB"
  exit 2
fi

# Durable dispatch record: the operation/run identity. The collector and any
# operator can resolve pass_id -> remote files from here; the worker also
# echoes pass_id into result.json and progress lines as a second path.
# (FB_JOBS_DIR is a test seam; production uses pig-fb/jobs.)
JOBS_DIR="${FB_JOBS_DIR:-$(dirname "$0")/jobs}"
mkdir -p "$JOBS_DIR"
python3 - <<PYEOF
import json
rec = {
    "pass_id": "$PASS_ID", "ts": "$TS", "dispatched_at_utc": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    "remote_job": "$REMOTE_JOB", "remote_result": "$REMOTE_RESULT",
    "remote_progress": "$REMOTE_PROGRESS", "worker_pid": "$WORKER_PID",
    "eligible": $ELIGIBLE_COUNT, "blocked": $BLOCKED_COUNT,
    "intent_refused": $REFUSED_COUNT, "worker": "engage.js",
}
open("$JOBS_DIR/$PASS_ID.json", "w").write(json.dumps(rec, indent=1) + "\n")
PYEOF

# Retention hygiene: sweep Pig-side transfer buffers older than 7d.
# (FB_RETENTION is a test seam; production uses pig-retention.sh.)
# Never fails the dispatch.
"${FB_RETENTION:-$(dirname "$0")/pig-retention.sh}" --apply >/dev/null 2>&1 || true

rm -f "$GUARD_OUT" "$GUARD_REPORT" "$CURATE_OUT" "$ELIG_CHECK" "$INTENT_JOB" "$INTENT_REFUSE" "$STAMPED_JOB"
echo "{\"ok\":true,\"dispatched\":true,\"pass_id\":\"$PASS_ID\",\"job\":\"job-$TS.json\",\"worker_pid\":\"$WORKER_PID\",\"eligible\":$ELIGIBLE_COUNT,\"blocked\":$BLOCKED_COUNT,\"intent_refused\":$REFUSED_COUNT,\"collector\":\"collect_pass.sh (runs every ~15m)\"}"
exit 0
