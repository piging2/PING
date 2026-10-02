#!/usr/bin/env node
'use strict';
/**
 * ORCA-D mission 9: timeout-during-effect matrix.
 * Real objective-runtime + real external-agent adapter (branch ae55b77ff,
 * incl. verbatim verifyResultEnvelope + recordVerifiedResult) + real policy
 * classifyRetry; fake dispatcher in-process with per-attempt behavior.
 * eventRuntime.emit implements the verbatim spine identity rule
 * (eventType/source/namespace/logical_id -> sha256, ON CONFLICT DO NOTHING).
 * The "worker effect" is a filesystem append (non-idempotent) or a
 * deterministic-keyed write (idempotent). The coordinator replicates the
 * loop's dispatchHermes timeout mechanics (collect drop, ignore if timed out).
 *
 * Variants:
 *  V1 non-idempotent + slow-exit dispatcher (live T2 race shape): attempt 1
 *     performs the effect, writes a COMPLETED drop, dispatcher exits slowly;
 *     coordinator times out and DISCARDS the successful drop.
 *  V2 non-idempotent + hung worker (no drop ever): attempt 1's execution
 *     state is genuinely UNKNOWN at timeout.
 *  V3 idempotent-keyed effect + slow-exit: does the retry converge?
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const objRuntime = require('./vendor-objective-runtime.js');
const adapter = require('./vendor-ping-runtime/external-agent/external_agent_adapter.js');
const policy = require('./vendor-policy_orca_policy.js');

const COORDINATOR_TIMEOUT_MS = 400;
const AGENT_ID = 'agent:external:hermes';
const CAPABILITY = 'hermes-agent-dispatch';

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
// Verbatim spine identity rule (h-commit-inflight documents the source)
function spineEventId(eventType, source, options = {}) {
  const identity = { eventType, source };
  if (options.namespace) identity.namespace = options.namespace;
  identity[options.logical_id ? 'logical_id' : 'payload'] = options.logical_id || {};
  return 'event_' + crypto.createHash('sha256').update(stableStringify(identity), 'utf8').digest('hex').slice(0, 16);
}
// Verbatim extractEnvelope (vendor-orca_control_loop.js)
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
        try { return { ok: true, envelope: JSON.parse(stdout.slice(start, i + 1)) }; }
        catch (e) { return { ok: false, reason: 'envelope JSON parse failed: ' + e.message }; }
      }
    }
  }
  return { ok: false, reason: 'unbalanced JSON in worker stdout' };
}

function freshWorld() {
  const DATA_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'orca-d-effect-'));
  const store = new Map(); // event_id -> event (ON CONFLICT DO NOTHING)
  const eventRuntime = {
    async emit(eventType, source, payload, options = {}) {
      const eventId = spineEventId(eventType, source, options);
      const dup = store.has(eventId);
      if (!dup) store.set(eventId, { event_id: eventId, eventType, source, payload, options });
      return { status: 'ok', eventId, deduplicated: dup };
    },
  };
  return { DATA_ROOT, store, eventRuntime };
}

function fullWorkOrder(world, objectiveId, taskKey) {
  const workOrderId = objRuntime.deriveWorkOrderId(objectiveId, taskKey);
  objRuntime.authorizeWorkOrder(world.DATA_ROOT, objectiveId, taskKey, {});
  objRuntime.updateWorkOrder(world.DATA_ROOT, objectiveId, workOrderId, {
    context_pack_id: 'ctx-' + objectiveId,
    agent_id: AGENT_ID,
    capability: CAPABILITY,
    deadline: new Date(Date.now() + 600000).toISOString(),
    mission_id: 'm-' + objectiveId,
    task_id: taskKey,
    namespace: 'core::system',
    correlation_id: 'corr-' + workOrderId,
    causation_id: null,
  });
  return objRuntime.loadWorkOrder(world.DATA_ROOT, objectiveId, workOrderId);
}

function fullEnvelope(workOrder) {
  return {
    work_order_id: workOrder.work_order_id,
    context_pack_id: workOrder.context_pack_id,
    agent_id: AGENT_ID,
    capability: CAPABILITY,
    status: 'completed',
    output: 'effect performed',
    evidence: {},
    error: null,
  };
}

// Fake dispatcher: performs the worker effect, then behaves per variant.
function fakeDispatch(world, workOrder, attemptId, variant) {
  const effectsLog = path.join(world.DATA_ROOT, 'effects.log');
  return new Promise((resolve) => {
    if (variant.effectKind === 'append') {
      fs.appendFileSync(effectsLog, `effect:${workOrder.work_order_id}:${attemptId}\n`);
    } else {
      fs.mkdirSync(path.join(world.DATA_ROOT, 'effects'), { recursive: true });
      fs.writeFileSync(path.join(world.DATA_ROOT, 'effects', workOrder.work_order_id + '.json'),
        JSON.stringify({ work_order_id: workOrder.work_order_id, last_attempt: attemptId }));
    }
    if (variant.dropMode === 'none-hang') {
      const t = setTimeout(() => resolve({ exitCode: 0 }), COORDINATOR_TIMEOUT_MS * 10);
      if (t.unref) t.unref();
      return;
    }
    const drop = {
      schema: 'orca-rendezvous/1', attempt_id: attemptId, work_order_id: workOrder.work_order_id,
      dispatch_started_at: new Date().toISOString(), dispatch_finished_at: new Date().toISOString(),
      timed_out: false, returncode: 0,
      stdout: JSON.stringify(fullEnvelope(workOrder)) + '\n', stderr: '', error: null,
    };
    fs.writeFileSync(path.join(world.DATA_ROOT, `orca-rendezvous-${attemptId}.json`), JSON.stringify(drop));
    const slow = variant.dropMode === 'completed-slow-exit';
    setTimeout(() => resolve({ exitCode: 0 }), slow ? COORDINATOR_TIMEOUT_MS * 4 : 50);
  });
}

// Coordinator: verbatim timeout mechanics (collect drop, discard if timed out)
async function runAttempt(world, workOrder, objectiveId, attempt, variant) {
  const attemptId = `${workOrder.work_order_id}-attempt-${attempt}`;
  const resultPath = path.join(world.DATA_ROOT, `orca-rendezvous-${attemptId}.json`);
  const dispatchP = fakeDispatch(world, workOrder, attemptId, variant);
  let timedOut = false;
  const timer = new Promise((res) => setTimeout(() => { timedOut = true; res('timeout'); }, COORDINATOR_TIMEOUT_MS));
  await Promise.race([dispatchP, timer]);
  let rendezvous = null;
  if (fs.existsSync(resultPath)) rendezvous = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  // verbatim loop: the drop is collected, but the timeout branch ignores it
  let envelope;
  if (timedOut) {
    envelope = Object.assign(fullEnvelope(workOrder), {
      status: 'failed', output: null,
      error: `dispatcher timeout after ${COORDINATOR_TIMEOUT_MS}ms (no success fabricated)`,
    });
  } else {
    const ext = extractEnvelope(rendezvous.stdout || '');
    if (!ext.ok) throw new Error('extraction failed: ' + ext.reason);
    envelope = ext.envelope;
  }
  const cur = objRuntime.loadWorkOrder(world.DATA_ROOT, objectiveId, workOrder.work_order_id);
  const nextAttempt = (cur.attempt_count || 0) + 1;
  objRuntime.updateWorkOrder(world.DATA_ROOT, objectiveId, workOrder.work_order_id, {
    state: 'DISPATCHING', dispatch_attempt_id: attemptId, dispatch_pid: 4242,
    last_attempt_id: attemptId, attempt_count: nextAttempt,
  });
  const verifiedAt = new Date().toISOString();
  const record = await adapter.recordVerifiedResult({
    eventRuntime: world.eventRuntime, result: envelope, workOrder: cur,
    invokedAgentId: AGENT_ID, verifiedAt,
  });
  if (!record.valid) throw new Error('record invalid: ' + record.reason);
  const terminalState = envelope.status === 'completed' ? 'COMPLETED' : 'FAILED';
  objRuntime.updateWorkOrder(world.DATA_ROOT, objectiveId, workOrder.work_order_id, {
    state: terminalState,
    terminal: { status: terminalState, event_id: record.event_id, event_type: record.event_type, attempt: attemptId, envelope },
  });
  if (envelope.status !== 'completed') {
    // verbatim loop: classifyRetry({ attempt, maxAttempts, failureKind })
    const retryDecision = policy.classifyRetry({ attempt: nextAttempt, maxAttempts: 3, failureKind: 'timeout' });
    const auto = retryDecision.decisionClass === policy.DECISION_CLASSES.AUTO_EXECUTE;
    return { outcome: 'timeout', decisionClass: retryDecision.decisionClass, autoExecute: auto, attemptId, eventId: record.event_id };
  }
  return { outcome: 'completed', attemptId, eventId: record.event_id, deduplicated: record.deduplicated };
}

async function scenario(name, variant) {
  const world = freshWorld();
  const objectiveId = 'obj-effect-' + name;
  const taskKey = 't-' + name;
  const workOrder = fullWorkOrder(world, objectiveId, taskKey);
  const r1 = await runAttempt(world, workOrder, objectiveId, 1, variant);
  let r2 = null;
  if (r1.outcome === 'timeout' && r1.autoExecute) {
    r2 = await runAttempt(world, workOrder, objectiveId, 2, { effectKind: variant.effectKind, dropMode: 'completed-fast' });
  }
  const effectsLog = path.join(world.DATA_ROOT, 'effects.log');
  const appends = fs.existsSync(effectsLog) ? fs.readFileSync(effectsLog, 'utf8').trim().split('\n').filter(Boolean) : [];
  const keyedPath = path.join(world.DATA_ROOT, 'effects', workOrder.work_order_id + '.json');
  const keyed = fs.existsSync(keyedPath) ? fs.readFileSync(keyedPath, 'utf8') : null;
  const events = [...world.store.values()];
  console.log(`${name}: attempt1=${r1.outcome}(${r1.decisionClass || 'n/a'}) event=${r1.eventId} attempt2=${r2 ? r2.outcome + ' event=' + r2.eventId + ' dedup=' + r2.deduplicated : 'n/a'}`);
  console.log(`  append-effects=${appends.length} ${JSON.stringify(appends)}`);
  if (keyed) console.log(`  keyed-effect state: ${keyed}`);
  console.log(`  canonical events: ${events.map((e) => e.eventType + ' ' + e.event_id).join(' | ')}`);
  return { name, r1, r2, appends, keyed, events };
}

(async () => {
  const v1 = await scenario('V1', { effectKind: 'append', dropMode: 'completed-slow-exit' });
  const v2 = await scenario('V2', { effectKind: 'append', dropMode: 'none-hang' });
  const v3 = await scenario('V3', { effectKind: 'keyed', dropMode: 'completed-slow-exit' });
  console.log('---');
  console.log(`V1 (non-idempotent, T2 race): ${v1.appends.length} effects for 1 task -> ${v1.appends.length > 1 ? 'DUPLICATE EXECUTION of already-succeeded work (canonical history says FAILED then COMPLETED)' : 'ok'}`);
  console.log(`V2 (non-idempotent, hung worker): ${v2.appends.length} effects for 1 task -> ${v2.appends.length > 1 ? 'DUPLICATE EXECUTION under genuine UNKNOWN (attempt-1 state unknowable)' : 'ok'}`);
  console.log(`V3 (idempotent-keyed, T2 race): ${v3.appends.length === 0 && v3.keyed ? 'CONVERGED to a single effect state (last-writer-wins on the deterministic key), no duplicate' : 'CHECK'}`);
})().catch((e) => { console.error('HARNESS FAILURE:', e); process.exit(1); });
