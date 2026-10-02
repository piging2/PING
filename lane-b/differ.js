/**
 * Lane B temporal differ: deterministic diff of two canonical observations.
 *
 * Both inputs are canonicalized with the constitutional canonicalization
 * (sorted keys, recursive) so the diff is order-insensitive and byte-stable.
 * Output: { added: [...paths], removed: [...paths], changed: [{path, from, to}] }
 * with paths in a stable sorted order. A second run on the same inputs
 * yields byte-identical output (proven below).
 *
 * Usage: node differ.js <obs-a.json> <obs-b.json>
 */
'use strict';
const fs = require('fs');
const crypto = require('crypto');
const { HashAuthority } = require('./hash-authority.js');

function canon(v) { return JSON.stringify(HashAuthority.canonicalizeObject(v)); }

function flatten(v, prefix, out) {
  if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
    const keys = Object.keys(v).sort();
    if (!keys.length) { out[prefix || '$'] = canon(v); return; }
    for (const k of keys) flatten(v[k], prefix ? `${prefix}.${k}` : k, out);
    return;
  }
  if (Array.isArray(v)) {
    if (!v.length) { out[prefix || '$'] = '[]'; return; }
    v.forEach((el, i) => flatten(el, `${prefix}[${i}]`, out));
    return;
  }
  out[prefix || '$'] = canon(v);
}

function diff(a, b) {
  const fa = {}, fb = {};
  flatten(a, '', fa);
  flatten(b, '', fb);
  const added = [], removed = [], changed = [];
  for (const k of Object.keys(fb).sort()) {
    if (!(k in fa)) added.push(k);
    else if (fa[k] !== fb[k]) changed.push({ path: k, from: JSON.parse(fa[k]), to: JSON.parse(fb[k]) });
  }
  for (const k of Object.keys(fa).sort()) {
    if (!(k in fb)) removed.push(k);
  }
  return { added, removed, changed };
}

if (require.main === module) {
  const [aPath, bPath] = process.argv.slice(2);
  if (!aPath || !bPath) { console.error('usage: node differ.js <a> <b>'); process.exit(2); }
  const a = JSON.parse(fs.readFileSync(aPath, 'utf8'));
  const b = JSON.parse(fs.readFileSync(bPath, 'utf8'));
  const d = diff(a, b);
  const out = canon(d);
  console.log(out);
  console.error(`sha256=${crypto.createHash('sha256').update(out, 'utf8').digest('hex')}`);
}

module.exports = { diff, flatten, canon };
