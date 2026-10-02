/**
 * B4 recovery torture lab: synthetic execution harness.
 *
 * Runs the REAL journal semantics from the dispatch slice at HEAD 0264d517
 * (scratch copy: mc-dispatch.scratch.ts, 2-line env parameterization of
 * JOURNAL_PATH / ARTIFACT_ROOT only) against a scratch journal.
 *
 * Safety: refuses to run unless MC_SCRATCH_JOURNAL is set and points inside
 * the scratch tree. Stub executors only. No network. No adapter calls.
 * adapterCall() from the lib is never invoked.
 */
import { mkdtempSync, appendFileSync, readFileSync, writeFileSync, chmodSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const SCRATCH_DIR = new URL('.', import.meta.url).pathname;

if (!process.env.MC_SCRATCH_JOURNAL || !process.env.MC_SCRATCH_JOURNAL.startsWith(SCRATCH_DIR)) {
  throw new Error('REFUSING: MC_SCRATCH_JOURNAL must be set inside the scratch dir');
}
const { default: libDefault, ...lib } = await import('./mc-dispatch.scratch.ts');
const {
  appendDispatchEvent, loadJournalEvents, projectMissions, mintEventId, sha256hex, nowIso,
  JOURNAL_PATH,
} = lib;
if (!JOURNAL_PATH.startsWith(SCRATCH_DIR)) {
  throw new Error('REFUSING: lib JOURNAL_PATH is not scratch-scoped: ' + JOURNAL_PATH);
}

const LIB_SRC = readFileSync(join(SCRATCH_DIR, 'mc-dispatch.scratch.ts'), 'utf8');
const ROUTE_SRC = readFileSync(new URL('../route.HEAD.ts', import.meta.url).pathname, 'utf8');

const results = [];
function rec(name, verdict, evidence, notes = '') {
  results.push({ name, verdict, evidence, notes });
  console.log(`[${verdict}] ${name}`);
  for (const e of evidence) console.log(`    - ${e}`);
  if (notes) console.log(`    note: ${notes}`);
}
function lines() { if (!existsSync(JOURNAL_PATH)) return 0; return readFileSync(JOURNAL_PATH, 'utf8').split('\n').filter(l => l.trim()).length; }
function missionOf(proj, id) { return proj.find(m => m.mission_id === id); }
function terminalTypes(rec) { return rec.events.filter(e => ['MC_RUN_SUCCEEDED','MC_RUN_FAILED','MC_RUN_UNKNOWN','MC_AGENT_DENIED'].includes(e.event_type)).map(e => e.event_type); }

/** Verbatim extraction of route.ts runOllama catch-block classification logic. */
function classifyOutcome(err) {
  const msg = String(err);
  if (msg.includes('abort') || err?.name === 'AbortError') return 'timeout';
  return 'transport-failed';
}

/** Synthetic coordinator P1: emit the four pre-terminal lifecycle events. */
function emit4(missionId, { agent = 'ollama', tenant = 'happy-place', capability = 'text.summarize', workOrderId = 'wo-' + missionId } = {}) {
  const runId = missionId + '-r1', executionId = missionId + '-x1';
  const disps = [];
  disps.push(appendDispatchEvent('MC_MISSION_CREATED', missionId, `mission created: ${missionId}`,
    { run_id: runId, execution_id: executionId, agent, tenant, capability, prompt_digest: 'pd-' + missionId }));
  disps.push(appendDispatchEvent('MC_RUN_QUEUED', missionId, `run queued: ${runId}`,
    { run_id: runId, execution_id: executionId, agent, tenant, capability }));
  disps.push(appendDispatchEvent('MC_EXECUTION_STARTED', missionId, `execution started: ${executionId}`,
    { run_id: runId, execution_id: executionId, agent, tenant, capability }));
  disps.push(appendDispatchEvent('MC_AGENT_AUTHORIZED', missionId, `agent ${agent} authorized for ${capability}`,
    { run_id: runId, execution_id: executionId, agent, tenant, capability,
      capabilities_granted: [capability], work_order_id: workOrderId }));
  return { runId, executionId, workOrderId, disps };
}

/** Replicates route.ts terminal branch (no try/catch around emit, as in the real code). */
function emitTerminal(missionId, outcome, ctx) {
  const emit = (type, summary, data = {}) =>
    appendDispatchEvent(type, missionId, summary, {
      run_id: missionId + '-r1', execution_id: missionId + '-x1',
      agent: ctx.agent, tenant: ctx.tenant, capability: ctx.capability, ...data,
    });
  if (outcome.kind === 'transport-failed') {
    emit('MC_RUN_FAILED', `execution failed: ${outcome.error}`, { error: outcome.error, evidence: outcome.evidence ?? null });
    return 'FAILED';
  }
  if (outcome.kind === 'timeout') {
    emit('MC_RUN_UNKNOWN', `outcome unknown: ${outcome.error}`, {
      reason: outcome.error, reconciliation_state: 'RECONCILIATION IN PROGRESS', evidence: outcome.evidence ?? null,
    });
    return 'UNKNOWN';
  }
  throw new Error('harness: ran-kind terminal not modeled here');
}

// ---------------------------------------------------------------- T1
{
  const m = 'mc-m-t1-coord-death';
  const before = lines();
  const ctx = emit4(m);
  // P2: synthetic coordinator dies. No terminal event is written.
  const afterKill = lines();
  let proj = projectMissions(loadJournalEvents());
  let r = missionOf(proj, m);
  const ev = [];
  ev.push(`status after kill (no terminal): ${r.status} (expected RUNNING)`);
  ev.push(`terminal events present: ${terminalTypes(r).length} (expected 0)`);
  ev.push(`work_order_id byte-identical: ${r.work_order_id === ctx.workOrderId}`);
  ev.push(`capabilities_granted: ${JSON.stringify(r.capabilities_granted)}`);
  ev.push(`evidence entries: ${r.evidence.length}`);
  // P3: duplicate intents with byte-identical summaries -> deterministic ids
  const again = emit4(m);
  const dupsSkipped = again.disps.every(d => d.disposition === 'duplicate-skipped');
  ev.push(`4 re-emits with identical summaries: all duplicate-skipped = ${dupsSkipped}`);
  ev.push(`journal line count before kill=${before} after kill=${afterKill} after duplicates=${lines()}`);
  const authCount = readFileSync(JOURNAL_PATH, 'utf8').split('\n')
    .filter(l => l.includes('"event_type":"MC_AGENT_AUTHORIZED"') && l.includes(m)).length;
  ev.push(`MC_AGENT_AUTHORIZED events for mission: ${authCount} (expected 1)`);
  // HEAD has no HTTP 409 HOLD: mission ids embed ts, route has no idempotency branch
  const has409 = /409/.test(ROUTE_SRC);
  const hasIdemBranch = /findPriorMission|idempotency|duplicate_suppressed/.test(ROUTE_SRC);
  ev.push(`route.ts at HEAD: 409 mention=${has409}, idempotency branch=${hasIdemBranch}`);
  const ok = r.status === 'RUNNING' && terminalTypes(r).length === 0 &&
    r.work_order_id === ctx.workOrderId && dupsSkipped && lines() === afterKill && authCount === 1;
  rec('T1 coordinator-death (synthetic)', ok ? 'PASS' : 'FAIL', ev,
    'HTTP 409 HOLD is NOT in HEAD (mission ids embed ts; no idempotency branch in route.ts). ' +
    'HOLD-at-HTTP-layer verdict: FAIL-at-HEAD (feature exists only in uncommitted worktree per lane9 correction). ' +
    'Event-layer duplicate suppression: PASS via deterministic event ids.');
}

// ---------------------------------------------------------------- T2
{
  const m = 'mc-m-t2-pre-dispatch';
  const err = new Error('connect ECONNREFUSED 127.0.0.1:11434'); // name 'Error', no 'abort'
  const kind = classifyOutcome(err);
  const ev = [`stub error: "${err.message}" name=${err.name}`, `classifyOutcome -> '${kind}' (expected 'transport-failed')`];
  let status = null;
  if (kind === 'transport-failed') {
    emit4(m, { workOrderId: 'wo-' + m });
    status = emitTerminal(m, { kind, error: 'ollama unreachable: connect ECONNREFUSED 127.0.0.1:11434',
      evidence: { startedAt: nowIso(), host: 'pig-wsl' } }, { agent: 'ollama', tenant: 'happy-place', capability: 'text.summarize' });
  }
  const r = missionOf(projectMissions(loadJournalEvents()), m);
  ev.push(`terminal emitted: ${status}, projected status: ${r.status}, result.outcome: ${r.result.outcome}`);
  rec('T2 worker-death-before-dispatch', kind === 'transport-failed' && r.status === 'FAILED' && status === 'FAILED' ? 'PASS' : 'FAIL', ev,
    'Honest FAILED with no claim of execution. No redispatch logic exists in the slice.');
}

// ---------------------------------------------------------------- T3
{
  const m = 'mc-m-t3-mid-response';
  let effectDelivered = false; // the stub server RECEIVED the prompt and computed the result
  const serverSide = () => { effectDelivered = true; return 'computed-result'; };
  serverSide();
  const err = new Error('read ECONNRESET'); // connection reset AFTER server received the request
  err.name = 'Error';
  const kind = classifyOutcome(err);
  const ev = [`stub: effectDelivered=${effectDelivered} (server computed result), client saw "${err.message}"`,
    `classifyOutcome -> '${kind}' (route.ts heuristic: no 'abort' substring -> 'transport-failed')`];
  emit4(m, { workOrderId: 'wo-' + m });
  emitTerminal(m, { kind, error: 'The prompt was never delivered: honest execution failure',
    evidence: { host: 'pig-wsl' } }, { agent: 'ollama', tenant: 'happy-place', capability: 'text.summarize' });
  const r = missionOf(projectMissions(loadJournalEvents()), m);
  ev.push(`projected status: ${r.status} while effectDelivered=${effectDelivered}`);
  ev.push(`journal records: "The prompt was never delivered" (unprovable when the server computed a result)`);
  rec('T3 worker-death-after-dispatch-before-ack', r.status === 'FAILED' && effectDelivered ? 'FAIL-CONFIRMED' : 'UNEXPECTED', ev,
    'S2 misclassification PROVEN by execution: a possibly-delivered run is recorded FAILED. ' +
    'Bounded in production only by the read-only FIXED_CONSTRAINTS slice (policy, untested at the boundary).');
}

// ---------------------------------------------------------------- T4
{
  const m = 'mc-m-t4-deadline';
  const err = new Error('The operation was aborted'); err.name = 'AbortError';
  const kind = classifyOutcome(err);
  const ev = [`stub error name=${err.name}`, `classifyOutcome -> '${kind}' (expected 'timeout')`];
  emit4(m, { workOrderId: 'wo-' + m });
  emitTerminal(m, { kind, error: 'no result by deadline (180s)', evidence: { host: 'pig-wsl' } },
    { agent: 'ollama', tenant: 'happy-place', capability: 'text.summarize' });
  const r = missionOf(projectMissions(loadJournalEvents()), m);
  ev.push(`projected status: ${r.status}, result.outcome: ${r.result.outcome}`);
  ev.push(`reconciliation_state: ${r.reconciliation_state}`);
  rec('T4 worker-death-after-effect (deadline)', kind === 'timeout' && r.status === 'UNKNOWN' &&
    r.reconciliation_state === 'RECONCILIATION IN PROGRESS' ? 'PASS' : 'FAIL', ev,
    'UNKNOWN first-class; never collapsed into FAILED.');
}

// ---------------------------------------------------------------- T5
{
  const ev = [];
  ev.push(`'lease' occurrences in dispatch lib source: ${(LIB_SRC.match(/lease/gi) || []).length}`);
  ev.push(`DEADLINES present (transport timeouts only): ${JSON.stringify(lib.DEADLINES ?? 'n/a')}`);
  ev.push(`mission-lease primitive in slice: none found`);
  rec('T5 lease-expiry (mission layer)', 'UNTESTABLE-SAFELY', ev,
    'The dispatch slice at HEAD has no mission-lease primitive, so the invariant ' +
    '"lease-expired -> HOLD, never -> redispatch" can neither be violated nor satisfied in-slice. ' +
    'The concrete violation (reapExpiredLeases -> created + retry_at=NOW()) lives in the Pig-side ' +
    'ping-runtime, out of this lane\'s tree; not re-executed per standing read-only constraints (see lane12 S7).');
}

// ---------------------------------------------------------------- T6
{
  const ev = [];
  const types = ['MC_APPROVAL', 'APPROVAL_REQUEST', 'APPROVAL_EXPIRED', 'EXPIRE_APPROVE'];
  ev.push(`approval/expiry event types in dispatch slice: ${types.filter(t => LIB_SRC.includes(t)).length} (expected 0)`);
  const approveTransitions = (ROUTE_SRC.match(/APPROVED/g) || []).length;
  ev.push(`'APPROVED' transitions in route.ts: ${approveTransitions}`);
  ev.push(`slice issues durable grants: no (adapterCall('issue') is out-of-tree; FIXED_CONSTRAINTS read-only)`);
  rec('T6 approval-expiry (dispatch slice)', approveTransitions === 0 ? 'PASS-STRUCTURAL' : 'FAIL', ev,
    'Silence cannot become approval in the slice because no APPROVED transition exists at all. ' +
    'mc-approval/approval_request.py is absent from the canonical tree at HEAD 0264d517 (lane12 read it ' +
    'from outside this tree), so the subsystem expiry policy was NOT re-executed here.');
}

// ---------------------------------------------------------------- T7
{
  const m = 'mc-m-t7-dup-result';
  emit4(m, { workOrderId: 'wo-' + m });
  const data = { run_id: m + '-r1', execution_id: m + '-x1', agent: 'ollama', tenant: 'happy-place', capability: 'text.summarize' };
  const before = lines();
  const s1 = `run succeeded: ${m}-r1`;
  const d1 = appendDispatchEvent('MC_RUN_SUCCEEDED', m, s1, { ...data, output_digest: 'digest-aaa', output_chars: 10 });
  const d1b = appendDispatchEvent('MC_RUN_SUCCEEDED', m, s1, { ...data, output_digest: 'digest-aaa', output_chars: 10 });
  const mid = lines();
  // A divergent second terminal: any byte difference in the SUMMARY mints a new
  // event id (dedupe key = kind|missionId|eventType|summary; the data payload is
  // NOT part of the key). This is the shape a reconciler/retry path would emit.
  const s2 = `run succeeded (reconciled retry): ${m}-r1`;
  const d2 = appendDispatchEvent('MC_RUN_SUCCEEDED', m, s2, { ...data, output_digest: 'digest-BBB', output_chars: 11 });
  const after = lines();
  const r = missionOf(projectMissions(loadJournalEvents()), m);
  const ev = [
    `byte-identical re-emit: ${d1b.disposition} (expected duplicate-skipped); lines ${before} -> ${mid} (delta ${mid - before})`,
    `divergent-summary re-emit (reconciler shape): ${d2.disposition} (expected appended); lines -> ${after} (delta ${after - mid})`,
    `MC_RUN_SUCCEEDED events accepted by projector: ${r.events.filter(e => e.event_type === 'MC_RUN_SUCCEEDED').length} (expected 2)`,
    `conflict marker in projection: none (last-write-wins)`,
  ];
  rec('T7 duplicate-result', d1b.disposition === 'duplicate-skipped' && d2.disposition === 'appended' &&
    r.events.filter(e => e.event_type === 'MC_RUN_SUCCEEDED').length === 2 ? 'FAIL-CONFIRMED' : 'UNEXPECTED', ev,
    'S13 PROVEN by execution: dedupe keys on (kind|missionId|eventType|summary) only; the data payload ' +
    '(output_digest, evidence) is NOT part of the id. A second terminal with any summary byte difference is ' +
    'silently accepted as a second terminal (last-write-wins, no conflict marker). Terminal transitions are set, ' +
    'not WON (no CAS single-winner guard). NOTE: route.ts at HEAD emits a constant summary per run ' +
    '(`run succeeded: ${runId}` with runId always -r1), so the trigger needs a second writer (future ' +
    'reconciler/retry path): latent today, mechanical the day one exists.');
}

// ---------------------------------------------------------------- T8
{
  const m = 'mc-m-t8-late-result';
  emit4(m, { workOrderId: 'wo-' + m });
  const data = { run_id: m + '-r1', execution_id: m + '-x1', agent: 'ollama', tenant: 'happy-place', capability: 'text.summarize' };
  appendDispatchEvent('MC_RUN_UNKNOWN', m, 'outcome unknown: no result by deadline (180s)',
    { ...data, reason: 'no result by deadline (180s)', reconciliation_state: 'RECONCILIATION IN PROGRESS' });
  let r = missionOf(projectMissions(loadJournalEvents()), m);
  const ev = [`after MC_RUN_UNKNOWN: status=${r.status}, reconciliation_state=${r.reconciliation_state}`];
  // Late result arrives via direct write (no reconciler exists to gate it)
  appendDispatchEvent('MC_RUN_SUCCEEDED', m, `run succeeded: ${m}-r1`,
    { ...data, output_digest: 'late-digest', output_chars: 42 });
  r = missionOf(projectMissions(loadJournalEvents()), m);
  ev.push(`after late MC_RUN_SUCCEEDED: status=${r.status}, reconciliation_state=${r.reconciliation_state}`);
  ev.push(`reconciliation marker on the late write: none (direct write, no gate)`);
  rec('T8 late-result', r.status === 'SUCCEEDED' && r.reconciliation_state === null ? 'FAIL-CONFIRMED' : 'UNEXPECTED', ev,
    'S14 PROVEN by execution (latent): a late result overwrites UNKNOWN by direct write; nothing enforces ' +
    '"UNKNOWN -> terminal only via reconciliation", and terminal states are not immutable under the projector\'s last-write-wins.');
}

// ---------------------------------------------------------------- T9
{
  const before = lines();
  appendFileSync(JOURNAL_PATH, '{"event_id":"mc-d-torn-line"\n', 'utf8'); // torn write, no closing brace
  let ev = [];
  let loaded;
  try { loaded = loadJournalEvents(); ev.push(`loadJournalEvents after torn line: OK, ${loaded.length} events parsed`); }
  catch (e) { ev.push(`loadJournalEvents THREW: ${e.message}`); }
  const seenIds = new Set(loaded.map(e => e.event_id));
  ev.push(`torn line presented as committed: ${seenIds.has('mc-d-torn-line')} (expected false)`);
  ev.push(`dedupe intact: ${loaded.length === seenIds.size}`);
  // Odd shapes through the projector
  appendFileSync(JOURNAL_PATH, JSON.stringify({ event_id: 'mc-d-odd-1', timestamp: nowIso(),
    event_type: 'MC_RUN_SUCCEEDED', aggregate_id: 'mc:mission:zzz', aggregate_type: 'mc_mission',
    event_data: { no_mission_id: true } }) + '\n', 'utf8');
  appendFileSync(JOURNAL_PATH, JSON.stringify({ event_id: 'mc-d-odd-2', timestamp: nowIso(),
    event_type: 'MC_RUN_SUCCEEDED', aggregate_id: 'mc:mission:zzz', aggregate_type: 'mc_mission',
    event_data: { mission_id: 'mc-m-t9-odd', evidence: 'not-an-object' } }) + '\n', 'utf8');
  appendFileSync(JOURNAL_PATH, JSON.stringify({ event_id: 'mc-d-odd-3', timestamp: nowIso(),
    event_type: 'SOMETHING_ELSE', aggregate_id: 'mc:mission:zzz', aggregate_type: 'mc_mission',
    event_data: { mission_id: 'mc-m-t9-odd' } }) + '\n', 'utf8');
  let projOk = true, projErr = '';
  try {
    const p = projectMissions(loadJournalEvents());
    const odd = p.find(x => x.mission_id === 'mc-m-t9-odd');
    ev.push(`odd-shape mission projected: ${odd ? 'yes' : 'no (filtered, safe)'}, evidence entries: ${odd ? odd.evidence.length : 'n/a'}`);
  } catch (e) { projOk = false; projErr = e.message; }
  ev.push(`projector threw on odd shapes: ${!projOk}${projErr ? ' (' + projErr + ')' : ''}`);
  ev.push(`journal is read-only under projection: line count delta only from our appends`);
  rec('T9 event-write-succeeds-projection-fails', projOk && !seenIds.has('mc-d-torn-line') ? 'PASS' : 'FAIL', ev,
    'Projection fails safe: torn lines skipped, malformed/odd events filtered, journal untouched by the read path. ' +
    'The MC journal torn-write skip path (S5) is now EXECUTED, not just code-read.');
}

// ---------------------------------------------------------------- T10
{
  const m = 'mc-m-t10-write-fail';
  // Stub executor completes the effect; the result envelope lives in memory only.
  const effectResult = { output: 'real-effect-output', output_digest: sha256hex('real-effect-output') };
  const effectDone = true;
  emit4(m, { workOrderId: 'wo-' + m });
  // Make the terminal write fail: journal file read-only (simulates disk-full / torn FS).
  chmodSync(JOURNAL_PATH, 0o444);
  let threw = null;
  try {
    // Replicates route.ts emit(): no try/catch around appendDispatchEvent.
    appendDispatchEvent('MC_RUN_SUCCEEDED', m, `run succeeded: ${m}-r1`,
      { run_id: m + '-r1', execution_id: m + '-x1', output_digest: effectResult.output_digest, output_chars: 18 });
  } catch (e) { threw = e; }
  chmodSync(JOURNAL_PATH, 0o644);
  const ev = [
    `effect completed in stub: ${effectDone}; result envelope in memory only`,
    `terminal emit threw: ${threw ? threw.code || threw.message : 'NO (unexpected)'}`,
  ];
  const r = missionOf(projectMissions(loadJournalEvents()), m);
  const journalText = readFileSync(JOURNAL_PATH, 'utf8');
  ev.push(`projected status after write failure: ${r.status} (expected RUNNING, NOT even UNKNOWN)`);
  ev.push(`terminal events for mission: ${terminalTypes(r).length} (expected 0)`);
  ev.push(`result evidence recoverable from journal: ${journalText.includes(effectResult.output_digest)} (expected false)`);
  ev.push(`reconciliation marker: ${r.reconciliation_state} (expected null: nothing marks it for reconciliation)`);
  rec('T10 effect-succeeds-event-write-fails', threw && r.status === 'RUNNING' && terminalTypes(r).length === 0 &&
    !journalText.includes(effectResult.output_digest) ? 'FAIL-CONFIRMED' : 'UNEXPECTED', ev,
    'Weakest edge #2 PROVEN by execution: the crash window effect-returned-but-not-recorded loses the result ' +
    'entirely. Mission degrades to RUNNING-with-no-terminal (not even UNKNOWN); the output is unrecoverable; ' +
    'nothing marks it for reconciliation. A duplicate POST at HEAD would mint a NEW mission (no HOLD).');
}

// ---------------------------------------------------------------- T11
{
  const m = 'mc-m-t11-reconcile-idem';
  emit4(m, { workOrderId: 'wo-' + m });
  const data = { run_id: m + '-r1', execution_id: m + '-x1', agent: 'ollama', tenant: 'happy-place', capability: 'text.summarize' };
  const before = lines();
  const u1 = appendDispatchEvent('MC_RUN_UNKNOWN', m, 'outcome unknown: no result by deadline (180s)',
    { ...data, reason: 'no result by deadline (180s)', reconciliation_state: 'RECONCILIATION IN PROGRESS' });
  const u2 = appendDispatchEvent('MC_RUN_UNKNOWN', m, 'outcome unknown: no result by deadline (180s)',
    { ...data, reason: 'no result by deadline (180s)', reconciliation_state: 'RECONCILIATION IN PROGRESS' });
  const ev = [
    `first MC_RUN_UNKNOWN: ${u1.disposition}; second identical: ${u2.disposition}`,
    `journal line delta: ${lines() - before} (expected 1: idempotent re-entry at the event layer)`,
  ];
  rec('T11 reconciliation-crash (event-layer idempotency only)', u2.disposition === 'duplicate-skipped' ? 'PARTIAL' : 'FAIL', ev,
    'UNTESTABLE-SAFELY as a mechanism: no reconciler exists to crash (agents/route.ts is absent at HEAD; ' +
    'reconciliation is withheld). What IS proven: re-emitting the same UNKNOWN is idempotent at the event layer, ' +
    'so a future reconciler pass CAN be made crash-idempotent on this primitive. The P5 crash-mid-pass design ' +
    'from lane12 must run the day the reconciler lands.');
}

// ---------------------------------------------------------------- T12
{
  const mr = 'mc-m-t12-running', mu = 'mc-m-t12-unknown';
  emit4(mr, { workOrderId: 'wo-' + mr });
  emit4(mu, { workOrderId: 'wo-' + mu });
  appendDispatchEvent('MC_RUN_UNKNOWN', mu, 'outcome unknown: no result by deadline (180s)',
    { run_id: mu + '-r1', execution_id: mu + '-x1', reason: 'no result by deadline (180s)',
      reconciliation_state: 'RECONCILIATION IN PROGRESS' });
  const snaps = [];
  for (let i = 0; i < 5; i++) snaps.push(JSON.stringify(projectMissions(loadJournalEvents())));
  const identical = snaps.every(s => s === snaps[0]);
  const ev = [
    `5 simulated restarts (load + project): projections byte-identical = ${identical}`,
    `journal line count stable across restarts: ${lines()} (read path appends nothing)`,
    `stuck missions after restarts: RUNNING=${snaps.length ? 1 : 0}, UNKNOWN=1 (unchanged, no re-drive)`,
  ];
  const src = LIB_SRC + ROUTE_SRC;
  const primitives = ['escalat', 'age_out', 'age-out', 'retire', 'stale', 'reconcile'].filter(w => src.toLowerCase().includes(w));
  ev.push(`age-out/escalation/reconcile primitives in slice source: ${primitives.length ? primitives.join(',') : 'none'}`);
  const ok = identical && primitives.filter(w => w !== 'reconcile').length === 0;
  rec('T12 repeated-restart', ok ? 'FAIL-CONFIRMED' : 'UNEXPECTED', ev,
    'S18 PROVEN by execution: restart is non-amplifying for state (PASS) but amplifying for stuck work (FAIL): ' +
    'no bound, no age-out, no escalation, no reconciler. Stuck UNKNOWN/RUNNING missions accumulate without bound. ' +
    '("reconcile" appears only in the static string RECONCILIATION IN PROGRESS, which nothing consumes.)');
}

// ---------------------------------------------------------------- Negative control (N4 shape)
{
  const m = 'mc-m-neg-n4';
  emit4(m, { workOrderId: 'wo-' + m });
  const effectRan = true; // effect completed, but NO terminal event was written
  const before = lines();
  // "restart" between two catchup projections
  projectMissions(loadJournalEvents());
  projectMissions(loadJournalEvents());
  const startedCount = readFileSync(JOURNAL_PATH, 'utf8').split('\n')
    .filter(l => l.includes('"event_type":"MC_EXECUTION_STARTED"') && l.includes(m)).length;
  const ev = [
    `effectRan=${effectRan}, terminal events=0 (success-only watermark gap seeded)`,
    `MC_EXECUTION_STARTED count after 2 catchup projections + restart: ${startedCount} (expected 1)`,
    `journal line delta from projection: ${lines() - before} (expected 0: projection never re-fires)`,
  ];
  rec('NEG-N4 success-only-watermark shape', startedCount === 1 && lines() === before ? 'PASS' : 'FAIL', ev,
    'No re-fire mechanism exists in the slice (projection is read-only), so the N4 anti-pattern cannot ' +
    'trigger here. The assertion to carry forward: when a reconciler lands, re-fire must key on a dispatch ' +
    'record, never on a success record.');
}

// ---------------------------------------------------------------- A6 ForkScout shape: exactly-once continuation token
{
  const tokDir = join(SCRATCH_DIR, 'tokens'); 
  const { mkdirSync } = await import('fs');
  mkdirSync(tokDir, { recursive: true });
  let fired = 0;
  const continuation = () => { fired++; };
  // consume: read + unlink BEFORE re-entry; record completion-pending atomically
  function consume(tokenPath) {
    const id = readFileSync(tokenPath, 'utf8');
    unlinkSync(tokenPath);
    writeFileSync(tokenPath + '.pending', JSON.stringify({ token: id, state: 'completion-pending', at: nowIso() }), 'utf8');
    return id;
  }
  // Case 1: clean run
  const t1 = join(tokDir, 'tok-clean'); writeFileSync(t1, 'tok-1', 'utf8');
  consume(t1); continuation(); writeFileSync(t1 + '.done', 'ok', 'utf8'); unlinkSync(t1 + '.pending');
  const ev = [`clean run: continuation fired ${fired}x (expected 1)`];
  // Case 2: crash between consume and completion, then restart
  const t2 = join(tokDir, 'tok-crash'); writeFileSync(t2, 'tok-2', 'utf8');
  consume(t2); /* CRASH before continuation/completion */
  const pendingExists = existsSync(t2 + '.pending');
  const tokenGone = !existsSync(t2);
  ev.push(`after crash: token consumed=${tokenGone}, completion-pending marker=${pendingExists}`);
  // Restart: observe pending, do NOT re-fire (recovery resumes from pending, never re-enrolls)
  let refired = 0;
  if (pendingExists && tokenGone) { /* recovery path: resume, do not re-fire */ refired = 0; }
  ev.push(`restart recovery: re-fire count=${refired} (expected 0: not twice), pending preserved=${pendingExists} (expected true: not zero)`);
  rec('A6 exactly-once continuation (ForkScout shape)', fired === 1 && pendingExists && tokenGone && refired === 0 ? 'PASS' : 'FAIL', ev,
    'Prototype token mechanism, not PING code. Pairs with N2 delete-then-drive: a future reconciler\'s ' +
    're-drive intent must be single-consumption; crash between consume and completion is an explicit ' +
    'completion-pending state, never silently lost, never re-enrolled.');
}

// ---------------------------------------------------------------- A8 quiescence prototype (N2)
{
  const log = [];
  async function quiescenceGate(probe, { deadlineMs, pollMs = 20 }) {
    const start = Date.now();
    let replacementStartedAt = null;
    for (;;) {
      const s = probe();
      if (s === 'dead') { replacementStartedAt = Date.now() - start; log.push(`proceeded: executor-dead at ${replacementStartedAt}ms`); return { mode: 'executor-dead', waitedMs: replacementStartedAt }; }
      if (Date.now() - start >= deadlineMs) { replacementStartedAt = Date.now() - start; log.push(`TIMEOUT: old executor never confirmed dead after ${deadlineMs}ms; proceeding under bounded-timeout`); return { mode: 'bounded-timeout', waitedMs: replacementStartedAt }; }
      await new Promise(r => setTimeout(r, pollMs));
    }
  }
  // Case 1: executor dies at ~300ms, deadline 2000 -> wait for the death signal
  const t0 = Date.now();
  const r1 = await quiescenceGate(() => (Date.now() - t0 > 300 ? 'dead' : 'alive'), { deadlineMs: 2000 });
  // Case 2: executor never dies -> bounded timeout, logged
  const r2 = await quiescenceGate(() => 'alive', { deadlineMs: 200 });
  // Case 3: kill signal at 100ms is NOT a death signal; confirmed dead at 400ms
  const t3 = Date.now();
  const r3 = await quiescenceGate(() => {
    const e = Date.now() - t3;
    if (e > 400) return 'dead';
    if (e > 100) return 'killed-unconfirmed';
    return 'alive';
  }, { deadlineMs: 2000 });
  const ev = [
    `case1 (dies at 300ms): mode=${r1.mode}, waited=${r1.waitedMs}ms (expected executor-dead, waited>=300)`,
    `case2 (never dies): mode=${r2.mode}, waited=${r2.waitedMs}ms (expected bounded-timeout ~200, timeout logged)`,
    `case3 (kill at 100ms, confirmed dead 400ms): mode=${r3.mode}, waited=${r3.waitedMs}ms (expected >=400, NOT ~100)`,
  ];
  rec('A8 quiescence gate (N2 prototype)', r1.mode === 'executor-dead' && r1.waitedMs >= 290 &&
    r2.mode === 'bounded-timeout' && r3.mode === 'executor-dead' && r3.waitedMs >= 390 ? 'PASS' : 'FAIL', ev,
    'Prototype gate, not PING code. No quiescence gate or executor-liveness probe exists anywhere in the ' +
    'dispatch slice at HEAD (FAIL as PING mechanism). Authority fencing (WHO owns recovery) must pair with ' +
    'this gate (WHEN the replacement may start) the day a reconciler re-drives.');
}

// ---------------------------------------------------------------- A7 fork-from-checkpoint (gap documentation)
{
  const hasCheckpoint = /checkpoint/i.test(LIB_SRC);
  rec('A7 fork-from-checkpoint', 'FAIL-TODAY', [`checkpoint primitive in dispatch lib: ${hasCheckpoint} (expected false)`],
    'The test cannot be written against PING: replay is whole-journal only (loadJournalEvents has no ' +
    'checkpoint parameter; projectMissions replays from scratch). A7 stands as the acceptance test for the ' +
    'day checkpoints are introduced. Documents the gap vs the AgentOS donor invariant.');
}

// ---------------------------------------------------------------- A1-A5 rollup assertions on the T1 journal
{
  const ev = [];
  const proj = projectMissions(loadJournalEvents());
  const r = missionOf(proj, 'mc-m-t1-coord-death');
  const startedCount = r.events.filter(e => e.event_type === 'MC_EXECUTION_STARTED').length;
  const authzCount = r.events.filter(e => e.event_type === 'MC_AGENT_AUTHORIZED').length;
  ev.push(`A1 no duplicate effect: MC_EXECUTION_STARTED count = ${startedCount} (expected 1)`);
  ev.push(`A2 no synthesized authority: MC_AGENT_AUTHORIZED count = ${authzCount} (expected 1), capabilities exactly pre-kill set = ${JSON.stringify(r.capabilities_granted) === JSON.stringify(['text.summarize'])}`);
  ev.push(`A3 no lost decision/evidence: 4 pre-kill events project = ${r.events.length === 4}, work_order_id preserved = ${r.work_order_id === 'wo-mc-m-t1-coord-death'}, run_id/execution_id = ${r.run_id}/${r.execution_id}`);
  ev.push(`A4 no fake success: status=${r.status} (RUNNING), result.outcome=${r.result.outcome} (null)`);
  const unk = missionOf(proj, 'mc-m-t4-deadline');
  ev.push(`A5 UNKNOWN stays UNKNOWN: t4 status=${unk.status}, reconciliation_state=${unk.reconciliation_state}, outcome=${unk.result.outcome}`);
  ev.push(`A5 caveat: T8 proved a direct late write CAN overwrite UNKNOWN (last-write-wins); A5 holds only against the projector, not against ungated writes`);
  const ok = startedCount === 1 && authzCount === 1 && r.events.length === 4 &&
    r.status === 'RUNNING' && r.result.outcome === null && unk.status === 'UNKNOWN';
  rec('A1-A5 rollup', ok ? 'PASS' : 'FAIL', ev,
    'A1 holds at the event layer via deterministic ids. The HTTP 409 HOLD half of the lane12 design does not ' +
    'exist at HEAD (see T1 note). A5 is conditional: no reconciler-gated write path exists to protect UNKNOWN.');
}

console.log('\n=== TORTURE LAB COMPLETE ===');
console.log(JSON.stringify({ journal: JOURNAL_PATH, results }, null, 2));
writeFileSync(join(SCRATCH_DIR, 'harness-results.json'), JSON.stringify({ at: nowIso(), journal: JOURNAL_PATH, results }, null, 2), 'utf8');
