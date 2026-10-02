// Intent ledger viewer: every intent ends in a terminal disposition or
// stays visibly unresolved. Terminal vocabulary: EXECUTED, FAILED,
// NOT_ATTEMPTED, UNKNOWN_EXECUTION. Anything else is UNRESOLVED and
// listed explicitly, never hidden, never collapsed into a zero.
//
// Ontology (decided 2026-09-17, docs/decision-intent-ontology-2026-09-17.md):
// action-level intent_id and the pass/run aggregate are DISTINCT concepts:
// EXECUTION -> INTENT(S) -> ACTION(S) -> RESULT -> EVIDENCE. This viewer
// projects Level A (action intent). Pass aggregates (action-truth.jsonl
// run_id) are a different object; they are never relabeled as execution
// identity and the two are never unioned.

import { withEnvelope } from "../../../packages/schemas/src/index.mjs";

export const TERMINAL_DISPOSITIONS = Object.freeze([
  "EXECUTED",
  "FAILED",
  "NOT_ATTEMPTED",
  "UNKNOWN_EXECUTION",
]);

function dispositionFor(records) {
  for (let i = records.length - 1; i >= 0; i--) {
    const d = records[i].disposition || records[i].outcome || records[i].terminal;
    if (typeof d === "string" && TERMINAL_DISPOSITIONS.includes(d.toUpperCase()))
      return d.toUpperCase();
  }
  return "UNRESOLVED";
}

/**
 * Build the intent ledger view from ledger rows (intent + execution
 * records sharing intent_id). Returns { summary, unresolved } where
 * unresolved is the explicit list of intent_ids with no terminal outcome.
 */
export function buildIntentLedgerView(rows, { verifiedAt, evidenceRef } = {}) {
  const base = {
    proof_status: "projection of intent ledger file",
    verified_at: verifiedAt || new Date().toISOString(),
    evidence_ref: evidenceRef || "outreach/action-intent-ledger.jsonl",
    source: "action-intent-ledger.jsonl (projection, not authority state)",
    stage: "IMPLEMENTED",
  };
  const byIntent = new Map();
  for (const r of rows || []) {
    const id = r.intent_id;
    if (!id) continue;
    if (!byIntent.has(id)) byIntent.set(id, []);
    byIntent.get(id).push(r);
  }
  const summary = { EXECUTED: 0, FAILED: 0, NOT_ATTEMPTED: 0, UNKNOWN_EXECUTION: 0, UNRESOLVED: 0 };
  const unresolved = [];
  for (const [id, records] of byIntent) {
    const d = dispositionFor(records);
    summary[d] += 1;
    if (d === "UNRESOLVED") {
      unresolved.push({
        intent_id: id,
        platform: records[0].platform || "UNKNOWN",
        action: records[0].action || "UNKNOWN",
        first_ts: records[0].ts || null,
        record_count: records.length,
      });
    }
  }
  return withEnvelope(
    {
      total_intents: byIntent.size,
      summary,
      unresolved,
      unresolved_visible: true,
    },
    { ...base, maturity: "PROVEN" }
  );
}
