#!/bin/bash
# ig-recovery-test.sh -- verify the IG browser wedge has cleared, then re-arm the capability.
# (2026-09-17, automation-resilience program, Nolan directive items 9-11.)
#
# Run this AFTER Nolan manually closes and reopens the Pig's ig-profile Chrome
# (the wedge cannot be cleared any other way; see ig-capability-state.json).
# The full chain, in order:
#   authenticate -> reach target surface -> enumerate -> verify enumeration ->
#   dry-run -> execute ONE canary action -> verify -> unlock normal cadence.
#
# Rules:
# - This script NEVER restarts, kills, or force-closes the ig-profile Chrome.
#   If the wedge persists, it reports DEPENDENCY_FAILURE and leaves the
#   capability BLOCKED. The 2026-09-16 force-kill lost the IG session; that
#   must never happen again.
# - No mass operation immediately after recovery: the only mutation is ONE
#   canary like. On success the capability flips to AVAILABLE with
#   canary_required=true, so the first scheduled run opens with its own
#   verified canary before any batch continues.
# - The ONLY writer allowed to flip BLOCKED -> AVAILABLE is this script.
#
# Env:
#   IG_CANARY_POST_URL   (required) a stable public Instagram post URL for the
#                        one canary like. Use a post where a like is harmless
#                        and reversible (e.g. a major account's public post).
#   IG_CAPABILITY_STATE  alternate capability state file (tests).
#   IG_ACTION_TRUTH_FILE alternate action-truth file (tests).
#   IG_RECOVERY_ENUMERATE_RUNNER / IG_RECOVERY_CANARY_RUNNER / IG_ENSURE_CDP
#                        alternate helper scripts (tests; defaults are the real
#                        run_ig_unfollow.sh / run_ig_pass.sh / ensure-cdp-ig.sh).
#
# Exit: 0 recovery verified and capability unlocked; 0 with RECOVERY_SKIP when
# the capability is not BLOCKED (nothing to do); 2 when the wedge persists or
# the chain fails (stays BLOCKED); 3 on usage/contract errors.
set -u
HERE="$(dirname "$0")"
STATE_FILE="${IG_CAPABILITY_STATE:-$HERE/ig-capability-state.json}"
TRUTH_APPEND="$HOME/workspace/outreach/action-truth-append.py"
TRUTH_FILE="${IG_ACTION_TRUTH_FILE:-$HOME/workspace/outreach/action-truth.jsonl}"
ENUMERATE_RUNNER="${IG_RECOVERY_ENUMERATE_RUNNER:-$HERE/run_ig_unfollow.sh}"
CANARY_RUNNER="${IG_RECOVERY_CANARY_RUNNER:-$HERE/run_ig_pass.sh}"
ENSURE_CDP="${IG_ENSURE_CDP:-$HERE/ensure-cdp-ig.sh}"
CANARY_POST_URL="${IG_CANARY_POST_URL:-}"
TS=$(date +%Y%m%d-%H%M%S)
RUN_ID="ig-recovery-$TS"
ENUM_JOB="/tmp/ig-recovery-enumerate-$TS.json"
CANARY_JOB="/tmp/ig-recovery-canary-$TS.json"

cleanup() { rm -f "$ENUM_JOB" "$CANARY_JOB" "$ENUM_JOB.result.json" "$CANARY_JOB.result.json" 2>/dev/null; }
trap cleanup EXIT

truth() {
  # truth <platform> <operation> <classification> <notes> [k=v ...]
  local platform="$1" operation="$2" classification="$3" notes="$4"; shift 4
  "$TRUTH_APPEND" --file "$TRUTH_FILE" --run-id "$RUN_ID" --platform "$platform" \
    --operation "$operation" --classification "$classification" --notes "$notes" "$@" 2>/dev/null || true
}

fail_blocked() {
  # fail_blocked <classification> <notes>
  echo "RECOVERY_FAIL classification=$1 note=$2" >&2
  truth instagram recovery-test "$1" "$2"
  exit 2
}

# ---- 0. Only run when the capability is actually BLOCKED ----
STATUS=$(python3 -c "import json;print(json.load(open('$STATE_FILE')).get('status','UNREADABLE'))" 2>/dev/null || echo "UNREADABLE")
if [ "$STATUS" != "BLOCKED" ]; then
  echo "RECOVERY_SKIP capability status is $STATUS; nothing to recover."
  exit 0
fi
echo "RECOVERY_START run=$RUN_ID capability=BLOCKED; verifying the wedge cleared."

# ---- 1. Substrate probe (standard preflight; never kills anything) ----
"$ENSURE_CDP" >/dev/null 2>&1 || \
  fail_blocked DEPENDENCY_FAILURE "CDP :9226 still down after ensure preflight; wedge persists. Nolan must close/reopen the ig-profile Chrome on the Pig."
echo "RECOVERY_STEP cdp_http_ok"

# ---- 2+3. Authenticate, reach target surface, enumerate, verify enumeration ----
# Reuse the unfollow worker in read-only enumerate mode. IG_GATE_BYPASS is the
# documented recovery-only escape hatch (the gate would otherwise refuse, since
# the capability is still BLOCKED until this chain passes).
printf '{"mode":"enumerate"}' > "$ENUM_JOB"
ENUM_OUT=$(IG_GATE_BYPASS=recovery-test "$ENUMERATE_RUNNER" "$ENUM_JOB" 2>/dev/null) || true
ENUM_JSON=$(printf '%s' "$ENUM_OUT" | python3 -c "
import json, sys
raw = sys.stdin.read()
i = raw.find('{')
sys.exit(1) if i < 0 else None
print(json.dumps(json.JSONDecoder().raw_decode(raw[i:])[0]))
" 2>/dev/null) || fail_blocked DEPENDENCY_FAILURE "enumerate runner returned no parseable result; wedge likely persists."

ENUM_CLASS=$(printf '%s' "$ENUM_JSON" | python3 -c "
import json, sys
o = json.load(sys.stdin)
if o.get('infra') == 'cdp_unavailable': print('DEPENDENCY_FAILURE')
elif o.get('logged_in') is False: print('AUTH_FAILURE')
elif not o.get('ok'): print('DEPENDENCY_FAILURE')
else: print('OK:' + str(len(o.get('entries', []))))
" 2>/dev/null) || fail_blocked DEPENDENCY_FAILURE "enumerate result unreadable."

case "$ENUM_CLASS" in
  DEPENDENCY_FAILURE)
    fail_blocked DEPENDENCY_FAILURE "enumerate hit CDP attach failure; websocket wedge persists." ;;
  AUTH_FAILURE)
    fail_blocked AUTH_FAILURE "enumerate found the IG session logged out; Nolan must log into Instagram again in the Pig's ig-profile Chrome." ;;
  OK:0)
    fail_blocked ENUMERATION_FAILURE "enumerate succeeded but returned zero entries; surface may have drifted." ;;
  OK:*)
    ENUM_COUNT="${ENUM_CLASS#OK:}"
    echo "RECOVERY_STEP enumerate_ok entries=$ENUM_COUNT (login gate passed, list surface reachable)" ;;
  *)
    fail_blocked DEPENDENCY_FAILURE "unexpected enumerate classification: $ENUM_CLASS" ;;
esac

# ---- 4. Dry-run: validate the canary plan without touching the browser ----
[ -n "$CANARY_POST_URL" ] || { echo "RECOVERY_CONTRACT_ERROR IG_CANARY_POST_URL is not set; refusing to pick a canary target. Set it to a stable public post URL and rerun." >&2; exit 3; }
case "$CANARY_POST_URL" in
  https://www.instagram.com/p/*|https://www.instagram.com/reel/*) ;;
  *) echo "RECOVERY_CONTRACT_ERROR IG_CANARY_POST_URL must be an instagram.com post/reel URL." >&2; exit 3 ;;
esac
printf '{"actions":[{"type":"like","url":"%s"}],"minDelaySec":60,"maxDelaySec":120}' "$CANARY_POST_URL" > "$CANARY_JOB"
echo "RECOVERY_STEP dryrun_ok plan=1x like on $CANARY_POST_URL (validated, nothing executed yet)"

# ---- 5+6. Execute ONE canary action and verify ----
CANARY_OUT=$(IG_GATE_BYPASS=recovery-test CANARY_REQUIRED=1 "$CANARY_RUNNER" "$CANARY_JOB" 2>/dev/null) || true
CANARY_OK=$(printf '%s' "$CANARY_OUT" | python3 -c "
import json, sys
raw = sys.stdin.read()
i = raw.find('{')
sys.exit(1) if i < 0 else None
o = json.JSONDecoder().raw_decode(raw[i:])[0]
print('yes' if (o.get('ok') is True and o.get('canary_verified') is True) else 'no')
" 2>/dev/null) || CANARY_OK="no"
[ "$CANARY_OK" = "yes" ] || \
  fail_blocked TEMPORARY_FAILURE "canary like did not verify (ok/canary_verified not both true). Keeping BLOCKED; the browser may need another restart or the account may be throttled."
echo "RECOVERY_STEP canary_verified (one like executed and verified; no batch ran)"

# ---- 7. Unlock: flip BLOCKED -> AVAILABLE with canary_required=true ----
python3 - "$STATE_FILE" <<'PY'
import json, os, sys, datetime
p = sys.argv[1]
with open(p, 'r', encoding='utf-8') as f:
    st = json.load(f)
if st.get("status") != "BLOCKED":
    sys.exit(10)  # someone else changed it; refuse to stomp
now = datetime.datetime.now(datetime.timezone.utc).astimezone().isoformat(timespec="seconds")
st["status"] = "AVAILABLE"
st["canary_required"] = True
st["unblocked_at"] = now
st["updated_at"] = now
st["updated_by"] = "ig-recovery-test.sh (full chain verified)"
st["last_recovery"] = {
    "run": "see action-truth.jsonl",
    "note": "Chain passed: CDP ok, login gate ok, enumerate ok, dry-run ok, one canary like verified. No mass operation performed. First scheduled run opens with a verified canary.",
}
tmp = p + ".tmp"
with open(tmp, 'w', encoding='utf-8') as f:
    json.dump(st, f, indent=2, sort_keys=True)
    f.write("\n")
    f.flush()
    os.fsync(f.fileno())
os.rename(tmp, p)
print("unlocked")
PY
[ $? -eq 0 ] || { echo "RECOVERY_FAIL state flip refused (status changed under us); not unlocking." >&2; exit 2; }

truth instagram recovery-test SUCCESS_ACTION \
  "Wedge cleared. Chain: CDP ok, login gate ok, enumerate ok ($ENUM_COUNT entries), dry-run ok, one canary like verified. Capability AVAILABLE; canary_required=true for the first scheduled run. No mass operation performed." \
  --discovered "$ENUM_COUNT" --attempted 1 --succeeded 1 --verified 1

echo "RECOVERY_OK run=$RUN_ID capability=AVAILABLE canary_required=true"
echo "No mass operation was performed. Normal cadence resumes on the next scheduled run, which opens with a verified canary."
exit 0
