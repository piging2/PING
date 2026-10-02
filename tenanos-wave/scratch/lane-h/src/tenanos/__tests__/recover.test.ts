import {
  planRecovery,
  isDeadExecutor,
  AttemptNotDeadError,
  InvalidAttemptError,
  DeadAttempt,
} from '../reconcile/recover';

const NOW = 1_786_000_000_000;
const HOUR = 3_600_000;

function deadAttempt(over: Partial<DeadAttempt> = {}): DeadAttempt {
  return {
    attempt_id: 'att_dead_001',
    run_id: 'run_old_001',
    mission_id: 'mission_42',
    attempt_number: 2,
    lease_until_ms: NOW - 2 * HOUR,
    fencing_token: 'fence_old_token_abc',
    dead_executor: 'worker-7',
    ...over,
  };
}

describe('isDeadExecutor', () => {
  test('lease expired + grace elapsed -> dead', () => {
    expect(isDeadExecutor(NOW - 2 * HOUR, NOW, HOUR)).toBe(true);
  });

  test('lease expired but inside grace -> not dead', () => {
    expect(isDeadExecutor(NOW - 30 * 60_000, NOW, HOUR)).toBe(false);
  });

  test('live lease -> not dead', () => {
    expect(isDeadExecutor(NOW + HOUR, NOW, HOUR)).toBe(false);
  });

  test('null lease -> not dead (cannot prove death; fail closed)', () => {
    expect(isDeadExecutor(null, NOW, HOUR)).toBe(false);
  });
});

describe('planRecovery — never resume in place (core property)', () => {
  test('the plan addresses a NEW run and NEW attempt, never the old ones', () => {
    const dead = deadAttempt();
    const plan = planRecovery(dead, NOW, HOUR);
    expect(plan.new_run_id).not.toBe(dead.run_id);
    expect(plan.new_attempt_id).not.toBe(dead.attempt_id);
    expect(plan.claim_token).not.toBe(dead.fencing_token);
  });

  test('old identities survive only as lineage, never as write targets', () => {
    const dead = deadAttempt();
    const plan = planRecovery(dead, NOW, HOUR);
    // Lineage fields:
    expect(plan.supersedes_attempt_id).toBe(dead.attempt_id);
    expect(plan.supersedes_run_id).toBe(dead.run_id);
    expect(plan.journal.old_attempt_id).toBe(dead.attempt_id);
    expect(plan.journal.old_run_id).toBe(dead.run_id);
    // The plan's writable identities are all fresh:
    const writable = [plan.new_run_id, plan.new_attempt_id, plan.claim_token];
    for (const w of writable) {
      expect(w).not.toContain(dead.attempt_id);
      expect(w).not.toContain(dead.run_id);
      expect(w).not.toBe(dead.fencing_token);
    }
  });

  test('attempt number increments by exactly one (auditable lineage)', () => {
    const plan = planRecovery(deadAttempt({ attempt_number: 0 }), NOW, HOUR);
    expect(plan.attempt_number).toBe(1);
    expect(plan.journal.attempt_number).toBe(1);
  });

  test('journal names the dead executor and the new run', () => {
    const plan = planRecovery(deadAttempt(), NOW, HOUR);
    expect(plan.journal.type).toBe('RECOVERY_REDRIVE');
    expect(plan.journal.dead_executor).toBe('worker-7');
    expect(plan.journal.new_run_id).toBe(plan.new_run_id);
    expect(plan.journal.new_attempt_id).toBe(plan.new_attempt_id);
    expect(plan.journal.at_ms).toBe(NOW);
  });
});

describe('planRecovery — re-enqueue is idempotent', () => {
  test('same dead attempt -> identical plan on every call', () => {
    const dead = deadAttempt();
    const first = planRecovery(dead, NOW, HOUR);
    for (let i = 0; i < 10; i++) {
      expect(planRecovery(deadAttempt(), NOW, HOUR)).toEqual(first);
    }
  });

  test('distinct dead attempts -> distinct new identities (domain separation)', () => {
    const a = planRecovery(deadAttempt({ attempt_id: 'att_A' }), NOW, HOUR);
    const b = planRecovery(deadAttempt({ attempt_id: 'att_B' }), NOW, HOUR);
    expect(a.new_run_id).not.toBe(b.new_run_id);
    expect(a.new_attempt_id).not.toBe(b.new_attempt_id);
    expect(a.claim_token).not.toBe(b.claim_token);
  });
});

describe('planRecovery — fail closed', () => {
  test('live lease refuses recovery', () => {
    expect(() =>
      planRecovery(deadAttempt({ lease_until_ms: NOW + HOUR }), NOW, HOUR),
    ).toThrow(AttemptNotDeadError);
  });

  test('unknown lease refuses recovery (cannot prove death)', () => {
    expect(() => planRecovery(deadAttempt({ lease_until_ms: null }), NOW, HOUR)).toThrow(
      AttemptNotDeadError,
    );
  });

  test('lease inside grace refuses recovery', () => {
    expect(() =>
      planRecovery(deadAttempt({ lease_until_ms: NOW - 10 * 60_000 }), NOW, HOUR),
    ).toThrow(AttemptNotDeadError);
  });

  test('invalid attempt shapes are rejected', () => {
    expect(() => planRecovery(deadAttempt({ attempt_id: '' }), NOW, HOUR)).toThrow(
      InvalidAttemptError,
    );
    expect(() => planRecovery(deadAttempt({ attempt_number: -1 }), NOW, HOUR)).toThrow(
      InvalidAttemptError,
    );
    expect(() => planRecovery(deadAttempt({ dead_executor: '' }), NOW, HOUR)).toThrow(
      InvalidAttemptError,
    );
  });

  test('does not mutate its input', () => {
    const dead = Object.freeze(deadAttempt());
    expect(() => planRecovery(dead, NOW, HOUR)).not.toThrow();
  });
});
