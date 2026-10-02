#!/bin/bash
# run_th_pass.sh -- run one Threads engagement pass on the Pig.
# Usage: run_th_pass.sh <local-job.json>
# The cron worker does candidate selection, guard/ledger/intent bookkeeping,
# and verification; this script only executes the CLOSED action set on the Pig:
#   preflight CDP :9226 -> scp job to Pig inbox -> launch th-engage.js ->
#   collect result JSON -> print it.
# Threads shares the ig-profile Chrome (:9226) because Threads web auth IS
# Instagram auth (one profile, one login). The worker opens its OWN separate
# browser window inside that profile (CDP Target.createTarget newWindow) --
# never tabs in Nolan's window. See th-engage.js openWorkerWindow (2026-09-23).
# Job format: {"actions":[{"type":"like"|"comment","account":"@x","url":..,
#   "marker":"distinctive post substring","text"?}], "minDelaySec":60,"maxDelaySec":120}
# Exit 0 on completed pass (even with failed actions); exit 2 on infra problems
# (Pig unreachable, CDP down, logged out) with a JSON error on stdout.
set -u
JOB="$1"
TS=$(date +%Y%m%d-%H%M%S)
# Authority gate (2026-09-29, Nolan 90h GO): a schedule is NOT authorization.
# authority-check.py consumes AUTHORITY.json, platform tripwires, and recent
# pass logs; a nonzero exit halts with zero external effects (fail closed).
"$(dirname "$0")/../outreach/authority-check.py" threads || { echo "run_th_pass.sh: authority gate denied; failing closed" >&2; exit 2; }
REMOTE="C:/Users/nolan/.local/share/pigi/ig-engage/inbox/th-engage-job-$TS.json"
source "$(dirname "$0")/pig-ssh.sh"  # PIG_TIMEOUT default 25
source "$(dirname "$0")/wake-bracket.sh"  # job-scoped wake lease (2026-09-27)

"$(dirname "$0")/ensure-cdp-ig.sh" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"cdp_down_after_relaunch"}'; exit 2; }

pig_scp "$(dirname "$0")/th-engage.js" "$PIG:C:/Users/nolan/.local/share/pigi/ig-engage/th-engage.js" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"scp_script_failed"}'; exit 2; }
pig_scp "$JOB" "$PIG:$REMOTE" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"scp_failed"}'; exit 2; }

# Job-scoped wake lease (2026-09-27, Nolan): hold ES_CONTINUOUS |
# ES_SYSTEM_REQUIRED for exactly the worker's lifetime. Warn-and-proceed on
# deploy failure; the bracket degrades to today's behavior (no inhibition).
wake_wrap_deploy "run_th_pass.sh"

REMOTE_PS=$(cat <<EOF
$(wake_ps_acquire "th-$TS" "Threads engagement pass (th-engage.js)")
\$job = '$REMOTE'
\$res = "\$job.result.json"
Remove-Item \$res -ErrorAction SilentlyContinue
\$proc = Start-Process -FilePath 'C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe' -ArgumentList 'C:/Users/nolan/.local/share/pigi/ig-engage/th-engage.js', \$job -NoNewWindow -PassThru
if (\$proc.WaitForExit(10800000)) {
  if (Test-Path \$res) { Get-Content \$res -Raw }
  else { '{"ok":false,"infra":"result_missing"}' }
} else {
  \$proc.Kill()
  '{"ok":false,"infra":"worker_timeout"}'
}
$(wake_ps_release "th-$TS")
EOF
)
REMOTE_B64=$(printf '%s' "$REMOTE_PS" | iconv -t UTF-16LE | base64 -w0)
OUT=$(pig_ssh_wake "$REMOTE_B64" 2>/dev/null)
if [ -z "$OUT" ]; then
  OUT=$(pig_ssh "powershell -NoProfile -Command \"if (Test-Path '$REMOTE.result.json') { Get-Content '$REMOTE.result.json' -Raw }\"" 2>/dev/null)
fi
if [ -n "$OUT" ]; then
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
