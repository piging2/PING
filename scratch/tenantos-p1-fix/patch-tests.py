"""Update the two honor-system tests in test_ingest_boundary.js to the P1 binding contract."""
import io

P = '/home/nolan/ping/gateway/test_ingest_boundary.js'
s = io.open(P, encoding='utf-8').read()

OLD1 = """test('explicit namespace overrides source map', async () => {
  const { service } = buildService({ 'review-authority': 'tenant::hpp' });
  const result = await service.canonicalizeAndEmit({ source: 'review-authority', eventType: 'REVIEW_RECEIVED', payload: { review_id: 'r4' }, namespace: 'core::system' });
  assert.strictEqual(result.namespace, 'core::system');
});"""

NEW1 = """test('explicit unbound namespace is ignored in favor of trusted per-source map (P1 spoof fix)', async () => {
  const { service } = buildService({ 'review-authority': 'tenant::hpp' });
  const result = await service.canonicalizeAndEmit({ source: 'review-authority', eventType: 'REVIEW_RECEIVED', payload: { review_id: 'r4' }, namespace: 'core::system' });
  assert.strictEqual(result.namespace, 'tenant::hpp');
});

test('explicit bound namespace override is honored (byte-identical for bound claims)', async () => {
  const { service } = buildService({ 'review-authority': 'tenant::hpp' });
  const result = await service.canonicalizeAndEmit({ source: 'review-authority', eventType: 'REVIEW_RECEIVED', payload: { review_id: 'r4b' }, namespace: 'tenant::hpp' });
  assert.strictEqual(result.namespace, 'tenant::hpp');
});"""

OLD2 = """test('authorizeNamespace: explicit override → authorized (map + override rule)', async () => {
  const { service } = buildService({ 'review-authority': 'tenant::hpp' });
  const auth = service.authorizeNamespace('review-authority', 'core::system');
  assert.deepStrictEqual(auth, { authorized: true, namespace: 'core::system' });
});"""

NEW2 = """test('authorizeNamespace: unbound explicit override → unauthorized (P1 spoof fix)', async () => {
  const { service } = buildService({ 'review-authority': 'tenant::hpp' });
  const auth = service.authorizeNamespace('review-authority', 'core::system');
  assert.strictEqual(auth.authorized, false);
  assert.match(auth.reason, /not bound/);
});

test('authorizeNamespace: bound explicit override → authorized', async () => {
  const { service } = buildService({ 'review-authority': 'tenant::hpp' });
  const auth = service.authorizeNamespace('review-authority', 'tenant::hpp');
  assert.deepStrictEqual(auth, { authorized: true, namespace: 'tenant::hpp' });
});"""

OLD3 = """test('POST /ingest 400 on invalid namespace', async () => {"""

NEW3 = """test('POST /ingest 400 on unbound namespace override (tenant spoof rejected at guard)', async () => {
  const { service } = buildService({ 'review-authority': 'tenant::hpp' });
  const { server, port } = await startServer(service);
  try {
    const resp = await post(port, '/ingest', { source: 'review-authority', eventType: 'REVIEW_RECEIVED', payload: {}, namespace: 'tenant::victim-b' });
    assert.strictEqual(resp.status, 400);
    const body = await resp.json();
    assert.match(body.error, /not bound/);
  } finally {
    server.close();
  }
});

test('POST /ingest 400 on invalid namespace', async () => {"""

for name, old, new in [('honor-system resolve', OLD1, NEW1), ('honor-system authorize', OLD2, NEW2), ('route spoof guard', OLD3, NEW3)]:
    assert s.count(old) == 1, 'expected exactly 1 match for ' + name + ', got ' + str(s.count(old))
    s = s.replace(old, new)
    print('patched:', name)

io.open(P, 'w', encoding='utf-8').write(s)
print('done')
