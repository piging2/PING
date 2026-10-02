'use strict';
/**
 * Lane F case: concurrency-AB (design §2) + adversarial variants V1–V3.
 *
 * Two independent agents dispatched concurrently through the orca-adapter
 * (lane C) with synthetic transports. Nothing may collide: identity, run,
 * execution, workspace, artifacts, events.
 *
 * Genuine concurrency: each side runs in its own worker thread, and the two
 * synthetic transports rendezvous on a shared barrier before dwelling, so
 * the execution windows provably overlap. Promise.all alone would serialize
 * the synchronous transports and make the claim vacuous.
 *
 * Outcome-independence setup: A is forced into UNKNOWN (ambiguous handler:
 * effect performed, no verifiable report) while B runs the happy path to
 * SUCCEEDED. B must be unaffected by A's HOLD/retry machinery.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Worker } = require('worker_threads');
const { Bundle } = require('../lib/evidence');
const { HarnessJournal } = require('../lib/journal');
const { refreshReplayParity } = require('../lib/parity');
const { projectJournalFile, stableStringify } = require('../lib/projector');
const { executionOpts, sha256hex, mintWorkOrderId } = require('../lib/fixtures');
const { makeProvider } = require('../lib/stubs');

function rand(n) { return crypto.randomBytes(n).toString('hex'); }
function shaFile(p) { return crypto.createHash('sha256').update(fs.readFileSync(p), 'utf8').digest('hex'); }

function windowsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function fileTreeContains(dir, needles) {
  const hits = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else {
        const c = fs.readFileSync(p, 'utf8');
        for (const n of needles) if (c.includes(n)) hits.push({ file: p, needle: n });
      }
    }
  };
  walk(dir);
  return hits;
}

function runSide(workerData) {
  return new Promise((resolve, reject) => {
    const w = new Worker(path.join(__dirname, '..', 'lib', 'conc-worker.js'), { workerData });
    const timer = setTimeout(() => { w.terminate(); reject(new Error(`worker timeout: side ${workerData.side}`)); }, 60000);
    w.once('message', (msg) => { clearTimeout(timer); w.terminate(); resolve(msg); });
    w.once('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

async function baseRun(bundle, journal, wsRoot, variant, briefOverride) {
  // variant: 'base' | 'V1' (same prompt) | 'V2' (same worker impl) | 'V3' (A killed)
  const tag = variant === 'base' ? 'conc' : `conc-${variant}`;
  const missionA = `lane-f-${tag}-A-${rand(6)}`;
  const missionB = `lane-f-${tag}-B-${rand(6)}`;
  const dirA = path.join(wsRoot, 'A');
  const dirB = path.join(wsRoot, 'B');
  fs.mkdirSync(dirA, { recursive: true });
  fs.mkdirSync(dirB, { recursive: true });

  const briefA = briefOverride || 'bounded synthetic prompt A: summarize the quarterly maintenance log';
  const briefB = briefOverride || 'bounded synthetic prompt B: draft the service reminder notice';

  const provA = makeProvider(dirA, 'effect-a');
  const provB = makeProvider(dirB, 'effect-b');

  const woA = mintWorkOrderId(`${missionA}-x1`, '1');
  const woB = mintWorkOrderId(`${missionB}-x1`, '1');

  const execOptsA = executionOpts({
    missionId: missionA, runId: `${missionA}-r1`, executionId: `${missionA}-x1`,
    agentId: 'hermes', capability: 'text.summarize',
    namespace: 'tenant::happy-place', tenantId: 'happy-place',
    taskBrief: briefA, input: { side: 'A', variant }, evidenceDir: dirA,
  });
  const execOptsB = executionOpts({
    missionId: missionB, runId: `${missionB}-r1`, executionId: `${missionB}-x1`,
    // V2: same underlying worker implementation (same agentId+capability),
    // different per-dispatch identity (executionId).
    agentId: 'hermes', capability: 'text.summarize',
    namespace: 'tenant::coppersmith-plumbing', tenantId: 'coppersmith-plumbing',
    taskBrief: briefB, input: { side: 'B', variant }, evidenceDir: dirB,
  });
  // transportFn is attached inside the worker; strip it (not cloneable).
  delete execOptsA.transportFn;
  delete execOptsB.transportFn;

  const mkEcho = (missionId, runId, executionId, wo) => ({
    work_order_id: wo,
    mission_id: `mission-control:${missionId}:${runId}`,
    task_id: `${executionId}:attempt-1`,
    attempt: '1',
  });

  // Shared barrier: both transports must enter before either dwells.
  const sab = new SharedArrayBuffer(8);

  const [mA, mB] = await Promise.all([
    runSide({
      side: 'A', execOpts: execOptsA,
      workOrderEcho: mkEcho(missionA, `${missionA}-r1`, `${missionA}-x1`, woA),
      effectFile: provA.file, variant, dwellMs: 400, sab,
    }),
    runSide({
      side: 'B', execOpts: execOptsB,
      workOrderEcho: mkEcho(missionB, `${missionB}-r1`, `${missionB}-x1`, woB),
      effectFile: provB.file, variant, dwellMs: 400, sab,
    }),
  ]);
  if (!mA.ok) throw new Error(`side A worker failed: ${mA.error}`);
  if (!mB.ok) throw new Error(`side B worker failed: ${mB.error}`);

  return {
    missionA, missionB, dirA, dirB,
    rA: mA.result, rB: mB.result, tA: mA.seen, tB: mB.seen,
    provA, provB, briefA, briefB, variant,
  };
}

function emitSide(journal, side) {
  const { missionId, runId, executionId, tenant, agent, capability, workOrderId, artifactPath, terminal } = side;
  const artDigest = fs.existsSync(artifactPath) ? shaFile(artifactPath) : null;
  journal.appendEvent('MC_MISSION_CREATED', missionId, `mission created: ${missionId}`, {
    run_id: runId, execution_id: executionId, agent, tenant, capability,
  });
  journal.appendEvent('MC_RUN_QUEUED', missionId, `run queued: ${runId}`, { run_id: runId, execution_id: executionId });
  journal.appendEvent('MC_EXECUTION_STARTED', missionId, `execution started: ${executionId}`, { run_id: runId, execution_id: executionId });
  journal.appendEvent('MC_AGENT_AUTHORIZED', missionId, `agent ${agent} authorized for ${capability}`, {
    run_id: runId, execution_id: executionId, capabilities_granted: [capability], work_order_id: workOrderId,
  });
  if (artifactPath) {
    journal.appendEvent('MC_ARTIFACT_PUBLISHED', missionId, `evidence artifact published: ${path.basename(artifactPath)}`, {
      kind: 'evidence', path: artifactPath, sha256: artDigest,
    });
  }
  journal.appendEvent(terminal.eventType, missionId, terminal.summary, {
    run_id: runId, execution_id: executionId, ...terminal.data,
  });
  return artDigest;
}

async function assertSide(bundle, journal, res, label) {
  const { missionA, missionB, dirA, dirB, rA, rB, tA, tB, provA, provB, briefA, briefB, variant } = res;
  const pfx = label ? `${label}: ` : '';

  // 0. Barrier honesty: both transports rendezvoused.
  bundle.check(`${pfx}barrier rendezvous (both transports in flight)`,
    tA.barrierPeerArrived === true && tB.barrierPeerArrived === true,
    { A: tA.barrierPeerArrived, B: tB.barrierPeerArrived });

  // 1. Overlap proof (else the "concurrency" claim is vacuous).
  const overlap = windowsOverlap(tA.startedAt, tA.endedAt, tB.startedAt, tB.endedAt);
  bundle.check(`${pfx}execution windows overlap (genuinely concurrent)`, overlap, {
    A: [tA.startedAt, tA.endedAt], B: [tB.startedAt, tB.endedAt],
  });
  bundle.write(`${label || 'base'}-dispatch-timeline.json`, {
    A: { startedAt: tA.startedAt, endedAt: tA.endedAt },
    B: { startedAt: tB.startedAt, endedAt: tB.endedAt },
    overlap,
  });

  // 2. Identity / run / execution non-collision: all ID families pairwise distinct.
  const idsA = { agent_id: 'hermes/A', mission_id: missionA, run_id: `${missionA}-r1`, execution_id: `${missionA}-x1`, work_order_id: rA.work_order_id, artifact: rA.artifactPath };
  const idsB = { agent_id: 'hermes/B', mission_id: missionB, run_id: `${missionB}-r1`, execution_id: `${missionB}-x1`, work_order_id: rB.work_order_id, artifact: rB.artifactPath };
  const idTable = { A: idsA, B: idsB, variant };
  bundle.write(`${label || 'base'}-id-table.json`, idTable);
  for (const k of ['mission_id', 'run_id', 'execution_id', 'work_order_id', 'artifact']) {
    bundle.check(`${pfx}ID family '${k}' pairwise distinct`, idsA[k] !== idsB[k], { A: idsA[k], B: idsB[k] });
  }
  bundle.check(`${pfx}work orders match the deterministic mint`,
    rA.work_order_id === mintWorkOrderId(`${missionA}-x1`, '1') &&
    rB.work_order_id === mintWorkOrderId(`${missionB}-x1`, '1'));
  bundle.check(`${pfx}neither run's record names the other's execution identity`,
    !JSON.stringify(rA).includes(idsB.execution_id) && !JSON.stringify(rB).includes(idsA.execution_id));

  // 3. Prompt-delivery integrity: each agent received its own prompt.
  bundle.check(`${pfx}A received prompt-A (contains own brief)`, tA.promptText && tA.promptText.includes(briefA));
  bundle.check(`${pfx}B received prompt-B (contains own brief)`, tB.promptText && tB.promptText.includes(briefB));
  if (variant !== 'V1') {
    bundle.check(`${pfx}no cross-delivery (A did not receive B's brief)`, !tA.promptText.includes(briefB));
    bundle.check(`${pfx}no cross-delivery (B did not receive A's brief)`, !tB.promptText.includes(briefA));
    bundle.check(`${pfx}prompt digests differ`, tA.promptDigest !== tB.promptDigest);
  } else {
    bundle.check(`${pfx}V1: identical briefs still yield distinct prompt digests (work_order echo differs)`,
      tA.promptDigest !== tB.promptDigest, { digestA: tA.promptDigest, digestB: tB.promptDigest });
  }

  // 4. Workspace isolation + artifact non-collision (bipartite evidence graph).
  const crossA = fileTreeContains(dirA, [missionB, `${missionB}-x1`, rB.work_order_id]);
  const crossB = fileTreeContains(dirB, [missionA, `${missionA}-x1`, rA.work_order_id]);
  bundle.check(`${pfx}workspace A contains no B identity material`, crossA.length === 0, crossA.slice(0, 3));
  bundle.check(`${pfx}workspace B contains no A identity material`, crossB.length === 0, crossB.slice(0, 3));
  const artA = JSON.parse(fs.readFileSync(rA.artifactPath, 'utf8'));
  const artB = JSON.parse(fs.readFileSync(rB.artifactPath, 'utf8'));
  bundle.check(`${pfx}A's evidence link resolves to A's own execution_id`, artA.execution.executionId === `${missionA}-x1`);
  bundle.check(`${pfx}B's evidence link resolves to B's own execution_id`, artB.execution.executionId === `${missionB}-x1`);
  bundle.check(`${pfx}evidence graph is bipartite (no A<->B edge)`,
    !JSON.stringify(artA).includes(missionB) && !JSON.stringify(artB).includes(missionA));
  bundle.write(`${label || 'base'}-evidence-graph.json`, {
    A: { execution_id: artA.execution.executionId, work_order_id: artA.work_order_id, tenant_id: artA.tenant_id },
    B: { execution_id: artB.execution.executionId, work_order_id: artB.work_order_id, tenant_id: artB.tenant_id },
    bipartite: true,
  });

  // 5. Outcome independence.
  const expectAUnknown = variant === 'V3' ? rA.outcome === 'unknown' : (rA.outcome === 'escalated' && rA.honestOutcome === 'unknown');
  bundle.check(`${pfx}A outcome is UNKNOWN (ambiguous/timeout)`, expectAUnknown, { outcome: rA.outcome, honestOutcome: rA.honestOutcome, reason: rA.reason });
  bundle.check(`${pfx}B outcome is SUCCEEDED, unaffected by A`, rB.outcome === 'completed', { outcome: rB.outcome });
  bundle.check(`${pfx}A effect count == ${variant === 'V3' ? 0 : 1}`,
    provA.count() === (variant === 'V3' ? 0 : 1), { effects: provA.count() });
  bundle.check(`${pfx}B effect count == 1`, provB.count() === 1, { effects: provB.count() });
  bundle.check(`${pfx}A tenant threaded into evidence`, rA.tenant_id === 'happy-place', { tenant_id: rA.tenant_id });
  bundle.check(`${pfx}B tenant threaded into evidence`, rB.tenant_id === 'coppersmith-plumbing', { tenant_id: rB.tenant_id });

  // 6. Events: per-mission sets disjoint, correlation ids don't cross.
  emitSide(journal, {
    missionId: missionA, runId: `${missionA}-r1`, executionId: `${missionA}-x1`,
    tenant: 'happy-place', agent: 'hermes', capability: 'text.summarize',
    workOrderId: rA.work_order_id, artifactPath: rA.artifactPath,
    terminal: {
      eventType: 'MC_RUN_UNKNOWN',
      summary: `outcome unknown: ${rA.reason}`,
      data: {
        reason: rA.reason, reconciliation_state: 'RECONCILIATION IN PROGRESS',
        evidence: { adapter_outcome: rA.outcome, honest_outcome: rA.honestOutcome || rA.outcome, effect_count: provA.count() },
      },
    },
  });
  const outB = rB.artifactPath ? JSON.parse(fs.readFileSync(rB.artifactPath, 'utf8')) : null;
  const outputDigest = outB && outB.envelope ? sha256hex(JSON.stringify(outB.envelope.output)) : null;
  emitSide(journal, {
    missionId: missionB, runId: `${missionB}-r1`, executionId: `${missionB}-x1`,
    tenant: 'coppersmith-plumbing', agent: 'hermes', capability: 'text.summarize',
    workOrderId: rB.work_order_id, artifactPath: rB.artifactPath,
    terminal: {
      eventType: 'MC_RUN_SUCCEEDED',
      summary: `run succeeded: ${missionB}-r1`,
      data: { output_digest: outputDigest, output_chars: JSON.stringify(outB.envelope.output).length, evidence: { effect_count: provB.count() } },
    },
  });

  const evA = new Set(journal.eventsFor(missionA).map((e) => e.event_id));
  const evB = new Set(journal.eventsFor(missionB).map((e) => e.event_id));
  const inter = [...evA].filter((id) => evB.has(id));
  bundle.check(`${pfx}event sets disjoint (no shared event ids)`, inter.length === 0, { intersection: inter });

  return { idsA, idsB };
}

async function run(ctx) {
  const caseName = 'concurrency-ab';
  const sharedId = `lane-f-conc-shared-${rand(6)}`;
  const bundle = new Bundle(ctx.outRoot, caseName, sharedId);
  const journal = new HarnessJournal(path.join(bundle.dir, 'journal.jsonl'));
  const wsRoot = path.join(bundle.dir, 'workspaces');

  // Base case.
  const base = await baseRun(bundle, journal, path.join(wsRoot, 'base'), 'base');
  await assertSide(bundle, journal, base, 'base');

  // V1: identical prompt content — IDs must still differ.
  const v1 = await baseRun(bundle, journal, path.join(wsRoot, 'V1'), 'V1', 'IDENTICAL PROMPT CONTENT FOR BOTH AGENTS');
  await assertSide(bundle, journal, v1, 'V1');

  // V2: same underlying worker implementation, different per-dispatch identity.
  const v2 = await baseRun(bundle, journal, path.join(wsRoot, 'V2'), 'V2');
  await assertSide(bundle, journal, v2, 'V2');

  // V3: kill A's worker mid-execution (timeout -> UNKNOWN); B unaffected.
  const v3 = await baseRun(bundle, journal, path.join(wsRoot, 'V3'), 'V3');
  await assertSide(bundle, journal, v3, 'V3');

  // Projection independence over the shared journal: 8 mission rows, correct statuses.
  bundle.writeText('events.jsonl', journal.read().map((e) => JSON.stringify(e)).join('\n') + '\n');
  const asOf = new Date().toISOString();
  const doc = projectJournalFile(path.join(bundle.dir, 'journal.jsonl'), asOf);
  bundle.write('projection.json', JSON.parse(stableStringify(doc)));
  const expectUnknown = [base.missionA, v1.missionA, v2.missionA, v3.missionA];
  const expectSucceeded = [base.missionB, v1.missionB, v2.missionB, v3.missionB];
  bundle.check('projection has all 8 mission rows', doc.missions.length === 8, { rows: doc.missions.length });
  for (const mid of expectUnknown) {
    const row = doc.missions.find((x) => x.mission_id === mid);
    bundle.check(`projection: ${mid.slice(0, 30)}... is UNKNOWN`, row && row.status === 'UNKNOWN', row && row.status);
  }
  for (const mid of expectSucceeded) {
    const row = doc.missions.find((x) => x.mission_id === mid);
    bundle.check(`projection: ${mid.slice(0, 30)}... is SUCCEEDED`, row && row.status === 'SUCCEEDED', row && row.status);
  }
  bundle.write('ui-state.json', { note: 'synthetic case: MC read seam is the projector output', rows: doc.missions.length });

  const parity = await refreshReplayParity({ journalPath: path.join(bundle.dir, 'journal.jsonl'), bundle, asOf });
  bundle.check('refresh parity', parity.refreshParity);
  bundle.check('replay parity', parity.replayParity);
  bundle.check('negative control', parity.negativeControl);
  bundle.write('effect-counts.json', { note: 'per-side effect counts asserted inside each variant block' });

  return bundle.verdict({ case_file: 'concurrency-ab.js', variants: ['base', 'V1', 'V2', 'V3'], concurrency_mechanism: 'worker_threads + shared barrier' });
}

module.exports = { run };
