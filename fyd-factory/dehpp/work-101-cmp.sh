#!/bin/bash
python3 - <<'PYEOF'
import json
golden = json.load(open("/home/hatch/workspace/fyd-factory/golden/evidence/hpp-composed-spec.json"))
replay = json.load(open("/tmp/dehpp/dehpp-spec.json")) if False else None
PYEOF
echo "--- sizes ---"
wc -c ~/workspace/fyd-factory/golden/evidence/hpp-composed-spec.json
echo "replay is on the Pig; copying for comparison"
