'use strict';
/* Phase 17 bounded boot probe (2026-09-19).
 * Runs INSIDE the built gateway image (proves the image, not the worktree).
 * Scratch database only (p17_boot on the w1a scratch container). Never
 * touches Oracle or any production store.
 * Env: PGHOST (default w1a-scratch-pg), PGPORT (default 5432),
 *      PGDATABASE (default p17_boot), PGUSER (default postgres),
 *      PGPASSWORD (required).
 */
const path = require('path');
const fs = require('fs');

const R = '/app';

let pg;
try { pg = require('pg'); } catch (e) { pg = require('/app/node_modules/pg'); }
const { Pool } = pg;

const { UnifiedEventRuntime } = require(path.join(R, 'ping-runtime/events/unified_event_runtime.js'));
const { CanonicalEventEnvelope } = require(path.join(R, 'gateway/canonical_event_envelope.js'));
const { ProducerEventPort } = require(path.join(R, 'ping-runtime/events/producer_event_port.js'));
const { EventGovernance } = require(path.join(R, 'ping-runtime/events/event_governance.js'));
const { EventValidator } = require(path.join(R, 'ping-runtime/events/event_validator.js'));
const { KernelReplayExecutionProvider } = require(path.join(R, 'gateway/kernel_replay_execution_provider.js'));

const PGHOST = process.env.PGHOST || 'w1a-scratch-pg';
const PGPORT = parseInt(process.env.PGPORT || '5432', 10);
const PGDATABASE = process.env.PGDATABASE || 'p17_boot';
const PGUSER = process.env.PGUSER || 'postgres';
const PGPASSWORD = process.env.PGPASSWORD;
if (!PGPASSWORD) { console.error('FATAL: PGPASSWORD is required'); process.exit(2); }

let pass = 0, fail = 0;
function check(cond, name, detail) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}

async function main() {
  const pool = new Pool({
    host: PGHOST, port: PGPORT, database: PGDATABASE,
    user: PGUSER, password: PGPASSWORD, connectionTimeoutMillis: 8000,
  });
  pool.on('error', () => {});
  console.log('probe: connected, image labels follow');

  // Spine: real validator + real governance (closed gate is live).
  const legacyIngressCapability = Object.freeze({ surface: 'canonical_events', version: '1.0.0' });
  const eventValidator = new EventValidator(R); eventValidator.load();
  const eventGovernance = new EventGovernance(R); eventGovernance.load();
  const uer = new UnifiedEventRuntime({ pool, eventValidator, eventGovernance, legacyIngressCapability });
  await uer.initialize();

  // Base schema + convergence migration (idempotent; boot may have applied it).
  const baseSchemaSql = fs.readFileSync(path.join(R, 'database/canonical_events.sql'), 'utf8');
  const migrationSql = fs.readFileSync(path.join(R, 'database/migrations/2026-09-19_event_authority_convergence.sql'), 'utf8');
  await pool.query(baseSchemaSql);
  await pool.query(migrationSql);
  check(true, 'SETUP base schema + convergence migration applied (idempotent)');

  const envelope = new CanonicalEventEnvelope(pool, { repoRoot: R });
  await envelope.initialize();

  const port = new ProducerEventPort({
    envelope,
    governance: eventGovernance,
    getEventRuntime: () => uer,
  });

  // ---- A. producer seam -> UER convergence path ----
  const r1 = await port.emitProducerEvent({
    tenantId: 'acme', eventType: 'project.created', source: 'p17-probe',
    actor: 'probe', payload: { name: 'P17 boot probe one' },
  });
  check(r1.status === 'accepted' && r1.seam === 'direct',
    'A1 producer seam takes the direct UER path', JSON.stringify(r1.status) + '/' + r1.seam);
  check(/^event_[0-9a-f]{16}$/.test(r1.event_id),
    'A2 one canonical identity (event_<16hex>)', String(r1.event_id));
  check(r1.derivation && r1.derivation.ok === true,
    'A3 certified representation derived after the one commit', JSON.stringify(r1.derivation));

  const r2 = await port.emitProducerEvent({
    tenantId: 'acme', eventType: 'project.created', source: 'p17-probe',
    actor: 'probe', payload: { name: 'P17 boot probe two' },
  });
  check(r2.status === 'accepted', 'A4 second event accepted', JSON.stringify(r2.status));
  check(r1.event_id !== r2.event_id, 'A5 distinct identities per event', r1.event_id + ' vs ' + r2.event_id);

  // Scope row assertions to this probe's own events: the booted gateway emits
  // its own background events into ping_events (mission/observation traffic),
  // so unfiltered counts would include boot traffic, not just probe events.
  const probeIds = [r1.event_id, r2.event_id];
  const pingRows = (await pool.query(
    'SELECT event_id, sequence, event_type FROM ping_events WHERE event_id = ANY($1) ORDER BY sequence',
    [probeIds])).rows;
  check(pingRows.length === 2, 'A6 exactly two probe rows in ping_events', String(pingRows.length));

  // ---- cross-reference resolvable both directions ----
  const ce = (await pool.query(
    'SELECT event_id, envelope_id, source_event_id FROM canonical_events')).rows;
  const ce1 = ce.find((x) => x.source_event_id === r1.event_id);
  check(!!ce1, 'A7 canonical_events.source_event_id -> ping_events.event_id (forward)', String(r1.event_id));
  const back = (await pool.query(
    'SELECT event_id FROM ping_events WHERE event_id=$1', [ce1 ? ce1.source_event_id : null])).rows;
  check(back.length === 1 && back[0].event_id === r1.event_id,
    'A8 ping_events.event_id resolves back (reverse)', String(r1.event_id));
  check(ce1 && ce1.event_id !== ce1.envelope_id,
    'A9 logical event_id distinct from representation envelope_id',
    ce1 ? ce1.event_id + ' / ' + ce1.envelope_id : 'no row');

  // ---- B. replay authority: sequence allocation + read-only cursor ----
  check(pingRows[0].sequence < pingRows[1].sequence,
    'B1 DB-allocated sequences strictly increasing',
    JSON.stringify(pingRows.map((r) => r.sequence)));
  const before = (await pool.query(
    "SELECT count(*)::int AS c, coalesce(sum(sequence),0)::text AS s FROM ping_events")).rows[0];
  const cursorAll = (await pool.query(
    'SELECT event_id, sequence FROM ping_events WHERE sequence > $1 AND event_id = ANY($2) ORDER BY sequence ASC',
    [0, probeIds])).rows;
  const cursorResume = (await pool.query(
    'SELECT event_id, sequence FROM ping_events WHERE sequence > $1 AND event_id = ANY($2) ORDER BY sequence ASC',
    [pingRows[0].sequence, probeIds])).rows;
  const after = (await pool.query(
    "SELECT count(*)::int AS c, coalesce(sum(sequence),0)::text AS s FROM ping_events")).rows[0];
  check(cursorAll.length === 2 && cursorAll[0].sequence < cursorAll[1].sequence,
    'B2 replay cursor delivers in sequence order', String(cursorAll.length));
  check(cursorResume.length === 1 && cursorResume[0].event_id === r2.event_id,
    'B3 cursor resumes after a position', JSON.stringify(cursorResume.length));
  check(before.c === after.c && before.s === after.s,
    'B4 replay reads are side-effect free (read-only)',
    JSON.stringify({ before, after }));

  // ---- C. witness coherence: attestation binds versions, verifies journal ----
  const replayEvents = pingRows.map((r) => ({
    event_id: r.event_id, event_type: r.event_type, sequence: r.sequence,
  }));
  const provider = new KernelReplayExecutionProvider();
  const w1 = await provider.executeReplay({
    transcript_id: 'p17-boot-probe', state: { replay_events: replayEvents },
  });
  const w2 = await provider.executeReplay({
    transcript_id: 'p17-boot-probe', state: { replay_events: replayEvents },
  });
  check(w1.completeness === 'COMPLETE', 'C1 replay completeness is COMPLETE', String(w1.completeness));
  const full = w1.witness_root_full || {};
  check(full.witness_algorithm === 'merkle_sha256_v1' && full.witness_version === 'v1',
    'C2 attestation binds algorithm and witness versions', JSON.stringify(full));
  check(full.leaf_count === 14 && full.tree_height === 4,
    'C3 12-leaf interim invariant holds (14-leaf tree)',
    'leaf_count=' + full.leaf_count + ' tree_height=' + full.tree_height);
  check(typeof w1.witness_root === 'string' && w1.witness_root === w2.witness_root,
    'C4 witness root deterministic across runs', String(w1.witness_root));

  console.log('\nPROBE RESULT: ' + pass + ' pass, ' + fail + ' fail');
  await pool.end();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('PROBE FATAL', e && e.message); process.exit(2); });
