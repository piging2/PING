import { isOverdue, decideRedrive, UnknownRunStateError, OverdueInput } from '../reconcile/overdue';

const NOW = 1_786_000_000_000; // fixed observation time — never Date.now()
const HOUR = 3_600_000;

function input(over: Partial<OverdueInput>): OverdueInput {
  return {
    state: 'RUNNING',
    dueAtMs: NOW - 2 * HOUR,
    nowMs: NOW,
    graceMs: HOUR,
    ...over,
  };
}

describe('isOverdue — core semantics', () => {
  test('RUNNING past dueAt+grace is overdue', () => {
    expect(isOverdue(input({}))).toBe(true);
  });

  test('grace period is respected (not overdue inside grace)', () => {
    expect(isOverdue(input({ dueAtMs: NOW - 30 * 60_000, graceMs: HOUR }))).toBe(false);
  });

  test('PENDING past dueAt+grace is overdue', () => {
    expect(isOverdue(input({ state: 'PENDING' }))).toBe(true);
  });

  test('no deadline is never overdue (fail-closed)', () => {
    expect(isOverdue(input({ dueAtMs: null }))).toBe(false);
  });

  test('terminal states are never overdue, however late', () => {
    for (const state of ['SUCCEEDED', 'FAILED', 'CANCELLED']) {
      expect(isOverdue(input({ state, dueAtMs: 0, nowMs: NOW, graceMs: 0 }))).toBe(false);
    }
  });

  test('BLOCKED is a deliberate hold, not lateness', () => {
    expect(isOverdue(input({ state: 'BLOCKED' }))).toBe(false);
  });

  test('reconciler-owned states are never overdue (no double handling)', () => {
    expect(isOverdue(input({ state: 'UNKNOWN_EXECUTION' }))).toBe(false);
    expect(isOverdue(input({ state: 'NEEDS_RECONCILIATION' }))).toBe(false);
  });

  test('unknown state string throws (fail-closed)', () => {
    expect(() => isOverdue(input({ state: 'weird' }))).toThrow(UnknownRunStateError);
  });

  test('negative grace throws', () => {
    expect(() => isOverdue(input({ graceMs: -1 }))).toThrow(/graceMs/);
  });
});

describe('isOverdue — purity (the core property)', () => {
  test('same state always yields the same decision', () => {
    const in1 = input({});
    const first = isOverdue(in1);
    for (let i = 0; i < 25; i++) {
      expect(isOverdue(input({}))).toBe(first);
    }
  });

  test('reads no clock: works with Date.now sabotaged', () => {
    const spy = jest.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('clock must not be read');
    });
    try {
      expect(isOverdue(input({}))).toBe(true);
      expect(isOverdue(input({ dueAtMs: null }))).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  test('decision is monotonic in nowMs', () => {
    const base = input({ dueAtMs: NOW, graceMs: HOUR });
    expect(isOverdue({ ...base, nowMs: NOW })).toBe(false);
    expect(isOverdue({ ...base, nowMs: NOW + HOUR - 1 })).toBe(false);
    expect(isOverdue({ ...base, nowMs: NOW + HOUR })).toBe(true);
    expect(isOverdue({ ...base, nowMs: NOW + 10 * HOUR })).toBe(true);
  });
});

describe('decideRedrive', () => {
  test('overdue -> ENQUEUE_REDRIVE with an auditable reason', () => {
    const d = decideRedrive(input({}));
    expect(d.decision).toBe('ENQUEUE_REDRIVE');
    expect(d.reason).toMatch(/RUNNING/);
  });

  test('not overdue -> NOOP (never mutates inline; the caller enqueues)', () => {
    const d = decideRedrive(input({ dueAtMs: null }));
    expect(d.decision).toBe('NOOP');
  });
});
