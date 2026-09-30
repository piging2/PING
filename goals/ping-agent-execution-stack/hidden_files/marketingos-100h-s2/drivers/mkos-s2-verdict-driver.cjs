'use strict';
/* MarketingOS 100h, Sprint 2, Block 15-30: claim-verdict observability fix test.
 *
 * Read-only against the live Pig journal (ping_runtime). Nothing is emitted,
 * inserted, updated, or deleted here. Oracle is not contacted.
 *
 * Runs the committed read-time projection
 * (hidden_files/marketingos-100h-s2/verdict-projection.sql) and proves:
 *   BEFORE: metadata->>'verdict' is NULL on every CLAIM_CREATED row
 *           (the recorded gap -- verdicts not queryable from metadata);
 *   AFTER:  the same rows project claim_verdict from payload->'claim'->>'verdict'
 *           for a sample of sprint-1 (93a79e48accd23e3) and sprint-2
 *           (8924ebeeb4094c37) claims, joined to knowledge_nodes by
 *           source_event_id = event_id.
 * DB credential read at runtime from the live Pig ping-gateway container env
 * (same-plane config, never printed, never logged).
 */
const { execSync } = require('child_process');
const fs = require('fs');

const SQL_PATH = process.argv[2];
if (!SQL_PATH) throw new Error('usage: node mkos-s2-verdict-driver.cjs <verdict-projection.sql>');
const PROJECTION_SQL = fs.readFileSync(SQL_PATH, 'utf8');

function dbPassword() {
  const NL = String.fromCharCode(10);
  const env = execSync(
    `docker inspect ping-gateway --format '{{range .Config.Env}}{{println .}}{{end}}'`,
    { encoding: 'utf8' }
  );
  const line = env.split(NL).find((l) => l.startsWith('POSTGRES_PASSWORD='));
  if (!line) throw new Error('POSTGRES_PASSWORD not found in ping-gateway container env');
  return line.slice('POSTGRES_PASSWORD='.length).trim();
}

async function main() {
  const { Pool } = require('/home/nolan/ping/gateway/node_modules/pg');
  const pool = new Pool({ host: '127.0.0.1', port: 5432, user: 'postgres', password: dbPassword(), database: 'ping_runtime' });

  // BEFORE: the gap as recorded in the baseline (read-only proof).
  const before = await pool.query(`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE metadata->>'verdict' IS NOT NULL)::int AS with_metadata_verdict,
           count(*) FILTER (WHERE payload->'claim'->>'verdict' IS NOT NULL)::int AS with_payload_verdict
    FROM ping_events WHERE event_type = 'CLAIM_CREATED'`);
  console.log('BEFORE=' + JSON.stringify(before.rows[0]));

  // AFTER: run the committed projection, filtered to the two sample missions.
  const wrap = (corr) => `
    SELECT * FROM (
      ${PROJECTION_SQL.replace(/;\s*$/, '')}
    ) AS proj WHERE correlation_id = '${corr}'`;
  for (const corr of ['93a79e48accd23e3', '8924ebeeb4094c37']) {
    const r = await pool.query(wrap(corr));
    console.log(`AFTER corr=${corr} rows=${r.rows.length}`);
    for (const row of r.rows) {
      console.log('  PROJ ' + JSON.stringify({
        subject: String(row.claim_subject || '').slice(0, 64),
        claim_verdict: row.claim_verdict,
        metadata_verdict: row.metadata_verdict,
        node_id: row.node_id,
        label_verdict: row.label_verdict,
      }));
    }
  }

  // Verdict agreement check on rows that have both a payload verdict and a label verdict.
  const agree = await pool.query(`
    SELECT count(*) FILTER (WHERE payload->'claim'->>'verdict' = (regexp_match(kn.label, '(^|[^\\w])(CONFIRMED|REFUTED|UNCLEAR)'))[2])::int AS agree,
           count(*) FILTER (WHERE payload->'claim'->>'verdict' IS DISTINCT FROM (regexp_match(kn.label, '(^|[^\\w])(CONFIRMED|REFUTED|UNCLEAR)'))[2])::int AS disagree,
           count(*)::int AS both_present
    FROM ping_events pe JOIN knowledge_nodes kn ON kn.source_event_id = pe.event_id
    WHERE pe.event_type = 'CLAIM_CREATED'
      AND pe.payload->'claim'->>'verdict' IS NOT NULL
      AND kn.label ~ '(^|[^\\w])(CONFIRMED|REFUTED|UNCLEAR)'`);
  console.log('AGREEMENT=' + JSON.stringify(agree.rows[0]));

  await pool.end();
}

main().then(
  () => { console.log('DRIVER_S2_VERDICT_DONE'); process.exit(0); },
  (err) => { console.error('DRIVER_S2_VERDICT_FAILED', err && err.message); process.exit(1); }
);
