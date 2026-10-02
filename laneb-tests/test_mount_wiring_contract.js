/**
 * LANE B (SEC-001/SEC-002) — Mount-wiring contract test.
 *
 * Asserts that gateway_runtime.js mounts /tenants and /mc behind the
 * exterior agent authentication middleware (the existing production
 * mechanism, also guarding /events, /ingest, /missions, /ai, /connectors).
 *
 * This test FAILS on the pre-fix tree (both mounts are public) and PASSES
 * once the coordinator applies the handoff diff
 * (tests/security/HANDOFF_gateway_runtime_auth_diff.md).
 *
 * Run: node tests/security/test_mount_wiring_contract.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..', '..');
const RUNTIME = path.join(REPO, 'gateway', 'bootstrap', 'gateway_runtime.js');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS ${name}`);
  } catch (e) {
    failed++;
    failures.push(name);
    console.log(`  FAIL ${name}: ${e.message}`);
  }
}

const src = fs.readFileSync(RUNTIME, 'utf8');

function buildPgHandlersBlock() {
  const m = src.match(/_buildPgHandlers\(services\)\s*\{([\s\S]*?)\n  \}/);
  assert(m, '_buildPgHandlers block not found in gateway_runtime.js');
  return m[1];
}

console.log('mount-wiring contract: /tenants + /mc must require exterior auth');

test('ExteriorAuthMiddleware module is required by gateway_runtime.js', () => {
  assert(
    /require\(['"]\.\.\/exterior_auth_middleware['"]\)/.test(src),
    'gateway_runtime.js does not require ../exterior_auth_middleware'
  );
});

test('ExteriorAuthMiddleware is instantiated and initialized', () => {
  assert(/new ExteriorAuthMiddleware\(/.test(src), 'no `new ExteriorAuthMiddleware(` in gateway_runtime.js');
  assert(/_exteriorAuthMiddleware\.initialize\(\)|exteriorAuthMiddleware\.initialize\(\)/.test(src),
    'ExteriorAuthMiddleware.initialize() is never called');
});

test('SEC-001: /tenants handler is wrapped in exterior auth (not public)', () => {
  const block = buildPgHandlersBlock();
  const entry = block.match(/'\/tenants':[^\n]*/);
  assert(entry, "'/tenants' entry not found in _buildPgHandlers");
  assert(/requireAuth\(/.test(entry[0]),
    `SEC-001 OPEN: '/tenants' entry is not auth-wrapped: ${entry[0].trim()}`);
  assert(/_exteriorAuthMiddleware|exteriorAuthMiddleware/.test(block),
    'auth wrapper in _buildPgHandlers is not backed by ExteriorAuthMiddleware');
});

test('SEC-002: /mc mount carries exterior auth middleware (not public)', () => {
  // The mount passes an auth identifier (e.g. mcAuth); resolve it and require
  // it to be backed by ExteriorAuthMiddleware. A bare public mount
  // (routes.missionControl(...) as the 2nd arg) fails this test.
  const m = src.match(/this\._app\.use\('\/mc',\s*([A-Za-z_$][\w$]*)\s*,/);
  assert(m, "SEC-002 OPEN: '/mc' app.use line is not in auth-wrapped form");
  const ident = m[1];
  const defn = src.match(new RegExp(`(?:const|let|var)\\s+${ident}\\s*=([^;]*);`));
  assert(defn, `SEC-002 OPEN: cannot resolve auth identifier '${ident}' on the /mc mount`);
  assert(/exteriorAuthMiddleware/i.test(defn[1]),
    `SEC-002 OPEN: '/mc' mount identifier '${ident}' is not backed by ExteriorAuthMiddleware`);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) { console.log('OPEN FINDINGS:', failures.join(' | ')); process.exit(1); }
