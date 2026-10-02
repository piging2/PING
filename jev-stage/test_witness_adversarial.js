// Adversarial rejection coverage for the witness attestation boundary.
// Directive section 5 + flaw correction (b): 63/63 with zero refusals is
// evidence of execution, not evidence of strong verification. This suite
// manufactures REPLAY_COMPLETED cases the witness MUST reject and records
// what the verifier actually does.
//
// Each case is labeled STRONG (correctly rejects) or WEAK (attests a case
// that must be rejected). WEAK cases are findings, not regressions: they
// document where the attestation invariant is weaker than the name
// "witness" implies. The witness currently trusts payload.replay.verified
// === true without inspecting the replay record itself.
//
// Run: node gateway/test_witness_adversarial.js (from repo root)

const assert = require('assert');
const { WitnessWorker } = require('../ping-runtime/workers/canonical_workers');

let strong = 0;
let weak = 0;
let failed = 0;
const weaknesses = [];

function mockRuntime() {
  const emitted = [];
  return {
    emitted,
    eventRuntime: {
      emit: async (eventType, source, payload, options) => {
        emitted.push({ eventType, source, payload, options });
        return { status: 'ok', event_id: 'evt-emitted-1' };
      },
    },
    pool: {},
  };
}

function replayCompletedEvent(replay, docId = 'doc-1') {
  return {
    event_id: 'evt-replay-1',
    event_type: 'REPLAY_COMPLETED',
    namespace: 'core::system',
    metadata: { correlation_id: 'corr-1' },
    payload: {
      documentId: docId,
      replay,
      upstreamEventId: 'evt-proj-1',
    },
  };
}

function validReplay(over = {}) {
  return {
    documentId: 'doc-1',
    eventType: 'PROJECTION_CREATED',
    timestamp: '2026-09-22T00:00:00.000Z',
    verified: true,
    reason: null,
    fingerprint: 'fp-abc123',
    witness_root: 'wr-def456',
    violations: [],
    ...over,
  };
}

async function check(name, expectation, replay, docId) {
  // expectation: 'reject' (must refuse attestation) or 'attest' (may attest)
  const m = mockRuntime();
  const w = new WitnessWorker({ eventRuntime: m.eventRuntime, pool: m.pool });
  let result;
  try {
    result = await w.handle(replayCompletedEvent(replay, docId));
  } catch (err) {
    failed++;
    console.log(`  ERROR ${name}: threw ${err.message}`);
    return;
  }
  const emittedTypes = m.emitted.map((e) => e.eventType);
  const rejected = emittedTypes.includes('WITNESS_REJECTED') && result.status === 'rejected';
  const attested = emittedTypes.includes('WITNESS_CREATED') && result.status === 'ok';

  if (expectation === 'reject' && rejected) {
    strong++;
    console.log(`  STRONG ${name}: rejected as required`);
  } else if (expectation === 'attest' && attested) {
    strong++;
    console.log(`  STRONG ${name}: attested as allowed`);
  } else if (expectation === 'reject' && attested) {
    weak++;
    weaknesses.push(name);
    console.log(`  WEAK   ${name}: ATTESTED but must be rejected`);
  } else {
    failed++;
    console.log(`  FAIL   ${name}: unexpected outcome (emitted: ${emittedTypes.join(',')}, status: ${result.status})`);
  }
}

(async () => {
  console.log('=== witness adversarial rejection coverage ===');

  // Cases the verifier must reject (and does)
  await check('verified:false -> reject', 'reject', validReplay({ verified: false, reason: 'kernel_error' }));
  await check('missing replay object -> reject', 'reject', null);
  await check('verified:"true" (string) -> reject', 'reject', validReplay({ verified: 'true' }));
  await check('verified:1 (number) -> reject', 'reject', validReplay({ verified: 1 }));

  // The one legitimate attestation path
  await check('clean verified replay -> attest', 'attest', validReplay());

  // Cases the verifier must reject but currently attests (WEAK invariants)
  await check(
    'verified:true with violations -> reject',
    'reject',
    validReplay({ violations: [{ rule: 'causation_order', detail: 'event out of order' }] })
  );
  await check(
    'verified:true with null fingerprint -> reject',
    'reject',
    validReplay({ fingerprint: null, witness_root: null })
  );
  await check(
    'verified:true with broken causation chain -> reject',
    'reject',
    validReplay({
      replay_events: [
        { event_id: 'e1', event_type: 'CLAIM_CREATED', causation_id: 'nonexistent-parent' },
      ],
    })
  );
  await check(
    'verified:true with duplicate semantic event -> reject',
    'reject',
    validReplay({
      replay_events: [
        { event_id: 'e1', event_type: 'CLAIM_CREATED', causation_id: null },
        { event_id: 'e1', event_type: 'CLAIM_CREATED', causation_id: null },
      ],
    })
  );
  await check(
    'verified:true for wrong document -> reject',
    'reject',
    validReplay({ documentId: 'doc-ATTACKER' }),
    'doc-1'
  );
  await check(
    'verified:true with unknown event type in replay -> reject',
    'reject',
    validReplay({
      replay_events: [{ event_id: 'e9', event_type: 'TOTALLY_MADE_UP_TYPE', causation_id: null }],
    })
  );
  await check(
    'verified:true with forged upstream reference -> reject',
    'reject',
    validReplay({ upstreamEventId: 'evt-never-existed' })
  );

  console.log(`\nSTRONG: ${strong}, WEAK: ${weak}, ERRORS: ${failed}`);
  if (weaknesses.length) {
    console.log('WEAKNESS INVENTORY (attested but must be rejected):');
    for (const n of weaknesses) console.log(`  - ${n}`);
  }
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
