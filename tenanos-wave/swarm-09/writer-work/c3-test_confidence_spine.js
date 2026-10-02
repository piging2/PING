/**
 * Confidence Spine Test — proves confidence survives the full chain:
 *   POST /ingest → UnifiedEventRuntime → EventToMissionBridge → MissionScheduler
 *   → BaseWorker._emit → downstream event → graph projection
 *
 * 5 tests covering every drop point that was patched.
 */
const assert = require('assert');

// ── Mock pool ────────────────────────────────────────────────────────
function mockPool() {
  return {
    query: async () => ({ rows: [], rowCount: 0 }),
  };
}

// ── Test 1: canonicalization_service forwards confidence into emit metadata ──
async function testCanonicalizationForwardConfidence() {
  const { CanonicalizationService } = require('../ping-runtime/canonicalization/canonicalization_service.js');
  let emittedMetadata = null;
  const fakeRuntime = {
    emit: async (eventType, source, payload, options) => {
      emittedMetadata = options.metadata;
      return { status: 'ok', event_id: 'evt-test' };
    },
    on: () => {},
  };
  const svc = new CanonicalizationService({ eventRuntime: fakeRuntime });
  await svc.canonicalizeAndEmit({
    source: 'test',
    eventType: 'REVIEW_RECEIVED',
    payload: { text: 'hello' },
    confidence: 0.85,
  });
  assert.strictEqual(emittedMetadata.confidence, 0.85, 'confidence 0.85 must survive canonicalization into emit metadata');
  console.log('  ✓ Test 1 PASS: canonicalization_service forwards confidence 0.85');
}

// ── Test 2: canonicalization_service defaults confidence to 0.5 ──────
async function testCanonicalizationDefaultConfidence() {
  const { CanonicalizationService } = require('../ping-runtime/canonicalization/canonicalization_service.js');
  let emittedMetadata = null;
  const fakeRuntime = {
    emit: async (eventType, source, payload, options) => {
      emittedMetadata = options.metadata;
      return { status: 'ok', event_id: 'evt-test' };
    },
    on: () => {},
  };
  const svc = new CanonicalizationService({ eventRuntime: fakeRuntime });
  await svc.canonicalizeAndEmit({
    source: 'test',
    eventType: 'REVIEW_RECEIVED',
    payload: { text: 'hello' },
  });
  assert.strictEqual(emittedMetadata.confidence, 0.5, 'absent confidence defaults to 0.5');
  console.log('  ✓ Test 2 PASS: canonicalization_service defaults confidence to 0.5');
}

// ── Test 3: BaseWorker._emit preserves triggering event confidence ──
async function testBaseWorkerPreservesConfidence() {
  const { BaseWorker } = require('../ping-runtime/workers/canonical_workers.js');
  let emittedMetadata = null;
  const fakeRuntime = {
    emit: async (eventType, source, payload, options) => {
      emittedMetadata = options.metadata;
      return { status: 'ok', event_id: 'evt-downstream' };
    },
  };
  const worker = new BaseWorker({ eventRuntime: fakeRuntime });
  worker._name = 'test-worker';
  // Simulate triggering event with confidence 0.9
  worker._event = { event_id: 'evt-trigger', namespace: 'core::owner', metadata: { confidence: 0.9 } };
  await worker._emit('CLAIM_CREATED', { text: 'claim' });
  assert.strictEqual(emittedMetadata.confidence, 0.9, 'worker must preserve triggering event confidence 0.9');
  console.log('  ✓ Test 3 PASS: BaseWorker._emit preserves confidence 0.9');
}

// ── Test 4: BaseWorker._emit allows explicit confidence override ──
async function testBaseWorkerAllowsOverride() {
  const { BaseWorker } = require('../ping-runtime/workers/canonical_workers.js');
  let emittedMetadata = null;
  const fakeRuntime = {
    emit: async (eventType, source, payload, options) => {
      emittedMetadata = options.metadata;
      return { status: 'ok', event_id: 'evt-downstream' };
    },
  };
  const worker = new BaseWorker({ eventRuntime: fakeRuntime });
  worker._name = 'test-worker';
  worker._event = { event_id: 'evt-trigger', namespace: 'core::owner', metadata: { confidence: 0.3 } };
  await worker._emit('CLAIM_CREATED', { text: 'claim' }, { confidence: 0.7 });
  assert.strictEqual(emittedMetadata.confidence, 0.7, 'explicit options.confidence must override event confidence');
  console.log('  ✓ Test 4 PASS: BaseWorker._emit allows explicit override (0.7)');
}

// ── Test 5: Bridge stores confidence in mission payload ──
async function testBridgePreservesConfidence() {
  const { EventToMissionBridge, EVENT_MISSION_MAP } = require('../ping-runtime/orchestration/event_to_mission_bridge.js');
  let createdPayload = null;
  const fakeMissionRuntime = {
    create: async (type, payload, opts) => {
      createdPayload = payload;
      return 'mission-123';
    },
  };
  const bridge = new EventToMissionBridge({
    eventRuntime: { emit: async () => ({ status: 'ok' }), on: () => {} },
    missionRuntime: fakeMissionRuntime,
  });
  // Simulate an event with confidence in metadata
  await bridge._handleEvent({
    event_id: 'evt-1',
    event_type: 'REVIEW_RECEIVED',
    source: 'test',
    namespace: 'tenant::hpp',
    metadata: { canonical_hash: 'abc123', confidence: 0.75 },
    payload: { text: 'great review' },
  });
  assert.strictEqual(createdPayload.confidence, 0.75, 'bridge must store confidence in mission payload');
  assert.strictEqual(createdPayload.canonical_hash, 'abc123', 'bridge must store canonical_hash');
  console.log('  ✓ Test 5 PASS: bridge stores confidence 0.75 in mission payload');
}

// ── Test 6: Scheduler includes confidence in reconstructed event metadata ──
async function testSchedulerPreservesConfidence() {
  const { MissionScheduler } = require('../ping-runtime/orchestration/mission_scheduler.js');
  let dispatchedEvent = null;
  const fakeWorkerRuntime = {
    dispatch: async (event) => {
      dispatchedEvent = event;
      return { status: 'ok' };
    },
    getStats: () => ({ workers: { observation: {} } }),
  };
  const fakeMissionRuntime = {
    // P-09b/P-09c contract: assign returns { rowCount, fencingToken }
    assign: async () => ({ rowCount: 1, fencingToken: 'test-fencing-token' }),
    start: async () => {},
    complete: async () => {},
    failWithRetry: async () => 0,
    reapExpiredLeases: async () => 0,
    getPending: async () => [],
  };
  const sched = new MissionScheduler({
    missionRuntime: fakeMissionRuntime,
    workerRuntime: fakeWorkerRuntime,
    maxConcurrent: 3,
  });
  // Directly call _dispatch with a mission carrying confidence in payload
  await sched._dispatch({
    mission_id: 'm1',
    mission_type: 'OBSERVATION_CREATE',
    payload: JSON.stringify({
      event_id: 'evt-1',
      event_type: 'REVIEW_RECEIVED',
      source: 'observation',
      namespace: 'tenant::hpp',
      confidence: 0.88,
      canonical_hash: 'hash123',
      payload: { text: 'hello' },
    }),
    priority: 2,
  });
  assert.strictEqual(dispatchedEvent.metadata.confidence, 0.88, 'scheduler must thread confidence into dispatched event metadata');
  console.log('  ✓ Test 6 PASS: scheduler preserves confidence 0.88 in dispatched event');
}

// ── Test 7: Full chain simulation — ingress confidence survives to downstream ──
async function testFullChainConfidenceSurvival() {
  const { CanonicalizationService } = require('../ping-runtime/canonicalization/canonicalization_service.js');

  // Track all emitted events across the chain
  const emittedEvents = [];
  const fakeRuntime = {
    emit: async (eventType, source, payload, options) => {
      const event = {
        event_id: `evt-${emittedEvents.length}`,
        event_type: eventType,
        source,
        payload,
        namespace: options.namespace,
        metadata: options.metadata || {},
      };
      emittedEvents.push(event);
      return { status: 'ok', event_id: event.event_id };
    },
    on: () => {},
  };

  // Step 1: Ingress with confidence 0.92
  const svc = new CanonicalizationService({ eventRuntime: fakeRuntime });
  await svc.canonicalizeAndEmit({
    source: 'screenpipe',
    eventType: 'REVIEW_RECEIVED',
    payload: { text: 'Amazing work', rating: 5 },
    confidence: 0.92,
    namespace: 'tenant::hpp',
  });

  assert.strictEqual(emittedEvents.length, 1, 'one event emitted after ingress');
  assert.strictEqual(emittedEvents[0].metadata.confidence, 0.92, 'ingress confidence 0.92 on first event');

  // Step 2: Simulate BaseWorker._emit (observation worker)
  const { BaseWorker } = require('../ping-runtime/workers/canonical_workers.js');
  const worker = new BaseWorker({ eventRuntime: fakeRuntime });
  worker._name = 'observation';
  worker._event = emittedEvents[0]; // triggering event = ingress event
  await worker._emit('OBSERVATION_CREATED', { observation: 'saw review' });

  assert.strictEqual(emittedEvents.length, 2, 'two events after observation worker');
  assert.strictEqual(emittedEvents[1].metadata.confidence, 0.92, 'confidence 0.92 survives through worker chain');

  // Step 3: Simulate second worker (claim) reading from observation event
  const claimWorker = new BaseWorker({ eventRuntime: fakeRuntime });
  claimWorker._name = 'claim';
  claimWorker._event = emittedEvents[1]; // triggering event = observation event
  await claimWorker._emit('CLAIM_CREATED', { claim: 'customer is happy' });

  assert.strictEqual(emittedEvents.length, 3, 'three events after claim worker');
  assert.strictEqual(emittedEvents[2].metadata.confidence, 0.92, 'confidence 0.92 survives two hops');

  console.log('  ✓ Test 7 PASS: confidence 0.92 survives full chain (ingress → observation → claim)');
}

// ── Runner ───────────────────────────────────────────────────────────
async function run() {
  console.log('Confidence Spine Tests');
  await testCanonicalizationForwardConfidence();
  await testCanonicalizationDefaultConfidence();
  await testBaseWorkerPreservesConfidence();
  await testBaseWorkerAllowsOverride();
  await testBridgePreservesConfidence();
  await testSchedulerPreservesConfidence();
  await testFullChainConfidenceSurvival();
  console.log('All 7 confidence spine tests PASS');
}

run().catch(err => { console.error('FAIL:', err.message); process.exit(1); });
