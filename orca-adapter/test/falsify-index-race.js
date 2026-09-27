'use strict';
/**
 * Defect-4 falsifier (2026-09-27): cross-process idempotency race.
 *
 * Spawns N node processes that all call dispatchExecution for the SAME
 * idempotency key at the same time, against the SAME evidenceDir, with a
 * synthetic transport that sleeps briefly (widening the race window).
 *
 * PASS: exactly ONE process completes (transport ran once); every other
 * process is refused with a gate reason (duplicate_attempt,
 * reconciliation_required, or artifact_exists) typed
 * authorization_refusal:false; the index holds exactly one dispatched
 * line; no lockfile is left behind.
 * FAIL: the transport ran more than once, or any process returned a
 * non-refusal outcome for the same key+attempt.
 *
 * Usage: node falsify-index-race.js [N=8]
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const N = parseInt(process.argv[2] || '8', 10);
const adapterPath = path.resolve(__dirname, '..', 'adapter.js');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-race-'));
const evidenceDir = path.join(dir, 'evidence');

const CHILD = `
'use strict';
const adapter = require(process.argv[2]);
const fs = require('fs');
const evidenceDir = process.argv[3];
const goFile = process.argv[4];
const outFile = process.argv[5];
const deadline = Date.now() + 15000;
while (!fs.existsSync(goFile) && Date.now() < deadline) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
}
function field(prompt, name) {
  const m = new RegExp('"' + name + '":\\\\s*"([^"]+)"').exec(prompt);
  return m ? m[1] : null;
}
const execution = {
  missionId: 'race-mission', runId: 'race-run',
  executionId: 'race-exec', attempt: '1',
};
function run() {
  return adapter.dispatchExecution({
    execution,
    agentId: 'hermes',
    capability: 'fixture.read',
    namespace: 'tenant::race-tenant',
    constraints: { read_only: true, no_writes: true, no_network: true,
                   no_canonical_events: true, no_mission_state_writes: true },
    taskBrief: 'race brief',
    input: { race: 'same-key' },
    tenantId: 'race-tenant',
    evidenceDir,
    eventRuntime: null,
    transportFn: (prompt, timeoutMs) => {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
      const envelope = {
        work_order_id: field(prompt, 'work_order_id'),
        context_pack_id: field(prompt, 'context_pack_id'),
        agent_id: 'hermes',
        capability: 'fixture.read',
        status: 'completed',
        output: { race: 'won' },
        evidence: { startedAt: new Date().toISOString(), endedAt: new Date().toISOString(),
                    host: 'synthetic-test', capabilityPerformed: 'fixture.read' },
        error: null,
      };
      return { startedAt: new Date().toISOString(), endedAt: new Date().toISOString(),
               timedOut: false, exitCode: 0, signal: null,
               stdout: JSON.stringify(envelope), stderr: '', error: null,
               transport: 'synthetic-test' };
    },
  });
}
Promise.resolve()
  .then(run)
  .then((r) => {
    const rec = { outcome: r.outcome, reason: r.reason || null };
    rec.authorization_refusal = ('authorization_refusal' in r) ? r.authorization_refusal : null;
    fs.writeFileSync(outFile, JSON.stringify(rec));
  })
  .catch((e) => {
    fs.writeFileSync(outFile, JSON.stringify({ threw: String((e && e.message) || e) }));
  });
`;

async function main() {
  const childPath = path.join(dir, 'child.js');
  fs.writeFileSync(childPath, CHILD);
  const goFile = path.join(dir, 'GO');
  const exits = [];
  const outFiles = [];
  for (let i = 0; i < N; i++) {
    const outFile = path.join(dir, `result-${i}.json`);
    outFiles.push(outFile);
    const p = spawn('node', [childPath, adapterPath, evidenceDir, goFile, outFile],
      { stdio: 'ignore' });
    exits.push(new Promise((resolve) => {
      const t = setTimeout(() => { p.kill('SIGKILL'); resolve('timeout'); }, 90000);
      p.on('exit', (code, signal) => { clearTimeout(t); resolve(code === 0 ? 'ok' : `exit:${code}/${signal}`); });
      p.on('error', (e) => { clearTimeout(t); resolve('spawn-error:' + e.message); });
    }));
  }
  // Release the barrier: all children dispatch at once.
  fs.writeFileSync(goFile, 'go\n');
  const statuses = await Promise.all(exits);

  let failed = false;
  const results = [];
  for (let i = 0; i < N; i++) {
    if (statuses[i] !== 'ok') {
      console.log(`child ${i} status: ${statuses[i]}`);
      failed = true;
    }
    try {
      results.push(JSON.parse(fs.readFileSync(outFiles[i], 'utf8')));
    } catch (e) {
      results.push({ threw: 'no result file: ' + e.message });
      failed = true;
    }
  }
  const completed = results.filter((r) => r.outcome === 'completed');
  const refused = results.filter((r) => r.outcome === 'denied');
  const other = results.filter((r) => r.outcome !== 'completed' && r.outcome !== 'denied');
  console.log(`N=${N} completed=${completed.length} denied=${refused.length} other=${other.length}`);
  for (const r of refused) console.log('  refused:', r.reason, '| authorization_refusal:', r.authorization_refusal);
  for (const r of other) console.log('  OTHER:', JSON.stringify(r));

  if (completed.length !== 1) {
    console.log(`FAIL: expected exactly 1 completed dispatch, got ${completed.length}`);
    failed = true;
  }
  if (other.length !== 0) {
    console.log('FAIL: unexpected non-refusal outcomes');
    failed = true;
  }
  const OK_REASONS = new Set(['duplicate_attempt', 'reconciliation_required', 'artifact_exists']);
  for (const r of refused) {
    if (!OK_REASONS.has(r.reason)) {
      console.log('FAIL: refusal with unexpected reason:', r.reason);
      failed = true;
    }
    if (r.authorization_refusal !== false) {
      console.log('FAIL: gate refusal must type authorization_refusal:false, got:', r.authorization_refusal);
      failed = true;
    }
  }
  const indexLines = fs.readFileSync(path.join(evidenceDir, 'idempotency-index.jsonl'), 'utf8')
    .split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const dispatched = indexLines.filter((l) => l.type === 'attempt' && l.phase === 'dispatched');
  console.log(`index dispatched lines: ${dispatched.length}`);
  if (dispatched.length !== 1) {
    console.log('FAIL: expected exactly 1 dispatched line in the index');
    failed = true;
  }
  if (fs.existsSync(path.join(evidenceDir, 'idempotency-index.lock'))) {
    console.log('FAIL: lockfile left behind');
    failed = true;
  }
  console.log(failed ? 'RACE FALSIFIER: FAIL' : 'RACE FALSIFIER: PASS');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('falsifier error:', e); process.exit(2); });
