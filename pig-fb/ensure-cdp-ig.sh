#!/bin/bash
# ensure-cdp-ig.sh: make sure the Pig's ig-profile headed Chrome/CDP substrate is up.
# Probes CDP :9226; if down, fires the PigiIGLogin recovery task and waits ~90s.
# Exit 0 = CDP reachable, 1 = still down after recovery attempt.
set -u
source "$(dirname "$0")/pig-ssh.sh"
probe() {
  PIG_TIMEOUT=15 pig_ssh \
    "powershell -NoProfile -Command \"try { (Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:9226/json/version' -TimeoutSec 5).StatusCode } catch { 'DOWN' }\"" 2>/dev/null | tr -d '\r'
}
[ "$(probe)" = "200" ] && exit 0
pig_ssh "schtasks /run /tn PigiIGLogin" >/dev/null 2>&1
for _ in $(seq 1 18); do
  sleep 5
  [ "$(probe)" = "200" ] && exit 0
done
exit 1
