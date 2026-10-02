#!/bin/bash
# pig-get.sh: pull a file from the Pig to local. Usage: pig-get.sh <remote-path> <local-path>
set -e
remote="$1"; local="$2"
mkdir -p "$(dirname "$local")"
# NOTE: pigwsl-exec strips literal single-quoted substrings; use double quotes only.
~/workspace/bin/pigwsl-exec "base64 -w0 $remote" > /tmp/pigget.b64
python3 - "$local" <<'PYEOF'
import json, re, base64, sys
raw = open('/tmp/pigget.b64').read()
m = re.search(r'"stdout"\s*:\s*"((?:[^"\\]|\\.)*)"', raw, re.S)
if m:
    payload = m.group(1).encode().decode('unicode_escape')
else:
    payload = raw
payload = ''.join(payload.split())
data = base64.b64decode(payload)
open(sys.argv[1],'wb').write(data)
print("pulled %d bytes -> %s" % (len(data), sys.argv[1]))
PYEOF
