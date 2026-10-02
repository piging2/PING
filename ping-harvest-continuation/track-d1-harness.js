'use strict';
/**
 * TRACK D1 (context compounding proof) controlled end-to-end harness.
 * Run on the Pig worktree /home/nolan/worktrees/ping-harvest-12h:
 *   node /tmp/track-d1-harness.js
 *
 * TASK 10: event -> graph node -> later mission -> ContextCompiler pack ->
 *           knowledge_refs relevance + worker consumption.
 * TASK 11: event -> observation -> claim propagation of namespace, source
 *           (originator), causation, correlation, knowledge_refs; cross-namespace
 *           leakage; stale context reuse.
 *
 * All stores are in-memory stubs seeded to mirror the live code paths:
 *  - graph nodes seeded exactly as gateway_runtime.js graph projection writes
 *    them (confidence from event.metadata.confidence; 0.5 default from the
 *    CanonicalizationService boundary when the producer passes none).
 *  - the compiler is the REAL ContextCompiler from the worktree.
 *  - the workers are the REAL ObservationWorker / ClaimWorker from the worktree.
 */
const assert = require('assert');
const WT = '/home/nolan/worktrees/ping-harvest-12h';
const { ContextCompiler } = require(WT + '/ping-runtime/context/context_compiler.js');
const { ObservationWorker, ClaimWorker } = require(WT + '/ping-runtime/workers/canonical_workers.js');

const NS_PLUMB = 'tenant::plumbing';
const NS_HVAC = 'tenant::hvac';

let passed = 0, failed = 0;
const failures = [];
const pending = [];
function check(name, fn) {
  const done = () => { passed++; console.log('  PASS ' + name); };
  const fail = (e) => { failed++; failures.push(name + ' :: ' + (e && e.message || e)); console.log('  FAIL ' + name + ' :: ' + (e && e.message || e)); };
  try {
    const r = fn();
    if (r && typeof r.then === 'function') pending.push(r.then(done, fail));
    else done();
  } catch (e) { fail(e); }
}

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

// The triggering business event (shape mirrors UnifiedEventRuntime.emit).
const reviewEvent = {
  event_id: 'evt-review-1',
  event_type: 'REVIEW_RECEIVED',
  source: 'review-emitter',
  namespace: NS_PLUMB,
  timestamp: '2026-09-18T10:00:00Z',
  payload: { review_id: 'rev-001', customer_id: 'cust-42', text: 'Tech fixed the leak fast, 5 stars' },
  metadata: {
    namespace: NS_PLUMB,
    correlation_id: 'corr-review-1',
    causation_id: null,
    confidence: 0.5, // CanonicalizationService default: "observations are not knowledge"
  },
};

// Graph nodes seeded the way the live projection writes them:
//   knowledgeGraph.addNode('event', label, {...}, {
//     namespace: event.namespace,
//     confidence: event.metadata?.confidence != null ? event.metadata.confidence : null,
//     status: 'candidate', sourceEventId: event.event_id, ...})
const graphNodes = [
  { node_id: 'node-a-biz', node_type: 'event', entity_type: null, entity_id: null,
    label: 'REVIEW_RECEIVED rev-001', namespace: NS_PLUMB, status: 'candidate',
    confidence: 0.5, source_event_id: 'evt-review-1', created_at: '2026-09-18T10:01:00Z' },
  { node_id: 'node-b-inf', node_type: 'inference', entity_type: null, entity_id: null,
    label: 'inference: leak complaint response template', namespace: NS_PLUMB, status: 'candidate',
    confidence: 0.8, source_event_id: 'evt-inf-1', created_at: '2026-09-18T10:02:00Z' },
  { node_id: 'node-c-irr', node_type: 'event', entity_type: null, entity_id: null,
    label: 'water heater install price list Q3', namespace: NS_PLUMB, status: 'candidate',
    confidence: 0.9, source_event_id: 'evt-price-1', created_at: '2026-09-18T10:03:00Z' },
  { node_id: 'node-d-xns', node_type: 'event', entity_type: null, entity_id: null,
    label: 'REVIEW_RECEIVED hvac rev-9', namespace: NS_HVAC, status: 'candidate',
    confidence: 0.95, source_event_id: 'evt-review-9', created_at: '2026-09-18T10:04:00Z' },
  { node_id: 'node-e-stale', node_type: 'event', entity_type: null, entity_id: null,
    label: 'ancient drain cleaning note', namespace: NS_PLUMB, status: 'candidate',
    confidence: 0.8, source_event_id: 'evt-old-1', created_at: '2024-01-05T00:00:00Z' },
];

function makeGraph(nodes) {
  return {
    async queryNodes(options = {}) {
      let rows = nodes.slice();
      if (options.namespace) rows = rows.filter(n => n.namespace === options.namespace);
      if (options.status) rows = rows.filter(n => n.status === options.status);
      rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)); // created_at DESC, like the SQL
      if (options.limit) rows = rows.slice(0, options.limit);
      return rows;
    },
  };
}

const eventRuntimeStub = {
  async getCorrelationGroup(correlationId, limit, namespace) {
    return { status: 'ok', correlation_id: correlationId, events: [reviewEvent] };
  },
};
const evidenceStub = {
  async accumulate(ids) { return [reviewEvent]; },
};

// Capturing event runtime for workers (mirrors WorkerRuntime.dispatch _event setup).
function makeWorkerHarness(worker) {
  const emitted = [];
  const runtime = {
    async emit(eventType, source, payload, options = {}) {
      emitted.push({ eventType, source, payload, options });
      return { status: 'ok', eventId: 'evt-emitted-' + emitted.length };
    },
  };
  worker._eventRuntime = runtime;
  return {
    emitted,
    async handle(event) {
      worker._event = event; // what WorkerRuntime.dispatch does
      try { return await worker.handle(event); }
      finally { worker._event = null; }
    },
  };
}

async function main() {
  console.log('== TASK 10: KG -> ContextCompiler loop ==');

  const compiler = new ContextCompiler({
    eventRuntime: eventRuntimeStub,
    evidenceAuthority: evidenceStub,
    knowledgeGraph: makeGraph(graphNodes),
  });
  const pack = await compiler.compile({
    missionId: 'mission-review-1',
    query: 'mission REVIEW_RESPONSE for REVIEW_RECEIVED',
    correlationId: 'corr-review-1',
    namespace: NS_PLUMB,
  });
  const refIds = (pack.knowledge_refs || []).map(r => r.node_id);
  console.log('  pack id: ' + pack.context_pack_id + ' | knowledge_refs: ' + JSON.stringify(refIds));

  check('pack contains knowledge_refs (query returned something)', () => {
    assert.ok(Array.isArray(pack.knowledge_refs) && pack.knowledge_refs.length > 0);
  });
  check('inference node at 0.8 boundary IS injected (node-b-inf)', () => {
    assert.ok(refIds.includes('node-b-inf'), 'expected node-b-inf in ' + JSON.stringify(refIds));
  });
  check('BREAKPOINT: business event node at 0.5 confidence is NOT injected (node-a-biz)', () => {
    assert.ok(!refIds.includes('node-a-biz'),
      'node-a-biz (the 19-type business-event write loop output) present: ' + JSON.stringify(refIds));
  });
  check('IRRELEVANT same-namespace node IS injected (node-c-irr: price list in a review mission)', () => {
    assert.ok(refIds.includes('node-c-irr'), 'expected node-c-irr in ' + JSON.stringify(refIds));
  });
  check('no cross-namespace leakage (node-d-xns absent)', () => {
    assert.ok(!refIds.includes('node-d-xns'));
  });
  check('STALE node injected with no freshness signal (node-e-stale, created 2024-01)', () => {
    assert.ok(refIds.includes('node-e-stale'));
    const ref = pack.knowledge_refs.find(r => r.node_id === 'node-e-stale');
    assert.ok(!('created_at' in ref), 'ref unexpectedly carries created_at');
    assert.ok(!('updated_at' in ref) && !('age_days' in ref));
  });
  check('knowledge ref shape carries no timestamp (staleness invisible to consumers)', () => {
    const keys = Object.keys(pack.knowledge_refs[0]).sort();
    assert.deepStrictEqual(keys, ['confidence','entity_id','entity_type','label','node_id','node_type','source_event_id','status']);
  });
  check('pack ID does not cover knowledge_refs (staleness hazard per sprint report)', async () => {
    const compiler2 = new ContextCompiler({
      eventRuntime: eventRuntimeStub, evidenceAuthority: evidenceStub,
      knowledgeGraph: makeGraph(graphNodes.filter(n => n.node_id !== 'node-c-irr')),
    });
    const pack2 = await compiler2.compile({
      missionId: 'mission-review-1', query: 'mission REVIEW_RESPONSE for REVIEW_RECEIVED',
      correlationId: 'corr-review-1', namespace: NS_PLUMB,
    });
    assert.strictEqual(pack2.context_pack_id, pack.context_pack_id,
      'pack IDs differ: ' + pack2.context_pack_id + ' vs ' + pack.context_pack_id);
    assert.notDeepStrictEqual(
      (pack2.knowledge_refs || []).map(r => r.node_id).sort(),
      refIds.slice().sort());
  });

  console.log('== TASK 10: worker consumption ==');
  // ObservationWorker with pack attached (what MissionScheduler does at H20).
  const obsH = makeWorkerHarness(new ObservationWorker());
  const eventWithPack = { ...reviewEvent, context_pack: pack };
  const obsResultNoPack = await makeWorkerHarness(new ObservationWorker()).handle({ ...reviewEvent });
  const obsResult = await obsH.handle(eventWithPack);
  const obsEmitted = obsH.emitted[0];

  check('ObservationWorker emits OBSERVATION_CREATED', () => {
    assert.strictEqual(obsEmitted.eventType, 'OBSERVATION_CREATED');
  });
  check('observation carries context_pack_id + knowledge_refs (passthrough)', () => {
    assert.strictEqual(obsEmitted.payload.context_pack_id, pack.context_pack_id);
    assert.deepStrictEqual(obsEmitted.payload.context_knowledge_refs, pack.knowledge_refs);
  });
  check('worker EXTRACTION behavior is identical with/without knowledge (no behavioral consumption)', () => {
    const strip = (o) => { const c = { ...o }; delete c.timestamp; delete c.context_pack_id; delete c.context_evidence_refs; delete c.context_knowledge_refs; return c; };
    assert.deepStrictEqual(strip(obsResult.observation), strip(obsResultNoPack.observation));
  });

  // ClaimWorker on the observation event.
  const claimH = makeWorkerHarness(new ClaimWorker());
  const obsEvent = {
    event_id: 'evt-obs-1', event_type: 'OBSERVATION_CREATED', source: 'observation',
    namespace: NS_PLUMB, timestamp: '2026-09-18T10:05:00Z',
    payload: obsEmitted.payload,
    metadata: { namespace: NS_PLUMB, correlation_id: 'corr-review-1', causation_id: 'evt-review-1', confidence: 0.5 },
  };
  const claimResult = await claimH.handle(obsEvent);
  const claimEmitted = claimH.emitted[0];

  check('ClaimWorker emits CLAIM_CREATED', () => {
    assert.strictEqual(claimEmitted.eventType, 'CLAIM_CREATED');
  });
  check('claim carries all three lineage fields end to end', () => {
    assert.strictEqual(claimEmitted.payload.context_pack_id, pack.context_pack_id);
    assert.deepStrictEqual(claimEmitted.payload.context_knowledge_refs, pack.knowledge_refs);
    assert.deepStrictEqual(claimEmitted.payload.context_evidence_refs, pack.evidence_refs);
  });

  console.log('== TASK 11: propagation fields ==');
  check('namespace survives observation hop', () => {
    assert.strictEqual(obsEmitted.options.namespace, NS_PLUMB);
  });
  check('namespace survives claim hop', () => {
    assert.strictEqual(claimEmitted.options.namespace, NS_PLUMB);
  });
  check('correlation_id survives both hops', () => {
    assert.strictEqual(obsEmitted.options.correlation_id, 'corr-review-1');
    assert.strictEqual(claimEmitted.options.correlation_id, 'corr-review-1');
  });
  check('causation forms a strict parent chain (obs->review, claim->obs)', () => {
    assert.strictEqual(obsEmitted.options.causation_id, 'evt-review-1');
    assert.strictEqual(claimEmitted.options.causation_id, 'evt-obs-1');
  });
  check('originator (source) is the worker at each hop', () => {
    assert.strictEqual(obsEmitted.source, 'observation');
    assert.strictEqual(claimEmitted.source, 'claim');
  });
  check('confidence inherited with provenance tag at each hop', () => {
    assert.strictEqual(obsEmitted.options.metadata.confidence, 0.5);
    assert.strictEqual(obsEmitted.options.metadata.confidence_source, 'inherited');
    assert.strictEqual(claimEmitted.options.metadata.confidence, 0.5);
    assert.strictEqual(claimEmitted.options.metadata.confidence_source, 'inherited');
  });
  check('compiler rejects namespace-mixed correlation group (fail-closed, no silent mixing)', async () => {
    const badRuntime = {
      async getCorrelationGroup() {
        return { status: 'ok', events: [
          { ...reviewEvent },
          { ...reviewEvent, event_id: 'evt-review-2', namespace: NS_HVAC,
            metadata: { ...reviewEvent.metadata, namespace: NS_HVAC } },
        ] };
      },
    };
    const badCompiler = new ContextCompiler({
      eventRuntime: badRuntime,
      evidenceAuthority: { async accumulate() { return []; } },
      knowledgeGraph: makeGraph(graphNodes),
    });
    let threw = false;
    try {
      await badCompiler.compile({ missionId: 'm', query: 'q', correlationId: 'corr-review-1', namespace: NS_PLUMB });
    } catch (e) { threw = /namespace mismatch/.test(e.message); }
    assert.ok(threw, 'expected namespace-mismatch throw');
  });
  check('knowledge read itself is namespace-scoped (queryNodes receives namespace)', async () => {
    const seen = [];
    const spyGraph = { async queryNodes(o) { seen.push(o); return []; } };
    const c = new ContextCompiler({ eventRuntime: eventRuntimeStub, evidenceAuthority: evidenceStub, knowledgeGraph: spyGraph });
    await c.compile({ missionId: 'm', query: 'q', correlationId: 'corr-review-1', namespace: NS_PLUMB });
    assert.ok(seen.length === 2 && seen.every(o => o.namespace === NS_PLUMB), JSON.stringify(seen));
  });

  await Promise.all(pending);
  console.log('\nFINAL: ' + passed + ' passed, ' + failed + ' failed');
  if (failures.length) { console.log('FAILURES:'); failures.forEach(f => console.log('  - ' + f)); process.exitCode = 1; }
}

main().catch(e => { console.error('HARNESS ERROR: ' + (e && e.stack || e)); process.exitCode = 2; });
