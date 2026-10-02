#!/usr/bin/env node
/**
 * resolve-hold-cli.js - operator invocation path for HOLD resolution.
 *
 * E3 liveness repair (Fix 2c), 2026-09-27: PROVEN_NOT_OCCURRED and
 * MANUAL_RESOLUTION previously had zero callers ("operator path is future
 * work"). This CLI is the concrete invocation path, documented in
 * HOLD_OPERATOR_RUNBOOK.md (same directory).
 *
 * A HOLD means an attempt's outcome is UNKNOWN (the effect may or may not
 * have happened). resolveHold is the ONLY way a mission leaves HOLD, and it
 * is fail-closed: resolving a mission that is not held is a no-op, and an
 * unknown resolution string throws.
 *
 * Usage:
 *   node resolve-hold-cli.js list [--limit N] [--json]
 *   node resolve-hold-cli.js resolve --mission <mission_id>
 *        --resolution PROVEN_OCCURRED|PROVEN_NOT_OCCURRED|MANUAL_RESOLUTION
 *        [--result-json '{"k":"v"}'] [--json]
 *   node resolve-hold-cli.js help
 *
 * Connection (same shape as pg.Pool):
 *   DATABASE_URL, or PGHOST / PGPORT / PGDATABASE / PGUSER / PGPASSWORD
 *
 * Requires the `pg` package resolvable from this directory (lazy require,
 * same pattern as gateway/postgres_adapter.js). No other dependencies.
 *
 * Exit codes: 0 = done; 2 = resolve no-op (mission not held) or usage
 * error; 1 = operational failure.
 */

const path = require('path');
const { MissionRuntime } = require(path.join(__dirname, 'mission_runtime.js'));

const RESOLUTIONS = ['PROVEN_OCCURRED', 'PROVEN_NOT_OCCURRED', 'MANUAL_RESOLUTION'];

function usage(exitCode) {
  const name = path.basename(__filename);
  console.log(`operator HOLD resolution CLI (E3 liveness)

list    ${name} list [--limit N] [--json]
        show held missions, oldest hold first

resolve ${name} resolve --mission <mission_id>
        --resolution PROVEN_OCCURRED|PROVEN_NOT_OCCURRED|MANUAL_RESOLUTION
        [--result-json '{"k":"v"}'] [--json]
        PROVEN_OCCURRED      effect did occur: adopt result, mission -> completed
        PROVEN_NOT_OCCURRED  effect provably did not occur: mission -> created
                             for exactly one new attempt (attempt clocks reset,
                             retries NOT reset)
        MANUAL_RESOLUTION    operator-determined terminal state: mission ->
                             completed, recorded in result, never re-dispatched

help    ${name} help

connection: DATABASE_URL or PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD
exit codes: 0 done, 2 no-op/usage, 1 failure`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const out = { positional: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') return { help: true };
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { out.flags[key] = next; i++; }
      else out.flags[key] = true;
    } else {
      out.positional.push(a);
    }
  }
  return out;
}

function loadPg() {
  try {
    return require('pg');
  } catch (e) {
    console.error('resolve-hold-cli: the `pg` package is not resolvable from this directory.');
    console.error('Install it where this CLI runs (npm install pg) or run from a tree that has it.');
    process.exit(1);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.positional.length === 0) usage(0);
  const [command] = args.positional;
  const asJson = !!args.flags.json;
  if (command === 'help') usage(0);

  const { Pool } = loadPg();
  const poolConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST,
        port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : undefined,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
      };
  const pool = new Pool(poolConfig);
  const R = new MissionRuntime({ pool });

  try {
    if (command === 'list') {
      const limit = args.flags.limit ? parseInt(args.flags.limit, 10) : 100;
      if (!(limit > 0)) { console.error('list: --limit must be a positive integer'); process.exit(2); }
      const rows = await R.findHeld(limit);
      if (asJson) {
        console.log(JSON.stringify(rows, null, 2));
      } else if (rows.length === 0) {
        console.log('No held missions.');
      } else {
        for (const r of rows) {
          console.log(`${r.mission_id}  status=${r.status}  held_since=${r.hold_at}  retries=${r.retries}  reason=${r.hold_reason || '-'}`);
        }
        console.log(`\n${rows.length} held mission(s).`);
      }
      return 0;
    }

    if (command === 'resolve') {
      const missionId = args.flags.mission;
      const resolution = args.flags.resolution;
      if (!missionId || !resolution) {
        console.error('resolve: --mission <id> and --resolution <R> are required');
        usage(2);
      }
      if (!RESOLUTIONS.includes(resolution)) {
        console.error(`resolve: unknown resolution '${resolution}' (expected one of ${RESOLUTIONS.join(', ')})`);
        process.exit(2);
      }
      let result = {};
      if (args.flags['result-json']) {
        try {
          result = JSON.parse(args.flags['result-json']);
        } catch (e) {
          console.error(`resolve: --result-json is not valid JSON: ${e.message}`);
          process.exit(2);
        }
        if (!result || typeof result !== 'object' || Array.isArray(result)) {
          console.error('resolve: --result-json must be a JSON object');
          process.exit(2);
        }
      }
      // Fail closed at the CLI layer too: confirm the mission is actually
      // held before resolving, so a typo cannot silently no-op.
      const row = await R.getMission(missionId);
      if (!row) {
        console.error(`resolve: mission '${missionId}' not found`);
        process.exit(2);
      }
      if (!row.hold_at) {
        console.error(`resolve: mission '${missionId}' is not held (status=${row.status}) - no-op, nothing resolved`);
        process.exit(2);
      }
      const n = await R.resolveHold(missionId, resolution, result);
      if (n !== 1) {
        console.error(`resolve: resolveHold affected ${n} row(s) - no-op`);
        process.exit(2);
      }
      const after = await R.getMission(missionId);
      const summary = {
        mission_id: missionId,
        resolution,
        status: after.status,
        hold_at: after.hold_at,
      };
      if (asJson) console.log(JSON.stringify(summary, null, 2));
      else console.log(`Resolved ${missionId} as ${resolution}: status=${after.status}, hold cleared.`);
      return 0;
    }

    console.error(`unknown command '${command}'`);
    usage(2);
  } finally {
    await pool.end().catch(() => {});
  }
}

main()
  .then((code) => process.exit(code || 0))
  .catch((err) => { console.error(`resolve-hold-cli: ${err.message}`); process.exit(1); });
