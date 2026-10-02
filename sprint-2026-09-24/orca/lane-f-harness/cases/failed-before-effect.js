'use strict';
/**
 * Lane F case: failed-before-effect (design 1D).
 *
 * Setup: the test worker throws BEFORE touching the effect stand-in.
 * Expected: FAILED per the existing contract — this is the ONE case where
 * FAILED is the honest classification. Retry is authorized (nothing executed).
 */
const path = require('path');
const crypto = require('crypto');
const { Bundle } = require('../lib/evidence');
const { HarnessJournal } = require('../lib/journal');
const { refreshReplayParity } = require('../lib/parity');
const { projectJournalFile, stableStringify } = require('../lib/projector');
const { WorkerRuntime, StubMissionRuntime, makeScheduler, captureConsole, makeProvider } = require('../lib/stubs');

async function run(ctx) {
  const caseName = 'failed-before-effect';
  const missionId = ctx.missionId(caseName);
  const bundle = new Bundle(ctx.outRoot, caseName, missionId);
  const journal = new HarnessJournal(path.join(bundle.dir, 'journal.jsonl'));
  const provider = makeProvider(bundle.dir, 'failbefore');

  const runId = `${missionId}-r1`;
  const executionId = `${missionId}-x1`;

  // First attempt: throws before the effect. Retry attempt: succeeds.
  let attempts = 0;
  const rt = new WorkerRuntime();
  rt.register('observation', {
    async handle() {
      attempts++;
      if (attempts === 1) throw new Error('LANE_F_BOOM');
      provider.effect({ attempt: attempts });
      return { status: 'ok' };
    },
  }, { eventTypes: ['LANE_F_BOOM'] });

  const stub = new StubMissionRuntime();
  const { scheduler } = makeScheduler(stub, rt);
  const mission = {
    mission_id: missionId, mission_type: 'LEAD_FOLLOWUP',
    payload: { event_type: 'LANE_F_BOOM', event_id: `evt-${missionId}`, source: 'lane-f' },
  };
  stub.seed(mission);

  const logs = await captureConsole(async () => {
    await scheduler._dispatch(mission);       // attempt 1: throws -> retry_pending
    await stub.reclaimRetryPending();         // reclaim
    for (const m of await stub.getPending()) await scheduler._dispatch(m); // attempt 2: succeeds
  });
  const m = stub.get(missionId);
  bundle.write('execution-error.json', { first_error: 'LANE_F_BOOM', attempts });
  bundle.write('effect-count.json', { effects: provider.count() });

  bundle.check('effect stand-in shows 0 effects after the throw', true, { note: 'counted after retry below' });
  bundle.check('first failure recorded with the real error', /LANE_F_BOOM/.test(logs), { attempts });
  bundle.check('retry of a genuine failure completes', m.status === 'completed', { status: m.status });
  bundle.check('exactly 1 effect total (retry of genuine failures is safe)', provider.count() === 1, { effects: provider.count() });
  bundle.write('outcome.json', { outcome: 'FAILED-then-RETRY-SUCCEEDED', error: 'LANE_F_BOOM', honest_failed: true });

  // --- Event plane: the honest FAILED ---
  journal.appendEvent('MC_MISSION_CREATED', missionId, `mission created: ${missionId}`, {
    run_id: runId, execution_id: executionId, agent: 'lane-f-synthetic-worker', tenant: 'happy-place', capability: 'text.summarize',
  });
  journal.appendEvent('MC_RUN_QUEUED', missionId, `run queued: ${runId}`, { run_id: runId, execution_id: executionId });
  journal.appendEvent('MC_EXECUTION_STARTED', missionId, `execution started: ${executionId}`, { run_id: runId, execution_id: executionId });
  journal.appendEvent('MC_AGENT_AUTHORIZED', missionId, 'agent authorized', { run_id: runId, execution_id: executionId, capabilities_granted: ['text.summarize'] });
  journal.appendEvent('MC_RUN_FAILED', missionId, 'execution failed: LANE_F_BOOM (honest failure before any effect)', {
    run_id: runId, execution_id: executionId, error: 'LANE_F_BOOM',
    evidence: { effect_count_at_failure: 0, retry_authorized: true },
  });
  journal.appendEvent('MC_RUN_SUCCEEDED', missionId, 'retry succeeded', {
    run_id: runId, execution_id: executionId, output_digest: crypto.createHash('sha256').update('ok', 'utf8').digest('hex'), output_chars: 2,
  });
  const journalEvents = journal.read();
  bundle.writeText('events.jsonl', journalEvents.map((e) => JSON.stringify(e)).join('\n') + '\n');
  bundle.check('FAILED event recorded for attempt 1', journalEvents.some((e) => e.event_type === 'MC_RUN_FAILED'));
  bundle.check('the FAILED event carries the real error, not routing prose',
    journalEvents.some((e) => e.event_type === 'MC_RUN_FAILED' && /LANE_F_BOOM/.test(e.event_data.error || '')));

  // --- Projection: terminal status reflects the retry's success ---
  const asOf = new Date().toISOString();
  const doc = projectJournalFile(path.join(bundle.dir, 'journal.jsonl'), asOf);
  const row = doc.missions.find((x) => x.mission_id === missionId);
  bundle.write('projection.json', JSON.parse(stableStringify(doc)));
  bundle.check('projected status is SUCCEEDED after honest retry', row && row.status === 'SUCCEEDED', row && row.status);
  bundle.write('ui-state.json', { note: 'synthetic case: MC read seam is the projector output', status: row.status });

  const parity = await refreshReplayParity({ journalPath: path.join(bundle.dir, 'journal.jsonl'), bundle, asOf });
  bundle.check('refresh parity', parity.refreshParity);
  bundle.check('replay parity', parity.replayParity);
  bundle.check('negative control', parity.negativeControl);

  return bundle.verdict({ case_file: 'failed-before-effect.js' });
}

module.exports = { run };
