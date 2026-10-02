/**
 * Escalation envelope — Swarm 10 (Human Decision Budget).
 *
 * Minimum information a human-eligible escalation MUST carry (DECISION-BUDGET.md
 * section 4). Anything missing bounces back to the agent; a bounce counts
 * against the agent's budget, not the human's.
 */

import { EscalationClass, AUTO_CLASSES } from './taxonomy';

export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
export const DESTRUCTIVE_TTL_MS = 60 * 60 * 1000;

/** One of the human-eligible classes. */
export type HumanClass = Exclude<EscalationClass, EscalationClass.DERIVABLE_FROM_SOURCE | EscalationClass.DERIVABLE_FROM_HISTORY | EscalationClass.DERIVABLE_FROM_RUNTIME | EscalationClass.SAFE_EXPERIMENT_AVAILABLE>;

export function isHumanClass(c: EscalationClass): boolean {
  return !AUTO_CLASSES.has(c);
}

export interface EscalationEnvelope {
  escalationId: string;
  class: HumanClass;
  /** The membership test quoted (taxonomy rationale). */
  classRationale: string;
  contextIds: Record<string, string>;
  /** What the agent tried, in order, with outcomes. */
  attempted: Array<{ action: string; outcome: string; at: string }>;
  /** EXACTLY ONE question. */
  question: string;
  options: Array<{ label: string; tradeoff: string; recommended?: boolean }>;
  defaultIfSilent: string;
  ttlMs: number;
  /** Pointers (event/DLQ/approval ids), not dumps. */
  evidenceRefs: string[];
  reversibility: string;
  repeatKey: string;
  /** What changed since the prior decision on this repeatKey, if a repeat. */
  repeatNote?: string;
}

export type EnvelopeCheck = { ok: true } | { ok: false; missing: string[] };

const REQUIRED: Array<keyof EscalationEnvelope> = [
  'escalationId', 'class', 'classRationale', 'contextIds', 'attempted',
  'question', 'options', 'defaultIfSilent', 'ttlMs', 'evidenceRefs',
  'reversibility', 'repeatKey',
];

/** Validate the minimum payload. Bounce (ok:false) on anything missing. */
export function checkEnvelope(e: Partial<EscalationEnvelope>): EnvelopeCheck {
  const missing: string[] = [];
  for (const k of REQUIRED) {
    const v = e[k];
    if (v === undefined || v === null || v === '') missing.push(k);
  }
  if (e.question !== undefined && e.question.includes('?') && e.question.split('?').length > 2) {
    missing.push('question (more than one question)');
  }
  if (e.options !== undefined && e.options.length === 0) missing.push('options (empty)');
  if (e.class === EscalationClass.DESTRUCTIVE && (e.ttlMs ?? 0) > DESTRUCTIVE_TTL_MS) {
    missing.push('ttlMs (destructive default must be <= 1h)');
  }
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

/** Deterministic escalation id: esc_<hash(repeatKey + attemptSeq)>. */
export function escalationId(repeatKey: string, attemptSeq: number, hash: (s: string) => string): string {
  return `esc_${hash(`${repeatKey}:${attemptSeq}`).slice(0, 16)}`;
}

/** Silence must be safe: default TTL per class. */
export function defaultTtl(c: EscalationClass): number {
  return c === EscalationClass.DESTRUCTIVE ? DESTRUCTIVE_TTL_MS : DEFAULT_TTL_MS;
}
