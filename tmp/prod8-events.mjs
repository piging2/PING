import { readFileSync } from "node:fs";

const j = JSON.parse(readFileSync("/home/nolan/projects/ping/data/fyd-owner/happy-place.json", "utf8"));
for (const e of j.events) {
  console.log(
    "seq", e.seq,
    "|", e.type,
    "|", e.target,
    "|", e.at,
    "| note:", (e.note ?? "").slice(0, 70),
  );
  if (e.target === "services:order") {
    console.log("    newValue:", JSON.stringify(e.newValue));
  }
}
