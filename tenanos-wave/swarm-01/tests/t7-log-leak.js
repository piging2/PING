#!/usr/bin/env node
// SWARM-01 T7: logs/traces leak tenant data (request bodies logged verbatim).
// REAL code path: route_middleware.asyncHandler with captured console.log.
// Synthetic fixtures only. Read-only: no network, no DB.
const SUBSTRATE = process.env.PING_SUBSTRATE || '/home/nolan/ping';

async function main() {
  const { asyncHandler, logRequest } = require(SUBSTRATE + '/gateway/route_middleware.js');

  const logged = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...a) => { logged.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); };
  console.error = (...a) => { logged.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); };

  try {
    const wrapped = asyncHandler('POST /synth', async () => ({ ok: true }));
    const fakeRes = { headersSent: true, json: () => {}, status: () => fakeRes };
    await wrapped(
      {
        method: 'POST', path: '/synth',
        query: { tenant_id: 'tenant::acme-synth' },
        body: { tenant_id: 'tenant::acme-synth', payload: { phone: '+1-555-0199-synth', note: 'synthetic PII' } },
      },
      fakeRes,
      () => {},
    );
    // logRequest middleware as well
    await new Promise((res) => logRequest({ method: 'GET', path: '/synth', query: { tenant_id: 'tenant::acme-synth' }, body: { secret: 'synthetic-secret' } }, {}, res));
  } finally {
    console.log = origLog;
    console.error = origErr;
  }

  const blob = logged.join('\n');
  const leakedPhone = blob.includes('+1-555-0199-synth');
  const leakedBody = blob.includes('synthetic-secret');
  console.log('request body/phone present in route logs =>', leakedPhone, '| query/body in logRequest =>', leakedBody);
  if (leakedPhone || leakedBody) {
    console.log('LEAK DEMONSTRATED T7: route middleware logs full req.query/req.body (tenant payloads, PII) to stdout on every request.');
  } else {
    console.log('BOUNDARY HOLDS T7: request bodies are redacted in logs.');
  }
}

main().catch((e) => { console.error('HARNESS ERROR T7:', e.message); process.exit(2); });
