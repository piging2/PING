#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
cat > /tmp/lane-e-verify.ts <<'TSEOF'
import { eligibleComponents, SCHEMA_ROLES, schemaRole } from "/home/nolan/projects/ping/src/fyd/sitespec/schemas";
import { componentForSchema, componentsForSchema, listComponentDefs } from "/home/nolan/projects/ping/src/fyd/components/registry";

let failures = 0;
function eq(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) { failures++; console.log(`FAIL ${label}\n  actual:   ${a}\n  expected: ${e}`); }
  else console.log(`ok ${label}`);
}
function has(list: string[], item: string, label: string) {
  if (!list.includes(item)) { failures++; console.log(`FAIL ${label}: missing ${item} in ${JSON.stringify(list)}`); }
  else console.log(`ok ${label}`);
}

// --- pre-existing expectations (unchanged by convergence) ---
has(eligibleComponents("ping.social.business@1"), "Hero", "business has Hero");
has(eligibleComponents("ping.social.service@1"), "Services", "service has Services");
has(eligibleComponents("ping.social.post@1"), "ObjectFeed", "post has ObjectFeed");
eq(eligibleComponents("ping.social.mystery@9"), ["GenericObjectCard"], "unknown -> fallback");
eq(componentForSchema("ping.social.service@1"), "Services", "cfs service");
eq(componentForSchema("ping.social.mystery@9"), "GenericObjectCard", "cfs unknown");
has(eligibleComponents("ping.knowledge.business@1"), "Hero", "k-business has Hero");
has(eligibleComponents("ping.knowledge.service@1"), "Services", "k-service has Services");
has(eligibleComponents("ping.knowledge.location@1"), "Locations", "k-location has Locations");
has(eligibleComponents("ping.knowledge.person@1"), "People", "k-person has People");
eq(componentForSchema("ping.knowledge.service@1"), "Services", "cfs k-service");
eq(componentForSchema("ping.knowledge.business@1"), "Hero", "cfs k-business");
eq(componentForSchema("ping.knowledge.website@1"), "ObjectGrid", "cfs k-website");
eq(componentForSchema("ping.knowledge.post@1"), "Posts", "cfs k-post");
eq(componentForSchema("ping.knowledge.article@1"), "Posts", "cfs k-article");
eq(componentForSchema("ping.knowledge.location@1"), "Locations", "cfs k-location");
eq(componentForSchema("ping.knowledge.person@1"), "People", "cfs k-person");
has(eligibleComponents("ping.knowledge.post@1"), "RecentObjects", "k-post has RecentObjects");
has(eligibleComponents("ping.knowledge.article@1"), "Posts", "k-article has Posts");
eq(schemaRole("ping.knowledge.website@1"), null, "website has no role");
eq(SCHEMA_ROLES.business, ["ping.social.business@1", "ping.knowledge.business@1"], "roles re-export intact");
// explorePage gate: ObjectFeed membership for feed schemas
for (const s of ["ping.social.post@1","ping.social.article@1","ping.social.service@1"]) {
  has(eligibleComponents(s), "ObjectFeed", `explore gate ${s}`);
}
if (eligibleComponents("ping.social.business@1").includes("ObjectFeed")) { failures++; console.log("FAIL business must not be feed-eligible (converged)"); }
else console.log("ok business not feed-eligible (converged)");

// --- converged truth (drift fixed) ---
eq(eligibleComponents("ping.knowledge.website@1"), ["ObjectGrid","ObjectFeed","ObjectRail"], "website converged");
eq(eligibleComponents("ping.social.business@1"),
  ["Hero","IdentityCard","BusinessSummary","ObjectGrid","RecentObjects","Contact","Links","SocialProof","CTA","AskFYD","ObjectRail"],
  "business full pin");
has(eligibleComponents("ping.social.service@1"), "RecentObjects", "service gains RecentObjects");
has(eligibleComponents("ping.social.location@1"), "ObjectRail", "location gains ObjectRail");

// --- single-source invariant across probe set ---
const probe = ["ping.social.business@1","ping.social.service@1","ping.social.product@1",
  "ping.social.location@1","ping.social.person@1","ping.social.post@1","ping.social.article@1",
  "ping.knowledge.business@1","ping.knowledge.service@1","ping.knowledge.location@1",
  "ping.knowledge.person@1","ping.knowledge.post@1","ping.knowledge.article@1",
  "ping.knowledge.website@1","ping.social.mystery@9"];
for (const s of probe) {
  const all = eligibleComponents(s);
  const dedicated = all.filter((n) => n !== "GenericObjectCard");
  const expected = dedicated.length > 0 ? dedicated[0] : "GenericObjectCard";
  if (componentForSchema(s) !== expected) { failures++; console.log(`FAIL invariant ${s}`); }
  if (JSON.stringify(all) !== JSON.stringify(componentsForSchema(s))) { failures++; console.log(`FAIL parity ${s}`); }
}
console.log("invariant sweep ok");

// --- every non-empty acceptsSchemas entry is covered by the inversion ---
for (const d of listComponentDefs()) {
  for (const s of d.acceptsSchemas) {
    if (!eligibleComponents(s).includes(d.name)) { failures++; console.log(`FAIL coverage ${d.name} not eligible for ${s}`); }
  }
}
console.log("coverage ok");

console.log(failures === 0 ? "ALL VERIFY PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
TSEOF
echo "=== run 1: import schemas first ==="
npx tsx /tmp/lane-e-verify.ts 2>&1 | tail -15
