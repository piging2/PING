#!/usr/bin/env node
// SWARM-01 T2: bridge laundering (canonical_events -> ping_events).
// REAL code path: EventBridge._bridgeCanonicalEvents with stubbed pool/runtime.
// Synthetic fixtures only. Read-only: no network, no DB.
const SUBSTRATE = process.env.PING_SUBSTRATE || '/home/nolan/ping';
const fs = require('fs');

async function main() {
  const { EventBridge } = require(SUBSTRATE + '/ping-runtime/events/event_bridge.js');

  const synthRow = {
    event_id: 'synth-event-0001', event_type: 'SYNTH_TENANT_EVENT',
    tenant_id: 'tenant::acme-synth', source: 'synth-producer', actor: 'synth-actor',
    payload: { note: 'synthetic' }, metadata: {},
    causation_id: null, correlation_id: null,
    created_at: new Date().toISOString(), timestamp: new Date().toISOString(),
  };

  const stubPool = {
    query: async (sql) => {
      if (/COUNT\(\*\)/.test(sql)) return { rows: [{ cnt: 1 }] };
      if (/FROM canonical_events/.test(sql) && /processed = FALSE/.test(sql)) return { rows: [synthRow] };
      return { rowCount: 1, rows: [] }; // UPDATE processed / anything else
    },
  };

  let captured = null;
  const stubRuntime = {
    emit: async (eventType, source, payload, options) => {
      captured = { eventType, source, payload, options };
      return { status: 'ok' };
    },
  };

  const bridge = new EventBridge({ pool: stubPool, eventRuntime: stubRuntime });
  await bridge._bridgeCanonicalEvents();

  if (!captured) { console.log('HARNESS: bridge emitted nothing'); process.exit(2); }
  console.log('emit options.namespace =>', JSON.stringify(captured.options.namespace));
  console.log('payload._tenant_id    =>', JSON.stringify(captured.payload._tenant_id));

  // Cross-check the spine default that applies when namespace is undefined.
  const spineSrc = fs.readFileSync(SUBSTRATE + '/ping-runtime/events/unified_event_runtime.js', 'utf8');
  const defaultsSystem = /options\.namespace \|\| 'core::system'/.test(spineSrc);
  console.log('spine defaults missing namespace to core::system =>', defaultsSystem);

  if (captured.options.namespace === undefined && defaultsSystem) {
    console.log('LEAK DEMONSTRATED T2: bridge drops tenant namespace; tenant event re-emitted as core::system (tenant_id survives only as inert metadata).');
  } else if (captured.options.namespace === 'tenant::acme-synth') {
    console.log('BOUNDARY HOLDS T2: bridge propagates tenant namespace into the spine emit.');
  } else {
    console.log('UNEXPECTED T2: namespace=' + JSON.stringify(captured.options.namespace));
  }
}

main().catch((e) => { console.error('HARNESS ERROR T2:', e.message); process.exit(2); });
