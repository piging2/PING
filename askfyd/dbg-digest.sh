#!/bin/bash
cd /home/nolan/projects/ping-askfyd-gold
cat > tests/ask-fyd/dbg-digest.mts <<'MTS'
import { loadGoldDoc, runGoldQuestion, runDigest } from "./baseline.js";
const gold = loadGoldDoc().questions;
for (const id of ["ASK-001", "ASK-031", "ASK-029", "ASK-032", "ASK-014"]) {
  const rec = gold.find((r: any) => r.id === id)!;
  const d1 = runDigest(rec, runGoldQuestion(rec));
  const d2 = runDigest(rec, runGoldQuestion(rec));
  console.log(id, d1 === d2 ? "STABLE" : "UNSTABLE", d1.slice(0, 12));
}
MTS
npx tsx tests/ask-fyd/dbg-digest.mts 2>&1 | head -8
rm tests/ask-fyd/dbg-digest.mts
