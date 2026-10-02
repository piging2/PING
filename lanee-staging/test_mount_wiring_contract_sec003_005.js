/**
 * LANE E (SEC-003/004/005) — Mount-wiring contract test.
 *
 * Asserts that gateway_runtime.js mounts the 8 adjacent public surfaces
 * behind the exterior agent authentication middleware (the existing
 * production mechanism, reused by Lane B for /tenants + /mc):
 *
 *   _buildPgHandlers: /context, /api/v1/repository, /system,
 *                     /deployments, /runtime, /canonical-events
 *   _mountRoutes:     /api/v1/ollama, /knowledge
 *
 * Contract: AUTHENTICATED-only (401 fail-closed); TEN-001 authorization
 * deliberately NOT invented here. /health STAYS PUBLIC by design
 * (orchestration/health checks must not require keys) — asserted here so a
 * regression that auths /health fails loudly.
 *
 * This test FAILS on the pre-fix tree (all 8 mounts are public) and PASSES
 * once the Lane E patch is applied to gateway_runtime.js.
 *
 * Run: node tests/security/test_mount_wiring_contract_sec003_005.js
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

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

console.log('mount-wiring contract (Lane E): SEC-003/004/005 surfaces must require exterior auth');

// ─── _buildPgHandlers entries must be requireAuth-wrapped ───
const PG_ENTRIES = [
  '/context',
  '/api/v1/repository',
  '/system',
  '/deployments',
  '/runtime',
  '/canonical-events',
];

for (const p of PG_ENTRIES) {
  test(`Lane E: '${p}' handler is wrapped in exterior auth (not public)`, () => {
    const block = buildPgHandlersBlock();
    const entry = block.match(new RegExp(`'${escapeRe(p)}':[^\\n]*`));
    assert(entry, `'${p}' entry not found in _buildPgHandlers`);
    assert(/requireAuth\(/.test(entry[0]),
      `SEC-003/004/005 OPEN: '${p}' entry is not auth-wrapped: ${entry[0].trim()}`);
    assert(/_exteriorAuthMiddleware|exteriorAuthMiddleware/.test(block),
      'auth wrapper in _buildPgHandlers is not backed by ExteriorAuthMiddleware');
  });
}

// ─── _mountRoutes mounts must carry an ExteriorAuthMiddleware-backed identifier ───
function mountAuthIdentifier(mountPath) {
  const m = src.match(new RegExp(`this\\._app\\.use\\('${escapeRe(mountPath)}',\\s*([A-Za-z_$][\\w$]*)\\s*,`));
  assert(m, `OPEN: '${mountPath}' app.use line is not in auth-wrapped form (no middleware before the router)`);
  return m[1];
}

function identifierBackedByExteriorAuth(ident) {
  const defn = src.match(new RegExp(`(?:const|let|var)\\s+${ident}\\s*=([^;]*);`));
  assert(defn, `OPEN: cannot resolve auth identifier '${ident}' in _mountRoutes`);
  assert(/exteriorAuthMiddleware/i.test(defn[1]),
    `OPEN: mount identifier '${ident}' is not backed by ExteriorAuthMiddleware`);
}

for (const p of ['/api/v1/ollama', '/knowledge']) {
  test(`Lane E: '${p}' mount carries exterior auth middleware (not public)`, () => {
    const ident = mountAuthIdentifier(p);
    identifierBackedByExteriorAuth(ident);
  });
}

// ─── /health stays public by design ───
test('Lane E: /health stays PUBLIC by design (no auth middleware)', () => {
  const m = src.match(/this\._app\.use\('\/health',([^;]*)\);/);
  assert(m, "'/health' mount not found in _mountRoutes");
  assert(/routes\.health\(/.test(m[1]),
    `/health mount is not the plain public form: ${m[1].trim()}`);
  assert(!/mcAuth|requireAuth|authMw/.test(m[1]),
    `/health mount carries auth — orchestration/health checks must not require keys: ${m[1].trim()}`);
});

test('Lane E: startup check from 6396113a7 still registered on /health', () => {
  assert(/registerHealthCheck\((["'])startup\1/.test(src),
    'startup health check registration missing from _mountRoutes');
  assert(/_startupBlocked/.test(src),
    '_startupBlocked terminal-state surfacing missing from gateway_runtime.js');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) { console.log('OPEN FINDINGS:', failures.join(' | ')); process.exit(1); }
