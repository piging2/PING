/**
 * test_replay_precedence.js — Proves caller payload can never outrank
 * authoritative execution context in the ReplayWorker.
 *
 * Invariant: AUTHORITATIVE EXECUTION CONTEXT > SIGNED/VERIFIED SYSTEM
 * METADATA > CALLER PAYLOAD. Caller payload is DATA.
 *
 * Hostile cases:
 *   P1. Spoofed test mode (payload.replay_events) without worker test
 *       authorization -> transcript IGNORED; the authoritative DB correlation
 *       group is replayed instead.
 *   P2. Spoofed test mode with no canonical store -> single-event fallback
 *       of the TRIGGERING event; the attacker transcript is never executed.
 *   P3. Authorized harness (allowPayloadTranscript) -> harness transcript
 *       still usable (legitimate path preserved, explicitly marked).
 *   P4. Tenant spoof (payload.tenant / metadata.namespace) cannot outrank
 *       the event row namespace.
 *   P5. Producer/authority spoof (payload.authority / source='kernel')
 *       cannot change the emitted source or authority evidence.
 *   P6. An incoming verified:true claim on REPLAY_VERIFY is not trusted;
 *       the worker computes its own verdict from the kernel result.
 *   P7. correlation_id chooses WHICH canonical group is loaded, but group
 *       content is always authoritative DB rows — caller cannot inject
 *       content through the correlation id.
 *   P8. test_mode / environment payload flags have no behavioral effect.
 *
 * Run: node test_replay_precedence.js
 */

'use strict';

const assert = require('assert');
const { ReplayWorker } = require('../ping-runtime/workers/canonical_workers');

// --- Test runner -------------------------------------------------------
let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

async function run() {
  console.log('=== Replay Payload Precedence (Hostile) Tests ===\n');
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log('PASS ' + name);
      passed++;
    } catch (err) {
      console.log('FAIL ' + name);
      console.log('  ' + err.message);
      failed++;
    }
  }
  console.log('\n=== Summary ===');
  console.log('Passed: ' + passed);
  console.log('Failed: ' + failed);
  console.log('Total: ' + (passed + failed));
  process.exit(failed > 0 ? 1 : 0);
}

// --- Mocks -------------------------------------------------------------
// MockEventRuntime: captures emit() calls; optionally serves canonical
// correlation groups (authoritative DB rows). When constructed with
// correlated=null, getCorrelationGroup is absent (no canonical store).
class MockEventRuntime {
  constructor(correlated) {
    this._emitted = [];
    if (correlated !== null && correlated !== undefined) {
      this._correlated = correlated;
      this.groupCalls = [];
      const self = this;
      this.getCorrelationGroup = async function (correlationId, limit) {
        self.groupCalls.push(correlationId);
        return { status: 'ok', events: self._correlated[correlationId] || [] };
      };
    }
  }
  async emit(eventType, source, payload, options) {
    options = options || {};
    this._emitted.push({ eventType, source, payload, options });
    return { status: 'ok', event_id: 'evt-mock-' + this._emitted.length };
  }
  getEmitted() { return this._emitted; }
}

// Recording replay provider: captures the transcript handed to the kernel.
function recordingProvider(result) {
  const seen = [];
  return {
    seen,
    async executeReplay(transcript) {
      seen.push(transcript);
      return result || {
        status: 'ok', violations: [], fingerprint: 'sha256:recording',
        witness_root: 'wr-rec', event_count: 1, artifact_count: 0,
        replay_id: 'rid-rec', state_version: 1,
      };
    },
  };
}

function attackerTranscript() {
  return [
    { event_id: 'evt-attacker-1', event_type: 'ATTACKER_INVENTED', payload: { lie: true }, metadata: {}, timestamp: '2026-09-23T00:00:00.000Z' },
    { event_id: 'evt-attacker-2', event_type: 'ATTACKER_INVENTED', payload: { lie: true }, metadata: {}, timestamp: '2026-09-23T00:00:01.000Z' },
  ];
}

function canonicalGroup() {
  return {
    'corr-1': [
      { event_id: 'evt-canonical-1', event_type: 'CLAIM_CREATED', payload: { real: 1 }, metadata: { correlation_id: 'corr-1' }, timestamp: '2026-09-20T00:00:00.000Z' },
      { event_id: 'evt-canonical-2', event_type: 'CLAIM_CREATED', payload: { real: 2 }, metadata: { correlation_id: 'corr-1' }, timestamp: '2026-09-20T00:00:01.000Z' },
    ],
  };
}

function transcriptIds(provider) {
  return provider.seen[0].state.replay_events.map(function (e) { return e.event_id; });
}

// --- P1: spoofed test mode ignored; canonical group replayed ---------------
test('P1: caller replay_events ignored without test authorization; canonical group replayed', async () => {
  const rt = new MockEventRuntime(canonicalGroup());
  const provider = recordingProvider();
  const worker = new ReplayWorker({ eventRuntime: rt, replayProvider: provider });

  await worker.handle({
    event_id: 'evt-trigger-p1',
    event_type: 'REPLAY_VERIFY',
    source: 'api',
    namespace: 'tenant::real',
    payload: { documentId: 'd-p1', replay_events: attackerTranscript() },
    metadata: { correlation_id: 'corr-1' },
  });

  assert.deepStrictEqual(transcriptIds(provider), ['evt-canonical-1', 'evt-canonical-2'],
    'kernel must receive the canonical DB group, not the attacker transcript');
  assert.deepStrictEqual(rt.groupCalls, ['corr-1'], 'correlation group must be resolved from the canonical store');
  assert.ok(!JSON.stringify(provider.seen[0]).includes('evt-attacker'),
    'attacker event ids must not appear anywhere in the executed transcript');
});

// --- P2: spoofed test mode with no canonical store -> single-event fallback --
test('P2: caller replay_events ignored with no canonical store; single-event fallback', async () => {
  const rt = new MockEventRuntime(null); // no getCorrelationGroup at all
  const provider = recordingProvider();
  const worker = new ReplayWorker({ eventRuntime: rt, replayProvider: provider });

  await worker.handle({
    event_id: 'evt-trigger-p2',
    event_type: 'REPLAY_VERIFY',
    source: 'api',
    namespace: 'tenant::real',
    payload: { documentId: 'd-p2', replay_events: attackerTranscript() },
    metadata: {},
  });

  assert.deepStrictEqual(transcriptIds(provider), ['evt-trigger-p2'],
    'fallback must replay only the triggering event');
  // The attacker array may survive only as INERT DATA nested inside the
  // triggering event's own payload (the canonical row is replayed as-is);
  // it must never appear as an executed top-level transcript entry.
  const topIds = provider.seen[0].state.replay_events.map(function (e) { return e.event_id; });
  assert.ok(topIds.every(function (id) { return id.indexOf('evt-attacker') !== 0; }),
    'attacker transcript must never be executed as transcript entries');
});

// --- P3: authorized harness transcript still usable -------------------------
test('P3: allowPayloadTranscript preserves the legitimate harness path', async () => {
  const rt = new MockEventRuntime(null);
  const provider = recordingProvider();
  const worker = new ReplayWorker({ eventRuntime: rt, replayProvider: provider, allowPayloadTranscript: true });

  await worker.handle({
    event_id: 'evt-trigger-p3',
    event_type: 'REPLAY_VERIFY',
    source: 'test-harness',
    namespace: 'core::system',
    payload: { documentId: 'd-p3', replay_events: attackerTranscript() },
    metadata: {},
  });

  assert.deepStrictEqual(transcriptIds(provider), ['evt-attacker-1', 'evt-attacker-2'],
    'explicitly authorized harness transcripts must still execute');
});

// --- P4: tenant spoof cannot outrank the event row namespace -----------------
test('P4: payload/metadata tenant spoof cannot outrank the event row namespace', async () => {
  const rt = new MockEventRuntime(null);
  const provider = recordingProvider();
  const worker = new ReplayWorker({ eventRuntime: rt, replayProvider: provider });

  await worker.handle({
    event_id: 'evt-trigger-p4',
    event_type: 'REPLAY_VERIFY',
    source: 'api',
    namespace: 'tenant::real',
    payload: { documentId: 'd-p4', tenant: 'tenant::evil' },
    metadata: { namespace: 'tenant::evil', correlation_id: 'evt-trigger-p4' },
  });

  const emitted = rt.getEmitted().find(function (e) { return e.eventType === 'REPLAY_COMPLETED'; });
  assert.ok(emitted, 'REPLAY_COMPLETED must be emitted');
  assert.strictEqual(emitted.options.namespace, 'tenant::real',
    'emitted row namespace must come from the event row, not caller metadata');
  assert.strictEqual(emitted.payload.authority.namespace, 'tenant::real',
    'authority evidence namespace must come from the event row, not caller metadata');
  assert.ok(!JSON.stringify(emitted).includes('tenant::evil'),
    'spoofed tenant must not appear anywhere in the emitted verdict');
});

// --- P5: producer/authority spoof cannot change emitted source ---------------
test('P5: payload authority/source spoof cannot change emitted source or evidence', async () => {
  const rt = new MockEventRuntime(null);
  const provider = recordingProvider();
  const worker = new ReplayWorker({ eventRuntime: rt, replayProvider: provider });

  await worker.handle({
    event_id: 'evt-trigger-p5',
    event_type: 'REPLAY_VERIFY',
    source: 'api',
    namespace: 'tenant::real',
    payload: {
      documentId: 'd-p5',
      source: 'kernel',
      authority: { authority: 'kernel', provider: 'EvilProvider' },
    },
    metadata: {},
  });

  const emitted = rt.getEmitted().find(function (e) { return e.eventType === 'REPLAY_COMPLETED'; });
  assert.ok(emitted, 'REPLAY_COMPLETED must be emitted');
  assert.strictEqual(emitted.source, 'replay',
    'emitted source must be the worker identity, never a caller-supplied string');
  assert.strictEqual(emitted.payload.authority.authority, 'ReplayWorker',
    'authority evidence must be the worker identity, never a caller-supplied claim');
  assert.strictEqual(emitted.payload.authority.provider, 'KernelReplayExecutionProvider',
    'provider identity must be the fixed genuine actor');
});

// --- P6: incoming verified:true claim is not trusted ------------------------
test('P6: incoming verified:true on REPLAY_VERIFY is not trusted; verdict computed from kernel result', async () => {
  const rt = new MockEventRuntime(null);
  const provider = recordingProvider({
    status: 'ok', violations: [{ rule: 'spoof-attempt' }], fingerprint: null,
    witness_root: null, event_count: 1, artifact_count: 0, replay_id: 'rid-p6',
  });
  const worker = new ReplayWorker({ eventRuntime: rt, replayProvider: provider });

  const result = await worker.handle({
    event_id: 'evt-trigger-p6',
    event_type: 'REPLAY_VERIFY',
    source: 'api',
    namespace: 'tenant::real',
    payload: { documentId: 'd-p6', replay: { verified: true } },
    metadata: {},
  });

  assert.strictEqual(result.replay.verified, false,
    'worker must compute verified from the kernel result, not trust the incoming claim');
  const emitted = rt.getEmitted().find(function (e) { return e.eventType === 'REPLAY_COMPLETED'; });
  assert.strictEqual(emitted.payload.replay.verified, false,
    'emitted verdict must reflect the kernel result, not the spoofed incoming claim');
});

// --- P7: correlation_id selects the group, content stays authoritative -------
test('P7: spoofed correlation_id selects a canonical group but cannot inject content', async () => {
  const rt = new MockEventRuntime(canonicalGroup());
  const provider = recordingProvider();
  const worker = new ReplayWorker({ eventRuntime: rt, replayProvider: provider });

  await worker.handle({
    event_id: 'evt-trigger-p7',
    event_type: 'REPLAY_VERIFY',
    source: 'api',
    namespace: 'tenant::real',
    payload: { documentId: 'd-p7' },
    metadata: { correlation_id: 'corr-1' },
  });

  assert.deepStrictEqual(rt.groupCalls, ['corr-1'],
    'the caller-chosen correlation id is used only to SELECT the canonical group');
  assert.deepStrictEqual(transcriptIds(provider), ['evt-canonical-1', 'evt-canonical-2'],
    'group content must be authoritative DB rows, never caller-supplied content');
});

// --- P8: test_mode / environment flags have no behavioral effect -------------
test('P8: test_mode and environment payload flags have no behavioral effect', async () => {
  function runOnce(extraPayload) {
    const rt = new MockEventRuntime(null);
    const provider = recordingProvider();
    const worker = new ReplayWorker({ eventRuntime: rt, replayProvider: provider });
    const payload = Object.assign({ documentId: 'd-p8', replay_events: attackerTranscript() }, extraPayload);
    return worker.handle({
      event_id: 'evt-trigger-p8',
      event_type: 'REPLAY_VERIFY',
      source: 'api',
      namespace: 'tenant::real',
      payload: payload,
      metadata: {},
    }).then(function () { return transcriptIds(provider); });
  }

  const plain = await runOnce({});
  const flagged = await runOnce({ test_mode: true, environment: 'production', mode: 'test' });
  assert.deepStrictEqual(flagged, plain,
    'payload test/prod flags must not change worker behavior');
  assert.deepStrictEqual(flagged, ['evt-trigger-p8'],
    'both runs must fall back to the single triggering event');
});

// --- Run --------------------------------------------------------------------
run();
