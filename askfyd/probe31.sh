#!/bin/bash
cd /home/nolan/projects/ping-askfyd-gold
cat > tests/ask-fyd/probe31.mts <<'MTS'
import { loadGoldSet, runGoldQuestion } from "./baseline.js";
const rec = loadGoldSet().find((r) => r.id === "ASK-031")!;
const run = runGoldQuestion(rec);
console.log("ANSWER:", run.answer.answer.slice(0, 500));
console.log("correction:", JSON.stringify(run.variantResult?.correction ?? run.variantResult, null, 1).slice(0, 600));
MTS
npx tsx tests/ask-fyd/probe31.mts 2>&1 | head -25
rm tests/ask-fyd/probe31.mts
