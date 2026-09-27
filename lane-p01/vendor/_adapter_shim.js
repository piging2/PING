'use strict';
/**
 * Thin transport to the EXISTING ExternalAgentAdapter.
 *
 * This shim owns NO decision. It forwards a JSON request to the vendored
 * adapter's authorizeWorkOrder / issueWorkOrder and prints the JSON result.
 * Every grant/deny verdict comes from the adapter module, never from here.
 * (Same shape as the lane-D adapter-call.js support glue.)
 *
 * Usage:
 *   node _adapter_shim.js <adapter_dir> <op> <request.json>
 *   op: authorize | issue
 *
 * Exit 0 with {"ok": true, "result": {...}} on a returned verdict.
 * Exit 0 with {"ok": false, "error": ..., "code": ..., "reason": ...} when
 * the adapter throws (e.g. WORK_ORDER_DENIED).
 * Exit 2 on shim misuse (bad args, unreadable files) -- never a verdict.
 */
const fs = require('fs');
const path = require('path');

function fail(code, message) {
  process.stderr.write('shim: ' + message + '\n');
  process.exit(code);
}

const [adapterDir, op, requestPath] = process.argv.slice(2);
if (!adapterDir || !op || !requestPath) fail(2, 'usage: _adapter_shim.js <adapter_dir> <authorize|issue> <request.json>');
if (op !== 'authorize' && op !== 'issue') fail(2, 'op must be authorize or issue');

let request;
try {
  request = JSON.parse(fs.readFileSync(requestPath, 'utf-8'));
} catch (e) {
  fail(2, 'cannot read request JSON: ' + e.message);
}

let adapter;
try {
  adapter = require(path.resolve(adapterDir, 'vendor', 'external_agent_adapter.js'));
} catch (e) {
  fail(2, 'cannot load vendored adapter: ' + e.message);
}

try {
  const result = op === 'authorize'
    ? adapter.authorizeWorkOrder(request)
    : adapter.issueWorkOrder(request);
  process.stdout.write(JSON.stringify({ ok: true, result }) + '\n');
} catch (e) {
  process.stdout.write(JSON.stringify({
    ok: false,
    error: String((e && e.message) || e),
    code: (e && e.code) || 'ADAPTER_THROW',
    reason: (e && e.reason) || undefined,
  }) + '\n');
}
