/**
 * blocks.test.ts — P-20260923-008.
 *
 * Proves the context-block properties:
 *  1. readOnly blocks reject writes;
 *  2. char limits enforced at write time, no silent truncation;
 *  3. exact-match edit fails closed on mismatch, applies on match;
 *  4. overview computes per-block usage and is deeply frozen;
 *  5. ceiling seam reports remaining headroom.
 */

import {
  assembleOverview,
  createBlock,
  editBlock,
  writeBlock,
  ContextBlock,
} from '../blocks';

function sampleBlocks(): readonly ContextBlock[] {
  return [
    createBlock('persona', 'reserved', 500, 'You are Pigi.'),
    createBlock('task', 'editable', 200, 'do the thing'),
  ];
}

test('reserved blocks are readOnly by default and reject writes', () => {
  const blocks = sampleBlocks();
  expect(blocks[0].readOnly).toBe(true);
  expect(blocks[1].readOnly).toBe(false);

  const r = writeBlock(blocks, 'persona', 'new persona');
  expect(r.ok).toBe(false);
  if (!r.ok) {
    expect(r.error).toBe('READ_ONLY');
  }
  // Content unchanged on denial.
  expect(blocks[0].content).toBe('You are Pigi.');
});

test('char limits enforced at write time: over-limit writes rejected, never truncated', () => {
  const blocks = sampleBlocks();
  const tooLong = 'x'.repeat(201);
  const r = writeBlock(blocks, 'task', tooLong);
  expect(r.ok).toBe(false);
  if (!r.ok) {
    expect(r.error).toBe('LIMIT_EXCEEDED');
  }
  expect(blocks[1].content).toBe('do the thing'); // unchanged, not truncated

  const ok = writeBlock(blocks, 'task', 'x'.repeat(200));
  expect(ok.ok).toBe(true);
  if (ok.ok) {
    expect(ok.blocks[1].content).toHaveLength(200);
  }
});

test('exact-match edit: mismatch fails closed, match applies', () => {
  const blocks = sampleBlocks();

  const mismatch = editBlock(blocks, 'task', 'do the OTHER thing', 'done');
  expect(mismatch.ok).toBe(false);
  if (!mismatch.ok) {
    expect(mismatch.error).toBe('EDIT_MISMATCH');
  }
  expect(blocks[1].content).toBe('do the thing');

  const match = editBlock(blocks, 'task', 'do the thing', 'did the thing');
  expect(match.ok).toBe(true);
  if (match.ok) {
    expect(match.blocks[1].content).toBe('did the thing');
  }

  // Exact-match edit on a readOnly block is denied even with a perfect match.
  const ro = editBlock(blocks, 'persona', 'You are Pigi.', 'You are someone else.');
  expect(ro.ok).toBe(false);
  if (!ro.ok) {
    expect(ro.error).toBe('READ_ONLY');
  }
});

test('overview: per-block usage, totals, and deep freeze (read-only to agent)', () => {
  const blocks = sampleBlocks();
  const ov = assembleOverview(blocks);

  expect(ov.blocks).toHaveLength(2);
  expect(ov.blocks[0]).toMatchObject({ name: 'persona', usedChars: 13, limitChars: 500 });
  expect(ov.blocks[1]).toMatchObject({ name: 'task', usedChars: 12, limitChars: 200 });
  expect(ov.totalUsedChars).toBe(25);
  expect(ov.totalLimitChars).toBe(700);
  expect(ov.ceilingChars).toBeNull();
  expect(ov.remainingChars).toBeNull();

  // Read-only to the agent: deeply frozen.
  expect(Object.isFrozen(ov)).toBe(true);
  expect(Object.isFrozen(ov.blocks)).toBe(true);
  expect(Object.isFrozen(ov.blocks[0])).toBe(true);
});

test('ceiling seam: injected ledger ceiling reports remaining headroom', () => {
  const blocks = sampleBlocks();
  const ov = assembleOverview(blocks, 1000);
  expect(ov.ceilingChars).toBe(1000);
  expect(ov.remainingChars).toBe(975);
});

test('unknown block names fail closed', () => {
  const blocks = sampleBlocks();
  const w = writeBlock(blocks, 'nope', 'x');
  expect(w.ok).toBe(false);
  if (!w.ok) {
    expect(w.error).toBe('UNKNOWN_BLOCK');
  }
  const e = editBlock(blocks, 'nope', 'x', 'y');
  expect(e.ok).toBe(false);
  if (!e.ok) {
    expect(e.error).toBe('UNKNOWN_BLOCK');
  }
});
