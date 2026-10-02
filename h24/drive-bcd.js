// H24 live drive: (b) signed via real in-process recorder, (c) fail-closed on
// throw, (d) W7 intact with signer (no signing attempted), (e) default-off
// mechanism via registerCanonicalWorkers + PING_WITNESS_SIGNING.
const WT = '/home/nolan/worktrees/ping-harvest-12h';
const { WitnessWorker, registerCanonicalWorkers } = require(WT + '/ping-runtime/workers/canonical_workers.js');
const { WitnessRecorder } = require(WT + '/gateway/witness_recorder.js');

class MockEventRuntime {
  constructor() { this._emitted = []; }
  async emit(eventType, source, payload, options = {}) {
    const event = { event_id: 'evt-' + (this._emitted.length + 1), event_type: eventType, source, payload,
      metadata: { namespace: options.namespace, correlation_id: options.correlation_id, causation_id: options.causation_id },
      namespace: options.namespace, correlation_id: options.correlation_id, causation_id: options.causation_id,
      timestamp: '2026-09-18T00:00:00.000Z' };
    this._emitted.push(event);
    return { status: 'ok', event_id: event.event_id };
  }
  emittedOf(t) { return this._emitted.filter((e) => e.event_type === t); }
}
function makeTrigger(replay) {
  return { event_id: 'evt-upstream-1', event_type: 'REPLAY_COMPLETED', namespace: 'tenant::hpp',
    metadata: { correlation_id: 'corr-root-1', causation_id: 'evt-replay-parent' },
    payload: { documentId: 'doc_1', replay, upstreamEventId: 'evt-replay-parent' },
    timestamp: '2026-09-18T00:00:00.000Z' };
}
const mask = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k === 'timestamp' ? '<TS>' : v)));
const show = (label, o) => console.log('### ' + label + '\n' + JSON.stringify(mask(o), null, 2));

(async () => {
  const quiet = console.log; const mute = () => { console.log = () => {}; }; const unmute = () => { console.log = quiet; };

  // (b) signer injected (real WitnessRecorder, direct require = primary path) + verified replay
  {
    const rt = new MockEventRuntime();
    const worker = new WitnessWorker({ eventRuntime: rt, witnessSigner: new WitnessRecorder() });
    mute(); const result = await worker.handle(makeTrigger({ verified: true, reason: 'kernel_verified' })); unmute();
    const created = rt.emittedOf('WITNESS_CREATED');
    show('b: signed WITNESS_CREATED (result)', { status: result.status, signed: result.signed });
    show('b: signed WITNESS_CREATED (payload)', created[0].payload);
    // independent verification of the emitted Ed25519 signature
    const w = created[0].payload.witness;
    const verifier = new WitnessRecorder();
    const ok = await verifier.verifySignature({ payload: { witness_root: w.witness_root, signature: w.witness_signature, public_key: w.public_key } });
    show('b: independent Ed25519 verifySignature', { ok });
    if (result.status !== 'ok' || created.length !== 1 || ok !== true) throw new Error('drive (b) FAILED');
  }

  // (c) signer throws -> fail closed: no WITNESS_CREATED
  {
    const rt = new MockEventRuntime();
    const worker = new WitnessWorker({ eventRuntime: rt, witnessSigner: async () => { throw new Error('kms_down'); } });
    mute(); const result = await worker.handle(makeTrigger({ verified: true, reason: 'kernel_verified' })); unmute();
    show('c: signer throws (result)', result);
    show('c: emissions', { created: rt.emittedOf('WITNESS_CREATED').length,
      rejected: mask(rt.emittedOf('WITNESS_REJECTED').map((e) => e.payload)) });
    if (rt.emittedOf('WITNESS_CREATED').length !== 0) throw new Error('drive (c) FAILED: attestation emitted');
    if (!result.reason.startsWith('witness_sign_failed:')) throw new Error('drive (c) FAILED: wrong reason');
  }

  // (d) signer present + replay NOT verified -> W7 rejects, signer never called
  {
    const rt = new MockEventRuntime();
    const rec = new WitnessRecorder();
    let calls = 0;
    const orig = rec.record.bind(rec);
    rec.record = async (ro) => { calls++; return orig(ro); };
    const worker = new WitnessWorker({ eventRuntime: rt, witnessSigner: rec });
    mute(); const result = await worker.handle(makeTrigger({ verified: false, reason: 'kernel_error' })); unmute();
    show('d: unverified replay with signer (result)', result);
    show('d: signer invocations', { recordCalls: calls });
    if (calls !== 0) throw new Error('drive (d) FAILED: signer was invoked');
    if (result.reason !== 'unverified_replay:kernel_error') throw new Error('drive (d) FAILED: W7 reason changed');
    if (rt.emittedOf('WITNESS_CREATED').length !== 0) throw new Error('drive (d) FAILED: attestation emitted');
  }

  // (e) default-off mechanism through registerCanonicalWorkers
  {
    const collect = (options) => {
      const regs = [];
      registerCanonicalWorkers({ register(n, w, o) { regs.push({ n, w, o }); } }, options);
      return regs.find((r) => r.n === 'witness').w;
    };
    const dflt = collect({ eventRuntime: new MockEventRuntime() });
    const prev = process.env.PING_WITNESS_SIGNING;
    process.env.PING_WITNESS_SIGNING = '1';
    const flagged = collect({ eventRuntime: new MockEventRuntime() });
    if (prev === undefined) delete process.env.PING_WITNESS_SIGNING; else process.env.PING_WITNESS_SIGNING = prev;
    show('e: default-off mechanism', {
      defaultSigner: dflt._witnessSigner,
      envFlaggedSignerType: typeof flagged._witnessSigner,
      envVar: 'PING_WITNESS_SIGNING',
    });
    if (dflt._witnessSigner !== null) throw new Error('drive (e) FAILED: default not off');
    if (typeof flagged._witnessSigner !== 'function') throw new Error('drive (e) FAILED: env flag did not inject');
  }

  console.log('ALL DRIVES (b)(c)(d)(e) PASSED');
})().catch((e) => { console.error('DRIVE FAILED:', e.message); process.exit(1); });
