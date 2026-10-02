#!/bin/bash
python3 - <<'PYEOF'
import json
d = json.load(open("/home/nolan/lane-lin-out/chain-happy-place.json"))
links = {l["stage"]: l for l in d["links"]}
print(json.dumps(links["sitespec_binding"]["detail"]["bindings"][3], separators=(",", ":")))
print("----CANONICAL----")
for name in ["chain-coppersmith.json", "chain-happy-place.json"]:
    dd = json.load(open(f"/home/nolan/lane-lin-out/{name}"))
    canon = json.dumps(dd, sort_keys=True, separators=(",", ":"))
    import hashlib
    print(name, hashlib.sha256(canon.encode()).hexdigest())
PYEOF
