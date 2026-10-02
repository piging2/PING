#!/bin/bash
# ensure-cdp-li.sh: make sure the Pig's LinkedIn headed Chrome/CDP substrate is up.
# Probes CDP :9224. Unlike the FB variant, there is no recovery scheduled task yet
# (PigiLILogin is created during Nolan's one-time setup); if the probe fails we
# report down and exit 1 rather than firing the FB task, which would be wrong.
# Exit 0 = CDP reachable, 1 = down.
set -u
source "$(dirname "$0")/../pig-fb/pig-ssh.sh"
probe() {
  # tr -d '\r': PowerShell emits CRLF; without stripping, "200\r" never equals "200".
  PIG_TIMEOUT=15 pig_ssh \
    "powershell -NoProfile -Command \"try { (Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:9224/json/version' -TimeoutSec 5).StatusCode } catch { 'DOWN' }\"" 2>/dev/null | tr -d '\r'
}
[ "$(probe)" = "200" ] && exit 0
exit 1
