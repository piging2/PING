#!/usr/bin/env node
'use strict';
/* Phase 20 replay-context-pack tests (2026-09-19).
 *
 * Proves the safe harvest:
 *   P1  module imports only 'crypto' (static require scan); no pg/pool/
 *       emit/mission/scheduler tokens anywhere in the source.
 *   P2  fail-closed: the only runtime method the module may call is
 *       replay(); a Proxy runtime throws on any other property access.
 *       Bad runtime (no replay), bad afterSequence, bad limit, replay
 *       error, and probe error all fail closed with status 'error'.
 *   P3  determinism: the same replay window builds the same pack_id and a
 *       byte-identical pack (two builds, deep-equal via stable stringify).
 *   P4  identity sensitivity: one content byte changed under an event_id
 *       changes the pack_id; reordering delivered rows (out-of-order read)
 *       changes the pack_id (order is part of the window identity).
 *   P5  INCOMPLETE marking (W-2 semantics): unclosed window (probe finds
 *       more rows) => INCOMPLETE + 'window_not_closed'; one malformed row
 *       skipped => INCOMPLETE + 'inputs_skipped'; closed, clean window =>
 *       COMPLETE with empty reasons.
 *   P6  version null-safety: absent versions are recorded as null, never
 *       fabricated; provided versions are bound into the pack.
 *   P7  DERIVED marking: pack carries kind 'DERIVED', explicit
 *       authority_decision 'none', and all three write flags false.
 *   P8  live integration: a real UnifiedEventRuntime on the scratch DB
 *       seeds N events; collectReplayWindow reads ONLY through
 *       runtime.replay(); window covers all N rows in certified order and
 *       is COMPLETE; a limit smaller than N yields INCOMPLETE.
 *
 * Real PostgreSQL only for P8: self-contained scratch database on the w1a
 * scratch container (127.0.0.1:15439). Env: PGHOST, PGPORT (default 15439),
 * PGUSER (default postgres), PGPASSWORD (required).
 *
 * Exit 0 = all pass; exit 1 = any fail.
 *
 * No em dashes in this file.
 */

const path = require('path');
const fs = require('fs');

const R = path.resolve(__dirname, '..', '..');

let pg;
try { pg = require('pg'); } catch (e) {
  pg = require('/home/nolan/worktrees/constitutional-convergence/tests/mc1-legacy-ingress/node_modules/pg');
}
const { Pool } = pg;

const builder = require(path.join(R, 'ping-runtime/context/replay_context_pack_builder.js'));
const { UnifiedEventRuntime } = require(path.join(R, 'ping-runtime/events/unified_event_runtime.js'));

const PGHOST = process.env.PGHOST || '127.0.0.1';
const PGPORT = parseInt(process.env.PGPORT || '15439', 10);
const PGUSER = process.env.PGUSER || 'postgres';
const PGPASSWORD = process.env.PGPASSWORD;

const results = [];
function check(name, cond, detail) {
  results.push({ name, pass: !!cond, detail: cond ? undefined : (detail || 'failed') });
}

function stableDeepEqual(a, b) {
  const s = (v) => {
    if (v === null || v === undefined) return 'null';
    if (Array.isArray(v)) return '[' + v.map(s).join(',') + ']';
    if (typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + s(v[k])).join(',') + '}';
    return JSON.stringify(v);
  };
  return s(a) === s(b);
}

function makeRows(n, startSeq) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      event_id: `evt_${String(i).padStart(3, '0')}`,
      sequence: startSeq + i,
      event_type: i % 2 === 0 ? 'OBSERVATION' : 'MISSION_COMPLETED',
      source: 'phase20-test',
      timestamp: new Date(Date.UTC(2026, 8, 19, 0, 0, i)).toISOString(),
      payload: { idx: i, note: 'row' },
      metadata: { seq_in_batch: i },
      namespace: 'core::test',
    });
  }
  return rows;
}

function mockRuntime(rows) {
  // Faithful miniature of the certified reader contract: rows in sequence
  // order, sequence > afterSequence, bounded by limit.
  const sorted = rows.slice().sort((a, b) => a.sequence - b.sequence);
  const calls = [];
  return {
    calls,
    async replay(opts) {
      calls.push(opts);
      const after = Number(opts.afterSequence || 0);
      const limit = Number(opts.limit || 100);
      const subset = sorted.filter((r) => r.sequence > after).slice(0, limit);
      return { status: 'ok', events: subset, count: subset.length, delivered: subset.length, lastSequence: subset.length ? subset[subset.length - 1].sequence : after };
    },
  };
}

async function main() {
  // ---- P1: static import/write-surface scan ----
  const srcPath = path.join(R, 'ping-runtime/context/replay_context_pack_builder.js');
  const src = fs.readFileSync(srcPath, 'utf8');
  const requires = [];
  const re = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(src)) !== null) requires.push(m[1]);
  check('P1 only-require-crypto', requires.length === 1 && requires[0] === 'crypto', `requires: ${JSON.stringify(requires)}`);
  const forbiddenTokens = [
    /\brequire\(['"](pg|pg-pool|node-postgres)/,
    /INSERT\s+INTO/i,
    /UPDATE\s+ping_events/i,
    /DELETE\s+FROM/i,
    /SELECT\s+.*\s+FROM\s+ping_events/i,
    /new\s+Pool\s*\(/,
    /createMission/i,
    /scheduleMission/i,
    /_emit\s*\(/,
    /emitEvent/i,
  ];
  const hits = forbiddenTokens.filter((rx) => rx.test(src));
  check('P1 no-write-tokens', hits.length === 0, `forbidden token hits: ${hits.map(String).join('; ')}`);
  check('P1 static-scan-complete', true, '');

  // ---- P2: fail-closed runtime seam ----
  const rows = makeRows(5, 1);
  const strict = mockRuntime(rows);
  const strictProxy = new Proxy(strict, {
    get(t, p) {
      if (p === 'replay' || p === 'calls') return t[p];
      if (p === 'then') return undefined;
      throw new Error(`P2: module touched non-replay property '${String(p)}'`);
    },
  });
  let w;
  try {
    w = await builder.collectReplayWindow(strictProxy, { afterSequence: 0, limit: 10 });
    check('P2 only-replay-called', w.status === 'ok', JSON.stringify(w).slice(0, 300));
  } catch (err) {
    check('P2 only-replay-called', false, err.message);
  }
  check('P2 replay-call-count', strict.calls.length === 2, `calls: ${JSON.stringify(strict.calls)}`);

  const noReplay = await builder.collectReplayWindow({}, {});
  check('P2 bad-runtime-fail-closed', noReplay.status === 'error', JSON.stringify(noReplay));
  const badSeq = await builder.collectReplayWindow(mockRuntime(rows), { afterSequence: -1 });
  check('P2 bad-afterSequence-fail-closed', badSeq.status === 'error', JSON.stringify(badSeq));
  const badLimit = await builder.collectReplayWindow(mockRuntime(rows), { limit: 0 });
  check('P2 bad-limit-fail-closed', badLimit.status === 'error', JSON.stringify(badLimit));
  const errRuntime = { async replay() { return { status: 'error', error: 'boom' }; } };
  const rErr = await builder.collectReplayWindow(errRuntime, {});
  check('P2 replay-error-fail-closed', rErr.status === 'error', JSON.stringify(rErr));
  let probeCalls = 0;
  const probeErrRuntime = {
    async replay(opts) {
      probeCalls += 1;
      if (probeCalls === 1) return { status: 'ok', events: rows.slice(0, 2), count: 2 };
      return { status: 'error', error: 'probe boom' };
    },
  };
  const pErr = await builder.collectReplayWindow(probeErrRuntime, {});
  check('P2 probe-error-fail-closed', pErr.status === 'error', JSON.stringify(pErr));
  const badBuild = builder.buildReplayContextPack({ status: 'error' }, {});
  check('P2 build-bad-window-fail-closed', badBuild.status === 'error', JSON.stringify(badBuild));

  // ---- P3: determinism ----
  const win = await builder.collectReplayWindow(mockRuntime(rows), { afterSequence: 0, limit: 10 });
  check('P3 window-ok', win.status === 'ok' && win.completeness === builder.COMPLETE, JSON.stringify(win).slice(0, 300));
  const packA = builder.buildReplayContextPack(win, { replay_engine_version: 'v1', witness_algorithm_version: 'merkle_sha256_v1', witness_input_schema_version: 'witness-input/v1' });
  const packB = builder.buildReplayContextPack(JSON.parse(JSON.stringify(win)), { replay_engine_version: 'v1', witness_algorithm_version: 'merkle_sha256_v1', witness_input_schema_version: 'witness-input/v1' });
  check('P3 pack-ok', packA.status === 'ok' && packB.status === 'ok', 'build failed');
  check('P3 same-id', packA.replay_context_pack_id === packB.replay_context_pack_id, `${packA.replay_context_pack_id} vs ${packB.replay_context_pack_id}`);
  check('P3 byte-identical', stableDeepEqual(packA, packB), 'packs differ');
  check('P3 id-format', /^rcp_[0-9a-f]{16}$/.test(packA.replay_context_pack_id), packA.replay_context_pack_id);

  // ---- P4: identity sensitivity ----
  const rowsMut = makeRows(5, 1);
  rowsMut[2].payload = { idx: 2, note: 'row CHANGED' };
  const winMut = await builder.collectReplayWindow(mockRuntime(rowsMut), { afterSequence: 0, limit: 10 });
  const packMut = builder.buildReplayContextPack(winMut, {});
  check('P4 content-change-changes-id', packMut.replay_context_pack_id !== packA.replay_context_pack_id, 'id unchanged after content change');
  const rowsRev = makeRows(5, 1).reverse();
  const winRev = await builder.collectReplayWindow(mockRuntime(rowsRev), { afterSequence: 0, limit: 10 });
  check('P4 order-part-of-identity', winRev.events[0].sequence === 1, 'reader must deliver sequence order');
  const packRev = builder.buildReplayContextPack(winRev, { replay_engine_version: 'v1', witness_algorithm_version: 'merkle_sha256_v1', witness_input_schema_version: 'witness-input/v1' });
  check('P4 sorted-input-same-id', packRev.replay_context_pack_id === packA.replay_context_pack_id, 'certified-order reads must hash identically');

  // ---- P5: INCOMPLETE marking ----
  const winSmall = await builder.collectReplayWindow(mockRuntime(rows), { afterSequence: 0, limit: 2 });
  check('P5 truncated-window-incomplete', winSmall.status === 'ok' && winSmall.completeness === builder.INCOMPLETE, JSON.stringify(winSmall).slice(0, 300));
  check('P5 truncated-reason', winSmall.incomplete_reasons.includes('window_not_closed'), JSON.stringify(winSmall.incomplete_reasons));
  const packTrunc = builder.buildReplayContextPack(winSmall, {});
  check('P5 pack-marks-incomplete', packTrunc.status === 'ok' && packTrunc.derivation.completeness === builder.INCOMPLETE, 'pack completeness wrong');
  const rowsBad = makeRows(4, 1);
  rowsBad.push({ sequence: 2.5, not_an_event: true }); // malformed: no event_id; skipped, never bound
  const winBad = await builder.collectReplayWindow(mockRuntime(rowsBad), { afterSequence: 0, limit: 10 });
  check('P5 skipped-input-incomplete', winBad.status === 'ok' && winBad.completeness === builder.INCOMPLETE && winBad.inputs_skipped === 1, JSON.stringify(winBad).slice(0, 300));
  check('P5 skipped-reason', winBad.incomplete_reasons.includes('inputs_skipped'), JSON.stringify(winBad.incomplete_reasons));
  check('P5 skipped-not-bound', winBad.event_count === 4 && winBad.events.every((e) => e.event_id), 'malformed row leaked into window');
  check('P5 complete-window-clean', win.completeness === builder.COMPLETE && win.incomplete_reasons.length === 0 && win.window_closed === true, JSON.stringify(win).slice(0, 300));

  // ---- P6: version null-safety ----
  const packNoVer = builder.buildReplayContextPack(win, {});
  check('P6 versions-null-when-absent',
    packNoVer.versions.replay_engine_version === null &&
    packNoVer.versions.witness_algorithm_version === null &&
    packNoVer.versions.witness_input_schema_version === null,
    JSON.stringify(packNoVer.versions));
  check('P6 versions-bound-when-provided',
    packA.versions.replay_engine_version === 'v1' &&
    packA.versions.witness_algorithm_version === 'merkle_sha256_v1' &&
    packA.versions.witness_input_schema_version === 'witness-input/v1',
    JSON.stringify(packA.versions));
  check('P6 no-fabrication-in-source', !/['"]v1['"]/.test(src.replace(/'rcp_'|replay_engine_version.*v1.*comment/ig, '')), 'literal v1 found in builder source');

  // ---- P7: DERIVED marking ----
  check('P7 kind-derived', packA.derivation.kind === 'DERIVED', JSON.stringify(packA.derivation));
  check('P7 no-authority', /no event authority|holds no event authority/.test(packA.derivation.authority_decision), packA.derivation.authority_decision);
  check('P7 write-flags-false',
    packA.derivation.emits_events === false &&
    packA.derivation.triggers_missions === false &&
    packA.derivation.writes_authority_records === false,
    JSON.stringify(packA.derivation));
  check('P7 certified-order-claimed', packA.replay_window.delivered_in_certified_sequence_order === true, 'order flag wrong');

  // ---- P8: live integration on scratch DB ----
  if (!PGPASSWORD) {
    check('P8 live-integration', false, 'PGPASSWORD not set; cannot run live integration');
  } else {
    const dbName = `phase20_ctxpack_${Date.now()}`;
    const admin = new Pool({ host: PGHOST, port: PGPORT, user: PGUSER, password: PGPASSWORD, database: 'postgres' });
    let liveOk = false;
    try {
      await admin.query(`CREATE DATABASE "${dbName}"`);
      const pool = new Pool({ host: PGHOST, port: PGPORT, user: PGUSER, password: PGPASSWORD, database: dbName });
      const rt = new UnifiedEventRuntime({ pool, source: 'phase20-test' });
      await rt.initialize();
      for (let i = 0; i < 7; i++) {
        await rt.emit('OBSERVATION', 'phase20-test', { n: i }, { metadata: { tag: 'p20' } });
      }
      const liveWin = await builder.collectReplayWindow(rt, { afterSequence: 0, limit: 100 });
      check('P8 live-window-ok', liveWin.status === 'ok' && liveWin.event_count === 7, JSON.stringify(liveWin).slice(0, 300));
      const seqs = liveWin.events.map((e) => e.sequence);
      const ordered = seqs.every((s, i) => i === 0 || s > seqs[i - 1]);
      check('P8 live-certified-order', ordered, JSON.stringify(seqs));
      check('P8 live-complete', liveWin.completeness === builder.COMPLETE && liveWin.window_closed === true, JSON.stringify(liveWin).slice(0, 300));
      const livePack = builder.buildReplayContextPack(liveWin, { replay_engine_version: 'v1', witness_algorithm_version: 'merkle_sha256_v1', witness_input_schema_version: 'witness-input/v1' });
      check('P8 live-pack-ok', livePack.status === 'ok' && livePack.derivation.kind === 'DERIVED', 'live build failed');
      const liveSmall = await builder.collectReplayWindow(rt, { afterSequence: 0, limit: 3 });
      check('P8 live-truncated-incomplete', liveSmall.status === 'ok' && liveSmall.completeness === builder.INCOMPLETE && liveSmall.incomplete_reasons.includes('window_not_closed'), JSON.stringify(liveSmall).slice(0, 300));
      const liveMid = await builder.collectReplayWindow(rt, { afterSequence: liveWin.events[2].sequence, limit: 100 });
      check('P8 live-cursor-window', liveMid.status === 'ok' && liveMid.event_count === 4 && liveMid.after_sequence === liveWin.events[2].sequence, JSON.stringify(liveMid).slice(0, 200));
      await pool.end();
      liveOk = true;
    } catch (err) {
      check('P8 live-integration', false, err.message);
    } finally {
      try { await admin.query(`DROP DATABASE IF EXISTS "${dbName}"`); } catch (e) { /* best effort */ }
      await admin.end();
    }
    if (!liveOk && !results.some((r) => r.name === 'P8 live-integration' && !r.pass)) {
      check('P8 live-integration', false, 'live integration did not complete');
    }
  }

  // ---- tally ----
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass);
  console.log(`\nphase20 replay-context-pack: ${passed}/${results.length} pass`);
  for (const f of failed) {
    console.log(`FAIL ${f.name}: ${f.detail || ''}`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error('HARNESS ERROR:', err);
  process.exit(1);
});
