// Shadow equivalence harness: kernel JS IdentityAuthority (#4) vs
// constitutional TS IdentityAuthority (#1, via dist) on the same fixtures.
// Read-only. Records INPUT / OUTPUTS / stability. Never normalizes.
const k = require('/home/nolan/ping/runtime/kernel/authorities/identity_authority.js');
let c = null, cErr = null;
try {
  c = require('/home/nolan/ping/runtime/constitutional/dist/identity-authority.js');
} catch (e) { cErr = String((e && e.message) || e); }

const fixtures = [
  { type: 'object',  namespace: 'test', data: { kind: 'widget', name: 'alpha' } },
  { type: 'event',   namespace: 'test', data: { kind: 'click', target: 'btn-1' } },
  { type: 'witness', namespace: 'test', data: { kind: 'witness', transcript: 'abc123' } },
  { type: 'object',  namespace: 'test', data: { kind: 'widget', name: 'alpha', extra: 'x' } },
];

const rows = [];
for (const f of fixtures) {
  const ctx = JSON.stringify(f.data);
  let k1 = null, k2 = null, kErr = null;
  try {
    k1 = k.identityAuthority.generateId(f.type, f.data);
    k2 = k.identityAuthority.generateId(f.type, f.data);
  } catch (e) { kErr = String((e && e.message) || e); }
  let c1 = null, c1b = null, cerr = cErr;
  if (!cerr) {
    try {
      c1 = c.IdentityAuthority.generateDeterministicId(f.namespace, ctx);
      c1b = c.IdentityAuthority.generateDeterministicId(f.namespace, ctx);
    } catch (e) { cerr = String((e && e.message) || e); }
  }
  rows.push({
    input: { type: f.type, namespace: f.namespace, data: f.data },
    kernel_id: kErr ? ('ERR:' + kErr) : k1,
    kernel_repeat: kErr ? null : k2,
    kernel_stable: kErr ? null : (k1 === k2),
    constitutional: cerr ? ('ERR:' + cerr) : c1,
    constitutional_stable: cerr ? null : (JSON.stringify(c1) === JSON.stringify(c1b)),
  });
}
console.log(JSON.stringify(rows, null, 1));
