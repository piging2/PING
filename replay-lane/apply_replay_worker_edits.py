#!/usr/bin/env python3
"""Replay fidelity lane: surgical ReplayWorker edits.

Applies exact-match replacements to the ReplayWorker class in
ping-runtime/workers/canonical_workers.js. Every replacement must match
exactly once. No em dashes anywhere.
"""
import io, sys

PATH = '/home/nolan/worktrees/constitutional-convergence/ping-runtime/workers/canonical_workers.js'

with io.open(PATH, 'r', encoding='utf-8') as f:
    src = f.read()

edits = []

# ---------------------------------------------------------------- Edit 1
# Move the no-provider check before input loading; replace the
# trigger-repackaging fallback with a canonical-store loader that fails
# closed when the store is unavailable.
old1 = """    // Build a transcript from the event chain for the kernel engine.
    // The transcript contains replay_events[] — the events to re-execute.
    const replayEvents = await this._buildReplayEvents(event);

    // If no provider is available, replay is a structural no-op.
    if (!this._replayProvider) {
      const replay = {
        documentId,
        eventType: event.event_type,
        timestamp: constitutionalTimeAuthority.nowAsISOString(),
        verified: false,
        reason: 'no_replay_provider',
        fingerprint: null,
        witness_root: null,
        violations: [],
      };

      const authority = this._buildAuthorityEvidence(event, replay);

      await this._emit('REPLAY_COMPLETED', {
        documentId,
        replay,
        authority,
        upstreamEventId: event.event_id || event.mission_id,
      }, {
        causation_id: event.event_id,
      });

      return { status: 'ok', replay };
    }

    // Build transcript for the kernel engine
    const transcript = {
      state: {
        replay_events: replayEvents,
      },
    };
"""

new1 = """    // If no provider is available, replay is a structural no-op. This check
    // comes first: replay is never attempted without the kernel provider, and
    // the canonical store is never queried for a replay that cannot run.
    if (!this._replayProvider) {
      const replay = {
        documentId,
        eventType: event.event_type,
        timestamp: constitutionalTimeAuthority.nowAsISOString(),
        verified: false,
        reason: 'no_replay_provider',
        fingerprint: null,
        witness_root: null,
        violations: [],
      };

      const authority = this._buildAuthorityEvidence(event, replay);

      await this._emit('REPLAY_COMPLETED', {
        documentId,
        replay,
        authority,
        upstreamEventId: event.event_id || event.mission_id,
      }, {
        causation_id: event.event_id,
      });

      return { status: 'ok', replay };
    }

    // Replay consumes the persisted canonical representation: the correlation
    // group of the triggering event, loaded from the canonical store. The
    // triggering event is never repackaged as its own replay input.
    const input = await this._buildReplayEvents(event);
    if (!input.events) {
      // The canonical input could not be loaded (no store, or the load
      // failed). Fail closed: an unverified verdict, no kernel invocation,
      // no synthesized substitute input.
      const replay = {
        documentId,
        eventType: event.event_type,
        timestamp: constitutionalTimeAuthority.nowAsISOString(),
        verified: false,
        reason: input.loadError ? 'replay_input_load_failed' : 'replay_input_unavailable',
        error: input.loadError || 'no canonical store available to load the replay input',
        fingerprint: null,
        witness_root: null,
        violations: [],
        input_source: input.inputSource,
        correlation_id: input.correlationId,
      };

      const authority = this._buildAuthorityEvidence(event, replay, {
        failure_code: replay.reason,
        failure_reason: replay.error,
        input_source: input.inputSource,
        correlation_id: input.correlationId,
      });

      await this._emit('REPLAY_COMPLETED', {
        documentId,
        replay,
        authority,
        upstreamEventId: event.event_id || event.mission_id,
      }, {
        causation_id: event.event_id,
      });

      return { status: 'ok', replay };
    }

    if (input.events.length === 0) {
      const replay = {
        documentId,
        eventType: event.event_type,
        timestamp: constitutionalTimeAuthority.nowAsISOString(),
        verified: false,
        reason: 'replay_input_empty',
        error: 'canonical store holds no events for the correlation group',
        fingerprint: null,
        witness_root: null,
        violations: [],
        input_source: input.inputSource,
        correlation_id: input.correlationId,
      };

      const authority = this._buildAuthorityEvidence(event, replay, {
        failure_code: 'replay_input_empty',
        failure_reason: replay.error,
        input_source: input.inputSource,
        correlation_id: input.correlationId,
      });

      await this._emit('REPLAY_COMPLETED', {
        documentId,
        replay,
        authority,
        upstreamEventId: event.event_id || event.mission_id,
      }, {
        causation_id: event.event_id,
      });

      return { status: 'ok', replay };
    }

    // Build transcript for the kernel engine from the persisted rows.
    const transcript = {
      state: {
        replay_events: input.events,
      },
    };
"""
edits.append(('edit1 handle input loading', old1, new1))

# ---------------------------------------------------------------- Edit 2
# Kernel-error path: carry the input source for traceability.
old2 = """      const replay = {
        documentId,
        eventType: event.event_type,
        timestamp: constitutionalTimeAuthority.nowAsISOString(),
        verified: false,
        reason: 'kernel_error',
        error: err.message,
        fingerprint: null,
        witness_root: null,
        violations: [],
      };
"""
new2 = """      const replay = {
        documentId,
        eventType: event.event_type,
        timestamp: constitutionalTimeAuthority.nowAsISOString(),
        verified: false,
        reason: 'kernel_error',
        error: err.message,
        fingerprint: null,
        witness_root: null,
        violations: [],
        input_source: input.inputSource,
        correlation_id: input.correlationId,
      };
"""
edits.append(('edit2 kernel_error input source', old2, new2))

# ---------------------------------------------------------------- Edit 3
# Verdict: completeness gate + version/coverage bindings + honest input hash.
old3 = """    // Kernel result → replay verdict
    // verified: true ONLY when status === 'ok' AND violations.length === 0
    const violations = kernelResult.violations || [];
    const isVerified = kernelResult.status === 'ok' && violations.length === 0;

    const replay = {
      documentId,
      eventType: event.event_type,
      timestamp: constitutionalTimeAuthority.nowAsISOString(),
      verified: isVerified,
      reason: isVerified ? 'kernel_verified' : (kernelResult.status || 'kernel_failed'),
      fingerprint: kernelResult.fingerprint || null,
      witness_root: kernelResult.witness_root || null,
      violations,
      event_count: kernelResult.event_count || 0,
      artifact_count: kernelResult.artifact_count || 0,
      state_version: kernelResult.state_version || null,
    };

    // Structured constitutional evidence at the replay boundary. Every field is
    // derived from an actual value — the triggering event's trace fields, the
    // kernel provider's deterministic result, and fixed authority identities.
    // Nothing is fabricated; absent values are omitted (never defaulted).
    const authority = this._buildAuthorityEvidence(event, replay, {
      replay_id: kernelResult.replay_id,
      event_count: kernelResult.event_count,
      artifact_count: kernelResult.artifact_count,
      state_version: kernelResult.state_version,
      leaf_count: kernelResult.leaf_count,
      tree_height: kernelResult.tree_height,
    });
"""
new3 = """    // Kernel result → replay verdict.
    // verified: true ONLY when the provider reached 'ok', the kernel raised
    // no violations, AND the input window is COMPLETE. A truncated or
    // partially-skipped input (INCOMPLETE) can never verify: that would be a
    // silent partial replay.
    const violations = kernelResult.violations || [];
    const completeness = kernelResult.completeness || 'COMPLETE';
    const incomplete = completeness !== 'COMPLETE';
    const isVerified = kernelResult.status === 'ok' && violations.length === 0 && !incomplete;

    const replay = {
      documentId,
      eventType: event.event_type,
      timestamp: constitutionalTimeAuthority.nowAsISOString(),
      verified: isVerified,
      reason: isVerified ? 'kernel_verified' : (incomplete ? 'incomplete_input_set' : (kernelResult.status || 'kernel_failed')),
      fingerprint: kernelResult.fingerprint || null,
      witness_root: kernelResult.witness_root || null,
      violations,
      event_count: kernelResult.event_count || 0,
      artifact_count: kernelResult.artifact_count || 0,
      state_version: kernelResult.state_version || null,
      // Replay-machinery bindings carried from the kernel provider: these
      // identify what executed and what it consumed.
      replay_engine_version: kernelResult.replay_engine_version || null,
      witness_algorithm_version: kernelResult.witness_algorithm_version || null,
      witness_version: kernelResult.witness_version || null,
      completeness,
      input_event_count: kernelResult.input_event_count != null ? kernelResult.input_event_count : null,
      input_truncated: kernelResult.input_truncated === true,
      inputs_skipped: kernelResult.inputs_skipped || 0,
      input_source: input.inputSource,
      input_era: kernelResult.input_era || null,
      era: kernelResult.era || null,
      event_types: kernelResult.event_types || null,
      event_type_map: kernelResult.event_type_map || null,
      canonical_input_hash: kernelResult.canonical_input_hash || null,
    };

    // Structured constitutional evidence at the replay boundary. Every field is
    // derived from an actual value — the triggering event's trace fields, the
    // kernel provider's deterministic result, and fixed authority identities.
    // Nothing is fabricated; absent values are omitted (never defaulted).
    const authority = this._buildAuthorityEvidence(event, replay, {
      replay_id: kernelResult.replay_id,
      canonical_input_hash: kernelResult.canonical_input_hash,
      replay_engine_version: kernelResult.replay_engine_version,
      witness_algorithm_version: kernelResult.witness_algorithm_version,
      witness_version: kernelResult.witness_version,
      completeness,
      input_event_count: kernelResult.input_event_count,
      input_truncated: kernelResult.input_truncated,
      inputs_skipped: kernelResult.inputs_skipped,
      input_source: input.inputSource,
      input_era: kernelResult.input_era,
      event_count: kernelResult.event_count,
      artifact_count: kernelResult.artifact_count,
      state_version: kernelResult.state_version,
      leaf_count: kernelResult.leaf_count,
      tree_height: kernelResult.tree_height,
    });
"""
edits.append(('edit3 verdict completeness gate', old3, new3))

# ---------------------------------------------------------------- Edit 4
# Authority evidence: honest canonical_input_hash (never replay_id as a hash)
# plus replay-machinery bindings.
old4 = """   *  - canonical input identity is the deterministic transcript hash when produced
   *
   * @param {Object} event - the triggering event (REPLAY_VERIFY / PROJECTION_CREATED)
   * @param {Object} replay - the replay verdict object
   * @param {Object} extra - additional optional evidence (replay_id, event_count, ...)
"""
new4 = """   *  - canonical input identity is the sha256 of the canonical JSON of the rows
   *    the provider actually consumed (never the transcript id)
   *
   * @param {Object} event - the triggering event (REPLAY_VERIFY / PROJECTION_CREATED)
   * @param {Object} replay - the replay verdict object
   * @param {Object} extra - additional optional evidence (replay_id, event_count, ...)
"""
edits.append(('edit4 evidence doc', old4, new4))

old5 = """    // Canonical input/transcript identity = the deterministic hash the provider
    // derives from the transcript when it actually produces one.
    if (extra.replay_id) evidence.canonical_input_hash = extra.replay_id;

    return evidence;
"""
new5 = """    // Canonical input identity = the sha256 hash the provider derives from the
    // exact rows it consumed, when it actually produces one. The replay_id is
    // a label, not a hash, and is never presented as one.
    if (extra.canonical_input_hash) evidence.canonical_input_hash = extra.canonical_input_hash;

    // Replay-machinery bindings, recorded when the kernel result produced them.
    if (extra.replay_engine_version) evidence.replay_engine_version = extra.replay_engine_version;
    if (extra.witness_algorithm_version) evidence.witness_algorithm_version = extra.witness_algorithm_version;
    if (extra.witness_version) evidence.witness_version = extra.witness_version;
    if (extra.completeness) evidence.completeness = extra.completeness;
    if (extra.input_event_count != null) evidence.input_event_count = extra.input_event_count;
    if (extra.input_truncated != null) evidence.input_truncated = extra.input_truncated;
    if (extra.inputs_skipped != null) evidence.inputs_skipped = extra.inputs_skipped;
    if (extra.input_source) evidence.input_source = extra.input_source;
    if (extra.input_era) evidence.input_era = extra.input_era;
    if (extra.correlation_id) evidence.correlation_id = extra.correlation_id;

    return evidence;
"""
edits.append(('edit5 evidence fields', old5, new5))

# ---------------------------------------------------------------- Edit 6
# _buildReplayEvents: consume the persisted correlation group; test-mode seam
# labeled explicitly; fail-closed null signal when the input cannot be loaded.
old6 = """  /**
   * Build replay events from the event chain.
   * In production, this loads correlated events from Postgres.
   * In tests, this constructs events directly.
   *
   * Events must be in causal order (ancestor → descendant) for the kernel
   * state machine to process them correctly.
   */
  async _buildReplayEvents(event) {
    const payload = event.payload || {};
    const correlationId = event.metadata?.correlation_id || event.correlation_id || event.event_id;

    // If events are provided in payload (test mode), use them directly
    if (Array.isArray(payload.replay_events) && payload.replay_events.length > 0) {
      return payload.replay_events;
    }

    // In production, this would query Postgres for the correlation group:
    // SELECT * FROM ping_events WHERE metadata->>'correlation_id' = $1
    // For now, return the triggering event as a single-event replay.
    // This is correct: a single observation can be replayed independently.
    return [{
      event_id: event.event_id,
      event_type: event.event_type,
      payload: payload,
      metadata: event.metadata || {},
      timestamp: event.timestamp,
    }];
  }
"""
new6 = """  /**
   * Load the replay input: the persisted correlation group of the triggering
   * event, read from the canonical store in deterministic order.
   *
   * The worker consumes the persisted canonical representation. It never
   * repackages the triggering event as its own replay input and never
   * synthesizes substitute events.
   *
   * Returns { events, inputSource, correlationId, loadError } where events is
   * an array of normalized row objects ('canonical-store' or 'test-mode'
   * inputSource), or events === null when the input could not be loaded
   * (the fail-closed signal handle() acts on).
   *
   * Test seam: payload.replay_events is an EXPLICIT test-mode input, labeled
   * as such on the verdict. It exists so unit tests can exercise the kernel
   * path without a database; production rows never flow through it.
   */
  async _buildReplayEvents(event) {
    const payload = event.payload || {};
    const correlationId = event.metadata?.correlation_id || event.correlation_id || event.event_id;

    // Explicit test-mode input (labeled on the verdict, never mistaken for
    // persisted canonical rows).
    if (Array.isArray(payload.replay_events) && payload.replay_events.length > 0) {
      return { events: payload.replay_events, inputSource: 'test-mode', correlationId, loadError: null };
    }

    // The canonical store is required. Without it there is no honest replay
    // input, so the caller fails closed instead of replaying the trigger.
    if (!this._pool) {
      return { events: null, inputSource: 'unavailable', correlationId, loadError: null };
    }

    try {
      // Lane A ordering contract: sequence NULLS FIRST (legacy rows predate
      // the sequence column), then acceptance timestamp, then event_id.
      // All ties are broken deterministically; replay never depends on
      // database iteration order.
      const result = await this._pool.query(
        `SELECT event_id, event_type, source, namespace, timestamp, payload, metadata, sequence
         FROM ping_events
         WHERE metadata->>'correlation_id' = $1
         ORDER BY sequence NULLS FIRST, timestamp ASC, event_id ASC`,
        [correlationId]
      );
      const events = (result.rows || []).map(row => this._normalizeReplayRow(row));
      return { events, inputSource: 'canonical-store', correlationId, loadError: null };
    } catch (err) {
      return { events: null, inputSource: 'canonical-store', correlationId, loadError: err.message };
    }
  }

  /**
   * Normalize one persisted canonical row into replay input.
   *
   * Timestamps arrive from node-pg as Date objects; they are rendered to ISO
   * strings here (never invented: an absent timestamp stays absent and the
   * provider treats it as malformed input). JSONB columns arrive as objects
   * and are passed through; text columns are parsed defensively.
   */
  _normalizeReplayRow(row) {
    const parseJson = (value) => {
      if (value == null) return {};
      if (typeof value === 'string') {
        try { return JSON.parse(value); } catch { return {}; }
      }
      return value;
    };
    const metadata = parseJson(row.metadata);
    const ts = row.timestamp instanceof Date ? row.timestamp.toISOString()
      : (typeof row.timestamp === 'string' ? row.timestamp : null);
    return {
      event_id: row.event_id,
      event_type: row.event_type,
      source: row.source,
      namespace: row.namespace,
      timestamp: ts,
      payload: parseJson(row.payload),
      metadata,
      sequence: row.sequence,
      causation_id: metadata.causation_id || null,
      correlation_id: metadata.correlation_id || null,
    };
  }
"""
edits.append(('edit6 buildReplayEvents loader', old6, new6))

for name, old, new in edits:
    count = src.count(old)
    if count != 1:
        sys.stderr.write('MISMATCH %s: found %d occurrences (need 1)\n' % (name, count))
        sys.exit(1)
    src = src.replace(old, new, 1)
    print('applied', name)

with io.open(PATH, 'w', encoding='utf-8') as f:
    f.write(src)
print('wrote', PATH)

# Sanity: no em dashes, no stray references to the old shape.
for bad in ['\u2014', 'replayEvents']:
    if bad in src:
        sys.stderr.write('LEFTOVER %r\n' % bad)
        sys.exit(1)
print('sanity ok')
