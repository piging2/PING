/**
 * P0-A persisted-replay + governed-write proof (runs ON the Pig).
 * Scratch postgres only (p0a-scratch-pg). No production touch.
 * Usage: node /tmp/p0a-harness2/p0a-v2-identity/test/persisted-replay.pig.cjs
 */
const { execFileSync } = require('node:child_process');
const { canonicalizeV2 } = require('../v2/canonical-v2.cjs');
const idm = require('../v2/event-identity.cjs');
const cp = require('../v2/conflict-protocol.cjs');

const psql = (sql) =>
  execFileSync('docker', ['exec', '-i', 'p0a-scratch-pg', 'psql', '-U', 'postgres', '-t', '-A', '-c', sql], { encoding: 'utf8' }).trim();
const psqlQ = (s) => s.replace(/'/g, "''");
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' -- ' + detail : ''));
};

(async () => {
  // 0. table at V1 width, like production today
  psql(`DROP TABLE IF EXISTS ping_events_replay`);
  psql(`CREATE TABLE ping_events_replay (
    event_id VARCHAR(64) PRIMARY KEY,
    event_type TEXT, source TEXT,
    payload JSONB, metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now())`);

  // 1. BEFORE: V1 rows minted with the frozen V1 contract
  const v1rows = [
    ['REVIEW_RECEIVED', 'email-connector', {}, { a: 1 }],
    ['CUSTOMER_CREATED', 'customer-authority', {}, { nested: { x: [1, 2], y: 'z' } }],
    ['MISSION_STEP', 'worker', { logical_id: 'L1' }, { t: 1700000000 }],
  ];
  for (const [t, s, o, p] of v1rows) {
    const id = idm.mintV1(t, s, { ...o, payload: p });
    psql(`INSERT INTO ping_events_replay (event_id, event_type, source, payload, metadata)
          VALUES ('${id}','${t}','${s}','${psqlQ(JSON.stringify(p))}','{}') ON CONFLICT DO NOTHING`);
  }
  check('R1: 3 V1 rows persisted', psql(`SELECT count(*) FROM ping_events_replay`) === '3');

  // 2. persisted replay: re-read, recompute, contract dispatch
  let replayOk = true;
  for (const [t, s, o, p] of v1rows) {
    const want = idm.mintV1(t, s, { ...o, payload: p });
    const got = psql(`SELECT payload FROM ping_events_replay WHERE event_id='${want}'`);
    if (JSON.stringify(JSON.parse(got)) !== JSON.stringify(p)) replayOk = false;
    const contract = idm.contractOf({ event_id: want, metadata: {} });
    if (contract !== idm.CONTRACT_V1) replayOk = false;
  }
  check('R2: persisted V1 rows re-verify under the frozen V1 contract', replayOk);

  // 3. DDL widening is value-preserving (WS2 §4.3 migration DDL)
  psql(`ALTER TABLE ping_events_replay ALTER COLUMN event_id TYPE VARCHAR(128)`);
  check('R3: VARCHAR(64)->VARCHAR(128) widening preserves all rows',
    psql(`SELECT count(*) FROM ping_events_replay`) === '3' &&
    psql(`SELECT event_id FROM ping_events_replay ORDER BY event_id LIMIT 1`).length === 64);

  // 4. V1 duplicate -> IDEMPOTENT_DUPLICATE through the conflict protocol
  const dupId = idm.mintV1('REVIEW_RECEIVED', 'email-connector', { payload: { a: 1 } });
  const rcTag = psql(`INSERT INTO ping_events_replay (event_id, event_type, source, payload, metadata)
    VALUES ('${dupId}','REVIEW_RECEIVED','email-connector','${psqlQ(JSON.stringify({ a: 1 }))}','{}')
    ON CONFLICT (event_id) DO NOTHING RETURNING event_id`);
  const readStored = async (eventId) => {
    const row = psql(`SELECT payload, metadata FROM ping_events_replay WHERE event_id='${eventId}'`);
    // -t -A with two cols -> "payload|metadata"
    const [payload, metadata] = row.split('|');
    return { payload: JSON.parse(payload), metadata: JSON.parse(metadata || '{}') };
  };
  const r4 = await cp.resolveConflict({ readStored, eventId: dupId, candidatePayload: { a: 1 }, line: 'integrated' });
  check('R4: V1 exact duplicate -> IDEMPOTENT_DUPLICATE', rcTag === 'INSERT 0 0' && r4.verdict === 'IDEMPOTENT_DUPLICATE');

  // 5. NEW GOVERNED WRITE: V2 rows with era marker
  const v2writes = [
    { m: idm.mintV2('REVIEW_RECEIVED', 'email-connector', { payload: { v: [1, 2] } }), payload: { v: [1, 2] } },
    { m: idm.mintV2('REVIEW_RECEIVED', 'email-connector', { payload: { v: [12] } }), payload: { v: [12] } },
  ];
  const v2a = v2writes[0].m, v2b = v2writes[1].m;
  check('R5a: V2 mints [1,2] and [12] to DISTINCT ids', v2a.eventId !== v2b.eventId);
  for (const { m, payload } of v2writes) {
    psql(`INSERT INTO ping_events_replay (event_id, event_type, source, payload, metadata)
      VALUES ('${m.eventId}','REVIEW_RECEIVED','email-connector',
              '${psqlQ(JSON.stringify(payload))}',
              '{"identity_era":"v2"}') ON CONFLICT DO NOTHING`);
  }
  const c5 = idm.contractOf({ event_id: v2a.eventId, metadata: { identity_era: 'v2' } });
  check('R5b: V2 rows persist and dispatch to the V2 contract',
    psql(`SELECT count(*) FROM ping_events_replay WHERE event_id LIKE 'ev2:%'`) === '2' && c5 === idm.CONTRACT_V2);

  // 6. forced same-ID / different-payload on a V2 id -> CANONICAL_ID_COLLISION
  const r6 = await cp.resolveConflict({
    readStored, eventId: v2a.eventId, candidatePayload: { v: [12] },
  });
  const leak = JSON.stringify(r6.evidence || {});
  check('R6: forged V2 collision -> CANONICAL_ID_COLLISION, fail closed, no payload leak',
    r6.verdict === 'CANONICAL_ID_COLLISION' && !leak.includes('[1, 2]') && !leak.includes('[12]'));

  // 7. V2 duplicate payload, different key order -> IDEMPOTENT_DUPLICATE
  const r7 = await cp.resolveConflict({
    readStored, eventId: v2a.eventId, candidatePayload: { v: [1, 2] },
  });
  check('R7: V2 same-semantics re-emit -> IDEMPOTENT_DUPLICATE', r7.verdict === 'IDEMPOTENT_DUPLICATE');

  const fails = results.filter((r) => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} persisted-replay checks passed`);
  if (fails.length) process.exit(1);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
