#!/bin/bash
cd /home/nolan/projects/ping || exit 1
python3 - <<'PYEOF'
import json
d = json.load(open("/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json"))
g = d["graph"]
print("projection relationships touching the plumbing service object:")
for r in g["relationships"]:
    if "139408827c27" in (r.get("subject","") + r.get("object","")):
        print(json.dumps(r, indent=1)[:600])
PYEOF
