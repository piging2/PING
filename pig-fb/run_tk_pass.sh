#!/bin/bash
# run_tk_pass.sh -- run one TikTok engagement pass on the Pig.
# Usage: run_tk_pass.sh <local-job.json>
# The cron worker does candidate selection, guard/ledger/intent bookkeeping,
# and verification; this script only executes the CLOSED action set on the Pig:
#   preflight CDP :9227 -> scp job to Pig inbox -> launch tk-engage.js ->
#   collect result JSON -> print it.
# Job format (same as ig-engage.js): {"actions":[{"type":"like"|"comment","url":..,"text"?}], "minDelaySec":60,"maxDelaySec":120}
# Exit 0 on completed pass (even with failed actions); exit 2 on infra problems
# (Pig unreachable, CDP down, logged out) with a JSON error on stdout.
set -u
JOB="$1"
TS=$(date +%Y%m%d-%H%M%S)
# Authority gate (2026-09-29, Nolan 90h GO): a schedule is NOT authorization.
# authority-check.py consumes AUTHORITY.json, platform tripwires, and recent
# pass logs; a nonzero exit halts with zero external effects (fail closed).
"$(dirname "$0")/../outreach/authority-check.py" tiktok || { echo "run_tk_pass.sh: authority gate denied; failing closed" >&2; exit 2; }
REMOTE="C:/Users/nolan/.local/share/pigi/tt-engage/inbox/job-$TS.json"
source "$(dirname "$0")/pig-ssh.sh"  # PIG_TIMEOUT default 25
source "$(dirname "$0")/wake-bracket.sh"  # job-scoped wake lease (2026-09-27)

"$(dirname "$0")/ensure-cdp-tt.sh" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"cdp_down_after_relaunch"}'; exit 2; }

pig_scp "$JOB" "$PIG:$REMOTE" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"scp_failed"}'; exit 2; }

# Owner-hold sentinel for the worker (2026-10-02): <job>.hold.json starts
# held:false; the worker re-reads it before every action and fails closed if
# missing/unreadable/invalid. enforce-hold.sh pushes held:true if a hold lands
# mid-pass. A failed sentinel scp fails the dispatch.
printf '{"held":false,"surface":"tiktok","ts":"%s"}' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$JOB.hold.json"
pig_scp "$JOB.hold.json" "$PIG:$REMOTE.hold.json" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"sentinel_scp_failed"}'; rm -f "$JOB.hold.json"; exit 2; }
rm -f "$JOB.hold.json"

# Owner-hold re-check at the last responsible boundary (2026-10-02, owner-hold
# authority repair): re-read CURRENT holds.json immediately before dispatch. A
# hold that landed after the top gate (stale schedule, queued worker, restart,
# manual trigger) denies here with zero new external effects.
"$(dirname "$0")/../outreach/authority-check.py" tiktok || { echo "run_tk_pass.sh: owner hold re-check denied at pre-launch boundary; failing closed" >&2; exit 2; }

# Job-scoped wake lease (2026-09-27, Nolan): hold ES_CONTINUOUS |
# ES_SYSTEM_REQUIRED for exactly the worker's lifetime. Warn-and-proceed on
# deploy failure; the bracket degrades to today's behavior (no inhibition).
wake_wrap_deploy "run_tk_pass.sh"

REMOTE_PS=$(cat <<EOF
$(wake_ps_acquire "tk-$TS" "TikTok engagement pass (tk-engage.js)")
\$job = '$REMOTE'
\$res = "\$job.result.json"
Remove-Item \$res -ErrorAction SilentlyContinue
\$proc = Start-Process -FilePath 'C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe' -ArgumentList 'C:/Users/nolan/.local/share/pigi/tt-engage/tk-engage.js', \$job -NoNewWindow -PassThru
if (\$proc.WaitForExit(10800000)) {
  if (Test-Path \$res) { Get-Content \$res -Raw }
  else { '{"ok":false,"infra":"result_missing"}' }
} else {
  \$proc.Kill()
  '{"ok":false,"infra":"worker_timeout"}'
}
$(wake_ps_release "tk-$TS")
EOF
)
REMOTE_B64=$(printf '%s' "$REMOTE_PS" | iconv -t UTF-16LE | base64 -w0)
OUT=$(pig_ssh_wake "$REMOTE_B64" 2>/dev/null)
if [ -z "$OUT" ]; then
  OUT=$(pig_ssh "powershell -NoProfile -Command \"if (Test-Path '$REMOTE.result.json') { Get-Content '$REMOTE.result.json' -Raw }\"" 2>/dev/null)
fi
if [ -n "$OUT" ]; then
  # Extract the JSON object (the worker prints a RESULT summary line too).
  printf '%s' "$OUT" | python3 -c "
import json, sys
raw = sys.stdin.read()
i = raw.find('{')
if i < 0: sys.exit(1)
print(json.dumps(json.JSONDecoder().raw_decode(raw[i:])[0]))
" || { echo '{"ok":false,"infra":"result_unparseable"}'; exit 2; }
  "$(dirname "$0")/pig-retention.sh" --apply >/dev/null 2>&1 || true
  exit 0
fi
echo '{"ok":false,"infra":"result_unavailable"}'
exit 2
