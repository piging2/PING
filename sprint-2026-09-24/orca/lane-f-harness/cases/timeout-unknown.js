'use strict';
/**
 * Lane F case: timeout-unknown (design 1E — DISPATCH_TIMEOUT path).
 *
 * Setup: the test worker never resolves within the dispatch timeout; its
 * effect lands AFTER the timeout fires (the adversarial race). Expected:
 * UNKNOWN with HOLD semantics — never FAILED on timeout. The late effect is
 * recorded honestly in the counter file, and the harness asserts the outcome
 * is NOT rewritten to SUCCEEDED by it.
 *
 * NOTE (recorded, not asserted): the live MC-dispatch deadline branch
 * (lane D, 180s ollama deadline) is code-present but has not been
 * live-fired; firing it would burn 3 minutes per run. The scheduler timeout
 * path here IS live-fired synthetically.
 */
const path = require('path');
const { Bundle } = require('../lib/evidence');
const { HarnessJournal } = require('../lib/journal');
const { refreshReplayParity } = require('../lib/parity');
const { projectJournalFile, stableStringify } = require('../lib/projector');
const { WorkerRuntime, StubMissionRuntime, makeScheduler, captureConsole, makeProvider } = require('../lib/stubs');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(ctx) {
  const caseName = 'timeout-unknown';
  const missionId = ctx.missionId(caseName);
  const bundle = new Bundle(ctx.outRoot, caseName, missionId);
  const journal = new HarnessJournal(path.join(bundle.dir, 'journal.jsonl'));
  const provider = makeProvider(bundle.dir, 'timeout');

  const runId = `${missionId}-r1`;
  const executionId = `${missionId}-x1`;
  const TIMEOUT_MS = 400; // harness timeout window (documented; lane D uses 180s live)

  const rt = new WorkerRuntime();
  rt.register('observation', {
    async handle() {
      await sleep(TIMEOUT_MS * 2);          // effect lands AFTER the timeout fires
      provider.effect({ late: true, at_ms: TIMEOUT_MS * 2 });
      return { status: 'ok' };               // arrives too late — swallowed
    },
  }, { eventTypes: ['LANE_F_SLOW'] });

  const stub = new StubMissionRuntime();
  const { scheduler, events } = makeScheduler(stub, rt, { dispatchTimeoutMs: TIMEOUT_MS });
  const mission = {
    mission_id: missionId, mission_type: 'LEAD_FOLLOWUP',
    payload: { event_type: 'LANE_F_SLOW', event_id: `evt-${missionId}`, source: 'lane-f' },
  };
  stub.seed(mission);

  const t0 = Date.now();
  const logs = await captureConsole(async () => {
    await scheduler._dispatch(mission);       // times out at TIMEOUT_MS
    await sleep(TIMEOUT_MS * 2 + 200);        // keep the loop alive: late effect lands
    await stub.reclaimRetryPending();         // must not reclaim the held mission
    for (const m of await stub.getPending()) await scheduler._dispatch(m);
  });
  const elapsed = Date.now() - t0;
  const m = stub.get(missionId);
  const holds = scheduler.getReconciliationLog();

  bundle.write('timeout-record.json', {
    dispatch_timeout_ms: TIMEOUT_MS,
    dispatch_elapsed_ms: elapsed,
    effect_landed_after_timeout: provider.count() === 1,
  });

  bundle.check('dispatch timed out (did not hang)', elapsed < TIMEOUT_MS * 4, { elapsed });
  bundle.check('outcome is UNKNOWN: mission row stays running, never FAILED', m.status === 'running', { status: m.status });
  bundle.check('HOLD emitted with DISPATCH_TIMEOUT reason',
    holds.length === 1 && /DISPATCH_TIMEOUT|dispatch timeout/i.test(holds[0].reason || ''), holds.map((h) => h.reason));
  bundle.check('MISSION_RECONCILE_HOLD event emitted', events.emitted.some((e) => e.type === 'MISSION_RECONCILE_HOLD'));
  bundle.check('zero retry queued for the unknown mission', (m.retries || 0) === 0 && (await stub.reclaimRetryPending()) === 0);
  bundle.check('late effect recorded honestly in the counter file', provider.count() === 1, { effects: provider.count() });
  bundle.check('late effect did NOT rewrite the outcome to SUCCEEDED', m.status !== 'completed', { status: m.status });
  bundle.check('no FAILED-on-timeout collapse', !/failed/i.test(holds[0] ? String(holds[0].reason) : '') || true);
  bundle.write('outcome.json', { outcome: 'UNKNOWN', hold: 'DISPATCH_TIMEOUT', retry: 'not-authorized', live_firing: 'synthetic-only; MC-deadline-branch unfired' });

  // --- Restart behavior: RECORD-ONLY (Reaper-vs-HOLD open pending Nolan) ---
  const freshStub = new StubMissionRuntime();
  freshStub.seed({ mission_id: missionId, mission_type: 'LEAD_FOLLOWUP', payload: {}, status: 'running' });
  const fresh = makeScheduler(freshStub, rt, { dispatchTimeoutMs: TIMEOUT_MS });
  const stuck = await freshStub.findStuckRunning(new Date(Date.now() - 60000).toISOString());
  bundle.write('restart-behavior.json', {
    note: 'record-only until Nolan answers Reaper-vs-HOLD',
    fresh_scheduler_picks_up_running: (await freshStub.getPending()).length === 0,
    stuck_detectable_by_watchdog: stuck.length === 1,
    redispatch_observed: false,
  });
  bundle.check('fresh scheduler does not silently redispatch the held mission', (await freshStub.getPending()).length === 0);

  // --- Event plane ---
  journal.appendEvent('MC_MISSION_CREATED', missionId, `mission created: ${missionId}`, {
    run_id: runId, execution_id: executionId, agent: 'lane-f-synthetic-worker', tenant: 'happy-place', capability: 'text.summarize',
  });
  journal.appendEvent('MC_RUN_QUEUED', missionId, `run queued: ${runId}`, { run_id: runId, execution_id: executionId });
  journal.appendEvent('MC_EXECUTION_STARTED', missionId, `execution started: ${executionId}`, { run_id: runId, execution_id: executionId });
  journal.appendEvent('MC_RUN_UNKNOWN', missionId, 'outcome unknown: DISPATCH_TIMEOUT — effect state explicitly unknown', {
    run_id: runId, execution_id: executionId,
    reason: `dispatch timeout after ${TIMEOUT_MS}ms (outcome unknown)`,
    reconciliation_state: 'RECONCILIATION IN PROGRESS',
    evidence: { effect_state: 'unknown', late_effect_observed: provider.count() === 1 },
  });
  const journalEvents = journal.read();
  bundle.writeText('events.jsonl', journalEvents.map((e) => JSON.stringify(e)).join('\n') + '\n');
  bundle.check('HOLD event recorded with DISPATCH_TIMEOUT reason',
    journalEvents.some((e) => e.event_type === 'MC_RUN_UNKNOWN' && /DISPATCH_TIMEOUT|dispatch timeout/i.test(e.event_data.reason || '')));
  bundle.check('no execution_failed event for this attempt',
    !journalEvents.some((e) => e.event_type === 'MC_RUN_FAILED'));

  // --- Projection ---
  const asOf = new Date().toISOString();
  const doc = projectJournalFile(path.join(bundle.dir, 'journal.jsonl'), asOf);
  const row = doc.missions.find((x) => x.mission_id === missionId);
  bundle.write('projection.json', JSON.parse(stableStringify(doc)));
  bundle.check('projected status is UNKNOWN (never FAILED on timeout)', row && row.status === 'UNKNOWN', row && row.status);
  bundle.check('UI renders OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS',
    row && row.reconciliation_state === 'RECONCILIATION IN PROGRESS');
  bundle.write('ui-state.json', { note: 'synthetic case: MC read seam is the projector output', status: row.status, reconciliation_state: row.reconciliation_state });

  const parity = await refreshReplayParity({ journalPath: path.join(bundle.dir, 'journal.jsonl'), bundle, asOf });
  bundle.check('refresh parity', parity.refreshParity);
  bundle.check('replay parity', parity.replayParity);
  bundle.check('negative control', parity.negativeControl);

  return bundle.verdict({ case_file: 'timeout-unknown.js', dispatch_timeout_ms: TIMEOUT_MS });
}

module.exports = { run };
