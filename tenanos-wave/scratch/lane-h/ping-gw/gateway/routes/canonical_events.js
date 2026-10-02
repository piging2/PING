/**
 * Canonical Event Routes
 * 
 * P001: HTTP interface for the Canonical Event Envelope Authority.
 * 
 * POST /canonical-events — Emit event
 * GET /canonical-events — Query events
 * GET /canonical-events/stats — Event statistics
 * GET /canonical-events/unprocessed — Unprocessed events
 * POST /canonical-events/:id/processed — Mark processed
 * POST /canonical-events/:id/failed — Mark failed
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../route_middleware');

function createCanonicalEventRoutes(canonicalEventEnvelope) {
  router.post('/', asyncHandler('POST /canonical-events', async (req) => {
    const {
      tenant_id, event_type, source, actor, payload,
      causation_id, correlation_id, metadata,
    } = req.body;

    if (!tenant_id || !event_type || !source || !actor || !payload) {
      throw new Error('tenant_id, event_type, source, actor, and payload are required');
    }

    const event = await canonicalEventEnvelope.executeEmitEvent({
      tenantId: tenant_id,
      eventType: event_type,
      source,
      actor,
      payload,
      causationId: causation_id,
      correlationId: correlation_id,
      metadata,
    });

    return { event };
  }));

  router.get('/', asyncHandler('GET /canonical-events', async (req) => {
    const {
      tenant_id, event_type, correlation_id,
      from, to, limit, offset,
    } = req.query;

    const events = await canonicalEventEnvelope.executeQueryEvents({
      tenantId: tenant_id,
      eventType: event_type,
      correlationId: correlation_id,
      from,
      to,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    return { events, count: events.length };
  }));

  router.get('/stats', asyncHandler('GET /canonical-events/stats', async (req) => {
    const { tenant_id } = req.query;
    const stats = await canonicalEventEnvelope.executeGetStats(tenant_id);
    return { stats };
  }));

  router.get('/unprocessed', asyncHandler('GET /canonical-events/unprocessed', async (req) => {
    const { tenant_id, limit } = req.query;
    if (!tenant_id) throw new Error('tenant_id is required');
    const events = await canonicalEventEnvelope.executeGetUnprocessed(
      tenant_id,
      limit ? parseInt(limit) : undefined
    );
    return { events, count: events.length };
  }));

  router.post('/:id/processed', asyncHandler('POST /canonical-events/:id/processed', async (req) => {
    const { id } = req.params;
    const { worker } = req.body;
    await canonicalEventEnvelope.executeMarkProcessed(id, worker || 'worker');
    return { processed: true, event_id: id };
  }));

  router.post('/:id/failed', asyncHandler('POST /canonical-events/:id/failed', async (req) => {
    const { id } = req.params;
    const { worker, error } = req.body;
    await canonicalEventEnvelope.executeMarkFailed(id, worker || 'worker', error || 'unknown');
    return { failed: true, event_id: id };
  }));

  return router;
}

module.exports = createCanonicalEventRoutes;
