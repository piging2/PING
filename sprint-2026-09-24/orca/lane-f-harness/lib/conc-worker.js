'use strict';
/**
 * Lane F concurrency worker (worker_threads).
 *
 * Runs ONE side of a concurrency-AB pair: builds a synthetic transport via
 * the shared fixtures, wraps it with a cross-thread barrier so both agents'
 * transports are genuinely in flight at the same time, then runs the real
 * orca-adapter dispatchExecution(). Posts { result, seen } back.
 *
 * The barrier is the honesty mechanism: without it, two synchronous
 * transports serialize and the "concurrency" claim would be vacuous.
 */
const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const crypto = require('crypto');

const fixtures = require('./fixtures');
const adapter = require('/home/hatch/workspace/orca-adapter/adapter.js');

function sha256hex(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }

async function main() {
  const { side, execOpts, workOrderEcho, effectFile, variant, dwellMs, sab } = workerData;
  const view = new Int32Array(sab);
  const seen = { barrierPeerArrived: false, barrierWaitMs: 0 };

  // Rendezvous: signal entry, then wait (bounded) until BOTH transports
  // have entered. Neither side dwells until the peer is inside.
  function barrier() {
    const t0 = Date.now();
    Atomics.add(view, 0, 1);
    Atomics.notify(view, 0);
    while (Atomics.load(view, 0) < 2 && Date.now() - t0 < 15000) {
      Atomics.wait(view, 0, Atomics.load(view, 0), 250);
    }
    seen.barrierWaitMs = Date.now() - t0;
    seen.barrierPeerArrived = Atomics.load(view, 0) >= 2;
  }

  const effect = (detail) => {
    fs.appendFileSync(effectFile, JSON.stringify({ ts: new Date().toISOString(), detail }) + '\n');
  };

  let factory;
  let factoryOpts;
  if (side === 'A' && variant === 'V3') {
    factory = fixtures.timeoutTransport;
    factoryOpts = { dwellMs };
  } else if (side === 'A') {
    factory = fixtures.ambiguousTransport;
    factoryOpts = { effect: (d) => effect({ side: 'A', variant, ...d }), dwellMs, stdout: 'ambiguous worker ran, no envelope' };
  } else {
    factory = fixtures.happyTransport;
    factoryOpts = {
      effect: (d) => effect({ side: 'B', variant, ...d }),
      output: { summary: 'B done' }, dwellMs,
      workOrderEcho,
    };
  }

  const t = factory(factoryOpts);
  const inner = t.fn;
  const wrapped = (prompt, timeoutMs) => {
    seen.promptText = prompt;
    seen.promptDigest = sha256hex(prompt);
    seen.startedAt = new Date().toISOString();
    barrier();
    const out = inner(prompt, timeoutMs);
    seen.endedAt = new Date().toISOString();
    // Merge the fixture's own seen fields (transport timings) without
    // clobbering the barrier-bracketed window.
    seen.fixtureStartedAt = t.seen.startedAt;
    seen.fixtureEndedAt = t.seen.endedAt;
    return out;
  };

  const result = await adapter.dispatchExecution({ ...execOpts, transportFn: wrapped });
  parentPort.postMessage({ ok: true, side, result, seen });
}

main().catch((err) => {
  parentPort.postMessage({ ok: false, side: workerData.side, error: String((err && err.stack) || err).slice(0, 2000) });
});
