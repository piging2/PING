#!/usr/bin/env node
// Test: PostgreSQL session-level advisory lock for the ORCA coordinator claim.
// Run on the Pig (needs PG). Usage: node lock-test.js <objective-id>
'use strict';
const { spawn } = require('child_process');

let PgClient;
try {
  PgClient = require('/tmp/orca-pgcheck/node_modules/pg').Client;
} catch (_) {
  PgClient = require('pg').Client;
}
const objRuntime = require('/home/nolan/worktrees/orca-autonomy/orca/control-loop/objective-runtime.js');

function pgConfig() {
  return {
    host: process.env.PGHOST || '127.0.0.1',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'ping_runtime',
    connectionTimeoutMillis: 10000,
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name);
  if (!cond) failures++;
}

async function main() {
  const objectiveId = process.argv[2] || 'lock-test-objective';
  const dataRoot = '/tmp/orca-lock-test-' + process.pid;

  // 1. Key derivation: deterministic, stable, distinct.
  const k1 = objRuntime.coordinatorLockKey(objectiveId);
  const k2 = objRuntime.coordinatorLockKey(objectiveId);
  check('key deterministic', k1.k1 === k2.k1 && k1.k2 === k2.k2);
  const k3 = objRuntime.coordinatorLockKey(objectiveId + '-other');
  check('key distinct per objective', k3.k1 !== k1.k1 || k3.k2 !== k1.k2);
  check('key in int32 range',
    Number.isInteger(k1.k1) && Number.isInteger(k1.k2) &&
    k1.k1 >= -2147483648 && k1.k1 <= 2147483647 &&
    k1.k2 >= -2147483648 && k1.k2 <= 2147483647);

  // 2. Mutual exclusion across two sessions.
  const a = new PgClient(pgConfig());
  const b = new PgClient(pgConfig());
  await a.connect();
  await b.connect();
  const ra = await objRuntime.acquireCoordinatorLock(a, dataRoot, objectiveId);
  check('client A acquires', ra.acquired === true);
  const rb = await objRuntime.acquireCoordinatorLock(b, dataRoot, objectiveId);
  check('client B denied while A holds', rb.acquired === false);
  await objRuntime.releaseCoordinatorLock(a, dataRoot, objectiveId);
  const rb2 = await objRuntime.acquireCoordinatorLock(b, dataRoot, objectiveId);
  check('client B acquires after A releases', rb2.acquired === true);
  await objRuntime.releaseCoordinatorLock(b, dataRoot, objectiveId);
  await a.end();
  await b.end();

  // 3. SIGKILL safety: a killed holder's session drops, the DB releases the
  // lock, and a new coordinator acquires cleanly (no stale-holder guessing).
  const holderCode = `
    const PgClient = require('/tmp/orca-pgcheck/node_modules/pg').Client;
    const objRuntime = require('/home/nolan/worktrees/orca-autonomy/orca/control-loop/objective-runtime.js');
    (async () => {
      const c = new PgClient(${JSON.stringify(pgConfig())});
      await c.connect();
      const r = await objRuntime.acquireCoordinatorLock(c, ${JSON.stringify(dataRoot)}, ${JSON.stringify(objectiveId)});
      console.log('holder acquired: ' + r.acquired);
      await new Promise(() => {}); // sleep forever; we will be SIGKILLed
    })().catch((e) => { console.error(e.message); process.exit(1); });
  `;
  const holder = spawn(process.execPath, ['-e', holderCode], { stdio: ['ignore', 'pipe', 'pipe'] });
  let holderOut = '';
  holder.stdout.on('data', (d) => { holderOut += d.toString(); });
  // wait for the holder to report acquisition
  for (let i = 0; i < 100 && !holderOut.includes('holder acquired: true'); i++) await sleep(100);
  check('holder acquired before kill', holderOut.includes('holder acquired: true'));
  holder.kill('SIGKILL');
  await new Promise((resolve) => holder.on('exit', resolve));
  // Give the server a moment to notice the dead session.
  await sleep(1500);
  const c = new PgClient(pgConfig());
  await c.connect();
  const rc = await objRuntime.acquireCoordinatorLock(c, dataRoot, objectiveId);
  check('acquire succeeds after holder SIGKILLed (server-side release)', rc.acquired === true);
  await objRuntime.releaseCoordinatorLock(c, dataRoot, objectiveId);
  await c.end();

  // 4. Diagnostic file is written on acquire and removed on release.
  const d = new PgClient(pgConfig());
  await d.connect();
  await objRuntime.acquireCoordinatorLock(d, dataRoot, objectiveId);
  const fs = require('fs');
  const claimPath = objRuntime.coordinatorClaimPath(dataRoot, objectiveId);
  check('diagnostic claim file written', fs.existsSync(claimPath));
  const claimDoc = JSON.parse(fs.readFileSync(claimPath, 'utf8'));
  check('diagnostic file marked non-authoritative', /DIAGNOSTIC ONLY/.test(claimDoc.note || ''));
  await objRuntime.releaseCoordinatorLock(d, dataRoot, objectiveId);
  check('diagnostic claim file removed on release', !fs.existsSync(claimPath));
  await d.end();

  console.log(failures === 0 ? 'ALL LOCK TESTS PASSED' : failures + ' LOCK TEST(S) FAILED');
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
