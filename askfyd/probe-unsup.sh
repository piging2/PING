#!/bin/bash
cd /home/nolan/projects/ping-askfyd-gold
cat > tests/ask-fyd/probe-unsup.mts <<'MTS'
import { loadGoldSet, runGoldQuestion } from "./baseline.js";
for (const id of ["ASK-013","ASK-016"]) {
  const rec = loadGoldSet().find((r) => r.id === id)!;
  const run = runGoldQuestion(rec);
  console.log("=====", id);
  console.log(run.answer.answer.slice(0, 350).replace(/\n/g, " | "));
  console.log("claims:", run.claimClassifications.length, "class:", run.claimClassifications.map(c=>c.classification).join(","));
}
MTS
npx tsx tests/ask-fyd/probe-unsup.mts 2>&1 | head -12
rm tests/ask-fyd/probe-unsup.mts
