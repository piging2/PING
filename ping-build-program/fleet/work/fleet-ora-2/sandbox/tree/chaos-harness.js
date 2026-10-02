// Sandbox event-ingress chaos harness — REAL CanonicalizationService from the
// live gateway image (read-only fetch), stub eventRuntime with idempotent
// logical_id semantics, adversarial ingress classes.
const { CanonicalizationService } = require('./app/ping-runtime/canonicalization/canonicalization_service.js');
const { verifyCanonicalObject } = require('./app/ping-runtime/canonicalization/canonical_object.js');
const crypto = require('crypto');

const log = [];
function record(cls, input, outcome, detail) {
  log.push({ class: cls, outcome, detail: String(detail).slice(0, 120), probe: JSON.stringify(input).slice(0, 90) });
}

// Stub UnifiedEventRuntime: idempotent on logical_id; collision -> typed conflict,
// original preserved. This emulates the documented runtime contract
// ("retries are idempotent (same logical event -> same event_id)").
const store = new Map(); // logical_id -> record
const appliedEnvelopes = [];
const runtime = {
  async emit(eventType, source, payload, options = {}) {
    const lid = options.logical_id || JSON.stringify(payload);
    const VOL = ['timestamp','created_at','updated_at','paid_at','accepted_at','completed_at','occurred_at','received_at','sent_at','started_at','ended_at','recorded_at','processed_at'];
    const stable = Object.assign({}, payload); for (const f of VOL) delete stable[f];
    const hash = crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex');
    if (store.has(lid)) {
      const rec = store.get(lid);
      if (rec.hash === hash) return { status: 'ok', eventId: rec.eventId, duplicate: true };
      const err = new Error(`CONFLICT: logical_id collision, original preserved (event ${rec.eventId})`);
      err.code = 'ID_COLLISION';
      throw err;
    }
    const eventId = 'evt-' + crypto.randomBytes(8).toString('hex');
    store.set(lid, { eventId, hash, eventType, source });
    return { status: 'ok', eventId };
  }
};

const svc = new CanonicalizationService({ eventRuntime: runtime, namespaces: { 'chaos-probe': 'tenant::chaos' } });

async function inject(cls, body) {
  try {
    const r = await svc.canonicalizeAndEmit(body);
    if (r.duplicate) { record(cls, body, 'DUPLICATE', 'idempotent re-emit, single application'); return; }
    if (!r.verified) { record(cls, body, 'UNVERIFIED_ENVELOPE', 'FAIL: envelope did not verify'); return; }
    appliedEnvelopes.push(r.envelope);
    record(cls, body, 'APPLIED', 'eventId=' + r.eventId);
  } catch (err) {
    record(cls, body, 'REJECTED_TYPED', (err.code ? err.code + ' ' : '') + err.message);
  }
}

function validEvent(over = {}) {
  return Object.assign({
    source: 'chaos-probe', eventType: 'observation.recorded',
    payload: { note: 'well-formed probe', n: 1 },
  }, over);
}

(async () => {
  // CLASS 1: duplicate — same logical event 3x (timestamps differ, stripped by design)
  const dup = validEvent({ payload: { note: 'dup probe', n: 7, received_at: 'T1' } });
  await inject('duplicate', dup);
  await inject('duplicate', Object.assign({}, dup, { payload: { note: 'dup probe', n: 7, received_at: 'T2' } }));
  await inject('duplicate', Object.assign({}, dup, { payload: { note: 'dup probe', n: 7, received_at: 'T3' } }));

  // CLASS 2: malformed — each must be a typed rejection, never a crash
  const malformed = [
    validEvent({ source: undefined }),
    validEvent({ source: 42 }),
    validEvent({ eventType: undefined }),
    validEvent({ eventType: 123 }),
    validEvent({ payload: undefined }),
    validEvent({ payload: null }),
    validEvent({ payload: 'not-an-object' }),
    validEvent({ payload: [1, 2, 3] }),
    validEvent({ namespace: 'bogus::ns' }),
    validEvent({ namespace: '../../etc' }),
  ];
  for (const m of malformed) await inject('malformed', m);

  // CLASS 3: oversized — 10 MB payload; observe (no size cap seen in the boundary code)
  const big = 'x'.repeat(10 * 1024 * 1024);
  const heapBefore = process.memoryUsage().heapUsed;
  await inject('oversized', validEvent({ payload: { blob: big } }));
  const heapAfter = process.memoryUsage().heapUsed;
  log.push({ class: 'oversized', outcome: 'HEAP_DELTA_MB', detail: ((heapAfter - heapBefore) / 1048576).toFixed(1) });

  // CLASS 4: collision — same explicit logicalId, different payload
  await inject('collision', validEvent({ logicalId: 'fixed-logical-1', payload: { v: 'original' } }));
  await inject('collision', validEvent({ logicalId: 'fixed-logical-1', payload: { v: 'ATTACKER' } }));

  // CLASS 5: reordered — evidence chain referencing a not-yet-seen event
  await inject('reordered', validEvent({ payload: { seq: 3 }, evidence: ['evt-future-9'] }));
  await inject('reordered', validEvent({ payload: { seq: 1 } }));
  await inject('reordered', validEvent({ payload: { seq: 2 } }));

  // VERDICT COMPUTATION
  const uncaught = 0; // any uncaught throw would have killed the process
  let unverified = 0, poisoned = 0;
  for (const e of appliedEnvelopes) { if (!verifyCanonicalObject(e)) unverified++; }
  // poison check: no applied envelope may contain a non-object payload or attacker collision payload
  for (const e of appliedEnvelopes) {
    const p = e.payload;
    if (!p || typeof p !== 'object' || (p.v === 'ATTACKER')) poisoned++;
  }
  const classes = {};
  for (const l of log) { classes[l.class + ':' + l.outcome] = (classes[l.class + ':' + l.outcome] || 0) + 1; }
  const result = {
    total: log.length, classes, unverifiedEnvelopes: unverified, poisonedApplied: poisoned,
    appliedCount: appliedEnvelopes.length, storeSize: store.size,
    verdict: (unverified === 0 && poisoned === 0) ? 'PASS' : 'FAIL',
  };
  console.log(JSON.stringify(result, null, 2));
  require('fs').writeFileSync(__dirname + '/chaos-log.json', JSON.stringify(log, null, 2));
})().catch(e => { console.error('HARNESS CRASH:', e); process.exit(2); });
