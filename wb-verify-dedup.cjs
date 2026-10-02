/**
 * Plain-JS behavioral proof for the journal gateway request_id tenant binding.
 * (The jest suite cannot run in this environment: babel has no TypeScript
 * preset configured, so ALL suites fail at parse. This script exercises the
 * same HTTP flow directly under node.)
 *
 * Spawns the REAL tools/fyd-journal-gateway/server.mjs on an ephemeral port
 * with a temp store, then:
 *  1. POST overlay as tenant-a with request_id rid-1 -> 200, event_id E1.
 *  2. POST same request_id as tenant-a (retry) -> 200 deduped:true, E1.
 *  3. POST same request_id as tenant-b -> 400 request_id_tenant_conflict,
 *     response does NOT contain E1 (zero disclosure).
 *  4. GET ?tenant=tenant-b shows no new event (nothing journaled for B).
 */
const { spawn } = require('node:child_process');
const { createServer } = require('node:net');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const GATEWAY = resolve('/home/nolan/projects/ping/tools/fyd-journal-gateway/server.mjs');

async function freePort() {
  const s = createServer();
  await new Promise((r) => s.listen(0, '127.0.0.1', r));
  const port = s.address().port;
  await new Promise((r) => s.close(r));
  return port;
}

async function main() {
  const port = await freePort();
  const store = join(mkdtempSync(join(tmpdir(), 'wb-dedup-')), 'events.jsonl');
  const proc = spawn('node', [GATEWAY], {
    env: { ...process.env, FYD_JOURNAL_PORT: String(port), FYD_JOURNAL_HOST: '127.0.0.1', FYD_JOURNAL_STORE: store },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 10000;
  for (;;) {
    try { const r = await fetch(base + '/'); if (r.ok) break; } catch {}
    if (Date.now() > deadline) { proc.kill(); throw new Error('gateway did not come up'); }
    await new Promise((r) => setTimeout(r, 50));
  }

  let failures = 0;
  const check = (name, cond, detail = '') => {
    console.log(cond ? `  PASS ${name}` : `  FAIL ${name}${detail ? ' :: ' + detail : ''}`);
    if (!cond) failures++;
  };
  const post = async (tenant, rid) => {
    const res = await fetch(base + '/events', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'FYD_SITE_OVERLAY', tenant_id: tenant,
        aggregate_id: `fyd-site:${tenant}`,
        event_data: { siteId: tenant, ops: [] }, request_id: rid,
      }),
    });
    return { status: res.status, doc: await res.json().catch(() => null) };
  };

  const first = await post('tenant-a', 'rid-1');
  check('honest write tenant-a -> 200', first.status === 200, first.status);
  const E1 = first.doc && first.doc.event_id;
  check('honest write returns event_id', typeof E1 === 'string' && E1.length > 0);

  const retry = await post('tenant-a', 'rid-1');
  check('same-tenant retry -> 200', retry.status === 200, retry.status);
  check('same-tenant retry deduped:true same event_id',
    retry.doc && retry.doc.deduped === true && retry.doc.event_id === E1,
    JSON.stringify(retry.doc));

  const cross = await post('tenant-b', 'rid-1');
  check('cross-tenant retry -> 400', cross.status === 400, cross.status);
  check('cross-tenant retry error is request_id_tenant_conflict',
    cross.doc && cross.doc.error === 'request_id_tenant_conflict', JSON.stringify(cross.doc));
  check('zero disclosure: response does not contain original event_id',
    !JSON.stringify(cross.doc).includes(E1), JSON.stringify(cross.doc));

  const rb = await fetch(base + '/events/FYD_SITE_OVERLAY?tenant=tenant-b').then((r) => r.json());
  check('nothing journaled for tenant-b', Array.isArray(rb.events) && rb.events.length === 0,
    `got ${rb.events && rb.events.length}`);

  proc.kill();
  console.log(failures === 0 ? 'DEDUP TENANT BINDING: PASS' : `DEDUP TENANT BINDING: FAIL (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.log('FAIL (harness: ' + e.message + ')'); process.exit(2); });
