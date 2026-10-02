#!/bin/bash
cat > /tmp/diag2.ts <<'EOF'
import { answerConciergeQuestion, conciergeInputFor, CONCIERGE_QUESTIONS } from "/home/nolan/projects/ping/src/fyd/ask/concierge";
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
const hiddenSvc = mk({ id: "hid-svc-1", schema: "ping.social.service@1", title: "Hidden Service 1", description: "owner hid this", fields: { hiddenServiceName: "HID-SVC-i1-xyz" } }, "private");
objs.push(hiddenSvc);
const rels = f.graph.relationships.map((r: any) => ({ id: r.id, subject: r.subject, predicate: r.predicate, object: r.object, status: r.status, createdAt: "2026-09-23T00:00:00Z", evidenceRef: "fixture:synthetic" }));
rels.push({ id: "rel-h", subject: biz.id, predicate: "provides", object: hiddenSvc.id, status: "active", createdAt: "2026-09-23T00:00:00Z", evidenceRef: "fixture:synthetic" });
for (const q of [CONCIERGE_QUESTIONS[1].question, CONCIERGE_QUESTIONS[3].question]) {
  const ans = answerConciergeQuestion(conciergeInputFor("s", biz, objs, rels, q));
  console.log("Q:", q);
  for (const c of ans?.claims ?? []) console.log(`  [${c.grade}] ${c.text.slice(0,150)}`);
}
EOF
cd /home/nolan/projects/ping && ./node_modules/.bin/tsx /tmp/diag2.ts
