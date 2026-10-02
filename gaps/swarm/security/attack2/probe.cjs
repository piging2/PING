'use strict';
process.env.MUSE_LEVEL_1_KEY = 'probe-valid-key';
const VALID = 'probe-valid-key';
const WT = '/home/nolan/ping/worktrees/route-auth-sweep-fix';
const Module = require('module');
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '../constitutional-dist/identity-authority.js')
    return { IdentityAuthority: { generateId: () => 'x' } };
  if (request === '../constitutional-dist/hash-authority.js')
    return { HashAuthority: { canonicalizeObject: (o) => o } };
  return origLoad.call(this, request, parent, isMain);
};
const express = require('express');
const http = require('http');
const net = require('net');
const ExteriorAuthMiddleware = require(WT + '/gateway/exterior_auth_middleware.js');
const createRuntimeRoutes = require(WT + '/gateway/routes/runtime.js');
const createFingerprintRoutes = require(WT + '/gateway/routes/fingerprint.js');

function listen(app) { return new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); }); }
function req(port, method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const h = Object.assign({ 'Content-Type': 'application/json' }, headers || {});
    if (data) h['Content-Length'] = Buffer.byteLength(data);
    const rq = http.request({ port, host: '127.0.0.1', method, path, headers: h }, (res) => {
      let b = ''; res.on('data', (c) => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b.slice(0, 120) }));
    });
    rq.on('error', reject); if (data) rq.write(data); rq.end();
  });
}
// raw socket: send header with trailing spaces verbatim
function rawReq(port, rawHead) {
  return new Promise((resolve, reject) => {
    const s = net.connect(port, '127.0.0.1', () => s.write(rawHead));
    let b = ''; s.on('data', (c) => b += c);
    s.on('end', () => resolve(b.split('\r\n')[0]));
    s.on('error', reject);
    setTimeout(() => { try { s.end(); } catch (e) {} resolve(b.split('\r\n')[0] + ' (timeout)'); }, 3000);
  });
}

(async () => {
  // 1) what does the app actually receive for a trailing-space header?
  let seen = null;
  const app1 = express();
  app1.use((r, rs, n) => { seen = JSON.stringify(r.headers.authorization); n(); });
  const mw = new ExteriorAuthMiddleware({ query: async () => { throw new Error('down'); } });
  await mw.initialize();
  app1.use('/t', mw.middleware(), (r, rs) => rs.json({ ok: true }));
  const s1 = await listen(app1); const p1 = s1.address().port;
  const raw = await rawReq(p1, 'GET /t HTTP/1.1\r\nHost: x\r\nAuthorization: Bearer ' + VALID + '   \r\nConnection: close\r\n\r\n');
  console.log('P1 raw-socket trailing-space -> app saw authorization=' + seen + ' response=' + raw);
  s1.close();

  // 2) double space after Bearer
  const app2 = express(); app2.use(express.json());
  const mw2 = new ExteriorAuthMiddleware({ query: async () => { throw new Error('down'); } });
  await mw2.initialize();
  app2.use('/t', mw2.middleware(), (r, rs) => rs.json({ ok: true }));
  const s2 = await listen(app2); const p2 = s2.address().port;
  let r = await req(p2, 'GET', '/t', { Authorization: 'Bearer  ' + VALID });
  console.log('P2 double-space-after-Bearer -> ' + r.status + ' (expect 401)');
  r = await req(p2, 'GET', '/t', { Authorization: 'Bearer ' + VALID });
  console.log('P2 normal valid -> ' + r.status + ' (expect 200)');
  s2.close();

  // 3) BEFORE composition: unguarded /runtime + fingerprint after -> was fingerprint public?
  const reached = [];
  const app3 = express(); app3.use(express.json());
  const fakeRuntime = { executeRegisterComponent: async () => { reached.push('rt'); return {}; } };
  app3.use('/runtime', createRuntimeRoutes(fakeRuntime)); // NO middleware = pre-patch
  app3.use('/runtime/fingerprint', createFingerprintRoutes({ getFingerprint: () => { reached.push('fp'); return { f: 1 }; } }));
  const s3 = await listen(app3); const p3 = s3.address().port;
  r = await req(p3, 'GET', '/runtime/fingerprint', {});
  console.log('P3 BEFORE-composition GET /runtime/fingerprint unauth -> ' + r.status + ' reached=' + JSON.stringify(reached) + ' (proves pre-patch publicity)');
  s3.close();

  // 4) PATCH verb (no route) on guarded mount, no auth
  const app4 = express(); app4.use(express.json());
  const mw4 = new ExteriorAuthMiddleware({ query: async () => { throw new Error('down'); } });
  await mw4.initialize();
  const rtReached = [];
  app4.use('/runtime', mw4.middleware(), createRuntimeRoutes({ executeRegisterComponent: async () => { rtReached.push(1); return {}; } }));
  const s4 = await listen(app4); const p4 = s4.address().port;
  r = await req(p4, 'PATCH', '/runtime', {});
  console.log('P4 PATCH /runtime no-auth -> ' + r.status + ' rtReached=' + rtReached.length + ' (expect 401, 0)');
  s4.close();
  process.exit(0);
})().catch((e) => { console.error('PROBE ERROR', e); process.exit(2); });
