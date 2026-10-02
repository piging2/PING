#!/bin/bash
python3 - <<'PYEOF'
import json
d = json.load(open("/home/nolan/lane-lin-out/chain-happy-place.json"))
links = {l["stage"]: l for l in d["links"]}
s5 = links["sitespec_binding"]
print("BINDING SECTION IDS:", [b["sectionId"] for b in s5["detail"]["bindings"]])
print("BINDING COMPONENTS:", [(b["sectionId"], b["component"]) for b in s5["detail"]["bindings"]])
print("EXCERPT:", s5["excerpt"])
print()
s4 = links["object_field"]
print("DELTA:", json.dumps(s4["detail"]["journalOverlayDelta"]))
print()
s6 = links["rendered_claim"]
print("RENDER SECTION IDS:", [(r["page"], r["sectionId"], r["claimPresent"]) for r in s6["detail"]["renders"]])
print()
s2 = links["observation"]
print("RANGE DETAIL:", json.dumps(s2["detail"]["sourceLocationRangeDetail"]))
PYEOF
