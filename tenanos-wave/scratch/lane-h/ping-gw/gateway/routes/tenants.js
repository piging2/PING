/**
 * Tenant Registry Routes
 * 
 * P003: HTTP interface for the Tenant Registry Authority.
 * 
 * POST /tenants — Register tenant
 * GET /tenants — List tenants
 * GET /tenants/:id — Resolve tenant
 * PUT /tenants/:id — Update tenant
 * DELETE /tenants/:id — Remove tenant
 * POST /tenants/:id/heartbeat — Record heartbeat
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../route_middleware');

function createTenantRoutes(tenantRegistry) {
  router.post('/', asyncHandler('POST /tenants', async (req) => {
    const {
      tenant_id, name, domains, health_endpoint, metrics_endpoint,
      logs_endpoint, traces_endpoint, events_endpoint, capabilities, metadata,
    } = req.body;

    if (!tenant_id || !name) {
      throw new Error('tenant_id and name are required');
    }

    const tenant = await tenantRegistry.executeRegisterTenant({
      tenantId: tenant_id,
      name,
      domains,
      healthEndpoint: health_endpoint,
      metricsEndpoint: metrics_endpoint,
      logsEndpoint: logs_endpoint,
      tracesEndpoint: traces_endpoint,
      eventsEndpoint: events_endpoint,
      capabilities,
      metadata,
    });

    return { tenant };
  }));

  router.get('/', asyncHandler('GET /tenants', async (req) => {
    const { status } = req.query;
    const tenants = await tenantRegistry.executeListTenants({ status });
    return { tenants, count: tenants.length };
  }));

  router.get('/:id', asyncHandler('GET /tenants/:id', async (req) => {
    const { id } = req.params;
    const tenant = await tenantRegistry.executeResolveTenant(id);
    if (!tenant) throw new Error(`Tenant ${id} not found`);
    return { tenant };
  }));

  router.put('/:id', asyncHandler('PUT /tenants/:id', async (req) => {
    const { id } = req.params;
    const updates = req.body;
    const tenant = await tenantRegistry.executeUpdateTenant(id, updates);
    if (!tenant) throw new Error(`Tenant ${id} not found`);
    return { tenant };
  }));

  router.delete('/:id', asyncHandler('DELETE /tenants/:id', async (req) => {
    const { id } = req.params;
    await tenantRegistry.executeRemoveTenant(id);
    return { removed: true, tenant_id: id };
  }));

  router.post('/:id/heartbeat', asyncHandler('POST /tenants/:id/heartbeat', async (req) => {
    const { id } = req.params;
    await tenantRegistry.executeRecordHeartbeat(id);
    return { heartbeat: true, tenant_id: id };
  }));

  return router;
}

module.exports = createTenantRoutes;
