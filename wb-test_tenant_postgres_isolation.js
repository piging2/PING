/**
 * Hostile tenant-isolation suite for the Postgres event authority.
 *
 * Attacks CanonicalEventEnvelope (gateway/canonical_event_envelope.js),
 * the storage authority behind canonical_events, against the LIVE
 * Postgres (localhost:5432/crx_runtime) in both directions:
 *
 *  READ:   query without tenantId        -> throws (fail closed, never unscoped).
 *          query with invalid tenantId   -> throws.
 *          query as wb-b after wb-a emit -> zero rows (B cannot read A).
 *          query as wb-a after wb-b emit -> only wb-a rows (A cannot read B).
 *          stats without tenantId        -> throws (no cross-tenant aggregates).
 *          stats as wb-a                 -> only wb-a rows.
 *          unprocessed without tenant    -> throws.
 *  WRITE:  emit without tenantId        -> throws, nothing stored.
 *          emit with invalid tenantId    -> throws, nothing stored.
 *          honest emits                  -> stored under immutable tenant_id.
 *
 * Schema init uses CREATE TABLE IF NOT EXISTS (additive, safe). Test rows
 * use throwaway tenant_ids ('wb-a', 'wb-b') and are deleted at the end.
 * No live tenant data is touched.
 *
 * Run: node gateway/test_tenant_postgres_isolation.js   (from repo root,
 *        or node test_tenant_postgres_isolation.js from gateway/)
 * Exit 0 = POSTGRES ISOLATION PASS, non-zero = FAIL with the first
 * failing assertion named.
 */
const path = require('path');
const { Pool } = require('pg');
const { CanonicalEventEnvelope } = require('./canonical_event_envelope');

const TENANTS = { A: 'wb-a', B: 'wb-b' };

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) {
    console.log(`  PASS ${name}`);
  } else {
    failures++;
    console.log(`  FAIL ${name}${detail ? ' :: ' + detail : ''}`);
  }
}
async function checkThrows(name, fn) {
  try {
    await fn();
    failures++;
    console.log(`  FAIL ${name} :: did not throw`);
  } catch (e) {
    console.log(`  PASS ${name} (${e.message.slice(0, 80)})`);
  }
}

async function main() {
  const pool = new Pool({
    host: 'localhost', port: 5432, database: 'crx_runtime',
    user: 'postgres', password: 'postgres',
    connectionTimeoutMillis: 8000,
  });
  const storage = { query: (text, params) => pool.query(text, params) };
  const envelope = new CanonicalEventEnvelope(storage, {
    repoRoot: path.resolve(__dirname, '..'),
  });
  await envelope.initialize();

  const emit = (tenantId, eventType, payload) =>
    envelope.executeEmitEvent({
      tenantId, eventType, source: 'wb-test', actor: 'wb', payload,
    });

  console.log('== WRITE: fail-closed without trusted tenant ==');
  await checkThrows('emit without tenantId throws', () =>
    emit(undefined, 'wb.ping', { x: 1 }));
  await checkThrows('emit with empty tenantId throws', () =>
    emit('', 'wb.ping', { x: 1 }));
  await checkThrows('emit with path-traversal tenantId throws', () =>
    emit('../../etc', 'wb.ping', { x: 1 }));

  console.log('== WRITE: honest emits land under immutable tenant_id ==');
  const evA = await emit(TENANTS.A, 'wb.ping', { secret: 'alpha' });
  check('honest emit as wb-a succeeds', evA && evA.tenant_id === TENANTS.A);
  const evB = await emit(TENANTS.B, 'wb.ping', { secret: 'beta' });
  check('honest emit as wb-b succeeds', evB && evB.tenant_id === TENANTS.B);

  console.log('== READ: fail-closed without tenant (never unscoped) ==');
  await checkThrows('query without tenantId throws', () =>
    envelope.executeQueryEvents({}));
  await checkThrows('query with invalid tenantId throws', () =>
    envelope.executeQueryEvents({ tenantId: '../../x' }));
  await checkThrows('stats without tenantId throws', () =>
    envelope.executeGetStats(undefined));
  await checkThrows('unprocessed without tenantId throws', () =>
    envelope.executeGetUnprocessed(undefined));

  console.log('== READ: exact tenant scoping, both directions ==');
  const aRows = await envelope.executeQueryEvents({ tenantId: TENANTS.A });
  check('wb-a sees its own event', aRows.some((r) => r.event_id === evA.event_id));
  check(
    'wb-a sees zero wb-b rows (zero disclosure)',
    aRows.every((r) => r.tenant_id === TENANTS.A),
    JSON.stringify([...new Set(aRows.map((r) => r.tenant_id))]),
  );
  const bRows = await envelope.executeQueryEvents({ tenantId: TENANTS.B });
  check('wb-b sees its own event', bRows.some((r) => r.event_id === evB.event_id));
  check(
    'wb-b sees zero wb-a rows (zero disclosure)',
    bRows.every((r) => r.tenant_id === TENANTS.B),
    JSON.stringify([...new Set(bRows.map((r) => r.tenant_id))]),
  );
  const statsA = await envelope.executeGetStats(TENANTS.A);
  check(
    'stats as wb-a contain only wb-a',
    statsA.length === 1 && statsA[0].tenant_id === TENANTS.A,
    JSON.stringify(statsA.map((s) => s.tenant_id)),
  );

  console.log('== CLEANUP ==');
  await pool.query('DELETE FROM canonical_events WHERE tenant_id = ANY($1)', [
    [TENANTS.A, TENANTS.B],
  ]);
  const left = await pool.query(
    'SELECT COUNT(*)::int AS n FROM canonical_events WHERE tenant_id = ANY($1)',
    [[TENANTS.A, TENANTS.B]],
  );
  check('test rows deleted', left.rows[0].n === 0);
  await pool.end();

  console.log(failures === 0 ? 'POSTGRES ISOLATION: PASS' : `POSTGRES ISOLATION: FAIL (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.log('POSTGRES ISOLATION: FAIL (harness error: ' + e.message + ')');
  process.exit(2);
});
