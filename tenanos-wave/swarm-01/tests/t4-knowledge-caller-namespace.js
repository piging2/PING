#!/usr/bin/env node
// SWARM-01 T4: knowledge search boundary is caller-asserted.
// REAL code path: HybridSearch.search with stubbed embedding backend.
// Synthetic fixtures only. Read-only: no network, no DB.
const SUBSTRATE = process.env.PING_SUBSTRATE || '/home/nolan/ping';

async function main() {
  const { HybridSearch } = require(SUBSTRATE + '/ping-runtime/search/hybrid_search.js');
  const hits = [
    { id: 'a1', score: 0.91, payload: { namespace: 'tenant::acme-synth', text: 'acme synthetic secret', canonical_hash: 'h-acme' } },
    { id: 'v1', score: 0.89, payload: { namespace: 'tenant::victim-synth', text: 'victim synthetic secret', canonical_hash: 'h-victim' } },
  ];
  const stubEmbedding = { search: async () => hits };
  const hs = new HybridSearch({ embeddingService: stubEmbedding });

  // The SAME caller, two requests differing only in the asserted namespace.
  const asAcme = await hs.search({ query: 'synthetic', namespace: 'tenant::acme-synth' });
  const asVictim = await hs.search({ query: 'synthetic', namespace: 'tenant::victim-synth' });
  console.log('assert tenant::acme-synth   ->', JSON.stringify(asAcme.results.map((r) => r.namespace)));
  console.log('assert tenant::victim-synth ->', JSON.stringify(asVictim.results.map((r) => r.namespace)));

  const gotAcme = asAcme.results.some((r) => r.namespace === 'tenant::acme-synth');
  const gotVictim = asVictim.results.some((r) => r.namespace === 'tenant::victim-synth');
  if (gotAcme && gotVictim) {
    console.log('LEAK DEMONSTRATED T4: the privacy boundary is whatever namespace string the caller asserts; no caller->tenant binding exists.');
  } else {
    console.log('BOUNDARY HOLDS T4.');
  }
}

main().catch((e) => { console.error('HARNESS ERROR T4:', e.message); process.exit(2); });
