// demo-pipeline.mjs
// Factory-shaped 12-stage BuildBusiness pipeline on the durable runner.
// Proves: kill mid-run -> new runner instance resumes from last COMPLETED checkpoint.
// Usage: node demo-pipeline.mjs [killAtStage]
// No em dashes.

import { DurableStageRunner, sha256Hex, sleep } from './durable-stage-runner.mjs';
import { writeFileSync } from 'node:fs';

const STAGE_NAMES = [
  'ACQUIRE', 'EXTRACT_OBSERVATIONS', 'GRADE_CLAIMS', 'BUILD_GRAPH',
  'RESOLVE_CONFLICTS', 'ATTEST_PROVENANCE', 'PLAN_SITE', 'GENERATE_SPEC',
  'BIND_MEDIA', 'VERIFY_RENDER_MODEL', 'RENDER_PROVE', 'REGENERATE_AND_CERTIFY',
];

const killAtStage = process.argv[2] || null;
const runId = process.argv[3] || 'build-clearwater-plumbing-demo';
const ledgerPath = process.argv[4] || './demo-ledger.jsonl';

const events = [];
const stages = STAGE_NAMES.map((name, i) => ({
  name,
  policy: { maxAttempts: 3, initialMs: 50, backoff: 2, maxIntervalMs: 400, nonRetryable: ['F-SEC', 'SCHEMA_CHANGED', 'INVALID_PAYLOAD'] },
  timeouts: { startToCloseMs: 15000, heartbeatTimeoutMs: 5000 },
  fn: async (ctx, input) => {
    // Simulate stage work with heartbeats.
    for (let k = 0; k < 3; k++) {
      await sleep(20);
      ctx.heartbeat({ stage: name, chunk: k, partialDigest: sha256Hex(name + k).slice(0, 12) });
    }
    if (killAtStage === name) {
      const e = new Error('SIMULATED PROCESS DEATH mid-stage');
      e.code = 'SIMULATED_KILL';
      throw e; // runner records WORKER_KILLED, no COMPLETED checkpoint
    }
    return { stage: name, seq: i, prevDigest: input && input.digest ? input.digest : input, digest: null };
  },
}));

// Wrap: attach chained digest after each stage output.
const runner = new DurableStageRunner(stages, {
  ledgerPath,
  onEvent: (e) => {
    events.push(e);
    if (['RUN_START', 'STAGE_COMPLETED', 'WORKER_KILLED', 'RUN_COMPLETED', 'STAGE_IDEMPOTENT_SKIP'].includes(e.type)) {
      console.log(JSON.stringify({ t: e.type, stage: e.stage || null, resume_from: e.resume_from_stage ?? null, reason: e.reason || null }));
    }
  },
});

// Chain digests: rewrite stage fn to include prev digest linkage is implicit via
// input digest chaining in the runner (input_digest of stage i = output_digest of i-1).

try {
  const result = await runner.run(runId, { manifest: 'clearwater-plumbing-demo', manifestDigest: '1bef189e' });
  console.log('FINAL_DIGEST=' + result.finalDigest);
  writeFileSync('./demo-events.json', JSON.stringify(events, null, 2));
} catch (e) {
  console.log('RUN_TERMINATED: ' + e.message + ' code=' + (e.code || 'none'));
  writeFileSync('./demo-events.json', JSON.stringify(events, null, 2));
  process.exitCode = 42; // distinct exit code for "killed", not success
}
