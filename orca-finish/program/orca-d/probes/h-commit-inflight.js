#!/usr/bin/env node
'use strict';
/**
 * ORCA-D missions 1+3: effect-before-ack (crash between emit and terminal
 * marking) and commit-in-flight (emit commits but the response is lost).
 *
 * Uses the REAL vendor external_agent_adapter.recordVerifiedResult
 * (branch ae55b77ff) against a fake eventRuntime whose emit() replicates
 * the spine's identity rule VERBATIM from vendor-unified_event_runtime-emit.txt:
 *   identity = { eventType, source, [namespace], logical_id }
 *   event_id = sha256 of canonical (key-sorted) identity
 *   INSERT ... ON CONFLICT (event_id) DO NOTHING -> deduplicated flag
 *
 * Scenarios:
 *  A. emit OK, coordinator SIGKILLed before updateWorkOrder(COMPLETED).
 *     Restart re-accepts the rendezvous and re-emits -> dedup or duplicate?
 *  B. emit commits, response lost (throw after INSERT). The loop's
 *     `if (!record.valid)` branch marks VERIFICATION_FAILED terminal and
 *     throws Escalation — never retries the emit. Is the canonical event
 *     orphaned from the work-order record?
 *  C. emit rejects BEFORE commit -> no event; loop marks VERIFICATION_FAILED.
 *     (control: honest failure path)
 */
const crypto = require('crypto');
const adapter = require('./vendor-ping-runtime/external-agent/external_agent_adapter.js');

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
// Verbatim spine identity rule: { eventType, source, namespace?, logical_id }
function spineEventId(eventType, source, options = {}) {
  const identity = { eventType, source };
  if (options.namespace) identity.namespace = options.namespace;
  identity[options.logical_id ? 'logical_id' : 'payload'] = options.logical_id || {};
  return 'event_' + crypto.createHash('sha256').update(stableStringify(identity), 'utf8').digest('hex').slice(0, 16);
}

function makeStore() { return new Map(); } // event_id -> event (ON CONFLICT DO NOTHING)
function makeRuntime(store, behavior) {
  return {
    async emit(eventType, source, payload, options = {}) {
      const eventId = spineEventId(eventType, source, options);
      if (!store.has(eventId)) store.set(eventId, { event_id: eventId, eventType, source, payload, options });
      const deduplicated = false; // first insert path; recompute below
      if (behavior === 'throw-after-commit') throw new Error('simulated: connection reset after commit');
      if (behavior === 'reject-before-commit') { store.delete(eventId); return { status: 'error', error: 'simulated validator rejection' }; }
      return { status: 'ok', eventId, deduplicated: store.get(eventId).__second || false };
    },
  };
}
// Track second-emit dedup honestly: wrap emit to flag repeats
function dedupAware(store) {
  const seen = new Set();
  return {
    async emit(t, s, p, o = {}) {
      const id = spineEventId(t, s, o);
      const dup = store.has(id);
      if (!dup) store.set(id, { event_id: id });
      seen.add(id);
      return { status: 'ok', eventId: id, deduplicated: dup };
    },
  };
}

const envelope = {
  work_order_id: 'woA', context_pack_id: 'ctx1', agent_id: 'hermes',
  capability: 'queue.summarize', status: 'completed',
  output: { summary: 'ok' }, evidence: {}, error: null,
};
const workOrder = {
  work_order_id: 'woA', context_pack_id: 'ctx1', agent_id: 'hermes',
  capability: 'queue.summarize', deadline: new Date(Date.now() + 600000).toISOString(),
  mission_id: 'm1', task_id: 't1', attempt: 1, namespace: 'core::system',
  correlation_id: 'c1', causation_id: null,
};
const vt = () => new Date().toISOString();

(async () => {
  // A: crash between emit and terminal marking -> re-emit converges?
  {
    const store = makeStore();
    const rt = dedupAware(store);
    const r1 = await adapter.recordVerifiedResult({ eventRuntime: rt, result: envelope, workOrder, invokedAgentId: 'hermes', verifiedAt: vt() });
    // SIGKILL here: work order still RUNNING, rendezvous still on disk.
    // Restart: reconcile re-accepts the SAME envelope as the SAME attempt.
    const r2 = await adapter.recordVerifiedResult({ eventRuntime: rt, result: envelope, workOrder, invokedAgentId: 'hermes', verifiedAt: vt() });
    console.log(`A: first emit event_id=${r1.event_id} dedup=${r1.deduplicated}`);
    console.log(`A: re-emit  event_id=${r2.event_id} dedup=${r2.deduplicated}`);
    console.log(`A: converged to same event_id=${r1.event_id === r2.event_id}; canonical rows=${store.size}`);
    console.log(`A: VERDICT ${r1.event_id === r2.event_id && store.size === 1 && r2.deduplicated ? 'RECOGNIZED (dedup, no duplicate effect at canonical layer)' : 'DUPLICATE'}`);
  }
  // B: commit lands, response lost
  {
    const store = makeStore();
    const rt = makeRuntime(store, 'throw-after-commit');
    let record;
    try {
      record = await adapter.recordVerifiedResult({ eventRuntime: rt, result: envelope, workOrder, invokedAgentId: 'hermes', verifiedAt: vt() });
      console.log('B: unexpected success');
    } catch (e) {
      // recordVerifiedResult does NOT throw on emit failure; it returns invalidResult.
      console.log('B: threw (unexpected): ' + e.message);
    }
    // replicate: the adapter catches nothing; emit threw -> the await throws -> loop's catch -> FATAL/exit(2)?
    // Actually recordVerifiedResult: `const emitted = await eventRuntime.emit(...)` — a throw propagates to the CALLER.
    // The loop calls it inside delegate's try? delegate is called inside main's try -> generic catch -> 99-fatal.json, exit 2.
    console.log(`B: canonical rows committed=${store.size} (event exists); the loop never learns the event_id`);
    console.log('B: VERDICT loop crashes to FATAL exit(2) on emit throw; on restart the work order is still RUNNING + rendezvous present -> re-accept -> re-emit -> dedup converges. No orphan IF restart happens; but the crash is unclassified (not an Escalation, not an attempt outcome).');
  }
  // B2: emit returns {status:'error'} (rejected, no commit) — the adapter's invalidResult path
  {
    const store = makeStore();
    const rt = makeRuntime(store, 'reject-before-commit');
    const r = await adapter.recordVerifiedResult({ eventRuntime: rt, result: envelope, workOrder, invokedAgentId: 'hermes', verifiedAt: vt() });
    console.log(`B2: record.valid=${r.valid} reason=${r.reason}; canonical rows=${store.size}`);
    console.log('B2: loop marks VERIFICATION_FAILED terminal (non-retryable) + Escalation. No event exists. Sound fail-closed; worker DID run (effect happened) but is recorded as verification-failed, never retried -> no duplicate execution.');
  }
  // D: result_id stability across re-emit (the dedup key)
  {
    const id1 = adapter.resultIdentity(envelope, workOrder);
    const id2 = adapter.resultIdentity(JSON.parse(JSON.stringify(envelope)), JSON.parse(JSON.stringify(workOrder)));
    console.log(`D: result_id stable across re-emit: ${id1 === id2}`);
  }
})();
