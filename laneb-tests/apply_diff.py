#!/usr/bin/env python3
"""LANE B: apply the handoff auth diff to a /tmp COPY of gateway_runtime.js.

FINAL diff shape (matches HANDOFF_gateway_runtime_auth_diff.md):
  1. require ../exterior_auth_middleware at top
  2. instantiate + initialize in _initializeServices
  3. expose on services object (ERA-R convention: services.exteriorAuthMiddleware)
  4. requireAuth wrapper scaffold in _buildPgHandlers (fail-closed)
  5. wrap the /tenants handler
  6. /mc mount via mcAuth const (fail-closed when middleware absent)

Never touches the worktree. Run on the Pig:
  cp <worktree>/gateway/bootstrap/gateway_runtime.js /tmp/laneb-test/verify/gateway_runtime.fixed.js
  python3 /tmp/laneb-test/verify/apply_diff.py
"""
import sys

P = "/tmp/laneb-test/verify/gateway_runtime.fixed.js"
src = open(P).read()

EDITS = [
    ("const express = require('express');\n",
     "const express = require('express');\nconst ExteriorAuthMiddleware = require('../exterior_auth_middleware');\n"),

    ("""      console.log('[GatewayRuntime] Created default PostgreSQL pool');
    }
    let pgAvailable = false;""",
     """      console.log('[GatewayRuntime] Created default PostgreSQL pool');
    }
    // LANE B (SEC-001/SEC-002): exterior agent authentication. Fail-closed
    // (401) for unknown agents; degrades to in-memory credentials when
    // Postgres is unavailable. Same mechanism guarding /events, /ingest,
    // /missions, /ai, /connectors in the production gateway.
    this._exteriorAuthMiddleware = new ExteriorAuthMiddleware(this._pool);
    await this._exteriorAuthMiddleware.initialize();
    let pgAvailable = false;"""),

    ("    return { pool: this._pool, ...integrations, ...optional, ...core };",
     "    return { pool: this._pool, exteriorAuthMiddleware: this._exteriorAuthMiddleware, ...integrations, ...optional, ...core };"),

    ("""  _buildPgHandlers(services) {
    return {""",
     """  _buildPgHandlers(services) {
    // LANE B (SEC-001): /tenants CRUD was mounted public. Wrap with the
    // exterior auth middleware (neighbor pattern). Fail closed when the
    // middleware is absent: never serve the registry unauthenticated.
    const authMw = this._exteriorAuthMiddleware ? this._exteriorAuthMiddleware.middleware() : null;
    const requireAuth = (handler) => (req, res, next) => authMw
      ? authMw(req, res, (err) => (err ? next(err) : handler(req, res, next)))
      : res.status(503).json({ error: 'Auth not initialized', denied: true });
    return {"""),

    ("      '/tenants': routes.tenants(services.tenantRegistry),",
     "      '/tenants': requireAuth(routes.tenants(services.tenantRegistry)),"),

    ("    this._app.use('/ai', routes.ai(services.aiRuntime, services.ollamaProvider)); this._app.use('/connectors', routes.connectors(services.connectorRegistry, services.capabilityRegistry, services.oauthManager)); this._app.use('/mc', routes.missionControl({ ...services, isCanonicalReady: () => this._canonicalReady() }));",
     """    this._app.use('/ai', routes.ai(services.aiRuntime, services.ollamaProvider));
    this._app.use('/connectors', routes.connectors(services.connectorRegistry, services.capabilityRegistry, services.oauthManager));
    // LANE B (SEC-002): /mc business-intelligence surfaces were mounted public.
    // Same neighbor pattern as /ai and /connectors. Fail closed when the
    // middleware is absent (e.g. _mountRoutes invoked without _initializeServices,
    // as in gateway/test_pg_recovery.js).
    const mcAuth = this._exteriorAuthMiddleware
      ? this._exteriorAuthMiddleware.middleware()
      : ((req, res) => res.status(503).json({ error: 'Auth not initialized', denied: true }));
    this._app.use('/mc', mcAuth, routes.missionControl({ ...services, isCanonicalReady: () => this._canonicalReady() }));"""),
]

for i, (old, new) in enumerate(EDITS, 1):
    n = src.count(old)
    if n != 1:
        print(f"ANCHOR {i}: found {n} occurrences (expected 1) -- ABORT, /tmp copy unchanged")
        sys.exit(1)
    src = src.replace(old, new)

open(P, "w").write(src)
print(f"diff applied to {P}: {len(EDITS)} anchors replaced")
