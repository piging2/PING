/**
 * test_witness_attestation_shapes.js — H24 step 1.
 *
 * Pins the witness attestation contract BEFORE/AFTER consolidation, side by side:
 *
 *   BEFORE (unsigned, default — byte-identical to pre-H24):
 *     witness.attestation === `witness-${event_id.slice(0, 16)}`
 *     (bare string interpolation of the upstream event id; verified by nothing)
 *
 *   AFTER (signed — witnessSigner injected and the W7 gate passed):
 *     witness carries exactly the POST /witness/sign response fields:
 *       { witness_id, claim_id, witness_root, witness_signature, public_key,
 *         algorithm: 'ed25519', verified: true }
 *
 * There is no third format: signed mode emits no legacy `attestation` string,
 * unsigned mode emits none of the signed fields.
 */
const assert = require('assert');
const { WitnessWorker } = require('../ping-runtime/workers/canonical_workers');

let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

async function run() {
  console.log('=== Witness Attestation Shapes (H24 before/after pin) ===\n');
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (err) {
      console.log(`✗ ${name}`);
      console.log(`  ${err.message}`);
      failed++;
    }
  }
  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

class MockEventRuntime {
  constructor() {
    this._emitted = [];
  }
  async emit(eventType, source, payload, options = {}) {
    const event = {
      event_id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      event_type: eventType,
      source,
      payload,
      metadata: {
        namespace: options.namespace,
        correlation_id: options.correlation_id,
        causation_id: options.causation_id,
      },
      namespace: options.namespace,
      correlation_id: options.correlation_id,
      causation_id: options.causation_id,
      timestamp: new Date().toISOString(),
    };
    this._emitted.push(event);
    return { status: 'ok', event_id: event.event_id };
  }
  emittedOf(type) { return this._emitted.filter((e) => e.event_type === type); }
}

function makeTrigger(overrides = {}) {
  return {
    event_id: 'evt-upstream-1',
    event_type: 'REPLAY_COMPLETED',
    namespace: 'tenant::hpp',
    metadata: { correlation_id: 'corr-root-1', causation_id: 'evt-replay-parent' },
    payload: {
      documentId: 'doc_1',
      replay: { verified: true, reason: 'kernel_verified' },
      upstreamEventId: 'evt-replay-parent',
    },
    ...overrides,
  };
}

// Exactly the POST /witness/sign response fields (gateway/routes/witness.js).
const SIGNED_FIELDS = [
  'witness_id',
  'claim_id',
  'witness_root',
  'witness_signature',
  'public_key',
  'algorithm',
  'verified',
];

// SHAPE-1: the BEFORE shape — unsigned default pins the legacy attestation.
test('SHAPE-1: unsigned default → attestation is witness-<event_id[0:16]>, no signed fields', async () => {
  const eventRuntime = new MockEventRuntime();
  const worker = new WitnessWorker({ eventRuntime });

  const result = await worker.handle(makeTrigger());

  assert.equal(result.status, 'ok');
  assert.equal(result.signed, undefined, 'unsigned result must not claim signed');
  assert.equal(result.witness.attestation, 'witness-evt-upstream-1');
  for (const f of SIGNED_FIELDS) {
    assert.equal(result.witness[f], undefined, `unsigned witness must not carry ${f}`);
  }
  const created = eventRuntime.emittedOf('WITNESS_CREATED');
  assert.equal(created.length, 1);
  assert.deepEqual(Object.keys(created[0].payload.witness).sort(),
    ['attestation', 'documentId', 'eventType', 'timestamp']);
});

// SHAPE-2: the AFTER shape — signer injected, W7 passed → exactly the
// /witness/sign response fields, no legacy attestation string.
test('SHAPE-2: signed mode → exactly the /witness/sign response fields', async () => {
  const eventRuntime = new MockEventRuntime();
  const canned = {
    witness_id: 'w-abc123',
    claim_id: 'evt-upstream-1',
    witness_root: 'root-def456',
    witness_signature: 'sig-789',
    public_key: 'pk-pem',
    algorithm: 'ed25519',
    verified: true,
  };
  const worker = new WitnessWorker({ eventRuntime, witnessSigner: async () => canned });

  const result = await worker.handle(makeTrigger());

  assert.equal(result.status, 'ok');
  assert.equal(result.signed, true);
  const created = eventRuntime.emittedOf('WITNESS_CREATED');
  assert.equal(created.length, 1);
  const w = created[0].payload.witness;
  for (const f of SIGNED_FIELDS) {
    assert.equal(w[f], canned[f], `signed witness field ${f} must match the signer shape`);
  }
  assert.equal(w.algorithm, 'ed25519');
  assert.equal(w.verified, true);
  assert.equal(w.attestation, undefined, 'signed mode must not emit the legacy attestation string');
  // Envelope fields survive; only the attestation format changes.
  assert.equal(w.documentId, 'doc_1');
  assert.equal(w.eventType, 'REPLAY_COMPLETED');
  assert.equal(created[0].payload.upstreamEventId, 'evt-upstream-1');
});

// SHAPE-3: the record+certify object seam (gateway/witness_recorder.js) adapts
// to the same signed shape — the primary same-process path.
test('SHAPE-3: WitnessRecorder object (record+certify) adapts to the /witness/sign shape', async () => {
  const { WitnessRecorder } = require('./witness_recorder.js');
  const eventRuntime = new MockEventRuntime();
  const worker = new WitnessWorker({ eventRuntime, witnessSigner: new WitnessRecorder() });

  const result = await worker.handle(makeTrigger());

  assert.equal(result.status, 'ok');
  assert.equal(result.signed, true);
  const created = eventRuntime.emittedOf('WITNESS_CREATED');
  assert.equal(created.length, 1);
  const w = created[0].payload.witness;
  for (const f of SIGNED_FIELDS) {
    assert.ok(w[f] !== undefined && w[f] !== null && w[f] !== '', `signed witness must carry ${f}`);
  }
  assert.equal(w.algorithm, 'ed25519');
  assert.equal(w.verified, true);
  assert.equal(w.claim_id, 'evt-upstream-1', 'claim_id follows the attested upstream event');
  assert.equal(w.attestation, undefined);
  // The adapted signature self-verifies (mirrors /witness/sign fail-closed).
  const recorder = new WitnessRecorder();
  const ok = await recorder.verifySignature({
    payload: { witness_root: w.witness_root, signature: w.witness_signature, public_key: w.public_key },
  });
  assert.equal(ok, true, 'adapted Ed25519 signature must verify');
});

// SHAPE-4: constructor rejects a signer that is neither a function nor a
// record+certify object (fail closed at wiring, not at event time).
test('SHAPE-4: invalid witnessSigner type throws at construction', async () => {
  const eventRuntime = new MockEventRuntime();
  assert.throws(
    () => new WitnessWorker({ eventRuntime, witnessSigner: 'not-a-signer' }),
    /witnessSigner must be a function or an object exposing record\+certify/
  );
  // null/undefined remain legal and mean "default off".
  const w1 = new WitnessWorker({ eventRuntime });
  const w2 = new WitnessWorker({ eventRuntime, witnessSigner: null });
  assert.equal(w1._witnessSigner, null);
  assert.equal(w2._witnessSigner, null);
});

run();
