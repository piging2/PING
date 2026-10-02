#!/bin/bash
# ig-capability-gate.sh -- capability gate for Instagram browser automations.
# (2026-09-17, automation-resilience program, Nolan directive items 9-11.)
#
# The IG automations (engagement passes, unfollow batches) drive the Pig's
# ig-profile headed Chrome over CDP :9226. When that browser wedges at the
# websocket layer, firing browser work into it is useless and risks
# hammering a broken substrate. The canonical capability state lives in
# ig-capability-state.json (exclusive ownership: automation-resilience).
# This helper is the ONLY sanctioned reader of that file; run_ig_pass.sh
# and run_ig_unfollow.sh call ig_capability_check FIRST, before any CDP
# probe or browser work.
#
# Usage: source this file, then call:
#   ig_capability_check [state-file]
#       Exit 0 when status=AVAILABLE. Exit 2 with a classification
#       DEPENDENCY_FAILURE JSON object on stdout when BLOCKED, or when the
#       state file is missing/unreadable (fail closed: an unreadable
#       capability record is a fault, not a green light).
#   ig_canary_flag [state-file]
#       Print "1" when a post-recovery canary is required, else "0".
#   ig_canary_clear [state-file]
#       Atomically clear canary_required (call only after a verified canary).
#
# Env overrides (tests and ig-recovery-test.sh only):
#   IG_CAPABILITY_STATE  alternate state-file path.
#   IG_GATE_BYPASS       when set, ig_capability_check passes with a stderr
#       notice. Set ONLY by ig-recovery-test.sh during a verified recovery
#       run; never set by scheduled passes.
#
# All functions are safe under `set -u`.

ig_capability_check() {
  local state_file="${1:-${IG_CAPABILITY_STATE:-$(dirname "${BASH_SOURCE[0]}")/ig-capability-state.json}}"
  if [ -n "${IG_GATE_BYPASS:-}" ]; then
    echo "ig_capability_gate: BYPASSED (${IG_GATE_BYPASS}); caller takes responsibility" >&2
    return 0
  fi
  local verdict
  verdict=$(python3 - "$state_file" <<'PY' 2>/dev/null || echo "UNREADABLE"
import json, sys
try:
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        st = json.load(f)
except Exception:
    print("UNREADABLE")
    sys.exit(0)
status = st.get("status")
if status == "AVAILABLE":
    print("AVAILABLE")
elif status == "BLOCKED":
    print(json.dumps({
        "ok": False,
        "classification": "DEPENDENCY_FAILURE",
        "capability": st.get("capability", "instagram-browser-automation"),
        "status": "BLOCKED",
        "reason": st.get("reason", "UNKNOWN"),
        "reason_detail": (st.get("reason_detail") or "")[:400],
        "blocked_since": st.get("blocked_since"),
        "note": "Capability gate: no browser work fired. See ig-capability-state.json.",
    }))
else:
    print("UNREADABLE")
PY
)
  case "$verdict" in
    AVAILABLE)
      return 0
      ;;
    UNREADABLE)
      printf '{"ok":false,"classification":"DEPENDENCY_FAILURE","reason":"capability_state_unreadable","note":"ig-capability-state.json missing or unparseable; fail closed, no browser work fired."}\n'
      return 2
      ;;
    *)
      # BLOCKED: verdict is the JSON payload.
      printf '%s\n' "$verdict"
      return 2
      ;;
  esac
}

ig_canary_flag() {
  local state_file="${1:-${IG_CAPABILITY_STATE:-$(dirname "${BASH_SOURCE[0]}")/ig-capability-state.json}}"
  python3 - "$state_file" <<'PY' 2>/dev/null || echo "0"
import json, sys
try:
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        st = json.load(f)
    print("1" if st.get("canary_required") is True else "0")
except Exception:
    print("0")
PY
}

ig_canary_clear() {
  local state_file="${1:-${IG_CAPABILITY_STATE:-$(dirname "${BASH_SOURCE[0]}")/ig-capability-state.json}}"
  python3 - "$state_file" <<'PY'
import json, os, sys, datetime
p = sys.argv[1]
with open(p, 'r', encoding='utf-8') as f:
    st = json.load(f)
st["canary_required"] = False
st["updated_at"] = datetime.datetime.now(datetime.timezone.utc).astimezone().isoformat(timespec="seconds")
tmp = p + ".tmp"
with open(tmp, 'w', encoding='utf-8') as f:
    json.dump(st, f, indent=2, sort_keys=True)
    f.write("\n")
    f.flush()
    os.fsync(f.fileno())
os.rename(tmp, p)
print("canary_required cleared")
PY
}
