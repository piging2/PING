import { readFileSync } from "node:fs";

const g = JSON.parse(readFileSync("/home/nolan/ping/var/fyd-projections/happy-place.json", "utf8"));
console.log("top-level keys:", Object.keys(g).join(", "));
const str = JSON.stringify(g);
console.log("bytes:", str.length);
for (const k of Object.keys(g)) {
  const v = g[k];
  console.log(k, "->", Array.isArray(v) ? `array[${v.length}]` : typeof v);
}
