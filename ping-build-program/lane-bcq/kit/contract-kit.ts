/**
 * LANE BCQ — Connector Contract Test Kit.
 *
 * Built ONCE; every future adapter inherits it. Runner-agnostic:
 * `runContractSuite(adapterFactory, harnessFactory)` returns a report.
 * Lane CONN calls it from jest; any other runner works.
 *
 * Coverage:
 *  A. manifest validity, identity, check/discover, capability discipline, provenance
 *  B. idempotency proofs (6): same-object-twice, same-webhook-twice, restart,
 *     cursor rollback, OUTCOME_UNKNOWN reconciliation, partial batch failure
 *  C. retry / rate-limit / circuit-breaker semantics
 *  D. failure-taxonomy conformance (lane K list; no connector invents its own)
 *  E. red team: injection, oversized, redirect cap, SSRF, secret leakage,
 *     cross-tenant isolation
 *  F. webhook ingestion: signature, dedupe, unknown-shape preservation
 *  G. provenance envelope completeness
 */
import { ConnectorAdapter } from './adapter';
import {
  check,
  CheckResult,
  Harness,
  idempotencyKeyFor,
  KnowledgeLedger,
  ScriptedResponse,
  SuiteReport,
  validateManifest,
} from './harness';
import { ReferenceAdapter } from './reference-adapter';
import {
  Confidence,
  ConnectorManifest,
  FailureCode,
  FetchState,
  Observation,
  ReadRequest,
  StreamDescriptor,
  WebhookDelivery,
} from './types';

/* ------------------------------------------------------------------ */
/* Test fixtures                                                       */
/* ------------------------------------------------------------------ */

export function testManifest(overrides?: Partial<ConnectorManifest>): ConnectorManifest {
  return {
    connectorId: 'test-provider',
    version: '1.0.0',
    provider: 'test-provider',
    capabilities: [
      { verb: 'read', object: 'reviews', scope: 'owner-business-only' },
      { verb: 'read', object: 'businesses', scope: 'owner-business-only' },
      { verb: 'webhook-receive', object: 'reviews', scope: 'owner-business-only' },
      { verb: 'search', object: 'streams', scope: 'platform' },
    ],
    auth: {
      credentialType: 'oauth2',
      grantedBy: 'business-owner',
      scopes: ['read:reviews'],
    },
    rateBudget: {
      callsPerWindow: 100,
      windowMs: 60_000,
      maxAttempts: 3,
      baseDelayMs: 100,
      maxDelayMs: 5_000,
    },
    streams: [
      { streamId: 'test.business', streamClass: 'business-identity', syncModes: ['poll'] },
      {
        streamId: 'test.reviews', streamClass: 'reviews',
        syncModes: ['incremental', 'poll'], incrementalCursor: 'updated_since',
      },
    ],
    stalenessToleranceMs: { reviews: 86_400_000 },
    ...overrides,
  };
}

const REVIEWS_URL = 'https://provider.example/api/test/reviews';

export function rec(id: string | null, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const base: Record<string, unknown> = {
    name: `Shop ${id ?? 'x'}`,
    description: 'A fine establishment.',
    rating: 5,
    review_text: 'Great service.',
    updated_at: '2026-09-20T10:00:00Z',
  };
  if (id !== null) base.id = id;
  return { ...base, ...overrides };
}

export function pageBody(records: Array<Record<string, unknown>>, nextCursor: string | null): string {
  return JSON.stringify({ records, next_cursor: nextCursor });
}

/** Deterministic test request key sequence (no Math.random in the suite). */
let reqSeq = 0;
function readReq(overrides: Partial<ReadRequest> = {}): ReadRequest {
  reqSeq++;
  return {
    configRef: 'conn-test',
    streamIds: ['test.reviews'],
    state: {},
    priorityTier: 'routine-poll',
    idempotencyKey: `rk-${String(reqSeq).padStart(6, '0')}`,
    tenantId: 'tenant-a',
    principal: 'business-owner',
    ...overrides,
  };
}

function ledgerOf(h: Harness): KnowledgeLedger {
  const ledger = new KnowledgeLedger();
  for (const o of h.observations) ledger.ingest(o);
  return ledger;
}

/* ------------------------------------------------------------------ */
/* The suite                                                           */
/* ------------------------------------------------------------------ */

export async function runContractSuite(
  adapterFactory: () => ConnectorAdapter,
  harnessFactory: () => Harness,
): Promise<SuiteReport> {
  const checks: CheckResult[] = [];
  const push = (c: CheckResult) => checks.push(c);

  /* ---------------- A. manifest, identity, lifecycle verbs ---------------- */

  {
    const m = testManifest();
    const problems = validateManifest(m);
    push(check('A1', 'manifest validates at admission', problems.length === 0, problems.join('; ') || 'clean'));

    const bad = testManifest({ rateBudget: { ...testManifest().rateBudget, maxAttempts: 9 } });
    const badProblems = validateManifest(bad);
    push(check(
      'A1b', 'manifest with maxAttempts>3 is rejected',
      badProblems.some((p) => p.includes('maxAttempts')),
      badProblems.join('; ') || 'NOT rejected (bad)',
    ));
  }

  {
    // check(): healthy
    const h = harnessFactory();
    const a = adapterFactory();
    h.provider.script('GET', 'https://provider.example/api/health', [{ status: 200, body: '{}' }]);
    const ok = await a.check('conn-test', h);
    push(check('A2a', 'check() SUCCEEDED on healthy provider',
      ok.status === 'SUCCEEDED' && ok.verifiedObjects.length > 0, ok.message));

    // check(): 401 → user_error
    const h2 = harnessFactory();
    const a2 = adapterFactory();
    h2.provider.script('GET', 'https://provider.example/api/health', [{ status: 401, body: '{}' }]);
    const denied = await a2.check('conn-test', h2);
    push(check('A2b', 'check() classifies 401 as user_error (bad credential, not connector bug)',
      denied.status === 'FAILED' && denied.errorClass === 'user_error', denied.message));

    // check(): 500 → connector_error
    const h3 = harnessFactory();
    const a3 = adapterFactory();
    h3.provider.script('GET', 'https://provider.example/api/health', [{ status: 500, body: '{}' }]);
    const broken = await a3.check('conn-test', h3);
    push(check('A2c', 'check() classifies 500 as connector_error',
      broken.status === 'FAILED' && broken.errorClass === 'connector_error', broken.message));
  }

  {
    // discover(): deterministic ordering
    const h = harnessFactory();
    const a = adapterFactory();
    const streams: StreamDescriptor[] = [
      { streamId: 'test.reviews', streamClass: 'reviews', syncModes: ['incremental'], incrementalCursor: 'updated_since' },
      { streamId: 'test.business', streamClass: 'business-identity', syncModes: ['poll'] },
    ];
    h.provider.script('GET', 'https://provider.example/api/streams', [
      { status: 200, body: JSON.stringify({ streams }) },
    ]);
    const discovered = await a.discover('conn-test', h);
    const sorted = discovered.every((s, i, arr) => i === 0 || arr[i - 1].streamId <= s.streamId);
    const inc = discovered.find((s) => s.streamId === 'test.reviews');
    push(check('A3', 'discover() lists streams in deterministic order; incremental declares its cursor',
      sorted && discovered.length === 2 && inc?.incrementalCursor === 'updated_since',
      discovered.map((s) => s.streamId).join(',')));
  }

  {
    // A4a: read against an undeclared stream is a protocol violation → FAILED PERMANENT
    const h = harnessFactory();
    const a = adapterFactory();
    const out = await a.read(readReq({ streamIds: ['test.evil'] }), h);
    push(check('A4a', 'read() against undeclared stream fails closed (PERMANENT)',
      out.terminalState === FetchState.FAILED && out.failureCode === FailureCode.PERMANENT,
      `${out.terminalState} ${out.failureCode} ${out.reason ?? ''}`));

    // A4b: no write capability → no write surface (or a denied one)
    const a4 = adapterFactory();
    let writeDenied = (a4 as { write?: unknown }).write === undefined;
    if (!writeDenied) {
      try {
        await (a4 as unknown as { write: () => Promise<unknown> }).write();
      } catch {
        writeDenied = true;
      }
    }
    push(check('A4b', 'write.* not declared → no usable write surface',
      writeDenied, writeDenied ? 'absent/denied' : 'WRITE SURFACE EXPOSED WITHOUT GRANT'));
  }

  /* ---------------- B. idempotency proofs ---------------- */

  {
    // B1: same external object delivered twice (overlapping pages) → one knowledge unit
    const h = harnessFactory();
    const a = adapterFactory();
    h.provider.script('GET', REVIEWS_URL, [
      { status: 200, body: pageBody([rec('r1'), rec('r2')], 'c1') },
      { status: 200, body: pageBody([rec('r2'), rec('r3')], null) },
    ]);
    const out = await a.read(readReq(), h);
    const ledger = ledgerOf(h);
    push(check('B1', 'same-external-object-twice → no duplicate canonical knowledge',
      out.terminalState === FetchState.SUCCEEDED && ledger.size === 3 && ledger.duplicatesAbsorbed === 1,
      `emitted=${h.observations.length} ledger=${ledger.size} dups=${ledger.duplicatesAbsorbed}`));
  }

  {
    // B2: same webhook delivered twice → second absorbed
    const h = harnessFactory();
    const a = adapterFactory();
    if (!a.receiveWebhook) {
      push(check('B2', 'same-webhook-twice → second absorbed', false, 'adapter has no receiveWebhook'));
    } else {
      const body = JSON.stringify({
        event_type: 'review.received', tenant_id: 'tenant-a',
        record: rec('w1', { updated_at: '2026-09-21T08:00:00Z' }),
      });
      const mk = (deliveryId: string): WebhookDelivery => ({
        deliveryId, rawBody: body, signature: h.signWebhook(body), receivedAt: h.nowIso(),
      });
      const first = await a.receiveWebhook(mk('d-1'), h);
      const second = await a.receiveWebhook(mk('d-1'), h);
      const ledger = ledgerOf(h);
      push(check('B2', 'same-webhook-twice → second absorbed',
        first.accepted && first.observationsEmitted === 1 &&
        second.duplicate === true && second.observationsEmitted === 0 && ledger.size === 1,
        `first=${first.observationsEmitted} second.dup=${second.duplicate} ledger=${ledger.size}`));
    }
  }

  {
    // B3: connector restart → resumes from persisted watermark, no re-emission of knowledge
    const h = harnessFactory();
    const a1 = adapterFactory();
    h.provider.script('GET', REVIEWS_URL, [
      { status: 200, body: pageBody([rec('r1'), rec('r2')], 'c1') },
      { status: 200, body: pageBody([rec('r3')], null) },
    ]);
    await a1.read(readReq(), h);
    const ledger1 = ledgerOf(h);
    const obsBefore = h.observations.length;

    const a2 = adapterFactory(); // "restart": new instance, same harness (cursor store survives)
    h.provider.script('GET', REVIEWS_URL, [
      { status: 200, body: pageBody([rec('r3')], null) }, // re-reads last page from stored cursor
    ]);
    const out2 = await a2.read(readReq(), h);
    const ledger2 = ledgerOf(h);
    push(check('B3', 'connector restart → resumes from watermark; knowledge unchanged',
      out2.terminalState === FetchState.SUCCEEDED && ledger1.size === 3 && ledger2.size === 3 &&
      h.observations.length === obsBefore + 1 && ledger2.duplicatesAbsorbed >= 1,
      `ledger ${ledger1.size}→${ledger2.size}, re-emitted=${h.observations.length - obsBefore}`));
  }

  {
    // B4: cursor rollback / invalidation → typed FULL_RESYNC, re-emission deduped
    const h = harnessFactory();
    const a = adapterFactory();
    h.provider.script('GET', REVIEWS_URL, [
      { status: 200, body: pageBody([rec('r1')], null) },
    ]);
    await a.read(readReq(), h);
    h.provider.script('GET', REVIEWS_URL, [
      { status: 410, body: '{"error":"cursor_invalid"}' },
      { status: 200, body: pageBody([rec('r1')], null) }, // resync from start
    ]);
    const out = await a.read(readReq(), h);
    const ledger = ledgerOf(h);
    const resyncLogged = h.logs.some((l) => l.message.includes('FULL_RESYNC'));
    push(check('B4', 'cursor invalidation → FULL_RESYNC, no duplicate knowledge',
      out.terminalState === FetchState.SUCCEEDED && ledger.size === 1 &&
      ledger.duplicatesAbsorbed === 1 && resyncLogged,
      `ledger=${ledger.size} dups=${ledger.duplicatesAbsorbed} resyncLogged=${resyncLogged}`));
  }

  {
    // B5: OUTCOME_UNKNOWN (timeout) → bounded reconciliation, same idempotency key, no dup
    const h = harnessFactory();
    const a = adapterFactory();
    h.provider.script('GET', REVIEWS_URL, [
      { status: 0, networkFault: 'timeout' },
      { status: 200, body: pageBody([rec('r1'), rec('r2')], null) },
    ]);
    const out = await a.read(readReq(), h);
    const ledger = ledgerOf(h);
    const attempts = h.fetchAttempts;
    push(check('B5', 'timeout → OUTCOME_UNKNOWN + one reconciliation pass, no duplicate knowledge',
      out.terminalState === FetchState.OUTCOME_UNKNOWN &&
      attempts.length === 1 && attempts[0].state === FetchState.OUTCOME_UNKNOWN &&
      attempts[0].failureCode === FailureCode.TIMEOUT &&
      ledger.size === 2 && h.provider.calls.length === 2,
      `state=${out.terminalState} code=${attempts[0]?.failureCode} ledger=${ledger.size} calls=${h.provider.calls.length}`));
  }

  {
    // B6: partial batch failure → checkpoint holds, retry completes without duplicates
    const h = harnessFactory();
    const a1 = adapterFactory();
    const badBatch = [rec('p1'), rec('p2'), rec(null), rec('p4'), rec(null),
      rec('p6'), rec('p7'), rec(null), rec('p9'), rec('p10')];
    h.provider.script('GET', REVIEWS_URL, [
      { status: 200, body: pageBody(badBatch, 'c1') },
    ]);
    const out1 = await a1.read(readReq(), h);
    const cursorHeld = h.cursorStore.load('tenant-a', 'test.reviews') === null;
    const ledger1 = ledgerOf(h);

    const a2 = adapterFactory();
    const goodBatch = [rec('p1'), rec('p2'), rec('p3'), rec('p4'), rec('p5'),
      rec('p6'), rec('p7'), rec('p8'), rec('p9'), rec('p10')];
    h.provider.script('GET', REVIEWS_URL, [
      { status: 200, body: pageBody(goodBatch, null) },
    ]);
    const out2 = await a2.read(readReq(), h);
    const ledger2 = ledgerOf(h);
    push(check('B6', 'partial batch → checkpoint holds at contiguous success; retry dedupes',
      out1.terminalState === FetchState.SUCCEEDED && out1.partial === true &&
      ledger1.size === 7 && cursorHeld &&
      out2.terminalState === FetchState.SUCCEEDED && ledger2.size === 10 &&
      ledger2.duplicatesAbsorbed === 7,
      `run1 ledger=${ledger1.size} partial=${out1.partial} cursorHeld=${cursorHeld}; ` +
      `run2 ledger=${ledger2.size} dups=${ledger2.duplicatesAbsorbed}`));
  }

  /* ---------------- C. retry / rate-limit / breaker ---------------- */

  {
    // C1: 429 with Retry-After honored
    const h = harnessFactory();
    const a = adapterFactory();
    h.provider.script('GET', REVIEWS_URL, [
      { status: 429, headers: { 'retry-after': '2' }, body: '{}' },
      { status: 200, body: pageBody([rec('r1')], null) },
    ]);
    const out = await a.read(readReq(), h);
    const calls = h.provider.calls;
    const waited = calls.length === 2 ? calls[1].atVirtualMs - calls[0].atVirtualMs : -1;
    push(check('C1', '429 → honors Retry-After before retrying; then SUCCEEDS',
      out.terminalState === FetchState.SUCCEEDED && waited >= 2000,
      `waited=${waited}ms state=${out.terminalState}`));
  }

  {
    // C2: bounded retries — 3x500 → FAILED TRANSIENT, exactly 3 calls, no 4th
    const h = harnessFactory();
    const a = adapterFactory();
    h.provider.script('GET', REVIEWS_URL, [
      { status: 500, body: '{}' }, { status: 500, body: '{}' }, { status: 500, body: '{}' },
      { status: 200, body: pageBody([rec('r1')], null) }, // must never be reached
    ]);
    const out = await a.read(readReq(), h);
    const att = h.fetchAttempts[0];
    push(check('C2', 'retries bounded at declared maxAttempts; no retry storm',
      out.terminalState === FetchState.FAILED && out.failureCode === FailureCode.TRANSIENT &&
      h.provider.calls.length === 3 && att?.attemptsUsed === 3,
      `calls=${h.provider.calls.length} attemptsUsed=${att?.attemptsUsed} code=${out.failureCode}`));
  }

  {
    // C3: client-side budget → NOT_STARTED instead of exceeding declared budget
    const h = harnessFactory();
    const m = testManifest({ rateBudget: { ...testManifest().rateBudget, callsPerWindow: 2 } });
    const a = new ReferenceAdapter(m);
    h.provider.script('GET', REVIEWS_URL, [
      { status: 200, body: pageBody([rec('r1')], 'c1') },
      { status: 200, body: pageBody([rec('r2')], 'c2') },
      { status: 200, body: pageBody([rec('r3')], null) },
    ]);
    const out = await a.read(readReq(), h);
    push(check('C3', 'client budget exhausted → NOT_STARTED, provider never sees call 3',
      out.terminalState === FetchState.NOT_STARTED && h.provider.calls.length === 2,
      `state=${out.terminalState} calls=${h.provider.calls.length}`));
  }

  {
    // C4: circuit breaker — sustained failures open it; next read fails fast
    const h = harnessFactory();
    const a = adapterFactory();
    const fives: ScriptedResponse[] = Array.from({ length: 10 }, () => ({ status: 500, body: '{}' }));
    h.provider.script('GET', REVIEWS_URL, fives);
    const out1 = await a.read(readReq(), h);
    const callsAfterFirst = h.provider.calls.length;
    const out2 = await a.read(readReq({ idempotencyKey: 'rk-second' }), h);
    const callsAfterSecond = h.provider.calls.length;
    push(check('C4', 'breaker opens after sustained 5xx; next read fails fast without provider calls',
      out1.failureCode === FailureCode.TRANSIENT && callsAfterFirst === 3 &&
      out2.terminalState === FetchState.FAILED &&
      out2.failureCode === FailureCode.SOURCE_UNAVAILABLE &&
      callsAfterSecond === callsAfterFirst,
      `read1 calls=${callsAfterFirst} code=${out1.failureCode}; read2 code=${out2.failureCode} newCalls=${callsAfterSecond - callsAfterFirst}`));
  }

  /* ---------------- D. failure taxonomy conformance ---------------- */

  {
    const cases: Array<{ status: number; want: FailureCode; name: string }> = [
      { status: 401, want: FailureCode.AUTH_EXPIRED, name: '401→AUTH_EXPIRED' },
      { status: 403, want: FailureCode.PERMISSION_DENIED, name: '403→PERMISSION_DENIED' },
      { status: 404, want: FailureCode.INVALID_PAYLOAD, name: '404→INVALID_PAYLOAD (non-retryable)' },
      { status: 500, want: FailureCode.TRANSIENT, name: '500→TRANSIENT' },
    ];
    for (const c of cases) {
      const h = harnessFactory();
      const a = adapterFactory();
      const responses: ScriptedResponse[] =
        c.status === 500
          ? [{ status: 500, body: '{}' }, { status: 500, body: '{}' }, { status: 500, body: '{}' }]
          : [{ status: c.status, body: '{}' }];
      h.provider.script('GET', REVIEWS_URL, responses);
      const out = await a.read(readReq(), h);
      const knownCode = Object.values(FailureCode).includes(out.failureCode as FailureCode);
      push(check(`D1-${c.status}`, `taxonomy: ${c.name}`,
        out.terminalState === FetchState.FAILED && out.failureCode === c.want && knownCode,
        `got ${out.failureCode}; invented-code=${!knownCode}`));
    }
  }

  /* ---------------- E. red team ---------------- */

  {
    // E1: HTML/JS injection in provider text fields → plain text out
    const h = harnessFactory();
    const a = adapterFactory();
    h.provider.script('GET', REVIEWS_URL, [{
      status: 200,
      body: pageBody([rec('x1', {
        description: `<script>alert('xss')</script><img src=x onerror=steal()>Hello`,
        review_text: `Nice <b>place</b>! javascript:alert(1)`,
        name: 'Pay\u0430l', // Cyrillic а — mixed-script spoof
      })], null),
    }]);
    await a.read(readReq(), h);
    const o = h.observations[0];
    const desc = String(o?.payload.description ?? '');
    const rt = String(o?.payload.review_text ?? '');
    const clean = !/[<>]/.test(desc) && !/[<>]/.test(rt) &&
      !/script/i.test(desc) && !/onerror/i.test(desc) && !/javascript:/i.test(rt);
    const flagged = h.logs.some((l) => l.message.includes('mixed-script'));
    push(check('E1', 'HTML/JS injection stripped at ingestion; mixed-script name flagged',
      h.observations.length === 1 && clean && flagged,
      `desc=${JSON.stringify(desc.slice(0, 60))} flagged=${flagged}`));
  }

  {
    // E2: oversized payload → rejected with recorded observation, nothing ingested
    const h = harnessFactory();
    const a = adapterFactory();
    h.provider.script('GET', REVIEWS_URL, [
      { status: 200, body: 'x'.repeat(6 * 1024 * 1024) },
    ]);
    const out = await a.read(readReq(), h);
    push(check('E2', 'oversized response rejected; nothing ingested',
      out.terminalState === FetchState.FAILED && out.failureCode === FailureCode.INVALID_PAYLOAD &&
      out.reason === 'oversized' && h.observations.length === 0,
      `state=${out.terminalState} reason=${out.reason} obs=${h.observations.length}`));
  }

  {
    // E3: redirect chain beyond cap → rejected
    const h = harnessFactory();
    const a = adapterFactory();
    h.provider.script('GET', REVIEWS_URL, [{
      status: 200, body: pageBody([rec('r1')], null),
      redirects: ['h1', 'h2', 'h3', 'h4', 'h5'],
    }]);
    const out = await a.read(readReq(), h);
    push(check('E3', 'redirect chain over cap rejected',
      out.terminalState === FetchState.FAILED && out.reason === 'redirect-cap' &&
      h.observations.length === 0,
      `reason=${out.reason}`));
  }

  {
    // E4: SSRF — provider-redirected final URL to link-local metadata → refused
    const h = harnessFactory();
    const a = adapterFactory();
    h.provider.script('GET', REVIEWS_URL, [{
      status: 200, body: pageBody([rec('r1')], null),
      finalUrl: 'http://169.254.169.254/latest/meta-data/iam',
    }]);
    const out = await a.read(readReq(), h);
    push(check('E4', 'SSRF final URL refused before parse',
      out.terminalState === FetchState.FAILED && out.failureCode === FailureCode.PERMANENT &&
      out.reason === 'ssrf-blocked' && h.observations.length === 0,
      `reason=${out.reason}`));
  }

  {
    // E5: secret canary planted in an undeclared provider field must never leak
    const h = harnessFactory();
    const a = adapterFactory();
    h.provider.script('GET', REVIEWS_URL, [{
      status: 200,
      body: pageBody([rec('r1', { internal_debug: `conn debug token=${h.secretCanary} end` })], null),
    }]);
    await a.read(readReq(), h);
    const leaks = h.findCanaryLeaks();
    push(check('E5', 'secret canary in provider payload never reaches events/logs/evidence',
      h.observations.length === 1 && leaks.length === 0,
      leaks.length === 0 ? 'no leaks' : `LEAKED in ${leaks.join(',')}`));
  }

  {
    // E6: cross-tenant isolation
    const h = harnessFactory();
    const a = adapterFactory();
    h.provider.script('GET', REVIEWS_URL, [
      { status: 200, body: pageBody([rec('ra1')], null) },
      { status: 200, body: pageBody([rec('rb1')], null) },
    ]);
    await a.read(readReq({ tenantId: 'tenant-a', configRef: 'conn-A' }), h);
    const obsA = h.observations.length;
    await a.read(readReq({ tenantId: 'tenant-b', configRef: 'conn-B', idempotencyKey: 'rk-b' }), h);
    const calls = h.provider.calls;
    const bCalls = calls.slice(obsA === 1 ? 1 : 0);
    const tenantsOk = h.observations.every((o) =>
      (o.externalObjectId === 'ra1' && o.tenantId === 'tenant-a') ||
      (o.externalObjectId === 'rb1' && o.tenantId === 'tenant-b'));
    const connsOk = bCalls.every((c) => c.tenantId === 'tenant-b' && c.connectionId === 'conn-B') &&
      calls[0].tenantId === 'tenant-a' && calls[0].connectionId === 'conn-A';
    push(check('E6', "cross-tenant isolation: B's run never sees A's data or connection",
      h.observations.length === 2 && tenantsOk && connsOk,
      `tenantsOk=${tenantsOk} connsOk=${connsOk}`));
  }

  /* ---------------- F. webhook ingestion ---------------- */

  {
    const h = harnessFactory();
    const a = adapterFactory();
    if (!a.receiveWebhook) {
      push(check('F1', 'webhook signature verified before parse', false, 'no receiveWebhook'));
      push(check('F2', 'unknown webhook shapes preserved opaque', false, 'no receiveWebhook'));
    } else {
      const body = JSON.stringify({
        event_type: 'review.received', tenant_id: 'tenant-a', record: rec('w9'),
      });
      const good: WebhookDelivery = {
        deliveryId: 'd-good', rawBody: body, signature: h.signWebhook(body), receivedAt: h.nowIso(),
      };
      const bad: WebhookDelivery = {
        deliveryId: 'd-bad', rawBody: body, signature: 'deadbeef', receivedAt: h.nowIso(),
      };
      const rGood = await a.receiveWebhook(good, h);
      const obsAfterGood = h.observations.length;
      const rBad = await a.receiveWebhook(bad, h);
      push(check('F1', 'webhook: valid signature accepted, forged signature rejected (fail closed)',
        rGood.accepted && obsAfterGood === 1 && !rBad.accepted &&
        rBad.reason === 'signature-mismatch' && h.observations.length === 1,
        `good=${rGood.accepted} bad=${rBad.accepted}:${rBad.reason}`));

      const unknownBody = JSON.stringify({
        event_type: 'provider.something_new', tenant_id: 'tenant-a', id: 'u1',
        updated_at: '2026-09-22T00:00:00Z', extra: { nested: [1, 2, 3] },
      });
      const unknown: WebhookDelivery = {
        deliveryId: 'd-unknown', rawBody: unknownBody,
        signature: h.signWebhook(unknownBody), receivedAt: h.nowIso(),
      };
      const rUnknown = await a.receiveWebhook(unknown, h);
      const uObs = h.observations[h.observations.length - 1];
      push(check('F2', 'webhook: unknown shapes preserved opaque, never dropped or crashed on',
        rUnknown.accepted && uObs?.unmodeled === true &&
        uObs?.confidence === Confidence.UNKNOWN &&
        String(uObs?.provenance.rawEvidenceRef).startsWith('raw:sha256:'),
        `unmodeled=${uObs?.unmodeled} confidence=${uObs?.confidence}`));
    }
  }

  /* ---------------- G. provenance completeness ---------------- */

  {
    const h = harnessFactory();
    const a = adapterFactory();
    h.provider.script('GET', REVIEWS_URL, [
      { status: 200, body: pageBody([rec('g1', { updated_at: '2026-09-19T12:34:56Z' })], null) },
    ]);
    await a.read(readReq(), h);
    const o: Observation | undefined = h.observations[0];
    const p = o?.provenance;
    const refOk = !!p?.rawEvidenceRef && /^raw:sha256:[0-9a-f]{64}$/.test(p.rawEvidenceRef);
    const extTsOk = o?.externalTimestamp === '2026-09-19T12:34:56Z';
    const obsTsOk = !!o?.observedTimestamp && !Number.isNaN(Date.parse(o.observedTimestamp));
    const keyOk = !!o?.idempotencyKey &&
      o.idempotencyKey === idempotencyKeyFor('test-provider', 'test.reviews', 'g1', '2026-09-19T12:34:56Z');
    const confOk = o?.confidence === Confidence.INFERRED; // reviews: factual content at most INFERRED
    const tenantOk = o?.tenantId === 'tenant-a' && !!o?.principal;
    push(check('G1', 'provenance envelope complete: external id/ts, observed ts, raw ref, key, grade',
      !!o && refOk && extTsOk && obsTsOk && keyOk && confOk && tenantOk,
      `ref=${refOk} extTs=${extTsOk} key=${keyOk} conf=${o?.confidence}`));
  }

  /* ---------------- secret-handle discipline ---------------- */

  {
    const h = harnessFactory();
    const handle = h.getSecretHandle('oauth:google');
    const serialized = JSON.stringify(handle);
    const isHandleOnly = Object.keys(handle).every((k) => ['handleId', 'kind'].includes(k));
    const leaksToken = /eyJ[A-Za-z0-9_-]{10,}|sk-[A-Za-z0-9]{8,}|ghp_[A-Za-z0-9]{8,}|xox[bap]-/.test(serialized);
    push(check('A6', 'secret broker hands out capability handles, never raw tokens',
      isHandleOnly && handle.handleId.startsWith('handle:') && !leaksToken,
      `handle=${serialized}`));
  }

  const passed = checks.filter((c) => c.passed).length;
  return {
    connectorId: 'test-provider',
    version: '1.0.0',
    checks,
    passed,
    failed: checks.length - passed,
  };
}
