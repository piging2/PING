#!/usr/bin/env node
'use strict';
/**
 * ORCA-D mission 7: partial / malformed / wrong-attempt result classification.
 * Drives the REAL vendor extractEnvelope() replica (verbatim from
 * vendor-orca_control_loop.js lines ~394-418) and the REAL vendor
 * verifyResultEnvelope() (branch ae55b77ff). The envelope has no attempt
 * field; the attempt binding lives only in the caller's workOrder object.
 */
const fs = require('fs');
const adapter = require('./vendor-ping-runtime/external-agent/external_agent_adapter.js');

// Verbatim extractEnvelope from vendor-orca_control_loop.js
function extractEnvelope(stdout) {
  const start = stdout.indexOf('{');
  if (start < 0) return { ok: false, reason: 'no JSON object found in worker stdout' };
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < stdout.length; i++) {
    const ch = stdout[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try {
          return { ok: true, envelope: JSON.parse(stdout.slice(start, i + 1)) };
        } catch (e) {
          return { ok: false, reason: 'envelope JSON parse failed: ' + e.message };
        }
      }
    }
  }
  return { ok: false, reason: 'unbalanced JSON in worker stdout' };
}

const WO = {
  work_order_id: 'wo123', context_pack_id: 'ctx1', agent_id: 'hermes',
  capability: 'queue.summarize', deadline: new Date(Date.now() + 600000).toISOString(),
  mission_id: 'm1', task_id: 't1', attempt: 2, namespace: 'core::system',
  correlation_id: 'c1', causation_id: null,
};
const good = (over = {}) => Object.assign({
  work_order_id: 'wo123', context_pack_id: 'ctx1', agent_id: 'hermes',
  capability: 'queue.summarize', status: 'completed',
  output: { queue_summary: '...' }, evidence: { e: 1 }, error: null,
}, over);

const cases = [
  ['no-json', 'worker printed only log lines, no braces', 'extract'],
  ['unbalanced', '{"work_order_id": "wo123", "oops": ', 'extract'],
  ['decoy-first', '{"work_order_id":"wo123","context_pack_id":"ctx1","agent_id":"hermes","capability":"queue.summarize","status":"completed","output":{"x":"DECOY"},"evidence":{},"error":null}\nREAL: {"work_order_id":"wo123","context_pack_id":"ctx1","agent_id":"hermes","capability":"queue.summarize","status":"completed","output":{"x":"REAL"},"evidence":{},"error":null}', 'extract'],
  ['json-array-first', '[1,2,3]\n' + JSON.stringify(good()), 'extract'],
  ['missing-field', JSON.stringify(good({ output: undefined })), 'verify'],
  ['completed-null-output', JSON.stringify(good({ output: null })), 'verify'],
  ['completed-empty-string-output', JSON.stringify(good({ output: '' })), 'verify'],
  ['completed-empty-object-output', JSON.stringify(good({ output: {} })), 'verify'],
  ['completed-with-error', JSON.stringify(good({ error: 'also an error' })), 'verify'],
  ['failed-null-error', JSON.stringify(good({ status: 'failed', output: null, error: null })), 'verify'],
  ['failed-empty-error', JSON.stringify(good({ status: 'failed', output: null, error: '' })), 'verify'],
  ['bad-status', JSON.stringify(good({ status: 'done' })), 'verify'],
  ['woid-mismatch', JSON.stringify(good({ work_order_id: 'wo999' })), 'verify'],
  ['capability-mismatch', JSON.stringify(good({ capability: 'email.send' })), 'verify'],
  ['extra-fields', JSON.stringify(good({ forged: true, attempt: 99 })), 'verify'],
  ['wrong-attempt-replay', JSON.stringify(good()), 'verify-attempt1-as-2'],
  ['non-object-string', '"just a string"', 'verify'],
  ['non-object-null', 'null', 'verify'],
  ['deadline-exceeded', JSON.stringify(good()), 'verify-late'],
];

console.log('=== envelope adversarial matrix ===');
for (const [name, input, mode] of cases) {
  if (mode === 'extract') {
    const r = extractEnvelope(input);
    console.log(`${name}: extract -> ${r.ok ? 'OK envelope.output=' + JSON.stringify(r.envelope.output) : 'FAIL ' + r.reason}`);
    continue;
  }
  let env;
  try { env = JSON.parse(input); } catch (e) { console.log(`${name}: JSON.parse failed unexpectedly`); continue; }
  // 'missing-field' case: actually delete the key
  if (name === 'missing-field') delete env.output;
  const wo = Object.assign({}, WO);
  if (mode === 'verify-late') wo.deadline = new Date(Date.now() - 1000).toISOString();
  // wrong-attempt-replay: envelope is attempt-1's; workOrder says attempt 2
  const r = adapter.verifyResultEnvelope(env, wo, { invokedAgentId: 'hermes', verifiedAt: new Date().toISOString() });
  console.log(`${name}: verify -> ${r.valid ? 'VALID' : 'INVALID: ' + r.reason}`);
}
console.log('\nNote: envelope carries no attempt field; wrong-attempt-replay feeds an attempt-1 envelope with workOrder.attempt=2.');
