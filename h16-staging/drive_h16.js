/**
 * H16 live drive: scratch Postgres (ping-postgres on 5433, database h16)
 * seeded THROUGH the real socialDraftProjector, then exercised through the
 * NEW CLI scripts/review-drafts.js via child_process. Asserts on stdout
 * content and exit codes (usage errors -> 2, unknown draft -> 1).
 *
 * Run on the Pig: node /tmp/h16/drive_h16.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PROJ = require('/home/nolan/worktrees/ping-harvest-12h/runtime/kernel/projections/social_draft_projection.js');

const CLI = '/home/nolan/worktrees/ping-harvest-12h/scripts/review-drafts.js';
const PG = 'postgres://postgres:h14scratch@localhost:5433/h16';
const ENV = Object.assign({}, process.env, { PING_APPROVAL_PG_URL: PG });

function makeEvent(eventType, eventId, payload) {
  return {
    event_id: eventId,
    event_type: eventType,
    source: 'h16-drive',
    namespace: 'tenant::social',
    timestamp: '2026-09-17T21:45:00.000Z',
    payload: payload || {},
    metadata: {},
  };
}

function runCli(args) {
  return new Promise((resolve) => {
    execFile(
      'node',
      [CLI].concat(args),
      { env: ENV, timeout: 30000, maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        resolve({ code: error ? error.code : 0, stdout: stdout, stderr: stderr });
      }
    );
  });
}

async function main() {
  const { Client } = require('pg');
  const db = new Client({ connectionString: PG });
  await db.connect();
  await db.query('CREATE DATABASE h16').catch(() => {});
  await db.end();

  const db2 = new Client({ connectionString: PG });
  await db2.connect();
  const ddl = fs.readFileSync(
    '/home/nolan/worktrees/ping-harvest-12h/database/social_drafts.sql',
    'utf8'
  );
  for (const stmt of ddl.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
    if (/^--/.test(stmt) && stmt.indexOf('CREATE') === -1) continue;
    await db2.query(stmt);
  }
  await db2.query('TRUNCATE social_drafts');
  console.log('schema applied to h16 and truncated');

  const tx = { query: (text, params) => db2.query(text, params) };
  const events = [
    makeEvent('CLAIM_CREATED', 'evt_h16_drive_001', {
      documentId: 'doc_drive_001',
      upstreamEventId: 'evt_upstream_drive_001',
    }),
    makeEvent('REPLAY_COMPLETED', 'evt_h16_drive_002', { documentId: 'doc_drive_002' }),
  ];
  const emitted = [];
  for (const event of events) {
    const res = await PROJ.socialDraftProjector(event, {}, { client: tx });
    assert.strictEqual(res.projected, true);
    assert.strictEqual(res.inserted, 5);
    emitted.push.apply(emitted, res.drafts);
  }
  console.log('seeded ' + emitted.length + ' drafts via the real projector');
  const oneId = emitted[0].draft_id;
  const fbCtaId = emitted.filter((d) => d.platform === 'facebook' && d.variant === 'cta')[0].draft_id;

  // -- list: all rows -------------------------------------------------------
  let r = await runCli(['list']);
  assert.strictEqual(r.code, 0, 'list exit code: ' + r.stderr);
  assert.ok(r.stdout.indexOf(oneId) !== -1, 'list must contain seeded id');
  assert.ok(r.stdout.indexOf('"claim on doc_drive_001"') !== -1, 'list must show derived subjects');
  assert.ok(r.stdout.indexOf('10 draft(s) shown.') !== -1, 'list count footer');
  console.log('list ok (10 rows, ids + subjects present)');

  // -- list: platform filter + limit ----------------------------------------
  r = await runCli(['list', '--platform', 'x', '--limit', '3']);
  assert.strictEqual(r.code, 0, r.stderr);
  assert.ok(r.stdout.indexOf('[x /') !== -1, 'x rows tagged');
  assert.ok(r.stdout.indexOf('[facebook /') === -1, 'no facebook rows when filtered to x');
  assert.ok(r.stdout.indexOf('3 draft(s) shown.') !== -1, 'limit honored');
  console.log('list --platform x --limit 3 ok');

  // -- list: variant filter ---------------------------------------------------
  r = await runCli(['list', '--platform', 'facebook', '--variant', 'cta']);
  assert.strictEqual(r.code, 0, r.stderr);
  assert.ok(r.stdout.indexOf('[facebook / cta]') !== -1);
  assert.ok(r.stdout.indexOf('2 draft(s) shown.') !== -1);
  console.log('list --variant cta ok');

  // -- list: event filter ------------------------------------------------------
  r = await runCli(['list', '--event', 'evt_h16_drive_002']);
  assert.strictEqual(r.code, 0, r.stderr);
  assert.ok(r.stdout.indexOf('5 draft(s) shown.') !== -1);
  assert.ok(r.stdout.indexOf('replay of doc_drive_002') !== -1);
  console.log('list --event ok');

  // -- show: full draft --------------------------------------------------------
  r = await runCli(['show', fbCtaId]);
  assert.strictEqual(r.code, 0, r.stderr);
  const expectedCopy = emitted.filter((d) => d.draft_id === fbCtaId)[0].copy;
  assert.ok(r.stdout.indexOf('draft_id:   ' + fbCtaId) !== -1, 'show: draft id');
  assert.ok(r.stdout.indexOf('platform:   facebook') !== -1, 'show: platform');
  assert.ok(r.stdout.indexOf('variant:    cta') !== -1, 'show: variant');
  assert.ok(r.stdout.indexOf('status:     DRAFT') !== -1, 'show: status');
  assert.ok(r.stdout.indexOf('subject:    "claim on doc_drive_001"') !== -1, 'show: subject');
  assert.ok(r.stdout.indexOf('evt_h16_drive_001') !== -1, 'show: source event');
  assert.ok(r.stdout.indexOf('evt_upstream_drive_001') !== -1, 'show: evidence ref');
  assert.ok(r.stdout.indexOf(expectedCopy.headline) !== -1, 'show: headline');
  assert.ok(r.stdout.indexOf(expectedCopy.cta) !== -1, 'show: cta');
  console.log('show <id> ok (id, platform/variant, subject, evidence refs, full copy)');

  // -- bad args: exit 2 ----------------------------------------------------------
  const badCases = [
    ['frobnicate'],
    ['list', '--platform'],
    ['list', '--bogus'],
    ['list', '--platform', 'tiktok'],
    ['list', '--limit', '0'],
    ['show'],
    ['show', 'socialdraft_' + '0'.repeat(16), 'extra'],
    ['show', 'not-a-draft-id'],
  ];
  for (const args of badCases) {
    r = await runCli(args);
    assert.strictEqual(r.code, 2, 'expected exit 2 for ' + JSON.stringify(args) + ' got ' + r.code);
  }
  console.log('usage-error cases all exit 2');

  // -- unknown draft (well-formed id): exit 1 ------------------------------------
  r = await runCli(['show', 'socialdraft_' + '0'.repeat(16)]);
  assert.strictEqual(r.code, 1, 'expected exit 1 for unknown draft');
  assert.ok(/no draft found/i.test(r.stderr), 'unknown draft prints not-found message');
  console.log('show <unknown id> exits 1 with not-found message');

  // -- read-only proof: data still intact ----------------------------------------
  const count = await db2.query('SELECT COUNT(*)::int AS n FROM social_drafts');
  assert.strictEqual(count.rows[0].n, 10, 'CLI must not have mutated anything');
  console.log('read-only verified: 10 rows still present');

  await db2.end();
  console.log('H16 DRIVE GREEN');
}

main().catch((e) => {
  console.error('DRIVE FAILED: ' + (e && e.message ? e.message : e));
  process.exit(1);
});
