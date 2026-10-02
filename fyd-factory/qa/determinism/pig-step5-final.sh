#!/bin/bash
# QA-DET final checks: leak scan + generateSiteSpec determinism bonus.
set -e
cd /home/nolan/projects/ping || exit 1
echo "=== timestamp-like strings in canonical output (expect only the fixed asOf) ==="
grep -o '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}T[0-9:.-]*Z\?' /tmp/qa-det/out-a1.txt | sort | uniq -c
echo "=== uuid-v4-like patterns (expect none) ==="
grep -oiE '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}' /tmp/qa-det/out-a1.txt | head -5 || echo "none found"
echo "=== generateSiteSpec twice in fresh processes (bonus: planner-input determinism) ==="
cat > /tmp/qa-det/driver-gen.mts <<'MTS'
import { writeFileSync } from "node:fs";
import { generateSiteSpec } from "/home/nolan/projects/ping/src/fyd/proceduralize/generator.ts";
import { HAPPY_PLACE_GRAPH } from "/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/happy-place-graph.ts";
const spec = generateSiteSpec(HAPPY_PLACE_GRAPH, { generatedAt: "2026-09-21T13:50:00Z" });
writeFileSync(process.argv[2], JSON.stringify(spec), "utf8");
console.log("GENSPEC done");
MTS
CSS=./src/fyd/sitespec/__tests__/css-register.cjs
./node_modules/.bin/tsx --import "$CSS" /tmp/qa-det/driver-gen.mts /tmp/qa-det/spec-g1.json
./node_modules/.bin/tsx --import "$CSS" /tmp/qa-det/driver-gen.mts /tmp/qa-det/spec-g2.json
sha256sum /tmp/qa-det/spec-g1.json /tmp/qa-det/spec-g2.json
if cmp -s /tmp/qa-det/spec-g1.json /tmp/qa-det/spec-g2.json; then echo "GENSPEC: IDENTICAL"; else echo "GENSPEC: DIFFER"; fi
echo "=== repo state untouched check ==="
git status --porcelain | head -8
