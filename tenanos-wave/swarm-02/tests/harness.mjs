/**
 * SWARM-02 kill-battery harness — TenantOS mission-engine tests.
 *
 * Standalone companion to ~/workspace/autonomous-missions/orca-tests/ (files
 * 01-07, grounded against the 2026-09-19 snapshot). These files (08-14) are
 * grounded against LIVE /home/nolan/ping code, re-verified 2026-09-23, and
 * cover the kill battery the earlier drafts did not:
 *   08 duplicate dispatch · 09 timeout-before-effect · 10 timeout-after-effect
 *   (UNKNOWN_EXECUTION) · 11 retry-safe vs retry-unsafe · 12 partial DAG
 *   completion · 13 restart (kill coordinator) · 14 reconciliation.
 *
 * RUN ON THE PIG (modules live at /home/nolan/ping; scratch PG is the
 * ping-test-pg container, trust auth via docker exec):
 *
 *   docker exec ping-test-pg psql -U postgres -c "CREATE DATABASE swarm02_test;"
 *   mkdir -p /home/nolan/swarm02-tests && cd /home/nolan/swarm02-tests
 *   npm install pg   # once
 *   # copy *.test.mjs + harness.mjs here, then:
 *   PIG_REPO=/home/nolan/ping PIG_PGPORT=55433 PIG_PGDATABASE=swarm02_test \
 *     node --test --test-concurrency=1 *.test.mjs
 *
 * SAFETY: refuses to run when `ping_events` already exists (live-DB
 * fingerprint) unless CRX_TEST_ALLOW_LIVE=1. All tables are created with
 * IF NOT EXISTS by the modules under test; each file cleans up its rows.
 *
 * Env:
 *   PIG_REPO        CRX checkout (default /home/nolan/ping)
 *   PIG_PGHOST      default 127.0.0.1
 *   PIG_PGPORT      default 55433 (ping-test-pg published port on the Pig)
 *   PIG_PGDATABASE  default swarm02_test   (scratch DB — create it first)
 *   PIG_PGUSER      default postgres
 */

import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const PIG_REPO = process.env.PIG_REPO || '/home/nolan/ping';

function load(rel, exportName) {
  const modPath = path.join(PIG_REPO, rel);
  let mod;
  try {
    mod = require(modPath);
  } catch (err) {
    throw new Error(`Cannot load ${modPath}: ${err.message}`);
  }
  if (exportName && !mod[exportName]) {
    throw new Error(`No export ${exportName} at ${modPath}`);
  }
  return exportName ? mod[exportName] : mod;
}

export const MissionRuntime = load('ping-runtime/orchestration/mission_runtime.js', 'MissionRuntime');
export const MissionScheduler = load('ping-runtime/orchestration/mission_scheduler.js', 'MissionScheduler');
export const WorkerRuntime = load('ping-runtime/workers/worker_runtime.js', 'WorkerRuntime');
export const UnifiedEventRuntime = load('ping-runtime/events/unified_event_runtime.js', 'UnifiedEventRuntime');
export const EventToMissionBridge = load(
  'ping-runtime/orchestration/event_to_mission_bridge.js', 'EventToMissionBridge'
);
export const DeadLetterAuthority = load('gateway/dead_letter_authority.js', 'DeadLetterAuthority');

export function loadPg() {
  try {
    return require('pg');
  } catch {
    throw new Error('The `pg` package is not installed. Run `npm install pg` in the test dir.');
  }
}

export function makePool() {
  const { Pool } = loadPg();
  return new Pool({
    host: process.env.PIG_PGHOST || '127.0.0.1',
    port: parseInt(process.env.PIG_PGPORT || '55433', 10),
    database: process.env.PIG_PGDATABASE || 'swarm02_test',
    user: process.env.PIG_PGUSER || 'postgres',
    password: process.env.PIG_PGPASSWORD || '',
  });
}

/** Refuse to run against a live database unless explicitly overridden. */
export async function assertScratchDb(pool) {
  const r = await pool.query(`SELECT to_regclass('public.ping_events') AS reg`);
  if (r.rows[0] && r.rows[0].reg && process.env.CRX_TEST_ALLOW_LIVE !== '1') {
    throw new Error(
      'Live database detected (ping_events exists). Use a scratch DB ' +
      '(PIG_PGDATABASE=swarm02_test) or set CRX_TEST_ALLOW_LIVE=1.'
    );
  }
}

/**
 * Drop the engine tables the modules under test create (CREATE TABLE IF NOT
 * EXISTS in their initialize()). Call in each file's `after` hook so the
 * next file in the battery sees a clean scratch DB and the
 * assertScratchDb fingerprint does not trip on tables left by a sibling
 * file. Safe only because the guard above already proved this is a scratch DB.
 */
export async function dropEngineTables(pool) {
  await pool.query(`DROP TABLE IF EXISTS ping_missions, ping_events, repository_dead_letters`);
}

let seq = 0;
export function uniqueType(prefix) {
  seq += 1;
  return `swarm02_${prefix}_${Date.now().toString(36)}_${seq}`;
}

/** Build a live MissionRuntime on the scratch pool. */
export async function makeMissionRuntime(pool, eventRuntime = null) {
  const rt = new MissionRuntime({ pool, eventRuntime });
  await rt.initialize();
  return rt;
}

/** Build a live UnifiedEventRuntime on the scratch pool. */
export async function makeEventRuntime(pool) {
  const ev = new UnifiedEventRuntime({ pool });
  await ev.initialize();
  return ev;
}

/** Test-only clock fast-forward: expire a mission's lease immediately. */
export async function expireLeaseNow(pool, missionId) {
  await pool.query(
    `UPDATE ping_missions SET lease_until = NOW() - INTERVAL '1 second' WHERE mission_id = $1`,
    [missionId]
  );
}

/** Test-only clock fast-forward: make a retry due immediately. */
export async function retryDueNow(pool, missionId) {
  await pool.query(
    `UPDATE ping_missions SET retry_at = NOW() - INTERVAL '1 second' WHERE mission_id = $1`,
    [missionId]
  );
}

export async function getMission(pool, missionId) {
  const r = await pool.query(`SELECT * FROM ping_missions WHERE mission_id = $1`, [missionId]);
  return r.rows[0] || null;
}

export async function cleanupMissions(pool, missionIds) {
  if (!missionIds.length) return;
  await pool.query(`DELETE FROM ping_missions WHERE mission_id = ANY($1)`, [missionIds]);
}

export async function cleanupEvents(pool, correlationId) {
  await pool.query(`DELETE FROM ping_events WHERE metadata->>'correlation_id' = $1`, [correlationId]);
}

/** Stub worker with scripted behavior for deterministic tests. */
export function stubWorker(name, behavior) {
  return {
    name,
    calls: 0,
    effects: 0,
    async handle(event) {
      this.calls += 1;
      return behavior(this, event);
    },
  };
}
