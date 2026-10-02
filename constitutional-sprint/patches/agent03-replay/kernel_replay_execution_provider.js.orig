'use strict';

/**
 * Kernel Replay Execution Provider
 *
 * Bridges the kernel deterministic replay engine (from commit b4c5d6e1)
 * into PING's ReplayExecutionPort interface.
 *
 * PING transcripts contain replay_events[] in state.
 * This provider converts them to kernel CanonicalEventEnvelope format
 * and runs DeterministicReplayEngine.replay().
 */

const { DeterministicReplayEngine } = require('./replay/kernel/deterministic_replay_engine');
const { CanonicalEventEnvelope } = require('./replay/kernel/canonical_event_envelope');
const { ReplayEventStream } = require('./replay/kernel/replay_event_stream');

class KernelReplayExecutionProvider {
  constructor(options = {}) {
    this._engineVersion = options.engineVersion || 'v1';
    this._stats = { replays: 0, events: 0, failures: 0 };
  }

  /**
   * Execute replay of a transcript through the kernel engine.
   *
   * @param {Object} transcript - PING transcript with state.replay_events[]
   * @param {Object} options - { maxEvents }
   * @returns {Promise<Object>} Replay result
   */
  async executeReplay(transcript, options = {}) {
    this._stats.replays++;

    const replayEvents = transcript?.state?.replay_events;
    if (!Array.isArray(replayEvents) || replayEvents.length === 0) {
      return {
        status: 'no_events',
        message: 'Transcript contains no replay_events in state'
      };
    }

    const maxEvents = options.maxEvents != null ? options.maxEvents : 10000;
    const eventsToReplay = replayEvents.slice(0, maxEvents);

    if (eventsToReplay.length === 0) {
      return {
        status: 'no_events',
        message: 'No events after applying maxEvents limit'
      };
    }

    // Convert PING events → kernel CanonicalEventEnvelope instances
    const envelopes = [];
    const eventTypes = new Set();
    let parentEventId = null;

    for (let i = 0; i < eventsToReplay.length; i++) {
      const event = eventsToReplay[i];
      if (!event || typeof event !== 'object') {
        this._stats.failures++;
        continue;
      }
      const eventType = event.event_type || event.type || 'artifact_commit';
      eventTypes.add(eventType);

      // Kernel event_id must start with 'evt-'
      let eventId = event.event_id;
      if (!eventId || !eventId.startsWith('evt-')) {
        eventId = `evt-ping-${i}-${this._hashId(event.event_id || event.id || String(i))}`;
      }

      // Kernel lineage: parent_event_ids must reference previously committed event IDs
      const lineage = this._buildLineage(event, parentEventId, envelopes);

      // Map PING event type to kernel event type (artifact_commit or artifact_update)
      const kernelEventType = this._mapEventType(eventType);

      // Deterministic artifact_hash from event content (kernel invariant requires non-empty)
      const artifactHash = event.canonical_hash || event.metadata?.canonical_hash
        || this._computeHash(JSON.stringify(event.payload || {}));

      const envelopeData = {
        event_id: eventId,
        event_type: kernelEventType,
        actor_id: event.actor_id || event.metadata?.worker || event.metadata?.source || 'ping-runtime',
        timestamp: event.timestamp || '2026-01-01T00:00:00.000Z',
        schema_version: event.schema_version || '3.0.0',
        replay_version: event.replay_version || '5.0.0',
        policy_version: event.policy_version || '1.0.0',
        payload: {
          artifact_id: event.artifact_id || eventId,
          artifact_hash: artifactHash,
          event_type: eventType,
          payload: event.payload || event.event_data || {},
          metadata: {
            ...(event.metadata || {}),
            // Propagate trace fields explicitly — the kernel engine does not
            // re-emit individual events with their metadata, so these must be
            // carried in the envelope payload for downstream reconstruction.
            // Only set when present; never fabricate absent values.
            ...(event.correlation_id ? { correlation_id: event.correlation_id } : {}),
            ...(event.metadata?.correlation_id ? { correlation_id: event.metadata.correlation_id } : {}),
            ...(event.namespace ? { namespace: event.namespace } : {}),
            ...(event.metadata?.namespace ? { namespace: event.metadata.namespace } : {}),
            ...(event.metadata?.confidence != null ? { confidence: event.metadata.confidence } : {}),
            ...(event.metadata?.confidence_source ? { confidence_provenance: event.metadata.confidence_source } : {}),
          },
        },
        lineage
      };

      try {
        const envelope = new CanonicalEventEnvelope(envelopeData);
        envelopes.push(envelope);
        parentEventId = eventId;
      } catch (err) {
        this._stats.failures++;
        // Skip malformed envelopes rather than aborting the entire replay
        continue;
      }
    }

    if (envelopes.length === 0) {
      return {
        status: 'conversion_failed',
        message: 'All events failed conversion to kernel envelopes'
      };
    }

    // Run kernel replay
    const engine = new DeterministicReplayEngine(this._engineVersion);
    const eventStream = new ReplayEventStream(envelopes);

    try {
      const result = engine.replay(eventStream);
      this._stats.events += envelopes.length;

      // Build PING-compatible response
      // Kernel returns nested objects — flatten for PING consumers
      const uniqueTypes = [...eventTypes];
      return {
        replay_id: transcript?.transcript_id || `replay-${this._hashId(JSON.stringify(eventsToReplay))}`,
        status: 'ok',
        event_count: envelopes.length,
        event_types: uniqueTypes,
        artifact_count: result.artifact_count,
        canonical_bytes: result.canonical_bytes,
        fingerprint: result.fingerprint?.hash || result.fingerprint,
        fingerprint_full: result.fingerprint,
        witness_root: result.witness_root?.witness_root || result.witness_root,
        witness_root_full: result.witness_root,
        leaf_count: result.witness_root?.leaf_count || result.leaf_count,
        tree_height: result.witness_root?.tree_height || result.tree_height,
        state_version: result.state?.state_version || result.state_version,
        violations: result.violations || [],
        witness: result.witness,
        certificate: result.certificate,
        lineage_graph: result.lineage_graph,
        state: result.state
      };
    } catch (err) {
      this._stats.failures++;
      return {
        status: 'kernel_error',
        message: err.message,
        error_type: err.constructor?.name || 'Error',
        event_count: envelopes.length
      };
    }
  }

  /**
   * Map PING event types to kernel event types.
   * Kernel only handles 'artifact_commit' and 'artifact_update'.
   */
  _mapEventType(pingEventType) {
    const updateTypes = new Set([
      'artifact_update', 'ARTIFACT_UPDATED',
      'PROJECT_UPDATED', 'CUSTOMER_UPDATED', 'REVIEW_UPDATED'
    ]);
    return updateTypes.has(pingEventType) ? 'artifact_update' : 'artifact_commit';
  }

  /**
   * Build kernel lineage from PING event causation/correlation + previous envelope.
   */
  _buildLineage(event, parentEventId, envelopes) {
    const parentIds = [];

    // Use kernel event ID of the previous event in the chain (ensures parent exists)
    if (parentEventId) {
      parentIds.push(parentEventId);
    }

    // Also include PING causation_id if it references an existing envelope
    const causationId = event.causation_id || event.metadata?.causation_id;
    if (causationId && causationId.startsWith('evt-') && causationId !== parentEventId) {
      const parentExists = envelopes.some(e => e.getEventId() === causationId);
      if (parentExists) {
        parentIds.push(causationId);
      }
    }

    // Kernel enforces all-parents-must-be-evt- prefix and no mixing
    // parentIds are already all evt-* or empty, so namespace check passes

    return { parent_event_ids: parentIds };
  }

  /**
   * Deterministic short hash for generating evt- IDs from arbitrary strings.
   * Uses SHA-256 for collision resistance (djb2 was 32-bit, collision-prone).
   */
  _hashId(input) {
    const { createHash } = require('crypto');
    return createHash('sha256').update(String(input)).digest('hex').substring(0, 12);
  }

  /**
   * Deterministic hash for artifact_hash generation.
   * Uses same algorithm as _hashId but returns a hex-like string.
   */
  _computeHash(input) {
    const str = String(input);
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(12, '0');
  }

  getStats() {
    return { ...this._stats };
  }
}

module.exports = { KernelReplayExecutionProvider };
