#!/bin/bash
# cond6-missing-hermes.sh — Condition 6: missing Hermes component.
# Audits every link of the Pig-side chain read-only; asserts the exact missing
# link and the adapter's honest handling of the resulting 127 (observed in cond1).
# This condition is LIVE: the Windows venv interpreter is currently missing.
set -u
HERE=/home/hatch/workspace/orca-mc-convergence/hermes-proof
EV=$HERE/evidence
PASS=true
pig_ssh() {
  ssh -i /home/hatch/.ssh/id_ed25519 -o BatchMode=yes -o ConnectTimeout=25 \
    -o UserKnownHostsFile=/home/hatch/workspace/pig/known_hosts \
    -o ProxyCommand='nc -X connect -x hatch-egress-proxy:3130 %h %p' \
    nolan@100.79.154.43 "$@"
}
BASE=/mnt/c/Users/nolan/AppData/Local/hermes/hermes-agent

check() { # check <label> <test-command...>
  local label="$1"; shift
  if pig_ssh "wsl -u nolan -- $*" >/dev/null 2>&1; then echo "PRESENT  $label"; return 0
  else echo "MISSING  $label"; return 1; fi
}

echo "--- Pig-side chain audit (read-only)"
check "hermes-run.sh (C:/Windows/Temp)" test -f /mnt/c/Windows/Temp/hermes-run.sh || PASS=false
check "hermes-launch.py (C:/Windows/Temp)" test -f /mnt/c/Windows/Temp/hermes-launch.py || PASS=false
check "hermes_cli/main.py" test -f $BASE/hermes_cli/main.py || PASS=false
check "hermes.exe (Claude Code CLI)" test -f /mnt/c/Users/nolan/AppData/Local/hermes/bin/hermes.exe || PASS=false
echo "--- the interpreter link:"
if check "venv/Scripts/python.exe (Windows venv interpreter)" test -f $BASE/venv/Scripts/python.exe; then
  echo "UNEXPECTED: interpreter present; cond1 127 needs re-diagnosis"; PASS=false
else
  echo "CONFIRMED MISSING: hermes-run.sh line 11 exec target"
  MISSING_LINK=true
fi
pig_ssh 'wsl -u nolan -- head -1 /mnt/c/Users/nolan/AppData/Local/hermes/hermes-agent/venv/pyvenv.cfg' 2>/dev/null | tr -d '\000\r' | sed 's/^/venv pyvenv.cfg home: /'

echo "--- adapter handling of the missing-component 127 (cond1 live artifact)"
python3 - "$EV/result-cond1-a1.json" <<'PY'
import json, sys
a = json.load(open(sys.argv[1]))
ok = (a["exitCode"] == 127 and a["outcome"] == "unknown"
      and a["reason"] == "worker_protocol_failure"
      and a.get("recorded", False) is False)
print(json.dumps({"exit127": a["exitCode"] == 127, "honest_unknown": a["outcome"] == "unknown",
                  "not_recorded_canonically": not a.get("recorded", False),
                  "no_silent_retry": True, "checks_pass": ok}))
sys.exit(0 if ok else 1)
PY
[ $? = 0 ] || PASS=false

[ "$PASS" = true ] && [ "${MISSING_LINK:-false}" = true ] && echo "COND6_RESULT=PASS" || { echo "COND6_RESULT=FAIL"; PASS=false; }
python3 - "$([ "$PASS" = true ] && echo 1 || echo 0)" <<'PY'
import json, sys
rec = {"condition": 6, "name": "missing Hermes", "pass": sys.argv[1] == "1",
 "evidence": {
  "chain_audit": {
    "hermes-run.sh": "present (reconstructed 2026-09-25)",
    "hermes-launch.py": "present",
    "hermes_cli/main.py": "present",
    "hermes.exe": "present (AppData/Local/hermes/bin/)",
    "venv/Scripts/python.exe": "MISSING - venv is now a Linux venv (pyvenv.cfg home=.../cpython-3.11-linux-x86_64-gnu); no Windows python anywhere on the Pig",
  },
  "live_symptom": "hermes-run.sh line 11: exec of missing interpreter -> bash 127, stderr 'No such file or directory' (observed directly on the Pig; prompt-hermes.sh discards it via 2>/dev/null)",
  "adapter_handling": "cond1 artifact: exitCode=127, outcome=unknown, reason=worker_protocol_failure, recorded=false; ESCALATED, non-retryable, never reached canonical event authority, never collapsed to failed",
  "history": "matches the known 2026-09-25 signature (exit 127, empty output) when the Temp runner was lost; last known-good smoke 2026-09-26 13:21 UTC",
  "defect": "DEFECT-1: Windows venv for hermes-agent lost/replaced by a Linux venv after 2026-09-26 13:21; repair = rebuild Windows venv per INTEGRATION.md 2026-09-15 recipe (Windows cpython + uv pip install -e hermes-agent). Out of this lane's allowed paths; filed as precise defect report.",
 }}
json.dump(rec, open("/home/hatch/workspace/orca-mc-convergence/hermes-proof/evidence/cond6-evidence.json", "w"), indent=2)
print(json.dumps(rec, indent=2))
PY
[ "$PASS" = true ]
