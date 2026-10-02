'use strict';
// ORCA-C mission 8 probe: budget exhaustion.
// (a) branch durable work-order budget: exhaustion honest? idempotent? crash-skew?
// (b) PING failWithRetry: exhaustion honest, no retry past budget?
const fs = require('fs');
const os = require('os');
const path = require('path');
const rt = require('../src/objective-runtime.js');
const policy = require('../src/orca_policy.js');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name); }
}

// ---------- (a) branch durable budget ----------
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orca-c-m8-'));
const NS = 'orca-c-m8';
const objText = 'm8 budget probe';
const oid = rt.deriveObjectiveId({ namespace: NS, objectiveText: objText });
rt.registerObjective(root, NS, objText, { maxWorkOrders: 2 });

const w1 = rt.deriveWorkOrderId(oid, 't1');
const w2 = rt.deriveWorkOrderId(oid, 't2');
const w3 = rt.deriveWorkOrderId(oid, 't3');

const r1 = rt.reserveWorkOrderBudget(root, oid, w1);
check('reserve w1 ok (1/2)', r1.ok && r1.used === 1);
const r1b = rt.reserveWorkOrderBudget(root, oid, w1);
check('re-reserve w1 idempotent (still 1/2, no double-spend)', r1b.ok && r1b.used === 1);
const r2 = rt.reserveWorkOrderBudget(root, oid, w2);
check('reserve w2 ok (2/2)', r2.ok && r2.used === 2);
const r3 = rt.reserveWorkOrderBudget(root, oid, w3);
check('reserve w3 refused honestly (budget-exhausted)', r3.ok === false && r3.reason === 'budget-exhausted');
const usage = rt.budgetUsage(root, oid);
check('budgetUsage reads 2/2 (durable, not reset)', usage.used === 2 && usage.limit === 2);

// crash-skew: reservation file written, objective.json count NOT incremented
// (simulates SIGKILL between the two atomicWrites in reserveWorkOrderBudget)
const resvPath = path.join(rt.objectiveDir(root, oid), 'budget_reservations.json');
const resv = JSON.parse(fs.readFileSync(resvPath, 'utf8'));
resv.reservations[w3] = { reserved_at: new Date().toISOString(), note: 'simulated crash window' };
fs.writeFileSync(resvPath, JSON.stringify(resv, null, 2));
const usageSkew = rt.budgetUsage(root, oid);
check('VULN/note: post-crash usage reads 2/2 but 3 reservations exist (count skews low)',
  usageSkew.used === 2 && Object.keys(JSON.parse(fs.readFileSync(resvPath, 'utf8')).reservations).length === 3);
// and a re-reserve of the crashed id succeeds without incrementing (no double-spend, but the
// leaked reservation permanently occupies a slot the counter does not see)
const r3b = rt.reserveWorkOrderBudget(root, oid, w3);
check('crashed id re-reserve ok without double-count (used still 2)', r3b.ok === true && r3b.used === 2);

// classifyRetry bounds
const d1 = policy.classifyRetry({ attempt: 1, maxAttempts: 2, failureKind: 'timeout' });
check('attempt 1/2 timeout -> AUTO_EXECUTE', d1.decisionClass === 'AUTO_EXECUTE');
const d2 = policy.classifyRetry({ attempt: 2, maxAttempts: 2, failureKind: 'timeout' });
check('attempt 2/2 timeout -> REQUIRES_HUMAN_APPROVAL (no retry past budget)', d2.decisionClass === 'REQUIRES_HUMAN_APPROVAL');
const d3 = policy.classifyRetry({ attempt: 1, maxAttempts: 2, failureKind: 'validation-failed' });
check('validation-failed -> non-retryable escalate', d3.decisionClass === 'REQUIRES_HUMAN_APPROVAL');

// ---------- (b) PING failWithRetry with a stateful fake pool ----------
const { MissionRuntime } = require('../src/mission_runtime.js');
const rows = new Map(); // mission_id -> row
function fakePool() {
  return {
    query: async (sql, params) => {
      if (/SELECT retries FROM ping_missions/.test(sql)) {
        const r = rows.get(params[0]);
        return { rows: r ? [{ retries: r.retries }] : [], rowCount: r ? 1 : 0 };
      }
      if (/SET status = 'failed'/.test(sql) && /retries = \$2/.test(sql)) {
        const r = rows.get(params[2]);
        if (r && ['running', 'assigned', 'retry_pending'].includes(r.status)) {
          r.status = 'failed'; r.error = params[0]; r.retries = params[1];
          return { rowCount: 1, rows: [] };
        }
        return { rowCount: 0, rows: [] };
      }
      if (/SET status = 'retry_pending'/.test(sql)) {
        const r = rows.get(params[3]);
        if (r && ['running', 'assigned'].includes(r.status)) {
          r.status = 'retry_pending'; r.error = params[0]; r.retries = params[1]; r.retry_at = params[2];
          return { rowCount: 1, rows: [] };
        }
        return { rowCount: 0, rows: [] };
      }
      throw new Error('fake pool: unhandled SQL: ' + sql.slice(0, 80));
    },
  };
}
(async () => {
  const mr = new MissionRuntime({ pool: fakePool(), eventRuntime: null });
  rows.set('m1', { status: 'running', retries: 0 });
  const n1 = await mr.failWithRetry('m1', 'boom', { max_attempts: 3, backoff_delay_ms: 1000 });
  check('PING: 1st failure -> retry_pending (1/3)', n1 === 1 && rows.get('m1').status === 'retry_pending');
  rows.get('m1').status = 'running'; // reclaimRetryPending would move it back
  const n2 = await mr.failWithRetry('m1', 'boom', { max_attempts: 3, backoff_delay_ms: 1000 });
  check('PING: 2nd failure -> retry_pending (2/3)', n2 === 2 && rows.get('m1').status === 'retry_pending');
  rows.get('m1').status = 'running';
  const n3 = await mr.failWithRetry('m1', 'boom', { max_attempts: 3, backoff_delay_ms: 1000 });
  check('PING: 3rd failure -> failed, honestly terminal (3/3)', n3 === 3 && rows.get('m1').status === 'failed');
  rows.get('m1').status = 'running'; // adversarial: force back to running
  const n4 = await mr.failWithRetry('m1', 'boom', { max_attempts: 3, backoff_delay_ms: 1000 });
  check('PING: 4th call past budget -> still failed, no retry scheduled (4/3)',
    n4 === 4 && rows.get('m1').status === 'failed');

  console.log(`\n${pass} pass, ${fail} fail`);
  console.log('scratch root:', root);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
