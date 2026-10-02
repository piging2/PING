// debug.ts: run one world, dump phone-related HTML for verify diagnosis.
import {
  worldParams, stageSource, stageObservation, stageEvidence, stageObjects,
  stageRelationships, stageOwnerIntent, stageProjection, stageSiteSpec, stageRender,
} from "/home/nolan/shard1/harness";

const i = parseInt(process.env.DBG_I ?? "501", 10);
const p = worldParams(i);
const src = stageSource(p);
const obs = stageObservation(p, src);
const ev = stageEvidence(p, obs);
const { objects, ownerId } = stageObjects(p, src, ev);
const rels = stageRelationships(p, objects, ownerId);
const intent = stageOwnerIntent(p, objects, rels);
const graph = stageProjection(intent);
const { spec } = stageSiteSpec(graph);
const pages = stageRender(p, spec, graph);
const allHtml = pages.map((x) => x.html).join("\n");
console.log("world", i, "ownerIntent", p.ownerIntent);
console.log("sourcePhone", intent.sourcePhone, "ownerPhone", intent.ownerPhone);
console.log("--- tel: hrefs ---");
for (const m of allHtml.matchAll(/href="tel:([^"]*)"/gi)) console.log(" ", m[0]);
console.log("--- source phone occurrences ---");
let k = 0;
for (const m of allHtml.matchAll(/\(555\) 01\d\d/g)) { if (k < 12) console.log(" ", JSON.stringify(m[0]), "ctx:", JSON.stringify(allHtml.slice(Math.max(0, (m as any).index - 90), (m as any).index + 40))); k++; }
console.log("total (555) 01XX occurrences:", k);
if (intent.hiddenObject) {
  const t = intent.hiddenObject.title;
  console.log("hidden title:", JSON.stringify(t));
  let j = 0;
  for (const m of allHtml.matchAll(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))) { if (j < 4) console.log("  leak ctx:", JSON.stringify(allHtml.slice(Math.max(0, (m as any).index - 80), (m as any).index + 80))); j++; }
  console.log("hidden title occurrences:", j);
}
