// Minimal single-boot PGlite smoke: exercises all PGliteSyncPort-specific
// code paths (live diff subscribe, tx applyAccepted, propose table) in ONE
// boot. The full conformance (restart test = 2nd boot) is environment-limited.
import assert from 'node:assert/strict';
import { PGliteSyncPort } from './sync-port.mjs';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const port = new PGliteSyncPort({ tables: { objects: 'id' } });
await port.start();
console.log('booted');

const events = [];
const unsub = await port.subscribe('objects', (e) => events.push(e));
await port.externalWrite({ op: 'insert', table: 'objects', key: 'o1', row: { id: 'o1', name: 'Acme' } });
await sleep(400);
await port.externalWrite({ op: 'update', table: 'objects', key: 'o1', row: { id: 'o1', name: 'Acme LLC' } });
await sleep(500);
assert.ok(events.some(e => e.op === 'insert' && e.key === 'o1'), 'insert event via live diff');
assert.ok(events.some(e => e.op === 'update' && e.key === 'o1'), 'update event via live diff');
console.log('live subscription events OK:', events.map(e => e.op).join(','));

const rows = await port.read('objects');
assert.ok(rows.some(r => r.id === 'o1' && r.name === 'Acme LLC'), 'read cache current');
console.log('read cache OK');

const p = await port.propose({ op: 'insert', table: 'objects', key: 'o2', row: { id: 'o2', name: 'Beta' } });
await sleep(300);
assert.ok(!(await port.read('objects')).some(r => r.id === 'o2'), 'proposal must not touch cache');
console.log('propose-isolation OK');
await port.applyAccepted(p);
await sleep(500);
assert.ok((await port.read('objects')).some(r => r.id === 'o2'), 'accepted write mirrored');
assert.ok(events.some(e => e.op === 'insert' && e.key === 'o2'), 'subscribers notified');
console.log('applyAccepted OK');

// selective unsubscribe (upstream #1048 guard): each listener has own live query
const a = [], b = [];
const uA = await port.subscribe('objects', (e) => a.push(e));
const uB = await port.subscribe('objects', (e) => b.push(e));
await sleep(300);
await uA();
await port.externalWrite({ op: 'insert', table: 'objects', key: 'o3', row: { id: 'o3', name: 'Gamma' } });
await sleep(500);
assert.ok(b.some(e => e.key === 'o3'), 'B still receives after A unsubscribed');
await uB();
console.log('selective unsubscribe OK');

const probe = await port.durabilityProbe();
console.log('durabilityProbe:', JSON.stringify(probe));
await unsub();
await port.stop();
console.log('PGLITE SMOKE: ALL PASS');
