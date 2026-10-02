#!/bin/bash
# Mutation quality smoke: seed 7 on a fixture with relationships; verify the
# duplicate carries its inbound relationships with deterministic IDs, and the
# hostile injection targets the public business object.
cd /home/nolan/projects/ping
node_modules/.bin/tsx --tsconfig=/home/nolan/projects/ping/tsconfig.json -e "
import { readFileSync } from 'node:fs';
import { mutateGraph } from '/home/nolan/fyd-compile-harness/runner/lib.ts';
const raw = JSON.parse(readFileSync('/home/nolan/fyd-compile-harness/fixtures/pilot-fixtures/batch-a-plumber.json', 'utf8'));
const { graph, ops } = mutateGraph(raw.graph, 7);
console.log('objects:', raw.graph.objects.length, '->', graph.objects.length);
console.log('relationships:', raw.graph.relationships.length, '->', graph.relationships.length);
for (const o of ops) console.log(' ', o.op, '-', o.detail);
const dup = graph.objects.find((o) => o.id.includes('-dup-7'));
if (dup) {
  const inbound = graph.relationships.filter((r) => r.object === dup.id);
  console.log('dup inbound rels:', inbound.length, inbound.map((r) => r.id).join(','));
}
const biz = graph.objects.find((o) => o.visibility === 'public' && /business/i.test(o.schema));
console.log('business object:', biz && biz.id, 'website:', biz && biz.fields.website);
" 2>&1 | grep -v "^$"
