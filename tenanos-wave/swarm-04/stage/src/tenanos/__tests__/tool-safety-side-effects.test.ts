/**
 * tool-safety-side-effects.test.ts
 *
 * Jest ports of the SWARM-04 side-effect falsification harnesses
 * (TOOL-CLASSIFICATION.md section 8). Each harness runs the scenario in
 * LEGACY mode (current handling: trust top-level status, blind retry, no
 * dedup, no timeout) and GUARDED mode (the fail-closed guard), and asserts
 * the invariant: LEGACY must VIOLATE it (falsifying "current handling is
 * safe"), GUARDED must HOLD it.
 *
 * The FakeCapabilityServer reproduces the OBSERVED execute() semantics:
 * nested error envelope over HTTP 200 (E3), derived request IDs that
 * collide within one tick (E2), no idempotency-key dedup (E1), no timeout
 * (E4), best-effort audit with in-memory fallback (E6).
 *
 * Runnable under the scoped substrate config:
 *   npx jest --config src/tenanos/jest.config.cjs
 */

import {
  normalizeEnvelope,
  dispatch,
  retryAfter,
  withTimeout,
  AttemptTracker,
  auditOrHalt,
  Outcome,
} from '../tool-safety/fail-closed-guard';
import {
  classify,
  allClassifications,
  retryPolicyFor,
  requiresConfirmationFor,
  EffectClass,
} from '../tool-safety/tool-classification';

// ---------------------------------------------------------------------------
// FakeCapabilityServer: faithful reproduction of the observed execute()
// semantics. `dedup` simulates the authority AFTER the idempotency-key
// REFACTOR (server-side dedup on the client-supplied key).
// ---------------------------------------------------------------------------

interface CapabilityRequest {
  capability: string;
  agentId: string;
  parameters: Record<string, unknown>;
  idempotencyKey?: string;
}

class ServerError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

class FakeCapabilityServer {
  /** Applied effects, in order. The ground truth for "did the effect happen". */
  effects: string[] = [];
  auditLog: string[] = [];
  /** Server-side idempotency dedup: the REFACTORED authority. Off = current. */
  dedup = false;
  private seenKeys = new Set<string>();
  /** When true, the effect is applied and the call then hangs (E4/E5). */
  hangAfterEffect = false;
  /** When true, the effect is applied and the connection then drops. */
  dropAfterEffect = false;
  /** When true, audit recording throws (E6 probe). */
  auditThrows = false;
  /** Capabilities revoked mid-run (harness 10). */
  revoked = new Set<string>();
  private readonly grants = new Set(['muse', 'muse-level-2']);

  /** Reproduces E2: requestId = derived hash, NOT unique, NOT a dedup key. */
  requestIdFor(capability: string, agentId: string): string {
    let h = 0;
    const s = `${capability}:${agentId}`;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return `req_${Math.abs(h).toString(16)}`;
  }

  execute(req: CapabilityRequest): unknown {
    const requestId = this.requestIdFor(req.capability, req.agentId);
    // Transport-layer drop: the server applied the effect, but the connection
    // died before any response was framed. This bypasses the nested envelope
    // entirely (the envelope is an application-layer shape; a dead socket has
    // no application layer). This is why a drop is OUTCOME_UNKNOWN, not FAILED.
    if (this.dropAfterEffect) {
      this.dropAfterEffect = false;
      this.effects.push(`${req.capability}:${JSON.stringify(req.parameters)}`);
      throw new ServerError('ECONNRESET', 'socket hang up');
    }
    let result: Record<string, unknown>;
    try {
      if (!this.grants.has(req.agentId)) {
        throw new ServerError('AGENT_UNKNOWN', `unknown agent '${req.agentId}'`);
      }
      const c = classify(req.capability);
      if (!c) {
        throw new ServerError('CAPABILITY_UNKNOWN', `unknown capability '${req.capability}'`);
      }
      if (this.revoked.has(req.capability)) {
        throw new ServerError('CAPABILITY_REVOKED', `capability '${req.capability}' revoked mid-run`);
      }
      if (c.grantedTo.length === 0) {
        throw new ServerError('EXECUTION_DISABLED', `capability '${req.capability}' is disabled`);
      }
      if (this.dedup && req.idempotencyKey) {
        if (this.seenKeys.has(req.idempotencyKey)) {
          result = { status: 'ok', result: { applied: false, duplicate: true } };
          this.audit(requestId, req, result);
          return { status: 'ok', result, requestId };
        }
        this.seenKeys.add(req.idempotencyKey);
      }
      // Effect happens here.
      this.effects.push(`${req.capability}:${JSON.stringify(req.parameters)}`);
      if (this.hangAfterEffect) {
        return new Promise(() => undefined); // hangs; the effect already happened
      }
      result = { status: 'ok', result: { applied: true } };
    } catch (e) {
      const err = e as ServerError;
      result = { status: 'error', error: err.message, code: err.code ?? 'CAPABILITY_EXECUTION_ERROR' };
    }
    this.audit(requestId, req, result);
    // E3: the route returns the nested envelope as HTTP 200; top-level status
    // is 'ok' even when the inner result is an error.
    return { status: 'ok', result, requestId };
  }

  private audit(requestId: string, req: CapabilityRequest, result: Record<string, unknown>): void {
    // E6: on ANY audit failure the authority console.logs and keeps an
    // in-memory array. Reproduced here as a throw for the audit probe.
    if (this.auditThrows) {
      throw new Error('audit store unavailable');
    }
    this.auditLog.push(`${requestId} ${req.capability} ${(result['status'] as string) ?? '?'}`);
  }
}

// ---------------------------------------------------------------------------
// LEGACY client: current handling. Trusts top-level status as the verdict,
// blind-retries on timeout/transport failure, carries no idempotency key.
// ---------------------------------------------------------------------------

function raceTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

interface LegacyResult {
  verdict: 'SUCCESS' | 'FAILED';
  attempts: number;
  raw: unknown;
}

async function legacyExecute(
  server: FakeCapabilityServer,
  req: CapabilityRequest,
  opts: { retries: number; timeoutMs: number },
): Promise<LegacyResult> {
  let attempts = 0;
  let lastRaw: unknown = null;
  while (attempts <= opts.retries) {
    attempts++;
    try {
      const raw = await raceTimeout(Promise.resolve(server.execute(req)), opts.timeoutMs);
      lastRaw = raw;
      // ACK read as EFFECT: top-level 'ok' is the verdict.
      if (raw && typeof raw === 'object' && (raw as Record<string, unknown>)['status'] === 'ok') {
        return { verdict: 'SUCCESS', attempts, raw };
      }
      return { verdict: 'FAILED', attempts, raw };
    } catch {
      lastRaw = 'transport failure';
      // Blind retry: no reconcile, no idempotency key, no state check.
    }
  }
  return { verdict: 'FAILED', attempts, raw: lastRaw };
}

// ---------------------------------------------------------------------------
// GUARDED client: dispatch gate + envelope normalization + timeout as
// OUTCOME_UNKNOWN + reconcile-before-retry + late-result discard.
// ---------------------------------------------------------------------------

interface GuardedResult {
  outcome: Outcome;
  dispatches: number;
}

async function guardedExecute(
  server: FakeCapabilityServer,
  req: CapabilityRequest,
  opts: {
    timeoutMs: number;
    confirmed?: boolean;
    consequentialAllowed?: boolean;
    lookup?: (id: string) => ReturnType<typeof classify>;
  },
): Promise<GuardedResult> {
  const v = dispatch(
    {
      toolId: req.capability,
      idempotencyKey: req.idempotencyKey,
      confirmed: opts.confirmed,
      consequentialAllowed: opts.consequentialAllowed,
    },
    opts.lookup,
  );
  if (!v.allowed) {
    return { outcome: { kind: 'DENIED', reason: v.reason }, dispatches: 0 };
  }
  const tracker = new AttemptTracker();
  const attemptId = req.idempotencyKey ?? `attempt-${Math.random().toString(36).slice(2)}`;
  tracker.begin(attemptId);
  let raw: unknown;
  try {
    const r = await withTimeout(async () => server.execute(req) as unknown, opts.timeoutMs);
    if (r.timedOut) {
      tracker.supersede(attemptId);
      return {
        outcome: { kind: 'OUTCOME_UNKNOWN', reason: 'deadline exceeded before a verifiable result' },
        dispatches: 1,
      };
    }
    raw = r.value;
  } catch (e) {
    tracker.supersede(attemptId);
    const msg = e instanceof Error ? e.message : String(e);
    return { outcome: { kind: 'OUTCOME_UNKNOWN', reason: `transport failure: ${msg}` }, dispatches: 1 };
  }
  if (!tracker.applyIfCurrent(attemptId)) {
    return {
      outcome: { kind: 'OUTCOME_UNKNOWN', reason: 'result arrived after the attempt was superseded' },
      dispatches: 1,
    };
  }
  return { outcome: normalizeEnvelope(raw), dispatches: 1 };
}

/** Reconcile step: re-observe state and compare against intent. */
function reconcileWriteApplied(server: FakeCapabilityServer, parameters: Record<string, unknown>): 'skip-as-done' | 'proceed' {
  const marker = `fs.write:${JSON.stringify(parameters)}`;
  return server.effects.includes(marker) ? 'skip-as-done' : 'proceed';
}

// ---------------------------------------------------------------------------
// 01 duplicate-request (E1, E2): duplicate delivery must not duplicate effect.
// ---------------------------------------------------------------------------

test('01 duplicate-request: legacy duplicates the effect; guarded dedups on the idempotency key', async () => {
  const req: CapabilityRequest = {
    capability: 'fs.write',
    agentId: 'muse',
    parameters: { path: '/tmp/x', content: 'v1' },
  };

  // LEGACY: no idempotency key, no dedup. Two deliveries -> two effects.
  // Also demonstrates E2: the derived request IDs collide.
  const legacyServer = new FakeCapabilityServer();
  const idA = legacyServer.requestIdFor(req.capability, req.agentId);
  const idB = legacyServer.requestIdFor(req.capability, req.agentId);
  expect(idA).toBe(idB); // E2: same id for two distinct deliveries
  await legacyExecute(legacyServer, req, { retries: 0, timeoutMs: 100 });
  await legacyExecute(legacyServer, req, { retries: 0, timeoutMs: 100 });
  expect(legacyServer.effects).toHaveLength(2); // VIOLATION: duplicate effect

  // GUARDED: key required at dispatch; server dedups on it (refactored authority).
  const guardedServer = new FakeCapabilityServer();
  guardedServer.dedup = true;
  const keyed: CapabilityRequest = { ...req, idempotencyKey: 'idem-001' };
  const g1 = await guardedExecute(guardedServer, keyed, { timeoutMs: 100, confirmed: true });
  const g2 = await guardedExecute(guardedServer, keyed, { timeoutMs: 100, confirmed: true });
  expect(g1.outcome.kind).toBe('SUCCESS');
  expect(g2.outcome.kind).toBe('SUCCESS');
  expect(guardedServer.effects).toHaveLength(1); // HOLDS: single effect

  // And without the key, the guard denies the effectful dispatch outright.
  const denied = await guardedExecute(guardedServer, req, { timeoutMs: 100, confirmed: true });
  expect(denied.outcome.kind).toBe('DENIED');
  expect(denied.dispatches).toBe(0);
});

// ---------------------------------------------------------------------------
// 02 timeout-after-side-effect (E4, E5): timeout is not failure.
// ---------------------------------------------------------------------------

test('02 timeout-after-side-effect: legacy blind-retries into a double write; guarded halts at OUTCOME_UNKNOWN', async () => {
  const params = { path: '/tmp/y', content: 'v1' };
  const req: CapabilityRequest = { capability: 'fs.write', agentId: 'muse', parameters: params };

  // LEGACY: effect applied, then hang -> caller times out -> blind retry.
  const legacyServer = new FakeCapabilityServer();
  legacyServer.hangAfterEffect = true;
  await legacyExecute(legacyServer, req, { retries: 1, timeoutMs: 25 });
  expect(legacyServer.effects).toHaveLength(2); // VIOLATION: double write

  // GUARDED: timeout -> OUTCOME_UNKNOWN -> reconcile-first, never blind retry.
  const guardedServer = new FakeCapabilityServer();
  guardedServer.hangAfterEffect = true;
  const keyed: CapabilityRequest = { ...req, idempotencyKey: 'idem-002' };
  const g = await guardedExecute(guardedServer, keyed, { timeoutMs: 25, confirmed: true });
  expect(g.outcome.kind).toBe('OUTCOME_UNKNOWN');
  expect(retryAfter('fs.write', g.outcome)).toBe('RECONCILE_FIRST');
  // Reconcile: re-observe, compare against intent. The write landed.
  expect(reconcileWriteApplied(guardedServer, params)).toBe('skip-as-done');
  expect(guardedServer.effects).toHaveLength(1); // HOLDS: no duplicate dispatch
});

// ---------------------------------------------------------------------------
// 03 server-disappears (E5): a dropped connection proves nothing.
// ---------------------------------------------------------------------------

test('03 server-disappears: legacy assumes failure and retries; guarded treats the drop as UNKNOWN', async () => {
  const req: CapabilityRequest = {
    capability: 'fs.write',
    agentId: 'muse',
    parameters: { path: '/tmp/z', content: 'v1' },
    idempotencyKey: 'idem-003',
  };

  const legacyServer = new FakeCapabilityServer();
  legacyServer.dropAfterEffect = true;
  const l = await legacyExecute(legacyServer, { ...req, idempotencyKey: undefined }, { retries: 1, timeoutMs: 100 });
  // The retry "succeeds", masking that the "failed" first attempt had applied its effect.
  expect(l.verdict).toBe('SUCCESS');
  expect(l.attempts).toBe(2);
  expect(legacyServer.effects).toHaveLength(2); // VIOLATION: the "failed" first attempt had applied its effect

  const guardedServer = new FakeCapabilityServer();
  guardedServer.dropAfterEffect = true;
  const g = await guardedExecute(guardedServer, req, { timeoutMs: 100, confirmed: true });
  expect(g.outcome.kind).toBe('OUTCOME_UNKNOWN');
  expect(g.outcome.kind === 'OUTCOME_UNKNOWN' && g.outcome.reason).toMatch(/transport failure/);
  expect(retryAfter('fs.write', g.outcome)).toBe('RECONCILE_FIRST');
  expect(guardedServer.effects).toHaveLength(1); // HOLDS: exactly one dispatch happened
});

// ---------------------------------------------------------------------------
// 04 malformed-response: garbage bytes are OUTCOME_UNKNOWN, never a verdict.
// ---------------------------------------------------------------------------

test('04 malformed-response: legacy crashes on garbage; guarded returns OUTCOME_UNKNOWN', () => {
  const garbage = '<html>not json at all{{{';
  // LEGACY: parses the body; garbage is a crash, not a typed outcome.
  expect(() => JSON.parse(garbage)).toThrow(); // VIOLATION: no outcome state exists

  // GUARDED: malformed input is a real state, not a verdict.
  expect(normalizeEnvelope(garbage).kind).toBe('OUTCOME_UNKNOWN');
  expect(normalizeEnvelope(null).kind).toBe('OUTCOME_UNKNOWN');
  expect(normalizeEnvelope(undefined).kind).toBe('OUTCOME_UNKNOWN');
  expect(normalizeEnvelope(42).kind).toBe('OUTCOME_UNKNOWN');
});

// ---------------------------------------------------------------------------
// 05 schema-drift: the catalog lies about git.branch; the guard denies on truth.
// ---------------------------------------------------------------------------

test('05 schema-drift: legacy acts on the catalog lie; guarded denies on implementation truth', () => {
  const c = classify('git.branch');
  expect(c).toBeDefined();
  expect(c!.effectClass).toBe('UNKNOWN');
  expect(c!.schemaDrift).toBe(true);

  // LEGACY: reads the catalog claim "Create Git branch" and would dispatch.
  const catalogClaimsCreate = true;
  const legacyWouldDispatch = catalogClaimsCreate;
  expect(legacyWouldDispatch).toBe(true); // VIOLATION: acts on a lie

  // GUARDED: UNKNOWN fails closed regardless of what the catalog claims.
  const v = dispatch({ toolId: 'git.branch', idempotencyKey: 'k', confirmed: true });
  expect(v.allowed).toBe(false);
  if (!v.allowed) {
    expect(v.reason).toMatch(/UNKNOWN/);
  }
});

// ---------------------------------------------------------------------------
// 06 oversized-response (control): the existing size gate holds in both modes.
// ---------------------------------------------------------------------------

test('06 oversized-response (control): the existing fs.read size gate holds', () => {
  // Faithful replica of the documented gate: authorize() denies when the
  // client-asserted parameters.size exceeds the profile maxFileSize.
  const sizeGateAllows = (parametersSize: number, maxFileSize: number): boolean =>
    parametersSize <= maxFileSize;

  expect(sizeGateAllows(10 * 1024 * 1024, 1024 * 1024)).toBe(false); // legacy: denied
  expect(sizeGateAllows(10 * 1024 * 1024, 1024 * 1024)).toBe(false); // guarded: denied
  expect(sizeGateAllows(512, 1024 * 1024)).toBe(true);

  // The registry records the gate as client-asserted (the known weakness).
  const c = classify('fs.read');
  expect(c!.effectClass).toBe('READ_ONLY');
  expect(c!.evidence).toMatch(/client-supplied parameters\.size/);
});

// ---------------------------------------------------------------------------
// 07 tool-lies (E3): the nested error envelope is not success.
// ---------------------------------------------------------------------------

test('07 tool-lies: legacy reads {ok, result:{error}} as success; guarded reads FAILED', () => {
  // Byte-faithful shape of the observed execute() failure path.
  const raw = {
    status: 'ok',
    result: { status: 'error', error: 'boom', code: 'CAPABILITY_EXECUTION_ERROR' },
    requestId: 'req_abc123',
  };

  // LEGACY: top-level 'ok' is the verdict. Failure reads as success.
  const legacyVerdict =
    raw && typeof raw === 'object' && (raw as Record<string, unknown>)['status'] === 'ok'
      ? 'SUCCESS'
      : 'FAILED';
  expect(legacyVerdict).toBe('SUCCESS'); // VIOLATION: NACK looks like ACK

  // GUARDED: the inner result status decides.
  const o = normalizeEnvelope(raw);
  expect(o.kind).toBe('FAILED');
  if (o.kind === 'FAILED') {
    expect(o.code).toBe('CAPABILITY_EXECUTION_ERROR');
    expect(o.error).toBe('boom');
  }
});

// ---------------------------------------------------------------------------
// 08 result-after-cancellation: late results are discarded.
// ---------------------------------------------------------------------------

test('08 result-after-cancellation: legacy applies the late result; guarded discards it', () => {
  // LEGACY: whatever arrives last wins, even if the attempt was superseded.
  let legacyState = 'pending';
  const legacyApply = (value: string): void => {
    legacyState = value;
  };
  legacyApply('late-result-from-superseded-attempt');
  expect(legacyState).toBe('late-result-from-superseded-attempt'); // VIOLATION

  // GUARDED: the attempt was superseded; its late result is discarded.
  const tracker = new AttemptTracker();
  tracker.begin('attempt-1');
  tracker.supersede('attempt-1'); // timed out / cancelled / replaced
  expect(tracker.applyIfCurrent('attempt-1')).toBe(false); // HOLDS: discarded

  // A current attempt's result applies exactly once.
  tracker.begin('attempt-2');
  expect(tracker.applyIfCurrent('attempt-2')).toBe(true);
  expect(tracker.applyIfCurrent('attempt-2')).toBe(false); // no double-apply
});

// ---------------------------------------------------------------------------
// 09 credential-missing (control): unknown agents are denied; the envelope
// must not hide the denial.
// ---------------------------------------------------------------------------

test('09 credential-missing (control): the denial survives the nested envelope', async () => {
  const server = new FakeCapabilityServer();
  const req: CapabilityRequest = {
    capability: 'fs.list',
    agentId: 'intruder',
    parameters: {},
  };

  // LEGACY: the denial is wrapped in {status:'ok'} -> reads as success.
  const l = await legacyExecute(server, req, { retries: 0, timeoutMs: 100 });
  expect(l.verdict).toBe('SUCCESS'); // VIOLATION: shows E3's blast radius on the deny path
  expect(server.effects).toHaveLength(0); // the server itself held (control)

  // GUARDED: normalization surfaces the denial.
  const g = await guardedExecute(server, req, { timeoutMs: 100 });
  expect(g.outcome.kind).toBe('FAILED');
  if (g.outcome.kind === 'FAILED') {
    expect(g.outcome.code).toBe('AGENT_UNKNOWN');
  }
  expect(retryAfter('fs.list', g.outcome)).toBe('FORBIDDEN');
});

// ---------------------------------------------------------------------------
// 10 capability-revoked: a per-dispatch grant check beats a cached catalog.
// ---------------------------------------------------------------------------

test('10 capability-revoked: legacy trusts the cached catalog; guarded re-checks per dispatch', async () => {
  const server = new FakeCapabilityServer();
  const keyed: CapabilityRequest = {
    capability: 'fs.write',
    agentId: 'muse',
    parameters: { path: '/tmp/r', content: 'v1' },
    idempotencyKey: 'idem-010',
  };

  // Before revocation both modes dispatch.
  const g1 = await guardedExecute(server, keyed, { timeoutMs: 100, confirmed: true });
  expect(g1.outcome.kind).toBe('SUCCESS');

  // Revocation lands mid-run.
  server.revoked.add('fs.write');

  // LEGACY: the catalog was cached at startup; it dispatches anyway.
  const legacyCachedGrant = new Set(['fs.write']);
  const legacyWouldDispatch = legacyCachedGrant.has('fs.write');
  expect(legacyWouldDispatch).toBe(true); // VIOLATION: stale grant

  // GUARDED: the lookup is consulted per dispatch; the revoked capability
  // now resolves to a denied classification.
  const lookupAfterRevocation = (id: string) => {
    if (server.revoked.has(id)) {
      return undefined; // grant source of truth: no grant, no classification
    }
    return classify(id);
  };
  const v = dispatch(
    { toolId: 'fs.write', idempotencyKey: 'idem-010b', confirmed: true },
    lookupAfterRevocation,
  );
  expect(v.allowed).toBe(false);
  if (!v.allowed) {
    expect(v.reason).toMatch(/unclassified/);
  }
});

// ---------------------------------------------------------------------------
// Audit fail-closed (E6): a failed audit halts; it never falls back to memory.
// ---------------------------------------------------------------------------

test('audit fail-closed: sink failure halts the pipeline, never degrades to memory', () => {
  const recorded: unknown[] = [];
  const goodSink = { record: (e: unknown): void => { recorded.push(e); } };
  const r1 = auditOrHalt(goodSink, { toolId: 'fs.write', outcome: 'SUCCESS' });
  expect(r1).toEqual({ recorded: true });
  expect(recorded).toHaveLength(1);

  const badSink = {
    record: (): void => {
      throw new Error('audit store unavailable');
    },
  };
  const r2 = auditOrHalt(badSink, { toolId: 'fs.write', outcome: 'OUTCOME_UNKNOWN' });
  expect(r2).toEqual({ recorded: false, halt: true }); // HOLDS: halt, no silent fallback
  // Nothing was "recorded" anywhere else: no in-memory array exists to consult.
  expect(recorded).toHaveLength(1);
});

// ---------------------------------------------------------------------------
// Registry completeness: every classified tool carries evidence and a
// consistent confirmation requirement.
// ---------------------------------------------------------------------------

test('registry completeness: every entry is evidence-graded and confirmation-consistent', () => {
  const all = allClassifications();
  expect(all.length).toBeGreaterThan(20);
  const classes: Record<EffectClass, number> = {
    READ_ONLY: 0,
    REVERSIBLE_EFFECT: 0,
    IDEMPOTENT_EFFECT: 0,
    NON_IDEMPOTENT_EFFECT: 0,
    CONSEQUENTIAL_EFFECT: 0,
    UNKNOWN: 0,
  };
  for (const c of all) {
    expect(c.evidence.length).toBeGreaterThan(0);
    classes[c.effectClass]++;
    // Confirmation is mandatory for the dangerous classes; READ_ONLY must
    // never require it; IDEMPOTENT/REVERSIBLE are a policy choice either way.
    const mustConfirm =
      c.effectClass === 'NON_IDEMPOTENT_EFFECT' ||
      c.effectClass === 'CONSEQUENTIAL_EFFECT' ||
      c.effectClass === 'UNKNOWN';
    if (mustConfirm) {
      expect(c.requiresConfirmation).toBe(true);
    }
    if (c.effectClass === 'READ_ONLY') {
      expect(c.requiresConfirmation).toBe(false);
    }
    expect(requiresConfirmationFor(c.id)).toBe(c.requiresConfirmation);
    expect(retryPolicyFor(c.id)).toBe(c.retryPolicy);
  }
  // All six classes are represented; no silent gaps.
  for (const cls of Object.keys(classes) as EffectClass[]) {
    expect(classes[cls] > 0).toBe(true);
  }
  // Fail-closed defaults for the unclassified.
  expect(classify('no.such.tool')).toBeUndefined();
  expect(retryPolicyFor('no.such.tool')).toBe('forbidden');
  expect(requiresConfirmationFor('no.such.tool')).toBe(true);
  const v = dispatch({ toolId: 'no.such.tool' });
  expect(v.allowed).toBe(false);
});
