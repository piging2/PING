#!/usr/bin/env node
// SWARM-01 T1: namespace override laundering (ingest path).
// REAL code path: CanonicalizationService.authorizeNamespace (ping-runtime).
// Synthetic fixtures only. Read-only: no network, no DB.
const SUBSTRATE = process.env.PING_SUBSTRATE || '/home/nolan/ping';

async function main() {
  const { CanonicalizationService } = require(SUBSTRATE + '/ping-runtime/canonicalization/canonicalization_service.js');
  const svc = new CanonicalizationService({}); // no bindings configured, as in production

  // Attacker-controlled source claims the VICTIM tenant's namespace explicitly.
  const r = svc.authorizeNamespace('synth-attacker-source', 'tenant::victim-synth');
  console.log('authorizeNamespace(synth-attacker-source, tenant::victim-synth) =>', JSON.stringify(r));

  if (r.authorized && r.namespace === 'tenant::victim-synth') {
    console.log('LEAK DEMONSTRATED T1: any source may claim any tenant namespace via explicit override (format-only check).');
  } else {
    console.log('BOUNDARY HOLDS T1: unbound namespace override refused.');
  }
}

main().catch((e) => { console.error('HARNESS ERROR T1:', e.message); process.exit(2); });
