// redteam.mjs
// Red-team battery against the durable runner. Each attack must be caught/contained.
// Prints PASS/FAIL per attack with evidence. Exits nonzero if any attack succeeds.
// No em dashes.

import { DurableStageRunner, sha256Hex, sleep } from './durable-stage-runner.mjs';
import { rmSync } from 'node:fs';

const results = [];
function verdict(name, ok, evidence) {
  results.push({ name, ok, evidence });
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + ' :: ' + evidence);
}

function freshRunner(stages, ledgerPath, extra = {}) {
  try { rmSync(ledgerPath); } catch {}
  try { rmSync(ledgerPath + '.outputs.jsonl'); } catch {}
  const events = [];
  const r = new DurableStageRunner(stages, {
    ledgerPath,
    now: extra.now,
    onEvent: (e) => events.push(e),
  });
  return { r, events };
}

const S = (name, fn, policy = {}, timeouts = {}) => ({ name, fn, policy, timeouts });

// ATTACK 1: workflow lies about completion (claims done, no real output digest).
{
  let calls = 0;
  const stages = [S('S1', async () => ({ ok: 1 })), S('LIAR', async () => { calls++; return 'not-an-object-no-digest'; })];
  const { r, events } = freshRunner(stages, './rt1.jsonl');
  // First run completes normally (liar returns junk but runner digests whatever it got).
  await r.run('rt1', { in: 1 });
  // Now corrupt the ledger: replace LIAR's COMPLETED with a forged record missing output_digest.
  const { readFileSync, writeFileSync } = await import('node:fs');
  const lines = readFileSync('./rt1.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
  const forged = lines.map((l) => (l.stage === 'LIAR' && l.state === 'COMPLETED') ? { ...l, output_digest: null } : l);
  writeFileSync('./rt1.jsonl', forged.map((l) => JSON.stringify(l)).join('\n') + '\n');
  const callsBefore = calls;
  const r2 = new DurableStageRunner(stages, { ledgerPath: './rt1.jsonl', onEvent: () => {} });
  await r2.run('rt1', { in: 1 });
  verdict('A1 liar-stage', calls > callsBefore, 'forged checkpoint rejected (missing output digest), stage re-ran; calls ' + callsBefore + ' -> ' + calls);
}

// ATTACK 2: worker dies mid-heartbeat (stops heartbeating, never returns).
{
  const stages = [S('LONG', async (ctx) => {
    ctx.heartbeat({ p: 1 });
    await sleep(50);
    ctx.heartbeat({ p: 2, partial: 'half-done' });
    await sleep(4000); // dies silently: no more heartbeats, never resolves
    return { done: true };
  }, { maxAttempts: 2, initialMs: 20, maxIntervalMs: 50 }, { startToCloseMs: 20000, heartbeatTimeoutMs: 300 })];
  const { r, events } = freshRunner(stages, './rt2.jsonl');
  let hbDetailsSeen = null;
  const origOnEvent = r.onEvent;
  r.onEvent = (e) => { origOnEvent(e); if (e.type === 'ATTEMPT_START' && e.resumed_from_heartbeat) hbDetailsSeen = true; };
  // Wrap: second attempt must resolve quickly to end the test.
  let n = 0;
  stages[0].fn = async (ctx) => {
    n++;
    if (n === 1) {
      ctx.heartbeat({ p: 2, partial: 'half-done' });
      await sleep(4000);
      return { done: true };
    }
    return { done: true, resumed: true };
  };
  try { await r.run('rt2', {}); } catch {}
  const sawHbTimeout = events.some((e) => e.type === 'ATTEMPT_RETRY' && e.error_class === 'HEARTBEAT_TIMEOUT');
  const sawResume = events.some((e) => e.type === 'ATTEMPT_START' && e.attempt === 2 && e.resumed_from_heartbeat);
  verdict('A2 dead-worker-heartbeat', sawHbTimeout && sawResume, 'heartbeat timeout fired, attempt 2 resumed with prior heartbeat details; events=' + events.filter(e => e.type.startsWith('ATTEMPT')).map(e => e.type + ':' + e.error_class).join(','));
}

// ATTACK 3: clock skew across workers (+5 minutes on one worker's clock).
{
  const realNow = Date.now();
  const skewedNow = () => realNow + 5 * 60 * 1000;
  let order = [];
  const stages = [S('A', async () => { order.push('A'); return { a: 1 }; }), S('B', async () => { order.push('B'); return { b: 2 }; })];
  const { r } = freshRunner(stages, './rt3.jsonl', { now: skewedNow });
  const res = await r.run('rt3', { in: 9 });
  const okOrder = order.join(',') === 'A,B';
  const okDigest = typeof res.finalDigest === 'string' && res.finalDigest.length === 64;
  verdict('A3 clock-skew', okOrder && okDigest, 'skewed clock did not corrupt ordering or digests (decisions are digest/chain based, not timestamp based)');
}

// ATTACK 4: poison pill retrying forever.
{
  // 4a: non-retryable error class -> quarantined after ONE attempt.
  let tries4a = 0;
  const stagesA = [S('P', async () => { tries4a++; const e = new Error('seam breach'); e.errorClass = 'F-SEC'; throw e; },
    { maxAttempts: 10, initialMs: 10, maxIntervalMs: 20, nonRetryable: ['F-SEC'] })];
  const fa = freshRunner(stagesA, './rt4a.jsonl');
  let quarantined = false;
  try { await fa.r.run('rt4a', {}); } catch (e) { quarantined = !!e.quarantined; }
  // 4b: retryable error with maxAttempts 2 -> exactly 2 attempts then DEAD.
  let tries4b = 0;
  const stagesB = [S('P', async () => { tries4b++; const e = new Error('flaky'); e.errorClass = 'TRANSIENT'; throw e; },
    { maxAttempts: 2, initialMs: 10, maxIntervalMs: 20 })];
  const fb = freshRunner(stagesB, './rt4b.jsonl');
  let dead = false;
  try { await fb.r.run('rt4b', {}); } catch (e) { dead = !!e.dead; }
  verdict('A4a poison-pill-nonretryable', tries4a === 1 && quarantined, 'F-SEC ran once then quarantined, no retry loop');
  verdict('A4b poison-pill-bounded', tries4b === 2 && dead, 'TRANSIENT ran exactly 2 attempts then DEAD, no infinite retry');
}

// ATTACK 5: human gate that never answers.
{
  const stages = [
    S('BUILD', async () => ({ built: true })),
    S('GATE', async (ctx) => {
      const decision = await ctx.awaitSignal('owner-approval', 300);
      if (decision.expired) return { gated: 'expired-escalated' };
      return { gated: 'approved', decision };
    }),
  ];
  const { r, events } = freshRunner(stages, './rt5.jsonl');
  const sweep = setInterval(() => r.sweepGates(), 50);
  const t0 = Date.now();
  const res = await r.run('rt5', {});
  clearInterval(sweep);
  const elapsed = Date.now() - t0;
  const expired = events.some((e) => e.type === 'GATE_EXPIRED');
  const parked = events.some((e) => e.type === 'GATE_PARKED');
  // Late signal after expiry: must be deliverable (returns false: no waiter) and must not resurrect wrongly.
  const late = r.signal('rt5', 1, { approved: true });
  verdict('A5 silent-gate', expired && parked && elapsed < 2000 && late === false,
    'gate expired in ' + elapsed + 'ms, GATE_EXPIRED emitted, late signal correctly had no waiter (no phantom resume)');
}

// ATTACK 6: resume must not re-run completed stages (idempotent resume) and must
// detect input divergence. Content-addressed: only stages whose transitive inputs
// changed re-run; a stage with identical input is skipped (not a lie, a dedup).
{
  let counts = { A: 0, B: 0 };
  const stages = [
    S('A', async (ctx, input) => { counts.A++; return { a: input.v }; }),
    S('B', async (ctx, input) => { counts.B++; return { b: input.a * 10 }; }),
  ];
  const { r } = freshRunner(stages, './rt6.jsonl');
  await r.run('rt6', { v: 1 });
  const afterFirst = { ...counts };
  const r2 = new DurableStageRunner(stages, { ledgerPath: './rt6.jsonl', onEvent: () => {} });
  await r2.run('rt6', { v: 1 }); // same input: nothing re-runs
  const afterSame = { ...counts };
  const r3 = new DurableStageRunner(stages, { ledgerPath: './rt6.jsonl', onEvent: () => {} });
  await r3.run('rt6', { v: 2 }); // diverged input: rebuild from stage 0
  verdict('A6 resume-idempotent+divergent',
    afterFirst.A === 1 && afterSame.A === 1 && counts.A === 2 && counts.B === 2,
    'same input re-ran 0 stages; diverged input rebuilt both stages (A:1->1->2, B:1->1->2) because B\'s transitive input changed');
}

// ATTACK 7: content-addressed skip is honest, not a lie. B's input unchanged across
// a diverged run -> B must be skipped (dedup), A re-runs. Skipping here is correct.
{
  let counts = { A: 0, B: 0 };
  const stages = [
    S('A', async (ctx, input) => { counts.A++; return { a: 1 }; }), // output ignores input
    S('B', async (ctx, input) => { counts.B++; return { b: 2 }; }),
  ];
  const { r, events } = freshRunner(stages, './rt7.jsonl');
  await r.run('rt7', { v: 1 });
  const r3 = new DurableStageRunner(stages, { ledgerPath: './rt7.jsonl', onEvent: (e) => events.push(e) });
  await r3.run('rt7', { v: 999 }); // run input diverges, but A's output is input-independent
  const bSkipped = events.some((e) => e.type === 'STAGE_IDEMPOTENT_SKIP' && e.stage === 'B');
  verdict('A7 content-addressed-dedup', counts.A === 2 && counts.B === 1 && bSkipped,
    'A re-ran on diverged input; B skipped via idempotency (identical transitive input), A:1->2 B:1->1');
}

const failed = results.filter((r) => !r.ok);
console.log('---');
console.log(results.length + ' attacks, ' + failed.length + ' uncontained');
process.exit(failed.length ? 1 : 0);
