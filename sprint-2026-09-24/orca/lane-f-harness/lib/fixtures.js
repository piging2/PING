'use strict';
/**
 * Lane F harness — synthetic headless-agent transports for the orca-adapter
 * (lane C) dispatchExecution's SYNTHETIC-TEST-ONLY transportFn seam.
 *
 * Every fixture records the exact promptText it received (receipt proof) so
 * the case can assert prompt-delivery integrity and cross-delivery
 * impossibility. No real external effects: the only "effect" is the
 * counter-file stand-in, driven by the fixture before it reports.
 */
const crypto = require('crypto');

function sha256hex(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

/** Busy-wait (keeps the sync transportFn contract while simulating agent work). */
function dwell(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { /* intentional */ }
}

function baseRecord(startedAt, endedAt) {
  return { startedAt, endedAt, timedOut: false, exitCode: 0, error: null, stdout: '', stderr: '' };
}

/**
 * Happy agent: performs the effect, then replies with a valid 8-field
 * envelope echoing the work-order fields (the adapter verifies the echo).
 */
function happyTransport({ effect, output, dwellMs = 0, stdoutPrefix = 'worker chatter\n' }) {
  const seen = { promptText: null, promptDigest: null, startedAt: null, endedAt: null };
  const fn = (promptText /* , timeoutMs */) => {
    seen.startedAt = new Date().toISOString();
    seen.promptText = promptText;
    seen.promptDigest = sha256hex(promptText);
    if (dwellMs) dwell(dwellMs);
    if (effect) effect();
    const wo = /"work_order_id": "([^"]+)"/.exec(promptText)[1];
    const ctx = /"context_pack_id": "([^"]+)"/.exec(promptText)[1];
    const agent = /"agent_id": "([^"]+)"/.exec(promptText)[1];
    const cap = /"capability": "([^"]+)"/.exec(promptText)[1];
    const envelope = {
      work_order_id: wo, context_pack_id: ctx, agent_id: agent,
      capability: cap, status: 'completed',
      output: output || { note: 'synthetic happy output' },
      evidence: { startedAt: seen.startedAt, endedAt: new Date().toISOString(), host: 'harness-fake', capabilityPerformed: cap },
      error: null,
    };
    seen.endedAt = new Date().toISOString();
    return { ...baseRecord(seen.startedAt, seen.endedAt), stdout: stdoutPrefix + JSON.stringify(envelope) };
  };
  return { fn, seen };
}

/**
 * Ambiguous agent (the 1B fixture at adapter level): performs the effect,
 * then reports with NO parseable envelope — the worker did something but
 * the dispatcher cannot verify what. Adapter -> ESCALATED with
 * honestOutcome UNKNOWN; the evidence artifact records outcome 'unknown'.
 */
function ambiguousTransport({ effect, dwellMs = 0 }) {
  const seen = { promptText: null, promptDigest: null, startedAt: null, endedAt: null };
  const fn = (promptText) => {
    seen.startedAt = new Date().toISOString();
    seen.promptText = promptText;
    seen.promptDigest = sha256hex(promptText);
    if (dwellMs) dwell(dwellMs);
    if (effect) effect();
    seen.endedAt = new Date().toISOString();
    return { ...baseRecord(seen.startedAt, seen.endedAt), stdout: 'effect performed; no structured report available' };
  };
  return { fn, seen };
}

/**
 * Timeout transport: simulates a dispatcher timeout. The worker's fate is
 * genuinely unknowable from the dispatcher's seat. Adapter -> UNKNOWN
 * (dispatcher_timeout), reconcileOwnedBy 'caller'.
 */
function timeoutTransport({ dwellMs = 0 }) {
  const seen = { promptText: null, startedAt: null, endedAt: null };
  const fn = (promptText) => {
    seen.startedAt = new Date().toISOString();
    seen.promptText = promptText;
    if (dwellMs) dwell(dwellMs);
    seen.endedAt = new Date().toISOString();
    return { startedAt: seen.startedAt, endedAt: seen.endedAt, timedOut: true, exitCode: null, error: 'ETIMEDOUT', stdout: '', stderr: '' };
  };
  return { fn, seen };
}

const FIXTURE_CONSTRAINTS = Object.freeze({
  read_only: true, no_writes: true, no_network: true,
  no_canonical_events: true, no_mission_state_writes: true,
});

function executionOpts({ missionId, runId, executionId, agentId, capability, namespace, tenantId, taskBrief, input, evidenceDir, transportFn }) {
  return {
    execution: { missionId, runId, executionId, attempt: '1' },
    agentId, capability, namespace, tenantId,
    constraints: { ...FIXTURE_CONSTRAINTS, allowed_workspace: namespace },
    taskBrief, input: input || {},
    transport: 'synthetic', transportFn, eventRuntime: null, evidenceDir,
  };
}

function mintWorkOrderId(executionId, attempt = '1') {
  // Mirrors the adapter's deterministic mint: sha256('workorder:'+taskId)[0:16]
  // with taskId = `${executionId}:attempt-${attempt}`.
  return crypto.createHash('sha256').update(`workorder:${executionId}:attempt-${attempt}`, 'utf8').digest('hex').slice(0, 16);
}

module.exports = { happyTransport, ambiguousTransport, timeoutTransport, FIXTURE_CONSTRAINTS, executionOpts, sha256hex, dwell, mintWorkOrderId };
