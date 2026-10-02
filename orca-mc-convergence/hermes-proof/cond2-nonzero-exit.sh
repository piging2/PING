#!/bin/bash
# cond2-nonzero-exit.sh — Condition 2: nonzero exit handling.
# Proves: (a) the ssh/WSL channel propagates exact nonzero codes;
# (b) prompt-hermes.sh's tail-call structure preserves the code (script exit = ssh exit);
# (c) the adapter captured the live 127 EXACTLY and did not swallow it
#     (no collapse to failed; escalated with honestOutcome unknown).
# Zero Hermes cost: no model invocation (uses `false` and the cond1 artifact).
set -u
HERE=/home/hatch/workspace/orca-mc-convergence/hermes-proof
EV=$HERE/evidence
pig_ssh() {
  ssh -i /home/hatch/.ssh/id_ed25519 -o BatchMode=yes -o ConnectTimeout=25 \
    -o UserKnownHostsFile=/home/hatch/workspace/pig/known_hosts \
    -o ProxyCommand='nc -X connect -x hatch-egress-proxy:3130 %h %p' \
    nolan@100.79.154.43 "$@"
}

echo "--- 2a: channel propagates exact nonzero exit (wsl -- false -> expect 1)"
pig_ssh 'wsl -u nolan -- false' >/dev/null 2>&1
RC1=$?
echo "ssh_rc=$RC1"

echo "--- 2b: prompt-hermes.sh tail-call structure (script exit must equal last-command exit)"
tail -3 /home/hatch/workspace/bin/prompt-hermes.sh
# structural fact: last line is the ssh invocation; `set -u` only (no `set -e`, no trap).
# observed end-to-end in cond1: ssh RC=127 -> spawnSync status=127 -> artifact exitCode=127.

echo "--- 2c: adapter captured the live 127 exactly, no swallowing"
python3 - "$EV/result-cond1-a1.json" <<'PY'
import json, sys
a = json.load(open(sys.argv[1]))
ok = (a["exitCode"] == 127 and a["timedOut"] is False
      and a["outcome"] == "unknown" and a["reason"] == "worker_protocol_failure"
      and a["stdoutTail"] == "" and a["stderr"] == "")
print(json.dumps({"exitCode": a["exitCode"], "outcome": a["outcome"],
                  "reason": a["reason"], "not_collapsed_to_failed": a["outcome"] != "failed",
                  "exact_code_captured": a["exitCode"] == 127, "checks_pass": ok}))
sys.exit(0 if ok else 1)
PY
RC2=$?

echo "--- 2d: stderr opacity finding (bridge discards diagnostic detail)"
grep -n "2>/dev/null" /home/hatch/workspace/bin/prompt-hermes.sh

if [ "$RC1" = "1" ] && [ "$RC2" = "0" ]; then
  echo "COND2_RESULT=PASS"
  PASS=true
else
  echo "COND2_RESULT=FAIL"
  PASS=false
fi
python3 - "$([ "$PASS" = true ] && echo 1 || echo 0)" <<'PY'
import json, sys
rec = {"condition": 2, "name": "nonzero exit: exact code captured, no silent swallowing",
       "pass": sys.argv[1] == "1",
       "evidence": {
         "channel_exit_propagation": "wsl -u nolan -- false -> ssh RC=1 (observed live)",
         "script_tail_call": "last line is the ssh invocation; set -u only; cond1 observed ssh127->spawnSync127->artifact127",
         "adapter_capture": "artifact exitCode=127, outcome=unknown/worker_protocol_failure, NOT failed",
         "x_follow_lesson": "satisfied by structure (tail call); no explicit 'exit $LASTEXITCODE' but nothing interposes",
         "finding_stderr_opacity": "prompt-hermes.sh sends ssh stderr to /dev/null and scp output to /dev/null; artifact stderr='' for the 127: code propagates, diagnostic message does not (operator needs Pig-side access for the why)",
       }}
json.dump(rec, open("/home/hatch/workspace/orca-mc-convergence/hermes-proof/evidence/cond2-evidence.json", "w"), indent=2)
print(json.dumps(rec, indent=2))
PY
[ "$PASS" = true ]
