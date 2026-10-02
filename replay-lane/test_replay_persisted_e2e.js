'use strict';

/**
 * Positive end-to-end proof: replay of a persisted multi-event correlation
 * group preserves every event_id, namespace, semantic payload, metadata,
 * ordering, and completeness, and a witness attests to the honest verdict.
 *
 * The canonical store is emulated by a high-fidelity stub pool: rows are
 * shaped exactly as node-pg returns them (Date timestamps, JSONB objects,
 * integer/NULL sequences), filtered and ordered by the same contract the
 * worker's SQL names. The SQL text itself is asserted, so the query contract
 * is proven at the boundary the stub cannot see.
 *
 * What this proves:
 *  1. The worker queries the canonical store for the correlation group
 *     (never repackages the trigger).
 *  2. Every canonical event_id reaches the kernel verbatim (no reminting).
 *  3. The Lane A ordering contract holds (sequence NULLS FIRST, then
 *     timestamp, then event_id), including legacy NULL-sequence rows.
 *  4. Namespace, semantic payload, and metadata survive into the kernel
 *     proof content.
 *  5. Original canonical event types are recorded on the verdict.
 *  6. The row-declared era is carried with provenance; provider-declared
 *     machinery versions are labeled as such.
 *  7. canonical_input_hash is the sha256 of the exact rows consumed.
 *  8. Completeness is COMPLETE and the verdict verifies.
 *  9. The run is deterministic across executions.
 * 10. A WitnessWorker attests to the honest verdict from the canonical
 *     REPLAY_COMPLETED row (witness code itself untouched).
 */

const { strict: assert } = require('assert');
const { createHash } = require('crypto');
const {
  ReplayWorker,
  WitnessWorker,
} = require('../ping-runtime/workers/canonical_workers.js');
const { KernelReplayExecutionProvider } = require('./kernel_replay_execution_provider');
const { CanonicalJson } = require('./replay/kernel/canonical_json');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL ${name}`);
    console.log(`       ${err.message}`);
  }
}

class MockEventRuntime {
  constructor() { this._emitted = []; }
  async emit(eventType, source, payload, options = {}) {
    const event = {
      event_id: `evt-e2e-row-${this._emitted.length + 1}`,
      event_type: eventType,
      source,
      payload,
      metadata: { ...(options.metadata || {}), causation_id: options.causation_id },
      timestamp: new Date().toISOString(),
    };
    this._emitted.push(event);
    return { status: 'ok', event_id: event.event_id };
  }
}

// ---------------------------------------------------------------------------
// Fixture: a persisted correlation group, shaped as node-pg returns it.
// ---------------------------------------------------------------------------
const CORR = 'corr-e2e-persisted-001';
const NS = 'tenant::hpp';

function persistedRow(event_id, event_type, sequence, isoTs, payload, metadataExtra) {
  return {
    event_id,
    event_type,
    source: 'ping-runtime',
    namespace: NS,
    timestamp: new Date(isoTs), // node-pg returns timestamptz as Date
    payload,                    // JSONB arrives as an object
    metadata: {
      schema_version: '1.0.0',
      correlation_id: CORR,
      namespace: NS,
      ...metadataExtra,
    },
    sequence,                   // integer or NULL for legacy rows
  };
}

const PERSISTED_ROWS = [
  persistedRow('event_e2e_001', 'OBSERVATION_CREATED', null,
    '2026-08-21T10:00:00.000Z',
    { text: 'first observation', channel: 'review' },
    { confidence: 0.91, confidence_source: 'model' }),  persistedRow('event_e2e_002', 'CLAIM_CREATED', 41,
    '2026-08-21T10:00:01.000Z',
    { claim: 'claim derived from first observation' },
    { confidence: 0.88, causation_id: 'event_e2e_001' }),
  persistedRow('event_e2e_003', 'CLASSIFICATION_CREATED', 42,
    '2026-08-21T10:00:02.000Z',
    { category: 'customer-feedback', priority: 'medium' },
    { confidence: 0.93, causation_id: 'event_e2e_002' }),
  // Legacy row: predates the sequence column, but observed later. The Lane A
  // contract (sequence NULLS FIRST) places it before the sequenced rows.
  persistedRow('event_e2e_004', 'OBSERVATION_CREATED', null,
    '2026-08-21T10:00:03.000Z',
    { text: 'legacy late observation' },
    { confidence: 0.84 }),
];

// Lane A deterministic order: NULL sequences first (by timestamp), then
// sequence, then timestamp, then event_id.
const EXPECTED_ORDER = ['event_e2e_001', 'event_e2e_004', 'event_e2e_002', 'event_e2e_003'];

// The worker's documented normalization contract, mirrored here so the proof
// can independently bind the verdict's canonical_input_hash to the rows the
// worker actually fed the kernel.
function normalizedRow(r) {
  return {
    event_id: r.event_id,
    event_type: r.event_type,
    source: r.source,
    namespace: r.namespace,
    timestamp: r.timestamp.toISOString(),
    payload: r.payload,
    metadata: r.metadata,
    sequence: r.sequence,
    causation_id: r.metadata.causation_id || null,
    correlation_id: r.metadata.correlation_id || null,
  };
}
const EXPECTED_CONSUMED = EXPECTED_ORDER.map(
  id => normalizedRow(PERSISTED_ROWS.find(r => r.event_id === id)));
const EXPECTED_INPUT_HASH = createHash('sha256')
  .update(CanonicalJson.stringify(EXPECTED_CONSUMED), 'utf8')
  .digest('hex');

function makeStubPool() {
  const seen = [];
  return {
    _seen: seen,
    async query(text, params) {
      seen.push({ text, params });
      const corr = params[0];
      const filtered = PERSISTED_ROWS.filter(
        r => r.metadata && r.metadata.correlation_id === corr);
      const sorted = [...filtered].sort((a, b) => {
        const sa = a.sequence, sb = b.sequence;
        if (sa == null && sb == null) {
          const t = a.timestamp - b.timestamp;
          if (t !== 0) return t;
        } else if (sa == null) return -1;
        else if (sb == null) return 1;
        else if (sa !== sb) return sa - sb;
        const t = a.timestamp - b.timestamp;
        if (t !== 0) return t;
        return a.event_id < b.event_id ? -1 : a.event_id > b.event_id ? 1 : 0;
      });
      return { rows: sorted };
    },
  };
}

async function runReplay() {
  const eventRuntime = new MockEventRuntime();
  const pool = makeStubPool();
  const worker = new ReplayWorker({
    eventRuntime,
    replayProvider: new KernelReplayExecutionProvider(),
    pool,
  });
  const result = await worker.handle({
    event_id: 'event_e2e_trigger',
    event_type: 'REPLAY_VERIFY',
    payload: { documentId: 'doc-e2e-001' },
    metadata: { correlation_id: CORR, namespace: NS },
  });
  return { result, eventRuntime, pool };
}

async function main() {
  console.log('=== Persisted Replay End-to-End Proof ===\n');

  await test('worker queries the canonical store for the correlation group', async () => {
    const { pool } = await runReplay();
    assert.equal(pool._seen.length, 1, 'exactly one store query is issued');
    const q = pool._seen[0];
    assert.ok(q.text.includes("metadata->>'correlation_id' = $1"),
      'query filters the correlation group by metadata correlation_id');
    assert.ok(q.text.includes('ORDER BY sequence NULLS FIRST, timestamp ASC, event_id ASC'),
      'query names the Lane A deterministic ordering contract');
    assert.deepEqual(q.params, [CORR], 'query is keyed by the trigger correlation id');
  });

  await test('verdict verifies over the full persisted window', async () => {
    const { result } = await runReplay();
    const v = result.replay;
    assert.equal(v.verified, true);
    assert.equal(v.reason, 'kernel_verified');
    assert.equal(v.completeness, 'COMPLETE');
    assert.equal(v.event_count, 4);
    assert.equal(v.input_event_count, 4);
    assert.equal(v.input_truncated, false);
    assert.equal(v.inputs_skipped, 0);
    assert.equal(v.input_source, 'canonical-store');
    assert.deepEqual(v.violations, []);
  });

  await test('every canonical event_id is preserved in Lane A order', async () => {
    const { result } = await runReplay();
    const ids = result.replay.event_type_map.map(e => e.event_id);
    assert.deepEqual(ids, EXPECTED_ORDER,
      `kernel consumed IDs in Lane A order, got ${JSON.stringify(ids)}`);
  });

  await test('original canonical event types are recorded, kernel modeling explicit', async () => {
    const { result } = await runReplay();
    const v = result.replay;
    assert.ok(v.event_types.includes('OBSERVATION_CREATED'));
    assert.ok(v.event_types.includes('CLAIM_CREATED'));
    assert.ok(v.event_types.includes('CLASSIFICATION_CREATED'));
    for (const entry of v.event_type_map) {
      assert.ok(entry.canonical_event_type, 'each entry names the canonical type');
      assert.ok(['artifact_commit', 'artifact_update'].includes(entry.kernel_event_type),
        'each entry names the explicit kernel modeling');
    }
  });

  await test('namespace, semantic payload, and metadata survive into the kernel proof', async () => {
    const { result } = await runReplay();
    // Reach the provider result through a fresh provider run over the same
    // normalized input is unnecessary: the worker's verdict already binds the
    // consumed input hash. Here we re-run the provider directly over the
    // expected consumed rows to inspect the kernel proof content.
    const provider = new KernelReplayExecutionProvider();
    const pres = await provider.executeReplay({ state: { replay_events: EXPECTED_CONSUMED } });
    assert.equal(pres.status, 'ok');
    const streamJson = Buffer.from(pres.canonical_bytes.bytes, 'base64url').toString('utf8');
    for (const id of EXPECTED_ORDER) {
      assert.ok(streamJson.includes(id), `kernel stream carries ${id}`);
    }
    assert.ok(!streamJson.includes('evt-ping-'), 'no reminted identities in the kernel stream');
    const namespaces = [...streamJson.matchAll(/"namespace":"([^"]+)"/g)].map(m => m[1]);
    assert.ok(namespaces.length > 0, 'namespace is carried on the envelopes');
    assert.ok(namespaces.every(n => n === NS), `every carried namespace is ${NS}`);
    for (const semantic of ['first observation', 'legacy late observation',
      'claim derived from first observation', 'customer-feedback']) {
      assert.ok(streamJson.includes(semantic), `semantic payload survives: ${semantic}`);
    }
    for (const conf of ['0.91', '0.88', '0.93', '0.84']) {
      assert.ok(streamJson.includes(conf), `metadata confidence survives: ${conf}`);
    }
    assert.ok(streamJson.includes('"confidence_provenance":"model"'),
      'metadata confidence_source is carried into the kernel envelope as confidence_provenance');
  });

  await test('row era is carried with provenance; machinery versions are provider-declared', async () => {
    const { result } = await runReplay();
    const v = result.replay;
    assert.equal(v.input_era, '1.0.0');
    assert.equal(v.era.input_era_source, 'row-declared');
    assert.equal(v.era.envelope_schema_version.source, 'provider-declared');
    assert.equal(v.era.replay_version.source, 'provider-declared');
    assert.equal(v.era.policy_version.source, 'provider-declared');
    assert.equal(v.replay_engine_version, 'v1');
    assert.ok(v.witness_algorithm_version, 'witness algorithm version is named');
    assert.ok(v.witness_version, 'witness version is named');
  });

  await test('canonical_input_hash binds the exact rows consumed', async () => {
    const { result } = await runReplay();
    const v = result.replay;
    assert.ok(/^[0-9a-f]{64}$/.test(v.canonical_input_hash),
      'canonical_input_hash is a 64-hex sha256 digest');
    assert.equal(v.canonical_input_hash, EXPECTED_INPUT_HASH,
      'the verdict hash equals the independent hash of the consumed rows in replay order');
  });

  await test('replay is deterministic across runs', async () => {
    const a = await runReplay();
    const b = await runReplay();
    assert.equal(a.result.replay.fingerprint, b.result.replay.fingerprint);
    assert.equal(a.result.replay.witness_root, b.result.replay.witness_root);
    assert.equal(a.result.replay.canonical_input_hash, b.result.replay.canonical_input_hash);
  });

  await test('witness attests to the honest verdict from the canonical row', async () => {
    const { result, eventRuntime } = await runReplay();
    const completed = eventRuntime._emitted.find(e => e.event_type === 'REPLAY_COMPLETED');
    assert.ok(completed, 'REPLAY_COMPLETED was emitted');
    // The canonical REPLAY_COMPLETED row, as the store would persist it.
    const canonicalRow = {
      event_id: completed.event_id,
      event_type: 'REPLAY_COMPLETED',
      payload: completed.payload,
      metadata: completed.metadata,
      namespace: NS,
    };
    const witnessRuntime = new MockEventRuntime();
    const witnessWorker = new WitnessWorker({
      eventRuntime: witnessRuntime,
      attestationSource: async (replayEventId) =>
        (replayEventId === canonicalRow.event_id ? canonicalRow : null),
    });
    const wres = await witnessWorker.handle({
      event_id: canonicalRow.event_id,
      event_type: 'REPLAY_COMPLETED',
      payload: { event_id: canonicalRow.event_id, documentId: 'doc-e2e-001' },
      metadata: {},
    });
    assert.equal(wres.status, 'ok', `witness attested, got ${wres.status}`);
    const wemitted = witnessRuntime._emitted.find(e => e.event_type === 'WITNESS_CREATED');
    assert.ok(wemitted, 'WITNESS_CREATED was emitted');
    const w = wemitted.payload.witness;
    assert.equal(w.replay_fingerprint, result.replay.fingerprint,
      'attestation binds the replay fingerprint');
    assert.equal(w.witness_root, result.replay.witness_root,
      'attestation binds the witness root');
    assert.equal(w.replay_event_id, canonicalRow.event_id,
      'attestation names the canonical replay event');
    assert.equal(w.replay_event_count, 4);
  });

  console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
