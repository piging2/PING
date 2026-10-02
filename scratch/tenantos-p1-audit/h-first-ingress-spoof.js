/**
 * HOSTILE TEST H-FIRST: ingress tenant spoof (the FIRST place tenant context
 * can be spoofed, lost, or substituted in the ingress -> mission -> run ->
 * execution -> event -> projection trace).
 *
 * Ground truth (swarm-01 boundary map, read-only audit of the live substrate
 * at /home/nolan/ping, 2026-09-23):
 *   - gateway/bootstrap/gateway_runtime.js:116 installs ONLY express.json() +
 *     CORS '*'. There is NO auth middleware: authenticate(req) -> null.
 *   - CanonicalizationService.resolveNamespace(source, requested):
 *         requested || perSourceDefault || globalDefault
 *     with only a format check on `requested` (the "route guard" at
 *     routes/ingest.js:47 guards shape, not authority).
 *   - POST /tenants, /ingest, /canonical-events, /missions accept
 *     tenant_id / namespace from the request body, unauthenticated.
 *
 * This test encodes that CURRENT behavior faithfully and demonstrates that a
 * principal acting for tenant A can emit into tenant B's namespace.
 * The kit's namespace binder (the existing-authority fix: authorizeNamespace
 * delegates the allow/deny decision to it) is then shown to refuse the same
 * spoof. The remaining root cause (no authentication -> nothing to bind TO)
 * is a Nolan auth-model decision, recorded open, NOT silently built here.
 *
 * Run: node --test h-first-ingress-spoof.js
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  createNamespaceBinder,
} = require('/home/hatch/workspace/tenanos-wave/swarm-01/kit/namespace-binding.js');

// --- Faithful stub of CURRENT live behavior (audited, not invented) --------
const NAMESPACE_RE = /^(core|tenant)::[a-zA-Z0-9_-]+$/;

/** Current gateway auth: no middleware installed -> no principal. */
function currentAuthenticate(/* req */) {
  return null; // gateway_runtime.js:116 — express.json() + CORS only
}

/** Current resolveNamespace: honor-system override (canonicalization_service.js:57). */
function currentResolveNamespace(source, requested) {
  const perSourceDefault = { 'review-emitter': 'tenant::acme' }[source];
  const chosen = requested || perSourceDefault || 'core::owner';
  if (!NAMESPACE_RE.test(chosen)) throw new Error('invalid namespace shape');
  return chosen; // shape checked; authority never checked
}

/** Current POST /ingest tenant handling: namespace from body, unbound. */
function currentIngestRoute(req) {
  const principal = currentAuthenticate(req);
  const namespace = currentResolveNamespace(req.body.source, req.body.namespace);
  return { principal, namespace, accepted: true };
}

// --- The attack -------------------------------------------------------------
test('H-FIRST (break): principal for tenant A spoofs tenant_id=B at ingress', () => {
  // Attacker is really tenant A's operator, but asserts B's namespace.
  const req = { body: { source: 'attacker-cli', namespace: 'tenant::victim-b' } };
  const res = currentIngestRoute(req);
  // BREAK DEMONSTRATED: no principal, override honored, event lands in B.
  assert.equal(res.principal, null);
  assert.equal(res.namespace, 'tenant::victim-b');
  assert.equal(res.accepted, true);
  console.log('BREAK DEMONSTRATED H-FIRST: unauthenticated ingress honored ' +
    "namespace 'tenant::victim-b' from source 'attacker-cli' (spoof succeeds).");
});

test('H-FIRST (fix): the existing binder authority refuses the same spoof', () => {
  // Bindings are operator-registered (from the tenant registry), never caller-set.
  const binder = createNamespaceBinder();
  binder.bindSourceToTenant('review-emitter', 'acme'); // tenant A's legit source
  const spoof = binder.authorize('attacker-cli', 'tenant::victim-b');
  assert.equal(spoof.authorized, false);
  assert.match(spoof.reason, /not bound/);
  const legit = binder.authorize('review-emitter', 'tenant::acme');
  assert.equal(legit.authorized, true);
  assert.equal(legit.namespace, 'tenant::acme');
  console.log('FIX HOLDS H-FIRST: unbound explicit namespace override DENIED; ' +
    'bound source override allowed.');
});

test('H-FIRST (root cause, open): with no authentication there is no principal to bind', () => {
  // Even the binder needs a trustworthy `source`. Today `source` is also
  // caller-asserted (req.body.source). The binder fixes the override branch;
  // the trust root (who is calling) is Nolan's auth-model decision.
  const principal = currentAuthenticate({ body: { source: 'attacker-cli' } });
  assert.equal(principal, null);
  console.log('OPEN: gateway has no auth middleware; source identity is still ' +
    'caller-asserted. Recorded as the auth-model decision (not silently built).');
});
