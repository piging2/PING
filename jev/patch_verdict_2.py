"""Verdict-authority fix, patch 2: witness transcript causation read + adversarial test rewrite."""
import sys

# ─── 2a. Witness reads causation_id from metadata OR top level ───
path = 'ping-runtime/workers/canonical_workers.js'
with open(path) as f:
    text = f.read()
old = """    for (const e of events) {
      const cid = e.metadata && e.metadata.causation_id;
      if (cid && !ids.has(cid) && cid !== payload.upstreamEventId) {"""
new = """    for (const e of events) {
      // Causation may be stated in metadata (genuine correlation-group shape)
      // or top level; a forgery must not evade the closure check by moving it.
      const cid = (e.metadata && e.metadata.causation_id) || e.causation_id;
      if (cid && !ids.has(cid) && cid !== payload.upstreamEventId) {"""
assert text.count(old) == 1, "witness causation anchor not found"
text = text.replace(old, new)
with open(path, 'w') as f:
    f.write(text)
print("witness causation read patched")

# ─── 2b. Rewrite the adversarial harness ───
test = '''// Adversarial rejection coverage for the witness attestation boundary.
// Directive section 5 + flaw correction (b): 63/63 with zero refusals is
// evidence of execution, not evidence of strong verification. This suite
// manufactures REPLAY_COMPLETED cases the witness MUST reject and enforces
// the outcome.
//
// Post-fix (2026-09-23, verdict-authority lane): the former 7 WEAK cases are
// hard rejection requirements, plus one bonus case (missing authority
// evidence). The harness exits non-zero unless 5/5 strong pass and 8/8
// adversarial reject. The clean attestation fixture mirrors the genuine
// ReplayWorker payload shape exactly (kernel execution authority block
// included); any drift from the genuine shape must be a conscious fixture
// update, not silent weakening.
//
// Run: node gateway/test_witness_adversarial.js (from repo root)

const path = require('path');
const { WitnessWorker } = require('../ping-runtime/workers/canonical_workers');
const { EventValidator } = require('../ping-runtime/events/event_validator');

const repoRoot = path.resolve(__dirname, '..');
const eventValidator = new EventValidator(repoRoot);
eventValidator.load();

let passed = 0;
let failed = 0;
const failures = [];

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

// Genuine ReplayWorker authority evidence (see ReplayWorker._emit ok-path +
// _buildAuthorityEvidence). The fixed strings are identifiers, not trust —
// they must accompany the fingerprint, violations, and ancestry checks.
function genuineAuthority() {
  return {
    authority: 'ReplayWorker',
    provider: 'KernelReplayExecutionProvider',
    sourceEventId: 'evt-proj-1',
    correlationId: 'corr-1',
    namespace: 'core::system',
    verdict: 'verified',
    violationsCount: 0,
    deterministicFingerprint: 'fp-abc123',
    canonicalInputHash: 'sha-input-1',
  };
}

function replayCompletedEvent(replay, docId = 'doc-1', stripAuthority = false) {
  const payload = {
    documentId: docId,
    replay,
    upstreamEventId: 'evt-proj-1',
  };
  if (!stripAuthority) payload.authority = genuineAuthority();
  return {
    event_id: 'evt-replay-1',
    event_type: 'REPLAY_COMPLETED',
    source: 'replay',
    namespace: 'core::system',
    metadata: { correlation_id: 'corr-1' },
    payload,
  };
}

function validReplay(over = {}) {
  return {
    documentId: 'doc-1',
    eventType: 'PROJECTION_CREATED',
    timestamp: '2026-09-22T00:00:00.000Z',
    verified: true,
    status: 'ok',
    reason: null,
    fingerprint: 'fp-abc123',
    witness_root: 'wr-def456',
    violations: [],
    ...over,
  };
}

async function check(name, expectation, replay, docId, stripAuthority = false) {
  // expectation: 'reject' (must refuse attestation) or 'attest' (must attest)
  const m = mockRuntime();
  const w = new WitnessWorker({ eventRuntime: m.eventRuntime, pool: m.pool, eventValidator });
  let result;
  try {
    result = await w.handle(replayCompletedEvent(replay, docId, stripAuthority));
  } catch (err) {
    failed++;
    failures.push(name);
    console.log(`  FAIL ${name}: threw ${err.message}`);
    return;
  }
  const emittedTypes = m.emitted.map((e) => e.eventType);
  const rejected = emittedTypes.includes('WITNESS_REJECTED') && result.status === 'rejected';
  const attested = emittedTypes.includes('WITNESS_CREATED') && result.status === 'ok';

  if (expectation === 'reject' && rejected) {
    passed++;
    console.log(`  PASS ${name}: rejected as required`);
  } else if (expectation === 'attest' && attested) {
    passed++;
    console.log(`  PASS ${name}: attested as allowed`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  FAIL ${name}: unexpected outcome (emitted: ${emittedTypes.join(',')}, status: ${result.status})`);
  }
}

(async () => {
  console.log('=== witness adversarial rejection coverage (verdict-authority lane) ===');

  // Strong cases: must keep passing unchanged in behavior
  await check('verified:false -> reject', 'reject', validReplay({ verified: false, reason: 'kernel_error' }));
  await check('missing replay object -> reject', 'reject', null);
  await check('verified:"true" (string) -> reject', 'reject', validReplay({ verified: 'true' }));
  await check('verified:1 (number) -> reject', 'reject', validReplay({ verified: 1 }));

  // The one legitimate attestation path (genuine producer shape)
  await check('clean verified replay -> attest', 'attest', validReplay());

  // Formerly WEAK: now hard rejection requirements
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
        { event_id: 'e1', event_type: 'CLAIM_CREATED', metadata: { causation_id: 'nonexistent-parent' } },
      ],
    })
  );
  await check(
    'verified:true with duplicate semantic event -> reject',
    'reject',
    validReplay({
      replay_events: [
        { event_id: 'e1', event_type: 'CLAIM_CREATED', metadata: { causation_id: null } },
        { event_id: 'e1', event_type: 'CLAIM_CREATED', metadata: { causation_id: null } },
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
      replay_events: [{ event_id: 'e9', event_type: 'TOTALLY_MADE_UP_TYPE', metadata: { causation_id: null } }],
    })
  );
  await check(
    'verified:true with forged upstream reference -> reject',
    'reject',
    validReplay({ upstreamEventId: 'evt-never-existed' })
  );
  // Bonus: a bare verified:true without the producer authority evidence block
  // must be refused even when every other field is well-formed.
  await check(
    'verified:true with missing authority evidence -> reject',
    'reject',
    validReplay(),
    'doc-1',
    true // stripAuthority
  );

  console.log(`\\nPASSED: ${passed}, FAILED: ${failed}`);
  if (failures.length) {
    console.log('FAILURES:');
    for (const n of failures) console.log(`  - ${n}`);
  }
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
'''
with open('gateway/test_witness_adversarial.js', 'w') as f:
    f.write(test)
print("adversarial test rewritten")
print("PATCH 2 COMPLETE")
