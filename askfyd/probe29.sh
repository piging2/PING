#!/bin/bash
cd /home/nolan/projects/ping-askfyd-gold
cat > tests/ask-fyd/probe29.mts <<'MTS'
import { loadGoldSet, runGoldQuestion, scoreRun } from "./baseline.js";
for (const id of ["ASK-029","ASK-032"]) {
  const rec = loadGoldSet().find((r) => r.id === id)!;
  const run = runGoldQuestion(rec);
  const s = scoreRun(rec, run);
  console.log("=====", id);
  console.log(run.answer.answer.slice(0, 420));
  console.log("forbidden:", s.forbiddenHits);
}
MTS
npx tsx tests/ask-fyd/probe29.mts 2>&1 | head -24
rm tests/ask-fyd/probe29.mts
