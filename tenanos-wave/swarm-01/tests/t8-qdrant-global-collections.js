#!/usr/bin/env node
// SWARM-01 T8: shared vector index (no per-tenant collections/namespaces).
// REAL code path: MemoryVectorStoreAuthority.initialize with stubbed Qdrant.
// Synthetic fixtures only. Read-only: no network, no DB.
const SUBSTRATE = process.env.PING_SUBSTRATE || '/home/nolan/ping';

async function main() {
  const { MemoryVectorStoreAuthority } = require(SUBSTRATE + '/gateway/memory_vector_store_authority.js');
  const created = [];
  const stubQdrant = {
    createCollection: async (args) => { created.push(args.collection_name); return { ok: true }; },
  };
  const authority = new MemoryVectorStoreAuthority(stubQdrant);
  await authority.initialize();

  console.log('collections created =>', JSON.stringify(created));
  const anyTenantScoped = created.some((n) => /tenant/i.test(n));
  if (created.length > 0 && !anyTenantScoped) {
    console.log(`LEAK DEMONSTRATED T8: ${created.length} global memory collections, none tenant-scoped; tenant separation depends on unenforced payload fields.`);
  } else if (anyTenantScoped) {
    console.log('BOUNDARY HOLDS T8: collections are tenant-scoped.');
  } else {
    console.log('UNEXPECTED T8: no collections created.');
  }
}

main().catch((e) => { console.error('HARNESS ERROR T8:', e.message); process.exit(2); });
