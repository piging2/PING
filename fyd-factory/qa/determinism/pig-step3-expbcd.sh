#!/bin/bash
# QA-DET experiments (b), (c), (d). Each experiment runs in its own fresh process.
set -e
cd /home/nolan/projects/ping || exit 1
cat > /tmp/qa-det/driver-bcd.mts <<'MTS'
// QA-DET driver for experiments b/c/d. argv[2]: "b" | "c" | "d".
import { readFileSync, writeFileSync } from "node:fs";
import { buildSemanticRenderModel, canonicalizeModel } from "/home/nolan/projects/ping/src/fyd/sitespec/render-model.ts";

const OUT = "/tmp/qa-det";
const mode = process.argv[2];
const inputA = JSON.parse(readFileSync(`${OUT}/input-a.json`, "utf8"));
const inputB = JSON.parse(readFileSync(`${OUT}/input-b.json`, "utf8"));

function build(tag: "a" | "b") {
  const input = tag === "a" ? inputA : inputB;
  const model = buildSemanticRenderModel(input.spec, input.graph, input.viewer, {
    asOf: input.asOf,
    designTokenVersion: input.designTokenVersion,
    ownerOverrides: input.ownerOverrides,
  });
  return canonicalizeModel(model);
}

async function pollute() {
  // Simulate "other tests ran first": import + exercise neighboring fyd modules.
  const gen = await import("/home/nolan/projects/ping/src/fyd/proceduralize/generator.ts");
  const dims = await import("/home/nolan/projects/ping/src/fyd/builder/dimensions.ts");
  const canon = await import("/home/nolan/projects/ping/src/fyd/builder/canonical.ts");
  const elig = await import("/home/nolan/projects/ping/src/fyd/builder/eligibility.ts");
  const oi = await import("/home/nolan/projects/ping/src/fyd/builder/owner-intent.ts");
  const conf = await import("/home/nolan/projects/ping/src/fyd/builder/confidence.ts");
  const bv = await import("/home/nolan/projects/ping/src/fyd/sitespec/binding-verifier.ts");
  const sel = await import("/home/nolan/projects/ping/src/fyd/media/select.ts");
  const reg = await import("/home/nolan/projects/ping/src/fyd/components/registry.ts");
  const strat = await import("/home/nolan/projects/ping/src/fyd/builder/strategies.ts");
  const planner = await import("/home/nolan/projects/ping/src/fyd/builder/planner.ts");
  // Exercise: regenerate the OTHER customer's spec (registry + generator warm).
  const specB = gen.generateSiteSpec(inputB.graph, { generatedAt: inputB.asOf });
  void canon.semanticDigestOf(canon.canonicalizeSpec(specB));
  void dims.nearestPresetName(dims.quantizeVector(dims.PING_DOGFOOD_VECTOR));
  void dims.policyForVector(dims.COPPERSMITH_VECTOR);
  void elig.deriveEligibility(inputB.graph as any);
  void oi.normalizeOwnerIntent(null);
  void conf.presentationConfidenceFor("hero" as any, 0.9 as any);
  void bv.buildVerifiedRenderModel([], inputB.graph, [], { rendererVersion: "qa-det" });
  void reg.COMPONENT_REGISTRY_VERSION;
  void planner.SITE_PLANNER_VERSION;
  void strat;
  void sel;
}

if (mode === "b") {
  await pollute();
  writeFileSync(`${OUT}/out-b.txt`, build("a"), "utf8");
  console.log("EXP-B done");
} else if (mode === "c") {
  const bFirst = build("b");
  writeFileSync(`${OUT}/out-c-b.txt`, bFirst, "utf8");
  const aAfter = build("a");
  writeFileSync(`${OUT}/out-c-a.txt`, aAfter, "utf8");
  console.log("EXP-C done");
} else if (mode === "d") {
  const runs: string[] = [];
  for (let i = 0; i < 5; i++) runs.push(build("a"));
  runs.forEach((r, i) => writeFileSync(`${OUT}/out-d-${i + 1}.txt`, r, "utf8"));
  console.log("EXP-D done");
} else {
  console.error("unknown mode");
  process.exit(1);
}
MTS
CSS=./src/fyd/sitespec/__tests__/css-register.cjs
./node_modules/.bin/tsx --import "$CSS" /tmp/qa-det/driver-bcd.mts b
./node_modules/.bin/tsx --import "$CSS" /tmp/qa-det/driver-bcd.mts c
./node_modules/.bin/tsx --import "$CSS" /tmp/qa-det/driver-bcd.mts d
echo "=== sha256 of all outputs ==="
sha256sum /tmp/qa-det/out-a1.txt /tmp/qa-det/out-a2.txt /tmp/qa-det/out-b.txt /tmp/qa-det/out-c-a.txt /tmp/qa-det/out-c-b.txt /tmp/qa-det/out-d-1.txt /tmp/qa-det/out-d-2.txt /tmp/qa-det/out-d-3.txt /tmp/qa-det/out-d-4.txt /tmp/qa-det/out-d-5.txt
echo "=== comparisons ==="
for f in out-a2.txt out-b.txt out-c-a.txt out-d-1.txt out-d-2.txt out-d-3.txt out-d-4.txt out-d-5.txt; do
  if cmp -s /tmp/qa-det/out-a1.txt /tmp/qa-det/$f; then echo "$f == out-a1.txt"; else echo "$f DIFFERS from out-a1.txt"; fi
done
