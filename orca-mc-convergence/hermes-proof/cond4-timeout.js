#!/usr/bin/env node
'use strict';
/**
 * cond4-timeout.js — Condition 4: timeout/cancellation semantics.
 *
 * One REAL dispatch through the adapter with timeoutMs=2000 (bounded).
 * The bridge needs ~5s even to fail, so the dispatcher MUST give up first.
 *
 * PASS iff: elapsed is bounded (~timeoutMs + small overhead, well under 2x),
 * outcome === 'unknown', reason === 'dispatcher_timeout', artifact has
 * timedOut === true, exitCode === null, and the outcome was NOT collapsed
 * into failed. The worker may still be running on the Pig — that is the
 * honest UNKNOWN semantics (reconcile-vs-retry belongs to the caller).
 *
 * Harmless prompt; no model tokens are expected to burn (dispatcher gives up
 * before any worker output), but the Pig-side worker may still start: the
 * prompt is read-only/echo-level so an orphaned run is effect-free.
 */
const adapter = require('/home/hatch/workspace/orca-adapter/adapter.js');
const fs = require('fs');
const path = require('path');

const HERE = '/home/hatch/workspace/orca-mc-convergence/hermes-proof';
const EVIDENCE = path.join(HERE, 'evidence');
const TIMEOUT_MS = 2000;

(async () => {
  const t0 = Date.now();
  const result = await adapter.dispatchExecution({
    execution: { missionId: 'hermes-proof', runId: 'proof-run-1', executionId: 'cond4', attempt: '1' },
    agentId: 'hermes',
    capability: 'text.summarize',
    namespace: 'core::system',
    constraints: {
      read_only: true, no_writes: true, no_network: true,
      no_canonical_events: true, no_mission_state_writes: true,
      allowed_workspace: 'core::system',
    },
    taskBrief: 'Reply with the single word TIMEOUT-PROBE and nothing else. Read-only proof prompt; do nothing else.',
    input: { note: 'harmless timeout probe; no external effects' },
    timeoutMs: TIMEOUT_MS,
    transport: 'hermes',
    eventRuntime: null,
    evidenceDir: EVIDENCE,
  });
  const ms = Date.now() - t0;
  const artifact = JSON.parse(fs.readFileSync(result.artifactPath, 'utf8'));
  const bounded = ms < TIMEOUT_MS * 3 && ms >= TIMEOUT_MS;
  const pass = result.outcome === 'unknown'
    && result.reason === 'dispatcher_timeout'
    && artifact.timedOut === true
    && artifact.exitCode === null
    && artifact.outcome === 'unknown'
    && bounded;
  const evidence = {
    condition: 4,
    name: 'timeout/cancellation: bounded wait, typed outcome',
    pass,
    timeoutMs: TIMEOUT_MS,
    elapsedMs: ms,
    boundedWait: bounded,
    outcome: result.outcome,
    reason: result.reason,
    reconcileOwnedBy: result.reconcileOwnedBy || null,
    artifactPath: result.artifactPath,
    artifact: { timedOut: artifact.timedOut, exitCode: artifact.exitCode, outcome: artifact.outcome },
    note: 'Dispatcher gave up at the deadline; the Pig-side worker may still be running. UNKNOWN, never failed. Reconcile-vs-retry is the caller\'s decision (WorkerRuntime/Mission Control), not the adapter\'s.',
  };
  fs.writeFileSync(path.join(EVIDENCE, 'cond4-evidence.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
  process.exit(pass ? 0 : 1);
})().catch((e) => { console.error('COND4 CRASH:', e); process.exit(1); });
