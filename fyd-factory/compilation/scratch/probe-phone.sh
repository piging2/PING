#!/bin/bash
H=/home/nolan/fyd-compile-harness
cd /home/nolan/projects/ping
node_modules/.bin/tsx --tsconfig=/home/nolan/projects/ping/tsconfig.json -e "
const fs = require('node:fs');
require.extensions['.css'] = (m) => { m.exports = {}; };
(async () => {
  const { generateSiteSpec } = await import('/home/nolan/projects/ping/src/fyd/proceduralize/generator.ts');
  const raw = JSON.parse(fs.readFileSync('$H/fixtures/batch-a/batch-a-plumber.json', 'utf8'));
  const g = raw.graph;
  const owner = g.objects.find((o) => /business/i.test(o.schema));
  console.log('owner id:', owner && owner.id, 'phone field:', owner && owner.fields && owner.fields.phone);
  const edited = g.objects.find((o) => o.id === 'corpus-batch-a-plumber-22af2be3bd35ba83');
  console.log('edited obj schema:', edited && edited.schema, 'title:', edited && edited.title);
  const spec = generateSiteSpec(g, { generatedAt: '2026-09-23T00:00:00.000Z' });
  const s = JSON.stringify(spec);
  console.log('spec contains 970-555-0101:', s.includes('970-555-0101'));
  console.log('spec contains owner id:', s.includes(owner.id));
  console.log('ownerObjectId:', spec.ownerObjectId);
  // where does the phone live in the spec, if at all?
  const idx = s.indexOf('970-555');
  console.log('first phone-like idx:', idx);
})();
" 2>&1 | head -12
