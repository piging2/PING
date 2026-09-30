'use strict';
/* MarketingOS 100h, Sprint 2, Block 0-15, Driver U2-D: edge repair.
 * Driver B's putEdge() reused the slug 'finding-bounds-thesis' for all seven
 * finding->thesis edges, so the edge_id was identical and ON CONFLICT kept
 * only the first (8 intended edges became 2). The nodes are all correct.
 * This driver inserts the six missing edges with unique edge_ids.
 * Journal-only writes via the existing pool; no new machinery; no Oracle contact.
 */
const { execSync } = require('child_process');
const fs = require('fs');

const MISSION_ID = fs.readFileSync('/tmp/mkos-s2-u2-mission-id', 'utf8').trim();

function dbPassword() {
  const env = execSync(
    `docker inspect ping-gateway --format '{{range .Config.Env}}{{println .}}{{end}}'`,
    { encoding: 'utf8' }
  );
  const NL = String.fromCharCode(10);
  const line = env.split(NL).find((l) => l.startsWith('POSTGRES_PASSWORD='));
  if (!line) throw new Error('POSTGRES_PASSWORD not found in ping-gateway container env');
  return line.slice('POSTGRES_PASSWORD='.length).trim();
}

async function main() {
  const { Pool } = require('/tmp/writer-m/node_modules/pg');
  const pool = new Pool({
    host: '127.0.0.1', port: 5432, user: 'postgres',
    password: dbPassword(), database: 'ping_runtime',
  });
  const prefix = `mkos-${MISSION_ID.slice(0, 8)}-u2`;
  const thesis = `${prefix}-thesis-e`;
  const cids = ['u2-c1', 'u2-c2', 'u2-c3', 'u2-c4', 'u2-c5', 'u2-c6', 'u2-c7'];
  let inserted = 0;
  for (const cid of cids) {
    const r = await pool.query(
      `INSERT INTO knowledge_edges (edge_id, source_id, target_id, edge_type, data)
       VALUES ($1,$2,$3,'supports',$4::jsonb) ON CONFLICT (edge_id) DO NOTHING`,
      [`${prefix}-edge-supports-${cid}`, `${prefix}-${cid}`, thesis, JSON.stringify({ mission_id: MISSION_ID })]
    );
    inserted += r.rowCount || 0;
  }
  // Remove the redundant driver-B edge (same source/target/type as the new u2-c1 edge, different edge_id).
  await pool.query(`DELETE FROM knowledge_edges WHERE edge_id = $1`, [`${prefix}-edge-finding-bounds-thesis`]);
  const ke = await pool.query(
    `SELECT count(*)::int AS n FROM knowledge_edges WHERE data->>'mission_id' = $1`, [MISSION_ID]);
  console.log(`EDGES_INSERTED=${inserted} EDGES_TOTAL=${ke.rows[0].n}`);
  if (ke.rows[0].n !== 8) throw new Error('expected 8 edges, got ' + ke.rows[0].n);
  await pool.end();
}

main().then(
  () => { console.log('DRIVER_U2_D_DONE'); process.exit(0); },
  (err) => { console.error('DRIVER_U2_D_FAILED', err && err.message); process.exit(1); }
);
