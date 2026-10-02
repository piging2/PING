#!/bin/bash
# test-host-sleep-classifier.sh -- fail-before regression fixture for the
# 2026-09-28 03:41 MDT classifier defect.
#
# DEFECT: pig-health.sh classified a TRANSPORT FAILURE as HOST_ASLEEP.
# At 03:41 MDT the tailnet SSH path wedged (proxy TCP OK, empty proxy
# response, SSH never reached). The host was actually UP the entire time
# (Docker API writes 05:04:56, watchdog healthy 05:11:02, WSL uptime
# continuous, no reboot). The classifier emitted:
#   {"ts":"2026-09-28T09:41:41Z","status":"HOST_ASLEEP",
#    "checks":{"ssh":"down (no answer after 12s; evidence-weighted: standby)"}}
# "evidence-weighted: standby" is the classifier admitting it GUESSED sleep
# from absence of evidence. ABSENCE OF REACHABILITY IS NOT EVIDENCE OF SLEEP.
#
# CLASSIFIER BOUNDARY (pig-health.sh, HOST domain branch):
#   - SSH fails AND network probe failed fast (<8s) -> NETWORK_DOWN / UNKNOWN
#   - SSH fails after >=8s (slow blackhole)          -> HOST_ASLEEP  <-- DEFECT
# The 8-second cutoff is arbitrary: neither branch has POSITIVE sleep
# evidence (no SleepStudy session, no power-state telemetry, no wake-source
# record). A slow transport wedge and a sleeping host are indistinguishable
# to this probe, so the honest classification is UNKNOWN, never ASLEEP.
#
# REQUIRED HIERARCHY (Nolan, 2026-09-28):
#   HOST_ASLEEP                - positive host/power-state evidence of sleep
#   HOST_REBOOTING             - positive boot/restart evidence
#   HOST_UP_TRANSPORT_UNREACHABLE - host-up evidence but transport unavailable
#   NETWORK_PATH_FAILURE       - transport/network isolated (proxy CONNECT fails)
#   SERVICE_DOWN               - host/path up, target service unavailable
#   UNKNOWN_REACHABILITY_FAILURE - evidence cannot distinguish (the 03:41 case)
#
# This test runs the REAL pig-health.sh against a sandboxed 03:41 transport:
#   - network probe (proxy CONNECT :22) answers 200  -> NETWORK=UP
#   - SSH never answers (blackhole, >=8s)            -> the defect branch
# It FAILS while the classifier maps that input to HOST_ASLEEP, and PASSES
# once HOST_ASLEEP requires positive sleep evidence.
set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIG_DIR="$(cd "$HERE/../.." && pwd)"
SRC="$PIG_DIR/pig-health.sh"

fail() { echo "FAIL: $1"; exit 1; }
pass() { echo "PASS: $1"; exit 0; }

[ -x "$SRC" ] || [ -f "$SRC" ] || fail "pig-health.sh not found at $SRC"

T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
mkdir -p "$T/pig" "$T/pig-fb" "$T/stubbin"
cp "$SRC" "$T/pig/pig-health.sh"

# Stub pig_ssh: the 03:41 SSH blackhole. Never answers; the caller times out.
cat > "$T/pig-fb/pig-ssh.sh" <<'EOF'
pig_ssh() { sleep 9; return 1; }
EOF

# Stub python3: the network probe's CONNECT gets a 200 (path OK, like 03:41
# where proxy TCP was fine but the SSH tunnel was wedged). Every other
# python3 invocation passes through to the real interpreter.
REAL_PY="$(command -v python3)"
cat > "$T/stubbin/python3" <<EOF
#!/bin/bash
for a in "\$@"; do
  case "\$a" in
    *hatch-egress-proxy*) printf 'HTTP/1.1 200 Connection established\r\n'; exit 0 ;;
  esac
done
exec "$REAL_PY" "\$@"
EOF
chmod +x "$T/stubbin/python3"

export PATH="$T/stubbin:$PATH"
out="$("$T/pig/pig-health.sh" 2>&1)"
status="$(printf '%s' "$out" | grep -o 'PIG_HEALTH status=[A-Za-z_]*' | cut -d= -f2)"
echo "--- sandboxed 03:41 run ---"
printf '%s\n' "$out" | head -8
echo "---------------------------"
echo "03:41 fixture: NETWORK probe=200 (path OK), SSH=blackhole (no answer >=8s)"
echo "Ground truth (established later): host was UP the entire window."
echo "Classifier status: ${status:-<unparsed>}"

[ -n "${status:-}" ] || fail "could not parse classifier status"
if [ "$status" = "HOST_ASLEEP" ]; then
  fail "03:41 fixture classified as HOST_ASLEEP with zero positive sleep evidence (want UNKNOWN_REACHABILITY_FAILURE per hierarchy)"
fi
case "$status" in
  UNKNOWN_REACHABILITY_FAILURE|NETWORK_DOWN|HOST_UP_TRANSPORT_UNREACHABLE)
    pass "03:41 fixture classified as $status (no sleep claim without sleep evidence)"
    ;;
  *)
    fail "03:41 fixture classified as $status; hierarchy wants UNKNOWN_REACHABILITY_FAILURE (got neither ASLEEP nor a defined unknown state)"
    ;;
esac
