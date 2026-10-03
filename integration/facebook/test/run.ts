/**
 * FB-B — Facebook connector: fixture-driven test runner.
 *
 * No live calls. Every scenario runs the real FacebookConnector against the
 * lane-bcq scripted Harness (no network), with recorded Graph API response
 * fixtures in test/fixtures/. Run with: bun test/run.ts  (from this lane dir)
 *
 * Coverage:
 *  1. manifest validity (kit validator)
 *  2. check/discover (+ auth failure classification)
 *  3. page read + envelope stability (same record -> same source identity)
 *  4. feed pagination + cursor semantics (opaque, verbatim echo, advance
 *     only past fully processed pages)
 *  5. idempotency (same observation twice != duplicate in the ledger)
 *  6. OUTCOME_UNKNOWN mid-pagination -> reconcile by re-read, no dupes
 *  7. failure taxonomy: 429, 190, 5xx x3, malformed, undeclared stream
 *  8. comments + one-level replies; compiler candidate kinds
 *  9. sanitization: injection stripped, secret canary never leaks
 *  10. cross-tenant isolation
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Harness, KnowledgeLedger } from '../../../ping-build-program/lane-bcq/kit/harness';
import { validateManifest } from '../../../ping-build-program/lane-bcq/kit/harness';
import { FailureCode, FetchState, Observation, ReadRequest } from '../../../ping-build-program/lane-bcq/kit/types';
import { FacebookConnector } from '../src/adapter';
import { compileComment, compilePage, compilePost } from '../src/compiler';
import { facebookManifest } from '../src/manifest';

const HERE = dirname(fileURLToPath(import.meta.url));
const fx = (name: string): string => readFileSync(join(HERE, 'fixtures', name), 'utf8');

const PAGE_ID = '61594275542163';
const PRINCIPAL = 'fixture-principal'; // tests name a principal explicitly; never hardcoded in src
const BASE = 'https://graph.facebook.com/v26.0';

interface Result {
  name: string;
  passed: boolean;
  detail: string;
}
const results: Result[] = [];
function t(name: string, passed: boolean, detail = ''): void {
  results.push({ name, passed, detail });
  if (!passed) console.log(`  FAIL ${name} ${detail}`);
}

function req(streamIds: string[], state: Record<string, string> = {}, tenantId = 'tenant-a', key = 'k'): ReadRequest {
  return {
    configRef: JSON.stringify({ page_id: PAGE_ID, principal: PRINCIPAL }),
    streamIds,
    state,
    priorityTier: 'routine-poll',
    idempotencyKey: `test-${key}`,
    tenantId,
    principal: PRINCIPAL,
  };
}

function newAdapter(): FacebookConnector {
  return new FacebookConnector();
}

/* ---------------- 1. manifest ---------------- */
{
  const problems = validateManifest(facebookManifest());
  t('manifest-valid', problems.length === 0, problems.join('; '));
}

/* ---------------- 2. check / discover ---------------- */
{
  const h = new Harness(facebookManifest());
  h.provider.script('GET', `${BASE}/${PAGE_ID}?`, [{ status: 200, body: fx('page.json') }]);
  const a = newAdapter();
  const ok = await a.check(JSON.stringify({ page_id: PAGE_ID, principal: PRINCIPAL }), h);
  t('check-success', ok.status === 'SUCCEEDED' && ok.verifiedObjects.includes('facebook.page'), ok.message);
}
{
  const h = new Harness(facebookManifest());
  h.provider.script('GET', `${BASE}/${PAGE_ID}?`, [{ status: 400, body: fx('error-190.json') }]);
  const a = newAdapter();
  const r = await a.check(JSON.stringify({ page_id: PAGE_ID, principal: PRINCIPAL }), h);
  t('check-auth-failure-is-user-error', r.status === 'FAILED' && r.errorClass === 'user_error', r.message);
}
{
  const h = new Harness(facebookManifest());
  const a = newAdapter();
  const r = await a.check(JSON.stringify({ page_id: PAGE_ID }), h); // no principal
  t('check-rejects-fabricated-principal', r.status === 'FAILED' && r.message.includes('principal'), r.message);
}
{
  const h = new Harness(facebookManifest());
  h.provider.script('GET', `${BASE}/${PAGE_ID}?`, [
    { status: 200, body: fx('page.json') },
    { status: 200, body: fx('page.json') },
  ]);
  const a = newAdapter();
  const streams = await a.discover(JSON.stringify({ page_id: PAGE_ID, principal: PRINCIPAL }), h);
  const ids = streams.map((s) => s.streamId);
  t(
    'discover-alphabetical',
    JSON.stringify(ids) === JSON.stringify(['facebook.page', 'facebook.page-posts', 'facebook.post-comments']),
    ids.join(','),
  );
}

/* ---------------- 3. page read + envelope stability ---------------- */
let pageObsA: Observation | undefined;
{
  const h = new Harness(facebookManifest());
  h.provider.script('GET', `${BASE}/${PAGE_ID}?`, [{ status: 200, body: fx('page.json') }]);
  const a = newAdapter();
  const out = await a.read(req(['facebook.page'], {}, 'tenant-a', 'page1'), h);
  t('page-read-succeeded', out.terminalState === FetchState.SUCCEEDED && out.recordsEmitted === 1, out.terminalState);
  const o = h.observations[0];
  pageObsA = o;
  const env = o.payload['source_envelope'] as Record<string, unknown>;
  t('envelope-fields', env['source_system'] === 'facebook' && env['namespace'] === 'ping:facebook' &&
    env['source_account'] === PAGE_ID && env['source_object_type'] === 'page' &&
    typeof env['raw_payload_hash'] === 'string' && (env['raw_payload_hash'] as string).startsWith('sha256:') &&
    env['principal'] === PRINCIPAL, JSON.stringify(Object.keys(env)));
  t('provenance-fields', o.provenance.provider === 'facebook' && o.provenance.sourceRecordId === PAGE_ID &&
    o.provenance.connectorVersion === '0.1.0', JSON.stringify(o.provenance));
  // compiler leg on the observation
  const cand = compilePage(o.payload['record'] as Record<string, unknown>, env as never);
  t('compiler-page-profile-direct', cand.candidate_kind === 'page-profile' && cand.confidence === 'DIRECT', cand.candidate_kind);
}
{
  // Same record, second run: identical source identity (envelope stability).
  const h = new Harness(facebookManifest());
  h.provider.script('GET', `${BASE}/${PAGE_ID}?`, [{ status: 200, body: fx('page.json') }]);
  const a = newAdapter();
  await a.read(req(['facebook.page'], {}, 'tenant-a', 'page2'), h);
  const o = h.observations[0];
  t('envelope-stability', o.idempotencyKey === (pageObsA as { idempotencyKey: string }).idempotencyKey &&
    (o.payload['source_envelope'] as Record<string, unknown>)['raw_payload_hash'] ===
      ((pageObsA as { payload: Record<string, unknown> }).payload['source_envelope'] as Record<string, unknown>)['raw_payload_hash'],
    'same record must yield same source identity');
}

/* ---------------- 5. idempotency: same observation twice != duplicate ---------------- */
{
  const h = new Harness(facebookManifest());
  h.provider.script('GET', `${BASE}/${PAGE_ID}?`, [
    { status: 200, body: fx('page.json') },
    { status: 200, body: fx('page.json') },
  ]);
  const a = newAdapter();
  await a.read(req(['facebook.page'], {}, 'tenant-a', 'idem1'), h);
  await a.read(req(['facebook.page'], {}, 'tenant-a', 'idem2'), h);
  const ledger = new KnowledgeLedger();
  for (const o of h.observations) ledger.ingest(o);
  t('idempotency-ledger-dedupe', ledger.size === 1 && ledger.duplicatesAbsorbed === 1,
    `size=${ledger.size} dupes=${ledger.duplicatesAbsorbed}`);
}

/* ---------------- 4. feed pagination + cursor semantics ---------------- */
let feedCursor: Record<string, string> = {};
{
  const h = new Harness(facebookManifest());
  h.provider.script('GET', `${BASE}/${PAGE_ID}/feed`, [{ status: 200, body: fx('feed-page1.json') }, { status: 200, body: fx('feed-page2.json') }]);
  const a = newAdapter();
  const out = await a.read(req(['facebook.page-posts'], {}, 'tenant-a', 'feed1'), h);
  t('feed-two-pages', out.terminalState === FetchState.SUCCEEDED && out.recordsEmitted === 3,
    `${out.terminalState} emitted=${out.recordsEmitted}`);
  const saved = h.cursorStore.load('tenant-a', 'facebook.page-posts');
  t('cursor-opaque-verbatim', saved !== null && saved['after'] === 'after2', JSON.stringify(saved));
  feedCursor = out.newCursor;
  // Second run must echo the cursor verbatim in the request URL.
  const h2 = new Harness(facebookManifest());
  h2.provider.script('GET', `${BASE}/${PAGE_ID}/feed`, [{ status: 200, body: fx('feed-page2.json') }]);
  const a2 = newAdapter();
  const out2 = await a2.read(req(['facebook.page-posts'], feedCursor, 'tenant-a', 'feed2'), h2);
  const firstUrl = h2.provider.calls[0]?.url ?? '';
  t('cursor-verbatim-echo', firstUrl.includes('after=after2'), firstUrl);
  t('second-run-emits-one', out2.recordsEmitted === 1, `emitted=${out2.recordsEmitted}`);
  // Compiler on a post observation.
  const postObs = h.observations[0];
  const cand = compilePost(
    postObs.payload['record'] as Record<string, unknown>,
    postObs.payload['source_envelope'] as never,
  );
  t('compiler-page-post', cand.candidate_kind === 'page-post' && cand.confidence === 'DIRECT', cand.candidate_kind);
}

/* ---------------- 6. OUTCOME_UNKNOWN -> reconcile, no dupes ---------------- */
{
  const h = new Harness(facebookManifest());
  h.provider.script('GET', `${BASE}/${PAGE_ID}/feed`, [
    { status: 200, body: fx('feed-page1.json') },
    { status: 0, networkFault: 'timeout' },
  ]);
  const a = newAdapter();
  const out = await a.read(req(['facebook.page-posts'], {}, 'tenant-a', 'unk1'), h);
  t('unknown-on-timeout', out.terminalState === FetchState.OUTCOME_UNKNOWN && out.recordsEmitted === 2,
    `${out.terminalState} emitted=${out.recordsEmitted} reason=${out.reason ?? ''}`);
  const saved = h.cursorStore.load('tenant-a', 'facebook.page-posts');
  t('unknown-does-not-advance-cursor', saved !== null && saved['after'] === 'after1', JSON.stringify(saved));
  // Reconcile: bounded re-read from the last fully processed page. No dupes.
  h.provider.script('GET', `${BASE}/${PAGE_ID}/feed`, [{ status: 200, body: fx('feed-page2.json') }]);
  const out2 = await a.read(req(['facebook.page-posts'], out.newCursor, 'tenant-a', 'unk2'), h);
  t('reconcile-succeeds', out2.terminalState === FetchState.SUCCEEDED && out2.recordsEmitted === 1,
    `${out2.terminalState} emitted=${out2.recordsEmitted}`);
  const ledger = new KnowledgeLedger();
  for (const o of h.observations) ledger.ingest(o);
  t('reconcile-no-duplicates', ledger.size === 3 && ledger.duplicatesAbsorbed === 0,
    `size=${ledger.size} dupes=${ledger.duplicatesAbsorbed}`);
}

/* ---------------- 7. failure taxonomy ---------------- */
{
  const h = new Harness(facebookManifest());
  h.provider.script('GET', `${BASE}/${PAGE_ID}/feed`, [
    { status: 429, headers: { 'Retry-After': '1' }, body: fx('error-429.json') },
  ]);
  const a = newAdapter();
  const out = await a.read(req(['facebook.page-posts'], {}, 'tenant-a', 'r429'), h);
  const att = h.fetchAttempts[0];
  t('429-rate-limited', out.terminalState === FetchState.FAILED && att.failureCode === FailureCode.RATE_LIMITED,
    `${out.terminalState} ${att.failureCode}`);
  t('429-single-attempt-no-storm', h.provider.calls.length === 1, `calls=${h.provider.calls.length}`);
}
{
  const h = new Harness(facebookManifest());
  h.provider.script('GET', `${BASE}/${PAGE_ID}/feed`, [{ status: 400, body: fx('error-190.json') }]);
  const a = newAdapter();
  const out = await a.read(req(['facebook.page-posts'], {}, 'tenant-a', 'e190'), h);
  t('190-auth-expired', out.terminalState === FetchState.FAILED &&
    h.fetchAttempts[0].failureCode === FailureCode.AUTH_EXPIRED, `${h.fetchAttempts[0].failureCode}`);
}
{
  const h = new Harness(facebookManifest());
  h.provider.script('GET', `${BASE}/${PAGE_ID}/feed`, [
    { status: 500, body: fx('error-500.json') },
    { status: 500, body: fx('error-500.json') },
    { status: 500, body: fx('error-500.json') },
  ]);
  const a = newAdapter();
  const out = await a.read(req(['facebook.page-posts'], {}, 'tenant-a', 'e500'), h);
  t('5xx-x3-unknown', out.terminalState === FetchState.OUTCOME_UNKNOWN && h.provider.calls.length === 3,
    `${out.terminalState} calls=${h.provider.calls.length}`);
}
{
  const h = new Harness(facebookManifest());
  h.provider.script('GET', `${BASE}/${PAGE_ID}/feed`, [{ status: 200, body: fx('malformed.txt') }]);
  const a = newAdapter();
  const out = await a.read(req(['facebook.page-posts'], {}, 'tenant-a', 'malf'), h);
  t('malformed-invalid-payload', out.terminalState === FetchState.FAILED &&
    h.fetchAttempts[0].failureCode === FailureCode.INVALID_PAYLOAD, `${h.fetchAttempts[0].failureCode}`);
}
{
  const h = new Harness(facebookManifest());
  const a = newAdapter();
  const out = await a.read(req(['facebook.nope'], {}, 'tenant-a', 'undecl'), h);
  t('undeclared-stream-protocol-violation', out.terminalState === FetchState.FAILED &&
    (out.reason ?? '').includes('protocol violation'), out.reason ?? '');
}

/* ---------------- 8. comments + replies; compiler kinds ---------------- */
{
  const h = new Harness(facebookManifest());
  h.provider.script('GET', `${BASE}/${PAGE_ID}/feed`, [{ status: 200, body: fx('feed-page1.json') }, { status: 200, body: fx('feed-page2.json') }]);
  h.provider.script('GET', `${BASE}/${PAGE_ID}_1001/comments`, [{ status: 200, body: fx('comments-post-1001.json') }]);
  h.provider.script('GET', `${BASE}/c1/comments`, [{ status: 200, body: fx('replies-c1.json') }]);
  h.provider.script('GET', `${BASE}/${PAGE_ID}_1002/comments`, [{ status: 200, body: fx('comments-post-1002.json') }]);
  h.provider.script('GET', `${BASE}/${PAGE_ID}_1003/comments`, [{ status: 200, body: fx('comments-empty.json') }]);
  const a = newAdapter();
  const out = await a.read(req(['facebook.post-comments'], {}, 'tenant-a', 'cmt1'), h);
  // c1, r1, r2 (one reply level), c2, c3 = 5
  t('comments-with-replies', out.terminalState === FetchState.SUCCEEDED && out.recordsEmitted === 5,
    `${out.terminalState} emitted=${out.recordsEmitted} skipped=${JSON.stringify(out.recordsSkipped)}`);
  const byId = new Map(h.observations.map((o) => [o.externalObjectId, o]));
  const c2 = byId.get('c2')!;
  const c3 = byId.get('c3')!;
  t('comments-are-inferred', c2.confidence === 'INFERRED', String(c2.confidence));
  const candC2 = compileComment(c2.payload['record'] as Record<string, unknown>, c2.payload['source_envelope'] as never, PAGE_ID);
  const candC3 = compileComment(c3.payload['record'] as Record<string, unknown>, c3.payload['source_envelope'] as never, PAGE_ID);
  t('prospect-reply-signal', candC2.candidate_kind === 'prospect-reply-signal', candC2.candidate_kind);
  t('page-author-comment', candC3.candidate_kind === 'post-comment', candC3.candidate_kind);
  // Injection in c2's message is stripped at the ingestion boundary.
  const msg = (c2.payload['record'] as Record<string, unknown>)['message'] as string;
  t('injection-stripped', !msg.includes('<script') && !msg.includes('javascript:'), msg.slice(0, 60));
}

/* ---------------- 9. secret canary ---------------- */
{
  const h = new Harness(facebookManifest());
  const evil = JSON.stringify({
    data: [{
      id: 'evil1',
      message: 'a normal looking post',
      created_time: '2026-10-01T00:00:00+0000',
      from: { id: '999', name: 'Attacker' },
      like_count: 0,
      comment_count: 0,
      // Undeclared provider field carrying a secret (kit E5): must never
      // reach observations, logs, or fetch attempts.
      internal_debug: `conn debug token=${h.secretCanary} end`,
    }],
    paging: { cursors: { after: 'x' } },
  });
  h.provider.script('GET', `${BASE}/${PAGE_ID}/feed`, [{ status: 200, body: evil }]);
  const a = newAdapter();
  await a.read(req(['facebook.page-posts'], {}, 'tenant-a', 'canary'), h);
  t('canary-never-leaks', h.findCanaryLeaks().length === 0, h.findCanaryLeaks().join(','));
}

/* ---------------- 10. cross-tenant isolation ---------------- */
{
  const h = new Harness(facebookManifest());
  h.provider.script('GET', `${BASE}/${PAGE_ID}?`, [
    { status: 200, body: fx('page.json') },
    { status: 200, body: fx('page.json') },
  ]);
  const a = newAdapter();
  await a.read(req(['facebook.page'], {}, 'tenant-a', 't1'), h);
  await a.read(req(['facebook.page'], {}, 'tenant-b', 't2'), h);
  const tenants = new Set(h.observations.map((o) => o.tenantId));
  t('tenant-tagging', tenants.has('tenant-a') && tenants.has('tenant-b'), [...tenants].join(','));
  const ca = h.cursorStore.load('tenant-a', 'facebook.page');
  const cb = h.cursorStore.load('tenant-b', 'facebook.page');
  t('tenant-cursors-independent', ca !== null && cb !== null, 'both stored');
}

/* ---------------- report ---------------- */
const passed = results.filter((r) => r.passed).length;
const failed = results.length - passed;
console.log(`\n${passed}/${results.length} checks passed (${failed} failed)`);
if (failed > 0) process.exit(1);
