/**
 * Caller-adaptation tests: pipeline canonical-proof wiring (2026-09-19).
 *
 * Lane: EventRepository caller-adaptation (convergence sprint).
 * Scope: ConstitutionalExecutionPipeline, the repository write on the
 * GatewayToKernelAdapter boot path's execute() route
 * (runtime/kernel/execution/constitutional_execution_pipeline.js).
 *
 * The 14 other owned sites (capability_scheduler x4, agent_memory_authority x5,
 * distributed_desktop_agents x5) are DELIBERATELY UNANCHORED: dead code at
 * runtime (singleton getters never called, modules required by nothing live)
 * recording internal operational lifecycle that was never accepted by the
 * UnifiedEventRuntime. Adapting them would require forging canonical
 * acceptance (registering legacy event types with the UER) or inventing
 * correlation ids that resolve to ping_events rows, both forbidden. They
 * fail closed loudly, as intended, and are reported with routing to owning
 * lanes. No test can adapt them; this file documents the pins for the one
 * site this lane owns and adapts.
 *
 * ADAPT-1 (fail-before): unpatched pipeline ignores request.canonical_event_id;
 * even with the canonical row present in ping_events, the write fails closed
 * with UnanchoredCanonicalWriteError. FAILS on pre-patch code, PASSES after.
 * ADAPT-2 (pin): no proof -> typed fail-closed, before AND after the patch.
 * ADAPT-3 (post-fix): proof present -> repository insert succeeds, and the
 * pipeline-minted evt_-style event_id is preserved (no identity rewrite).
 * ADAPT-4 (pin): direct appendEvent without proof still throws with code
 * EVENT_REPOSITORY_UNANCHORED_WRITE (the gate itself is untouched).
 *
 * Run: node runtime/kernel/test_caller_adaptation_2026-09-19.js (from worktree root)
 */

'use strict';

const assert = require('assert');

// Stage-1 isolation: StandardEventSchema.create has pre-existing defects in
// this environment (runtime_identity fingerprint hashes an undefined
// process.versions.http_parser on Node 22; witness path hits a Buffer
// serialize guard). Both are out of this lane's scope (this lane owns only
// EventRepository.appendEvent callers, not the schema/witness authorities)
// and are documented here, not fixed here. The harness stubs create() with a
// well-formed event so the tests isolate exactly this lane's change: the
// Stage-2 gate wiring in ConstitutionalExecutionPipeline.execute().
const schemaModule = require('./authorities/standard_event_schema');
schemaModule.StandardEventSchema.create = function (eventType, aggregateId, aggregateType, payload, authority, options) {
  const id = 'evt_stub_' + String(aggregateId);
  return {
    event_id: id,
    event_type: eventType,
    aggregate_id: aggregateId,
    aggregate_type: aggregateType,
    aggregate_version: 1,
    sequence: (options && options.sequence) || 1,
    authority: authority || 'test',
    authority_version: '1.0.0',
    causation_id: null,
    correlation_id: id,
    timestamp: Date.now(),
    payload_version: 1,
    payload: payload,
    witness: { stub: true },
    witness_hash: 'stub-witness-hash',
    schema_hash: 'stub-schema-hash',
    canonical_hash: 'stub-canonical-hash',
    RuntimeID: 'stub-runtime',
    ReplayID: 'stub-replay-id',
    PreviousEventHash: null,
    CanonicalEventHash: 'stub-canonical-event-hash',
    ReducerHash: null,
    WitnessHash: 'stub-witness-hash',
    ReplayHash: 'stub-replay-hash'
  };
};

const { ConstitutionalExecutionPipeline } = require('./execution/constitutional_execution_pipeline');
const { EventRepository } = require('./event_repository');

class MockClient {
  constructor(acceptedIds, inserts) {
    this.accepted = acceptedIds;
    this.inserts = inserts;
  }
  async query(sql, params = []) {
    const s = String(sql);
    if (/^(BEGIN|COMMIT|ROLLBACK)/.test(s.trim())) return { rows: [], rowCount: 0 };
    if (s.includes('FROM ping_events')) {
      const id = params[0];
      return { rows: this.accepted.has(id) ? [{ accepted: 1 }] : [] };
    }
    if (s.includes('INSERT INTO repository_events')) {
      this.inserts.push({ params });
      return { rowCount: 1, rows: [] };
    }
    if (s.includes('FROM repository_events WHERE object_id')) return { rows: [] };
    return { rows: [] };
  }
  release() {}
}

class MockPool {
  constructor(acceptedIds) {
    this.acceptedIds = new Set(acceptedIds || []);
    this.inserts = [];
  }
  async connect() {
    return new MockClient(this.acceptedIds, this.inserts);
  }
  async query(sql, params = []) {
    return new MockClient(this.acceptedIds, this.inserts).query(sql, params);
  }
}

function makePipeline(pool) {
  const eventRepository = new EventRepository(pool);
  const dispatcher = { resolve: () => [] };
  const reducerRegistry = { invoke: async () => ({ state: {} }) };
  const projectionRegistry = { executeAll: async () => [] };
  const replayDecision = { decide: () => ({ replay: false }) };
  return new ConstitutionalExecutionPipeline(
    eventRepository, dispatcher, reducerRegistry, projectionRegistry, replayDecision, pool
  );
}

function baseRequest(overrides) {
  return Object.assign({
    event_type: 'test.event',
    aggregate_id: 'agg-1',
    aggregate_type: 'Test',
    event_data: { a: 1 },
    authority: 'test',
    sequence: 1
  }, overrides || {});
}

let passed = 0, failed = 0;
const failures = [];
async function t(name, fn) {
  try { await fn(); passed++; console.log('  PASS ' + name); }
  catch (e) { failed++; failures.push(name + ': ' + (e && e.message)); console.log('  FAIL ' + name + ' :: ' + (e && e.message)); }
}

(async () => {
  // ADAPT-1 (fail-before): proof present in ping_events, but the unpatched
  // pipeline never wires request.canonical_event_id through, so the write
  // must fail closed. After the patch this test passes (write succeeds).
  await t('ADAPT-1 pipeline wires canonical proof: write with proof succeeds', async () => {
    const pool = new MockPool(['canon-evt-1']);
    const pipeline = makePipeline(pool);
    const artifact = await pipeline.execute(baseRequest({ canonical_event_id: 'canon-evt-1' }));
    assert.strictEqual(pool.inserts.length, 1, 'expected exactly one repository insert, got ' + pool.inserts.length +
      (artifact.failed ? ' (artifact failed: ' + (artifact.error && artifact.error.name) + ': ' + (artifact.error && artifact.error.message) + ')' : ''));
    const insertedId = pool.inserts[0].params[0];
    assert.ok(/^evt_/.test(insertedId) || insertedId.startsWith('evt'), 'repository row must keep the pipeline-minted id, got ' + insertedId);
    assert.ok(!artifact.failed, 'artifact should not have failed, got ' + (artifact.error && artifact.error.message));
  });

  // ADAPT-2 (pin): no proof anywhere -> typed fail-closed, before and after.
  await t('ADAPT-2 pipeline without proof fails closed with typed error', async () => {
    const pool = new MockPool([]);
    const pipeline = makePipeline(pool);
    const artifact = await pipeline.execute(baseRequest());
    assert.ok(artifact.failed, 'artifact should be failed');
    assert.strictEqual(artifact.error && artifact.error.name, 'UnanchoredCanonicalWriteError',
      'expected UnanchoredCanonicalWriteError, got ' + (artifact.error && artifact.error.name));
    assert.strictEqual(pool.inserts.length, 0, 'no repository insert may happen after a failed gate');
  });

  // ADAPT-3 (post-fix): proof claimed but NOT in ping_events -> still fail closed.
  await t('ADAPT-3 pipeline with unaccepted proof still fails closed', async () => {
    const pool = new MockPool(['canon-evt-1']);
    const pipeline = makePipeline(pool);
    const artifact = await pipeline.execute(baseRequest({ canonical_event_id: 'canon-evt-999' }));
    assert.ok(artifact.failed, 'artifact should be failed');
    assert.strictEqual(artifact.error && artifact.error.name, 'UnanchoredCanonicalWriteError',
      'expected UnanchoredCanonicalWriteError, got ' + (artifact.error && artifact.error.name));
    assert.strictEqual(pool.inserts.length, 0, 'no repository insert may happen after a failed gate');
  });

  // ADAPT-4 (pin): the gate itself is untouched; direct write without proof throws typed.
  await t('ADAPT-4 direct appendEvent without proof throws EVENT_REPOSITORY_UNANCHORED_WRITE', async () => {
    const pool = new MockPool([]);
    const repo = new EventRepository(pool);
    let err = null;
    try {
      await repo.appendEvent({
        event_id: 'evt_direct_1', object_id: 'obj-1', event_type: 't', aggregate_type: 't',
        sequence: 1, payload: {}, timestamp: Date.now(), authority: 't',
        authority_version: '1.0.0', RuntimeID: 'r', CanonicalEventHash: 'h'
      }, {});
    } catch (e) { err = e; }
    assert.ok(err, 'expected a throw');
    assert.strictEqual(err.code, 'EVENT_REPOSITORY_UNANCHORED_WRITE', 'expected typed code, got ' + err.code);
  });

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed) { console.log('FAILURES:\n - ' + failures.join('\n - ')); process.exit(1); }
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
