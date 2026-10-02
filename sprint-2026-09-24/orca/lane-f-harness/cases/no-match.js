'use strict';
/**
 * Lane F case: explicit no-match (design 1C).
 *
 * Setup: dispatch an event type with no registered worker. Expected:
 * NO_MATCH — and this is the ONLY case where "no worker matched" prose is
 * truthful. The 1B/1C discrimination proof: a consumer reading only the
 * event plane must be able to tell 1B (UNKNOWN) from 1C (NO_MATCH).
 */
const path = require('path');
const crypto = require('crypto');
const { Bundle } = require('../lib/evidence');
const { HarnessJournal } = require('../lib/journal');
const { refreshReplayParity } = require('../lib/parity');
const { projectJournalFile, stableStringify } = require('../lib/projector');
const { WorkerRuntime, StubMissionRuntime, makeScheduler, captureConsole, makeProvider } = require('../lib/stubs');

async function run(ctx) {
  const caseName = 'no-match';
  const missionId = ctx.missionId(caseName);
  const bundle = new Bundle(ctx.outRoot, caseName, missionId);
  const journal = new HarnessJournal(path.join(bundle.dir, 'journal.jsonl'));
  const provider = makeProvider(bundle.dir, 'nomatch');

  const runId = `${missionId}-r1`;
  const executionId = `${missionId}-x1`;
  const workOrderId = 'wo-' + crypto.createHash('sha256')
    .update('workorder:' + executionId + ':attempt-1', 'utf8').digest('hex').slice(0, 16);

  const rt = new WorkerRuntime();
  rt.register('observation', {
    async handle() { provider.effect({}); return { status: 'ok' }; },
  }, { eventTypes: ['BILL_CUSTOMER'] }); // registered, but NOT for the dispatched type

  const stub = new StubMissionRuntime();
  const { scheduler, dlq } = makeScheduler(stub, rt);
  const mission = {
    mission_id: missionId, mission_type: 'LEAD_FOLLOWUP',
    payload: { event_type: 'LANE_F_UNREGISTERED', event_id: `evt-${missionId}`, source: 'lane-f' },
  };
  stub.seed(mission);

  const receipt = await rt.dispatch({ event_type: 'LANE_F_UNREGISTERED' });
  bundle.write('dispatch-receipt.json', receipt);

  const logs = await captureConsole(async () => { await scheduler._dispatch(mission); });
  const m = stub.get(missionId);

  bundle.check('dispatch receipt observes matched=false', receipt.matched === false, receipt);
  bundle.check('dispatch receipt observes routeExists=false', receipt.routeExists === false, receipt);
  bundle.check('outcome is NO_MATCH: terminal fail, zero retry', m.status === 'failed' && m.retries === 1,
    { status: m.status, retries: m.retries });
  bundle.check('nothing reclaimed for redispatch', (await stub.reclaimRetryPending()) === 0);
  bundle.check('no effect performed', provider.count() === 0, { effects: provider.count() });
  bundle.check('error prose states the OBSERVED receipt (not an inference)',
    /no worker matched event_type=LANE_F_UNREGISTERED/.test(m.last_error || '') &&
    /matched=false, routeExists=false/.test(m.last_error || ''), { last_error: m.last_error });
  bundle.check('NO_MATCH routed to DLQ for human repair', dlq.letters.length === 1);
  bundle.check('not recorded as UNKNOWN (no HOLD)', scheduler.getReconciliationLog().length === 0);
  bundle.write('outcome.json', { outcome: 'NO_MATCH', terminal: true, retry: 'not-authorized', dlq: dlq.letters.length });

  // --- Event plane ---
  journal.appendEvent('MC_MISSION_CREATED', missionId, `mission created: ${missionId}`, {
    run_id: runId, execution_id: executionId, agent: 'lane-f-synthetic-worker',
    tenant: 'happy-place', capability: 'text.summarize',
  });
  journal.appendEvent('MC_RUN_QUEUED', missionId, `run queued: ${runId}`, { run_id: runId, execution_id: executionId });
  journal.appendEvent('MC_EXECUTION_STARTED', missionId, `execution started: ${executionId}`, { run_id: runId, execution_id: executionId });
  journal.appendEvent('MC_RUN_NO_MATCH', missionId, 'explicit no-match: no worker registered for event type', {
    run_id: runId, execution_id: executionId,
    reason: 'no worker matched event_type=LANE_F_UNREGISTERED (dispatch receipt: matched=false, routeExists=false)',
    evidence: { dispatch_receipt: receipt },
  });
  const journalEvents = journal.read();
  bundle.writeText('events.jsonl', journalEvents.map((e) => JSON.stringify(e)).join('\n') + '\n');

  // --- Discrimination proof vs 1B: same-plane, different records ---
  const fs = require('fs');
  const receiptB = JSON.parse(fs.readFileSync(path.join(ctx.caseDir('unknown-ambiguous'), 'dispatch-receipt.json'), 'utf8'));
  const eventsB = ctx.readCaseEvents('unknown-ambiguous');
  const termB = eventsB.filter((e) => ['MC_RUN_UNKNOWN', 'MC_RUN_FAILED', 'MC_RUN_NO_MATCH'].includes(e.event_type)).map((e) => e.event_type);
  const termC = journalEvents.filter((e) => ['MC_RUN_UNKNOWN', 'MC_RUN_FAILED', 'MC_RUN_NO_MATCH'].includes(e.event_type)).map((e) => e.event_type);
  const disc = {
    '1B receipt': { matched: receiptB.matched, routeExists: receiptB.routeExists, result: receiptB.result === undefined ? 'undefined' : receiptB.result },
    '1C receipt': { matched: receipt.matched, routeExists: receipt.routeExists, result: receipt.result === undefined ? 'undefined' : receipt.result },
    '1B terminal event types': termB,
    '1C terminal event types': termC,
  };
  bundle.check('1B receipt proves matched=true (worker ran)', receiptB.matched === true, disc['1B receipt']);
  bundle.check('1C receipt proves matched=false, routeExists=false (nobody ran)', receipt.matched === false && receipt.routeExists === false, disc['1C receipt']);
  bundle.check('1B and 1C terminal event types differ on the event plane',
    JSON.stringify(termB) !== JSON.stringify(termC), { termB, termC });
  bundle.write('discrimination-proof.json', disc);

  // --- Projection ---
  const asOf = new Date().toISOString();
  const doc = projectJournalFile(path.join(bundle.dir, 'journal.jsonl'), asOf);
  const row = doc.missions.find((x) => x.mission_id === missionId);
  bundle.write('projection.json', JSON.parse(stableStringify(doc)));
  bundle.check('projected status is NO_MATCH', row && row.status === 'NO_MATCH', row && row.status);
  bundle.check('projected status is NOT FAILED', row && row.status !== 'FAILED');
  bundle.check('projected status is NOT UNKNOWN', row && row.status !== 'UNKNOWN');
  bundle.write('ui-state.json', { note: 'synthetic case: MC read seam is the projector output', status: row.status });

  // --- Refresh / replay parity ---
  const parity = await refreshReplayParity({ journalPath: path.join(bundle.dir, 'journal.jsonl'), bundle, asOf });
  bundle.check('refresh parity', parity.refreshParity);
  bundle.check('replay parity', parity.replayParity);
  bundle.check('negative control', parity.negativeControl);

  return bundle.verdict({ case_file: 'no-match.js', _logs_excerpt: logs.slice(0, 200) });
}

module.exports = { run };
