/**
 * crash-worker.js -- test double for "the connector died mid-operation".
 *
 * A real child process (not a mock): it appends INTENT_RECORDED and CLAIMED
 * receipt lines to the given JSONL file -- exactly the durable writes the
 * framework executor performs before invoking the adapter -- then dies
 * WITHOUT writing an OBSERVED line. Exit code 137 simulates SIGKILL.
 *
 * Usage: node crash-worker.js <receiptFile> <receiptId> <connectorId> <capability> [--torn]
 *   --torn: write a truncated final line (partial write) instead of dying cleanly.
 *
 * The parent test then loads the file with ReceiptLog and must derive
 * UNKNOWN (clean death) or hit ReceiptLogUnreadableError (torn tail).
 */
"use strict";
const fs = require("fs");

const [receiptFile, receiptId, connectorId, capability, flag] = process.argv.slice(2);

function line(obj) {
  return JSON.stringify(obj) + "\n";
}

const base = { receiptId, connectorId, capability };
let seq = 0;
const at = () => new Date().toISOString();

let out = "";
out += line({ ...base, stage: "INTENT_RECORDED", terminalOutcome: null, failureClass: null, seq: seq++, at: at(), leaseToken: null, detail: {}, receiptId });
out += line({ ...base, stage: "CLAIMED", terminalOutcome: null, failureClass: null, seq: seq++, at: at(), leaseToken: "lease-test-token", detail: { holder: "kill-test" }, receiptId });

if (flag === "--torn") {
  // Partial write: the last line is cut mid-object, as a SIGKILL during
  // appendFileSync would leave it.
  out += '{"receiptId":"' + receiptId + '","stage":"CL';
}

fs.appendFileSync(receiptFile, out);
const fd = fs.openSync(receiptFile, "r");
fs.fsyncSync(fd);
fs.closeSync(fd);

if (flag === "--torn") {
  process.exit(137);
}
// Clean death: no OBSERVED line is ever written.
process.exit(137);
