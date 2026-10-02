/**
 * HT-BRIDGE-LAUDERING — hostile test for the EventBridge tenant-identity loss.
 *
 * Target (current code, /home/nolan/ping @ c99e1ff36):
 *   ping-runtime/events/event_bridge.js :: _bridgeCanonicalEvents
 *
 * Boundary under test: canonical_events.tenant_id (the trusted tenant
 * resolution — the envelope mints tenant_id + per-tenant sequence) must
 * survive the canonical -> spine bridge as the ENFORCED namespace on
 * ping_events. UnifiedEventRuntime.emit resolves
 * `options.namespace || 'core::system'` (unified_event_runtime.js:205), so a
 * bridge that emits without options.namespace launders every tenant event
 * into core::system. Downstream (event->mission bridge :128 threads
 * event.namespace; scheduler; workers via BaseWorker._emit; embedding
 * projections via event.namespace) then operates on the laundered scope:
 * tenant A's work is visible in system scope and claimable by any worker.
 *
 * Method: run the REAL EventBridge class with a stubbed pg pool (one
 * synthetic canonical_events row) and a stubbed eventRuntime that captures
 * the emit options. No network, no database, no credentials.
 *
 * Verdict semantics: FAIL pre-fix (namespace not passed -> spine stamps
 * core::system -> tenant identity lost as an enforcement signal), PASS
 * post-fix (namespace === 'tenant::<slug>', malformed ids tagged
 * metadata.tenant_unknown=true instead of silently laundered).
 */
'use strict';

const { EventBridge } = require('./fixed-tree/ping-runtime/events/event_bridge.js');

function makeHarness(rowTenantId) {
  const captured = [];
  const row = {
    event_id: '11111111-2222-3333-4444-555555555555',
    event_type: 'TEST_TENANT_EVENT',
    tenant_id: rowTenantId,
    source: 'test-source',
    actor: 'test-actor',
    payload: { note: 'synthetic hostile probe, no real data' },
    metadata: {},
    causation_id: null,
    correlation_id: null,
    created_at: new Date().toISOString(),
    timestamp: new Date().toISOString(),
  };
  const pool = {
    async query(sql) {
      if (sql.includes('COUNT(*)')) return { rows: [{ cnt: '1' }] };
      if (sql.includes('FROM canonical_events') && sql.includes('processed = FALSE')) {
        return { rows: [row] };
      }
      return { rows: [] }; // cursor persist + mark-processed UPDATE
    },
  };
  const eventRuntime = {
    async emit(eventType, source, payload, options) {
      captured.push({ eventType, source, payload, options });
      return { status: 'ok' };
    },
  };
  const bridge = new EventBridge({ pool, eventRuntime, pollIntervalMs: 60000, batchSize: 10 });
  return { bridge, captured };
}

async function runCase(name, rowTenantId, expect) {
  const { bridge, captured } = makeHarness(rowTenantId);
  await bridge._bridgeCanonicalEvents();
  if (captured.length !== 1) {
    return { name, pass: false, detail: `expected 1 emit, got ${captured.length}` };
  }
  const opts = captured[0].options || {};
  const failures = [];
  for (const [key, want] of Object.entries(expect)) {
    let got;
    if (key === 'namespace') got = opts.namespace;
    else if (key === 'tenant_unknown') got = opts.metadata && opts.metadata.tenant_unknown;
    else if (key === 'payload_tenant_marker') got = captured[0].payload._tenant_id;
    if (got !== want) failures.push(`${key}: want ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
  }
  return { name, pass: failures.length === 0, detail: failures.join('; ') || 'ok' };
}

(async () => {
  const cases = [
    // The core hostile assertion: a well-formed tenant_id must cross the
    // bridge as the enforced namespace, not as inert metadata.
    await runCase('tenant_id=acme -> namespace tenant::acme', 'acme', {
      namespace: 'tenant::acme',
      payload_tenant_marker: 'acme',
    }),
    // Already-namespaced form must pass through unchanged.
    await runCase('tenant_id=tenant::victim -> namespace tenant::victim', 'tenant::victim', {
      namespace: 'tenant::victim',
    }),
    // Malformed tenant_id must NOT silently become system scope: it keeps the
    // system default (worker keeps running) but is TAGGED observable.
    await runCase('malformed tenant_id -> system + tenant_unknown tag', 'ACME!!', {
      namespace: 'core::system',
      tenant_unknown: true,
    }),
    // Null tenant_id: system default, tagged.
    await runCase('null tenant_id -> system + tenant_unknown tag', null, {
      namespace: 'core::system',
      tenant_unknown: true,
    }),
  ];
  let failed = 0;
  for (const c of cases) {
    console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.pass ? '' : '  -- ' + c.detail}`);
    if (!c.pass) failed++;
  }
  console.log(failed === 0 ? 'ALL GREEN' : `${failed}/${cases.length} FAILING (boundary open)`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
