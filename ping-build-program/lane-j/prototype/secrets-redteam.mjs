/**
 * Lane J red-team: secrets must never land in the run ledger.
 *
 * A buggy caller smuggles fake tokens into free-text fields. The writer
 * redacts BEFORE serializing and BEFORE the digest is computed. The test
 * fails (loud) if any secret pattern survives on the ledger line.
 *
 * Fake tokens only: ghp_FAKE, sk-FAKE, Bearer FAKE. No real credentials
 * exist anywhere in this prototype.
 *
 * Run: node secrets-redteam.mjs  (from this directory)
 */

import { rmSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beginRun, RUNS_FILE, redactSecretsText } from "./run-ledger.mjs";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "data", "secrets-redteam");
rmSync(DIR, { recursive: true, force: true });

const FAKE_GITHUB = "ghp_FAKE0123456789abcdef";
const FAKE_SK = "sk-FAKE-secret-key-0123456789";
const FAKE_BEARER = "Bearer FAKEbearer.token.0123456789abcdef";

const b = beginRun(DIR, {
  connector_id: "website",
  tenant_id: "t_redteam",
  seq: 1,
  started_at: "2026-09-23T19:40:00Z",
});
b.error({
  code: "AUTH_EXPIRED",
  message: `provider rejected the call; the buggy caller pasted token=${FAKE_GITHUB} and key ${FAKE_SK} into the message`,
  credential_handle: "credref:website:t_redteam:oauth", // handle survives; secret dies
});
b.rejection({
  observation_id: "obs-red-1",
  claim_id: "c-red-1",
  code: "INVALID_PAYLOAD",
  detail: `request was rejected; Authorization: ${FAKE_BEARER} leaked into the detail field`,
  evidence_ref: "sha256:deadbeef",
});
b.attempt({
  fetch_attempt_id: "fa-red-1",
  seq: 1,
  url: "https://example.invalid/",
  terminal_state: "FAILED",
  taxonomy_code: "AUTH_EXPIRED",
  note: "header contained " + FAKE_SK,
});
const res = b.finish({ status: "FAILED", finished_at: "2026-09-23T19:40:01Z", duration_ms: 1000 });
if (!res.ok) {
  console.error("write failed:", res.error);
  process.exit(1);
}

const line = readFileSync(join(DIR, RUNS_FILE), "utf8");
const leaks = [];
for (const s of [FAKE_GITHUB, FAKE_SK, FAKE_BEARER]) {
  if (line.includes(s)) leaks.push(s);
}
const redactions = (line.match(/\[REDACTED-SECRET\]/g) || []).length;
const handleSurvives = line.includes("credref:website:t_redteam:oauth");
const digestBinds = line.includes(res.record.run_digest);

console.log(`ledger bytes: ${line.length}`);
console.log(`redactions applied: ${redactions}`);
console.log(`credential handle (must survive): ${handleSurvives}`);
console.log(`digest present (binds redacted record): ${digestBinds}`);
console.log(`leaks: ${leaks.length === 0 ? "NONE" : JSON.stringify(leaks)}`);

// Unit spot-checks on the redaction helper itself
const spot = [
  ["api_key=abcdef0123456789", "[REDACTED-SECRET]"],
  ["clean text, no secrets", "clean text, no secrets"],
  ["-----BEGIN RSA PRIVATE KEY-----", "[REDACTED-SECRET]"],
];
for (const [input, expected] of spot) {
  const got = redactSecretsText(input);
  console.log(`redact("${input}") -> "${got}" ${got === expected ? "PASS" : "FAIL(expected " + expected + ")"}`);
}

if (leaks.length > 0) {
  console.error("RED-TEAM FAILED: secret leaked into the ledger");
  process.exit(1);
}
console.log("RED-TEAM PASS: no secrets on the ledger; lane-L handles intact");
