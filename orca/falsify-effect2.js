'use strict';
// falsify-effect2.js - FALSIFICATION attempt: produce EFFECT #2 for one logical op.
// Two separate OS processes call the REAL EffectExecutor.execute() with the
// same mission/event (same op key), staggered so both pass the idempotency
// gate before either worker commits its write-ahead ledger row.
// Physical effects are counted via a shared append-only counter file.
// argv: role(a|b) missionId counterFile commitDelayMs startDelayMs
// No em dashes.
const fs = require('fs');
const path = require('path');
const api = require('/home/nolan/workspace/orca/unknown-outcome-experiments/effect-api.js');
const { sleep } = require('/home/nolan/workspace/orca/unknown-outcome-experiments/lib.js');

async function main() {
  const [role, missionId, counterFile, commitDelayMs, startDelayMs] = process.argv.slice(2);
  if (startDelayMs && Number(startDelayMs) > 0) await sleep(Number(startDelayMs));

  const stack = await api.makeStack({ timeoutMs: 30000 });
  const opKey = api.deriveOpKey({ missionId, effect: 'falsify:FALSE_EFFECT', input: { n: 1 } });

  const workerRuntime = {
    async dispatch(event) {
      // Physical effect: append to the shared counter (the "provider" executed).
      fs.appendFileSync(counterFile, JSON.stringify({ ts: Date.now(), role, opKey }) + '\n');
      // Well-behaved worker: commit as soon as the outcome is known.
      const d = Number(commitDelayMs) || 0;
      if (d > 0) await sleep(d);
      await event.effect.commit({ ok: true, by: 'falsify-' + role });
      return { status: 'ok' };
    },
  };
  stack.executor = new api.REAL.EffectExecutor({
    pool: stack.pool, eventRuntime: stack.eventRuntime, ledger: stack.ledger,
    reconciler: stack.reconciler, workerRuntime, timeoutMs: 30000,
  });

  const mission = { mission_id: missionId, payload: { _effect_consequence: 'low' } };
  const event = { event_type: 'FALSE_EFFECT', payload: { n: 1 } };
  try {
    const out = await stack.executor.execute({ mission, workerName: 'falsify', event, attempt: 1 });
    console.log(JSON.stringify({ role, status: out.status, opKey }));
  } catch (e) {
    console.log(JSON.stringify({ role, threw: e.name, message: e.message }));
  } finally {
    await api.endStack(stack);
  }
}
main().catch((e) => { console.error('FALSIFY FATAL', e); process.exit(1); });
