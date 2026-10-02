#!/bin/bash
cat > /tmp/diag.ts <<'EOF'
import { answerConciergeQuestion, conciergeInputFor, CONCIERGE_QUESTIONS } from "/home/nolan/projects/ping/src/fyd/ask/concierge";
import * as fs from "node:fs";
const f = JSON.parse(fs.readFileSync("/home/nolan/fyd-fixtures-p0/batch-a/batch-a-hvac.json", "utf8"));
const objs = f.graph.objects.map((o: any) => ({
  id: o.id, schema: o.schema, controllerId: "x", visibility: "private",
  title: o.title ?? o.id, description: o.description ?? "",
  fields: Object.fromEntries(Object.entries(o.fields ?? {}).filter(([, v]) => typeof v === "string")),
  createdAt: "2026-09-23T00:00:00Z", updatedAt: "2026-09-23T00:00:00Z",
  provenance: { kind: "website-derived", ref: "fixture:synthetic", derivedAt: "2026-09-23T00:00:00Z" },
}));
const biz = objs.find((o: any) => o.schema.includes("business")) ?? objs[0];
// simulate injected private bits
biz.description += " Internal ref PX-PRIVATE-NOTE-i1-abc123.";
biz.fields["internalCostRate"] = "PX-PRIVATE-RATE-i1-abc123";
const priv = objs[0];
const ans = answerConciergeQuestion(conciergeInputFor("s", biz, objs, [], CONCIERGE_QUESTIONS[0].question));
console.log("refused:", ans?.refused);
for (const c of ans?.claims ?? []) console.log(`[${c.grade}] ${c.text.slice(0,160)}`);
console.log("TEXT:", (ans?.text ?? "").slice(0, 500));
EOF
cd /home/nolan/projects/ping && ./node_modules/.bin/tsx /tmp/diag.ts
