import { readFileSync } from "node:fs";

const g = JSON.parse(readFileSync("/home/nolan/ping/var/fyd-projections/happy-place.json", "utf8"));
const objs = g.objects ?? [];
console.log("object count:", objs.length);
const svcObjs = objs.filter((o) => /service/i.test(o.schema ?? "") || /service/i.test(o.type ?? ""));
console.log("service-ish objects:", svcObjs.length);
for (const o of svcObjs.slice(0, 30)) {
  console.log(" -", o.id, "|", o.title ?? "", "| schema:", o.schema, "| vis:", o.visibility);
}
const rels = g.relationships ?? [];
console.log("relationship count:", rels.length);
console.log("predicates:", [...new Set(rels.map((r) => r.predicate))].join(", "));

const j = JSON.parse(readFileSync("/home/nolan/projects/ping/data/fyd-owner/happy-place.json", "utf8"));
const seq12 = j.events.find((e) => e.seq === 12);
console.log("seq12 target:", seq12.target, "newValue:", JSON.stringify(seq12.newValue));
