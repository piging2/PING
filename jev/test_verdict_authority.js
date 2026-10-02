// Verdict-authority admission tests + golden-path fixture.
// Lane: JEV VERDICT AUTHORITY FIX (2026-09-23).
//
// Threat model: AUTHENTICATED PRINCIPAL + VALID API KEY != AUTHORIZED
// VERDICT PRODUCER. A valid key proves caller identity; it does not authorize
// the semantic claim. Before this fix, POST /events accepted ANY event_type
// with source 'api' into canonical history — a hand-built REPLAY_COMPLETED
// with verified:true was persisted and eligible for witness attestation.
//
// After the fix, UnifiedEventRuntime.emit enforces at the single admission
// choke point: verdict-class events are accepted ONLY from their canonical
// producer worker with qualifying provenance, BEFORE persistence, and the
// check runs before the _skipGovernance branch (unskippable by bridges).
//
// Run: node gateway/test_verdict_authority.js (from repo root)

const path = require('path');
const { UnifiedEventRuntime } = require('../ping-runtime/events/unified_event_runtime');
const { ReplayWorker, WitnessWorker } = require('../ping-runtime/workers/canonical_workers');
const { KernelReplayExecutionProvider } = require('./kernel_replay_execution_provider');
const { EventValidator } = require('../ping-runtime/events/event_validator');

const repoRoot = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const failures = [];

function check(name, cond, detail) {
  if (cond) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`);
  }
}

// Fake pg pool: accepts the INSERT so emit() can run the full path offline.
function fakePool() {
  return { query: async () => ({ rowCount: 1, rows: [] }) };
}

function genuineReplayPayload(over = {}) {
  return {
    documentId: 'doc-1',
    replay: { verified: true, reason: 'kernel_verified', fingerprint: 'fp-1', violations: [] },
    authority: { authority: 'ReplayWorker', provider: 'KernelReplayExecutionProvider' },
    upstreamEventId: 'evt-up-1',
    ...over,
  };
}

async function main() {
  console.log('=== verdict-authority admission (unified_event_runtime.emit) ===');
  const rt = new UnifiedEventRuntime({ pool: fakePool() });

  // ── A. Attack reproduction: hand-built verdict events from an ──
  // authenticated API-shaped source. Even a PERFECT payload forgery
  // (all evidence fields present) is rejected: the caller is not the producer.
  const forged = genuineReplayPayload();
  let r = await rt.emit('REPLAY_COMPLETED', 'api', forged);
  check('A1 hand-built REPLAY_COMPLETED from api rejected', r.status === 'error' && /verdict_not_authorized/.test(r.error), JSON.stringify(r));

  r = await rt.emit('WITNESS_CREATED', 'api', { documentId: 'd1', witness: { attestation: 'w-x' }, upstreamEventId: 'e1' });
  check('A2 hand-built WITNESS_CREATED from api rejected', r.status === 'error' && /verdict_not_authorized/.test(r.error), JSON.stringify(r));

  r = await rt.emit('WITNESS_REJECTED', 'api', { documentId: 'd1', upstreamEventId: 'e1', reason: 'x' });
  check('A3 hand-built WITNESS_REJECTED from api rejected', r.status === 'error' && /verdict_not_authorized/.test(r.error), JSON.stringify(r));

  r = await rt.emit('LINEAGE_CREATED', 'api', { documentId: 'd1', lineage: {}, upstreamEventId: 'e1' });
  check('A4 hand-built LINEAGE_CREATED from api rejected', r.status === 'error' && /verdict_not_authorized/.test(r.error), JSON.stringify(r));

  r = await rt.emit('JEV_DECISION_EVALUATED', 'api', { mode: 'shadow', evaluations: [] });
  check('A5 hand-built JEV_DECISION_EVALUATED from api rejected', r.status === 'error' && /verdict_not_authorized/.test(r.error), JSON.stringify(r));

  // ── B. Source-string spoofing: the producer name cannot be impersonated ──
  // via a lookalike source string. Only the exact worker _name passes.
  for (const spoof of ['ReplayWorker', 'REPLAY', 'kernel', 'system', 'trusted', 'repository_events', 'canonical_events']) {
    r = await rt.emit('REPLAY_COMPLETED', spoof, forged);
    check(`B1 source spoof '${spoof}' rejected`, r.status === 'error' && /verdict_not_authorized/.test(r.error), JSON.stringify(r));
  }

  // ── C. Bridge / internal bypass attempts: _skipGovernance does NOT ──
  // skip verdict authorization (the check runs before that branch).
  r = await rt.emit('REPLAY_COMPLETED', 'repository_events', forged, { _skipGovernance: true });
  check('C1 bridge-shaped verdict with _skipGovernance rejected', r.status === 'error' && /verdict_not_authorized/.test(r.error), JSON.stringify(r));

  r = await rt.emit('WITNESS_CREATED', 'canonical_events', { documentId: 'd1', witness: { attestation: 'w-x' }, upstreamEventId: 'e1' }, { _skipGovernance: true });
  check('C2 canonical-bridge-shaped verdict with _skipGovernance rejected', r.status === 'error' && /verdict_not_authorized/.test(r.error), JSON.stringify(r));

  // ── D. Producer with missing provenance is rejected (not silently fixed) ──
  r = await rt.emit('REPLAY_COMPLETED', 'replay', { documentId: 'd1' });
  check('D1 producer source but missing provenance rejected', r.status === 'error' && /verdict_provenance_missing/.test(r.error), JSON.stringify(r));

  r = await rt.emit('WITNESS_CREATED', 'witness', { documentId: 'd1' });
  check('D2 witness verdict missing attestation rejected', r.status === 'error' && /verdict_provenance_missing/.test(r.error), JSON.stringify(r));

  // ── E. Genuine producer paths accepted (no weakening of real behavior) ──
  r = await rt.emit('REPLAY_COMPLETED', 'replay', forged);
  check('E1 genuine REPLAY_COMPLETED (verified:true) accepted', r.status === 'ok', JSON.stringify(r));

  r = await rt.emit('REPLAY_COMPLETED', 'replay', {
    documentId: 'd1',
    replay: { verified: false, reason: 'no_replay_provider', fingerprint: null, violations: [] },
    authority: { authority: 'ReplayWorker', provider: 'KernelReplayExecutionProvider' },
    upstreamEventId: 'e1',
  });
  check('E2 genuine failure-honest REPLAY_COMPLETED (verified:false) accepted', r.status === 'ok', JSON.stringify(r));

  r = await rt.emit('WITNESS_CREATED', 'witness', { documentId: 'd1', witness: { attestation: 'w-x' }, upstreamEventId: 'e1' });
  check('E3 genuine WITNESS_CREATED accepted', r.status === 'ok', JSON.stringify(r));

  r = await rt.emit('WITNESS_REJECTED', 'witness', { documentId: 'd1', upstreamEventId: 'e1', reason: 'unverified_replay:x' });
  check('E4 genuine WITNESS_REJECTED accepted', r.status === 'ok', JSON.stringify(r));

  r = await rt.emit('LINEAGE_CREATED', 'lineage', { documentId: 'd1', lineage: { causationChain: [] }, upstreamEventId: 'e1' });
  check('E5 genuine LINEAGE_CREATED accepted', r.status === 'ok', JSON.stringify(r));

  r = await rt.emit('JEV_DECISION_EVALUATED', 'jev-shadow', { mode: 'shadow', evaluations: [], agreement: 'agree' });
  check('E6 genuine JEV_DECISION_EVALUATED accepted', r.status === 'ok', JSON.stringify(r));

  // ── F. Non-verdict authenticated ingestion unaffected ──
  for (const t of ['CLAIM_CREATED', 'OBSERVATION_CREATED', 'REPLAY_VERIFY', 'WITNESS_CREATE', 'REVIEW_RECEIVED']) {
    r = await rt.emit(t, 'api', { documentId: 'd1' });
    check(`F1 non-verdict ${t} from api unaffected`, r.status === 'ok', JSON.stringify(r));
  }

  // ── G. Golden path: one real legitimate offline verdict path ──
  console.log('=== golden path: genuine kernel replay -> verdict -> witness ===');
  const grt = new UnifiedEventRuntime({ pool: fakePool() });
  const eventValidator = new EventValidator(repoRoot);
  eventValidator.load();

  const captured = [];
  grt.on('REPLAY_COMPLETED', async (e) => captured.push(e));
  const witnessed = [];
  grt.on('WITNESS_CREATED', async (e) => witnessed.push(e));

  const replayProvider = new KernelReplayExecutionProvider();
  const replayWorker = new ReplayWorker({ eventRuntime: grt, replayProvider });
  const witnessWorker = new WitnessWorker({ eventRuntime: grt, eventValidator });

  // Simulated authenticated principal in a tenant mission context. The
  // principal is RECORDED (traceability) but confers no verdict authority.
  const trigger = {
    event_id: 'evt-trigger-golden-1',
    event_type: 'REPLAY_VERIFY',
    source: 'api',
    namespace: 'tenant::acme-1',
    mission_id: 'mission-golden-1',
    metadata: {
      correlation_id: 'corr-golden-1',
      causation_id: null,
      principal: 'agent:simulated-api-key-1',
    },
    payload: {
      documentId: 'doc-golden-1',
      replay_events: [
        {
          event_id: 'evt-c1',
          event_type: 'CLAIM_CREATED',
          payload: { documentId: 'doc-golden-1', claim: { text: 'golden path claim' } },
          metadata: { correlation_id: 'corr-golden-1', causation_id: null },
          timestamp: '2026-09-23T00:00:00.000Z',
        },
      ],
    },
  };

  const replayResult = await replayWorker.handle(trigger);
  check('G1 replay worker executed (kernel)', replayResult.status === 'ok', JSON.stringify(replayResult).slice(0, 200));
  check('G2 genuine REPLAY_COMPLETED admitted through the choke point', captured.length === 1, `captured=${captured.length}`);

  const verdict = captured[0];
  check('G3 verdict source is the producer worker', verdict && verdict.source === 'replay', verdict && verdict.source);
  check('G4 verdict carries kernel execution evidence', !!(verdict && verdict.payload.replay.verified === true && verdict.payload.replay.fingerprint && verdict.payload.authority && verdict.payload.authority.provider === 'KernelReplayExecutionProvider'), verdict && JSON.stringify(verdict.payload.replay).slice(0, 160));
  check('G5 tenant namespace preserved through the verdict', verdict && verdict.namespace === 'tenant::acme-1', verdict && verdict.namespace);

  const witnessResult = await witnessWorker.handle({
    event_id: verdict.event_id,
    event_type: 'REPLAY_COMPLETED',
    source: verdict.source,
    namespace: verdict.namespace,
    metadata: verdict.metadata,
    payload: verdict.payload,
  });
  check('G6 witness attested the genuine verdict', witnessResult.status === 'ok', JSON.stringify(witnessResult).slice(0, 200));
  // allow dispatch to flush
  await new Promise((res) => setTimeout(res, 50));
  check('G7 WITNESS_CREATED admitted from the witness producer', witnessed.length === 1 && witnessed[0].source === 'witness', `witnessed=${witnessed.length}`);

  // Golden-path fixture: the auditable record of one legitimate verdict.
  const fixture = {
    principal: 'agent:simulated-api-key-1 (authenticated; recorded, not authorized)',
    tenant: verdict.namespace,
    mission: 'mission-golden-1',
    run: { engine: 'DeterministicReplayEngine', provider: 'KernelReplayExecutionProvider', fingerprint: verdict.payload.replay.fingerprint },
    capability_decision: 'admission: source==replay AND replay well-formed => ok; witness: evidence qualified => attest',
    evidence_reference: { upstreamEventId: verdict.payload.upstreamEventId, authority: verdict.payload.authority },
    verdict_event: { event_id: verdict.event_id, event_type: verdict.event_type, source: verdict.source },
    witness_result: { status: witnessResult.status, attestation: witnessResult.witness && witnessResult.witness.attestation },
  };
  console.log('GOLDEN-PATH FIXTURE: ' + JSON.stringify(fixture));

  console.log(`\nPASSED: ${passed}, FAILED: ${failed}`);
  if (failures.length) {
    console.log('FAILURES:');
    for (const n of failures) console.log(`  - ${n}`);
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
