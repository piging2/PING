/**
 * Decision-budget metrics — Swarm 10 (Human Decision Budget).
 *
 * Normative definitions from DECISION-BUDGET.md section 5. Pure functions over
 * recorded attempts (R3) — no separate telemetry system.
 */

import { EscalationClass, isAutoClass } from './taxonomy';

export interface AttemptRecord {
  siteId: string;
  class: EscalationClass;
  reachedHuman: boolean;
  bounced?: boolean;
  repeatKey: string;
  /** ms from classification to terminal decision. */
  timeToDecisionMs?: number;
  /** ms since classification, for debt computation. */
  ageMs?: number;
  ttlMs?: number;
  decided: boolean;
  at: string;
}

export interface BudgetReport {
  attempts: number;
  escalationsPerMission: number;
  autoResolveRate: number;
  humanEscalationRate: number;
  repeatEscalationRate: number;
  classDistribution: Record<string, number>;
  medianTimeToDecisionAutoMs: number | null;
  medianTimeToDecisionHumanMs: number | null;
  escalationDebt: number;
  bounceRate: number;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

/**
 * Repeat key: sha256(siteId|class|mission_type|target|blocked_by|failure_reason).
 * The caller supplies the hash; this builds the preimage.
 */
export function repeatKeyPreimage(parts: {
  siteId: string; class: EscalationClass; missionType?: string; target?: string; blockedBy?: string; failureReason?: string;
}): string {
  return [parts.siteId, parts.class, parts.missionType ?? '', parts.target ?? '', parts.blockedBy ?? '', parts.failureReason ?? ''].join('|');
}

export function computeBudget(records: AttemptRecord[], missionsTerminal: number): BudgetReport {
  const attempts = records.length;
  const auto = records.filter((r) => isAutoClass(r.class)).length;
  const human = records.filter((r) => r.reachedHuman).length;
  const seen = new Set<string>();
  let repeats = 0;
  for (const r of records) {
    if (seen.has(r.repeatKey)) repeats++;
    seen.add(r.repeatKey);
  }
  const classDistribution: Record<string, number> = {};
  for (const r of records) classDistribution[r.class] = (classDistribution[r.class] ?? 0) + 1;
  const autoTimes = records.filter((r) => isAutoClass(r.class) && r.timeToDecisionMs !== undefined).map((r) => r.timeToDecisionMs as number);
  const humanTimes = records.filter((r) => r.reachedHuman && r.timeToDecisionMs !== undefined).map((r) => r.timeToDecisionMs as number);
  const debt = records.filter((r) => !r.decided && (r.ageMs ?? 0) > (r.ttlMs ?? Number.MAX_SAFE_INTEGER)).length;
  const bounces = records.filter((r) => r.bounced).length;

  return {
    attempts,
    escalationsPerMission: missionsTerminal > 0 ? attempts / missionsTerminal : 0,
    autoResolveRate: attempts > 0 ? auto / attempts : 0,
    humanEscalationRate: attempts > 0 ? human / attempts : 0,
    repeatEscalationRate: attempts > 0 ? repeats / attempts : 0,
    classDistribution,
    medianTimeToDecisionAutoMs: median(autoTimes),
    medianTimeToDecisionHumanMs: median(humanTimes),
    escalationDebt: debt,
    bounceRate: attempts > 0 ? bounces / attempts : 0,
  };
}

/** Budget targets (DECISION-BUDGET.md section 5). */
export const BUDGET_TARGETS = {
  autoResolveRateMin: 0.95,
  repeatEscalationRateMax: 0.05,
  escalationsPerMissionMax: 2.0,
  escalationDebtMax: 0,
  bounceRateMax: 0,
} as const;

export interface TargetCheck { target: string; met: boolean; actual: number; expected: string }

export function checkTargets(report: BudgetReport): TargetCheck[] {
  return [
    { target: 'autoResolveRate', met: report.autoResolveRate >= BUDGET_TARGETS.autoResolveRateMin, actual: report.autoResolveRate, expected: `>= ${BUDGET_TARGETS.autoResolveRateMin}` },
    { target: 'repeatEscalationRate', met: report.repeatEscalationRate <= BUDGET_TARGETS.repeatEscalationRateMax, actual: report.repeatEscalationRate, expected: `<= ${BUDGET_TARGETS.repeatEscalationRateMax}` },
    { target: 'escalationsPerMission', met: report.escalationsPerMission <= BUDGET_TARGETS.escalationsPerMissionMax, actual: report.escalationsPerMission, expected: `<= ${BUDGET_TARGETS.escalationsPerMissionMax}` },
    { target: 'escalationDebt', met: report.escalationDebt <= BUDGET_TARGETS.escalationDebtMax, actual: report.escalationDebt, expected: `<= ${BUDGET_TARGETS.escalationDebtMax}` },
    { target: 'bounceRate', met: report.bounceRate <= BUDGET_TARGETS.bounceRateMax, actual: report.bounceRate, expected: `<= ${BUDGET_TARGETS.bounceRateMax}` },
  ];
}
