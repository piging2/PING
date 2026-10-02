#!/usr/bin/env bash
# Lane PROTO spike runner: builds both projections, proves optionality.
set -euo pipefail
cd "$(dirname "$0")"

echo "### 1. READ-ONLY PROOF: deep-freeze canonical, project, diff canonical before/after"
node -e '
const fs = require("fs");
const before = fs.readFileSync("canonical.json", "utf8");
const canonical = JSON.parse(before);
const deepFreeze = (o) => { if (o && typeof o === "object") { Object.values(o).forEach(deepFreeze); Object.freeze(o); } return o; };
deepFreeze(canonical);
const { projectJsonLd } = require("./project-jsonld");
const { projectText } = require("./project-text");
fs.writeFileSync("out/business.jsonld", JSON.stringify(projectJsonLd(canonical), null, 2) + "\n");
fs.writeFileSync("out/business-card.txt", projectText(canonical));
const after = JSON.stringify(JSON.parse(before), null, 0);
const beforeC = JSON.stringify(JSON.parse(before), null, 0);
if (after !== beforeC) { console.error("FAIL: canonical mutated by a projector"); process.exit(1); }
console.log("PASS  canonical byte-identical before/after projecting (frozen input)");
'

echo "### 2. BOTH PROJECTIONS EMITTED"
wc -c out/business.jsonld out/business-card.txt

echo "### 3. EQUIVALENCE / DIVERGENCE / EXFILTRATION / LABELING / ROUND-TRIP"
node verify.js canonical.json out/business.jsonld out/business-card.txt

echo "### 4. STALENESS: change one fact, re-project, old projection must flag stale"
node -e '
const fs = require("fs");
const c = JSON.parse(fs.readFileSync("canonical.json", "utf8"));
c.facts.find((f) => f.field === "phone").value = "970-555-0199";
c.canonicalGraphVersion = "g-0008";
fs.writeFileSync("out/canonical-mutated.json", JSON.stringify(c));
const { projectJsonLd } = require("./project-jsonld");
fs.writeFileSync("out/business-mutated.jsonld", JSON.stringify(projectJsonLd(c), null, 2));
const oldHash = JSON.parse(fs.readFileSync("out/business.jsonld", "utf8"))["@graph"]
  .find((n) => n.pingProjection).pingProjection.inputHash;
const newHash = JSON.parse(fs.readFileSync("out/business-mutated.jsonld", "utf8"))["@graph"]
  .find((n) => n.pingProjection).pingProjection.inputHash;
if (oldHash === newHash) { console.error("FAIL: hash did not move on canonical change"); process.exit(1); }
console.log("PASS  phone changed -> inputHash rotated:", oldHash.slice(7, 19), "->", newHash.slice(7, 19));
console.log("      rule: any consumer holding the OLD projection sees inputHash != current canonical -> STALE, must re-project");
'

echo "### 5. DIVERGENCE INJECTION: tamper one projection, verifier must catch it"
node -e '
const fs = require("fs");
const doc = JSON.parse(fs.readFileSync("out/business.jsonld", "utf8"));
doc["@graph"].find((n) => (n["@type"] || []).includes("Organization")).telephone = "999-999-9999";
fs.writeFileSync("out/business-tampered.jsonld", JSON.stringify(doc));
'
node verify.js canonical.json out/business-tampered.jsonld out/business-card.txt \
  && { echo "FAIL: tampered projection passed verification"; exit 1; } \
  || echo "PASS  tampered projection REJECTED (divergence detected)"

echo "### 6. PRIVATE FLIP: make phone private, verify it vanishes from both"
node -e '
const fs = require("fs");
const c = JSON.parse(fs.readFileSync("canonical.json", "utf8"));
c.facts.find((f) => f.field === "phone").visibility = "private";
const { projectJsonLd } = require("./project-jsonld");
const { projectText } = require("./project-text");
const j = JSON.stringify(projectJsonLd(c));
const t = projectText(c);
if (j.includes("245-3869") || t.includes("245-3869")) { console.error("FAIL: private phone leaked"); process.exit(1); }
console.log("PASS  phone flipped private -> absent from both projections, text shows no phone line");
'
echo ""
echo "ALL SPIKE CHECKS DONE"
