/**
 * Shared harness for the orca-tests drafts.
 *
 * GROUNDING: SNAPSHOT-VERIFIED (with caveats).
 *   /home/nolan/ping is NOT mounted in this sandbox, so imports below were
 *   grounded against workspace snapshots instead:
 *     - baseline API: convergence-zoom-2026-09-19/lane-d-execution/pig-src/
 *       ping-runtime/orchestration/mission_runtime.js
 *       (matches the 2026-09-22 crx-audit's file:line evidence for the live repo)
 *     - variant API (CE-001/CE-002): ce002/src/mission_runtime.js (experiment,
 *       NOT confirmed live)
 *   Canonical module path (three independent sources agree):
 *     ping-runtime/orchestration/mission_runtime.js  ->  { MissionRuntime }
 *   Re-verify imports against repo HEAD before promoting any draft to CI.
 *
 * SAFETY: these drafts NEVER touch a live database. They refuse to run when
 * the `ping_events` table exists (live-DB fingerprint) unless the operator
 * explicitly sets CRX_TEST_ALLOW_LIVE=1. Use a scratch database.
 *
 * Env:
 *   CRX_REPO            path to the CRX runtime repo (default /home/nolan/ping)
 *   CRX_TEST_PGHOST     default localhost
 *   CRX_TEST_PGPORT     default 5432
 *   CRX_TEST_PGDATABASE default ping_test   (scratch DB — create it first)
 *   CRX_TEST_PGUSER     default postgres
 *   CRX_TEST_PGPASSWORD default "" (empty)
 *   CRX_TEST_ALLOW_LIVE set to "1" to override the live-DB refusal
 */

import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

const CRX_REPO = process.env.CRX_REPO || '/home/nolan/ping';

export function loadMissionRuntime() {
  const modPath = path.join(CRX_REPO, 'ping-runtime/orchestration/mission_runtime.js');
  let mod;
  try {
    mod = require(modPath);
  } catch (err) {
    throw new Error(
      `Cannot load MissionRuntime from ${modPath}: ${err.message}. ` +
      `Set CRX_REPO to the CRX runtime checkout.`
    );
  }
  if (!mod.MissionRuntime) throw new Error(`No MissionRuntime export at ${modPath}`);
  return mod.MissionRuntime;
}

export function loadPg() {
  try {
    return require('pg');
  } catch {
    throw new Error('The `pg` package is not installed. Run `npm install pg` where these drafts live.');
  }
}

export function makePool() {
  const { Pool } = loadPg();
  return new Pool({
    host: process.env.CRX_TEST_PGHOST || 'localhost',
    port: parseInt(process.env.CRX_TEST_PGPORT || '5432', 10),
    database: process.env.CRX_TEST_PGDATABASE || 'ping_test',
    user: process.env.CRX_TEST_PGUSER || 'postgres',
    password: process.env.CRX_TEST_PGPASSWORD || '',
  });
}

/** Refuse to run against a live database (ping_events present) unless overridden. */
export async function assertScratchDb(pool) {
  const r = await pool.query(`SELECT to_regclass('public.ping_events') AS reg`);
  if (r.rows[0] && r.rows[0].reg && process.env.CRX_TEST_ALLOW_LIVE !== '1') {
    throw new Error(
      'Live database detected (ping_events exists). These drafts must run against a SCRATCH ' +
      'database. Set CRX_TEST_PGDATABASE to an empty scratch DB, or set CRX_TEST_ALLOW_LIVE=1 ' +
      'to override (not recommended).'
    );
  }
}

/** Recording stub for the event runtime: captures emits, always accepts. */
export function makeEventRecorder() {
  return {
    emitted: [],
    async emit(eventType, source, payload, opts) {
      this.emitted.push({ eventType, source, payload, opts: opts || null });
      return { status: 'ok' };
    },
    ofType(t) {
      return this.emitted.filter((e) => e.eventType === t);
    },
  };
}

let seq = 0;
/** Unique mission type per test to isolate the idempotent create(). */
export function uniqueType(prefix) {
  seq += 1;
  return `test_${prefix}_${Date.now().toString(36)}_${seq}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function makeRuntime(pool, events) {
  const MissionRuntime = loadMissionRuntime();
  const rt = new MissionRuntime({ pool, eventRuntime: events || null });
  await rt.initialize();
  return rt;
}

/** Normalize complete()'s return across baseline (rowCount) and CE-002 variant ({completed}). */
export function completedOk(res) {
  if (res && typeof res === 'object') return res.completed === true;
  return res === 1;
}

/** True when the loaded MissionRuntime carries the CE-001/CE-002 variant API. */
export function isFencingVariant(MissionRuntime) {
  return typeof MissionRuntime.prototype.getFencingToken === 'function';
}

/** Test-only clock fast-forward: expire a mission's lease immediately. */
export async function expireLeaseNow(pool, missionId) {
  await pool.query(
    `UPDATE ping_missions SET lease_until = NOW() - INTERVAL '1 second' WHERE mission_id = $1`,
    [missionId]
  );
}

export async function getStatus(pool, missionId) {
  const r = await pool.query(`SELECT status, assigned_to, attempts FROM ping_missions WHERE mission_id = $1`, [missionId]);
  return r.rows[0] || null;
}

export async function cleanupMissions(pool, missionIds) {
  if (!missionIds.length) return;
  await pool.query(`DELETE FROM ping_missions WHERE mission_id = ANY($1)`, [missionIds]);
}
