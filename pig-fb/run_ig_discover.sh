#!/bin/bash
# run_ig_discover.sh -- READ-ONLY Instagram discovery on the Pig ig-profile Chrome.
# Usage: run_ig_discover.sh <local-job.json>
# Scps ig-discover.js + job to the Pig, runs it (read-only: no likes/comments/
# follows/DMs), scps the result JSON back. Exit 0 with result printed; exit 2
# on infra problems (Pig unreachable, CDP down, logged out, or the discovery
# surface is marked UNHEALTHY by the positive-control health gate).
#
# HEALTH GATE 2026-09-25 (Nolan): health is derived from positive-control
# evidence, never assumed. While .ig-discovery-health.json says UNHEALTHY,
# this script refuses to burn CDP time and exits 2 before touching the Pig.
# Revalidate (control-only, no browser) with:
#   node ig-nearmiss-followup.js --controls-only .ig-discovery-health.json
# A passing revalidation clears UNHEALTHY to HEALTHY. The marker never
# auto-clears on time alone.
set -u
JOB="$1"
TS=$(date +%Y%m%d-%H%M%S)
INBOX="C:/Users/nolan/.local/share/pigi/ig-engage"
REMOTE_JS="$INBOX/ig-discover.js"
REMOTE_JOB="$INBOX/inbox/discover-job-$TS.json"
REMOTE_RES="$REMOTE_JOB.result.json"
HEALTH_FILE="$(dirname "$0")/.ig-discovery-health.json"
if [ -f "$HEALTH_FILE" ]; then
  HEALTH_STATUS=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('status','UNKNOWN'))" "$HEALTH_FILE" 2>/dev/null || echo CORRUPT)
  if [ "$HEALTH_STATUS" = "UNHEALTHY" ]; then
    echo '{"ok":false,"infra":"discovery_surface_unhealthy","note":"positive controls failed; run control-only revalidation before discovery"}'
    exit 2
  fi
  [ "$HEALTH_STATUS" = "CORRUPT" ] && echo "WARNING: unreadable discovery health marker $HEALTH_FILE; proceeding" >&2
fi
source "$(dirname "$0")/pig-ssh.sh"
source "$(dirname "$0")/wake-bracket.sh"  # job-scoped wake lease (2026-09-27)

pig_scp "$(dirname "$0")/ig-discover.js" "$PIG:$REMOTE_JS" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"scp_script_failed"}'; exit 2; }
# P0 FIX 2026-09-24: ig-discover.js requires ./ig-observation.js (pure shared
# observation-status module). Deploy both or the funnel breaks on the Pig.
pig_scp "$(dirname "$0")/ig-observation.js" "$PIG:$INBOX/ig-observation.js" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"scp_shared_module_failed"}'; exit 2; }
"$(dirname "$0")/ensure-cdp-ig.sh" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"cdp_down_after_relaunch"}'; exit 2; }
python3 -c "import json,sys; p=sys.argv[1]; j=json.load(open(p)); j['resultFile']=sys.argv[2]+'.result.json'; json.dump(j,open(p,'w'))" "$JOB" "$REMOTE_JOB"
pig_scp "$JOB" "$PIG:$REMOTE_JOB" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"scp_failed"}'; exit 2; }

# Job-scoped wake lease (2026-09-27, Nolan): hold ES_CONTINUOUS |
# ES_SYSTEM_REQUIRED for exactly the worker's lifetime. Warn-and-proceed on
# deploy failure; the bracket degrades to today's behavior (no inhibition).
wake_wrap_deploy "run_ig_discover.sh"

REMOTE_PS=$(cat <<EOF
$(wake_ps_acquire "igdiscover-$TS" "IG discovery (ig-discover.js, read-only)")
\$job = '$REMOTE_JOB'
\$proc = Start-Process -FilePath 'C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe' -ArgumentList '$REMOTE_JS', \$job -NoNewWindow -PassThru
if (\$proc.WaitForExit(3600000)) { 'DISCOVER_DONE exit=' + \$proc.ExitCode }
else { \$proc.Kill(); 'DISCOVER_TIMEOUT' }
$(wake_ps_release "igdiscover-$TS")
EOF
)
REMOTE_B64=$(printf '%s' "$REMOTE_PS" | iconv -t UTF-16LE | base64 -w0)
OUT=$(pig_ssh_wake "$REMOTE_B64" 2>/dev/null)
if ! printf '%s' "$OUT" | grep -q 'DISCOVER_DONE'; then
  echo '{"ok":false,"infra":"discover_failed_or_timeout","detail":"'"$(printf '%s' "$OUT" | tr -d '\r\n' | cut -c1-120)"'"}'
  exit 2
fi
LOCAL_RES="${JOB%.json}.result.json"
pig_scp "$PIG:$REMOTE_RES" "$LOCAL_RES" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"scp_result_failed"}'; exit 2; }
# P0 FIX 2026-09-24 (Nolan): wire the near-miss follow-up into the acquisition
# path. Every result now gets bounded CLI follow-up + reconciliation before any
# skip-list decision. Bounded (12 handles / 600s default): extras DEFER to the
# next pass, never skip. Failures print a warning and leave the result intact.
RECON="${LOCAL_RES%.result.json}.reconciliation.json"
node "$(dirname "$0")/ig-nearmiss-followup.js" "$LOCAL_RES" "$RECON" >/dev/null 2>"$RECON.log" \
  || echo "WARNING: near-miss follow-up failed; see $RECON.log" >&2
# Fold this run's positive controls into the discovery health marker.
# UNHEALTHY pauses the next discovery run (see the gate at the top);
# a passing run clears a previous UNHEALTHY back to HEALTHY.
if [ -f "$RECON" ]; then
  node "$(dirname "$0")/ig-nearmiss-followup.js" --mark-from-recon "$RECON" "$HEALTH_FILE" >/dev/null 2>&1 \
    || echo "WARNING: could not update discovery health marker $HEALTH_FILE" >&2
fi
cat "$LOCAL_RES"
