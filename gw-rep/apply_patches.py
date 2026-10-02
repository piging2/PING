"""GW-REP repair patches applied to a scratch copy of the jev-surgical tree.
Priority 1: exterior-auth backport (401 posture on /events + 6 sibling routes,
namespace filter on event reads).
Priority 2: W-1 logical_id default in BaseWorker._emit.
Priority 3: EventBridge tenant-namespace (Lane H, adapted: NAMESPACE_RE inlined,
jev-surgical has no canonicalization/namespace_binding module).
Each substitution anchors exactly once or the script aborts.
"""
import sys

R = '/tmp/gw-rep/fixed-tree'

def patch(path, subs):
    p = R + '/' + path
    s = open(p).read()
    for name, old, new in subs:
        n = s.count(old)
        if n != 1:
            print(f'ANCHOR FAIL [{path}] {name}: found {n}x')
            sys.exit(1)
        s = s.replace(old, new)
        print(f'ok [{path}] {name}')
    open(p, 'w').write(s)

# ---------- PATCH A: exterior auth backport ----------
patch('gateway/bootstrap/gateway_runtime.js', [
    ('require',
     "const createEventRoutes = require('../routes/events');",
     "const createEventRoutes = require('../routes/events');\n"
     "const ExteriorAuthMiddleware = require('../exterior_auth_middleware');"),
    ('construct',
     "      console.error(`[GatewayRuntime]   ${err.message}`);\n    }\n",
     "      console.error(`[GatewayRuntime]   ${err.message}`);\n"
     "    }\n"
     "\n"
     "    // Exterior-agent auth boundary (backport): HTTP bearer auth for exterior\n"
     "    // routes. initialize() degrades to in-memory credentials when Postgres is\n"
     "    // unavailable; the guarded mounts below only apply where Postgres is up.\n"
     "    const exteriorAuthMiddleware = new ExteriorAuthMiddleware(this._pool);\n"
     "    await exteriorAuthMiddleware.initialize();\n"
     "    console.log('[GatewayRuntime] Exterior Auth Middleware initialized');\n"),
    ('services',
     "      deadLetterAuthority,\n      // Capability + OAuth framework",
     "      deadLetterAuthority,\n"
     "      // Exterior-agent auth boundary (backport)\n"
     "      exteriorAuthMiddleware,\n"
     "      // Capability + OAuth framework"),
    ('mount-events',
     "this._app.use('/events', createEventRoutes(services.eventReadAuthority, services.unifiedEventRuntime, services.pool));",
     "this._app.use('/events', services.exteriorAuthMiddleware.middleware(), createEventRoutes(services.eventReadAuthority, services.unifiedEventRuntime, services.pool));"),
    ('mount-canonical',
     "this._app.use('/canonical-events', createCanonicalEventRoutes(services.canonicalEventEnvelope));",
     "this._app.use('/canonical-events', services.exteriorAuthMiddleware.middleware(), createCanonicalEventRoutes(services.canonicalEventEnvelope));"),
    ('mount-ingest',
     "this._app.use('/ingest', createIngestRoutes(services.canonicalizationService));",
     "this._app.use('/ingest', services.exteriorAuthMiddleware.middleware(), createIngestRoutes(services.canonicalizationService));"),
    ('mount-orchestration',
     "this._app.use('/orchestration', createOrchestrationRoutes(services.executionEngine));",
     "this._app.use('/orchestration', services.exteriorAuthMiddleware.middleware(), createOrchestrationRoutes(services.executionEngine));"),
    ('mount-missions',
     "this._app.use('/missions', createMissionRoutes(services.missionRuntime));",
     "this._app.use('/missions', services.exteriorAuthMiddleware.middleware(), createMissionRoutes(services.missionRuntime));"),
    ('mount-ai',
     "this._app.use('/ai', createAIRoutes(services.aiRuntime, services.ollamaProvider));",
     "this._app.use('/ai', services.exteriorAuthMiddleware.middleware(), createAIRoutes(services.aiRuntime, services.ollamaProvider));"),
    ('mount-connectors',
     "this._app.use('/connectors', createConnectorRoutes(services.connectorRegistry, services.capabilityRegistry, services.oauthManager));",
     "this._app.use('/connectors', services.exteriorAuthMiddleware.middleware(), createConnectorRoutes(services.connectorRegistry, services.capabilityRegistry, services.oauthManager));"),
])

# ---------- PATCH B: namespace filter on event reads ----------
patch('gateway/routes/events.js', [
    ('read-filter',
     "  router.get('/', asyncHandler('/events', async (req) => {\n"
     "    const limit = parseInt(req.query.limit) || 100;\n"
     "    const offset = parseInt(req.query.offset) || 0;\n"
     "    let events = await eventReadAuthority.getAllEvents(limit, offset);\n"
     "    if ((!events || events.length === 0) && pool) {\n"
     "      const result = await pool.query('SELECT * FROM ping_events ORDER BY timestamp DESC LIMIT $1 OFFSET $2', [limit, offset]);\n"
     "      events = result.rows;\n"
     "    }\n"
     "    return { events, count: events.length, limit, offset };\n"
     "  }));",
     "  router.get('/', asyncHandler('/events', async (req) => {\n"
     "    const limit = parseInt(req.query.limit) || 100;\n"
     "    const offset = parseInt(req.query.offset) || 0;\n"
     "    // Tenant isolation on reads (backport): an optional namespace filter\n"
     "    // scopes the query to one tenant's events. Namespace syntax is enforced\n"
     "    // (core::<name> or tenant::<id>); anything else is rejected.\n"
     "    const namespace = req.query.namespace;\n"
     "    if (namespace !== undefined && (typeof namespace !== 'string' || !/^(core|tenant)::[a-zA-Z0-9_-]+$/.test(namespace))) {\n"
     "      throw new Error('Invalid namespace filter');\n"
     "    }\n"
     "    let events = await eventReadAuthority.getAllEvents(limit, offset);\n"
     "    if ((!events || events.length === 0) && pool) {\n"
     "      const params = [limit, offset];\n"
     "      let sql = 'SELECT * FROM ping_events';\n"
     "      if (namespace) {\n"
     "        sql += ' WHERE namespace = $3';\n"
     "        params.push(namespace);\n"
     "      }\n"
     "      sql += ' ORDER BY timestamp DESC LIMIT $1 OFFSET $2';\n"
     "      const result = await pool.query(sql, params);\n"
     "      events = result.rows;\n"
     "    } else if (namespace && events) {\n"
     "      events = events.filter((e) => (e.namespace || e.NAMESPACE) === namespace);\n"
     "    }\n"
     "    return { events, count: events.length, limit, offset };\n"
     "  }));"),
])

# ---------- PATCH C: W-1 logical_id default in BaseWorker._emit ----------
patch('ping-runtime/workers/canonical_workers.js', [
    ('logical-id-default',
     "    const causation_id = options.causation_id || this._event?.event_id || null;",
     "    const causation_id = options.causation_id || this._event?.event_id || null;\n"
     "    // Idempotency (W-1): default the timestamp-stripped logical identity from\n"
     "    // stable causation material so a retried handle() converges on the same\n"
     "    // event_id instead of reminting one per wall-clock attempt. The spine\n"
     "    // hashes logical_id INSTEAD of the payload, so payload timestamps no\n"
     "    // longer participate in identity. Callers that legitimately emit multiple\n"
     "    // distinct events of one type from a single trigger MUST pass an explicit\n"
     "    // options.logical_id.\n"
     "    const logical_id = options.logical_id\n"
     "      || (causation_id ? `${eventType}:${causation_id}` : undefined);"),
    ('logical-id-plumb',
     "      ...options,\n      namespace,\n      correlation_id,\n      causation_id,\n      metadata: emitMetadata,",
     "      ...options,\n      namespace,\n      correlation_id,\n      causation_id,\n      logical_id,\n      metadata: emitMetadata,"),
])

# ---------- PATCH D: EventBridge tenant-namespace (Lane H, adapted) ----------
patch('ping-runtime/events/event_bridge.js', [
    ('ns-helper',
     "  *   - Single source of truth: UnifiedEventRuntime\n  */\n",
     "  *   - Single source of truth: UnifiedEventRuntime\n  */\n"
     "\n"
     "// Canonical tenant-namespace mapping (adapted from Lane H\n"
     "// fix-event-bridge-tenant-namespace.diff: jev-surgical has no\n"
     "// canonicalization/namespace_binding module, so NAMESPACE_RE is inlined\n"
     "// here, identical to the copies in canonicalization_service.js and\n"
     "// evidence_authority.js).\n"
     "const NAMESPACE_RE = /^(core|tenant)::[a-zA-Z0-9_-]+$/;\n"
     "\n"
     "// Canonical tenant-slug shape: the tenant identity string IS `tenant::<slug>`.\n"
     "const TENANT_SLUG_RE = /^[a-z0-9-]{1,64}$/;\n"
     "const SYSTEM_NAMESPACE = 'core::system';\n"
     "\n"
     "/**\n"
     " * Map a canonical_events tenant_id to the enforced spine namespace.\n"
     " * Unknown/unmappable tenant -> system default + tenant_unknown tag so the\n"
     " * laundering is OBSERVABLE instead of silent (worker keeps running).\n"
     " */\n"
     "function namespaceForTenantId(tenantId) {\n"
     "  if (tenantId === null || tenantId === undefined || tenantId === '') {\n"
     "    return { namespace: SYSTEM_NAMESPACE, tenantUnknown: true };\n"
     "  }\n"
     "  const raw = String(tenantId);\n"
     "  if (NAMESPACE_RE.test(raw)) return { namespace: raw, tenantUnknown: false };\n"
     "  if (TENANT_SLUG_RE.test(raw)) return { namespace: `tenant::${raw}`, tenantUnknown: false };\n"
     "  return { namespace: SYSTEM_NAMESPACE, tenantUnknown: true };\n"
     "}\n"),
    ('ns-emit',
     "        const emitResult = await this._eventRuntime.emit(\n"
     "          row.event_type,\n"
     "          'canonical_events',  // source identifies the bridge origin\n"
     "          payload,\n"
     "          {\n"
     "            _skipGovernance: true,  // already governed in canonical_events\n"
     "            causation_id: row.causation_id ? String(row.causation_id) : undefined,\n"
     "            correlation_id: row.correlation_id ? String(row.correlation_id) : undefined,\n"
     "            metadata: {\n"
     "              bridged_from: 'canonical_events',\n"
     "              original_event_id: String(row.event_id),\n"
     "              tenant_id: row.tenant_id,\n"
     "              actor: row.actor,\n"
     "              event_version: row.event_version || '1.0.0',\n"
     "            },\n"
     "          }\n"
     "        );",
     "        // Tenant boundary: the envelope's tenant_id must survive as the\n"
     "        // ENFORCED spine namespace, not just as inert metadata. Without an\n"
     "        // explicit namespace the spine stamps core::system and the tenant\n"
     "        // scope is lost to every downstream consumer.\n"
     "        const tenantNs = namespaceForTenantId(row.tenant_id);\n"
     "\n"
     "        const emitResult = await this._eventRuntime.emit(\n"
     "          row.event_type,\n"
     "          'canonical_events',  // source identifies the bridge origin\n"
     "          payload,\n"
     "          {\n"
     "            _skipGovernance: true,  // already governed in canonical_events\n"
     "            namespace: tenantNs.namespace,\n"
     "            causation_id: row.causation_id ? String(row.causation_id) : undefined,\n"
     "            correlation_id: row.correlation_id ? String(row.correlation_id) : undefined,\n"
     "            metadata: {\n"
     "              bridged_from: 'canonical_events',\n"
     "              original_event_id: String(row.event_id),\n"
     "              tenant_id: row.tenant_id,\n"
     "              actor: row.actor,\n"
     "              event_version: row.event_version || '1.0.0',\n"
     "              ...(tenantNs.tenantUnknown ? { tenant_unknown: true } : {}),\n"
     "            },\n"
     "          }\n"
     "        );"),
])
print('ALL PATCHES APPLIED')
