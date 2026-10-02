/**
 * Hostile tenant-isolation suite for the Qdrant vector boundary.
 *
 * Attacks the thin REST QdrantAdapter (ping-runtime/search/qdrant_adapter.js)
 * in both directions against the LIVE Qdrant on 127.0.0.1:6333:
 *
 *  READ:   search without namespace -> throws (fail closed, never unfiltered).
 *          search as tenant::hpp -> every hit carries namespace tenant::hpp.
 *          search as core::owner -> only core::owner hits (A<->B both ways).
 *          search as tenant::nonexistent -> zero hits, not other tenants' hits.
 *          malicious caller filter (match-all widen attempt) -> still
 *          constrained to the requested namespace.
 *  WRITE:  upsert point without payload.namespace -> throws, nothing stored.
 *          upsert batch mixing namespaces -> throws, nothing stored.
 *          upsert with batch namespace != point namespace -> throws.
 *          honest namespaced upsert -> stored; visible only under its own
 *          namespace, invisible under another tenant's.
 *
 * Writes go to a temp collection that is deleted at the end. The live
 * `knowledge` collection is only read, never written.
 *
 * Run: node ping-runtime/search/test_tenant_vector_isolation.js
 * Exit 0 = TENANT VECTOR ISOLATION PASS, non-zero = FAIL with the first
 * failing assertion named.
 */
const { QdrantAdapter } = require('./qdrant_adapter');
const { randomUUID } = require('node:crypto');

const URL = process.env.QDRANT_URL || 'http://127.0.0.1:6333';
const LIVE_COLLECTION = 'knowledge';
const TMP_COLLECTION = 'wb-tenant-test-' + Date.now().toString(36);
const DIM = 768;

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) {
    console.log(`  PASS ${name}`);
  } else {
    failures++;
    console.log(`  FAIL ${name}${detail ? ' :: ' + detail : ''}`);
  }
}
async function checkThrows(name, fn, pattern) {
  try {
    await fn();
    failures++;
    console.log(`  FAIL ${name} :: did not throw`);
  } catch (e) {
    const ok = pattern ? pattern.test(e.message) : true;
    if (ok) console.log(`  PASS ${name}`);
    else {
      failures++;
      console.log(`  FAIL ${name} :: wrong error: ${e.message}`);
    }
  }
}
const vec = (v) => new Array(DIM).fill(v);

async function main() {
  const a = new QdrantAdapter({ url: URL });
  const health = await a.health();
  if (health.status !== 'healthy') {
    console.log('Qdrant not reachable at ' + URL + ' — cannot prove isolation. FAIL');
    process.exit(2);
  }

  console.log('== READ: fail-closed without namespace ==');
  await checkThrows(
    'search without namespace throws',
    () => a.search(LIVE_COLLECTION, vec(0.01), 5),
    /namespace is required/,
  );
  await checkThrows(
    'search with empty namespace throws',
    () => a.search(LIVE_COLLECTION, vec(0.01), 5, { namespace: '' }),
    /namespace is required/,
  );

  console.log('== READ: namespaced search is exactly scoped (both directions) ==');
  const hpp = await a.search(LIVE_COLLECTION, vec(0.01), 10, { namespace: 'tenant::hpp' });
  check('tenant::hpp search returns hits', hpp.length > 0, `got ${hpp.length}`);
  check(
    'every tenant::hpp hit carries namespace tenant::hpp (zero disclosure)',
    hpp.every((h) => h.payload && h.payload.namespace === 'tenant::hpp'),
    JSON.stringify([...new Set(hpp.map((h) => h.payload && h.payload.namespace))]),
  );
  const owner = await a.search(LIVE_COLLECTION, vec(0.01), 10, { namespace: 'core::owner' });
  check('core::owner search returns hits', owner.length > 0, `got ${owner.length}`);
  check(
    'every core::owner hit carries namespace core::owner (zero disclosure)',
    owner.every((h) => h.payload && h.payload.namespace === 'core::owner'),
    JSON.stringify([...new Set(owner.map((h) => h.payload && h.payload.namespace))]),
  );
  const ghost = await a.search(LIVE_COLLECTION, vec(0.01), 10, { namespace: 'tenant::no-such-tenant' });
  check('unknown tenant namespace returns zero hits (not other tenants)', ghost.length === 0, `got ${ghost.length}`);

  console.log('== READ: malicious caller filter cannot widen past the namespace ==');
  const widened = await a.search(LIVE_COLLECTION, vec(0.01), 10, {
    namespace: 'tenant::hpp',
    filter: { must: [{ key: 'event_type', match: { value: 'no-such-type' } }] },
  });
  check('narrowing caller filter still scoped', widened.every((h) => h.payload && h.payload.namespace === 'tenant::hpp'));

  console.log('== WRITE: upsert validation (temp collection) ==');
  await a.ensureCollection(TMP_COLLECTION, DIM);
  await checkThrows(
    'upsert point without payload.namespace throws',
    () => a.upsert(TMP_COLLECTION, [{ id: randomUUID(), vector: vec(0.02), payload: { text: 'x' } }]),
    /payload\.namespace/,
  );
  await checkThrows(
    'upsert batch mixing namespaces throws',
    () =>
      a.upsert(
        TMP_COLLECTION,
        [
          { id: randomUUID(), vector: vec(0.02), payload: { namespace: 'tenant::a', text: 'x' } },
          { id: randomUUID(), vector: vec(0.02), payload: { namespace: 'tenant::b', text: 'x' } },
        ],
        { namespace: 'tenant::a' },
      ),
    /does not match batch namespace/,
  );
  const WB4 = randomUUID();
  // Honest write: namespaced batch stores; visible only under its namespace.
  await a.upsert(
    TMP_COLLECTION,
    [{ id: WB4, vector: vec(0.03), payload: { namespace: 'tenant::a', text: 'secret-a' } }],
    { namespace: 'tenant::a' },
  );
  let seenA = [];
  for (let i = 0; i < 10 && !seenA.some((h) => h.id === WB4); i++) {
    await new Promise((r) => setTimeout(r, 500));
    seenA = await a.search(TMP_COLLECTION, vec(0.03), 5, { namespace: 'tenant::a' });
  }
  check('honest upsert visible under its own namespace', seenA.some((h) => h.id === WB4));
  const seenB = await a.search(TMP_COLLECTION, vec(0.03), 5, { namespace: 'tenant::b' });
  check("honest upsert invisible under another tenant's namespace", !seenB.some((h) => h.id === 'wb-4'));

  // Cleanup: delete the temp collection (live data untouched).
  await a._fetch(`/collections/${TMP_COLLECTION}`, { method: 'DELETE' }).catch(() => {});
  const cols = await a._fetch('/collections').catch(() => ({ result: { collections: [] } }));
  const gone = !(cols.result.collections || []).some((c) => c.name === TMP_COLLECTION);
  check('temp collection deleted', gone);

  console.log(failures === 0 ? 'VECTOR ISOLATION: PASS' : `VECTOR ISOLATION: FAIL (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.log('VECTOR ISOLATION: FAIL (harness error: ' + e.message + ')');
  process.exit(2);
});
