#!/bin/bash
set -u
cd /home/nolan/projects/ping
cat > /tmp/laneg-probe.test.ts <<'EOF'
import { HAPPY_PLACE_GRAPH } from "./src/fyd/proceduralize/__fixtures__/happy-place-graph";
import { compileAskContext, verifyAnswerClaims } from "./src/fyd/ask/context-compiler";

test("probe", () => {
  const loc = HAPPY_PLACE_GRAPH.objects.find((o) => o.id.endsWith("-location"))!;
  console.log("loc field keys:", Object.keys(loc.fields ?? {}));
  const p = compileAskContext({
    question: "Where are you located?",
    viewer: { id: null, tier: "visitor", grants: [] },
    siteId: "happy-place",
    graph: HAPPY_PLACE_GRAPH,
    graphDigest: "x",
    ownerId: null,
  });
  const locEvs = p.evidence.filter((e) => e.objectId === loc.id).map((e) => e.evidenceId);
  console.log("loc evidence:", JSON.stringify(locEvs));
  const v = verifyAnswerClaims(p, [
    { text: "in Adair Village", grade: "SUPPORTED", evidenceRefIds: [`field:${loc.id}:title`] },
  ]);
  console.log("violations:", JSON.stringify(v.violations));
});
EOF
cp /tmp/laneg-probe.test.ts src/fyd/ask/__tests__/zz-probe.test.ts
npx jest --config src/fyd/ask/jest.config.cjs src/fyd/ask/__tests__/zz-probe.test.ts 2>&1 | grep -A6 "console.log\|loc field\|loc evidence\|violations" | head -20
rm src/fyd/ask/__tests__/zz-probe.test.ts
