/**
 * Lane B live projection run (Oracle, inside ping-gateway container context).
 * Proven additive projection-rebuild pattern: reads ONLY the canonical
 * ping_events journal; destroys and rebuilds ONLY the disposable projection
 * tables ping_objects / ping_relationships / ping_transitions.
 * ping_events is never written.
 *
 * Step 0 (reversible, projection-table only): evolve the
 * ping_relationships predicate CHECK to the canonical vocabulary
 * (social 5 + knowledge 7). The existing constraint name + definition are
 * printed first so the change is exactly reversible.
 */
'use strict';
const { Pool } = require('/app/gateway/node_modules/pg');
const fs = require('fs');
const crypto = require('crypto');
const { PingProjector } = require('/tmp/laneb-dist/ping-projector.js');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

const NEW_PREDICATES = ['follows', 'likes', 'replies_to', 'approves', 'denies',
  'has_website', 'located_at', 'offers', 'employs', 'member_of',
  'published', 'external_identity'];

async function projectionDigest() {
  const [o, r, t] = await Promise.all([
    pool.query('SELECT object_id, schema, controller, created_at, content, refs, visibility, status, metadata FROM ping_objects ORDER BY object_id'),
    pool.query('SELECT relationship_id, subject, predicate, object, created_at, status, metadata FROM ping_relationships ORDER BY relationship_id'),
    pool.query('SELECT transition_id, object_id, operation, actor_id, sequence, previous_transition, payload_hash, proof, metadata FROM ping_transitions ORDER BY object_id, sequence'),
  ]);
  return crypto.createHash('sha256').update(JSON.stringify([o.rows, r.rows, t.rows]), 'utf8').digest('hex');
}

(async () => {
  // Step 0: record existing predicate CHECK, then evolve it (reversible).
  const cur = await pool.query(
    `SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
     WHERE conrelid = 'ping_relationships'::regclass AND contype = 'c' AND conname LIKE '%predicate%'`
  );
  console.log('EXISTING_PREDICATE_CHECKS:' + JSON.stringify(cur.rows));
  if (cur.rows.length === 1) {
    const oldName = cur.rows[0].conname;
    await pool.query(`ALTER TABLE ping_relationships DROP CONSTRAINT "${oldName}"`);
    const list = NEW_PREDICATES.map((p) => `'${p}'`).join(', ');
    await pool.query(`ALTER TABLE ping_relationships ADD CHECK (predicate IN (${list}))`);
    console.log('CHECK_EVOLVED: dropped ' + oldName + ', added 12-predicate CHECK');
  } else {
    console.log('CHECK_EVOLVED: skipped (unexpected existing check count ' + cur.rows.length + ')');
  }

  // Step 1: governed rebuild, twice; digest determinism.
  const schemaSql = fs.readFileSync('/tmp/laneb-dist/ping_objects.sql', 'utf8');
  const projector = new PingProjector({ db: pool });
  await projector.initialize(schemaSql);

  const c1 = await projector.rebuildAll();
  const d1 = await projectionDigest();
  const c2 = await projector.rebuildAll();
  const d2 = await projectionDigest();

  const kc = await pool.query(
    `SELECT COUNT(*) AS n FROM ping_objects WHERE schema LIKE 'ping.knowledge.%'`
  );
  const kr = await pool.query(
    `SELECT predicate, COUNT(*) AS n FROM ping_relationships
     WHERE predicate IN ('has_website','located_at','offers','employs','member_of','published','external_identity')
     GROUP BY predicate ORDER BY predicate`
  );

  console.log('REBUILD1:' + JSON.stringify(c1));
  console.log('REBUILD2:' + JSON.stringify(c2));
  console.log('DIGEST1:' + d1);
  console.log('DIGEST2:' + d2);
  console.log('DIGEST_DETERMINISTIC:' + (d1 === d2));
  console.log('KNOWLEDGE_OBJECTS:' + kc.rows[0].n);
  console.log('KNOWLEDGE_RELS:' + JSON.stringify(kr.rows));
  await pool.end();
})().catch((e) => { console.error('FATAL:' + (e && e.message)); process.exit(1); });
