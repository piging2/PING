'use strict';
/**
 * Lane F case: unknown-ambiguous (design 1B — the primary lie).
 *
 * Setup: the test worker performs its (synthetic) effect and returns
 * undefined — the exact WR-lane discovery. The repaired scheduler must
 * classify this as UNKNOWN (matched, effect unproven): never "no worker
 * matched", never auto-retry.
 */
const path = require('path');
const { Bundle } = require('../lib/evidence');
const { HarnessJournal } = require('../lib/journal');
const { refreshReplayParity } = require('../lib/parity');
const { projectJournalFile, stableStringify } = require('../lib/projector');
const { WorkerRuntime, StubMissionRuntime, makeScheduler, captureConsole, makeProvider } = require('../lib/stubs');

function emitLifecycle(journal, ids, outcome) {
  journal.appendEvent('MC_MISSION_CREATED', ids.missionId, `mission created: ${ids.missionId}`, {
    run_id: ids.runId, execution_id: ids.executionId, agent: ids.agent,
    tenant: ids.tenant, capability: ids.capability, prompt_digest: ids.promptDigest,
  });
  journal.appendEvent('MC_RUN_QUEUED', ids.missionId, `run queued: ${ids.runId}`, {
    run_id: ids.runId, execution_id: ids.executionId, agent: ids.agent, tenant: ids.tenant,
  });
  journal.appendEvent('MC_EXECUTION_STARTED', ids.missionId, `execution started: ${ids.executionId}`, {
    run_id: ids.runId, execution_id: ids.executionId, agent: ids.agent, tenant: ids.tenant,
  });
  journal.appendEvent('MC_AGENT_AUTHORIZED', ids.missionId, `agent ${ids.agent} authorized for ${ids.capability}`, {
    run_id: ids.runId, execution_id: ids.executionId, capabilities_granted: [ids.capability],
    work_order_id: ids.workOrderId, tenant: ids.tenant,
  });
  journal.appendEvent('MC_ARTIFACT_PUBLISHED', ids.missionId, 'evidence record published: execution-receipt.json', {
    kind: 'evidence', path: ids.evidencePath, sha256: ids.evidenceDigest,
  });
  journal.appendEvent(outcome.eventType, ids.missionId, outcome.summary, outcome.data);
}

async function run(ctx) {
  const caseName = 'unknown-ambiguous';
  const missionId = ctx.missionId(caseName);
  const bundle = new Bundle(ctx.outRoot, caseName, missionId);
  const journal = new HarnessJournal(path.join(bundle.dir, 'journal.jsonl'));
  const provider = makeProvider(bundle.dir, 'ambiguous-scheduler');

  const runId = `${missionId}-r1`;
  const executionId = `${missionId}-x1`;
  const workOrderId = require('crypto').createHash('sha256')
    .update('workorder:' + executionId + ':attempt-1', 'utf8').digest('hex').slice(0, 16);

  // --- Dispatch layer: lane A's repaired scheduler, verbatim patch code ---
  const rt = new WorkerRuntime();
  rt.register('observation', {
    async handle() {
      provider.effect({ customer: 'cust-lanef-2', op: 'ambiguous' });
      // returns nothing — undefined. The WR-lane discovery.
    },
  }, { eventTypes: ['LANE_F_AMBIGUOUS'] });

  const stub = new StubMissionRuntime();
  const { scheduler, events } = makeScheduler(stub, rt);
  const mission = {
    mission_id: missionId, mission_type: 'LEAD_FOLLOWUP',
    payload: { event_type: 'LANE_F_AMBIGUOUS', event_id: `evt-${missionId}`, source: 'lane-f' },
  };
  stub.seed(mission);

  // Capture the dispatch receipt WITHOUT an extra worker run: wrap dispatch
  // so the scheduler's single invocation records its own receipt.
  let receipt = null;
  const innerDispatch = rt.dispatch.bind(rt);
  rt.dispatch = async (event) => { receipt = await innerDispatch(event); return receipt; };

  const logs = await captureConsole(async () => {
    await scheduler._dispatch(mission);       // poll cycle 1
    await stub.reclaimRetryPending();         // poll cycle 2
    for (const m of await stub.getPending()) await scheduler._dispatch(m);
    await stub.reclaimRetryPending();         // poll cycle 3
    for (const m of await stub.getPending()) await scheduler._dispatch(m);
  });
  bundle.write('dispatch-receipt.json', receipt);

  const m = stub.get(missionId);
  const holds = scheduler.getReconciliationLog();

  bundle.check('dispatch receipt proves a worker matched', receipt.matched === true && typeof receipt.worker === 'string', receipt);
  bundle.check('dispatch receipt records the undefined return honestly', receipt.result === undefined, { result: receipt.result });
  bundle.check('outcome is UNKNOWN: mission row untouched (still running)', m.status === 'running', { status: m.status });
  bundle.check('mission NOT completed', m.status !== 'completed');
  bundle.check('mission NOT failed (no FAILED collapse)', m.status !== 'failed', { status: m.status });
  bundle.check('zero automatic retry (retries=0, no retry_pending)', (m.retries || 0) === 0 && m.status !== 'retry_pending', { retries: m.retries, status: m.status });
  bundle.check('UNKNOWN reconciled as HOLD (observable)', holds.length === 1, { holds: holds.length });
  bundle.check('HOLD event emitted (MISSION_RECONCILE_HOLD)', events.emitted.some((e) => e.type === 'MISSION_RECONCILE_HOLD'));
  bundle.check('scheduler stats.unknown === 1', scheduler.getStats().unknown === 1, scheduler.getStats());
  bundle.check('zero fabricated "no worker matched" narrative', !/no worker matched/i.test(logs));
  bundle.check('no failure error recorded on mission', m.last_error === undefined, { last_error: m.last_error });

  // --- Effect: exactly one physical effect for one logical mission ---
  bundle.write('effect-count.json', { effects: provider.count() });
  bundle.check('exactly 1 effect (no duplicate dispatch)', provider.count() === 1, { effects: provider.count() });

  // --- Evidence record (the artifact the event plane links) ---
  const evidenceRecord = {
    adapter: 'lane-f-harness/1.0.0', mission_id: missionId, run_id: runId,
    execution_id: executionId, work_order_id: workOrderId, tenant_id: 'happy-place',
    dispatch_receipt: receipt, outcome: 'UNKNOWN', reason: 'matched worker returned no result — effect unproven',
    effect_count: provider.count(), holds: holds.length,
  };
  const evPath = bundle.write('execution-receipt.json', evidenceRecord);
  const evDigest = require('crypto').createHash('sha256').update(JSON.stringify(evidenceRecord), 'utf8').digest('hex');

  // --- Event plane: the full lifecycle on the existing envelope ---
  emitLifecycle(journal, {
    missionId, runId, executionId, agent: 'lane-f-synthetic-worker', tenant: 'happy-place',
    capability: 'text.summarize', promptDigest: 'synthetic', workOrderId,
    evidencePath: evPath, evidenceDigest: evDigest,
  }, {
    eventType: 'MC_RUN_UNKNOWN',
    summary: 'outcome unknown: matched worker returned no result — effect may have occurred',
    data: {
      run_id: runId, execution_id: executionId,
      reason: 'matched worker returned no result — effect unproven',
      reconciliation_state: 'RECONCILIATION IN PROGRESS',
      evidence: { dispatch_receipt: receipt, effect_count: provider.count() },
    },
  });
  const journalEvents = journal.read();
  bundle.writeText('events.jsonl', journalEvents.map((e) => JSON.stringify(e)).join('\n') + '\n');
  bundle.check('unknown event recorded (MC_RUN_UNKNOWN)', journalEvents.some((e) => e.event_type === 'MC_RUN_UNKNOWN'));
  bundle.check('no execution_failed event exists for this attempt',
    !journalEvents.some((e) => e.event_type === 'MC_RUN_FAILED'));

  // --- Projection: UNKNOWN renders honestly ---
  const asOf = new Date().toISOString();
  const doc = projectJournalFile(path.join(bundle.dir, 'journal.jsonl'), asOf);
  const row = doc.missions.find((x) => x.mission_id === missionId);
  bundle.write('projection.json', JSON.parse(stableStringify(doc)));
  bundle.check('projection has the mission row', !!row);
  bundle.check('projected status is UNKNOWN', row && row.status === 'UNKNOWN', row && row.status);
  bundle.check('projected status is NOT FAILED', row && row.status !== 'FAILED');
  bundle.check('projected status is NOT NO_MATCH', row && row.status !== 'NO_MATCH');
  bundle.check('reconciliation_state is IN PROGRESS', row && row.reconciliation_state === 'RECONCILIATION IN PROGRESS', row && row.reconciliation_state);
  bundle.check('retry is not authorized (no proven non-execution)', row && row.result.outcome === 'unknown');

  // --- Refresh / replay parity ---
  const parity = await refreshReplayParity({ journalPath: path.join(bundle.dir, 'journal.jsonl'), bundle, asOf });
  bundle.check('refresh parity (fresh-process re-projection byte-identical)', parity.refreshParity);
  bundle.check('replay parity (delete + re-project byte-identical)', parity.replayParity);
  bundle.check('negative control (appended event changes projection)', parity.negativeControl);
  bundle.write('ui-state.json', { note: 'synthetic case: MC read seam is the projector output (see design Q5 resolution)', status: row.status, reconciliation_state: row.reconciliation_state });

  return bundle.verdict({ case_file: 'unknown-ambiguous.js' });
}

module.exports = { run };
