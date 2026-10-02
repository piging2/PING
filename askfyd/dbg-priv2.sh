#!/bin/bash
cd /home/nolan/projects/ping-askfyd-gold
cat > tests/ask-fyd/dbg-priv2.mts <<'MTS'
import { buildAskFydContext } from "@/fyd/ask/context-builder.js";
import { composeAskFyd } from "@/fyd/ask/answer.js";
function mkObject(id: string, schema: string, title: string, visibility: string, fields: any): any {
  return { id, schema, controllerId: "identity_fyd_compiler_test", visibility, title,
    description: `${title} description.`, fields,
    createdAt: "2026-09-21T13:50:00Z", updatedAt: "2026-09-21T13:50:00Z",
    provenance: { kind: "website-derived", ref: "website-ingestion:https://example.com/", derivedAt: "2026-09-21T13:50:00Z" } };
}
const objects = [
  mkObject("test-business", "ping.social.business@1", "Test Business", "private", { phone: "970-245-3869", locality: "Test City, TS" }),
  mkObject("test-svc-0", "ping.social.service@1", "SvcvalueOf", "public", {}),
  mkObject("test-svc-1", "ping.social.service@1", "Svcvalu", "private", {}),
  mkObject("test-loc-0", "ping.social.location@1", "Test City, TS", "public", { address_locality: "Test City" }),
];
const relationships = [
  { id: "r0", subject: "test-business", predicate: "offers", object: "test-svc-0", status: "active", createdAt: "2026-09-21T13:50:00Z" },
  { id: "r1", subject: "test-business", predicate: "offers", object: "test-svc-1", status: "active", createdAt: "2026-09-21T13:50:00Z" },
  { id: "r2", subject: "test-business", predicate: "located_at", object: "test-loc-0", status: "active", createdAt: "2026-09-21T13:50:00Z" },
];
const business = objects[0];
const ctx: any = buildAskFydContext({ viewer: { id: "v", displayName: "V" }, target: business,
  relatedObjects: objects.slice(1), relationships, plan: null, grants: [], siteSpec: null,
  question: "Tell me about the business.", fieldVisibilityDecisions: [], fieldConflicts: [] } as any);
const answer = composeAskFyd(ctx, "Tell me about the business.");
console.log("ANSWER:", JSON.stringify(answer.answer.slice(0, 600)));
for (const t of ["Test Business", "Svcvalu"]) console.log(`contains ${JSON.stringify(t)}:`, answer.answer.includes(t));
MTS
npx tsx tests/ask-fyd/dbg-priv2.mts 2>&1 | head -10
rm tests/ask-fyd/dbg-priv2.mts
