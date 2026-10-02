#!/bin/bash
# run_ig_pass.sh -- run one Instagram/Threads engagement pass on the Pig.
# Usage: run_ig_pass.sh <local-job.json>
# The cron worker does candidate selection, guard/ledger/intent bookkeeping,
# and verification; this script only executes the CLOSED action set on the Pig:
#   preflight CDP :9226 -> scp job to Pig inbox -> launch ig-engage.js ->
#   collect result JSON -> print it.
# The worker opens its OWN separate browser window inside the ig-profile
# (CDP Target.createTarget newWindow) -- never tabs in Nolan's window.
# See ig-engage.js openWorkerWindow (2026-09-23).
# Job format (same as engage.js): {"actions":[{"type":"like"|"comment","url":..,"text"?}], "minDelaySec":60,"maxDelaySec":120}
# Exit 0 on completed pass (even with failed actions); exit 2 on infra problems
# (Pig unreachable, CDP down, logged out) with a JSON error on stdout.
set -u
JOB="$1"
TS=$(date +%Y%m%d-%H%M%S)
# Authority gate (2026-09-29, Nolan 90h GO): a schedule is NOT authorization.
# authority-check.py consumes AUTHORITY.json, platform tripwires, and recent
# pass logs; a nonzero exit halts with zero external effects (fail closed).
"$(dirname "$0")/../outreach/authority-check.py" instagram || { echo "run_ig_pass.sh: authority gate denied; failing closed" >&2; exit 2; }
REMOTE="C:/Users/nolan/.local/share/pigi/ig-engage/inbox/job-$TS.json"
source "$(dirname "$0")/pig-ssh.sh"  # PIG_TIMEOUT default 25
source "$(dirname "$0")/wake-bracket.sh"  # job-scoped wake lease (2026-09-27)

# Browser mutual-exclusion (2026-09-21, FL-20260921-015): the ig-profile
# Chrome (:9226) is shared with the IG unfollow worker and Threads passes.
# Hold the profile lock for this run's lifetime; if another worker holds it,
# fail closed before any browser work.
source "$(dirname "$0")/browser-lock.sh"
browser_lock_acquire ig "run_ig_pass.sh" || exit 2

# Capability gate (2026-09-17, automation-resilience program): check the IG
# capability state FIRST, before any CDP probe or browser work. When BLOCKED
# (e.g. BROWSER_WEDGE), exit quietly with classification DEPENDENCY_FAILURE
# instead of firing browser tasks into a wedged browser. Never attempt to
# restart, kill, or relaunch the Pig's ig-profile Chrome.
source "$(dirname "$0")/ig-capability-gate.sh"
ig_capability_check || exit 2

# Keep the Pig-side worker current so the CANARY_REQUIRED support below is live.
pig_scp "$(dirname "$0")/ig-engage.js" "$PIG:C:/Users/nolan/.local/share/pigi/ig-engage/ig-engage.js" >/dev/null 2>&1 || {
  echo '{"ok":false,"infra":"worker_scp_failed"}'; exit 2; }

# Canary mode: after a browser recovery the capability state carries
# canary_required=true; the Pig worker then executes exactly ONE canary
# action, verifies the result, and only continues the batch on success.
if [ "$(ig_canary_flag)" = "1" ]; then IG_CANARY_REQUIRED=1; fi
export IG_CANARY_REQUIRED="${IG_CANARY_REQUIRED:-}"

"$(dirname "$0")/ensure-cdp-ig.sh" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"cdp_down_after_relaunch"}'; exit 2; }

pig_scp "$JOB" "$PIG:$REMOTE" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"scp_failed"}'; exit 2; }

# Job-scoped wake lease (2026-09-27, Nolan): hold ES_CONTINUOUS |
# ES_SYSTEM_REQUIRED for exactly the worker's lifetime. Warn-and-proceed on
# deploy failure; the bracket degrades to today's behavior (no inhibition).
wake_wrap_deploy "run_ig_pass.sh"

REMOTE_PS=$(cat <<EOF
$(wake_ps_acquire "ig-$TS" "IG engagement pass (ig-engage.js)")
\$env:CANARY_REQUIRED = '${IG_CANARY_REQUIRED:-}'
\$job = '$REMOTE'
\$res = "\$job.result.json"
Remove-Item \$res -ErrorAction SilentlyContinue
\$proc = Start-Process -FilePath 'C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe' -ArgumentList 'C:/Users/nolan/.local/share/pigi/ig-engage/ig-engage.js', \$job -NoNewWindow -PassThru
if (\$proc.WaitForExit(10800000)) {
  if (Test-Path \$res) { Get-Content \$res -Raw }
  else { '{"ok":false,"infra":"result_missing"}' }
} else {
  \$proc.Kill()
  '{"ok":false,"infra":"worker_timeout"}'
}
$(wake_ps_release "ig-$TS")
EOF
)
REMOTE_B64=$(printf '%s' "$REMOTE_PS" | iconv -t UTF-16LE | base64 -w0)
OUT=$(pig_ssh_wake "$REMOTE_B64" 2>/dev/null)
if [ -z "$OUT" ]; then
  OUT=$(pig_ssh "powershell -NoProfile -Command \"if (Test-Path '$REMOTE.result.json') { Get-Content '$REMOTE.result.json' -Raw }\"" 2>/dev/null)
fi
if [ -n "$OUT" ]; then
  # Extract the JSON object (the worker prints a RESULT summary line too).
  RESULT_JSON=$(printf '%s' "$OUT" | python3 -c "
import json, sys
raw = sys.stdin.read()
i = raw.find('{')
if i < 0: sys.exit(1)
print(json.dumps(json.JSONDecoder().raw_decode(raw[i:])[0]))
") || { echo '{"ok":false,"infra":"result_unparseable"}'; exit 2; }
  echo "$RESULT_JSON"
  # A verified canary clears the post-recovery canary requirement.
  if [ "${IG_CANARY_REQUIRED:-}" = "1" ] && printf '%s' "$RESULT_JSON" | grep -q '"canary_verified"[[:space:]]*:[[:space:]]*true'; then
    ig_canary_clear >/dev/null 2>&1 || true
  fi
  "$(dirname "$0")/pig-retention.sh" --apply >/dev/null 2>&1 || true
  exit 0
fi
echo '{"ok":false,"infra":"result_unavailable"}'
exit 2
