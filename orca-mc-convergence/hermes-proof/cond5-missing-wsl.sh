#!/bin/bash
# cond5-missing-wsl.sh — Condition 5: missing WSL.
# Positive leg (live, read-only): WSL present, default distro Running, `wsl -u nolan` works.
# Negative leg (live, channel level, non-destructive): a missing WSL component
#   surfaces as nonzero exit + error text on stdout (UTF-16 from wsl.exe).
# Trace to adapter (observed mechanism, cond1): nonzero exit + no JSON envelope
#   -> worker_protocol_failure -> ESCALATED with honestOutcome=unknown, never failed.
# Full E2E (actually removing WSL) is destructive and forbidden: NOT fired; documented.
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

echo "--- 5a: WSL present, default distro running, user nolan works"
pig_ssh 'wsl -u nolan -- whoami' >/tmp/c5a.out 2>&1; RC=$?; WHO=$(cat /tmp/c5a.out | tr -d '\000\r\n')
echo "rc=$RC whoami=$WHO"
[ "$RC" = "0" ] && [ "$WHO" = "nolan" ] || PASS=false
pig_ssh 'wsl -l -v' 2>/dev/null | tr -d '\000' | grep -c "Running" | xargs -I{} echo "running_distros={}"

echo "--- 5b: missing WSL component surfaces honestly at the channel (non-destructive)"
pig_ssh 'wsl -d no-such-distro-xyz -- hostname' >/tmp/c5b.out 2>/tmp/c5b.err; RC=$?
ERRTEXT=$(tr -d '\000' < /tmp/c5b.out | tr -d '\r\n' | head -c 120)
echo "rc=$RC stdout_len=$(wc -c < /tmp/c5b.out) stderr_len=$(wc -c < /tmp/c5b.err)"
echo "stdout_head=$ERRTEXT"
echo "$ERRTEXT" | grep -q "WSL_E_DISTRO_NOT_FOUND" || PASS=false
[ "$RC" != "0" ] || PASS=false

echo "--- 5c: adapter trace for this shape (nonzero exit, no JSON) = cond1's observed path"
python3 - "$EV/result-cond1-a1.json" <<'PY'
import json, sys
a = json.load(open(sys.argv[1]))
ok = a["exitCode"] != 0 and a["reason"] == "worker_protocol_failure" and a["outcome"] == "unknown"
print("adapter_shape_ok=", ok)
sys.exit(0 if ok else 1)
PY
[ $? = 0 ] || PASS=false

[ "$PASS" = true ] && echo "COND5_RESULT=PASS" || echo "COND5_RESULT=FAIL"
python3 - "$([ "$PASS" = true ] && echo 1 || echo 0)" <<'PY'
import json, sys
rec = {"condition": 5, "name": "missing WSL", "pass": sys.argv[1] == "1",
 "evidence": {
  "positive_leg": "WSL present; distros Ubuntu(default,Running)+docker-desktop(Running); 'wsl -u nolan -- whoami' -> nolan rc=0 (note: 'nolan' is the WSL username, not a distro)",
  "negative_leg_channel": "wsl -d no-such-distro-xyz -> RC=255, stdout='There is no distribution with the supplied name. Error code: Wsl/Service/WSL_E_DISTRO_NOT_FOUND' (UTF-16), stderr empty",
  "bridge_note": "prompt-hermes.sh discards only ssh stderr; wsl.exe error text arrives on stdout so it survives into the adapter's stdoutTail",
  "adapter_trace": "nonzero exit + no JSON envelope -> worker_protocol_failure -> ESCALATED, honestOutcome=unknown, non-retryable, never failed (mechanism observed live in cond1)",
  "not_fired": "full E2E with WSL actually removed: destructive, forbidden by lane contract; negative leg verified at channel level + adapter code path instead",
 }}
json.dump(rec, open("/home/hatch/workspace/orca-mc-convergence/hermes-proof/evidence/cond5-evidence.json", "w"), indent=2)
print(json.dumps(rec, indent=2))
PY
[ "$PASS" = true ]
