#!/bin/bash
# ensure-cdp.sh: make sure the Pig's headed Chrome/CDP substrate is up.
# Probes CDP :9223; if down, fires the existing PigiFBLogin recovery task on
# demand and waits up to ~90s for the watchdog to relaunch Chrome.
# Exit 0 = CDP reachable, 1 = still down after recovery attempt.
set -u
source "$(dirname "$0")/pig-ssh.sh"
probe() {
  # tr -d '\r': PowerShell emits CRLF; without stripping, "200\r" never equals "200"
  # and every preflight fails closed as cdp_down_after_relaunch even when CDP is up.
  PIG_TIMEOUT=15 pig_ssh \
    "powershell -NoProfile -Command \"try { (Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:9223/json/version' -TimeoutSec 5).StatusCode } catch { 'DOWN' }\"" 2>/dev/null | tr -d '\r'
}
[ "$(probe)" = "200" ] && exit 0
pig_ssh "schtasks /run /tn PigiFBLogin" >/dev/null 2>&1
for _ in $(seq 1 18); do
  sleep 5
  [ "$(probe)" = "200" ] && exit 0
done
exit 1
