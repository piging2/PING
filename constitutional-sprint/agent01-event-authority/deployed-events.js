/**
 * Events Routes
 * 
 * Bounded context for event query and creation endpoints.
 * HTTP → EventReadAuthority/EventWriteAuthority → Result
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../route_middleware');
const { constitutionalTimeAuthority } = require('../../ping-runtime/authorities/constitutional_time_authority.js');

function createEventRoutes(eventReadAuthority, eventRuntime, pool) {
  router.get('/', asyncHandler('/events', async (req) => {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    let events = await eventReadAuthority.getAllEvents(limit, offset);
    if ((!events || events.length === 0) && pool) {
      const result = await pool.query('SELECT * FROM ping_events ORDER BY timestamp DESC LIMIT $1 OFFSET $2', [limit, offset]);
      events = result.rows;
    }
    return { events, count: events.length, limit, offset };
  }));

  router.get('/recent', asyncHandler('/events/recent', async (req) => {
    const minutes = parseInt(req.query.minutes) || 60;
    const limit = parseInt(req.query.limit) || 100;
    let events = [];
    try {
      events = await eventReadAuthority.getRecentEvents(minutes, limit);
    } catch (e) {}
    if ((!events || events.length === 0) && pool) {
      const since = new Date(constitutionalTimeAuthority.nowAsMillis() - minutes * 60 * 1000).toISOString();
      const result = await pool.query('SELECT * FROM ping_events WHERE timestamp >= $1 ORDER BY timestamp DESC LIMIT $2', [since, limit]);
      events = result.rows;
    }
    return { events, count: events.length, minutes, limit };
  }));

  router.get('/stats', asyncHandler('/events/stats', async (req) => {
    let stats;
    try {
      stats = await eventReadAuthority.getEventStats();
    } catch (e) {}
    if ((!stats || !stats.total_events || stats.total_events === '0') && pool) {
      const result = await pool.query(`SELECT COUNT(*) as total_events, COUNT(DISTINCT event_type) as event_types, MIN(timestamp) as oldest_event, MAX(timestamp) as newest_event FROM ping_events`);
      const row = result.rows[0];
      stats = {
        total_events: row.total_events,
        streams: row.total_events,
        event_types: row.event_types,
        oldest_event: row.oldest_event,
        newest_event: row.newest_event
      };
    }
    return { stats };
  }));

  router.get('/:stream', asyncHandler('/events/:stream', async (req) => {
    const stream = req.params.stream;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    let events = await eventReadAuthority.getEventsByStream(stream, limit, offset);
    if ((!events || events.length === 0) && pool) {
      const result = await pool.query('SELECT * FROM ping_events WHERE event_type = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3', [stream, limit, offset]);
      events = result.rows;
    }
    return { events, stream, count: events.length, limit, offset };
  }));

  router.post('/', asyncHandler('/events', async (req, res) => {
    // Website-BFF practice envelope: { type, payload, proof, metadata }.
    // Normalized into canonical journal shape by the social ingest adapter
    // (BFF signature verified; vocabulary enforced; ids minted by the ONE
    // IdentityAuthority). Typed client errors return 400.
    if (req.body && req.body.type && req.body.payload && !req.body.event_type) {
      // Lane B (2026-09-21, additive): knowledge envelopes (payload.schema
      // 'ping.knowledge.*') normalize through the knowledge ingest adapter;
      // everything else keeps the proven social adapter. The social path is
      // untouched.
      const kSchema = req.body.payload && req.body.payload.schema;
      const adapter =
        typeof kSchema === 'string' && kSchema.startsWith('ping.knowledge.')
          ? require('../knowledge_ingest_adapter')
          : require('../social_ingest_adapter');
      const normalize =
        adapter.normalizeKnowledgeEnvelope || adapter.normalizeBffEnvelope;
      let norm;
      try {
        norm = await normalize(req.body, pool);
      } catch (e) {
        const code = String(e.message || 'INGEST_ERROR').split(':')[0];
        const client = /^(INVALID_|UNKNOWN_|MISSING_|UNSUPPORTED_|PREDICATE_|SECRET_|SIGNER_)/.test(code);
        res.status(client ? 400 : 500).json({ error: code, message: e.message });
        return;
      }
      const bffResult = await eventRuntime.emit(norm.eventType, 'api', norm.eventData, {
        metadata: { aggregate_id: norm.aggregateId, aggregate_type: norm.aggregateType }
      });
      if (bffResult.status !== 'ok') {
        throw new Error(bffResult.error || 'Event rejected');
      }
      return {
        event_id: bffResult.eventId,
        id: bffResult.eventId, // BFF-reader compatibility: the website BFF reads `id`
        event_type: norm.eventType,
        aggregate_id: norm.aggregateId,
        aggregate_type: norm.aggregateType,
        status: 'ok'
      };
    }

    const { event_type, aggregate_id, aggregate_type, event_data } = req.body;
    if (!event_type || !aggregate_id || !aggregate_type || !event_data) {
      throw new Error('event_type, aggregate_id, aggregate_type, and event_data are required');
    }
    // Canonical spine: emit directly through UnifiedEventRuntime (ping_events),
    // not through the kernel pipeline (repository_events). The kernel's reducer/projection
    // registries are empty and EventBridge adds a 5s delay for no benefit.
    const result = await eventRuntime.emit(event_type, 'api', event_data, {
      metadata: { aggregate_id, aggregate_type }
    });
    if (result.status !== 'ok') {
      throw new Error(result.error || 'Event rejected');
    }
    return { event_id: result.eventId, event_type, status: 'ok' };
  }));

  router.post('/processed', asyncHandler('/events/processed', async (req) => {
    const { event_id, worker } = req.body;
    if (!event_id) throw new Error('event_id is required');
    const ok = await eventReadAuthority.markProcessed(event_id, worker || 'worker_runtime');
    if (!ok) throw new Error(`Failed to mark event processed: ${event_id}`);
    return { processed: true, event_id };
  }));

  router.post('/failed', asyncHandler('/events/failed', async (req) => {
    const { event_id, worker, error } = req.body;
    if (!event_id) throw new Error('event_id is required');
    const ok = await eventReadAuthority.markFailed(event_id, worker || 'worker_runtime', error || 'unknown');
    if (!ok) throw new Error(`Failed to mark event failed: ${event_id}`);
    return { failed: true, event_id };
  }));

  router.get('/unprocessed', asyncHandler('/events/unprocessed', async (req) => {
    const limit = parseInt(req.query.limit) || 100;
    const events = await eventReadAuthority.getUnprocessedEvents(limit);
    return { events, count: events.length };
  }));

  // Causal traversal endpoints — query the causal tree in ping_events
  // via UnifiedEventRuntime's indexed traversal methods.

  router.get('/:eventId/children', asyncHandler('/events/:eventId/children', async (req) => {
    const { eventId } = req.params;
    if (!eventId) throw new Error('eventId is required');
    const limit = parseInt(req.query.limit) || 50;
    return await eventRuntime.getChildren(eventId, limit);
  }));

  router.get('/:eventId/descendants', asyncHandler('/events/:eventId/descendants', async (req) => {
    const { eventId } = req.params;
    if (!eventId) throw new Error('eventId is required');
    const maxDepth = parseInt(req.query.maxDepth) || 10;
    const limit = parseInt(req.query.limit) || 200;
    return await eventRuntime.getDescendants(eventId, maxDepth, limit);
  }));

  router.get('/:eventId/ancestors', asyncHandler('/events/:eventId/ancestors', async (req) => {
    const { eventId } = req.params;
    if (!eventId) throw new Error('eventId is required');
    const maxDepth = parseInt(req.query.maxDepth) || 20;
    return await eventRuntime.getAncestors(eventId, maxDepth);
  }));

  router.get('/correlation/:correlationId', asyncHandler('/events/correlation/:correlationId', async (req) => {
    const { correlationId } = req.params;
    if (!correlationId) throw new Error('correlationId is required');
    const limit = parseInt(req.query.limit) || 200;
    return await eventRuntime.getCorrelationGroup(correlationId, limit);
  }));

  return router;
}

module.exports = createEventRoutes;
