#!/bin/bash
cd /home/nolan/projects/ping-askfyd-gold
cat > tests/ask-fyd/dbg-ce.mts <<'MTS'
import { buildAskFydContext } from "@/fyd/ask/context-builder.js";
import { composeAskFyd } from "@/fyd/ask/answer.js";
// Exact shrunk counterexample shape from the failing run
const g: any = {"business":[{"title":"Test Business","visibility":"private","offers":"O","located_at":"L"}],"service":[],"location":[],"person":[]};
// Reconstruct: 8 services, 4 private
const services = ["0000","0000","0000","0000","0000","A000","0000","0000"].map((seed, i) => ({
  titleSeed: seed, visibility: [1,2,3,6].includes(i) ? "private" : "public", __i: i }));
const locVis = "private";
function mkObject(id: string, schema: string, title: string, visibility: string, fields: any): any {
  return { id, schema, controllerId: "identity_fyd_compiler_test", visibility, title,
    description: `${title} description.`, fields,
    createdAt: "2026-09-21T13:50:00Z", updatedAt: "2026-09-21T13:50:00Z",
    provenance: { kind: "website-derived", ref: "website-ingestion:https://example.com/", derivedAt: "2026-09-21T13:50:00Z" } };
}
const objects: any[] = [mkObject("test-business", "ping.social.business@1", "Test Business", "private", { phone: "970-245-3869", hours: "Mo-Fr 09:00-17:00" })];
const relationships: any[] = [];
services.forEach((s, i) => {
  const title = `Svc-${s.visibility === "private" ? "PRIV" : "PUB"}-${s.titleSeed}`;
  objects.push(mkObject(`test-svc-${i}`, "ping.social.service@1", title, s.visibility, {}));
  relationships.push({ id: `r${i}`, subject: "test-business", predicate: "offers", object: `test-svc-${i}`, status: "active", createdAt: "2026-09-21T13:50:00Z" });
});
objects.push(mkObject("test-loc-0", "ping.social.location@1", "Test City, TS", locVis, { address_locality: "Test City" }));
relationships.push({ id: "rl", subject: "test-business", predicate: "located_at", object: "test-loc-0", status: "active", createdAt: "2026-09-21T13:50:00Z" });
const business = objects[0];
const ctx: any = buildAskFydContext({ viewer: { id: "v", displayName: "V" }, target: business,
  relatedObjects: objects.slice(1), relationships, plan: null, grants: [], siteSpec: null,
  question: "Tell me about the business.", fieldVisibilityDecisions: [], fieldConflicts: [] } as any);
const answer = composeAskFyd(ctx, "Tell me about the business.");
console.log("ANSWER:", JSON.stringify(answer.answer));
for (const t of ["Test Business", "Test City, TS", "Svc-PRIV-0000"]) console.log(`contains ${JSON.stringify(t)}:`, answer.answer.includes(t));
MTS
npx tsx tests/ask-fyd/dbg-ce.mts 2>&1 | head -12
rm tests/ask-fyd/dbg-ce.mts
