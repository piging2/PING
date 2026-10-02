'use strict';
/* ORCA-A executable probes (scratch only). Isolation: every probe uses a
 * fresh temp dir under os.tmpdir(); nothing touches production data roots. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const rt = require('/home/hatch/workspace/orca-finish/program/orca-a/src/objective-runtime.js');
const rec = require('/home/hatch/workspace/orca-finish/program/orca-a/src/orca_run_record.js');
const rs = require('/home/hatch/workspace/orca-finish/program/orca-a/src/orca_ready_set.js');

let pass = 0, fail = 0;
function ok(name, cond, detail = '') {
  if (cond) { pass++; console.log(`PASS ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}
function freshRoot() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'orca-a-probe-'));
  return d;
}

// ---------------------------------------------------------------- H1: identity determinism
{
  const a = rt.deriveObjectiveId({ namespace: 'orca', objectiveText: 'test intent', constraints: {} });
  const b = rt.deriveObjectiveId({ namespace: 'orca', objectiveText: 'test intent', constraints: {} });
  const c = rt.deriveObjectiveId({ namespace: 'orca', objectiveText: 'different intent', constraints: {} });
  ok('H1a objective identity deterministic', a === b, a.slice(0, 12));
  ok('H1b objective identity distinct for distinct intent', a !== c);
  ok('H1c objective identity is logical (no wall clock/pid)', a.length === 64);

  const w1 = rt.deriveWorkOrderId(a, 'objective-1');
  const w2 = rt.deriveWorkOrderId(a, 'objective-1');
  const w3 = rt.deriveWorkOrderId(a, 'objective-2');
  ok('H1d work-order identity stable per (objective, task_key)', w1 === w2, w1.slice(0, 12));
  ok('H1e work-order identity distinct per task_key', w1 !== w3);

  const at1 = rt.deriveAttemptId(w1, 1);
  const at2 = rt.deriveAttemptId(w1, 2);
  ok('H1f attempt identity per (work_order, n)', at1 !== at2 && at1.startsWith(w1));

  const r1 = rec.deriveRunId(a, 1);
  const r2 = rec.deriveRunId(a, 1);
  const r3 = rec.deriveRunId(a, 2);
  ok('H1g run identity deterministic per (objective, run_seq)', r1 === r2 && r1 !== r3, r1.slice(0, 12));

  // PING mission identity formula (copied verbatim from mission_runtime.js:79-90 logic)
  const pingMissionId = (missionType, payload) => {
    const key = payload.event_id ? `${missionType}:${payload.event_id}` : `${missionType}:${JSON.stringify(payload)}`;
    return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
  };
  const m1 = pingMissionId('LEAD_FOLLOWUP', { event_id: 'evt-1' });
  const m2 = pingMissionId('LEAD_FOLLOWUP', { event_id: 'evt-1' });
  const m3 = pingMissionId('LEAD_FOLLOWUP', { event_id: 'evt-2' });
  ok('H1h PING mission identity deterministic (idempotent create)', m1 === m2 && m1 !== m3, m1);
  ok('H1i PING mission identity is 16-hex (truncated)', /^[0-9a-f]{16}$/.test(m1));
  // NOTE: formula uses JSON.stringify(payload) (key order NOT stable) for payloads without event_id
  const p1 = pingMissionId('X', { a: 1, b: 2 });
  const p2 = pingMissionId('X', { b: 2, a: 1 });
  ok('H1j PING payload-hash NOT key-order stable (JSON.stringify)', p1 !== p2, 'same logical payload, different id');
  // ORCA uses stableStringify: verify key-order stability
  const s1 = rt.stableStringify({ a: 1, b: 2 });
  const s2 = rt.stableStringify({ b: 2, a: 1 });
  ok('H1k ORCA stableStringify key-order stable', s1 === s2, s1);
}

// ---------------------------------------------------------------- H2: claimRun CAS — normal + double-claim race
{
  const root = freshRoot();
  rt.registerObjective(root, 'orca', 'claim test');
  const obj = rt.loadObjective(root, rt.deriveObjectiveId({ namespace: 'orca', objectiveText: 'claim test', constraints: {} }));
  const oid = obj.objective_id;
  const run = rec.registerRun(rt, root, oid, { holderId: 'coord-A' });

  const c1 = rec.claimRun(rt, root, oid, run.run_id, { holderId: 'coord-A', ttlMs: 60000, expectedEpoch: 0 });
  ok('H2a first claim ok, epoch -> 1', c1.ok === true && c1.fencing_epoch === 1, JSON.stringify(c1));

  // Stale second claimant that read epoch 0 before the first claim
  const c2 = rec.claimRun(rt, root, oid, run.run_id, { holderId: 'coord-B', ttlMs: 60000, expectedEpoch: 0 });
  ok('H2b stale-epoch second claim refused', c2.ok === false && c2.reason === 'stale-epoch', JSON.stringify(c2));

  // Fresh claimant reading the current epoch takes over (stale-claim takeover, no lock)
  const cur = rec.loadRun(rt, root, oid, run.run_id);
  const c3 = rec.claimRun(rt, root, oid, run.run_id, { holderId: 'coord-B', ttlMs: 60000, expectedEpoch: cur.lease.fencing_epoch });
  ok('H2c fresh-epoch takeover succeeds (stale takeover exists)', c3.ok === true && c3.fencing_epoch === 2, JSON.stringify(c3));
  const after = rec.loadRun(rt, root, oid, run.run_id);
  ok('H2d holder recorded as coord-B', after.lease.holder_id === 'coord-B');

  // Takeover does NOT check expiry: an unexpired lease is still stealable by presenting current epoch
  const c4 = rec.claimRun(rt, root, oid, run.run_id, { holderId: 'coord-C', ttlMs: 60000, expectedEpoch: 2 });
  ok('H2e lease stealable before expiry (no holder/expiry gate)', c4.ok === true);
}

// ---------------------------------------------------------------- H3: file-CAS is NOT atomic under concurrency
{
  // Wrap rt with an injected delay between read and write to force an
  // interleaving that two real processes could hit on the file substrate.
  const root = freshRoot();
  rt.registerObjective(root, 'orca', 'race test');
  const oid = rt.deriveObjectiveId({ namespace: 'orca', objectiveText: 'race test', constraints: {} });
  const run = rec.registerRun(rt, root, oid, {});

  let gateOpen = false;
  const rtRace = {
    ...rt,
    readJson: (p) => { const v = rt.readJson(p); return v; },
    atomicWrite: (p, c) => {
      if (p.endsWith(run.run_id + '.json') && !gateOpen) {
        // first writer's write is delayed so a second writer's read+write lands first
      }
      rt.atomicWrite(p, c);
    },
  };
  // Manual interleave: A reads epoch 0, B reads epoch 0, A writes epoch 1, B writes epoch 1.
  const rA = rt.readJson(rec.runPath(rt, root, oid, run.run_id));
  const rB = rt.readJson(rec.runPath(rt, root, oid, run.run_id));
  ok('H3a both readers see epoch 0 (race precondition)', rA.lease.fencing_epoch === 0 && rB.lease.fencing_epoch === 0);
  rA.lease = { holder_id: 'A', expires_at: new Date().toISOString(), fencing_epoch: 1 };
  rt.atomicWrite(rec.runPath(rt, root, oid, run.run_id), JSON.stringify(rA));
  rB.lease = { holder_id: 'B', expires_at: new Date().toISOString(), fencing_epoch: 1 };
  rt.atomicWrite(rec.runPath(rt, root, oid, run.run_id), JSON.stringify(rB));
  const fin = rt.readJson(rec.runPath(rt, root, oid, run.run_id));
  ok('H3b lost update: two writers, one lost (epoch stayed 1)', fin.lease.fencing_epoch === 1 && fin.lease.holder_id === 'B', `epoch=${fin.lease.fencing_epoch} holder=${fin.lease.holder_id}`);
  // Conclusion: claimRun's CAS is read-check-write, NOT atomic on the file substrate.
  // Under the module's own contract the single-writer PG advisory lock removes concurrency,
  // but the module does not enforce it (docstring says caller MUST hold it).
}

// ---------------------------------------------------------------- H4: fencing = detectable, not enforced on writes
{
  const root = freshRoot();
  rt.registerObjective(root, 'orca', 'fence test');
  const oid = rt.deriveObjectiveId({ namespace: 'orca', objectiveText: 'fence test', constraints: {} });
  const run = rec.registerRun(rt, root, oid, {});
  rec.claimRun(rt, root, oid, run.run_id, { holderId: 'A', ttlMs: 60000, expectedEpoch: 0 }); // epoch 1
  rec.claimRun(rt, root, oid, run.run_id, { holderId: 'B', ttlMs: 60000, expectedEpoch: 1 }); // epoch 2, A stale
  // Stale holder A writes via transitionRun/checkpointRun which do NOT check the epoch.
  let staleWrote = false;
  try { rec.transitionRun(rt, root, oid, run.run_id, 'START'); staleWrote = true; } catch (e) {}
  ok('H4a stale holder A can still transitionRun after losing the lease (no epoch check)', staleWrote);
  let staleCk = false;
  try { rec.checkpointRun(rt, root, oid, run.run_id, 'snap-1'); staleCk = true; } catch (e) {}
  ok('H4b stale holder A can still checkpointRun (no epoch check)', staleCk);
  const fin = rec.loadRun(rt, root, oid, run.run_id);
  ok('H4c epoch advanced to 2 and is visible, so staleness is DETECTABLE', fin.lease.fencing_epoch === 2 && fin.status === 'STARTED');
}

// ---------------------------------------------------------------- H5: run-state transition table
{
  const r = rec.applyRunTransition;
  ok('H5a START from NOT_STARTED', r('NOT_STARTED', 'START') === 'STARTED');
  ok('H5b FAILED -> RETRY -> NOT_STARTED (retryable terminal)', r('FAILED', 'RETRY') === 'NOT_STARTED');
  ok('H5c OUTCOME_UNKNOWN never auto-retries', (() => { try { r('OUTCOME_UNKNOWN', 'RETRY'); return false; } catch (e) { return e.name === 'ErrIllegalTransition'; } })());
  ok('H5d SUCCEEDED is terminal (no exits)', rec.legalRunEvents('SUCCEEDED').length === 0);
  ok('H5e OUTCOME_UNKNOWN allows only CANCEL', JSON.stringify(rec.legalRunEvents('OUTCOME_UNKNOWN')) === JSON.stringify(['CANCEL']));
  ok('H5f unknown from-state throws', (() => { try { r('BOGUS', 'START'); return false; } catch (e) { return true; } })());
  ok('H5g SUSPENDED -> RESUME -> STARTED', r('SUSPENDED', 'RESUME') === 'STARTED');
  ok('H5h isTerminalRunState excludes FAILED (retryable)', rec.isTerminalRunState('FAILED') === false && rec.isTerminalRunState('SUCCEEDED') === true);
}

// ---------------------------------------------------------------- H6: ready-set query
{
  const mk = (id, state, deps) => ({ work_order_id: id, state, depends_on: deps });
  const wos = [
    mk('a', 'AUTHORIZED', []),
    mk('b', 'AUTHORIZED', ['a']),
    mk('c', 'RUNNING', []),
    mk('d', 'AUTHORIZED', ['b']),
    mk('e', 'AUTHORIZED', ['self-missing']),
  ];
  const r1 = rs.readyWorkOrders(wos);
  ok('H6a only AUTHORIZED-with-satisfied-deps ready', JSON.stringify(r1.map(w => w.work_order_id)) === JSON.stringify(['a']), JSON.stringify(r1.map(w => w.work_order_id)));

  const wos2 = [mk('a', 'COMPLETED', []), mk('b', 'AUTHORIZED', ['a'])];
  ok('H6b dep COMPLETED unlocks', rs.readyWorkOrders(wos2).length === 1);

  const wos3 = [mk('x', 'AUTHORIZED', ['y']), mk('y', 'AUTHORIZED', ['x'])];
  ok('H6c dependency cycle -> nothing ready (safe deadlock, no hang)', rs.readyWorkOrders(wos3).length === 0);

  const wos4 = [mk('s', 'AUTHORIZED', ['s'])];
  ok('H6d self-dependency -> not ready', rs.readyWorkOrders(wos4).length === 0);

  const wos5 = [mk('u', 'AUTHORIZED', []), mk('u', 'AUTHORIZED', [])];
  ok('H6e unresolved-unknown blocklist honored', rs.readyWorkOrders(wos5, { blockedWorkOrderIds: ['u'] }).length === 0);

  const wos6 = [mk('z', 'MYSTERY', [])];
  ok('H6f unknown state never claimable (fail closed)', rs.readyWorkOrders(wos6).length === 0);

  ok('H6g settled set includes FAILED/CANCELLED', rs.isSettled('FAILED') && rs.isSettled('CANCELLED') && !rs.isSettled('AUTHORIZED'));
}

// ---------------------------------------------------------------- H7: advisory lock key determinism
{
  const k1 = rt.coordinatorLockKey('obj-1');
  const k2 = rt.coordinatorLockKey('obj-1');
  const k3 = rt.coordinatorLockKey('obj-2');
  ok('H7a coordinator lock key deterministic', k1.k1 === k2.k1 && k1.k2 === k2.k2, JSON.stringify(k1));
  ok('H7b coordinator lock key distinct per objective', k1.k1 !== k3.k1 || k1.k2 !== k3.k2);
  ok('H7c keys are signed 32-bit ints', Number.isInteger(k1.k1) && k1.k1 >= -2147483648 && k1.k1 <= 2147483647);
}

// ---------------------------------------------------------------- H8: PING claim SQL semantics (simulated conditional update)
{
  // Simulates the ATOMICITY the SQL depends on: one statement, row-locked.
  // claim1 then claim2 on the same mission: second matches 0 rows.
  const row = { status: 'created' };
  const claim = (name) => { if (row.status === 'created') { row.status = 'assigned'; return 1; } return 0; };
  ok('H8a first claim rowCount=1', claim('A') === 1);
  ok('H8b second claim rowCount=0 (cannot steal)', claim('B') === 0);
  // renewLease semantic: only renews running/assigned
  const renew = () => (['running', 'assigned'].includes(row.status) ? 1 : 0);
  ok('H8c renew works on assigned', renew() === 1);
  row.status = 'completed';
  ok('H8d renew refused on completed (no lease extension past terminal)', renew() === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
