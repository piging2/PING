#!/usr/bin/env python3
"""Replay fidelity lane: reconcile test_replay_worker_wiring.js with the new
convergence contract. Every replacement must match exactly once.
No em dashes anywhere."""
import io, sys

PATH = '/home/nolan/worktrees/constitutional-convergence/gateway/test_replay_worker_wiring.js'
with io.open(PATH, 'r', encoding='utf-8') as f:
    src = f.read()

edits = []

# RW-2: fixture needs a real timestamp; strengthen with the new verdict bindings.
old = """  const replayEvents = [
    {
      event_id: 'evt-clean-1',
      event_type: 'artifact_commit',
      artifact_id: 'art-1',
      artifact_hash: 'sha256:abc123',
      artifact_lineage: [],
      artifact_namespace: 'test',
      payload: { key: 'value1' },
      metadata: { event_id: 'evt-clean-1' },
    },
  ];

  const result = await worker.handle({
    event_id: 'evt-test-2',
    event_type: 'REPLAY_VERIFY',
    payload: {
      documentId: 'doc_2',
      replay_events: replayEvents,
    },
    metadata: { correlation_id: 'corr-1' },
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.replay.verified, true);
  assert.equal(result.replay.reason, 'kernel_verified');
  assert.ok(result.replay.fingerprint, 'Should have a fingerprint');
  assert.ok(result.replay.witness_root, 'Should have a witness_root');
  assert.equal(result.replay.violations.length, 0);
});
"""
new = """  const replayEvents = [
    {
      event_id: 'evt-clean-1',
      event_type: 'artifact_commit',
      artifact_id: 'art-1',
      artifact_hash: 'sha256:abc123',
      artifact_lineage: [],
      artifact_namespace: 'test',
      timestamp: '2026-08-21T00:00:00.000Z',
      payload: { key: 'value1' },
      metadata: { event_id: 'evt-clean-1' },
    },
  ];

  const result = await worker.handle({
    event_id: 'evt-test-2',
    event_type: 'REPLAY_VERIFY',
    payload: {
      documentId: 'doc_2',
      replay_events: replayEvents,
    },
    metadata: { correlation_id: 'corr-1' },
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.replay.verified, true);
  assert.equal(result.replay.reason, 'kernel_verified');
  assert.ok(result.replay.fingerprint, 'Should have a fingerprint');
  assert.ok(result.replay.witness_root, 'Should have a witness_root');
  assert.equal(result.replay.violations.length, 0);
  // Convergence verdict bindings: what executed and what it consumed.
  assert.equal(result.replay.completeness, 'COMPLETE');
  assert.equal(result.replay.replay_engine_version, 'v1');
  assert.equal(result.replay.input_source, 'test-mode');
  assert.ok(/^[0-9a-f]{64}$/.test(result.replay.canonical_input_hash),
    'canonical_input_hash must be a real sha256 hex digest');
  assert.ok(result.replay.event_types.includes('artifact_commit'));
});
"""
edits.append(('RW-2 timestamp + bindings', old, new))

# RW-3: the old test claimed the provider read artifact_lineage and that a
# cycle would reach the kernel. It never did: the provider only emits causation
# edges that resolve to an already-committed envelope, so lineage is a DAG by
# construction and adversarial causation is sanitized, not executed.
old = """// RW-3: ReplayWorker with provider + circular lineage → kernel_error (throws, not violations)
// The state machine throws DeterministicFailure when parent not found.
// Circular lineage means art-b references art-a which is processed first,
// but art-a's lineage references art-b which doesn't exist yet → throws.
test('RW-3: Provider + circular lineage → verified: false, kernel_error', async () => {
  const eventRuntime = new MockEventRuntime();
  const provider = new KernelReplayExecutionProvider();
  const worker = new ReplayWorker({ eventRuntime, replayProvider: provider });

  // Cycle: art-a → art-b (lineage) but processed in order a,b
  // When processing art-a: lineage=['art-b'] but art-b doesn't exist yet → throw
  const replayEvents = [
    {
      event_id: 'evt-cycle-1',
      event_type: 'artifact_commit',
      artifact_id: 'art-a',
      artifact_hash: 'sha256:aaa',
      artifact_lineage: ['art-b'],
      artifact_namespace: 'test',
      payload: {},
      metadata: { event_id: 'evt-cycle-1' },
    },
    {
      event_id: 'evt-cycle-2',
      event_type: 'artifact_commit',
      artifact_id: 'art-b',
      artifact_hash: 'sha256:bbb',
      artifact_lineage: ['art-a'],
      artifact_namespace: 'test',
      payload: {},
      metadata: { event_id: 'evt-cycle-2' },
    },
  ];

  const result = await worker.handle({
    event_id: 'evt-test-3',
    event_type: 'REPLAY_VERIFY',
    payload: {
      documentId: 'doc_3',
      replay_events: replayEvents,
    },
    metadata: {},
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.replay.verified, false);
  // The state machine throws DeterministicFailure → caught by provider as kernel_error
  // → worker receives it as kernel_error or the provider returns violations
  // Either way: verified must be false
  assert.ok(
    result.replay.reason === 'kernel_error' || result.replay.violations.length > 0,
    `Expected kernel_error or violations, got reason=${result.replay.reason}, violations=${JSON.stringify(result.replay.violations)}`
  );
});
"""
new = """// RW-3: Lineage is a DAG by construction. The provider only emits a causation
// edge when it resolves to an envelope already committed in the same stream,
// so adversarial causation (self-reference, forward reference, dangling
// reference) is sanitized by construction and can never reach the kernel as a
// cycle. The replay stays clean and verified; a true backward causal edge is
// preserved.
test('RW-3: Adversarial causation sanitized by construction → verified: true', async () => {
  const eventRuntime = new MockEventRuntime();
  const provider = new KernelReplayExecutionProvider();
  const worker = new ReplayWorker({ eventRuntime, replayProvider: provider });

  const replayEvents = [
    {
      event_id: 'evt-cycle-1',
      event_type: 'artifact_commit',
      timestamp: '2026-08-21T00:00:00.000Z',
      causation_id: 'evt-cycle-1', // self-reference: cannot resolve, sanitized
      payload: {},
      metadata: { event_id: 'evt-cycle-1' },
    },
    {
      event_id: 'evt-cycle-2',
      event_type: 'artifact_commit',
      timestamp: '2026-08-21T00:00:01.000Z',
      causation_id: 'evt-cycle-3', // forward reference: not yet committed, sanitized
      payload: {},
      metadata: { event_id: 'evt-cycle-2' },
    },
    {
      event_id: 'evt-cycle-3',
      event_type: 'artifact_commit',
      timestamp: '2026-08-21T00:00:02.000Z',
      causation_id: 'evt-cycle-1', // true backward edge: preserved
      payload: {},
      metadata: { event_id: 'evt-cycle-3' },
    },
  ];

  const result = await worker.handle({
    event_id: 'evt-test-3',
    event_type: 'REPLAY_VERIFY',
    payload: {
      documentId: 'doc_3',
      replay_events: replayEvents,
    },
    metadata: {},
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.replay.verified, true);
  assert.equal(result.replay.reason, 'kernel_verified');
  assert.equal(result.replay.violations.length, 0);
  assert.equal(result.replay.event_count, 3);
});
"""
edits.append(('RW-3 DAG by construction', old, new))

# RW-4: fixture needs a real timestamp.
old = """  const replayEvents = [
    {
      event_id: 'evt-orphan-1',
      event_type: 'artifact_commit',
      artifact_id: 'art-orphan',
      artifact_hash: 'sha256:orphan',
      artifact_lineage: ['art-missing'],
      artifact_namespace: 'test',
      payload: {},
      metadata: { event_id: 'evt-orphan-1' },
    },
  ];
"""
new = """  const replayEvents = [
    {
      event_id: 'evt-orphan-1',
      event_type: 'artifact_commit',
      artifact_id: 'art-orphan',
      artifact_hash: 'sha256:orphan',
      artifact_lineage: ['art-missing'],
      artifact_namespace: 'test',
      timestamp: '2026-08-21T00:00:00.000Z',
      payload: {},
      metadata: { event_id: 'evt-orphan-1' },
    },
  ];
"""
edits.append(('RW-4 timestamp', old, new))

# RW-5: empty replay_events no longer falls back to the trigger. With no
# canonical store available the worker fails closed.
old = """// RW-5: ReplayWorker + provider with an explicitly-empty replay_events array.
// _buildReplayEvents() treats an empty array as "no transcript provided" and
// falls back to the triggering event as a single-event replay — a standalone
// observation must always be independently replayable. Therefore verified: true
// (kernel_verified). The provider's `no_events` path is only reachable when a
// genuinely empty { state: { replay_events: [] } } transcript reaches it; that
// path is exercised directly at provider level in test_kernel_replay.js.
test('RW-5: Provider + empty replay_events → single-event fallback → verified: true', async () => {
  const eventRuntime = new MockEventRuntime();
  const provider = new KernelReplayExecutionProvider();
  const worker = new ReplayWorker({ eventRuntime, replayProvider: provider });

  const result = await worker.handle({
    event_id: 'evt-test-5',
    event_type: 'REPLAY_VERIFY',
    payload: {
      documentId: 'doc_5',
      replay_events: [],
    },
    metadata: {},
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.replay.verified, true);
  assert.equal(result.replay.reason, 'kernel_verified');
  assert.equal(result.replay.violations.length, 0);
  assert.equal(result.replay.event_count, 1, 'single-event fallback replays one event');
});
"""
new = """// RW-5: ReplayWorker + provider + empty replay_events + no canonical store.
// There is no test-mode input and no store to load the correlation group, so
// the worker fails closed: verified:false with reason replay_input_unavailable.
// The triggering event is NEVER repackaged as its own replay input.
test('RW-5: Provider + empty replay_events + no store → fail closed', async () => {
  const eventRuntime = new MockEventRuntime();
  const provider = new KernelReplayExecutionProvider();
  const worker = new ReplayWorker({ eventRuntime, replayProvider: provider });

  const result = await worker.handle({
    event_id: 'evt-test-5',
    event_type: 'REPLAY_VERIFY',
    payload: {
      documentId: 'doc_5',
      replay_events: [],
    },
    metadata: {},
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.replay.verified, false);
  assert.equal(result.replay.reason, 'replay_input_unavailable');
  assert.equal(result.replay.input_source, 'unavailable');
  assert.equal(result.replay.fingerprint, null);
  assert.equal(result.replay.witness_root, null);

  const emitted = eventRuntime.getEmitted().find((e) => e.event_type === 'REPLAY_COMPLETED');
  assert.ok(emitted, 'REPLAY_COMPLETED must still be emitted');
  assert.equal(emitted.payload.authority.verified, false);
  assert.equal(emitted.payload.authority.failure_code, 'replay_input_unavailable');
});
"""
edits.append(('RW-5 fail closed', old, new))

# RW-9: the throwing provider is only reached when test-mode input is present.
old = """  const result = await worker.handle({
    event_id: 'evt-test-9',
    event_type: 'REPLAY_VERIFY',
    payload: { documentId: 'doc_9' },
    metadata: {},
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.replay.verified, false);
  assert.equal(result.replay.reason, 'kernel_error');
  assert.equal(result.replay.error, 'Simulated kernel crash');
});
"""
new = """  const result = await worker.handle({
    event_id: 'evt-test-9',
    event_type: 'REPLAY_VERIFY',
    payload: {
      documentId: 'doc_9',
      replay_events: [{
        event_id: 'evt-throw-1',
        event_type: 'artifact_commit',
        timestamp: '2026-08-21T00:00:00.000Z',
        payload: {},
        metadata: {},
      }],
    },
    metadata: {},
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.replay.verified, false);
  assert.equal(result.replay.reason, 'kernel_error');
  assert.equal(result.replay.error, 'Simulated kernel crash');
});
"""
edits.append(('RW-9 test-mode input', old, new))

# RW-10: fixture needs a real timestamp.
old = """  const replayEvents = [
    {
      event_id: 'evt-det-1',
      event_type: 'artifact_commit',
      artifact_id: 'art-det',
      artifact_hash: 'sha256:deterministic',
      artifact_lineage: [],
      artifact_namespace: 'test',
      payload: { data: 'deterministic' },
      metadata: { event_id: 'evt-det-1' },
    },
  ];
"""
new = """  const replayEvents = [
    {
      event_id: 'evt-det-1',
      event_type: 'artifact_commit',
      artifact_id: 'art-det',
      artifact_hash: 'sha256:deterministic',
      artifact_lineage: [],
      artifact_namespace: 'test',
      timestamp: '2026-08-21T00:00:00.000Z',
      payload: { data: 'deterministic' },
      metadata: { event_id: 'evt-det-1' },
    },
  ];
"""
edits.append(('RW-10 timestamp', old, new))

# RW-13: fixture needs a real timestamp.
old = """  const replayEvents = [
    {
      event_id: 'evt-compute-1',
      event_type: 'artifact_commit',
      artifact_id: 'art-compute',
      // No artifact_hash — provider will compute from payload
      artifact_lineage: [],
      artifact_namespace: 'test',
      payload: { computed: true },
      metadata: { event_id: 'evt-compute-1' },
    },
  ];
"""
new = """  const replayEvents = [
    {
      event_id: 'evt-compute-1',
      event_type: 'artifact_commit',
      artifact_id: 'art-compute',
      // No artifact_hash — provider will compute from payload
      artifact_lineage: [],
      artifact_namespace: 'test',
      timestamp: '2026-08-21T00:00:00.000Z',
      payload: { computed: true },
      metadata: { event_id: 'evt-compute-1' },
    },
  ];
"""
edits.append(('RW-13 timestamp', old, new))

# RW-14: fixture needs a real timestamp.
old = """  const replayEvents = [
    {
      event_id: 'evt-witness-1',
      event_type: 'artifact_commit',
      artifact_id: 'art-witness',
      artifact_hash: 'sha256:witness',
      artifact_lineage: [],
      artifact_namespace: 'test',
      payload: { test: true },
      metadata: { event_id: 'evt-witness-1' },
    },
  ];
"""
new = """  const replayEvents = [
    {
      event_id: 'evt-witness-1',
      event_type: 'artifact_commit',
      artifact_id: 'art-witness',
      artifact_hash: 'sha256:witness',
      artifact_lineage: [],
      artifact_namespace: 'test',
      timestamp: '2026-08-21T00:00:00.000Z',
      payload: { test: true },
      metadata: { event_id: 'evt-witness-1' },
    },
  ];
"""
edits.append(('RW-14 timestamp', old, new))

# RW-16: strengthen the evidence assertions with the new convergence bindings.
old = """  // Deterministic execution identity = kernel fingerprint (actually produced)
  assert.strictEqual(ev.deterministic_execution_identity, result.replay.fingerprint,
    'deterministic identity must equal the kernel fingerprint');
  assert.ok(ev.deterministic_execution_identity, 'fingerprint must be present on verified path');
});
"""
new = """  // Deterministic execution identity = kernel fingerprint (actually produced)
  assert.strictEqual(ev.deterministic_execution_identity, result.replay.fingerprint,
    'deterministic identity must equal the kernel fingerprint');
  assert.ok(ev.deterministic_execution_identity, 'fingerprint must be present on verified path');

  // Convergence bindings on the evidence block (recorded, never fabricated)
  assert.strictEqual(ev.replay_engine_version, 'v1');
  assert.strictEqual(ev.completeness, 'COMPLETE');
  assert.strictEqual(ev.input_source, 'test-mode');
  assert.strictEqual(ev.input_event_count, 1);
  assert.ok(/^[0-9a-f]{64}$/.test(ev.canonical_input_hash),
    'canonical_input_hash must be a real sha256 hex digest of the consumed input');
});
"""
edits.append(('RW-16 evidence bindings', old, new))

for name, old, new in edits:
    count = src.count(old)
    if count != 1:
        sys.stderr.write('MISMATCH %s: found %d (need 1)\n' % (name, count))
        sys.exit(1)
    src = src.replace(old, new, 1)
    print('applied', name)

with io.open(PATH, 'w', encoding='utf-8') as f:
    f.write(src)
print('wrote', PATH)

for bad in ['\u2014']:
    if bad in src:
        sys.stderr.write('LEFTOVER em dash\n')
        sys.exit(1)
print('sanity ok')
