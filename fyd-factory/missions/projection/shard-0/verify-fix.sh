#!/bin/bash
cat > /tmp/verify-fix.ts <<'EOF'
import { answerConciergeQuestion, conciergeInputFor, CONCIERGE_QUESTIONS } from "/home/nolan/fyd-projection-harness/fyd/ask/concierge";
import * as fs from "node:fs";
const f = JSON.parse(fs.readFileSync("/home/nolan/fyd-fixtures-p0/batch-a/batch-a-hvac.json", "utf8"));
const mk = (o: any, vis: string) => ({
  id: o.id, schema: o.schema, controllerId: "x", visibility: vis,
  title: o.title ?? o.id, description: o.description ?? "",
  fields: Object.fromEntries(Object.entries(o.fields ?? {}).filter(([, v]) => typeof v === "string")),
  createdAt: "2026-09-23T00:00:00Z", updatedAt: "2026-09-23T00:00:00Z",
  provenance: { kind: "website-derived", ref: "fixture:synthetic", derivedAt: "2026-09-23T00:00:00Z" },
});
const objs = f.graph.objects.map((o: any) => mk(o, "public"));
const biz = objs.find((o: any) => o.schema.includes("business"));
const hiddenSvc = mk({ id: "hid-svc-1", schema: "ping.social.service@1", title: "Hidden Service 1", description: "owner hid this", fields: {} }, "private");
const hidPerson = mk({ id: "hid-p-1", schema: "ping.social.person@1", title: "Secret Employee", description: "internal", fields: {} }, "private");
objs.push(hiddenSvc, hidPerson);
const rels = f.graph.relationships.map((r: any) => ({ id: r.id, subject: r.subject, predicate: r.predicate, object: r.object, status: r.status, createdAt: "2026-09-23T00:00:00Z", evidenceRef: "fixture:synthetic" }));
rels.push({ id: "rel-h", subject: biz.id, predicate: "provides", object: hiddenSvc.id, status: "active", createdAt: "2026-09-23T00:00:00Z", evidenceRef: "fixture:synthetic" });
rels.push({ id: "rel-hp", subject: biz.id, predicate: "employs", object: hidPerson.id, status: "active", createdAt: "2026-09-23T00:00:00Z", evidenceRef: "fixture:synthetic" });
// 1. full-graph attack: hidden service + hidden person must NOT appear
let bad = 0;
for (const q of [CONCIERGE_QUESTIONS[1].question, CONCIERGE_QUESTIONS[3].question, CONCIERGE_QUESTIONS[2].question]) {
  const ans = answerConciergeQuestion(conciergeInputFor("s", biz, objs, rels, q));
  const t = JSON.stringify(ans);
  if (t.includes("Hidden Service 1") || t.includes("Secret Employee")) { console.log("STILL LEAKS:", q); bad++; }
}
console.log(bad === 0 ? "FIX VERIFIED: no non-public objects cited from full graph" : "FIX FAILED");
// 2. regression: public-only input still cites all public services
const pubObjs = objs.filter((o: any) => o.visibility === "public");
const pubRels = rels.filter((r: any) => r.object !== hiddenSvc.id && r.object !== hidPerson.id);
const ans2 = answerConciergeQuestion(conciergeInputFor("s", biz, pubObjs, pubRels, CONCIERGE_QUESTIONS[1].question));
const names = (ans2?.claims ?? []).map((c: any) => c.text);
console.log("public services cited:", names.length, "| includes Air Conditioner Installation:", names.some((t: string) => t.includes("Air Conditioner Installation")));
// 3. falsify: non-public target still answers about itself (caller-selected target is out of scope)
const ans3 = answerConciergeQuestion(conciergeInputFor("s", hiddenSvc, objs, rels, CONCIERGE_QUESTIONS[0].question));
console.log("non-public target answers about itself:", ans3 !== null && !ans3.refused ? "yes (caller choice, unchanged)" : "no");
EOF
cd /home/nolan/projects/ping && ./node_modules/.bin/tsx /tmp/verify-fix.ts
