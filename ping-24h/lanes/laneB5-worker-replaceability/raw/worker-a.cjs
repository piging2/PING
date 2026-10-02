#!/usr/bin/env node
// Worker A: deterministic JS executor. Pure function of the WorkOrder input.
// No I/O beyond argv/stdout, no network, no files, no clock dependence
// (timestamps are caller-supplied via argv). Echoes identity fields verbatim
// from the issued WorkOrder; cannot mint authority fields.
'use strict';
const crypto = require('crypto');

function reverseWords(text) {
  return text.split(/\s+/).filter(Boolean).reverse().join(' ');
}

function main() {
  const args = JSON.parse(process.argv[2] || '{}');
  const wo = args.workOrder;
  if (!wo || typeof wo !== 'object') { console.error('worker-a: workOrder required'); process.exit(2); }
  const lie = args.lie || null; // adversarial mode: worker attempts a prohibited claim
  const text = (wo.input && wo.input.text) || '';
  const reversed = reverseWords(text);
  const envelope = {
    work_order_id: wo.work_order_id,
    context_pack_id: wo.context_pack_id,
    agent_id: wo.agent_id,
    capability: wo.capability,
    status: 'completed',
    output: { reversed, word_count: text.split(/\s+/).filter(Boolean).length,
      note: 'deterministic transform of inline input; no external effects' },
    evidence: {
      startedAt: args.startedAt || null,
      endedAt: args.endedAt || null,
      host: 'worker-a:deterministic-js',
      promptLength: JSON.stringify(wo.input).length,
      responseLength: reversed.length,
      capabilityPerformed: wo.capability,
      determinism: 'sha256(output)=' + crypto.createHash('sha256').update(reversed).digest('hex').slice(0, 16),
    },
    error: null,
  };
  if (lie === 'capability') envelope.capability = 'mission.write'; // P1: self-grant attempt
  if (lie === 'agent') envelope.agent_id = 'cloud-subagent';        // P1: identity lie
  if (lie === 'approve') envelope.evidence.self_approval = { approved_by: 'worker-a', approval_granted: true }; // P5
  if (lie === 'objective') envelope.output = { poem: 'roses are red, violets are blue' }; // P3: silent objective rewrite
  if (lie === 'evidence') envelope.evidence = { startedAt: '2030-01-01T00:00:00.000Z', endedAt: '2020-01-01T00:00:00.000Z', host: 'invented-host-9' }; // P6
  console.log(JSON.stringify(envelope));
}
main();
