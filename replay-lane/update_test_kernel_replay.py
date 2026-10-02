#!/usr/bin/env python3
"""Replay fidelity lane: reconcile test_kernel_replay.js with the new
convergence contract. Every replacement must match exactly once.
No em dashes anywhere."""
import io, sys

PATH = '/home/nolan/worktrees/constitutional-convergence/gateway/test_kernel_replay.js'
with io.open(PATH, 'r', encoding='utf-8') as f:
    src = f.read()

edits = []

# 1. Old: events without IDs got deterministic generated evt- IDs.
#    New: canonical IDs are carried verbatim; inputs without a usable ID are
#    malformed (skipped, counted), never reminted.
old1 = """await test('event ID prefix generation is deterministic', async () => {
  const provider = new KernelReplayExecutionProvider();
  const events = [
    { event_type: 'A', payload: { x: 1 } },
    { event_type: 'B', payload: { x: 2 } },
    { event_type: 'C', payload: { x: 3 } }
  ];
  const result1 = await provider.executeReplay(makeTranscript(events));
  const result2 = await provider.executeReplay(makeTranscript(events));
  assert.equal(result1.fingerprint, result2.fingerprint,
    'events without evt- prefix must produce deterministic IDs');
});
"""
new1 = """await test('canonical event IDs are carried verbatim, never reminted', async () => {
  const provider = new KernelReplayExecutionProvider();
  const events = [
    { event_id: 'event_carry_1', event_type: 'OBSERVATION_CREATED', timestamp: '2026-08-21T00:00:00.000Z', payload: { x: 1 } },
    { event_id: 'event_carry_2', event_type: 'CLAIM_CREATED', timestamp: '2026-08-21T00:00:01.000Z', payload: { x: 2 } }
  ];
  const result = await provider.executeReplay(makeTranscript(events));
  assert.equal(result.status, 'ok');
  assert.equal(result.event_count, 2);
  const streamJson = Buffer.from(result.canonical_bytes.bytes, 'base64url').toString('utf8');
  assert.ok(streamJson.includes('event_carry_1'), 'canonical ID event_carry_1 must survive in the kernel stream');
  assert.ok(streamJson.includes('event_carry_2'), 'canonical ID event_carry_2 must survive in the kernel stream');
  assert.ok(!streamJson.includes('evt-ping-'), 'no reminted evt-ping- identities may appear');
});

await test('events without an ID are malformed, never reminted', async () => {
  const provider = new KernelReplayExecutionProvider();
  const events = [
    { event_type: 'A', timestamp: '2026-08-21T00:00:00.000Z', payload: { x: 1 } },
    { event_type: 'B', timestamp: '2026-08-21T00:00:01.000Z', payload: { x: 2 } }
  ];
  const result = await provider.executeReplay(makeTranscript(events));
  // No usable identity on any input: nothing for the kernel to verify.
  assert.equal(result.status, 'conversion_failed');
  assert.equal(result.inputs_skipped, 2, 'both identity-less inputs are counted as skipped');
  assert.equal(result.completeness, 'INCOMPLETE');
});
"""
edits.append(('test1 identity carried', old1, new1))

# 2. Old: silent successful truncation. New: truncation is INCOMPLETE.
old2 = """await test('maxEvents limit is respected', async () => {
  const provider = new KernelReplayExecutionProvider();
  const events = makePingEventChain();
  const result = await provider.executeReplay(makeTranscript(events), { maxEvents: 3 });
  assert.equal(result.status, 'ok');
  assert.equal(result.event_count, 3, 'only 3 events should be replayed');
});
"""
new2 = """await test('maxEvents limit is respected', async () => {
  const provider = new KernelReplayExecutionProvider();
  const events = makePingEventChain();
  const result = await provider.executeReplay(makeTranscript(events), { maxEvents: 3 });
  assert.equal(result.status, 'ok');
  assert.equal(result.event_count, 3, 'only 3 events should be replayed');
  assert.equal(result.input_event_count, 8, 'full input window is preserved on the result');
  assert.equal(result.input_truncated, true, 'truncation is named on the result');
  assert.equal(result.completeness, 'INCOMPLETE', 'a truncated window is INCOMPLETE, never silent');
});
"""
edits.append(('test2 maxEvents INCOMPLETE', old2, new2))

# 3. Old: fixtures had no timestamps (silently fabricated before). New: a null
#    entry is skipped, counted, and forces INCOMPLETE.
old3 = """await test('corrupted envelope is skipped gracefully', async () => {
  const provider = new KernelReplayExecutionProvider();
  const events = [
    { event_type: 'A', payload: { x: 1 } },
    null, // will fail CanonicalEventEnvelope constructor
    { event_type: 'B', payload: { x: 2 } }
  ];
  const result = await provider.executeReplay(makeTranscript(events));
  // null event should be skipped, 2 valid events remain
  assert.equal(result.status, 'ok');
  assert.equal(result.event_count, 2);
});
"""
new3 = """await test('corrupted envelope is skipped and counted, never silent', async () => {
  const provider = new KernelReplayExecutionProvider();
  const events = [
    { event_id: 'evt-skip-a', event_type: 'A', timestamp: '2026-08-21T00:00:00.000Z', payload: { x: 1 } },
    null, // malformed input: skipped, counted
    { event_id: 'evt-skip-b', event_type: 'B', timestamp: '2026-08-21T00:00:01.000Z', payload: { x: 2 } }
  ];
  const result = await provider.executeReplay(makeTranscript(events));
  // null event is skipped, 2 valid events remain, and the skip is explicit
  assert.equal(result.status, 'ok');
  assert.equal(result.event_count, 2);
  assert.equal(result.inputs_skipped, 1, 'the skipped input is counted');
  assert.equal(result.completeness, 'INCOMPLETE', 'a window with a skipped input cannot verify as complete');
});
"""
edits.append(('test3 skipped counted', old3, new3))

# 4. Old: mixed valid/invalid partial success asserted only status/count.
#    New: the partial window is INCOMPLETE with the skip count named.
old4 = """  const result = await provider.executeReplay(makeTranscript(events));
  assert.equal(result.status, 'ok');
  assert.equal(result.event_count, 3, '3 valid events processed, 2 null/undefined skipped');
});
"""
new4 = """  const result = await provider.executeReplay(makeTranscript(events));
  assert.equal(result.status, 'ok');
  assert.equal(result.event_count, 3, '3 valid events processed, 2 null/undefined skipped');
  assert.equal(result.inputs_skipped, 2, 'both malformed inputs are counted');
  assert.equal(result.completeness, 'INCOMPLETE', 'a window with skipped inputs is INCOMPLETE');
});
"""
edits.append(('test4 mixed partial INCOMPLETE', old4, new4))

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
