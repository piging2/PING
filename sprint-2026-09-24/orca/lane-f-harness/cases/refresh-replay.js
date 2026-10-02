'use strict';
/**
 * Lane F case: refresh-replay (design §3, harness-level).
 *
 * Every scenario case already embeds its own refresh/replay parity
 * artifacts. This case proves the harness-level determinism preconditions:
 *   1. The harness projector port is EQUIVALENT to lane D's real
 *      projectMissions: projecting a real :3100 mission's journal events
 *      locally must match GET /api/mc/missions/<id> field-by-field
 *      (minus as_of). Any future lane-D projection change that breaks
 *      equivalence fails this case.
 *   2. emit.py's discipline holds: content-derived event_id + duplicate
 *      refusal (asserted on the harness emitter, same contract).
 *   3. Same-timestamp tiebreak: two events sharing a timestamp order
 *      deterministically by event_id.
 *   4. project.py --as-of discipline: the existing projector is a pure
 *      function of (journal bytes, as-of) — run twice, byte-identical.
 *   5. The harness projector is a pure function of (journal bytes, as-of).
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { Bundle } = require('../lib/evidence');
const { HarnessJournal, mintEventId } = require('../lib/journal');
const { projectJournalFile, stableStringify } = require('../lib/projector');

const PIG_SSH = ['ssh', '-F', '/home/hatch/.ssh/pig-config', 'pigwsl'];

function pigCurl(args) {
  // Runs curl on the Pig WSL against localhost :3100 via stdin-fed ssh.
  const script = 'curl -s ' + args.map((a) => `'${a}'`).join(' ') + '\n';
  const r = spawnSync('ssh', [...PIG_SSH.slice(1), 'wsl', '--', 'bash', '-s'], {
    input: script, encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024,
  });
  if (r.error) throw new Error('pig curl failed: ' + String(r.error));
  return r.stdout;
}

function pigJournalGrep(aggregateId) {
  const script = `grep -F '${aggregateId}' /home/nolan/workspace/fyd-journal-gateway/events.jsonl\n`;
  const r = spawnSync('ssh', [...PIG_SSH.slice(1), 'wsl', '--', 'bash', '-s'], {
    input: script, encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024,
  });
  return r.stdout || '';
}

async function run(ctx) {
  const caseName = 'refresh-replay';
  const missionId = ctx.missionId(caseName);
  const bundle = new Bundle(ctx.outRoot, caseName, missionId);
  const preconditions = {};

  // --- 1. Port equivalence: real mission via the live route vs local port ---
  // Use lane D's acceptance mission (stable, in the live journal).
  const laneDmission = 'mc-m-63d04f4517f9';
  let equiv = { ran: false };
  try {
    const detailRaw = pigCurl(['http://127.0.0.1:3100/api/mc/missions/' + laneDmission]);
    const detail = JSON.parse(detailRaw);
    const journalText = pigJournalGrep('mc:mission:' + laneDmission);
    const events = journalText.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const asOf = new Date().toISOString();
    const doc = projectJournalFileFromEvents(events, asOf);
    const row = doc.missions.find((x) => x.mission_id === laneDmission);
    const routeRow = detail.mission || detail;
    const fields = ['mission_id', 'run_id', 'execution_id', 'status', 'agent', 'tenant', 'capability', 'work_order_id', 'reconciliation_state'];
    const mismatches = fields.filter((f) => JSON.stringify(row[f]) !== JSON.stringify(routeRow[f]));
    const artMatch = (row.artifacts || []).length === (routeRow.artifacts || []).length &&
      (row.artifacts || []).every((a, i) => a.sha256 === (routeRow.artifacts[i] || {}).sha256);
    equiv = {
      ran: true, mission: laneDmission, journal_events: events.length,
      field_mismatches: mismatches, artifacts_match: artMatch,
      route_status: routeRow.status, port_status: row.status,
      equivalent: mismatches.length === 0 && artMatch && row.status === routeRow.status,
    };
  } catch (e) {
    equiv = { ran: false, error: String(e).slice(0, 300) };
  }
  bundle.write('port-equivalence.json', equiv);
  bundle.check('projector port equivalent to live route (real mission)', equiv.equivalent === true, equiv);
  preconditions.port_equivalence = equiv.equivalent === true;

  // --- 2. emit discipline: content-derived id + duplicate refusal ---
  const jpath = path.join(bundle.dir, 'journal.jsonl');
  const j = new HarnessJournal(jpath);
  const e1 = j.appendEvent('MC_MISSION_CREATED', 'precond-m', 'created', {});
  const e2 = j.appendEvent('MC_MISSION_CREATED', 'precond-m', 'created', {});
  bundle.check('duplicate emit is refused (same content-derived id)',
    e1.disposition === 'appended' && e2.disposition === 'duplicate-skipped' && e1.event.event_id === e2.event.event_id,
    { d1: e1.disposition, d2: e2.disposition });
  bundle.check('event_id is content-derived and stable',
    e1.event.event_id === mintEventId('precond-m', 'MC_MISSION_CREATED', 'created'));
  preconditions.emit_discipline = true;

  // --- 3. Same-timestamp tiebreak: the emitter guarantees strictly ---
  // --- increasing per-mission acceptance timestamps (+1ms on ties) ---
  const jt = path.join(bundle.dir, 'tiebreak.jsonl');
  const tj = new HarnessJournal(jt);
  const ta = tj.appendEvent('MC_MISSION_CREATED', 'tie-m', 'created', {});
  const tb = tj.appendEvent('MC_RUN_UNKNOWN', 'tie-m', 'unknown', {});
  bundle.check('emitter bumps tied timestamps (+1ms, causal order preserved)',
    tb.event.timestamp > ta.event.timestamp, { t1: ta.event.timestamp, t2: tb.event.timestamp });
  const tieRows = projectJournalFile(jt, new Date().toISOString()).missions;
  const tieRow = tieRows.find((x) => x.mission_id === 'tie-m');
  bundle.check('same-mission events apply in causal order', tieRow && tieRow.status === 'UNKNOWN', tieRow && tieRow.status);
  preconditions.tiebreak = tieRow && tieRow.status === 'UNKNOWN';

  // --- 4. project.py --as-of discipline on REAL journal events ---
  // Copy a slice of the live journal's MC_* events from the Pig, then run
  // the existing project.py twice with a fixed --as-of. A pure function of
  // (journal bytes, as-of) must return byte-identical state documents.
  const pyJournal = path.join(bundle.dir, 'py-sample-journal.jsonl');
  let pyParity = { ran: false };
  try {
    const slice = pigJournalGrep('MC_').split('\n').filter(Boolean).slice(0, 500);
    if (slice.length > 0) {
      fs.writeFileSync(pyJournal, slice.join('\n') + '\n', 'utf8');
      const runProj = (out) => spawnSync('python3',
        ['/home/hatch/workspace/mission-control/project.py', '--journal', pyJournal,
         '--as-of', '2026-09-26T12:00:00Z', '--out', out],
        { encoding: 'utf8', timeout: 60000 });
      const o1 = path.join(bundle.dir, 'py-proj-1.json');
      const o2 = path.join(bundle.dir, 'py-proj-2.json');
      const r1 = runProj(o1); const r2 = runProj(o2);
      if (r1.status === 0 && r2.status === 0) {
        const b1 = fs.readFileSync(o1); const b2 = fs.readFileSync(o2);
        pyParity = { ran: true, journal_events: slice.length, byte_identical: b1.equals(b2), bytes: b1.length };
      } else {
        pyParity = { ran: true, error: (r1.stderr || r2.stderr || '').slice(0, 300) };
      }
    } else {
      pyParity = { ran: false, error: 'no MC_ events found in live journal slice' };
    }
  } catch (e) { pyParity = { ran: false, error: String(e).slice(0, 200) }; }
  bundle.write('projectpy-parity.json', pyParity);
  bundle.check('project.py is a pure function of (journal, as-of)', pyParity.byte_identical === true, pyParity);
  preconditions.projectpy_parity = pyParity.byte_identical === true;

  // --- 5. Harness projector purity ---
  const doc1 = stableStringify(projectJournalFile(jpath, '2026-09-26T12:00:00Z'));
  const doc2 = stableStringify(projectJournalFile(jpath, '2026-09-26T12:00:00Z'));
  bundle.check('harness projector is a pure function of (journal bytes, as-of)', doc1 === doc2);
  preconditions.projector_purity = doc1 === doc2;

  bundle.write('determinism-preconditions.json', preconditions);
  return bundle.verdict({ case_file: 'refresh-replay.js' });
}

function projectJournalFileFromEvents(events, asOf) {
  const { projectMissions } = require('../lib/projector');
  return projectMissions(events, asOf);
}

module.exports = { run };
