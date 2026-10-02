#!/bin/bash
cd /home/nolan/projects/ping || exit 1
python3 - <<'PYEOF'
claim = "Are you working on new construction for residential homes or commercial buildings?"
p = "src/fyd/proceduralize/raw/coppersmith-plumbing/index.html"
b = open(p, "rb").read()
i = b.find(claim.encode())
print("claim byte offset in index.html:", i, "file size:", len(b))
print("slice 63873-65082 first 200 chars:")
print(b[63873:65082][:200])
print()
print("claim context:")
print(b[max(0,i-160):i+len(claim)+80].decode("utf8", "replace")[:400])
PYEOF
