/**
 * Event-to-Mission Bridge — PING Core v1
 *
 * Listens to business events on UnifiedEventRuntime and creates missions
 * that workers can process. This is the missing link between "event emitted"
 * and "worker executes."
 *
 * Flow:
 *   Business event → Bridge → Mission created → Scheduler dispatches → Worker executes
 *
 * Each business event type maps to a mission type and worker.
 * The bridge does NOT modify state — it only creates missions.
 */

const { canonicalPriority } = require('../boundaries/priority_boundary.js');

// Business event → mission type mapping
// Worker identity is resolved by MissionScheduler via MISSION_WORKER_MAP —
// this map declares mission type and priority only. The 'worker' field was
// historically present but never read; removed to eliminate dead data.
// Priority values in this map are ANY valid scale (0-3, 1-10, string).
// canonicalPriority() normalizes them at the single ingress boundary.
const EVENT_MISSION_MAP = {
  // Customer events
  CUSTOMER_CREATED: { missionType: 'CUSTOMER_ONBOARD', priority: 2 },
  CUSTOMER_UPDATED: { missionType: 'CUSTOMER_UPDATE', priority: 1 },

  // Lead events
  LEAD_CREATED: { missionType: 'LEAD_FOLLOWUP', priority: 3 },
  LEAD_CONVERTED: { missionType: 'LEAD_CONVERT', priority: 2 },

  // Project events
  PROJECT_CREATED: { missionType: 'PROJECT_SETUP', priority: 2 },
  PROJECT_UPDATED: { missionType: 'PROJECT_UPDATE', priority: 1 },
  PROJECT_COMPLETED: { missionType: 'PROJECT_CLOSEOUT', priority: 3 },

  // Estimate events
  ESTIMATE_CREATED: { missionType: 'ESTIMATE_PREPARE', priority: 2 },
  ESTIMATE_SENT: { missionType: 'ESTIMATE_FOLLOWUP', priority: 3 },
  ESTIMATE_ACCEPTED: { missionType: 'ESTIMATE_CONVERT', priority: 3 },

  // Invoice events
  INVOICE_CREATED: { missionType: 'INVOICE_TRACK', priority: 2 },
  INVOICE_SENT: { missionType: 'INVOICE_FOLLOWUP', priority: 3 },
  INVOICE_PAID: { missionType: 'INVOICE_CLOSE', priority: 1 },

  // Review events
  REVIEW_RECEIVED: { missionType: 'REVIEW_RESPONSE', priority: 3 },
  REVIEW_RESPONDED: { missionType: 'REVIEW_ACK', priority: 1 },

  // Connector events
  EMAIL_RECEIVED: { missionType: 'EMAIL_PROCESS', priority: 2 },
  EMAIL_SENT: { missionType: 'EMAIL_PROCESS', priority: 1 },
  SMS_SENT: { missionType: 'EMAIL_PROCESS', priority: 1 },
  GITHUB_COMMIT_SYNCED: { missionType: 'DOCUMENT_IMPORT', priority: 1 },
  GOOGLE_REVIEW_RECEIVED: { missionType: 'REVIEW_RESPONSE', priority: 3 },

  // Worker events (downstream pipeline)
  OBSERVATION_CREATED: { missionType: 'CLAIM_GENERATE', priority: 2 },
  CLAIM_CREATED: { missionType: 'CLASSIFICATION_CREATE', priority: 2 },
  CLASSIFICATION_CREATED: { missionType: 'RECOMMENDATION_CREATE', priority: 2 },
  RECOMMENDATION_CREATED: { missionType: 'PROJECTION_CREATE', priority: 1 },
  PROJECTION_CREATED: { missionType: 'REPLAY_VERIFY', priority: 1 },
  REPLAY_COMPLETED: { missionType: 'WITNESS_CREATE', priority: 1 },
  WITNESS_CREATED: { missionType: 'LINEAGE_CREATE', priority: 1 },
  // LINEAGE_CREATED is terminal — chain complete. No further missions created.

  // System events
  SYSTEM_HEALTH_CHECK: { missionType: 'SYSTEM_AUDIT', priority: 0 },
};

class EventToMissionBridge {
  /**
   * @param {object} options
   * @param {object} options.eventRuntime — UnifiedEventRuntime
   * @param {object} options.missionRuntime — MissionRuntime
   */
  constructor(options = {}) {
    this._eventRuntime = options.eventRuntime || null;
    this._missionRuntime = options.missionRuntime || null;
    this._stats = { listened: 0, missionsCreated: 0, skipped: 0, failed: 0 };
  }

  /**
   * Start listening to business events and creating missions.
   */
  start() {
    if (!this._eventRuntime || !this._missionRuntime) {
      console.log('[EventToMissionBridge] Degraded — missing eventRuntime or missionRuntime');
      return;
    }

    // Subscribe to all mapped event types
    for (const eventType of Object.keys(EVENT_MISSION_MAP)) {
      this._eventRuntime.on(eventType, async (event) => {
        await this._handleEvent(event);
      });
    }

    console.log(`[EventToMissionBridge] Listening to ${Object.keys(EVENT_MISSION_MAP).length} event types`);
  }

  /**
   * Handle an incoming event — create a mission for it.
   */
  async _handleEvent(event) {
    const mapping = EVENT_MISSION_MAP[event.event_type];
    if (!mapping) {
      this._stats.skipped++;
      return;
    }

    this._stats.listened++;

    try {
      // Thread the root correlation_id through the entire chain. The spine
      // sets correlation_id = eventId on the originating event; every subsequent
      // worker must preserve it so all events from one observation share a
      // single correlation group. Without this, each worker creates a new
      // correlation_id (= its trigger's event_id), breaking causal traceability.
      const correlationId = event.metadata?.correlation_id
        || event.correlation_id
        || event.event_id;
      const missionId = await this._missionRuntime.create(mapping.missionType, {
        event_id: event.event_id,
        event_type: event.event_type,
        source: event.source,
        namespace: event.namespace,
        correlation_id: correlationId,
        canonical_hash: (event.metadata && event.metadata.canonical_hash) || null,
        confidence: (event.metadata && event.metadata.confidence != null) ? event.metadata.confidence : null,
        payload: event.payload,
      }, {
        priority: canonicalPriority(mapping.priority),
        createdBy: 'event-to-mission-bridge',
      });

      this._stats.missionsCreated++;
      console.log(`[EventToMissionBridge] ${event.event_type} → mission ${missionId} (${mapping.missionType})`);
    } catch (err) {
      this._stats.failed++;
      console.error(`[EventToMissionBridge] Failed to create mission for ${event.event_type}: ${err.message}`);
    }
  }

  /**
   * Get stats.
   */
  getStats() {
    return { ...this._stats, scope: 'session' };
  }
}

module.exports = { EventToMissionBridge, EVENT_MISSION_MAP };
