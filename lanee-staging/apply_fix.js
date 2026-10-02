/**
 * LANE E (SEC-003/004/005) — patch applier for gateway/bootstrap/gateway_runtime.js.
 *
 * Applies the Lane B exterior-auth mount pattern to the 8 adjacent public
 * surfaces. Every replacement is an exact-match splice; the script aborts
 * WITHOUT writing if any anchor is missing or ambiguous (found != 1).
 *
 * Run on the Pig from the worktree root:
 *   node /tmp/lanee/apply_fix.js
 */
'use strict';

const fs = require('fs');
const crypto = require('crypto');

const FILE = '/home/nolan/worktrees/constitutional-convergence/gateway/bootstrap/gateway_runtime.js';

const before = fs.readFileSync(FILE, 'utf8');
const beforeMd5 = crypto.createHash('md5').update(before, 'utf8').digest('hex');
console.log('before md5:', beforeMd5);

function splice(src, oldStr, newStr, label) {
  const idx = src.indexOf(oldStr);
  if (idx === -1) {
    console.error(`ABORT: anchor not found: ${label}`);
    process.exit(1);
  }
  if (src.indexOf(oldStr, idx + 1) !== -1) {
    console.error(`ABORT: anchor ambiguous (found >1): ${label}`);
    process.exit(1);
  }
  return src.slice(0, idx) + newStr + src.slice(idx + oldStr.length);
}

let out = before;

// R1: wrap the six _buildPgHandlers entries in requireAuth
out = splice(out,
  "      '/events': routes.events(services.eventReadAuthority, services.unifiedEventRuntime, services.pool),\n" +
  "      '/context': routes.context(services.eventReadAuthority),\n" +
  "      '/api/v1/repository': routes.repository(services.repoStore),\n" +
  "      '/system': routes.system(services.eventReadAuthority),\n" +
  "      '/canonical-events': routes.canonicalEvents(services.canonicalEventEnvelope),\n" +
  "      '/tenants': requireAuth(routes.tenants(services.tenantRegistry)),\n" +
  "      '/deployments': routes.deployments(services.deploymentRegistry),\n" +
  "      '/runtime': routes.runtime(services.runtimeRegistry),\n" +
  "      '/ingest': routes.ingest(services.canonicalizationService),",
  "      '/events': routes.events(services.eventReadAuthority, services.unifiedEventRuntime, services.pool),\n" +
  "      '/context': requireAuth(routes.context(services.eventReadAuthority)),\n" +
  "      '/api/v1/repository': requireAuth(routes.repository(services.repoStore)),\n" +
  "      '/system': requireAuth(routes.system(services.eventReadAuthority)),\n" +
  "      '/canonical-events': requireAuth(routes.canonicalEvents(services.canonicalEventEnvelope)),\n" +
  "      '/tenants': requireAuth(routes.tenants(services.tenantRegistry)),\n" +
  "      '/deployments': requireAuth(routes.deployments(services.deploymentRegistry)),\n" +
  "      '/runtime': requireAuth(routes.runtime(services.runtimeRegistry)),\n" +
  "      '/ingest': routes.ingest(services.canonicalizationService),",
  'R1 _buildPgHandlers entries');

// R2: extend the Lane B comment in _buildPgHandlers
out = splice(out,
  "    // LANE B (SEC-001): /tenants CRUD was mounted public. Wrap with the\n" +
  "    // exterior auth middleware (neighbor pattern). Fail closed when the\n" +
  "    // middleware is absent: never serve the registry unauthenticated.",
  "    // LANE B (SEC-001): /tenants CRUD was mounted public. Wrap with the\n" +
  "    // exterior auth middleware (neighbor pattern). Fail closed when the\n" +
  "    // middleware is absent: never serve the registry unauthenticated.\n" +
  "    // LANE E (SEC-003/004/005): /context, /api/v1/repository, /system,\n" +
  "    // /deployments, /runtime, /canonical-events were mounted public through\n" +
  "    // the same unauthenticated _pgRoute dispatch. Wrapped with the same\n" +
  "    // requireAuth helper (AUTHENTICATED-only, 401 fail-closed; TEN-001\n" +
  "    // authorization deliberately not invented here).",
  'R2 _buildPgHandlers comment');

// R3: hoist mcAuth to the top of _mountRoutes and auth the /api/v1/ollama mount
out = splice(out,
  "  _mountRoutes(services) {\n" +
  "    this._app.use('/api/v1/ollama', routes.ollama(services.aiRuntime, services.ollamaProvider));",
  "  _mountRoutes(services) {\n" +
  "    // LANE E (SEC-003/004/005): /api/v1/ollama and /knowledge were mounted\n" +
  "    // public. Reuse the Lane B mcAuth identifier (exterior auth middleware;\n" +
  "    // 401 fail-closed, 503 fail-closed when the middleware is absent).\n" +
  "    const mcAuth = this._exteriorAuthMiddleware\n" +
  "      ? this._exteriorAuthMiddleware.middleware()\n" +
  "      : ((req, res) => res.status(503).json({ error: 'Auth not initialized', denied: true }));\n" +
  "    this._app.use('/api/v1/ollama', mcAuth, routes.ollama(services.aiRuntime, services.ollamaProvider));",
  'R3 mcAuth hoist + ollama mount');

// R4: remove the old mcAuth definition; keep the /mc mount on the hoisted identifier
out = splice(out,
  "    // LANE B (SEC-002): /mc business-intelligence surfaces were mounted public.\n" +
  "    // Same neighbor pattern as /ai and /connectors. Fail closed when the\n" +
  "    // middleware is absent (e.g. _mountRoutes invoked without _initializeServices,\n" +
  "    // as in gateway/test_pg_recovery.js).\n" +
  "    const mcAuth = this._exteriorAuthMiddleware\n" +
  "      ? this._exteriorAuthMiddleware.middleware()\n" +
  "      : ((req, res) => res.status(503).json({ error: 'Auth not initialized', denied: true }));\n" +
  "    this._app.use('/mc', mcAuth, routes.missionControl({ ...services, isCanonicalReady: () => this._canonicalReady() }));",
  "    // LANE B (SEC-002): /mc business-intelligence surfaces were mounted public.\n" +
  "    // mcAuth is defined at the top of _mountRoutes (Lane E hoisted it so\n" +
  "    // /api/v1/ollama and /knowledge can share it). Fail closed when the\n" +
  "    // middleware is absent (e.g. _mountRoutes invoked without _initializeServices,\n" +
  "    // as in gateway/test_pg_recovery.js).\n" +
  "    this._app.use('/mc', mcAuth, routes.missionControl({ ...services, isCanonicalReady: () => this._canonicalReady() }));",
  'R4 mcAuth dedup + /mc mount');

// R5: auth the /knowledge mount
out = splice(out,
  "this._app.use('/knowledge', routes.knowledge(services.knowledgeGraph, { hybridSearch: services.hybridSearch }))",
  "this._app.use('/knowledge', mcAuth, routes.knowledge(services.knowledgeGraph, { hybridSearch: services.hybridSearch }))",
  'R5 /knowledge mount');

if (out === before) {
  console.error('ABORT: no changes applied');
  process.exit(1);
}

fs.writeFileSync(FILE, out, 'utf8');
const afterMd5 = crypto.createHash('md5').update(out, 'utf8').digest('hex');
console.log('after md5:', afterMd5);
console.log('APPLIED: R1..R5 (5 splices)');
