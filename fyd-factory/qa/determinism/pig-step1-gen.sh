#!/bin/bash
# QA-DET step 1: freeze fixtures on the Pig. Self-contained; driver written to Pig /tmp.
set -e
cd /home/nolan/projects/ping || exit 1
mkdir -p /tmp/qa-det
cat > /tmp/qa-det/gen-inputs.mts <<'MTS'
// QA-DET fixture generator. Freezes spec+graph+viewer inputs to JSON.
import { writeFileSync } from "node:fs";
import { generateSiteSpec } from "/home/nolan/projects/ping/src/fyd/proceduralize/generator.ts";
import { HAPPY_PLACE_GRAPH } from "/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/happy-place-graph.ts";
import { COPPERSMITH_GRAPH } from "/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts";

const FIXED = "2026-09-21T13:50:00Z";
const DTV = "tokens@qa-det-1";
const OUT = "/tmp/qa-det";

function makeInput(graph: any, tag: string) {
  const spec = generateSiteSpec(graph, { generatedAt: FIXED });
  const input = {
    spec,
    graph,
    viewer: { viewerId: null, displayName: null },
    asOf: FIXED,
    designTokenVersion: DTV,
  };
  writeFileSync(`${OUT}/input-${tag}.json`, JSON.stringify(input), "utf8");
  console.log(
    `input-${tag}.json: pages=${spec.pages.length} sections=${spec.pages.reduce((n: number, p: any) => n + p.sections.length, 0)} objects=${graph.objects.length} ownerObjectId=${spec.ownerObjectId}`,
  );
}

makeInput(HAPPY_PLACE_GRAPH, "a");
makeInput(COPPERSMITH_GRAPH, "b");
console.log("GEN-OK");
MTS
./node_modules/.bin/tsx --import ./src/fyd/sitespec/__tests__/css-register.cjs /tmp/qa-det/gen-inputs.mts
ls -la /tmp/qa-det/
sha256sum /tmp/qa-det/input-a.json /tmp/qa-det/input-b.json
