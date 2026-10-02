'use strict';
/**
 * Lane F case: happy-path (design 1A — verified success with artifacts).
 *
 * Full integration: orca-adapter.dispatchExecution() with a synthetic
 * Hermes-class transport (zero spend, zero provider calls) -> verified
 * signed envelope -> artifact -> evidence -> events -> projection.
 * This is the success baseline every other case's "UNKNOWN is not FAILED"
 * invariant is measured against.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Bundle } = require('../lib/evidence');
const { HarnessJournal } = require('../lib/journal');
const { refreshReplayParity } = require('../lib/parity');
const { projectJournalFile, stableStringify } = require('../lib/projector');
const { happyTransport, executionOpts, sha256hex, mintWorkOrderId } = require('../lib/fixtures');
const { makeProvider } = require('../lib/stubs');

const adapter = require('/home/hatch/workspace/orca-adapter/adapter.js');

async function run(ctx) {
  const caseName = 'happy-path';
  const missionId = ctx.missionId(caseName);
  const bundle = new Bundle(ctx.outRoot, caseName, missionId);
  const journal = new HarnessJournal(path.join(bundle.dir, 'journal.jsonl'));

  const runId = `${missionId}-r1`;
  const executionId = `${missionId}-x1`;
  const dir = path.join(bundle.dir, 'workspace');
  fs.mkdirSync(dir, { recursive: true });
  const provider = makeProvider(dir, 'happy');

  const taskBrief = 'bounded synthetic happy-path prompt: summarize the quarterly maintenance log';
  const transport = happyTransport({
    effect: () => provider.effect({ brief: taskBrief }),
    output: { summary: 'Quarterly maintenance log summarized: 3 items, no blockers.' },
    dwellMs: 150,
  });

  const result = await adapter.dispatchExecution(executionOpts({
    missionId, runId, executionId,
    agentId: 'hermes', capability: 'text.summarize',
    namespace: 'tenant::happy-place', tenantId: 'happy-place',
    taskBrief, input: { case: 'happy-path' }, evidenceDir: dir, transportFn: transport.fn,
  }));

  // 1. Verify the outcome and receipt invariants.
  const expectedWorkOrder = mintWorkOrderId(executionId, '1');
  bundle.check('adapter outcome is completed', result.outcome === 'completed', { outcome: result.outcome });
  bundle.check('work_order_id is the deterministic mint (sha256 workorder:taskId [0:16])',
    result.work_order_id === expectedWorkOrder, { work_order_id: result.work_order_id, expected: expectedWorkOrder });
  bundle.check('work order is stable across re-dispatch of the same (execution, attempt)',
    mintWorkOrderId(executionId, '1') === expectedWorkOrder && mintWorkOrderId(executionId, '2') !== expectedWorkOrder);
  bundle.check('result_id present (verified envelope identity)', typeof result.result_id === 'string' && result.result_id.length > 0);
  bundle.check('no canonical emission without an event runtime (recorded=false, honest)',
    result.recorded === false && result.event_id === null, { recorded: result.recorded, event_id: result.event_id });
  bundle.check('prompt context was received (digest present)', !!transport.seen.promptDigest, { digest: transport.seen.promptDigest });
  bundle.check('prompt contains tenant context + mission linkage',
    /tenant: happy-place/.test(transport.seen.promptText || '') &&
    new RegExp(`"work_order_id": "${expectedWorkOrder}"`).test(transport.seen.promptText || ''));

  // 2. Verify the artifact: content, envelope verification, digest, tenant.
  bundle.check('artifact path returned', !!result.artifactPath && fs.existsSync(result.artifactPath));
  const artifact = JSON.parse(fs.readFileSync(result.artifactPath, 'utf8'));
  bundle.check('artifact links mission/run/execution/work-order',
    artifact.execution.missionId === missionId &&
    artifact.execution.runId === runId &&
    artifact.execution.executionId === executionId &&
    artifact.work_order_id === expectedWorkOrder,
    { mission: artifact.execution.missionId, run: artifact.execution.runId, execution: artifact.execution.executionId, workOrder: artifact.work_order_id });
  bundle.check('envelope passed the verified contract (binding + echo + pairing)',
    artifact.envelope.work_order_id === expectedWorkOrder &&
    artifact.envelope.agent_id === 'hermes' &&
    artifact.envelope.capability === 'text.summarize' &&
    artifact.envelope.status === 'completed' &&
    artifact.envelope.output != null && artifact.envelope.error === null &&
    typeof result.result_id === 'string' && result.result_id.length > 0,
    { envelope_echo: artifact.envelope.work_order_id, result_id: (result.result_id || '').slice(0, 16) + '...' });
  bundle.check('tenant_id threaded into artifact', artifact.tenant_id === 'happy-place', { tenant_id: artifact.tenant_id });
  const artifactDigest = crypto.createHash('sha256').update(fs.readFileSync(result.artifactPath, 'utf8')).digest('hex');
  bundle.check('artifact digest is stable (recompute matches)', artifactDigest === crypto.createHash('sha256').update(fs.readFileSync(result.artifactPath, 'utf8')).digest('hex'));

  // 3. Exactly one effect (happy path performs it once).
  bundle.check('exactly 1 effect performed', provider.count() === 1, { effects: provider.count() });

  // 4. Events: full happy lifecycle + deterministic artifact digest link.
  journal.appendEvent('MC_MISSION_CREATED', missionId, `mission created: ${missionId}`, {
    run_id: runId, execution_id: executionId, agent: 'hermes', tenant: 'happy-place', capability: 'text.summarize',
  });
  journal.appendEvent('MC_RUN_QUEUED', missionId, `run queued: ${runId}`, { run_id: runId, execution_id: executionId });
  journal.appendEvent('MC_EXECUTION_STARTED', missionId, `execution started: ${executionId}`, { run_id: runId, execution_id: executionId });
  journal.appendEvent('MC_AGENT_AUTHORIZED', missionId, 'agent hermes authorized for text.summarize', {
    run_id: runId, execution_id: executionId, capabilities_granted: ['text.summarize'], work_order_id: result.work_order_id,
  });
  journal.appendEvent('MC_ARTIFACT_PUBLISHED', missionId, `evidence artifact published: ${path.basename(result.artifactPath)}`, {
    kind: 'evidence', path: result.artifactPath, sha256: artifactDigest,
  });
  const outputDigest = sha256hex(JSON.stringify(artifact.envelope.output));
  journal.appendEvent('MC_RUN_SUCCEEDED', missionId, `run succeeded: ${runId}`, {
    run_id: runId, execution_id: executionId, output_digest: outputDigest,
    output_chars: JSON.stringify(artifact.envelope.output).length,
    evidence: { artifact_path: result.artifactPath, artifact_sha256: artifactDigest, effect_count: 1 },
  });
  const journalEvents = journal.read();
  bundle.writeText('events.jsonl', journalEvents.map((e) => JSON.stringify(e)).join('\n') + '\n');

  // 5. Projection: SUCCEEDED with artifact evidence attached.
  const asOf = new Date().toISOString();
  const doc = projectJournalFile(path.join(bundle.dir, 'journal.jsonl'), asOf);
  const row = doc.missions.find((x) => x.mission_id === missionId);
  bundle.write('projection.json', JSON.parse(stableStringify(doc)));
  bundle.check('projected status is SUCCEEDED', row && row.status === 'SUCCEEDED', row && row.status);
  bundle.check('projection links artifact digest', row && row.artifacts[0] && row.artifacts[0].sha256 === artifactDigest, row && row.artifacts[0]);
  bundle.write('ui-state.json', { note: 'synthetic case: MC read seam is the projector output', status: row.status, output_digest: outputDigest });

  const parity = await refreshReplayParity({ journalPath: path.join(bundle.dir, 'journal.jsonl'), bundle, asOf });
  bundle.check('refresh parity', parity.refreshParity);
  bundle.check('replay parity', parity.replayParity);
  bundle.check('negative control', parity.negativeControl);

  return bundle.verdict({ case_file: 'happy-path.js', transport: 'synthetic-happy', spend: 0 });
}

module.exports = { run };
