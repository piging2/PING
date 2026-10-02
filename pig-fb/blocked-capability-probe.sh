#!/bin/bash
# blocked-capability-probe.sh -- lightweight recovery probe for BLOCKED browser capabilities.
# Approved policy (2026-09-18, ORCA hardening workstream D):
#   BLOCKED -> lightweight probe (at most every 6h) -> evidence-backed success -> normal scheduling restored.
#
# INVOCATION: called by the existing engagement pass crons (instagram-engagement-pass,
# threads-engagement-pass) at their capability gate while status=BLOCKED. There is NO
# separate probe scheduler; the passes already run every 2h and already record evidence.
# The script self-defers (PROBE_DEFERRED) when last_probe is within 6h, so the effective
# probe cadence is ~6h without any new scheduling machinery.
#
# What a probe is: cdp-ig-probe.js does connectOverCDP to the Pig's ig-profile Chrome
# (:9226) with a 20s timeout, read-only: no navigation, no actions. The wedge signature
# is: HTTP /json/version answers, but the DevTools websocket accept path hangs
# ("retrieving websocket url" timeout).
#
# What a probe NEVER does: restart, kill, or force-close the ig-profile Chrome.
# The manual close/reopen remains the operator's (BLOCKED_EXTERNAL_OPERATOR_ACTION).
# The ONLY writer allowed to flip BLOCKED -> AVAILABLE is ig-recovery-test.sh.
# This probe only DETECTS recovery and records evidence.
#
# On RECOVERY_DETECTED: if IG_CANARY_POST_URL is set, the sanctioned
# ig-recovery-test.sh runs (it owns the unlock). Otherwise the probe records
# RECOVERY_DETECTED_UNLOCK_PENDING and the operator runs the recovery test.
#
# State fields per capability (in <name>-capability-state.json):
#   capability, blocked_since, consecutive_failures, last_probe, probe_result, next_probe
# next_probe is DERIVED (last_probe + 6h), never fabricated; null until the first probe.
# Exit codes: 0 probe completed (see probe_result in state), 2 all probes deferred/skipped.
set -u
HERE="$(dirname "$0")"
STATES="$HERE/ig-capability-state.json $HERE/th-capability-state.json"
PROBE_JS="$HERE/cdp-ig-probe.js"
INBOX_WIN="C:/Users/nolan/.local/share/pigi/ig-engage"
INBOX_WSL="/mnt/c/Users/nolan/.local/share/pigi/ig-engage"
NODE_WIN="/mnt/c/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe"
INTERVAL_SECS=21600
EVIDENCE_LOG="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/blocked-capability-probes.log"

source "$HERE/pig-ssh.sh"

now_utc() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { printf '%s %s\n' "$(now_utc)" "$*" >> "$EVIDENCE_LOG"; }

run_pig_probe() {
  # Prints probe JSON on stdout. Return 0 = probe executed, 2 = inconclusive (Pig unreachable).
  local attempt out
  pig_scp "$PROBE_JS" "$PIG:$INBOX_WIN/cdp-ig-probe.js" >/dev/null 2>&1 || { echo '{"ok":false,"error":"scp_to_pig_failed"}'; return 2; }
  for attempt in 1 2 3; do
    out=$("$HERE/../pig/pigwsl-run.sh" "timeout 60 $NODE_WIN $INBOX_WSL/cdp-ig-probe.js; rm -f $INBOX_WSL/cdp-ig-probe.js" 2>/dev/null | tr -d '\r' | grep -m1 '^{.*}$')
    if [ -n "$out" ]; then echo "$out"; return 0; fi
    [ "$attempt" -lt 3 ] && sleep 50
  done
  "$HERE/../pig/pigwsl-run.sh" "rm -f $INBOX_WSL/cdp-ig-probe.js" >/dev/null 2>&1
  echo '{"ok":false,"error":"pig_unreachable_after_3_attempts"}'
  return 2
}

ANY_PROBED=0
for STATE in $STATES; do
  [ -f "$STATE" ] || continue
  CAP=$(python3 -c "import json;print(json.load(open('$STATE')).get('capability','?'))" 2>/dev/null)
  STATUS=$(python3 -c "import json;print(json.load(open('$STATE')).get('status','?'))" 2>/dev/null)
  if [ "$STATUS" != "BLOCKED" ]; then
    log "capability=$CAP result=AVAILABLE_SKIP status=$STATUS"
    echo "SKIP $CAP: status=$STATUS"
    continue
  fi
  LAST=$(python3 -c "import json;print(json.load(open('$STATE')).get('last_probe') or '')" 2>/dev/null)
  if [ -n "$LAST" ]; then
    AGE=$(( $(date -u +%s) - $(date -u -d "$LAST" +%s 2>/dev/null || echo 0) ))
    if [ "$AGE" -lt "$INTERVAL_SECS" ]; then
      log "capability=$CAP result=PROBE_DEFERRED last_probe=$LAST age_s=$AGE"
      echo "DEFERRED $CAP: last probe ${AGE}s ago (<6h)"
      continue
    fi
  fi
  ANY_PROBED=1
  echo "PROBING $CAP..."
  PROBE_JSON=$(run_pig_probe); RC=$?
  NOW=$(now_utc)
  if [ "$RC" -eq 2 ]; then
    RESULT="INCONCLUSIVE_PIG_UNREACHABLE"
    log "capability=$CAP result=$RESULT detail=$(printf '%s' "$PROBE_JSON" | cut -c1-120)"
    echo "INCONCLUSIVE $CAP: pig unreachable (not counted as a capability failure)"
  elif printf '%s' "$PROBE_JSON" | grep -q '"ok":true'; then
    RESULT="RECOVERY_DETECTED"
    log "capability=$CAP result=$RESULT detail=$(printf '%s' "$PROBE_JSON" | cut -c1-160)"
    echo "RECOVERY_DETECTED $CAP: wedge cleared"
  else
    SIG=$(printf '%s' "$PROBE_JSON" | grep -o 'retrieving websocket url[^"]*' | head -1)
    [ -z "$SIG" ] && SIG=$(printf '%s' "$PROBE_JSON" | cut -c1-120)
    RESULT="WEDGE_PERSISTS"
    log "capability=$CAP result=$RESULT signature=$SIG"
    echo "BLOCKED $CAP: wedge persists"
  fi
  python3 - "$STATE" "$NOW" "$RESULT" <<'PY'
import json, sys, datetime
p, now, result = sys.argv[1], sys.argv[2], sys.argv[3]
st = json.load(open(p))
st['last_probe'] = now
st['probe_result'] = result
if result == 'WEDGE_PERSISTS':
    st['consecutive_failures'] = int(st.get('consecutive_failures') or 0) + 1
elif result == 'RECOVERY_DETECTED':
    st['consecutive_failures'] = 0
    st['recovery_detected_at'] = now
    st['recovery_unlock'] = 'PENDING: ig-recovery-test.sh (exclusive writer) must verify and flip BLOCKED->AVAILABLE'
dt = datetime.datetime.strptime(now, '%Y-%m-%dT%H:%M:%SZ') + datetime.timedelta(seconds=21600)
st['next_probe'] = dt.strftime('%Y-%m-%dT%H:%M:%SZ')
st['updated_at'] = now
st['updated_by'] = 'blocked-capability-probe.sh'
json.dump(st, open(p, 'w'), indent=2, ensure_ascii=False)
PY
  if [ "$RESULT" = "RECOVERY_DETECTED" ]; then
    if [ -n "${IG_CANARY_POST_URL:-}" ]; then
      echo "Running sanctioned unlock: ig-recovery-test.sh"
      IG_CANARY_POST_URL="$IG_CANARY_POST_URL" "$HERE/ig-recovery-test.sh" 2>&1 | tail -5
      log "capability=$CAP result=RECOVERY_TEST_RUN canary_configured=yes"
    else
      echo "OPERATOR ACTION NEEDED: wedge cleared for $CAP. IG_CANARY_POST_URL is not set, so the probe will NOT auto-unlock. Run: IG_CANARY_POST_URL=<stable public IG post URL> ~/workspace/pig-fb/ig-recovery-test.sh"
      log "capability=$CAP result=RECOVERY_DETECTED_UNLOCK_PENDING canary_url_configured=no"
    fi
  fi
done
echo DONE
[ "$ANY_PROBED" -eq 1 ] && exit 0 || exit 2
