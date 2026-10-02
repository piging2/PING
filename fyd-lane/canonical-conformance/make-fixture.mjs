// make-fixture.mjs: (re)generates the `expected` blocks in fixture.json from the
// REFERENCE implementation (hash-authority.ts) via driver-ts.mjs. Dev tool only.
//
// Throw-cases are NOT generated: their expectation (refuse/throw) is the pinned
// semantic, hand-declared in fixture.json, and the reference itself currently
// fails them (documented divergence, Pig-side follow-up).
import { readFileSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(HERE, 'fixture.json');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));

let changed = 0;
for (const c of fixture.cases) {
  if (c.expect.throws) continue; // pinned semantic, not reference-derived
  const out = execFileSync('node', [path.join(HERE, 'driver-ts.mjs'), 'ref'], {
    input: JSON.stringify(c.input),
    encoding: 'utf8',
  });
  const res = JSON.parse(out);
  if (!res.ok) throw new Error(`reference failed on case ${c.id}: ${res.error}`);
  const sha = createHash('sha256').update(res.bytes, 'utf8').digest('hex');
  if (c.expect.bytes !== res.bytes || c.expect.sha256 !== sha) {
    c.expect.bytes = res.bytes;
    c.expect.sha256 = sha;
    changed++;
  }
}

writeFileSync(fixturePath, JSON.stringify(fixture, null, 2) + '\n', 'utf8');
console.log(`fixture.json updated: ${changed} case(s) (re)generated from reference`);
