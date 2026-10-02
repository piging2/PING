// Driver 3: loop internals via audit shim (real code from the worktree copy).
// PING_DATA_ROOT must be set before require (DATA_ROOT binds at load).
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const shim = require('/tmp/audit-u2/orca/control-loop/loop-shim.js');
const A = shim.__audit;
const R = require('/tmp/audit-u2/orca/control-loop/objective-runtime.js');
const policy = require('/tmp/audit-u2/orca/control-loop/policy/orca_policy.js');
const DATA = process.env.PING_DATA_ROOT;

let pass = 0, fail = 0;
function ok(name, cond) { if (!cond) { fail++; console.error('FAIL: ' + name); } else { pass++; console.log('pass: ' + name); } }

(async () => {
// save() needs EVIDENCE_DIR to exist (main() normally creates it)
fs.mkdirSync(A.evidenceDir(), { recursive: true });
// ---- setup: register an objective, set module OBJECTIVE_ID ----
const OID = R.deriveObjectiveId({ namespace: 'core::system', objectiveText: 'audit driver3 objective', constraints: {} });
A.setObjectiveId(OID);
// NOTE: the loop's CONSTRAINTS are baked into its own derive; for shim tests
// we register with the same namespace+text so the id matches this OID only if
// constraints match. We instead register directly and use that id.
const reg = R.registerObjective(DATA, 'core::system', 'audit driver3 objective', { constraints: {}, maxWorkOrders: 2 });
A.setObjectiveId(reg.objective_id);
const O = reg.objective_id;

// ---- D1: all 18 prohibited actions rejected with durable evidence ----
const NPROHIB = policy.PROHIBITED_ACTIONS.length;
console.log('INFO: policy defines ' + NPROHIB + ' prohibitions');
ok('D1 policy defines prohibitions', NPROHIB > 0);
let rejected = 0;
for (const p of policy.PROHIBITED_ACTIONS) {
  try {
    A.enforceProhibitions({ action: p.action, briefText: '', taskKey: 'probe', tag: 'probe-' + rejected });
    ok('D1 reject ' + p.action, false);
  } catch (e) {
    if (e instanceof A.Escalation && /prohibited action rejected/.test(e.message)) rejected++;
    else ok('D1 reject ' + p.action + ' (wrong error)', false);
  }
}
ok('D1 all prohibitions rejected via Escalation', rejected === NPROHIB);
// durable evidence written for a rejection
const evFiles = fs.readdirSync(path.join('/tmp/audit-u2/orca/control-loop/evidence')).flatMap((d) => {
  try { return fs.readdirSync(path.join('/tmp/audit-u2/orca/control-loop/evidence', d)); } catch (_) { return []; }
});
ok('D1 PROHIBITED evidence files written', evFiles.some((f) => f.startsWith('prohibition-probe-')));
const sample = evFiles.find((f) => f.startsWith('prohibition-probe-'));
let sampleBody = null;
for (const d of fs.readdirSync(path.join('/tmp/audit-u2/orca/control-loop/evidence'))) {
  const p = path.join('/tmp/audit-u2/orca/control-loop/evidence', d, sample);
  if (fs.existsSync(p)) { sampleBody = JSON.parse(fs.readFileSync(p, 'utf8')); break; }
}
ok('D1 evidence decisionClass PROHIBITED', sampleBody && sampleBody.decisionClass === 'PROHIBITED');

// ---- D1b: benign action allowed, allow-path evidence written ----
const allow = A.enforceProhibitions({ action: 'text.summarize', briefText: 'summarize this text', taskKey: 't-benign', tag: 'benign' });
ok('D1b benign allowed', allow && allow.decisionClass === 'ALLOWED' && allow.prohibitionsChecked === NPROHIB);

// ---- D2: brief-text substring scan catches embedded prohibited action ----
let d2 = false;
try {
  A.enforceProhibitions({ action: 'text.summarize', briefText: 'please ' + policy.PROHIBITED_ACTIONS[0].action + ' now', taskKey: 't-embed', tag: 'embed' });
} catch (e) { d2 = e instanceof A.Escalation; }
ok('D2 embedded prohibited action in brief rejected', d2);

// ---- D3 (T3 semantics): RUNNING + dead pid + no rendezvous -> re-authorized ----
const woId = R.deriveWorkOrderId(O, 'task-t3');
R.authorizeWorkOrder(DATA, O, 'task-t3', {});
R.updateWorkOrder(DATA, O, woId, { state: 'RUNNING', attempt_count: 1, last_attempt_id: R.deriveAttemptId(woId, 1), dispatch_pid: 99999999 });
const dwo3 = R.loadWorkOrder(DATA, O, woId);
const r3 = await A.reconcileRunningWorkOrder({ eventRuntime: {}, dwo: dwo3, tag: 't3' });
const after3 = R.loadWorkOrder(DATA, O, woId);
ok('D3 dead-pid no-result -> lost-redispatchable', r3.status === 'lost-redispatchable');
ok('D3 work order re-authorized, attempt cleared', after3.state === 'AUTHORIZED' && after3.last_attempt_id === null && after3.dispatch_pid === null);
const att3 = (after3.attempt_history || []).find((a) => a.attempt_id === R.deriveAttemptId(woId, 1));
ok('D3 attempt history records DISPATCH_LOST', att3 && att3.outcome === 'DISPATCH_LOST');

// ---- D4: RUNNING + live pid + no rendezvous -> left RUNNING (no redispatch) ----
const sleeper = spawnSync('sleep', ['0.1']); // placeholder to keep sync shape
const { spawn } = require('child_process');
const live = spawn('sleep', ['120'], { stdio: 'ignore' });
const woId4 = R.deriveWorkOrderId(O, 'task-t4');
R.authorizeWorkOrder(DATA, O, 'task-t4', {});
R.updateWorkOrder(DATA, O, woId4, { state: 'RUNNING', attempt_count: 1, last_attempt_id: R.deriveAttemptId(woId4, 1), dispatch_pid: live.pid });
const dwo4 = R.loadWorkOrder(DATA, O, woId4);
const t0 = Date.now();
const r4 = await A.reconcileRunningWorkOrder({ eventRuntime: {}, dwo: dwo4, tag: 't4' });
const dt = Date.now() - t0;
const after4 = R.loadWorkOrder(DATA, O, woId4);
try { live.kill('SIGKILL'); } catch (_) {}
ok('D4 live-pid no-result -> in-flight, not redispatched', r4.status === 'in-flight');
ok('D4 work order stays RUNNING', after4.state === 'RUNNING');
ok('D4 bounded wait observed (~30s)', dt > 25000 && dt < 60000);

// ---- D5 (T4 semantics): RUNNING + rendezvous with garbage -> VERIFICATION_FAILED, no PG ----
const woId5 = R.deriveWorkOrderId(O, 'task-t5');
R.authorizeWorkOrder(DATA, O, 'task-t5', { issued: { mission_id: 'm' } });
R.updateWorkOrder(DATA, O, woId5, { state: 'RUNNING', attempt_count: 1, last_attempt_id: R.deriveAttemptId(woId5, 1), dispatch_pid: 99999999,
  issued: { mission_id: 'm', task_id: 'task-t5' } });
const rzPath = R.rendezvousResultPath(DATA, O, woId5);
fs.mkdirSync(path.dirname(rzPath), { recursive: true });
fs.writeFileSync(rzPath, JSON.stringify({ schema: 'orca-rendezvous/1', stdout: 'this is not a worker envelope at all', stderr: '' }));
let d5escalated = false;
try {
  await A.reconcileRunningWorkOrder({ eventRuntime: {}, dwo: R.loadWorkOrder(DATA, O, woId5), tag: 't5' });
} catch (e) { d5escalated = e instanceof A.Escalation && /protocol failure/.test(e.message); }
const after5 = R.loadWorkOrder(DATA, O, woId5);
ok('D5 garbage rendezvous -> Escalation protocol failure', d5escalated);
ok('D5 work order terminal VERIFICATION_FAILED', after5.state === 'VERIFICATION_FAILED' && after5.terminal && after5.terminal.status === 'protocol-failure');

// ---- D9: gateResultAcceptance routes to verifier, never self-certifies ----
const g = A.gateResultAcceptance({ tag: 'gatecheck' });
ok('D9 acceptance gate REQUIRES_VERIFICATION', g.decisionClass === 'REQUIRES_VERIFICATION');

console.log('DRIVER3 passes=' + pass + ' fails=' + fail);
process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('DRIVER3 FATAL', e); process.exit(1); });
