// F7-B runtime verification: D1 corpus + emit() semantics, no DB touched.
const assert = require('assert');
const { CanonicalJson } = require('/home/nolan/worktrees/constitutional-convergence/gateway/replay/kernel/canonical_json.js');
const { CanonicalBytes, CanonicalAuthority } = require('/home/nolan/worktrees/constitutional-convergence/runtime/kernel/authorities/canonical_authority.js');
const { IdentityAuthority } = require('/home/nolan/worktrees/constitutional-convergence/runtime/kernel/authorities/identity_authority.js');
const { UnifiedEventRuntime } = require('/home/nolan/worktrees/constitutional-convergence/ping-runtime/events/unified_event_runtime.js');

let pass = 0;
const ok = (label, cond) => { assert(cond, 'FAIL: ' + label); pass++; console.log('ok: ' + label); };
const canon = (v) => CanonicalJson.canonicalize(v);
const rejects = (v) => { try { canon(v); return null; } catch (e) { return e; } };

// ---- D1: normalized-equivalent ----
ok('key order normalized', canon({b:1,a:2}) === canon({a:2,b:1}));
ok('nested key order normalized', canon({z:{b:1,a:0},a:1}) === canon({a:1,z:{a:0,b:1}}));
ok('-0 == 0', canon(-0) === canon(0) && canon(-0) === '0');
ok('1.0 == 1', canon(1.0) === canon(1));

// ---- D1: legal-injective ----
ok('array order significant', canon([1,2]) !== canon([2,1]));
ok('array grouping significant', canon({t:[1,2]}) !== canon({t:[12]}));
ok('nested array grouping significant', canon([[1,2]]) !== canon([[1],[2]]));
ok('cross-type distinct', new Set([canon(1), canon('1'), canon(true), canon(null)]).size === 4);
ok('null distinct from undefined-adjacent', canon({v:null}) === '{"v":null}');
ok('empty values mutually distinct', new Set([canon({}), canon([]), canon('')]).size === 3);
const nfc = 'caf\u00e9', nfd = 'cafe\u0301';
ok('NFC != NFD (no normalization)', canon({s:nfc}) !== canon({s:nfd}));
ok('NFC preserved byte-exact', canon({s:nfc}).includes(nfc));

// ---- D1: rejected before identity ----
for (const [label, v] of [
  ['undefined top', undefined], ['undefined nested', {a:undefined}],
  ['undefined in array', [1,undefined]], ['NaN', {v:NaN}],
  ['+Infinity', {v:Infinity}], ['-Infinity', {v:-Infinity}],
  ['sparse array', new Array(3)], ['Buffer', {b:Buffer.from('ab')}],
  ['function', {f:function(){}}], ['symbol value', {s:Symbol('x')}],
  ['bigint', {b:10n}],
]) {
  const e = rejects(v);
  ok('rejects ' + label, e && e.deterministicFailure && e.deterministicFailure.code === 'CANONICALIZATION_ERROR');
}
ok('rejects circular', (() => { const o = {}; o.me = o; const e = rejects(o); return e && e.deterministicFailure; })());
const deep = (n, leaf) => { let r = leaf; for (let i = 0; i < n; i++) r = [r]; return r; };
ok('depth 64 accepted', canon(deep(64, 0)).length > 0);
{
  const e = rejects(deep(65, 0));
  ok('depth 65 rejected', e && e.deterministicFailure && e.deterministicFailure.code === 'EXECUTION_LIMIT_EXCEEDED');
}
ok('depth boundary objects consistent', (() => {
  const o64 = (() => { let r = 0; for (let i = 0; i < 64; i++) r = {x:r}; return r; })();
  const o65 = (() => { let r = 0; for (let i = 0; i < 65; i++) r = {x:r}; return r; })();
  let ok64 = false, rej65 = false;
  try { canon(o64); ok64 = true; } catch (e) {}
  try { canon(o65); } catch (e) { rej65 = e.deterministicFailure && e.deterministicFailure.code === 'EXECUTION_LIMIT_EXCEEDED'; }
  return ok64 && rej65;
})());

// ---- delegation: one serializer ----
ok('CanonicalBytes.serialize delegates', CanonicalBytes.serialize({b:1,a:2}).toString('utf8') === '{"a":2,"b":1}');
ok('CanonicalBytes rejects fail-closed', (() => { try { CanonicalBytes.serialize({v:NaN}); return false; } catch (e) { return e.deterministicFailure && e.deterministicFailure.code === 'CANONICALIZATION_ERROR'; } })());

// ---- injectivity: distinct admitted values -> distinct hashes ----
// (except the ruled normalized-equivalent pair 1 / 1.0)
{
  const vals = [{b:1,a:2}, {t:[1,2]}, {t:[12]}, {v:null}, {}, [], '', 1, '1', true, {s:nfc}, {s:nfd}, -0, 1.0, deep(64,0)];
  const hashes = vals.map(v => CanonicalAuthority.hashBytes(CanonicalBytes.serialize(v)).toString('hex'));
  const canonStrings = vals.map(canon);
  // 1 and 1.0 MUST collide (ruled equivalence); nothing else may.
  const dupes = [];
  canonStrings.forEach((s, i) => { const j = canonStrings.indexOf(s); if (j !== i) dupes.push([j, i]); });
  ok('only ruled pair collides',
    dupes.length === 1 && dupes[0][0] === 7 && dupes[0][1] === 13);
  ok('hashes unique except ruled pair', new Set(hashes).size === hashes.length - 1);
}

// ---- identity version domain separation ----
{
  const ia = new IdentityAuthority();
  ok('identity version is 2.0.0', ia.getIdentityVersion() === '2.0.0');
  const material = { event_type: 'test', source: 't', namespace: 'core::system', payload: {a:1} };
  ia._identityVersion = '1.0.0';
  const idV1 = ia.generateId('event', material);
  ia._identityVersion = '2.0.0';
  const idV2 = ia.generateId('event', material);
  ok('V1 vs V2 domain-separated', idV1 !== idV2);
  ok('V2 ID format event_<16hex>', /^event_[0-9a-f]{16}$/.test(idV2));
}

// ---- emit() semantics (no pool: zero DB writes) ----
(async () => {
  // success path
  {
    const rt = new UnifiedEventRuntime();
    let dispatched = 0;
    rt.on('demo.event', () => { dispatched++; });
    const r = await rt.emit('demo.event', 'test-src', {a:1});
    ok('success returns eventId', r.status === 'ok' && /^event_[0-9a-f]{16}$/.test(r.eventId));
    ok('success dispatches', dispatched === 1);
    ok('success has canonical event', r.event && r.event.event_id === r.eventId);
  }
  // event-type rejection: no eventId
  {
    const rt = new UnifiedEventRuntime({ eventValidator: { isRegistered: (t) => t === 'known.event' } });
    const r = await rt.emit('bogus.event', 'test-src', {a:1});
    ok('unknown type rejected', r.status === 'error' && r.code === 'UNKNOWN_EVENT_TYPE');
    ok('unknown type: no eventId', !('eventId' in r) || r.eventId === undefined);
    ok('unknown type: failed counted', rt._stats.failed === 1 && rt._stats.emitted === 0);
  }
  // governance rejection: no eventId
  {
    const rt = new UnifiedEventRuntime({ eventGovernance: { validateEvent: () => ({ valid: false, error: 'nope', code: 'DENIED' }) } });
    let dispatched = 0;
    rt.on('demo.event', () => { dispatched++; });
    const r = await rt.emit('demo.event', 'test-src', {a:1});
    ok('governance rejected', r.status === 'error' && r.code === 'DENIED');
    ok('governance: no eventId', r.eventId === undefined);
    ok('governance: no dispatch', dispatched === 0);
  }
  // value-domain rejection: NaN payload -> typed error, no eventId, no dispatch, no persistence
  {
    const rt = new UnifiedEventRuntime();
    let dispatched = 0;
    rt.on('demo.event', () => { dispatched++; });
    const r = await rt.emit('demo.event', 'test-src', {v:NaN});
    ok('NaN payload rejected', r.status === 'error' && r.code === 'IDENTITY_VALUE_REJECTED');
    ok('NaN payload: no eventId', r.eventId === undefined);
    ok('NaN payload: deterministic code', r.deterministicCode === 'CANONICALIZATION_ERROR');
    ok('NaN payload: no dispatch', dispatched === 0);
    ok('NaN payload: failed counted', rt._stats.failed === 1 && rt._stats.emitted === 0);
  }
  console.log(`\nF7-B RUNTIME VERIFICATION: ${pass} checks passed, 0 failed`);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
