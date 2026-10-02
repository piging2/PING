import { readFileSync } from "node:fs";

const g = JSON.parse(readFileSync("/home/nolan/ping/var/fyd-projections/happy-place.json", "utf8")).graph;
const objs = g.objects ?? [];
console.log("object count:", objs.length);
for (const o of objs) {
  console.log(" -", o.id, "| schema:", o.schema, "| vis:", o.visibility, "| title:", (o.title ?? "").slice(0, 40));
}
const rels = g.relationships ?? [];
console.log("rels:", rels.length, "| predicates:", [...new Set(rels.map((r) => r.predicate))].join(", "));
for (const r of rels.slice(0, 20)) {
  console.log(" rel:", r.subject, r.predicate, "->", r.object, r.status);
}
