// probe.js — exact-bytes 403 check + loop clamp proof via response dashboard.
// Keys stay in process memory only; only status codes and counts are printed.
const http = require('http');
const { execSync } = require('child_process');

const k1 = execSync('docker exec ping-gateway printenv MUSE_LEVEL_1_KEY').toString().trim();
const k2 = execSync('docker exec ping-gateway printenv MUSE_LEVEL_2_KEY').toString().trim();
if (!k1 || !k2) throw new Error('keys missing');

function req(method, path, key, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      host: 'localhost', port: 8080, path, method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (key) opts.headers['Authorization'] = 'Bearer ' + key;
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode,
        body: Buffer.concat(chunks).toString()
      }));
    });
    r.on('error', reject);
    r.setTimeout(600000, () => { r.destroy(new Error('timeout')); });
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  // 1. exact 403 body bytes
  const f = await req('POST', '/orchestration/missions', k1, { type: 'SMOKE' });
  console.log('PROBE-403 status=' + f.status);
  console.log('PROBE-403 body=' + JSON.stringify(f.body));

  // 2. loop clamp: events.total before vs inside response dashboard
  const d0 = await req('GET', '/orchestration/engine', k1, null);
  const e0 = JSON.parse(d0.body).events.total;
  console.log('PROBE-LOOP events.total before=' + e0);
  const t0 = Date.now();
  const loop = await req('POST', '/orchestration/engine/loop', k2,
    { maxIterations: 1000000, minPriority: 5, missionsPerIteration: 3 });
  const ms = Date.now() - t0;
  const lj = JSON.parse(loop.body);
  const e1 = lj.dashboard.events.total;
  const maxIter = lj.results.reduce((m, r) => Math.max(m, r.iteration), -1);
  console.log('PROBE-LOOP status=' + loop.status + ' elapsedMs=' + ms +
    ' results=' + lj.results.length + ' maxIteration=' + maxIter);
  console.log('PROBE-LOOP events.total in response dashboard=' + e1 +
    ' delta=' + (e1 - e0));
})().catch(e => { console.error('PROBE-ERROR ' + e.message); process.exit(1); });
