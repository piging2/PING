#!/bin/bash
cd /home/nolan/projects/ping
cat > /home/nolan/projects/ping/scratch-lane-claim-probe.ts <<'EOF'
import { verifyBinding, verifySpecBindings, assertSpecBindingsVerified, buildVerifiedRenderModel, classifyRenderAtom, ownerAssertionsFromGraph } from "./src/fyd/sitespec/binding-verifier";
import { verifyPresentationBinding, resolveBoundField } from "./src/fyd/sitespec/graph";
import { makeObject, tradeGraph } from "./src/fyd/builder/__tests__/fixtures";
import type { ObjectGraph } from "./src/fyd/sitespec/types";

const G = tradeGraph();

// 1. derived with NO evidence at all
const ghost = makeObject("ghost", "ping.social.business@1", {
  title: "Ghost Co",
  fields: { yearsInBusiness: "47" },
  provenance: { kind: "website-derived", ref: "", derivedAt: "2026-09-21T00:00:00.000Z" },
});
const g1: ObjectGraph = { objects: [...G.objects, ghost], relationships: G.relationships };
const v1 = verifyBinding({ objectId: "ghost", field: "yearsInBusiness", classification: "derived" }, g1, []);
console.log("HOLE1 derived-no-evidence:", v1.status, v1.status === "BOUND" ? (v1 as any).source : (v1 as any).reason);
const a1 = classifyRenderAtom({ objectId: "ghost", field: "yearsInBusiness", classification: "derived" }, g1, []);
console.log("HOLE1 atom:", a1.classification, JSON.stringify(a1.evidenceRef));

// 2. generated with no evidence: assertSpecBindingsVerified vs buildVerifiedRenderModel
const gen = { objectId: "ghost", field: "title", classification: "generated" as const, generatorRef: "tagline-writer@1" };
try { assertSpecBindingsVerified([gen], g1, []); console.log("HOLE3 assertSpecBindingsVerified: PASSED (no throw)"); }
catch (e) { console.log("HOLE3 assertSpecBindingsVerified: THREW"); }
try { buildVerifiedRenderModel([gen], g1, [], { rendererVersion: "t@1" }); console.log("HOLE3 buildVerifiedRenderModel: no throw"); }
catch (e) { console.log("HOLE3 buildVerifiedRenderModel: THREW"); }

// 3. owner-corrected value bound as direct evidence
const owner = G.objects.find(o => o.id === "biz-trade")!;
const corrected = { ...owner, fields: { ...owner.fields, phone: "555-0199" }, ownerFieldCorrections: [{ field: "phone" as const, label: "Phone", sourceValue: "555-0100", ownerValue: "555-0199", correctedAt: "2026-09-20T00:00:00.000Z", actorLabel: "Demo", basis: "owner says", sourceDrifted: false }] };
const g3: ObjectGraph = { objects: G.objects.map(o => o.id === "biz-trade" ? corrected : o), relationships: G.relationships };
const v3 = verifyBinding({ objectId: "biz-trade", field: "phone", classification: "direct" }, g3, ownerAssertionsFromGraph(g3));
console.log("HOLE4 direct-on-owner-corrected:", v3.status, v3.status === "BOUND" ? (v3 as any).source + " value=" + (v3 as any).value : (v3 as any).reason);

// 4. render-path: owner_authored with NO assertion
const r4 = resolveBoundField(G, { objectId: "biz-trade", field: "phone", classification: "owner_authored" });
const v4 = verifyBinding({ objectId: "biz-trade", field: "phone", classification: "owner_authored" }, G, []);
console.log("HOLE2 render-path owner_authored no assertion: resolveBoundField ->", JSON.stringify(r4), "| verifyBinding ->", v4.status);

// 5. visibility private + direct
const priv = { ...owner, visibility: "private" as const };
const g5: ObjectGraph = { objects: G.objects.map(o => o.id === "biz-trade" ? priv : o), relationships: G.relationships };
const v5 = verifyBinding({ objectId: "biz-trade", field: "phone", classification: "direct" }, g5, []);
console.log("HOLE6 private-object direct:", v5.status, v5.status === "BOUND" ? (v5 as any).source : (v5 as any).reason);

// 6. binding.evidenceRef carrier ignored
const v6 = classifyRenderAtom({ objectId: "biz-trade", field: "title", classification: "direct", evidenceRef: "second-source:B" }, G, []);
console.log("HOLE10 carrier evidenceRef:", JSON.stringify((v6 as any).evidenceRef));

// 7. whitespace mismatch false positive
const g7 = g3; // corrected graph, assertion "555-0199"
const drifted = { ...corrected, fields: { ...corrected.fields, phone: "555-0199 " } };
const g7b: ObjectGraph = { objects: G.objects.map(o => o.id === "biz-trade" ? drifted : o), relationships: G.relationships };
const v7 = verifyBinding({ objectId: "biz-trade", field: "phone", classification: "owner_authored" }, g7b, ownerAssertionsFromGraph(g7b));
console.log("HOLE8 whitespace drift:", v7.status, v7.status === "UNBOUND" ? (v7 as any).reason : "");
EOF
npx tsx scratch-lane-claim-probe.ts
rm /home/nolan/projects/ping/scratch-lane-claim-probe.ts
