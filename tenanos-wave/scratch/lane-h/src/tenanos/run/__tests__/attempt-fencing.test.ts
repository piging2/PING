/**
 * Tests for attempt-fencing.ts (swarm-02, P-20260923-103).
 * Run: jest --config src/tenanos/jest.config.cjs src/tenanos/run/__tests__/attempt-fencing.test.ts
 *
 * Pure logic only: the transition table, fence contract, checkpoint
 * monotonicity, short-ref resolution, and the reconciliation adapter.
 * The SQL enforcement (conditional UPDATE carrying the fencing token)
 * is the writer's data-access layer; these tests pin the decider.
 */
import {
  AmbiguousAttemptRefError,
  AttemptStatus,
  attemptTransition,
  buildFenceCondition,
  IllegalAttemptTransitionError,
  interpretFenceResult,
  NonMonotonicCheckpointError,
  projectAttemptOutcome,
  reconcileAttempt,
  resolveAttemptRef,
  UnknownAttemptRefError,
  validateCheckpoint,
} from '../attempt-fencing';
import { ReconcileDirective } from '../run-state-authority';

describe('attemptTransition', () => {
  test.each([
    ['created', 'claim', 'claimed'],
    ['created', 'expire', 'stale'],
    ['claimed', 'start', 'running'],
    ['claimed', 'expire', 'stale'],
    ['claimed', 'supersede', 'stale'],
    ['running', 'complete', 'completed'],
    ['running', 'fail', 'failed'],
    ['running', 'timeout', 'timed_out'],
    ['running', 'expire', 'stale'],
    ['running', 'supersede', 'stale'],
  ] as Array<[AttemptStatus, string, AttemptStatus]>)(
    '%s --%s--> %s',
    (from, event, to) => {
      expect(attemptTransition(from, event)).toBe(to);
    },
  );

  test.each([
    ['created', 'complete'],
    ['created', 'fail'],
    ['created', 'start'],
    ['claimed', 'complete'],
    ['claimed', 'fail'],
    ['running', 'claim'],
    ['completed', 'supersede'],
    ['failed', 'retry'],
    ['timed_out', 'complete'],
    ['stale', 'start'],
  ] as Array<[AttemptStatus, string]>)(
    'illegal: %s --%s--> throws (fail closed)',
    (from, event) => {
      expect(() => attemptTransition(from, event)).toThrow(
        IllegalAttemptTransitionError,
      );
    },
  );

  test('terminal states have no legal events', () => {
    for (const s of [
      AttemptStatus.COMPLETED,
      AttemptStatus.FAILED,
      AttemptStatus.TIMED_OUT,
      AttemptStatus.STALE,
    ]) {
      expect(() => attemptTransition(s, 'anything')).toThrow(
        IllegalAttemptTransitionError,
      );
    }
  });

  test('unknown from-status throws', () => {
    expect(() =>
      attemptTransition('weird' as AttemptStatus, 'claim'),
    ).toThrow(IllegalAttemptTransitionError);
  });
});

describe('projectAttemptOutcome', () => {
  test.each([
    [AttemptStatus.CREATED, 'started'],
    [AttemptStatus.CLAIMED, 'started'],
    [AttemptStatus.RUNNING, 'started'],
    [AttemptStatus.COMPLETED, 'succeeded'],
    [AttemptStatus.FAILED, 'failed'],
    [AttemptStatus.TIMED_OUT, 'unknown'],
    [AttemptStatus.STALE, 'unknown'],
  ] as Array<[AttemptStatus, string]>)('%s -> %s', (status, outcome) => {
    expect(projectAttemptOutcome(status)).toBe(outcome);
  });
});

describe('fence contract', () => {
  test('buildFenceCondition shapes the parameterized predicate', () => {
    const c = buildFenceCondition('att_abc', 'tok_xyz', [
      AttemptStatus.RUNNING,
    ]);
    expect(c.text).toContain('fencing_token = $2');
    expect(c.text).toContain('attempt_id = $1');
    expect(c.values).toEqual([
      'att_abc',
      'tok_xyz',
      [AttemptStatus.RUNNING],
    ]);
  });

  test('empty token or id is rejected (fail closed)', () => {
    expect(() =>
      buildFenceCondition('', 'tok', [AttemptStatus.RUNNING]),
    ).toThrow();
    expect(() =>
      buildFenceCondition('att', '', [AttemptStatus.RUNNING]),
    ).toThrow();
    expect(() => buildFenceCondition('att', 'tok', [])).toThrow();
  });

  test('rowCount 1 -> applied; rowCount 0 -> fenced (zombie)', () => {
    expect(interpretFenceResult(1)).toBe('applied');
    // A-1: the zombie attempt's stale-token write matches zero rows.
    expect(interpretFenceResult(0)).toBe('fenced');
  });

  test('rowCount > 1 is impossible (attempt_id is the PK)', () => {
    expect(() => interpretFenceResult(2)).toThrow();
  });
});

describe('validateCheckpoint', () => {
  const base = {
    attempt_id: 'att_abc',
    kind: 'progress',
    payload: { pct: 50 },
  };

  test('accepts exactly prevSeq + 1', () => {
    expect(() =>
      validateCheckpoint('att_abc', 2, { ...base, seq: 3 }),
    ).not.toThrow();
  });

  test('rejects replayed or skipped seq (A-4)', () => {
    expect(() =>
      validateCheckpoint('att_abc', 2, { ...base, seq: 2 }),
    ).toThrow(NonMonotonicCheckpointError);
    expect(() =>
      validateCheckpoint('att_abc', 2, { ...base, seq: 4 }),
    ).toThrow(NonMonotonicCheckpointError);
  });

  test('rejects cross-attempt checkpoint smuggling', () => {
    expect(() =>
      validateCheckpoint('att_abc', 2, {
        ...base,
        attempt_id: 'att_other',
        seq: 3,
      }),
    ).toThrow();
  });
});

describe('resolveAttemptRef', () => {
  const ids = ['att_9f2c41aa77', 'att_9f2c41bb88', 'att_77aa00cc11'];

  test('exact match wins', () => {
    expect(resolveAttemptRef('att_77aa00cc11', ids)).toBe('att_77aa00cc11');
  });

  test('unique 8-char prefix resolves (O-9)', () => {
    expect(resolveAttemptRef('att_77aa', ids)).toBe('att_77aa00cc11');
  });

  test('ambiguous prefix throws', () => {
    expect(() => resolveAttemptRef('att_9f2c', ids)).toThrow(
      AmbiguousAttemptRefError,
    );
  });

  test('unknown ref throws', () => {
    expect(() => resolveAttemptRef('att_dead', ids)).toThrow(
      UnknownAttemptRefError,
    );
  });
});

describe('reconcileAttempt', () => {
  test('A-3: completed attempt heals, never re-executes', () => {
    const r = reconcileAttempt(
      { attempt_id: 'a', mission_id: 'm', status: AttemptStatus.COMPLETED },
      { effectProven: false, effectAbsent: false },
    );
    expect(r).not.toBeNull();
    expect(r!.directive).toBe(ReconcileDirective.MARK_SUCCEEDED_FROM_EVIDENCE);
    expect(r!.reexecute).toBe(false);
  });

  test('failed attempt: terminal, nothing to reconcile', () => {
    expect(
      reconcileAttempt(
        { attempt_id: 'a', mission_id: 'm', status: AttemptStatus.FAILED },
        { effectProven: false, effectAbsent: false },
      ),
    ).toBeNull();
  });

  test('A-2: disappeared worker with proven effect -> mark succeeded, no re-execute (R-B)', () => {
    const r = reconcileAttempt(
      { attempt_id: 'a', mission_id: 'm', status: AttemptStatus.TIMED_OUT },
      { effectProven: true, effectAbsent: false },
    );
    expect(r!.directive).toBe(ReconcileDirective.MARK_SUCCEEDED_FROM_EVIDENCE);
    expect(r!.reexecute).toBe(false);
  });

  test('A-2: superseded (stale) attempt, effect proven absent -> retry with lineage', () => {
    const r = reconcileAttempt(
      { attempt_id: 'a', mission_id: 'm', status: AttemptStatus.STALE },
      { effectProven: false, effectAbsent: true },
    );
    // stale implies a prior claim existed, so attemptStarted=true:
    // 095's classifier returns RETRY_ATTEMPT_WITH_LINEAGE.
    expect(r!.reexecute).toBe(true);
    expect(r!.directive).toBe(ReconcileDirective.RETRY_ATTEMPT_WITH_LINEAGE);
  });

  test('A-2: created attempt that never started, effect proven absent -> requeue as pending', () => {
    const r = reconcileAttempt(
      { attempt_id: 'a', mission_id: 'm', status: AttemptStatus.CREATED },
      { effectProven: false, effectAbsent: true },
    );
    expect(r!.directive).toBe(ReconcileDirective.REQUEUE_AS_PENDING);
    expect(r!.reexecute).toBe(true);
  });

  test('R-C: indeterminate evidence -> hold, never silent requeue', () => {
    const r = reconcileAttempt(
      { attempt_id: 'a', mission_id: 'm', status: AttemptStatus.RUNNING },
      { effectProven: false, effectAbsent: false },
    );
    expect(r!.directive).toBe(ReconcileDirective.HOLD_NEEDS_RECONCILIATION);
    expect(r!.reexecute).toBe(false);
  });
});
