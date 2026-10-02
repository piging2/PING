#!/bin/bash
# QA-DET: locale variance + input-order permutation checks.
set -e
cd /home/nolan/projects/ping || exit 1
CSS=./src/fyd/sitespec/__tests__/css-register.cjs
PROBE=src/fyd/sitespec/__tests__/determinism-probe.ts
echo "=== locale runs (exp-L) ==="
for loc in C en_US.UTF-8 de_DE.UTF-8; do
  if LC_ALL=$loc LANG=$loc ./node_modules/.bin/tsx --import "$CSS" "$PROBE" /tmp/qa-det/input-a.json /tmp/qa-det/out-locale-$loc.txt 2>/tmp/qa-det/locale-$loc.err; then
    echo "$loc: ok"
  else
    echo "$loc: FAILED"; head -3 /tmp/qa-det/locale-$loc.err
  fi
done
sha256sum /tmp/qa-det/out-locale-*.txt 2>/dev/null || true
cat > /tmp/qa-det/driver-order.mts <<'MTS'
// Permute input order: reversed objects array, reversed relationships array.
import { readFileSync, writeFileSync } from "node:fs";
import { buildSemanticRenderModel, canonicalizeModel } from "/home/nolan/projects/ping/src/fyd/sitespec/render-model.ts";
const OUT = "/tmp/qa-det";
const input = JSON.parse(readFileSync(`${OUT}/input-a.json`, "utf8"));
function build(inp: any) {
  return canonicalizeModel(buildSemanticRenderModel(inp.spec, inp.graph, inp.viewer, {
    asOf: inp.asOf, designTokenVersion: inp.designTokenVersion,
  }));
}
// perm-1: reversed objects array
const p1 = JSON.parse(JSON.stringify(input));
p1.graph.objects.reverse();
// perm-2: reversed relationships array
const p2 = JSON.parse(JSON.stringify(input));
p2.graph.relationships.reverse();
// perm-3: reversed sections within each page (spec order IS significant; expect DIFFER)
const p3 = JSON.parse(JSON.stringify(input));
for (const pg of p3.spec.pages) pg.sections.reverse();
writeFileSync(`${OUT}/out-perm1.txt`, build(p1), "utf8");
writeFileSync(`${OUT}/out-perm2.txt`, build(p2), "utf8");
writeFileSync(`${OUT}/out-perm3.txt`, build(p3), "utf8");
console.log("PERM done");
MTS
./node_modules/.bin/tsx --import "$CSS" /tmp/qa-det/driver-order.mts
echo "=== sha256 perm outputs vs baseline ==="
sha256sum /tmp/qa-det/out-a1.txt /tmp/qa-det/out-perm1.txt /tmp/qa-det/out-perm2.txt /tmp/qa-det/out-perm3.txt
echo "=== semantic content of baseline ==="
cat /tmp/qa-det/out-a1.txt | head -c 3000
