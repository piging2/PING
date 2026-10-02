#!/bin/bash
cd /home/nolan/projects/ping-askfyd-gold
cat > tests/ask-fyd/probe-drop.mts <<'MTS'
import { loadGoldSet, runGoldQuestion, scoreRun } from "./baseline.js";
const base = loadGoldSet().find((r) => r.id === "ASK-001")!;
const rec: any = { ...base, id: "PROBE-DROP", question: "What services does this business offer?",
  variant: { kind: "drop-schema", schema: "ping.social.service@1" } };
const run = runGoldQuestion(rec);
const s = scoreRun(rec, run);
console.log("ANSWER:", run.answer.answer.slice(0, 400));
console.log("supportRate:", s.supportRate, "forbidden:", s.forbiddenHits);
console.log("claims:", JSON.stringify(run.claimClassifications.map((c:any)=>({text:c.text?.slice(0,60), refs:c.evidenceRefIds})), null, 1).slice(0, 500));
MTS
npx tsx tests/ask-fyd/probe-drop.mts 2>&1 | head -20
rm tests/ask-fyd/probe-drop.mts
