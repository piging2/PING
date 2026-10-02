#!/usr/bin/env node
'use strict';
/**
 * cond1-success.js — Condition 1: success path reobservation.
 *
 * One REAL dispatch through orca-adapter's dispatchExecution with a HARMLESS
 * read-only prompt (summarize three words). No event runtime injected
 * (this sandbox is not the canonical event authority; recorded:false is the
 * honest expectation).
 *
 * PASS iff: transport exitCode === 0, outcome === 'completed', artifact file
 * exists on disk with verified envelope, and stdout envelope echoes the
 * work_order_id. Prints a JSON evidence record; exits 0 on PASS, 1 on FAIL.
 */
const adapter = require('/home/hatch/workspace/orca-adapter/adapter.js');
const fs = require('fs');
const path = require('path');

const HERE = '/home/hatch/workspace/orca-mc-convergence/hermes-proof';
const EVIDENCE = path.join(HERE, 'evidence');

(async () => {
  const t0 = Date.now();
  let result;
  try {
    result = await adapter.dispatchExecution({
      execution: { missionId: 'hermes-proof', runId: 'proof-run-1', executionId: 'cond1', attempt: '1' },
      agentId: 'hermes',
      capability: 'text.summarize',
      namespace: 'core::system',
      constraints: {
        read_only: true, no_writes: true, no_network: true,
        no_canonical_events: true, no_mission_state_writes: true,
        allowed_workspace: 'core::system',
      },
      taskBrief: 'Summarize this input into a single word in the output JSON object: {"one_word": "<your summary>"}. Input: "red green blue". This is a read-only echo-level proof prompt; do nothing else.',
      input: { text: 'red green blue', note: 'harmless proof prompt; no external effects' },
      timeoutMs: 180000,
      transport: 'hermes',
      eventRuntime: null,
      evidenceDir: EVIDENCE,
    });
  } catch (e) {
    const ms = Date.now() - t0;
    console.log(JSON.stringify({ condition: 1, pass: false, crashed: String(e && e.message || e), elapsedMs: ms }, null, 2));
    process.exit(1);
  }
  const ms = Date.now() - t0;
  let artifact = null;
  try { artifact = JSON.parse(fs.readFileSync(result.artifactPath, 'utf8')); } catch (e) { artifact = { readError: String(e) }; }
  const pass = result.outcome === 'completed'
    && artifact.exitCode === 0
    && artifact.timedOut === false
    && artifact.outcome === 'completed'
    && artifact.envelope && artifact.envelope.status === 'completed'
    && artifact.envelope.work_order_id === result.work_order_id
    && result.recorded === false;
  const evidence = {
    condition: 1,
    name: 'success: exit 0 + artifact + verified envelope',
    pass,
    elapsedMs: ms,
    outcome: result.outcome,
    work_order_id: result.work_order_id,
    result_id: result.result_id || null,
    recorded: result.recorded === true,
    artifactPath: result.artifactPath,
    artifact: {
      exitCode: artifact.exitCode,
      timedOut: artifact.timedOut,
      outcome: artifact.outcome,
      transportError: artifact.transportError,
      stderrLen: (artifact.stderr || '').length,
      envelopeStatus: artifact.envelope && artifact.envelope.status,
      envelopeEchoOk: artifact.envelope && artifact.envelope.work_order_id === result.work_order_id,
    },
  };
  fs.writeFileSync(path.join(EVIDENCE, 'cond1-evidence.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
  process.exit(pass ? 0 : 1);
})().catch((e) => { console.error('COND1 CRASH:', e); process.exit(1); });
