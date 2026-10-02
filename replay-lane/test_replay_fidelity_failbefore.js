/**
 * test_replay_fidelity_failbefore.js — adversarial fidelity proofs for the replay lane.
 *
 * Each test asserts a REQUIRED property of canonical replay. On unpatched code
 * every test FAILS, demonstrating the constitutional violation it names:
 *
 *   FB-A  replay input is the repackaged triggering event, not the persisted rows
 *   FB-B  canonical event_ids are reminted through the kernel (evt- gate)
 *   FB-C  canonical event types are silently remapped (no original vocabulary kept)
 *   FB-D1 no era is carried from the persisted rows (silent current-era defaults)
 *   FB-D2 era mismatch does not fail closed
 *   FB-E1 maxEvents truncation is silent (no INCOMPLETE)
 *   FB-E2 malformed-envelope skips are silent (verified:true on partial input)
 *   FB-F  the verdict cannot name its engine/algorithm/completeness parameters,
 *         and canonical_input_hash is a misnomer (hashes synthesized input)
 *
 * Post-fix every test PASSES. Run: node test_replay_fidelity_failbefore.js
 * (from the gateway directory).
 */

'use strict';

const assert = require('assert');
const { ReplayWorker } = require('../ping-runtime/workers/canonical_workers');
const { KernelReplayExecutionProvider } = require('./kernel_replay_execution_provider');

// ─── Test runner ──────────────────────────────────────────────────────
let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

async function run() {
  console.log('=== Replay Fidelity Fail-Before Proofs ===\n');
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`PASS ${name}`);
      passed++;
    } catch (err) {
      console.log(`FAIL ${name}`);
      console.log(`     ${err.message.split('\n')[0]}`);
      failed++;
    }
  }
  console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

// ─── Fixtures ─────────────────────────────────────────────────────────

// A persisted canonical row, shaped like a ping_events row as UnifiedEventRuntime
// writes it: JSONB payload/metadata, TIMESTAMPTZ timestamp, sequence position.
function canonicalRow({ eventId, type, seq, ts, causationId, correlationId, payload }) {
  return {
    event_id: eventId,
    event_type: type,
    source: 'fidelity-fixture',
    namespace: 'core::system',
    timestamp: ts,
    payload: payload || {},
    metadata: {
      schema_version: '1.0.0',
      namespace: 'core::system',
      causation_id: causationId || null,
      correlation_id: correlationId,
    },
    sequence: seq,
  };
}

// Stub pg pool. Records every query; returns programmed rows for the
// correlation-group load. Row order returned here is the PG ORDER BY order.
function stubPool(rows) {
  const calls = [];
  return {
    calls,
    async query(text, params) {
      calls.push({ text, params });
      return { rows: rows.map(r => ({ ...r })), rowCount: rows.length };
    },
  };
}

// Minimal in-memory event runtime so the worker can emit REPLAY_COMPLETED.
class MockEventRuntime {
  constructor() { this._emitted = []; }
  async emit(eventType, source, payload, options = {}) {
    const event = {
      event_id: `evt-mock-${this._emitted.length}`,
      event_type: eventType,
      source,
      payload,
      metadata: { ...(options.metadata || {}) },
      timestamp: new Date().toISOString(),
    };
    this._emitted.push(event);
    return { status: 'ok', eventId: event.event_id };
  }
  getEmitted() { return this._emitted; }
}

const TS = '2026-09-19T12:00:00.000Z';
function tsPlus(sec) {
  return new Date(new Date(TS).getTime() + sec * 1000).toISOString();
}

// ─── FB-A: replay input must be the persisted correlation group ────────

test('FB-A: replay consumes persisted rows, not the repackaged trigger', async () => {
  const rows = [
    canonicalRow({ eventId: 'event_fb_a_1', type: 'REVIEW_RECEIVED', seq: 101, ts: tsPlus(0), correlationId: 'corr-fb-a', payload: { stars: 5 } }),
    canonicalRow({ eventId: 'event_fb_a_2', type: 'OBSERVATION_CREATED', seq: 102, ts: tsPlus(1), causationId: 'event_fb_a_1', correlationId: 'corr-fb-a' }),
    canonicalRow({ eventId: 'event_fb_a_3', type: 'CLAIM_CREATED', seq: 103, ts: tsPlus(2), causationId: 'event_fb_a_2', correlationId: 'corr-fb-a' }),
  ];
  const pool = stubPool(rows);
  const eventRuntime = new MockEventRuntime();
  const worker = new ReplayWorker({
    eventRuntime,
    replayProvider: new KernelReplayExecutionProvider(),
    pool,
  });

  const result = await worker.handle({
    event_id: 'event_fb_a_trigger',
    event_type: 'REPLAY_VERIFY',
    payload: { documentId: 'doc-fb-a' },
    metadata: { correlation_id: 'corr-fb-a', namespace: 'core::system' },
    namespace: 'core::system',
    timestamp: TS,
  });

  assert.ok(pool.calls.length > 0, 'worker never queried the canonical store for the correlation group');
  assert.equal(result.replay.event_count, 3,
    `expected the 3 persisted rows as replay input, got event_count=${result.replay.event_count}`);
});

// ─── FB-B: canonical event identity must survive the kernel ────────────

test('FB-B: canonical event_ids survive the kernel (no reminting)', async () => {
  const provider = new KernelReplayExecutionProvider();
  const events = [
    { event_id: 'event_fb_b_1', event_type: 'artifact_commit', timestamp: TS, payload: { x: 1 }, metadata: {} },
    { event_id: 'event_fb_b_2', event_type: 'artifact_commit', timestamp: tsPlus(1), payload: { x: 2 }, metadata: {} },
  ];
  const result = await provider.executeReplay({ state: { replay_events: events } });

  assert.equal(result.status, 'ok', `expected ok, got ${result.status}`);
  // canonical_bytes.bytes is base64url of the canonical envelope stream JSON.
  const streamJson = Buffer.from(result.canonical_bytes.bytes, 'base64url').toString('utf8');
  assert.ok(streamJson.includes('event_fb_b_1'),
    'canonical event_id event_fb_b_1 is absent from the kernel input stream (reminted away)');
  assert.ok(streamJson.includes('event_fb_b_2'),
    'canonical event_id event_fb_b_2 is absent from the kernel input stream (reminted away)');
  assert.ok(!streamJson.includes('evt-ping-'),
    'kernel stream contains reminted evt-ping- identities instead of canonical IDs');
});

// ─── FB-C: original event vocabulary must be recorded, not silenced ───

test('FB-C: verdict records the original canonical event types', async () => {
  const eventRuntime = new MockEventRuntime();
  const worker = new ReplayWorker({
    eventRuntime,
    replayProvider: new KernelReplayExecutionProvider(),
  });

  const result = await worker.handle({
    event_id: 'evt-fb-c-trigger',
    event_type: 'REPLAY_VERIFY',
    payload: {
      documentId: 'doc-fb-c',
      replay_events: [
        { event_id: 'evt-fb-c-1', event_type: 'REVIEW_RECEIVED', timestamp: TS, payload: { stars: 5 }, metadata: {} },
        { event_id: 'evt-fb-c-2', event_type: 'OBSERVATION_CREATED', timestamp: tsPlus(1), payload: {}, metadata: {} },
      ],
    },
    metadata: {},
  });

  assert.equal(result.replay.verified, true, 'clean input should verify');
  assert.ok(Array.isArray(result.replay.event_types),
    'verdict carries no original event vocabulary (types silently remapped)');
  assert.ok(result.replay.event_types.includes('REVIEW_RECEIVED'),
    'original canonical type REVIEW_RECEIVED missing from the verdict');
  assert.ok(Array.isArray(result.replay.event_type_map) && result.replay.event_type_map.length === 2,
    'verdict does not record the kernel type modeling per event');
});

// ─── FB-D1: era must be carried from persisted rows, never defaulted ──

test('FB-D1: verdict carries the row-declared era and names version provenance', async () => {
  const rows = [
    canonicalRow({ eventId: 'event_fb_d_1', type: 'REVIEW_RECEIVED', seq: 201, ts: TS, correlationId: 'corr-fb-d' }),
  ];
  const pool = stubPool(rows);
  const eventRuntime = new MockEventRuntime();
  const worker = new ReplayWorker({
    eventRuntime,
    replayProvider: new KernelReplayExecutionProvider(),
    pool,
  });

  const result = await worker.handle({
    event_id: 'event_fb_d_trigger',
    event_type: 'REPLAY_VERIFY',
    payload: { documentId: 'doc-fb-d' },
    metadata: { correlation_id: 'corr-fb-d', namespace: 'core::system' },
    namespace: 'core::system',
    timestamp: TS,
  });

  assert.equal(result.replay.verified, true, 'clean canonical input should verify');
  assert.equal(result.replay.input_era, '1.0.0',
    `verdict does not carry the persisted row era, got input_era=${result.replay.input_era}`);
  assert.ok(result.replay.era && result.replay.era.envelope_schema_version.source === 'provider-declared',
    'verdict does not distinguish provider-declared versions from row-declared era');
});

// ─── FB-D2: era mismatch must fail closed ─────────────────────────────

test('FB-D2: unknown row era fails closed (no silent current-era replay)', async () => {
  const row = canonicalRow({ eventId: 'event_fb_d2_1', type: 'REVIEW_RECEIVED', seq: 301, ts: TS, correlationId: 'corr-fb-d2' });
  row.metadata.schema_version = '9.9.9';
  const pool = stubPool([row]);
  const eventRuntime = new MockEventRuntime();
  const worker = new ReplayWorker({
    eventRuntime,
    replayProvider: new KernelReplayExecutionProvider(),
    pool,
  });

  const result = await worker.handle({
    event_id: 'event_fb_d2_trigger',
    event_type: 'REPLAY_VERIFY',
    payload: { documentId: 'doc-fb-d2' },
    metadata: { correlation_id: 'corr-fb-d2', namespace: 'core::system' },
    namespace: 'core::system',
    timestamp: TS,
  });

  assert.equal(result.replay.verified, false,
    'a row declaring an unsupported era must never verify under current semantics');
  assert.equal(result.replay.reason, 'era_mismatch',
    `expected reason era_mismatch, got ${result.replay.reason}`);
});

// ─── FB-E1: maxEvents truncation must be explicit INCOMPLETE ──────────

test('FB-E1: maxEvents truncation yields INCOMPLETE, never silent', async () => {
  const provider = new KernelReplayExecutionProvider();
  const events = [0, 1, 2].map(i => ({
    event_id: `event_fb_e1_${i}`,
    event_type: 'artifact_commit',
    timestamp: tsPlus(i),
    payload: { i },
    metadata: {},
  }));
  const result = await provider.executeReplay({ state: { replay_events: events } }, { maxEvents: 1 });

  assert.equal(result.completeness, 'INCOMPLETE',
    `truncated input must be INCOMPLETE, got completeness=${result.completeness}`);
  assert.equal(result.input_truncated, true, 'input_truncated flag missing');
  assert.equal(result.input_event_count, 3, 'input_event_count must name the full window');
  assert.equal(result.event_count, 1, 'only 1 event should have been replayed');
});

// ─── FB-E2: malformed-envelope skips must fail closed ─────────────────

test('FB-E2: skipped malformed input cannot verify', async () => {
  const eventRuntime = new MockEventRuntime();
  const worker = new ReplayWorker({
    eventRuntime,
    replayProvider: new KernelReplayExecutionProvider(),
  });

  const result = await worker.handle({
    event_id: 'evt-fb-e2-trigger',
    event_type: 'REPLAY_VERIFY',
    payload: {
      documentId: 'doc-fb-e2',
      replay_events: [
        { event_id: 'evt-fb-e2-1', event_type: 'artifact_commit', timestamp: TS, payload: { ok: true }, metadata: {} },
        null,
        { event_id: 'evt-fb-e2-3', event_type: 'artifact_commit', timestamp: tsPlus(2), payload: { ok: true }, metadata: {} },
      ],
    },
    metadata: {},
  });

  assert.equal(result.replay.verified, false,
    'a replay that silently dropped an input must never verify');
  assert.equal(result.replay.reason, 'incomplete_input_set',
    `expected reason incomplete_input_set, got ${result.replay.reason}`);
  assert.equal(result.replay.inputs_skipped, 1, 'inputs_skipped must count the dropped input');
});

// ─── FB-F: verdict must name its own reproduction parameters ──────────

test('FB-F: verdict binds engine/algorithm/completeness and an honest input hash', async () => {
  const eventRuntime = new MockEventRuntime();
  const worker = new ReplayWorker({
    eventRuntime,
    replayProvider: new KernelReplayExecutionProvider(),
  });

  const result = await worker.handle({
    event_id: 'evt-fb-f-trigger',
    event_type: 'REPLAY_VERIFY',
    payload: {
      documentId: 'doc-fb-f',
      replay_events: [
        { event_id: 'evt-fb-f-1', event_type: 'artifact_commit', timestamp: TS, payload: { x: 1 }, metadata: {} },
      ],
    },
    metadata: {},
  });

  const replay = result.replay;
  assert.equal(replay.verified, true, 'clean input should verify');
  assert.equal(replay.replay_engine_version, 'v1', 'verdict does not name the replay engine version');
  assert.equal(replay.witness_algorithm_version, 'merkle_sha256_v1', 'verdict does not name the witness algorithm');
  assert.equal(replay.witness_version, 'v1', 'verdict does not name the witness version');
  assert.equal(replay.completeness, 'COMPLETE', 'verdict does not state completeness');
  assert.equal(replay.input_event_count, 1, 'verdict does not state the input count');
  assert.equal(replay.input_source, 'test-mode', 'verdict does not mark test-mode input');

  const emitted = eventRuntime.getEmitted();
  assert.equal(emitted.length, 1, 'expected one REPLAY_COMPLETED emission');
  const hash = emitted[0].payload.authority && emitted[0].payload.authority.canonical_input_hash;
  assert.ok(/^[0-9a-f]{64}$/.test(hash || ''),
    `canonical_input_hash must be a sha256 over the consumed input, got ${hash}`);
});

run();
