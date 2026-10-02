// H24 applier for gateway/test_witness_negpath.js (step 4).
// - Replaces WIT-NEG-1 with a both-modes version (unsigned default unchanged;
//   signed shape when a signer is injected).
// - Inserts WIT-NEG-9 (wiring: default-off / explicit / env flag),
//   WIT-NEG-10 (fail-closed: signer throws -> no WITNESS_CREATED),
//   WIT-NEG-11 (W7 intact with signer: signer never invoked on rejection),
//   WIT-NEG-12 (malformed signer output fails closed).
const fs = require('fs');
const path = '/home/nolan/worktrees/ping-harvest-12h/gateway/test_witness_negpath.js';
let src = fs.readFileSync(path, 'utf8');
function must(cond, msg) { if (!cond) { console.error('ABORT: ' + msg); process.exit(1); } }

// --- Replace WIT-NEG-1 (both modes) ---
const commentIdx = src.indexOf('// WIT-NEG-1:');
must(commentIdx !== -1, 'WIT-NEG-1 comment not found');
const testStart = src.indexOf("test('WIT-NEG-1:", commentIdx);
must(testStart !== -1 && testStart - commentIdx < 200, 'WIT-NEG-1 test start not found');
const blockEnd = src.indexOf('\n});', testStart);
must(blockEnd !== -1, 'WIT-NEG-1 block end not found');
const oldBlock = src.slice(commentIdx, blockEnd + 4);
must(oldBlock.includes("assert.equal(result.witness.attestation, 'witness-evt-upstream-1');"),
  'WIT-NEG-1 block missing the pinned unsigned assertion');
must(!oldBlock.includes('witnessSigner'), 'WIT-NEG-1 looks already patched');

const newNeg1 = `// WIT-NEG-1: Verified replay -> witness attests normally (WITNESS_CREATED)
// H24: covers BOTH modes. (a) unsigned default is unchanged (byte-identical
// legacy shape); (b) with a signer injected the witness carries the signed
// shape (exactly the POST /witness/sign response fields).
test('WIT-NEG-1: verified replay -> WITNESS_CREATED, status ok (unsigned default + signed when signer injected)', async () => {
  // (a) unsigned default — legacy shape, unchanged
  const eventRuntime = new MockEventRuntime();
  const worker = new WitnessWorker({ eventRuntime });

  const result = await worker.handle(makeTrigger());

  assert.equal(result.status, 'ok');
  assert.equal(result.witness.attestation, 'witness-evt-upstream-1');
  const created = eventRuntime.emittedOf('WITNESS_CREATED');
  assert.equal(created.length, 1);
  assert.equal(created[0].payload.documentId, 'doc_1');
  assert.equal(created[0].metadata.namespace, 'tenant::hpp');
  const rejected = eventRuntime.emittedOf('WITNESS_REJECTED');
  assert.equal(rejected.length, 0);

  // (b) signed — signer injected, W7 gate passed
  const rt2 = new MockEventRuntime();
  const signedShape = {
    witness_id: 'w-test-1',
    claim_id: 'evt-upstream-1',
    witness_root: 'root-abc',
    witness_signature: 'sig-def',
    public_key: 'pk-ghi',
    algorithm: 'ed25519',
    verified: true,
  };
  const worker2 = new WitnessWorker({ eventRuntime: rt2, witnessSigner: async () => signedShape });
  const result2 = await worker2.handle(makeTrigger());

  assert.equal(result2.status, 'ok');
  assert.equal(result2.signed, true);
  const created2 = rt2.emittedOf('WITNESS_CREATED');
  assert.equal(created2.length, 1);
  const w2 = created2[0].payload.witness;
  assert.equal(w2.witness_id, 'w-test-1');
  assert.equal(w2.claim_id, 'evt-upstream-1');
  assert.equal(w2.witness_root, 'root-abc');
  assert.equal(w2.witness_signature, 'sig-def');
  assert.equal(w2.public_key, 'pk-ghi');
  assert.equal(w2.algorithm, 'ed25519');
  assert.equal(w2.verified, true);
  assert.equal(w2.attestation, undefined, 'signed mode must not emit the legacy attestation string');
  assert.equal(rt2.emittedOf('WITNESS_REJECTED').length, 0);
});
`;
src = src.slice(0, commentIdx) + newNeg1 + src.slice(blockEnd + 4);

// --- Insert WIT-NEG-9..12 before the final run(); ---
const newTests = `
// WIT-NEG-9: registerCanonicalWorkers wiring — default off; explicit option;
// PING_WITNESS_SIGNING env flag injects the in-process WitnessRecorder.
test('WIT-NEG-9: registerCanonicalWorkers wires witnessSigner default-off / explicit / env-flag', async () => {
  function collect(options) {
    const registrations = [];
    const workerRuntime = { register(name, worker, opts) { registrations.push({ name, worker, opts }); } };
    registerCanonicalWorkers(workerRuntime, options);
    return registrations.find((r) => r.name === 'witness').worker;
  }
  const rt = () => new MockEventRuntime();

  // default: no signer (legacy unsigned path)
  assert.equal(collect({ eventRuntime: rt() })._witnessSigner, null);

  // explicit option wins
  const fake = async () => ({});
  assert.equal(collect({ eventRuntime: rt(), witnessSigner: fake })._witnessSigner, fake);

  // env flag injects the real in-process recorder; explicit null forces off
  const prev = process.env.PING_WITNESS_SIGNING;
  try {
    process.env.PING_WITNESS_SIGNING = '1';
    const wired = collect({ eventRuntime: rt() });
    assert.equal(typeof wired._witnessSigner, 'function', 'env flag must inject an adapted signer');
    const result = await wired.handle(makeTrigger());
    assert.equal(result.status, 'ok');
    assert.equal(result.signed, true);
    assert.equal(result.witness.algorithm, 'ed25519');
    assert.equal(result.witness.verified, true);
    assert.equal(collect({ eventRuntime: rt(), witnessSigner: null })._witnessSigner, null);
  } finally {
    if (prev === undefined) delete process.env.PING_WITNESS_SIGNING;
    else process.env.PING_WITNESS_SIGNING = prev;
  }
  assert.equal(process.env.PING_WITNESS_SIGNING, prev);
});

// WIT-NEG-10: fail-closed — signer throws -> no WITNESS_CREATED emitted;
// observable WITNESS_REJECTED with reason witness_sign_failed.
test('WIT-NEG-10: signer throws -> fail closed (no WITNESS_CREATED; WITNESS_REJECTED witness_sign_failed)', async () => {
  const eventRuntime = new MockEventRuntime();
  const boom = async () => { throw new Error('hsm_unreachable'); };
  const worker = new WitnessWorker({ eventRuntime, witnessSigner: boom });

  const result = await worker.handle(makeTrigger());

  assert.equal(result.status, 'rejected');
  assert.ok(result.reason.startsWith('witness_sign_failed:'), 'reason must name the signing failure, got: ' + result.reason);
  assert.ok(result.reason.includes('hsm_unreachable'));
  assert.equal(eventRuntime.emittedOf('WITNESS_CREATED').length, 0, 'must NOT emit an attestation when signing fails');
  const rejected = eventRuntime.emittedOf('WITNESS_REJECTED');
  assert.equal(rejected.length, 1);
  assert.ok(rejected[0].payload.reason.startsWith('witness_sign_failed:'));
  assert.equal(rejected[0].payload.documentId, 'doc_1');
  assert.equal(rejected[0].metadata.namespace, 'tenant::hpp');
});

// WIT-NEG-11: W7 stays intact with a signer configured — an unverified replay
// is rejected BEFORE any signing is attempted (the signer is never invoked).
test('WIT-NEG-11: signer configured + unverified replay -> W7 rejects, signer not called', async () => {
  const eventRuntime = new MockEventRuntime();
  let signerCalls = 0;
  const spy = async () => { signerCalls++; return {}; };
  const worker = new WitnessWorker({ eventRuntime, witnessSigner: spy });

  const result = await worker.handle(makeTrigger({
    payload: { documentId: 'doc_1', replay: { verified: false, reason: 'kernel_error' } },
  }));

  assert.equal(result.status, 'rejected');
  assert.equal(result.reason, 'unverified_replay:kernel_error');
  assert.equal(signerCalls, 0, 'signer must not be invoked when W7 rejects');
  assert.equal(eventRuntime.emittedOf('WITNESS_CREATED').length, 0);
  assert.equal(eventRuntime.emittedOf('WITNESS_REJECTED').length, 1);
});

// WIT-NEG-12: malformed signer output fails closed (shape gate, not just throw).
test('WIT-NEG-12: signer returns malformed shape -> fail closed, no WITNESS_CREATED', async () => {
  const eventRuntime = new MockEventRuntime();
  const bad = async () => ({ witness_id: 'x' }); // missing required fields
  const worker = new WitnessWorker({ eventRuntime, witnessSigner: bad });

  const result = await worker.handle(makeTrigger());

  assert.equal(result.status, 'rejected');
  assert.ok(result.reason.startsWith('witness_sign_failed:'));
  assert.equal(eventRuntime.emittedOf('WITNESS_CREATED').length, 0);
  assert.equal(eventRuntime.emittedOf('WITNESS_REJECTED').length, 1);
});
`;
const runMarker = '\nrun();\n';
must(src.split(runMarker).length - 1 === 1, 'run(); marker not unique, found ' + (src.split(runMarker).length - 1));
src = src.replace(runMarker, '\n' + newTests + '\nrun();\n');

fs.writeFileSync(path, src);
console.log('NEGPATH PATCHED OK');
