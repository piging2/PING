import { readFileSync } from "node:fs";
import { compileAskContext } from "./context-compiler.mjs";

const FIX = JSON.parse(readFileSync(new URL("../../../fyd-factory/corpus/fixtures/clearwater-plumbing-demo.json", import.meta.url), "utf8"));
const p = compileAskContext({
  question: "What services do you offer?",
  viewer: { id: null, tier: "visitor", grants: [] },
  siteId: "clearwater-plumbing-demo",
  objectId: null,
  graph: FIX.graph,
  graphDigest: "synthetic",
  ownerId: "owner-1",
});
console.log("question:", p.question);
console.log("intents:", p.questionIntents.join(","));
console.log("target:", p.targetId, "| tier:", p.viewerTier);
console.log("packetId:", p.packetId);
console.log("\nobjects (id | schema | score | why):");
for (const o of p.objects) console.log(`  ${o.id} | ${o.schema} | ${o.relevance.score} | ${o.relevance.why.join(";")}`);
console.log("\nrelationships:", p.relationships.length, "| evidence entries:", p.evidence.length);
console.log("rulesApplied:", p.visibility.rulesApplied.join(","));
console.log("excluded:", p.visibility.excluded.length);
console.log("unknowns:", JSON.stringify(p.unknowns));
console.log("\nsample evidence:", JSON.stringify(p.evidence.slice(0, 3), null, 1).slice(0, 600));
