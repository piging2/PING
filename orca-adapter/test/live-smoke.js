#!/usr/bin/env node
'use strict';
/**
 * live-smoke.js — REAL headless-agent dispatch through the LANE C adapter.
 *
 * Sends ONE synthetic bounded prompt to the real Hermes worker
 * (pig-side Claude Code CLI via ~/workspace/bin/prompt-hermes.sh) through
 * dispatchExecution with transport='hermes'. The prompt is read-only,
 * no writes, no network, no external effects: summarize three words.
 *
 * eventRuntime is deliberately NOT injected: this sandbox is not the
 * canonical event authority, and WorkerRuntime dispatch semantics belong to
 * lane A. The event-plane link is proven by the existing witnessed run
 * (orca-run-mu6wmbzn, 2026-09-18: WORKER_COMPLETED recorded on ping_events
 * via recordVerifiedResult); here we prove dispatch -> agent -> artifact ->
 * verified outcome.
 *
 * Expected: outcome 'completed', verified envelope, artifact on disk,
 * recorded: false (no event runtime injected — honest, not fabricated).
 */
const adapter = require('../adapter.js');

(async () => {
  const result = await adapter.dispatchExecution({
    execution: { missionId: 'lane-c-smoke', runId: 'smoke-run-1', executionId: 'smoke-e1', attempt: '1' },
    agentId: 'hermes',
    capability: 'text.summarize',
    namespace: 'core::system',
    constraints: {
      read_only: true, no_writes: true, no_network: true,
      no_canonical_events: true, no_mission_state_writes: true,
      allowed_workspace: 'core::system',
    },
    taskBrief: 'Summarize this input into a single word in the output JSON object: {"one_word": "<your summary>"}. Input: "red green blue".',
    input: { text: 'red green blue', note: 'synthetic smoke test; no external effects' },
    timeoutMs: 180000,
    transport: 'hermes',
    eventRuntime: null, // deliberate: see header
    evidenceDir: require('path').join(__dirname, '..', 'evidence'),
  });
  console.log(JSON.stringify({
    outcome: result.outcome,
    reason: result.reason || null,
    work_order_id: result.work_order_id,
    result_id: result.result_id || null,
    recorded: result.recorded === true,
    event_id: result.event_id || null,
    artifactPath: result.artifactPath,
  }, null, 2));
  process.exit(result.outcome === 'completed' ? 0 : 2);
})().catch((e) => { console.error('LIVE SMOKE CRASH:', e); process.exit(1); });
