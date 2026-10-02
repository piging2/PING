#!/bin/bash
# meta-check-remote.sh -- run the Meta AI login-state diagnostic ON the Pig.
#
# (2026-10-02 self-audit: meta-check.js references the Pig's loopback CDP
# endpoint (http://127.0.0.1:9223) and the Pig's node_modules. A bare
# `node meta-check.js` on the scheduler VM fails with MODULE_NOT_FOUND
# (playwright-core) AND checks the wrong host's loopback, yielding zero
# diagnostic signal. This wrapper is the only supported way to run it.)
#
# WHEN to run: only when a run's failure classification suggests a possible
# session-auth issue (meta-ask.js reporting login walls, throttle-scan
# throttle_signal hits, "Log in" buttons in captured text). Do NOT run for
# explicit CDP-down infra (connectOverCDP timeout, cdp_down_after_relaunch):
# the classification is already sufficient and the check adds nothing
# (precedent: self-audit-2026-09-27-meta-pass-2104).
#
# Read-only: opens a tab on meta.ai in the Pig's fb-profile Chrome and reads
# login state (hasChatInput / loginBtns / url / title as JSON). Closes the tab.
#
# Transport quirk (2026-10-02, proven by bisection): a newline-joined
# 3-statement EncodedCommand payload of the exact shape
#   Set-Location '<dir>'\n& '<node>' '<script>'\nexit $LASTEXITCODE
# deterministically fails at the SSH exec layer (rc=255, "exec request failed
# on channel 0") while every 1- and 2-line subset succeeds. The same three
# statements joined with ';' on one line work. Mechanism unknown; do not
# "simplify" this back to newlines without re-testing end to end.
#
# Usage: meta-check-remote.sh
# Exit 0: diagnostic ran; verdict JSON on stdout.
# Exit 1: diagnostic ran; Pig-side failure (FATAL line on stderr), rc propagated.
# Exit 2: infra (scp/ssh failed; verdict unknown).
set -u
HERE="$(dirname "$0")"
source "$HERE/pig-ssh.sh"
source "$HERE/wake-bracket.sh"  # pig_ssh_wake (EncodedCommand transport)
REMOTE_DIR="C:/Users/nolan/.local/share/pigi/fb-engage"
PIG_NODE="C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe"

# Pin the Pig-side copy to this repo's file (idempotent; scp overwrites).
pig_scp "$HERE/meta-check.js" "$PIG:$REMOTE_DIR/meta-check.js" >/dev/null 2>&1 \
  || { echo "INFRA scp_failed: could not deploy meta-check.js to the Pig" >&2; exit 2; }

# Semicolon-joined single line: see transport-quirk note above.
META_PS="Set-Location '$REMOTE_DIR'; & '$PIG_NODE' '$REMOTE_DIR/meta-check.js'; exit \$LASTEXITCODE"
META_B64=$(printf '%s' "$META_PS" | iconv -t UTF-16LE | base64 -w0)
OUT=$(PIG_TIMEOUT=120 pig_ssh_wake "$META_B64" 2>/tmp/meta-check-remote-err.txt)
RC=$?
cat /tmp/meta-check-remote-err.txt >&2 || true
printf '%s\n' "$OUT"
if [ $RC -eq 255 ]; then
  echo "INFRA ssh_exec_failed rc=255 (transport rejected the command)" >&2
  exit 2
fi
[ $RC -ne 0 ] && [ $RC -ne 1 ] && { echo "INFRA remote_failed rc=$RC" >&2; exit 2; }
exit $RC
