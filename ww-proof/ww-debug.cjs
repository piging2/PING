const { answerVisitorQuestion } = require("/home/hatch/workspace/fyd-build/dist/src/fyd/ask/visitor.js");
const { WICKED_WRENCH_GRAPH } = require("/home/hatch/workspace/fyd-build/dist/src/fyd/proceduralize/__fixtures__/wicked-wrench-graph.js");
const { buildInputForSite } = require("/home/hatch/workspace/fyd-build/dist/src/fyd/ask/load-fixture.js");

const input = buildInputForSite(WICKED_WRENCH_GRAPH, "wicked-wrench", {
  question: "Where is this business located?",
  viewerMode: "visitor",
});
console.log("evidenceRefs count:", input.evidenceRefs.length);
for (const e of input.evidenceRefs) {
  console.log(" -", e.observationId, "| kind:", e.kind, "| ref:", e.ref);
}
console.log("target:", input.targetObject ? input.targetObject.id : "null");
if (input.targetObject) {
  console.log("target fields keys:", Object.keys(input.targetObject.fields).join(","));
}
