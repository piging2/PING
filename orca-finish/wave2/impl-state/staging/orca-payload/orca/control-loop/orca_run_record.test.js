'use strict';
/**
 * Tests for orca_run_record.js.
 * Run: node orca_run_record.test.js
 *
 * Sections:
 *  1. Pure transition table (no I/O): legal edges return the target state;
 *     every illegal edge throws ErrIllegalTransition; the table is total
 *     (every state x event pair either returns a state or throws — never
 *     undefined, never silent).
 *  2. Run identity: deriveRunId is deterministic and distinct per run_seq.
 *  3. Durable behavior against a fake objective-runtime (in-memory).
 *  4. WIRING: the same durable behavior against the REAL branch
 *     objective-runtime.js (read-only require). Skipped with a clear message
 *     when the branch module is not present; on the Pig it must run.
 */
const assert = require('assert');
const os = require('os');
const path = require('path');

const rec = require('./orca_run_record');

let passed = 0, failed = 0, skipped = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  PASS ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + ': ' + (e && e.message)); }
}
function throwsIllegal(from, event) {
  assert.throws(() => rec.applyRunTransition(from, event), (e) =>
    e && e.name === 'ErrIllegalTransition', `expected ErrIllegalTransition for ${from}+${event}`);
}

// --- 1. transition table ----------------------------------------------------
test('legal run path NOT_STARTED -> STARTED -> SUCCEEDED', () => {
  assert.strictEqual(rec.applyRunTransition('NOT_STARTED', 'START'), 'STARTED');
  assert.strictEqual(rec.applyRunTransition('STARTED', 'SUCCEED'), 'SUCCEEDED');
});

test('suspend/resume cycle', () => {
  assert.strictEqual(rec.applyRunTransition('STARTED', 'SUSPEND'), 'SUSPENDED');
  assert.strictEqual(rec.applyRunTransition('SUSPENDED', 'RESUME'), 'STARTED');
});

test('FAILED can RETRY to NOT_STARTED or CANCEL', () => {
  assert.strictEqual(rec.applyRunTransition('FAILED', 'RETRY'), 'NOT_STARTED');
  assert.strictEqual(rec.applyRunTransition('FAILED', 'CANCEL'), 'CANCELLED');
});

test('OUTCOME_UNKNOWN can only CANCEL (never auto-retry)', () => {
  assert.strictEqual(rec.applyRunTransition('OUTCOME_UNKNOWN', 'CANCEL'), 'CANCELLED');
  throwsIllegal('OUTCOME_UNKNOWN', 'RETRY');
  throwsIllegal('OUTCOME_UNKNOWN', 'SUCCEED');
  throwsIllegal('OUTCOME_UNKNOWN', 'START');
});

test('SUCCEEDED and CANCELLED are fully terminal', () => {
  for (const ev of rec.RUN_EVENTS) {
    throwsIllegal('SUCCEEDED', ev);
    throwsIllegal('CANCELLED', ev);
  }
});

test('representative illegal edges throw', () => {
  throwsIllegal('NOT_STARTED', 'SUCCEED');   // cannot finish before starting
  throwsIllegal('NOT_STARTED', 'FAIL');
  throwsIllegal('NOT_STARTED', 'MARK_UNKNOWN');
  throwsIllegal('STARTED', 'START');         // no double start
  throwsIllegal('STARTED', 'RETRY');
  throwsIllegal('SUSPENDED', 'SUCCEED');     // must resume before settling
  throwsIllegal('SUSPENDED', 'FAIL');
  throwsIllegal('SUSPENDED', 'MARK_UNKNOWN');
  throwsIllegal('FAILED', 'SUCCEED');
});

test('table is total: every state x event pair returns or throws, never undefined', () => {
  for (const s of rec.RUN_STATES) {
    for (const ev of rec.RUN_EVENTS) {
      let out;
      try { out = rec.applyRunTransition(s, ev); }
      catch (e) {
        assert.strictEqual(e.name, 'ErrIllegalTransition');
        continue;
      }
      assert.ok(rec.RUN_STATES.includes(out), `transition ${s}+${ev} returned unknown state ${out}`);
    }
    // unknown event name also throws (not undefined)
    assert.throws(() => rec.applyRunTransition(s, 'BOGUS'), /ErrIllegalTransition/);
  }
  assert.throws(() => rec.applyRunTransition('BOGUS', 'START'), /ErrIllegalTransition/);
});

test('isTerminalRunState / legalRunEvents', () => {
  assert.ok(rec.isTerminalRunState('SUCCEEDED'));
  assert.ok(rec.isTerminalRunState('OUTCOME_UNKNOWN'));
  assert.ok(rec.isTerminalRunState('CANCELLED'));
  assert.ok(!rec.isTerminalRunState('FAILED'));      // retryable-terminal
  assert.ok(!rec.isTerminalRunState('STARTED'));
  assert.deepStrictEqual(rec.legalRunEvents('NOT_STARTED'), ['START', 'CANCEL']);
});

// --- 2. run identity ---------------------------------------------------------
test('deriveRunId is deterministic and distinct per run_seq', () => {
  const a1 = rec.deriveRunId('obj1', 1);
  const a2 = rec.deriveRunId('obj1', 1);
  const b = rec.deriveRunId('obj1', 2);
  const c = rec.deriveRunId('obj2', 1);
  assert.strictEqual(a1, a2);
  assert.notStrictEqual(a1, b);
  assert.notStrictEqual(a1, c);
  assert.match(a1, /^[0-9a-f]{64}$/);
  assert.throws(() => rec.deriveRunId('', 1), /objectiveId required/);
  assert.throws(() => rec.deriveRunId('obj1', 0), /positive integer/);
});

// --- 3. durable behavior against a fake rt ------------------------------------
// The fake mirrors the branch's objective-runtime contract faithfully:
// atomic temp+rename writes to a real temp dir, readJson returns null on
// ENOENT. This keeps the fake honest: listRuns hits the real filesystem,
// exactly like the branch's listWorkOrders.
function fakeRt() {
  const fs = require('fs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orca-fake-rt-'));
  return {
    root,
    objectiveDir: (dataRoot, objectiveId) => path.join(dataRoot, 'objectives', objectiveId),
    readJson: (p) => {
      try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
      catch (e) { if (e && e.code === 'ENOENT') return null; throw e; }
    },
    atomicWrite: (p, content) => {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
      try {
        fs.writeFileSync(tmp, content, 'utf8');
        fs.renameSync(tmp, p);
      } catch (err) {
        try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
        throw err;
      }
    },
  };
}
function seedObjective(rt, dataRoot, objectiveId) {
  const p = path.join(rt.objectiveDir(dataRoot, objectiveId), 'objective.json');
  rt.atomicWrite(p, JSON.stringify({ objective_id: objectiveId, state: 'ACTIVE' }));
}

function runDurableSuite(label, rt, dataRoot, objOverride) {
  const obj = objOverride || ('objective-' + label);
  if (!objOverride) seedObjective(rt, dataRoot, obj);

  test(`[${label}] registerRun creates a NOT_STARTED run with fencing epoch 0`, () => {
    const run = rec.registerRun(rt, dataRoot, obj, { tenantId: 'tenant::acme', principal: 'tester' });
    assert.strictEqual(run.status, 'NOT_STARTED');
    assert.strictEqual(run.run_seq, 1);
    assert.strictEqual(run.tenant_id, 'tenant::acme');
    assert.strictEqual(run.lease.fencing_epoch, 0);
    assert.strictEqual(run.checkpoint_version, 0);
    assert.strictEqual(run.run_id, rec.deriveRunId(obj, 1));
  });

  test(`[${label}] second registration consumes the durable sequence`, () => {
    const r2 = rec.registerRun(rt, dataRoot, obj, {});
    assert.strictEqual(r2.run_seq, 2);
    assert.notStrictEqual(r2.run_id, rec.deriveRunId(obj, 1));
  });

  const runId = rec.deriveRunId(obj, 1);

  test(`[${label}] loadRun/listRuns reconstruct the run from durable state alone`, () => {
    const loaded = rec.loadRun(rt, dataRoot, obj, runId);
    assert.strictEqual(loaded.run_id, runId);
    assert.strictEqual(loaded.status, 'NOT_STARTED');
    const runs = rec.listRuns(rt, dataRoot, obj);
    assert.strictEqual(runs.length, 2);
    assert.strictEqual(runs[0].run_seq, 1);
  });

  test(`[${label}] transitionRun advances through the table and rejects illegal moves`, () => {
    let r = rec.transitionRun(rt, dataRoot, obj, runId, 'START');
    assert.strictEqual(r.status, 'STARTED');
    assert.throws(() => rec.transitionRun(rt, dataRoot, obj, runId, 'START'), /ErrIllegalTransition/);
    r = rec.transitionRun(rt, dataRoot, obj, runId, 'MARK_UNKNOWN');
    assert.strictEqual(r.status, 'OUTCOME_UNKNOWN');
    assert.throws(() => rec.transitionRun(rt, dataRoot, obj, runId, 'RETRY'), /ErrIllegalTransition/);
    r = rec.transitionRun(rt, dataRoot, obj, runId, 'CANCEL');
    assert.strictEqual(r.status, 'CANCELLED');
  });

  const runId2 = rec.deriveRunId(obj, 2);

  test(`[${label}] claimRun CAS: correct epoch claims, stale epoch refused`, () => {
    rec.transitionRun(rt, dataRoot, obj, runId2, 'START');
    let res = rec.claimRun(rt, dataRoot, obj, runId2,
      { holderId: 'worker-A', ttlMs: 60000, expectedEpoch: 0 });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.fencing_epoch, 1);
    // stale holder retries with the old epoch: refused, must re-read
    res = rec.claimRun(rt, dataRoot, obj, runId2,
      { holderId: 'worker-A', ttlMs: 60000, expectedEpoch: 0 });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.reason, 'stale-epoch');
    assert.strictEqual(res.fencing_epoch, 1);
    // fresh epoch claims (e.g. after lease expiry): succeeds, epoch moves again
    res = rec.claimRun(rt, dataRoot, obj, runId2,
      { holderId: 'worker-B', ttlMs: 60000, expectedEpoch: 1 });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.fencing_epoch, 2);
    const loaded = rec.loadRun(rt, dataRoot, obj, runId2);
    assert.strictEqual(loaded.lease.holder_id, 'worker-B');
  });

  test(`[${label}] checkpointRun bumps the version monotonically`, () => {
    let r = rec.checkpointRun(rt, dataRoot, obj, runId2, 'sha256:abc123');
    assert.strictEqual(r.checkpoint_version, 1);
    assert.strictEqual(r.state_snapshot_ref, 'sha256:abc123');
    r = rec.checkpointRun(rt, dataRoot, obj, runId2, 'sha256:def456');
    assert.strictEqual(r.checkpoint_version, 2);
    assert.throws(() => rec.checkpointRun(rt, dataRoot, obj, runId2, ''), /stateSnapshotRef required/);
  });

  test(`[${label}] unknown run / unknown objective fail loudly`, () => {
    assert.throws(() => rec.transitionRun(rt, dataRoot, obj, 'nope', 'START'), /unknown run/);
    assert.throws(() => rec.registerRun(rt, dataRoot, 'nope', {}), /unknown objective/);
    assert.strictEqual(rec.loadRun(rt, dataRoot, obj, 'nope'), null);
  });

  return obj;
}

const frt = fakeRt();
runDurableSuite('fake', frt, frt.root);

// --- 4. WIRING: real branch objective-runtime.js --------------------------------
const BRANCH_RT_CANDIDATES = [
  process.env.ORCA_OBJECTIVE_RUNTIME,
  '/home/nolan/worktrees/orca-autonomy/orca/control-loop/objective-runtime.js',
].filter(Boolean);

let realRt = null, realRtPath = null;
for (const p of BRANCH_RT_CANDIDATES) {
  try { realRt = require(p); realRtPath = p; break; }
  catch (_) { /* try next */ }
}

if (!realRt) {
  skipped++;
  console.log('  SKIP wiring: branch objective-runtime.js not found at '
    + BRANCH_RT_CANDIDATES.join(' / '));
} else {
  const wiredRoot = require('fs').mkdtempSync(path.join(os.tmpdir(), 'orca-run-record-wire-'));
  const rt = {
    atomicWrite: realRt.atomicWrite,
    readJson: realRt.readJson,
    objectiveDir: realRt.objectiveDir,
  };
  // seed via the branch's own registerObjective (proves interop, not just shape)
  const wiredObj = realRt.registerObjective(
    wiredRoot, 'orca', 'wiring-test objective ' + Date.now(), {});
  const wiredSuiteObj = runDurableSuite(
    'wired(' + realRtPath + ')', rt, wiredRoot, wiredObj.objective_id);
  test('[wired] run record coexists with branch work-order records', () => {
    const wo = realRt.authorizeWorkOrder(wiredRoot, wiredSuiteObj, 'task-1', { text: 'x' });
    assert.ok(wo.work_order_id);
    const runs = rec.listRuns(rt, wiredRoot, wiredSuiteObj);
    assert.ok(runs.length >= 2, 'run records present alongside work orders');
    const wos = realRt.listWorkOrders(wiredRoot, wiredSuiteObj);
    assert.strictEqual(wos.length, 1);
  });
}

console.log('');
console.log(`${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed === 0 ? 0 : 1);
