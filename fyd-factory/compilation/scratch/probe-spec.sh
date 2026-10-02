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
  const spec = generateSiteSpec(g, { generatedAt: '2026-09-23T00:00:00.000Z' });
  const s = JSON.stringify(spec);
  const owner = g.objects.find((o) => /business/i.test(o.schema));
  console.log('spec has title:', s.includes(owner.title));
  console.log('spec has description:', s.includes(owner.description.slice(0, 40)));
  console.log('spec has hours:', s.includes('Mo,Tu') || s.includes('hours'));
  // what ARE the section queries? show one
  const sec = spec.pages[0].sections[0];
  console.log('sample section:', JSON.stringify(sec).slice(0, 300));
})();
" 2>&1 | head -12
