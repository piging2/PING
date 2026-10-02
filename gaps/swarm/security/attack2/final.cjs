'use strict';
/* PATCH-ATTACKER final battery vs fix/route-auth-p0-sweep @ fcfc656ca.
 * Independent harness. Scratch only; worktree untouched.
 * authPool (middleware) and handlerPool (route factories) are SEPARATE objects
 * with identical behavior, so "handler reached" is unambiguous.
 */
process.env.MUSE_LEVEL_1_KEY = 'atk-valid-l1-key-001';
process.env.MUSE_LEVEL_2_KEY = 'atk-valid-l2-key-002';
const VALID = 'atk-valid-l1-key-001';
const WT = '/home/nolan/ping/worktrees/route-auth-sweep-fix';
const Module = require('module');
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '../constitutional-dist/identity-authority.js')
    return { IdentityAuthority: { generateId: () => 'atk_identity_001' } };
  if (request === '../constitutional-dist/hash-authority.js')
    return { HashAuthority: { canonicalizeObject: (o) => o } };
  return origLoad.call(this, request, parent, isMain);
};
const express = require('express');
const http = require('http');
const crypto = require('crypto');
const ExteriorAuthMiddleware = require(WT + '/gateway/exterior_auth_middleware.js');
const createIdentityRoutes = require(WT + '/gateway/routes/identities.js');
const createRepositoryRoutes = require(WT + '/gateway/routes/repository.js');
const createDeploymentRoutes = require(WT + '/gateway/routes/deployments.js');
const createRuntimeRoutes = require(WT + '/gateway/routes/runtime.js');
const createContextRoutes = require(WT + '/gateway/routes/context.js');
const createSystemRoutes = require(WT + '/gateway/routes/system.js');
const createFingerprintRoutes = require(WT + '/gateway/routes/fingerprint.js');

const reached = []; // handler-side service calls ONLY (authPool calls are tagged separately)
const rec = (s, m) => reached.push(s + '.' + m);
function svcStub(name, methods, ret) {
  const o = {};
  for (const m of methods) o[m] = async () => { rec(name, m); return (typeof ret === 'function') ? ret(m) : ret; };
  return o;
}
// Smart PG stub: answers credential lookups truthfully, everything else empty.
function smartPool(tag) {
  return { query: async (sql, params) => {
    rec(tag + 'Pool', 'query');
    if (/exterior_agent_credentials/i.test(sql)) {
      if (params && params[0] === VALID) return { rows: [{ agent_id: 'muse', agent_name: 'Muse L1', is_active: true, expires_at: null }] };
      return { rows: [] };
    }
    if (/COUNT/i.test(sql)) return { rows: [{ count: 1 }] };
    return { rows: [] };
  }};
}
const failingPool = () => ({ query: async () => { rec('authPool', 'query'); throw new Error('PG_DOWN_SIMULATED'); } });

function buildServices(handlerPool) {
  return {
    eventRuntime: svcStub('eventRuntime', ['emit'], { status: 'ok', eventId: 'e-atk-1' }),
    repoStore: svcStub('repoStore', ['append', 'load', 'search', 'delete'],
      (m) => m === 'append' ? 'obj-atk-1' : (m === 'search' ? [] : (m === 'load' ? null : undefined))),
    deploymentRegistry: svcStub('deploymentRegistry',
      ['executeRegisterDeployment','executeResolveDeployment','executeListDeployments','executeTransitionStatus','executeCompleteDeployment','executeFailDeployment','executeRollbackDeployment','executeResolveActiveDeployment'],
      (m) => (m === 'executeListDeployments' ? [] : { id: 'atk-dep-1' })),
    runtimeRegistry: svcStub('runtimeRegistry',
      ['executeRegisterComponent','executeResolveComponent','executeListComponents','executeTransitionStatus','executeRecordHeartbeat','executeRemoveComponent','executeDetectUnhealthy'],
      (m) => ((m === 'executeListComponents' || m === 'executeDetectUnhealthy') ? [] : { id: 'atk-rt-1' })),
    eventReadAuthority: svcStub('eventReadAuthority',
      ['getRecentEventsForContext','getWorkerStatusForContext','getDailyActivityForContext','getLatestSummariesForContext','getRecentFailuresForContext','getModelMetricsForContext'], []),
    fingerprint: { getFingerprint: () => { rec('fingerprint', 'getFingerprint'); return { fingerprint: 'atk-fp' }; } },
  };
}
const PUBKEY_DER_HEX = crypto.generateKeyPairSync('ed25519').publicKey.export({ format: 'der', type: 'spki' }).toString('hex');

async function buildApp(authPool, handlerPool) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });
  const S = buildServices(handlerPool);
  const authMw = new ExteriorAuthMiddleware(authPool);
  await authMw.initialize();
  app.use('/identities', authMw.middleware(), createIdentityRoutes(S.eventRuntime, handlerPool));
  app.use('/api/v1/repository', authMw.middleware(), createRepositoryRoutes(S.repoStore));
  app.use('/context', createContextRoutes(S.eventReadAuthority));
  app.use('/system', createSystemRoutes(S.eventReadAuthority));
  app.use('/deployments', authMw.middleware(), createDeploymentRoutes(S.deploymentRegistry));
  app.use('/runtime', authMw.middleware(), createRuntimeRoutes(S.runtimeRegistry));
  app.use('/runtime/fingerprint', createFingerprintRoutes(S.fingerprint));
  return app;
}
function buildDegradedApp() { // faithful else-branch: NO /identities stub (matches real code)
  const app = express(); app.use(express.json());
  const stub503 = (req, res) => res.status(503).json({ error: 'Postgres unavailable', degraded: true });
  for (const p of ['/events','/context','/api/v1/repository','/system','/canonical-events','/tenants','/deployments','/runtime','/ingest']) app.use(p, stub503);
  const S = buildServices(smartPool('handler'));
  app.use('/runtime/fingerprint', createFingerprintRoutes(S.fingerprint));
  return app;
}
function listen(app) { return new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); }); }
function req(port, method, path, opts) {
  opts = opts || {};
  return new Promise((resolve, reject) => {
    const before = reached.length;
    const data = opts.body ? JSON.stringify(opts.body) : null;
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const rq = http.request({ port, host: '127.0.0.1', method, path, headers }, (res) => {
      let b = ''; res.on('data', (c) => b += c);
      res.on('end', () => resolve({ status: res.statusCode, newReached: reached.slice(before) }));
    });
    rq.on('error', reject); if (data) rq.write(data); rq.end();
  });
}
const MUTS = [
  ['M1', 'POST', '/identities', { displayName: 'Atk', handle: 'atkuser', publicKey: PUBKEY_DER_HEX }],
  ['M2', 'POST', '/api/v1/repository/objects', { kind: 'doc', data: { x: 1 } }],
  ['M3', 'DELETE', '/api/v1/repository/objects/o1', null],
  ['M4', 'POST', '/deployments', { tenant_id: 't', version: 'v', git_sha: 's' }],
  ['M5', 'PUT', '/deployments/d1/status', { status: 'x' }],
  ['M6', 'POST', '/deployments/d1/complete', {}],
  ['M7', 'POST', '/deployments/d1/fail', {}],
  ['M8', 'POST', '/deployments/d1/rollback', {}],
  ['M9', 'POST', '/runtime', { tenant_id: 't', component_type: 'c', component_name: 'n' }],
  ['M10', 'PUT', '/runtime/tenant/t/type/c/name/n/status', {}],
  ['M11', 'POST', '/runtime/tenant/t/type/c/name/n/heartbeat', {}],
  ['M12', 'DELETE', '/runtime/tenant/t/type/c/name/n', null],
];
const NEG = [
  ['no-auth', {}], ['bad-bearer', { Authorization: 'Bearer nope-not-a-key' }],
  ['empty-bearer', { Authorization: 'Bearer ' }], ['bare-Bearer', { Authorization: 'Bearer' }],
  ['lowercase-scheme', { Authorization: 'bearer ' + VALID }],
  ['double-space', { Authorization: 'Bearer  ' + VALID }],
  ['query-key', {}], ['x-api-key', { 'X-API-Key': VALID }],
];
const results = [];
function check(name, r, expectStatus, expectReached) {
  const handlerReached = r.newReached.filter((x) => x.indexOf('authPool.') !== 0);
  const pass = expectStatus.indexOf(r.status) !== -1 && (expectReached ? handlerReached.length > 0 : handlerReached.length === 0);
  results.push({ name, pass, status: r.status, reached: r.newReached });
  if (!pass) console.log('FAIL | ' + name + ' -> ' + r.status + ' reached=' + JSON.stringify(r.newReached));
}
(async () => {
  const appA = await buildApp(failingPool(), smartPool('handler'));
  const sA = await listen(appA); const pA = sA.address().port;
  console.log('--- MODE A: PG down for auth (in-memory creds) ---');
  for (const m of MUTS) {
    for (const v of NEG) {
      const rp = (v[0] === 'query-key') ? m[2] + '?api_key=' + VALID : m[2];
      check('A ' + m[0] + ' ' + v[0], await req(pA, m[1], rp, { headers: v[1], body: m[3] }), [401], false);
    }
    check('A ' + m[0] + ' valid-bearer', await req(pA, m[1], m[2], { headers: { Authorization: 'Bearer ' + VALID }, body: m[3] }), [200], true);
    check('A ' + m[0] + ' raw-key', await req(pA, m[1], m[2], { headers: { Authorization: VALID }, body: m[3] }), [200], true);
    check('A ' + m[0] + ' trailing-space-http-normalized', await req(pA, m[1], m[2], { headers: { Authorization: 'Bearer ' + VALID + ' ' }, body: m[3] }), [200], true);
  }
  const tricks = [
    ['case-upper', 'POST', '/IDENTITIES', MUTS[0][3]], ['case-mixed', 'POST', '/Identities/', MUTS[0][3]],
    ['double-slash', 'POST', '//identities', MUTS[0][3]], ['trail-double', 'POST', '/identities//', MUTS[0][3]],
    ['encoded-i', 'POST', '/%69dentities', MUTS[0][3]], ['encoded-dot', 'POST', '/identities/%2e', MUTS[0][3]],
    ['traversal', 'POST', '/runtime/../identities', MUTS[0][3]],
    ['repo-case', 'POST', '/API/V1/REPOSITORY/OBJECTS', MUTS[1][3]],
    ['repo-dslash', 'POST', '/api/v1/repository//objects', MUTS[1][3]],
    ['hb-traversal', 'POST', '/runtime/tenant/t/type/c/name/n/%2e%2e/heartbeat', {}],
    ['hb-case', 'POST', '/RUNTIME/tenant/t/type/c/name/n/heartbeat', {}],
  ];
  for (const t of tricks) check('A trick ' + t[0], await req(pA, t[1], t[2], { body: t[3] }), [401, 404, 400], false);
  check('A OPTIONS preflight', await req(pA, 'OPTIONS', '/identities', {}), [200], false);
  check('A HEAD no-auth', await req(pA, 'HEAD', '/identities', {}), [401], false);
  check('A PATCH no-auth', await req(pA, 'PATCH', '/runtime', {}), [401], false);
  check('A GET /deployments/:id valid', await req(pA, 'GET', '/deployments/d1', { headers: { Authorization: 'Bearer ' + VALID } }), [200], true);
  check('A GET /deployments/:id no-auth', await req(pA, 'GET', '/deployments/d1', {}), [401], false);
  check('A GET /identities valid', await req(pA, 'GET', '/identities', { headers: { Authorization: 'Bearer ' + VALID } }), [200], true);
  check('A GET /context/recent-events unauth', await req(pA, 'GET', '/context/recent-events', {}), [200], true);
  check('A GET /system/state unauth', await req(pA, 'GET', '/system/state', {}), [200], false);
  check('A GET /runtime/fingerprint unauth', await req(pA, 'GET', '/runtime/fingerprint', {}), [401], false);
  sA.close();

  const appB = await buildApp(smartPool('auth'), smartPool('handler'));
  const sB = await listen(appB); const pB = sB.address().port;
  console.log('--- MODE B: PG-backed auth ---');
  for (const m of [MUTS[0], MUTS[3], MUTS[8]]) {
    check('B ' + m[0] + ' unknown-key', await req(pB, m[1], m[2], { headers: { Authorization: 'Bearer unknown-key-xyz' }, body: m[3] }), [401], false);
    check('B ' + m[0] + ' valid-key', await req(pB, m[1], m[2], { headers: { Authorization: 'Bearer ' + VALID }, body: m[3] }), [200], true);
  }
  sB.close();

  const appC = buildDegradedApp();
  const sC = await listen(appC); const pC = sC.address().port;
  console.log('--- MODE C: degraded stubs ---');
  for (const m of MUTS) {
    const exp = (m[0] === 'M1') ? [404] : [503]; // /identities has no degraded stub in real code
    check('C ' + m[0] + ' valid-key', await req(pC, m[1], m[2], { headers: { Authorization: 'Bearer ' + VALID }, body: m[3] }), exp, false);
  }
  sC.close();
  const fails = results.filter((x) => !x.pass);
  console.log('==== FINAL: ' + (results.length - fails.length) + '/' + results.length + ' passed ====');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
