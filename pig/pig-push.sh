#!/bin/bash
# pig-push.sh: transfer a local file to the Pig via chunked base64.
# Usage: pig-push.sh <localfile> <pigpath>
# Chunked at 2500 chars per bridge call (cmd.exe command-line limit lesson).
set -euo pipefail
localfile="$1"
pigpath="$2"
bridge="$HOME/workspace/pig/pigwsl-run.sh"
tmp="$(mktemp)"
base64 -w0 "$localfile" > "$tmp"
# start fresh
"$bridge" "rm -f '$pigpath.b64' && touch '$pigpath.b64'" < /dev/null > /dev/null
python3 - "$tmp" "$pigpath" "$bridge" <<'PYEOF'
import subprocess, sys
tmp, pigpath, bridge = sys.argv[1], sys.argv[2], sys.argv[3]
data = open(tmp).read().strip()
for i in range(0, len(data), 2500):
    chunk = data[i:i+2500]
    script = "printf '%s' '" + chunk + "' >> '" + pigpath + ".b64'"
    subprocess.run([bridge, script], stdin=subprocess.DEVNULL,
                   capture_output=True, check=True)
# decode and verify
script = ("base64 -d '" + pigpath + ".b64' > '" + pigpath + "'"
          " && rm '" + pigpath + ".b64'"
          " && wc -c < '" + pigpath + "'")
r = subprocess.run([bridge, script], stdin=subprocess.DEVNULL,
                   capture_output=True, text=True, check=True)
print("pig bytes:", r.stdout.strip())
PYEOF
rm -f "$tmp"
