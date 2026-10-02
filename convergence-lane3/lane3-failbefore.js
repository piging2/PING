'use strict';
// LANE 3 / PATCH-03 — FAIL-BEFORE witness (runs against CURRENT, unpatched code).
// Documents the E2 defect on a REAL PostgreSQL pool:
//   same event_id + DIFFERENT canonical content -> silently deduped, ok receipt,
//   handlers fire on the dropped content (journal/handler split-brain).
// Narrowest test seam: monkey-patch the IdentityAuthority singleton's
// generateId in the TEST ONLY to force the collision. Production code untouched.
const path = require('path');
const crypto = require('crypto');
const REPO = process.env.REPO || '/home/nolan/worktrees/constitutional-convergence-authority-law';
const pg = require('pg');
const { Pool } = pg;

const PGHOST = process.env.PGHOST || '127.0.0.1';
const PGPORT = parseInt(process.env.PGPORT || '15443', 10);
const PGUSER = process.env.PGUSER || 'postgres';
const PGPASSWORD = process.env.PGPASSWORD || 'lane3scratchpw';
const DB = 'lane3_failbefore_' + Date.now().toString(36);

let pass = 0, fail = 0;
function check(cond, name, detail) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}

async function main() {
  const admin = new Pool({ host: PGHOST, port: PGPORT, user: PGUSER, password: PGPASSWORD, database: 'postgres' });
  await admin.query('CREATE DATABASE "' + DB + '"');
  await admin.end();
  const pool = new Pool({ host: PGHOST, port: PGPORT, user: PGUSER, password: PGPASSWORD, database: DB });

  const { UnifiedEventRuntime } = require(path.join(REPO, 'ping-runtime/events/unified_event_runtime.js'));
  const ia = require(path.join(REPO, 'runtime/kernel/authorities/identity_authority.js'));

  const uer = new UnifiedEventRuntime({ pool, eventValidator: null, eventGovernance: null });
  await uer.initialize();

  const dispatched = [];
  uer.on('LANE3_TEST', async (ev) => { dispatched.push({ event_id: ev.event_id, payload: ev.payload }); });

  // 1. Insert event A.
  const rA = await uer.emit('LANE3_TEST', 'lane3-probe', { phase: 'A', secret: 'alpha' }, { namespace: 'core::system' });
  check(rA.status === 'ok' && rA.eventId, 'A emitted ok');
  check(rA.deduplicated !== true, 'A is a fresh persist, not a dedup');

  // 2. Equivalent-content redelivery of A -> ok (current idempotent-retry behavior).
  const rAdup = await uer.emit('LANE3_TEST', 'lane3-probe', { phase: 'A', secret: 'alpha' }, { namespace: 'core::system' });
  check(rAdup.status === 'ok' && rAdup.eventId === rA.eventId, 'equivalent redelivery of A returns ok, same event_id');

  // 3. Force a collision: same event_id as A, DIFFERENT canonical content.
  const origGenerateId = ia.identityAuthority.generateId;
  ia.identityAuthority.generateId = (type, data) => rA.eventId; // claim A's ID for different content
  let rB;
  try {
    rB = await uer.emit('LANE3_TEST', 'lane3-probe', { phase: 'B', secret: 'beta' }, { namespace: 'core::system' });
  } finally {
    ia.identityAuthority.generateId = origGenerateId;
  }

  // THE DEFECT: silently deduped, success receipt, no distinguishing signal.
  check(rB.status === 'ok', 'DEFECT: conflicting event B returns status ok (silent dedup)');
  check(!rB.code, 'DEFECT: B carries no failure code', rB.code || '');
  check(rB.collision !== true, 'DEFECT: B carries no collision flag');
  check(rB.deduplicated !== true, 'DEFECT: B is not even marked as a dedup (cannot distinguish equivalent vs conflicting)');

  // Journal kept A's content (B's content dropped from the journal).
  const row = (await pool.query('SELECT payload FROM ping_events WHERE event_id=$1', [rA.eventId])).rows[0];
  check(row && row.payload && row.payload.phase === 'A' && row.payload.secret === 'alpha',
    'journal still holds A content only (B content dropped, no overwrite)');

  // Handlers fired on B's dropped content -> journal/handler split-brain.
  const dispB = dispatched.filter((d) => d.payload && d.payload.phase === 'B');
  check(dispB.length === 1, 'DEFECT: handlers dispatched B content even though the journal dropped it (split-brain)', 'dispatched=' + dispatched.length);

  const nRows = (await pool.query('SELECT COUNT(*)::int AS c FROM ping_events')).rows[0].c;
  check(nRows === 1, 'exactly one row for the event_id (B did not create a second row)', 'rows=' + nRows);

  await pool.end();
  const admin2 = new Pool({ host: PGHOST, port: PGPORT, user: PGUSER, password: PGPASSWORD, database: 'postgres' });
  await admin2.query('DROP DATABASE "' + DB + '"');
  await admin2.end();

  console.log('\nFAIL-BEFORE: ' + pass + ' pass, ' + fail + ' fail');
  console.log(fail === 0
    ? '=> DEFECT DOCUMENTED: same event_id + different canonical content is silently deduped with an ok receipt; axiom E2 is unenforced.'
    : '=> UNEXPECTED: the defect was NOT reproduced as expected.');
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => { console.error('FATAL', err); process.exit(2); });
