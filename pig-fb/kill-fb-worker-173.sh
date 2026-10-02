#!/bin/bash
# Kill the mis-curated fb engagement worker on the Pig (pass-173 correction).
set -u
source "$(dirname "$0")/pig-ssh.sh"
pig_ssh "powershell -NoProfile -Command \\\"Stop-Process -Id 37168 -Force\\\""
echo "stop rc=$?"
sleep 3
"$(dirname "$0")/fb-worker-probe.sh"
echo "probe rc=$? (0=clear, 1=in-flight, 2=unknown)"
