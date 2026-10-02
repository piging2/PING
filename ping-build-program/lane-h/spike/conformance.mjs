// Conformance suite for SyncPort providers.
// Run the SAME assertions against every provider. If all pass, PING's
// consumer code is provider-agnostic: Electric shapes, plain pgoutput, and
// PGlite are interchangeable behind SyncPort (the optionality test).
import assert from 'node:assert/strict';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function conformance(port, { restartable = false, expectRestartLoss = false, externalWriter } = {}) {
  const results = [];
  const t = async (name, fn) => {
    try { await fn(); results.push([name, 'PASS', '']); }
    catch (e) { results.push([name, 'FAIL', String(e.message).slice(0, 200)]); }
  };
  const events = [];
  let unsub = null;

  await t('1 start', async () => { await port.start(); });

  await t('2 subscribe receives insert/update/delete', async () => {
    unsub = await port.subscribe('objects', (e) => events.push(e));
    await sleep(300); // let the subscription baseline settle (live-query providers)
    await externalWriter(port, { op: 'insert', table: 'objects', key: 'o1', row: { id: 'o1', name: 'Acme Plumbing' } });
    await sleep(350); // separate ticks so live-diff providers observe each op
    await externalWriter(port, { op: 'update', table: 'objects', key: 'o1', row: { id: 'o1', name: 'Acme Plumbing LLC' } });
    await sleep(350);
    await externalWriter(port, { op: 'delete', table: 'objects', key: 'o1' });
    await sleep(500);
    assert.equal(events.filter(e => e.op === 'insert' && e.key === 'o1').length, 1, 'insert event');
    assert.equal(events.filter(e => e.op === 'update' && e.key === 'o1').length, 1, 'update event');
    assert.equal(events.filter(e => e.op === 'delete' && e.key === 'o1').length, 1, 'delete event');
  });

  await t('3 read returns current cache rows', async () => {
    await externalWriter(port, { op: 'insert', table: 'objects', key: 'o2', row: { id: 'o2', name: 'Beta HVAC' } });
    await sleep(300);
    const rows = await port.read('objects');
    assert.ok(rows.some(r => r.id === 'o2'), 'o2 visible in read cache');
    assert.ok(!rows.some(r => r.id === 'o1'), 'o1 gone after delete');
  });

  await t('4 propose does NOT change the cache (proposals only)', async () => {
    const p = await port.propose({ op: 'insert', table: 'objects', key: 'o3', row: { id: 'o3', name: 'Gamma Electric' } });
    assert.equal(p.status, 'proposed');
    await sleep(300);
    const rows = await port.read('objects');
    assert.ok(!rows.some(r => r.id === 'o3'), 'proposed row must not be in cache');
    port._lastProposal = p;
  });

  await t('5 applyAccepted mirrors the write + notifies', async () => {
    await port.applyAccepted(port._lastProposal);
    await sleep(300);
    const rows = await port.read('objects');
    assert.ok(rows.some(r => r.id === 'o3'), 'accepted row in cache');
    const ins = events.filter(e => e.op === 'insert' && e.key === 'o3');
    assert.ok(ins.length >= 1, 'subscribers notified of accepted write');
  });

  await t('6 selective unsubscribe keeps other listeners alive (pglite#1048)', async () => {
    const seenA = [], seenB = [];
    const unA = await port.subscribe('objects', (e) => seenA.push(e));
    const unB = await port.subscribe('objects', (e) => seenB.push(e));
    await sleep(400); // let both live baselines settle
    await unA(); // remove ONLY A
    await externalWriter(port, { op: 'insert', table: 'objects', key: 'o4', row: { id: 'o4', name: 'Delta Roofing' } });
    await sleep(400);
    assert.ok(seenB.some(e => e.key === 'o4'), 'B must still receive after A unsubscribes');
    await unB();
  });

  await t('7 durability probe', async () => {
    const probe = await port.durabilityProbe();
    assert.ok(typeof probe.durable === 'boolean');
    assert.ok(probe.detail && probe.detail.length > 10, 'probe must explain itself');
  });

  if (restartable) {
    await t(`8 restart: cache ${expectRestartLoss ? 'correctly LOST (memory://)' : 'survives'} stop/start`, async () => {
      await externalWriter(port, { op: 'insert', table: 'objects', key: 'o5', row: { id: 'o5', name: 'Epsilon Solar' } });
      await sleep(400);
      await port.stop();
      await port.start();
      const rows = await port.read('objects');
      if (expectRestartLoss) assert.ok(!rows.some(r => r.id === 'o5'), 'memory:// must lose o5 across restart (honest non-durability)');
      else assert.ok(rows.some(r => r.id === 'o5'), 'o5 survived restart');
    });
  }

  await t('9 stop clean', async () => { try { await unsub?.(); } catch {} await port.stop(); });

  return results;
}

export function report(name, results) {
  const fails = results.filter(([, s]) => s !== 'PASS');
  console.log(`\n== ${name}: ${results.length - fails.length}/${results.length} PASS ==`);
  for (const [n, s, d] of results) console.log(`  [${s}] ${n}${d ? ' -- ' + d : ''}`);
  return fails.length;
}
