// probe2.js — timing comparison proves the clamp without a rebuild.
// If unclamped, t(1M) would be ~40,000x t(25). If clamped, t(1M) ~= t(25).
// Keys in memory only; timings and counts printed.
const http = require('http');
const { execSync } = require('child_process');
const k2 = execSync('docker exec ping-gateway printenv MUSE_LEVEL_2_KEY').toString().trim();
if (!k2) throw new Error('key missing');

function loop(maxIt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ maxIterations: maxIt, minPriority: 5, missionsPerIteration: 3 });
    const t0 = Date.now();
    const r = http.request({
      host: 'localhost', port: 8080, path: '/orchestration/engine/loop', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': 'Bearer ' + k2
      }
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode, ms: Date.now() - t0,
        results: JSON.parse(Buffer.concat(chunks).toString()).results.length
      }));
    });
    r.on('error', reject);
    r.setTimeout(600000, () => r.destroy(new Error('timeout')));
    r.write(data); r.end();
  });
}

(async () => {
  for (const m of [3, 25, 1000000]) {
    const r = await loop(m);
    console.log(`maxIterations=${m} -> status=${r.status} ms=${r.ms} results=${r.results}`);
  }
})().catch(e => { console.error('PROBE2-ERROR ' + e.message); process.exit(1); });
