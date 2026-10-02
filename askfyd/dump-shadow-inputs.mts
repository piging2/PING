/**
 * Dump deterministic baseline runs for the JEV shadow lane.
 *
 * Usage: npx tsx tests/ask-fyd/dump-shadow-inputs.mts
 * Writes: tests/ask-fyd/shadow-inputs.json
 *
 * The shadow set is BOUNDED: 24 choice questions + 6 score questions,
 * each producing exactly one jev_ask.py invocation => 30 live JEV calls
 * total, within the 60-call budget recorded in the lane header.
 *
 * Privacy rule: only PROJECTED (public, post-FYD-010) candidate evidence
 * labels are dumped. Hidden/coarsened fields never appear in the
 * instructions a JEV call would see.
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadGoldSet, runGoldQuestion } from "./baseline.js";

const HERE = dirname(fileURLToPath(import.meta.url));

const CHOICE_IDS = [
  "ASK-001", "ASK-002", "ASK-003", "ASK-004", "ASK-005", "ASK-006",
  "ASK-007", "ASK-008", "ASK-009", "ASK-010", "ASK-011", "ASK-012",
  "ASK-017", "ASK-018", "ASK-019", "ASK-020",
  "ASK-021", "ASK-022", "ASK-023", "ASK-024",
  "ASK-029", "ASK-030", "ASK-031", "ASK-032",
];
const SCORE_IDS = ["ASK-001", "ASK-005", "ASK-009", "ASK-010", "ASK-022", "ASK-029"];

const records = loadGoldSet();
const out: unknown[] = [];

for (const id of [...CHOICE_IDS, ...SCORE_IDS]) {
  const rec = records.find((r) => r.id === id);
  if (!rec) throw new Error(`missing gold record ${id}`);
  const run = runGoldQuestion(rec);
  const ids = run.candidateEvidenceIds;
  const labels = run.candidateEvidenceLabels;
  const criteria: Record<string, string> = {};
  ids.slice(0, 10).forEach((evId, i) => {
    criteria[evId] = labels[i] ?? evId;
  });
  const digest = createHash("sha256").update(ids.join("|")).digest("hex").slice(0, 16);
  out.push({
    questionId: id,
    phase: CHOICE_IDS.includes(id) && SCORE_IDS.includes(id) ? "choice+score" : CHOICE_IDS.includes(id) ? "choice" : "score",
    question: rec.question,
    business: rec.business,
    variant: rec.variant,
    baselineTopEvidenceId: ids[0] ?? null,
    baselineTopEvidenceLabel: labels[0] ?? null,
    candidateCriteria: criteria,
    candidatesDigest: digest,
    baselineAnswerPreview: run.answer.answer.slice(0, 300),
  });
}

writeFileSync(join(HERE, "shadow-inputs.json"), JSON.stringify({ generated: new Date().toISOString(), items: out }, null, 2));
console.log(`wrote shadow-inputs.json with ${out.length} items`);
