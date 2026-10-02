/**
 * LANE B post-fix verification: run the mount-wiring contract assertions
 * against the /tmp FIXED COPY of gateway_runtime.js (diff applied).
 * The worktree file itself is untouched (Lane A sequences the real apply).
 */
'use strict';
const assert = require('assert');
const fs = require('fs');

const src = fs.readFileSync('/tmp/laneb-test/verify/gateway_runtime.fixed.js', 'utf8');
let passed = 0;

function check(name, cond, msg) {
  assert(cond, msg);
  passed++;
  console.log(`  PASS(post-fix) ${name}`);
}

check('middleware required',
  /require\(['"]\.\.\/exterior_auth_middleware['"]\)/.test(src),
  'require missing');
check('instantiated + initialized',
  /new ExteriorAuthMiddleware\(/.test(src) && /_exteriorAuthMiddleware\.initialize\(\)/.test(src),
  'instantiation/initialize missing');

const block = src.match(/_buildPgHandlers\(services\)\s*\{([\s\S]*?)\n  \}/);
assert(block, '_buildPgHandlers block not found');
const entry = block[1].match(/'\/tenants':[^\n]*/);
check('SEC-001 /tenants auth-wrapped',
  entry && /requireAuth\(/.test(entry[0]) && /_exteriorAuthMiddleware/.test(block[1]),
  'tenants entry not auth-wrapped: ' + (entry && entry[0]));

const mcUse = src.match(/this\._app\.use\('\/mc',\s*([A-Za-z_$][\w$]*)\s*,/);
assert(mcUse, 'mc mount not in auth-wrapped form');
const ident = mcUse[1];
const defn = src.match(new RegExp('(?:const|let|var)\\s+' + ident + '\\s*=([^;]*);'));
check('SEC-002 /mc mount carries auth',
  defn && /exteriorAuthMiddleware/i.test(defn[1]),
  'mc mount ident ' + ident + ' not backed by ExteriorAuthMiddleware');

// Regression: all other pg-handler entries still present and untouched
for (const p of ['/events', '/context', '/api/v1/repository', '/system', '/canonical-events',
  '/deployments', '/runtime', '/ingest']) {
  assert(new RegExp(`'${p.replace(/\//g, '\\/')}':`).test(block[1]), `handler entry ${p} lost`);
}
console.log('  PASS(post-fix) all 8 other pg-handler entries intact');

console.log(`\npost-fix contract: ${passed + 1} passed, 0 failed`);
