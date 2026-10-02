/**
 * Port of kill-battery KB-01 (swarm-11) into the wave tree.
 * Run: jest --config src/tenanos/jest.config.cjs src/tenanos/run/__tests__/run-state-authority.test.ts
 */
import {
  CanonicalRunState,
  classifyUnknownExecution,
  isLegalTransition,
  projectExecution,
  projectMission,
  ReconcileDirective,
} from '../run-state-authority';

const NOW = Date.now();
const past = new Date(NOW - 61_000).toISOString();
const future = new Date(NOW + 30_000).toISOString();

describe('projectMission', () => {
  const cases: Array<[string, CanonicalRunState]> = [
    ['created', CanonicalRunState.PENDING],
    ['retry_pending', CanonicalRunState.PENDING],
    ['completed', CanonicalRunState.SUCCEEDED],
    ['failed', CanonicalRunState.FAILED],
  ];
  test.each(cases)('status %s -> %s', (status, expected) => {
    expect(projectMission({ mission_id: 'm', status, lease_until: null }, NOW)).toBe(expected);
  });

  test('assigned/running with live lease -> RUNNING', () => {
    expect(projectMission({ mission_id: 'm', status: 'assigned', lease_until: future }, NOW))
      .toBe(CanonicalRunState.RUNNING);
    expect(projectMission({ mission_id: 'm', status: 'running', lease_until: future }, NOW))
      .toBe(CanonicalRunState.RUNNING);
  });

  test('assigned/running with expired lease -> UNKNOWN_EXECUTION (R-A, R-C)', () => {
    expect(projectMission({ mission_id: 'm', status: 'running', lease_until: past }, NOW))
      .toBe(CanonicalRunState.UNKNOWN_EXECUTION);
    expect(projectMission({ mission_id: 'm', status: 'assigned', lease_until: past }, NOW))
      .toBe(CanonicalRunState.UNKNOWN_EXECUTION);
  });

  test('no lease info fails toward RUNNING', () => {
    expect(projectMission({ mission_id: 'm', status: 'running', lease_until: null }, NOW))
      .toBe(CanonicalRunState.RUNNING);
  });

  test('unmapped status throws (fail-closed)', () => {
    expect(() => projectMission({ mission_id: 'm', status: 'weird', lease_until: null }, NOW)).toThrow();
  });

  test('deterministic', () => {
    const row = { mission_id: 'm', status: 'running', lease_until: past };
    expect(projectMission(row, NOW)).toBe(projectMission(row, NOW));
  });
});

describe('projectExecution', () => {
  test('null row (crashed attempt, M3) -> UNKNOWN_EXECUTION', () => {
    expect(projectExecution(null)).toBe(CanonicalRunState.UNKNOWN_EXECUTION);
  });
  test('completed -> SUCCEEDED', () => {
    expect(projectExecution({ execution_id: 'e', mission_id: 'm', execution_status: 'completed' }))
      .toBe(CanonicalRunState.SUCCEEDED);
  });
});

describe('classifyUnknownExecution', () => {
  test('effect proven -> mark succeeded, never re-execute (R-B)', () => {
    const c = classifyUnknownExecution({ effectProven: true, effectAbsent: false, attemptStarted: true });
    expect(c.directive).toBe(ReconcileDirective.MARK_SUCCEEDED_FROM_EVIDENCE);
    expect(c.reexecute).toBe(false);
  });
  test('proven absent, never started -> requeue', () => {
    const c = classifyUnknownExecution({ effectProven: false, effectAbsent: true, attemptStarted: false });
    expect(c.directive).toBe(ReconcileDirective.REQUEUE_AS_PENDING);
    expect(c.reexecute).toBe(true);
  });
  test('proven absent, started -> retry with lineage', () => {
    const c = classifyUnknownExecution({ effectProven: false, effectAbsent: true, attemptStarted: true });
    expect(c.directive).toBe(ReconcileDirective.RETRY_ATTEMPT_WITH_LINEAGE);
    expect(c.reexecute).toBe(true);
  });
  test('indeterminate -> hold, never silent requeue (R-C)', () => {
    for (const e of [
      { effectProven: false, effectAbsent: false, attemptStarted: true },
      { effectProven: false, effectAbsent: false, attemptStarted: false },
    ]) {
      const c = classifyUnknownExecution(e);
      expect(c.directive).toBe(ReconcileDirective.HOLD_NEEDS_RECONCILIATION);
      expect(c.reexecute).toBe(false);
    }
  });
  test('total over the evidence cube; effectProven always forbids re-execution', () => {
    for (let m = 0; m < 8; m++) {
      const e = { effectProven: !!(m & 1), effectAbsent: !!(m & 2), attemptStarted: !!(m & 4) };
      if (e.effectProven && e.effectAbsent) continue; // contradictory -> hold path
      const c = classifyUnknownExecution(e);
      expect(c.directive).toBeDefined();
      expect(typeof c.reexecute).toBe('boolean');
      if (e.effectProven) expect(c.reexecute).toBe(false);
    }
  });
});

describe('isLegalTransition', () => {
  test('terminal states have no outgoing edges', () => {
    for (const s of [CanonicalRunState.SUCCEEDED, CanonicalRunState.FAILED, CanonicalRunState.CANCELLED]) {
      for (const t of Object.values(CanonicalRunState)) {
        expect(isLegalTransition(s, t)).toBe(false);
      }
    }
  });
  test('UNKNOWN_EXECUTION only -> NEEDS_RECONCILIATION (no silent PENDING)', () => {
    expect(isLegalTransition(CanonicalRunState.UNKNOWN_EXECUTION, CanonicalRunState.NEEDS_RECONCILIATION)).toBe(true);
    expect(isLegalTransition(CanonicalRunState.UNKNOWN_EXECUTION, CanonicalRunState.PENDING)).toBe(false);
    expect(isLegalTransition(CanonicalRunState.UNKNOWN_EXECUTION, CanonicalRunState.FAILED)).toBe(false);
  });
});
