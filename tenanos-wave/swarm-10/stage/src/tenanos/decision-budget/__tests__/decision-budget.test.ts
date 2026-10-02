/**
 * Fail-before tests for the decision-budget module — Swarm 10.
 *
 * These tests encode the taxonomy contract (DECISION-BUDGET.md). They FAIL
 * before the module exists and PASS after. Run with the wave's scoped
 * ts-jest config (src/tenanos/jest.config.cjs).
 */

import { classify, EscalationClass, isAutoClass, EscalationAttempt } from '../taxonomy';
import { HOOK_SITES, hookSite } from '../hook-points';
import { checkEnvelope, defaultTtl, escalationId, EscalationEnvelope } from '../escalation-envelope';
import { computeBudget, checkTargets, AttemptRecord } from '../metrics';

const tinyHash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
};

const baseAttempt = (signals: EscalationAttempt['signals']): EscalationAttempt => ({
  siteId: 'E-07',
  contextIds: { missionId: 'm1', approvalId: 'a1' },
  causeCode: 'tests_failed',
  summary: 'commit blocked: tests failed',
  priorAttempts: [],
  signals,
  repeatKey: tinyHash('E-07|tests_failed'),
});

describe('taxonomy: auto classes take precedence', () => {
  test('source remedy wins over credential need', () => {
    const c = classify(baseAttempt({ causeNamesRemedy: true, needsProvisionedSecret: true }));
    expect(c.class).toBe(EscalationClass.DERIVABLE_FROM_SOURCE);
    expect(c.autoResolve).toBe(true);
  });

  test('history replay used when recorded resolution exists', () => {
    const c = classify(baseAttempt({ historyHasRecordedResolution: true, consecutiveFailures: 1 }));
    expect(c.class).toBe(EscalationClass.DERIVABLE_FROM_HISTORY);
  });

  test('>=3 consecutive failures convert to safe experiment, not human', () => {
    const c = classify(baseAttempt({ historyHasRecordedResolution: true, consecutiveFailures: 3, safeExperimentAvailable: true }));
    expect(c.class).toBe(EscalationClass.SAFE_EXPERIMENT_AVAILABLE);
    expect(isAutoClass(c.class)).toBe(true);
  });

  test('live-state answer stays auto', () => {
    const c = classify(baseAttempt({ answerInLiveState: true }));
    expect(c.class).toBe(EscalationClass.DERIVABLE_FROM_RUNTIME);
  });
});

describe('taxonomy: human classes', () => {
  test('missing secret -> CREDENTIAL_REQUIRED', () => {
    const c = classify(baseAttempt({ needsProvisionedSecret: true }));
    expect(c.class).toBe(EscalationClass.CREDENTIAL_REQUIRED);
    expect(c.autoResolve).toBe(false);
  });

  test('irreversible effect -> DESTRUCTIVE even when human judgment also set', () => {
    const c = classify(baseAttempt({ irreversible: true, requiresHumanJudgment: true }));
    expect(c.class).toBe(EscalationClass.DESTRUCTIVE);
  });

  test('want-not-fact -> PRODUCT_INTENT', () => {
    const c = classify(baseAttempt({ isWantNotFact: true }));
    expect(c.class).toBe(EscalationClass.PRODUCT_INTENT);
  });

  test('policy contradiction -> POLICY_CONFLICT', () => {
    const c = classify(baseAttempt({ policyContradiction: 'manual policy unwired' }));
    expect(c.class).toBe(EscalationClass.POLICY_CONFLICT);
  });

  test('nothing matches -> OTHER with burden of proof', () => {
    const c = classify(baseAttempt({}));
    expect(c.class).toBe(EscalationClass.OTHER);
    expect(c.rationale).toMatch(/burden of proof/);
  });
});

describe('hook-points: inventory coverage', () => {
  const EXPECTED_IDS = ['E-01','E-02','E-03','E-04','E-05','E-06','E-07','E-08','E-09','E-10','E-11','E-12','E-13','E-14','E-15','E-16','E-17','E-18','E-20','E-21','E-22','E-23','E-24','E-25','E-26','E-27','E-28'];
  test('every inventory escalation site is registered', () => {
    for (const id of EXPECTED_IDS) expect(hookSite(id)).toBeDefined();
  });
  test('every site has a capture spec and a current location', () => {
    for (const h of HOOK_SITES) {
      expect(h.capture.length).toBeGreaterThan(0);
      expect(h.currentLocation.length).toBeGreaterThan(0);
    }
  });
  test('E-13 (merge over failed gate) is DESTRUCTIVE', () => {
    expect(hookSite('E-13')!.expectedClass).toBe(EscalationClass.DESTRUCTIVE);
  });
});

describe('escalation-envelope', () => {
  const full: EscalationEnvelope = {
    escalationId: 'esc_abc',
    class: EscalationClass.AUTHORIZATION_REQUIRED,
    classRationale: 'policy requires a named human decision',
    contextIds: { missionId: 'm1' },
    attempted: [{ action: 'polled approvals table', outcome: '1 row pending 30h', at: 't' }],
    question: 'Approve patch P for merge?',
    options: [{ label: 'approve', tradeoff: 'unblocks queue', recommended: true }, { label: 'reject', tradeoff: 'mission stays failed' }],
    defaultIfSilent: 'stays pending; no merge',
    ttlMs: 24 * 3600 * 1000,
    evidenceRefs: ['approval_a1'],
    reversibility: 'revert commit',
    repeatKey: 'rk1',
  };

  test('complete envelope passes', () => {
    expect(checkEnvelope(full)).toEqual({ ok: true });
  });

  test('missing question bounces', () => {
    const { question, ...rest } = full;
    const r = checkEnvelope(rest);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain('question');
  });

  test('two questions bounce', () => {
    const r = checkEnvelope({ ...full, question: 'Approve? Or reject?' });
    expect(r.ok).toBe(false);
  });

  test('destructive TTL capped at 1h', () => {
    const r = checkEnvelope({ ...full, class: EscalationClass.DESTRUCTIVE, ttlMs: 24 * 3600 * 1000 });
    expect(r.ok).toBe(false);
    expect(defaultTtl(EscalationClass.DESTRUCTIVE)).toBe(3600 * 1000);
  });

  test('escalationId is deterministic', () => {
    expect(escalationId('rk', 1, tinyHash)).toBe(escalationId('rk', 1, tinyHash));
    expect(escalationId('rk', 1, tinyHash)).not.toBe(escalationId('rk', 2, tinyHash));
  });
});

describe('metrics', () => {
  const rec = (partial: Partial<AttemptRecord>): AttemptRecord => ({
    siteId: 'E-07', class: EscalationClass.DERIVABLE_FROM_SOURCE, reachedHuman: false,
    repeatKey: tinyHash(Math.random().toString()), decided: true, at: 't', ...partial,
  });

  test('autoResolveRate and humanEscalationRate partition attempts', () => {
    const records = [
      rec({}), rec({}),
      rec({ class: EscalationClass.AUTHORIZATION_REQUIRED, reachedHuman: true }),
      rec({ class: EscalationClass.CREDENTIAL_REQUIRED, reachedHuman: true }),
    ];
    const r = computeBudget(records, 2);
    expect(r.attempts).toBe(4);
    expect(r.autoResolveRate).toBe(0.5);
    expect(r.humanEscalationRate).toBe(0.5);
    expect(r.escalationsPerMission).toBe(2);
  });

  test('repeat detection counts second occurrence', () => {
    const rk = tinyHash('same');
    const records = [rec({ repeatKey: rk }), rec({ repeatKey: rk }), rec({})];
    const r = computeBudget(records, 3);
    expect(r.repeatEscalationRate).toBeCloseTo(1 / 3);
  });

  test('targets flag a blown budget', () => {
    const records = [rec({ class: EscalationClass.OTHER, reachedHuman: true, repeatKey: 'a' })];
    const checks = checkTargets(computeBudget(records, 1));
    const auto = checks.find((c) => c.target === 'autoResolveRate')!;
    expect(auto.met).toBe(false);
  });

  test('escalation debt counts undecided past-TTL', () => {
    const records = [rec({ decided: false, ageMs: 100000, ttlMs: 1000 })];
    expect(computeBudget(records, 1).escalationDebt).toBe(1);
  });
});
