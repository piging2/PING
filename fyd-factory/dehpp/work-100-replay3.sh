#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
python3 - <<'PYEOF'
p = "/tmp/dehpp/replay-dehpp.ts"
src = open(p).read()
old = """import { composeSite } from "@/app/sites/_shared/compose-site";
import { HAPPY_PLACE_COMPOSITION } from "@/app/sites/happy-place/composition";
import { isRenderable } from "@/fyd/sitespec/validator";

async function main() {
  const site = await composeSite(HAPPY_PLACE_COMPOSITION);"""
new = """import { composeSite } from "@/app/sites/_shared/compose-site";
import {
  HAPPY_PLACE_CATEGORY,
  HAPPY_PLACE_COMPOSITION,
  HAPPY_PLACE_TENANT_ID,
} from "@/app/sites/happy-place/composition";
import { isRenderable } from "@/fyd/sitespec/validator";

async function main() {
  const site = await composeSite({
    tenantId: HAPPY_PLACE_TENANT_ID,
    category: HAPPY_PLACE_CATEGORY,
    compositionRecord: HAPPY_PLACE_COMPOSITION,
  });"""
assert src.count(old) == 1
open(p, "w").write(src.replace(old, new))
print("replay fixed")
PYEOF
export FYD_PROJECTION_DIR=/home/nolan/ping/var/fyd-projections
export FYD_OWNER_DIR=/home/nolan/projects/ping/data/fyd-owner
export FYD_CHROME_MODE=customer
node_modules/.bin/tsx --tsconfig tsconfig.json /tmp/dehpp/replay-dehpp.ts > /tmp/dehpp/dehpp-spec.json 2>/tmp/dehpp/replay.err
echo "exit=$?"
wc -c /tmp/dehpp/dehpp-spec.json
head -c 300 /tmp/dehpp/replay.err