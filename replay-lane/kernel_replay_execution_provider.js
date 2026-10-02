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
 *
 * CONVERGENCE CONTRACT (replay fidelity lane, 2026-09-19):
 * The provider consumes the persisted canonical representation. It never
 * remints event identity, never silently remaps era, and never produces a
 * silent partial replay:
 * - Canonical event_ids are carried through the kernel unchanged. The kernel
 *   envelope accepts any non-empty string event_id and the state machine
 *   handles uniform non-evt- ID spaces, so the old evt- reminting had no
 *   structural justification and is removed.
 * - The original canonical event_type of every input is recorded on the
 *   result (event_types + event_type_map). The kernel state machine only
 *   models artifact_commit / artifact_update; that modeling is now explicit
 *   on the verdict instead of silent.
 * - Envelope schema/replay/policy versions are DECLARED BY THIS PROVIDER
 *   (its own machinery era), recorded with provenance on the result. The
 *   persisted rows declare their own era via metadata.schema_version, which
 *   is carried through as input_era. A row declaring an unsupported era
 *   fails closed (era_mismatch) instead of replaying under current semantics.
 * - No timestamp is ever fabricated. An input without a usable timestamp is
 *   malformed: it is skipped, counted, and forces INCOMPLETE.
 * - maxEvents truncation and malformed-input skips are counted and force the
 *   INCOMPLETE completeness state. An INCOMPLETE replay can never verify.
 * - canonical_input_hash is the sha256 of the canonical JSON of the exact
 *   input events the kernel consumed, in replay order.
 */

const { DeterministicReplayEngine } = require('./replay/kernel/deterministic_replay_engine');
const { CanonicalEventEnvelope } = require('./replay/kernel/canonical_event_envelope');
const { ReplayEventStream } = require('./replay/kernel/replay_event_stream');
const { CanonicalJson } = require('./replay/kernel/canonical_json');
const { createHash } = require('crypto');

// Replay-machinery era, DECLARED BY THIS PROVIDER. These label the envelope
// schema, replay protocol, and policy version this provider's machinery
// implements. They are NOT carried from the persisted rows (rows never
// declare these fields) and are recorded on every result with explicit
// provider-declared provenance, so no historical input is silently treated
// as current-era.
const PROVIDER_ENVELOPE_SCHEMA_VERSION = '3.0.0';
const PROVIDER_REPLAY_PROTOCOL_VERSION = '5.0.0';
const PROVIDER_POLICY_VERSION = '1.0.0';

// Input eras (persisted row metadata.schema_version values) this provider
// knows how to read. 'unknown' = rows that predate era stamping; they are
// replayed with the current reader and the verdict labels the era 'unknown'
// explicitly. Any other declared value fails closed (era_mismatch).
const SUPPORTED_INPUT_ERAS = new Set(['1.0.0', 'unknown']);

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
    // Explicit input-window completeness (W-2 harvest): a maxEvents cut or a
    // skipped malformed input must never become a silent partial replay.
    const inputEventCount = replayEvents.length;
    const inputTruncated = inputEventCount > maxEvents;
    const eventsToReplay = replayEvents.slice(0, maxEvents);

    if (eventsToReplay.length === 0) {
      return {
        status: 'no_events',
        message: 'No events after applying maxEvents limit'
      };
    }

    // Era gate: every input declares its era via metadata.schema_version
    // (absent = 'unknown', explicitly labeled). An input declaring an era
    // outside the supported set fails closed here, before any kernel work,
    // so historical eras are never replayed under current routing semantics.
    const inputEras = new Set();
    for (const event of eventsToReplay) {
      const era = (event && typeof event === 'object' && event.metadata && typeof event.metadata.schema_version === 'string')
        ? event.metadata.schema_version
        : 'unknown';
      inputEras.add(era);
      if (!SUPPORTED_INPUT_ERAS.has(era)) {
        return {
          status: 'era_mismatch',
          message: `Input declares unsupported era '${era}'; refusing to replay under current semantics`,
          event_count: 0,
          input_event_count: inputEventCount,
          completeness: 'INCOMPLETE',
        };
      }
    }
    const eraList = [...inputEras].sort();
    const inputEra = eraList.length === 1 ? eraList[0] : 'mixed';

    // Identity-space uniformity gate: the kernel's lineage namespace rule
    // forbids mixing evt- and non-evt- parent IDs in one replay. A mixed
    // input window fails closed with a typed reason instead of dying
    // mid-kernel with an opaque state-machine error.
    const carriedIds = eventsToReplay
      .filter(e => e && typeof e === 'object' && typeof e.event_id === 'string' && e.event_id.length > 0)
      .map(e => e.event_id);
    const idSpaces = new Set(carriedIds.map(id => id.startsWith('evt-') ? 'evt' : 'canonical'));
    if (idSpaces.size > 1) {
      return {
        status: 'identity_space_mixed',
        message: 'Input mixes evt- and canonical event ID spaces; refusing to replay',
        event_count: 0,
        input_event_count: inputEventCount,
        completeness: 'INCOMPLETE',
      };
    }

    // Convert PING events → kernel CanonicalEventEnvelope instances
    const envelopes = [];
    const consumedInputs = [];
    const eventTypes = new Set();
    const eventTypeMap = [];
    let parentEventId = null;
    let inputsSkipped = 0;

    for (let i = 0; i < eventsToReplay.length; i++) {
      const event = eventsToReplay[i];
      if (!event || typeof event !== 'object') {
        this._stats.failures++;
        inputsSkipped++;
        continue;
      }
      const eventType = event.event_type || event.type || 'artifact_commit';
      eventTypes.add(eventType);

      // Identity preservation: the canonical event_id is carried through the
      // kernel unchanged. The envelope requires a non-empty string; the
      // state machine's duplicate detection, parent resolution, and lineage
      // namespace rule all operate over the carried ID space. There is no
      // structural evt- requirement anywhere on the live kernel path
      // (toEventId is never called; the envelope validates non-empty
      // strings), so reminting is removed, not relocated. An input without
      // a usable ID is malformed: skipped, counted, never reminted.
      const eventId = event.event_id;
      if (typeof eventId !== 'string' || eventId.length === 0) {
        this._stats.failures++;
        inputsSkipped++;
        continue;
      }

      // No timestamp is ever fabricated. Canonical rows always carry the
      // observation timestamp assigned at persistence; an input without one
      // is malformed and can only make the window INCOMPLETE.
      let timestamp = event.timestamp;
      if (timestamp instanceof Date) timestamp = timestamp.toISOString();
      if (typeof timestamp !== 'string' || timestamp.length === 0) {
        this._stats.failures++;
        inputsSkipped++;
        continue;
      }

      // Kernel lineage: parent_event_ids must reference previously committed
      // event IDs. The sequential chain plus any true PING causation_id that
      // resolves to an envelope already in this stream are carried through in
      // the carried ID space, so the kernel verifies the actual persisted
      // causal graph within the replayed window.
      const lineage = this._buildLineage(event, parentEventId, envelopes);

      // Map PING event type to kernel event type (artifact_commit or artifact_update).
      // The kernel state machine is structurally limited to these two types;
      // the mapping is recorded per event on the result so the verdict can
      // name both the canonical type and the kernel modeling. Nothing about
      // the original vocabulary is dropped silently.
      const kernelEventType = this._mapEventType(eventType);
      eventTypeMap.push({
        event_id: eventId,
        canonical_event_type: eventType,
        kernel_event_type: kernelEventType,
      });

      // Deterministic artifact_hash from event content (kernel invariant requires non-empty)
      const artifactHash = event.canonical_hash || event.metadata?.canonical_hash
        || this._computeHash(JSON.stringify(event.payload || {}));

      const envelopeData = {
        event_id: eventId,
        event_type: kernelEventType,
        actor_id: event.actor_id || event.metadata?.worker || event.metadata?.source || 'ping-runtime',
        timestamp,
        // Provider-declared machinery era (see file header). Recorded with
        // provenance on the result; never presented as row-declared.
        schema_version: PROVIDER_ENVELOPE_SCHEMA_VERSION,
        replay_version: PROVIDER_REPLAY_PROTOCOL_VERSION,
        policy_version: PROVIDER_POLICY_VERSION,
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
            ...(event.metadata?.confidence_provenance ? { confidence_provenance: event.metadata.confidence_provenance } : {}),
            // Carry the persisted row era on the envelope so the proof
            // content itself names the input era it was computed over.
            ...(inputEra ? { input_era: inputEra } : {}),
          },
        },
        lineage
      };

      try {
        const envelope = new CanonicalEventEnvelope(envelopeData);
        envelopes.push(envelope);
        consumedInputs.push(event);
        parentEventId = eventId;
      } catch (err) {
        this._stats.failures++;
        inputsSkipped++;
        // Skip malformed envelopes rather than aborting the entire replay.
        // The skip is counted so the window is INCOMPLETE, never a silent
        // partial replay.
        continue;
      }
    }

    if (envelopes.length === 0) {
      return {
        status: 'conversion_failed',
        message: 'All events failed conversion to kernel envelopes',
        input_event_count: inputEventCount,
        inputs_skipped: inputsSkipped,
        completeness: 'INCOMPLETE',
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
      // The full witness-root object carries the algorithm/version the
      // kernel actually computed; the input window's completeness is
      // explicit (W-2 harvest).
      const witnessRootFull = (result.witness_root && typeof result.witness_root === 'object')
        ? result.witness_root : null;
      const completeness = (inputTruncated || inputsSkipped > 0) ? 'INCOMPLETE' : 'COMPLETE';
      return {
        replay_id: transcript?.transcript_id || `replay-${this._hashId(JSON.stringify(eventsToReplay))}`,
        status: 'ok',
        replay_engine_version: this._engineVersion,
        witness_algorithm_version: witnessRootFull ? witnessRootFull.witness_algorithm : null,
        witness_version: witnessRootFull ? witnessRootFull.witness_version : null,
        completeness,
        input_event_count: inputEventCount,
        input_truncated: inputTruncated,
        inputs_skipped: inputsSkipped,
        // Honest input binding: sha256 over the canonical JSON of the exact
        // input events the kernel consumed, in replay order. This names the
        // input the fingerprint and witness root were computed over.
        canonical_input_hash: this._hashInput(consumedInputs),
        input_era: inputEra,
        era: {
          input_era: inputEra,
          input_eras: eraList,
          input_era_source: eraList.length === 1 && eraList[0] !== 'unknown' ? 'row-declared' : (inputEra === 'unknown' ? 'absent' : 'mixed'),
          envelope_schema_version: { value: PROVIDER_ENVELOPE_SCHEMA_VERSION, source: 'provider-declared' },
          replay_version: { value: PROVIDER_REPLAY_PROTOCOL_VERSION, source: 'provider-declared' },
          policy_version: { value: PROVIDER_POLICY_VERSION, source: 'provider-declared' },
        },
        event_count: envelopes.length,
        event_types: uniqueTypes,
        event_type_map: eventTypeMap,
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
        event_count: envelopes.length,
        input_event_count: inputEventCount,
        inputs_skipped: inputsSkipped,
        completeness: 'INCOMPLETE',
      };
    }
  }

  /**
   * Map PING event types to kernel event types.
   * Kernel only handles 'artifact_commit' and 'artifact_update'.
   * The mapping is recorded per event on the result (event_type_map).
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
   * Carried IDs are preserved verbatim: a PING causation_id that resolves to an
   * envelope already in this stream becomes a true causal edge, so the kernel
   * verifies the persisted causal graph within the replayed window instead of
   * a rebuilt sequential chain.
   */
  _buildLineage(event, parentEventId, envelopes) {
    const parentIds = [];

    // Sequential chain over the carried ID space (ensures parent exists)
    if (parentEventId) {
      parentIds.push(parentEventId);
    }

    // True causation: include the PING causation_id when it references an
    // envelope already committed in this stream (any ID space, as long as the
    // window is uniform — enforced by the identity-space gate above).
    const causationId = event.causation_id || event.metadata?.causation_id;
    if (causationId && typeof causationId === 'string' && causationId !== parentEventId) {
      const parentExists = envelopes.some(e => e.getEventId() === causationId);
      if (parentExists) {
        parentIds.push(causationId);
      }
    }

    return { parent_event_ids: parentIds };
  }

  /**
   * Deterministic short hash for replay_id fallback.
   * Uses SHA-256 for collision resistance (djb2 was 32-bit, collision-prone).
   */
  _hashId(input) {
    return createHash('sha256').update(String(input)).digest('hex').substring(0, 12);
  }

  /**
   * Honest input binding: sha256 hex over the canonical JSON of the exact
   * input events the kernel consumed, in replay order.
   */
  _hashInput(consumedInputs) {
    return createHash('sha256').update(CanonicalJson.stringify(consumedInputs), 'utf8').digest('hex');
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
