/**
 * fail-closed-guard.ts
 *
 * Enforcement layer for the tool side-effect classification
 * (tool-classification.ts). This is the NEW guard layer the classification
 * verdicts call for: it wraps dispatch, response interpretation, timeouts,
 * retries, and audit with fail-closed semantics.
 *
 * Invariants (binding):
 *   1. ACK != EFFECT: a returned ok / HTTP 200 proves nothing about effect.
 *   2. RESULT != VERIFIED OUTCOME: outcomes are verified by independent
 *      re-observation, never by trusting the result object.
 *   3. RETRY != IDEMPOTENCY: retry is allowed only for classes proven safe,
 *      with the same idempotency key, after reconcile on any ambiguity.
 *   4. UNKNOWN fails closed: unclassified tools, unaudited routes, and
 *      ambiguous outcomes deny autonomous action. Ambiguity surfaces as
 *      OUTCOME_UNKNOWN, a real state, never a gap to paper over.
 *   5. RECONCILE BEFORE RETRY: after any ambiguous outcome, re-observe state
 *      and compare against intent before deciding proceed / skip-as-done /
 *      escalate. Never re-dispatch on a timeout.
 *
 * This guard does NOT fork CapabilityAuthority and creates no second
 * orchestrator, event authority, or capability system. It is a client-side
 * enforcement envelope; server-side fixes (idempotency keys, timeouts,
 * audit-as-ledger) remain REFACTOR items on the authority itself.
 */

import {
  ToolClassification,
  classify,
  CLASSIFICATION_VERSION,
} from './tool-classification';

export const GUARD_VERSION = '2026-09-24.1-rebased';
export const GUARD_CLASSIFICATION_VERSION = CLASSIFICATION_VERSION;

/** Typed outcome of one guarded tool call. OUTCOME_UNKNOWN is a real state. */
export type Outcome =
  | { kind: 'SUCCESS'; value: unknown }
  | { kind: 'FAILED'; error: string; code?: string }
  | { kind: 'OUTCOME_UNKNOWN'; reason: string }
  | { kind: 'DENIED'; reason: string };

export type DispatchVerdict =
  | { allowed: true; toolId: string }
  | { allowed: false; toolId: string; reason: string };

export interface DispatchRequest {
  toolId: string;
  /** Client-supplied idempotency key. Required for NON_IDEMPOTENT and CONSEQUENTIAL classes. */
  idempotencyKey?: string;
  /** Explicit confirmation for effectful classes (the authorize->ledger->dispatch->confirm pipeline's confirm step). */
  confirmed?: boolean;
  /** Policy gate for CONSEQUENTIAL class; defaults to false (fail closed). */
  consequentialAllowed?: boolean;
}

export type Lookup = (toolId: string) => ToolClassification | undefined;

/**
 * Decide whether an autonomous worker may dispatch this tool.
 * UNKNOWN class or unclassified id -> denied, no exceptions.
 */
export function dispatch(req: DispatchRequest, lookup: Lookup = classify): DispatchVerdict {
  const c = lookup(req.toolId);
  if (!c) {
    return {
      allowed: false,
      toolId: req.toolId,
      reason: `unclassified tool '${req.toolId}': UNKNOWN fails closed for autonomous mutation`,
    };
  }
  switch (c.effectClass) {
    case 'UNKNOWN':
      return {
        allowed: false,
        toolId: req.toolId,
        reason: `tool '${req.toolId}' has UNKNOWN side-effect semantics${c.schemaDrift ? ' (catalog schema drift recorded)' : ''}: fail closed`,
      };
    case 'CONSEQUENTIAL_EFFECT':
      if (!req.idempotencyKey) {
        return { allowed: false, toolId: req.toolId, reason: 'CONSEQUENTIAL tool requires an idempotency key' };
      }
      if (!req.confirmed) {
        return { allowed: false, toolId: req.toolId, reason: 'CONSEQUENTIAL tool requires explicit confirmation' };
      }
      if (!req.consequentialAllowed) {
        return { allowed: false, toolId: req.toolId, reason: 'CONSEQUENTIAL tool not enabled by policy (fail closed)' };
      }
      return { allowed: true, toolId: req.toolId };
    case 'NON_IDEMPOTENT_EFFECT':
      if (!req.idempotencyKey) {
        return { allowed: false, toolId: req.toolId, reason: 'NON_IDEMPOTENT tool requires an idempotency key' };
      }
      if (!req.confirmed) {
        return { allowed: false, toolId: req.toolId, reason: 'NON_IDEMPOTENT tool requires explicit confirmation' };
      }
      return { allowed: true, toolId: req.toolId };
    case 'READ_ONLY':
    case 'IDEMPOTENT_EFFECT':
    case 'REVERSIBLE_EFFECT':
      return { allowed: true, toolId: req.toolId };
  }
}

/**
 * Normalize a raw capability response into a typed Outcome.
 * Fixes E3: the SWARM-04-observed execute() (snapshot 43a6cd2e4,
 * UNVERIFIED-ON-BRANCH) returned
 * {status:'ok', result:{status:'error', error, code:'CAPABILITY_EXECUTION_ERROR'}}
 * over HTTP 200. The branch's own plane (gateway/tool_authority.js:134) returns
 * a flat {success:false, error} envelope and throws on unknown/not-permitted
 * tools, so the nested shape is not branch-verified — but the guard must stay
 * shape-agnostic regardless. Any client reading the top-level status reads
 * failure as success. The INNER result status decides; the outer envelope is
 * transport.
 */
export function normalizeEnvelope(raw: unknown): Outcome {
  if (raw === null || raw === undefined || typeof raw !== 'object') {
    return { kind: 'OUTCOME_UNKNOWN', reason: 'malformed response: not an object; no verdict can be derived' };
  }
  const outer = raw as Record<string, unknown>;
  const inner =
    outer['result'] !== null && typeof outer['result'] === 'object'
      ? (outer['result'] as Record<string, unknown>)
      : outer;

  const failureSignal =
    outer['status'] === 'error' ||
    inner['status'] === 'error' ||
    outer['success'] === false ||
    inner['success'] === false ||
    (typeof inner['error'] === 'string' && inner['error'].length > 0) ||
    (typeof outer['error'] === 'string' && outer['error'].length > 0);

  if (failureSignal) {
    const err =
      (typeof inner['error'] === 'string' && inner['error']) ||
      (typeof outer['error'] === 'string' && outer['error']) ||
      'capability reported failure without an error message';
    const code =
      (typeof inner['code'] === 'string' && inner['code']) ||
      (typeof outer['code'] === 'string' && outer['code']) ||
      undefined;
    return { kind: 'FAILED', error: err, code };
  }
  return { kind: 'SUCCESS', value: inner };
}

/** Codes that mark a failure as permanent: retrying is pointless, not just unsafe.
 * NOTE: these codes come from the SWARM-04 envelope model (snapshot 43a6cd2e4,
 * UNVERIFIED-ON-BRANCH); the branch's plane throws Error('Tool not found: ...')
 * / Error('Tool not permitted: ...') instead (gateway/tool_authority.js:134-146).
 * The guard treats any coded failure in this set as permanent regardless of origin. */
const PERMANENT_FAILURE_CODES: ReadonlySet<string> = new Set([
  'AGENT_UNKNOWN',
  'CAPABILITY_UNKNOWN',
  'CAPABILITY_REVOKED',
  'EXECUTION_DISABLED',
  'NOT_IMPLEMENTED',
]);

export type RetryDecision = 'RETRY_NOW' | 'RECONCILE_FIRST' | 'FORBIDDEN';

export interface RetryOptions {
  /** True when the retry would carry the exact idempotency key of the original attempt. */
  sameKeyPresented?: boolean;
}

/**
 * Decide what may follow a completed attempt. The cardinal rule: after any
 * ambiguous outcome (OUTCOME_UNKNOWN: timeout, transport failure, malformed
 * response, late/superseded result) the ONLY allowed move is RECONCILE_FIRST.
 * No blind retry after an ambiguous external effect, ever.
 */
export function retryAfter(
  toolId: string,
  lastOutcome: Outcome,
  lookup: Lookup = classify,
  opts: RetryOptions = {},
): RetryDecision {
  switch (lastOutcome.kind) {
    case 'DENIED':
      return 'FORBIDDEN';
    case 'OUTCOME_UNKNOWN':
      return 'RECONCILE_FIRST';
    case 'SUCCESS':
      return 'FORBIDDEN'; // nothing to retry; re-dispatch would be a duplicate effect
    case 'FAILED': {
      if (lastOutcome.code && PERMANENT_FAILURE_CODES.has(lastOutcome.code)) {
        return 'FORBIDDEN';
      }
      const policy = lookup(toolId)?.retryPolicy ?? 'forbidden';
      switch (policy) {
        case 'free':
          return 'RETRY_NOW';
        case 'same-key':
          // The key alone is not proof of idempotency; without the original
          // key in hand the worker cannot even ask the server to dedup, so
          // reconcile first to learn whether the first attempt landed.
          return opts.sameKeyPresented ? 'RETRY_NOW' : 'RECONCILE_FIRST';
        case 'reconcile-first':
          return 'RECONCILE_FIRST';
        case 'forbidden':
          return 'FORBIDDEN';
      }
    }
  }
}

export type TimedResult<T> = { timedOut: false; value: T } | { timedOut: true };

/**
 * Run work with a deadline. On timeout the attempt's outcome is
 * OUTCOME_UNKNOWN: the effect may or may not have happened. The underlying
 * work is left to settle, but its late result must be discarded by the
 * AttemptTracker (see below), never applied to a superseded attempt.
 * Fixes E4 (no timeout in the execute path — holds on this branch too: neither gateway/tool_authority.js:134 nor gateway/tool_gateway.js:102 sets a deadline).
 */
export function withTimeout<T>(work: () => Promise<T>, ms: number): Promise<TimedResult<T>> {
  return new Promise<TimedResult<T>>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ timedOut: true });
      }
    }, ms);
    work().then(
      (value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve({ timedOut: false, value });
        }
      },
      (error) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(error);
        }
      },
    );
  });
}

/**
 * Tracks attempt currency so late results are discarded, never applied to a
 * superseded attempt (harness 08: result-after-cancellation).
 */
export class AttemptTracker {
  private current: string | null = null;
  private readonly superseded: Set<string> = new Set();

  begin(attemptId: string): void {
    this.current = attemptId;
  }

  /** Mark an attempt superseded (timed out, cancelled, replaced). */
  supersede(attemptId: string): void {
    this.superseded.add(attemptId);
    if (this.current === attemptId) {
      this.current = null;
    }
  }

  /**
   * True only if this result belongs to the still-current attempt.
   * Consumes currency: each attempt's result may be applied at most once.
   */
  applyIfCurrent(attemptId: string): boolean {
    if (this.superseded.has(attemptId) || this.current !== attemptId) {
      return false;
    }
    this.current = null;
    return true;
  }
}

export interface AuditEntry {
  toolId: string;
  idempotencyKey?: string;
  outcome: Outcome['kind'];
  at?: string;
}

export interface AuditSink {
  record(entry: AuditEntry): void;
}

export type AuditResult = { recorded: true } | { recorded: false; halt: true };

/**
 * Fail-closed audit. If the sink throws or otherwise fails to record, the
 * caller MUST halt, never silently fall back to an in-memory buffer that dies
 * with the process (fixes E6: the branch's execute paths have NO audit sink at
 * all — verified zero audit references in gateway/tool_authority.js and
 * gateway/tool_gateway.js — so the SWARM-04 best-effort-with-memory-fallback
 * observation is UNVERIFIED-ON-BRANCH; either way, no ledger means halt).
 */
export function auditOrHalt(
  sink: AuditSink,
  entry: AuditEntry,
  now: () => string = () => new Date().toISOString(),
): AuditResult {
  try {
    sink.record({ ...entry, at: entry.at ?? now() });
    return { recorded: true };
  } catch {
    return { recorded: false, halt: true };
  }
}
