/**
 * Lane J: Mission-Control-style PROJECTION over run records.
 *
 * This is a rendering of the stream, not an authority: it may only display
 * fields present on the records (plus verdicts computed by the verifier).
 * Anything absent on the record renders as an explicit gap ("no data"),
 * never as an invented value.
 *
 * Run: node mission-control.mjs <ledger-dir>  (defaults to demo data)
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readRuns } from "./run-ledger.mjs";
import { verifyRunRecord } from "./verify.mjs";

const DIR = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), "data");

const STATUS_ICON = {
  SUCCEEDED: "OK",
  PARTIAL: "PARTIAL",
  FAILED: "FAIL",
  OUTCOME_UNKNOWN: "UNKNOWN",
  ABORTED: "ABORT",
};

function card(r) {
  const v = verifyRunRecord(r);
  const errCodes = (r.errors || []).map((e) => e.code).join(",") || "-";
  const lines = [
    `+---------------------------------------------------------------`,
    `| ${r.run_id}  seq=${r.seq}  [${STATUS_ICON[r.status] || r.status}]  verdict=${v.verdict}`,
    `| ${r.connector_id}  tenant=${r.tenant_id}  trigger=${r.trigger}`,
    `| ${r.started_at} -> ${r.finished_at}  (${r.duration_ms} ms wall)`,
    `| obs discovered=${r.observations?.discovered} emitted=${r.observations?.emitted} accepted=${r.observations?.accepted} rejected=${r.observations?.rejected} changed=${r.observations?.changed}`,
    `| errors=${(r.errors || []).length} [${errCodes}]  conflicts=${(r.conflicts || []).length}  attempts=${(r.fetch_attempts || []).length}`,
    `| checkpoint ${r.checkpoint_in} -> ${r.checkpoint_out}${r.checkpoint_verified === false ? "  (unverified)" : ""}`,
    `| cost $${r.cost?.usd ?? "?"}  ai_tokens in=${r.ai_tokens?.input ?? "?"} out=${r.ai_tokens?.output ?? "?"}  bytes_in=${r.bytes?.inbound ?? "?"}`,
    `| digest ${String(r.run_digest).slice(0, 20)}...  gap=${!!r.prior_ledger_gap}`,
  ];
  if (v.issues.length) {
    lines.push(`| issues: ${v.issues.slice(0, 3).join(" | ")}${v.issues.length > 3 ? ` (+${v.issues.length - 3} more)` : ""}`);
  }
  lines.push(`+---------------------------------------------------------------`);
  return lines.join("\n");
}

const { records, corrupt } = readRuns(DIR);
records.sort((a, b) => (a.started_at < b.started_at ? -1 : 1));
console.log(`MISSION CONTROL (projection) — ${records.length} runs, ${corrupt.length} corrupt lines`);
console.log(`source: ${DIR}\n`);
for (const r of records) console.log(card(r));
if (corrupt.length) console.log(`\ncorrupt lines (reported, not fatal): ${JSON.stringify(corrupt)}`);
