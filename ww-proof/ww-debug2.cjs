const { buildInputForSite } = require("/home/hatch/workspace/fyd-build/dist/src/fyd/ask/load-fixture.js");
const { buildAskFydContext } = require("/home/hatch/workspace/fyd-build/dist/src/fyd/ask/context-builder.js");
const { WICKED_WRENCH_GRAPH } = require("/home/hatch/workspace/fyd-build/dist/src/fyd/proceduralize/__fixtures__/wicked-wrench-graph.js");

const input = buildInputForSite(WICKED_WRENCH_GRAPH, "wicked-wrench", {
  question: "Where is this business located?",
  viewerMode: "visitor",
});
const ctx = buildAskFydContext(input);
console.log("ctx.targetObject:", ctx.targetObject ? ctx.targetObject.id : "null");
if (ctx.targetObject) {
  console.log("ctx target address:", ctx.targetObject.fields["address"]);
}
console.log("ctx.evidenceRefs count:", ctx.evidenceRefs.length);
// Simulate findEvidence
const target = ctx.targetObject;
const rawRef = typeof target.fields["evidence_ref"] === "string" ? target.fields["evidence_ref"] : null;
console.log("rawRef:", rawRef);
const tail = "business-fields";
for (const e of ctx.evidenceRefs) {
  if (e.observationId && e.observationId.endsWith("-" + tail)) {
    console.log("MATCH:", e.observationId, e.kind);
  }
}
