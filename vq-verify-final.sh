#!/bin/bash
# Receives patch bundles on stdin: PATCH:<name> then base64 lines.
# Decodes to /tmp/vq-final/ and runs git apply --check on each.
set -u
mkdir -p /tmp/vq-final
cd /tmp/vq-final
python3 - <<'PYEOF'
import base64, sys, os
name = None
os.makedirs("/tmp/vq-final", exist_ok=True)
for line in sys.stdin:
    line = line.rstrip("\n")
    if line.startswith("PATCH:"):
        name = line[6:]
    elif line.strip() and name:
        open("/tmp/vq-final/" + name + ".patch", "wb").write(base64.b64decode(line))
        name = None
print("decoded:", sorted(os.listdir("/tmp/vq-final")))
PYEOF
cd /home/nolan/projects/ping
for p in /tmp/vq-final/*.patch; do
  n=$(basename "$p" .patch)
  if git apply --check "$p" 2>/tmp/vq-err.txt; then
    echo "PASS(check): $n"
  else
    echo "FAIL(check): $n"
    cat /tmp/vq-err.txt
  fi
done
echo "=== repo status (must show only pre-existing entries) ==="
git status --porcelain | head -8
