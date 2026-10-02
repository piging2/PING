'use strict';
/**
 * Replay Context Pack Builder — Phase 20 safe harvest (2026-09-19).
 *
 * This is a DERIVED consumer, never an authority. It may never become an
 * event authority, a witness authority, or a mission authority.
 *
 * What it does:
 *   - Reads ONLY through the read-only replay reader
 *     (UnifiedEventRuntime.replay: certified ORDER BY sequence ASC delivery
 *     over committed ping_events rows). It never scans tables directly and
 *     never bypasses the certified ordering.
 *   - Builds a deterministic, content-bound context pack for one replay
 *     window: pack_id, per-event content hashes, window cursors, source
 *     metadata, and version labels for traceability.
 *   - Marks every pack DERIVED with an explicit completeness state
 *     (COMPLETE / INCOMPLETE) following the W-2 truncation semantics:
 *     INCOMPLETE when the window was not provably closed (more rows exist
 *     beyond last_sequence) or any input row was skipped as malformed.
 *
 * What it does NOT do (fail-closed by construction):
 *   - Emits no events, triggers no missions, writes no authority records.
 *   - Requires exactly one Node built-in ('crypto'). No pg, no pool, no
 *     UnifiedEventRuntime import, no mission scheduler, no emit path.
 *     The runtime is injected by the caller; the module's only use of it
 *     is the single `runtime.replay()` call.
 *   - Never fabricates version labels: absent versions are recorded as
 *     null (W-2 null-safe convention), never invented.
 *
 * No em dashes in this file.
 */

const crypto = require('crypto');

const PACK_ID_PREFIX = 'rcp_';
const PACK_ID_BYTES = 16; // 16 hex chars, 64 bits; same truncation scale as the I2 ctx_ scheme
const COMPLETE = 'COMPLETE';
const INCOMPLETE = 'INCOMPLETE';

/**
 * Deterministic JSON: object keys sorted recursively, arrays in order.
 * No reliance on insertion order anywhere.
 */
function stableStringify(value) {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * The canonical projection of one replay row for content binding.
 * Sequence is the window ordering axis and is recorded separately; it is
 * NOT part of the content hash so the same content hashes identically in
 * any window that contains it.
 */
function projectRow(row) {
  return {
    event_id: row.event_id,
    event_type: row.event_type,
    source: row.source,
    timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : (row.timestamp == null ? null : String(row.timestamp)),
    payload: row.payload === undefined ? null : row.payload,
    metadata: row.metadata === undefined ? null : row.metadata,
    namespace: row.namespace == null ? null : row.namespace,
  };
}

function contentHash(row) {
  return sha256Hex(stableStringify(projectRow(row)));
}

/**
 * Well-formed replay row: the reader guarantees sequence ASC delivery; we
 * verify the identity fields we bind into the pack, and skip (count, never
 * silently include) anything malformed.
 */
function isWellFormedRow(row) {
  return (
    row !== null &&
    typeof row === 'object' &&
    typeof row.event_id === 'string' &&
    row.event_id.length > 0 &&
    Number.isFinite(Number(row.sequence))
  );
}

/**
 * Collect one replay window through the read-only replay reader ONLY.
 *
 * @param {object} runtime — object exposing the certified read-only
 *   `replay({afterSequence, limit})` method. No other method is used.
 * @param {object} options — { afterSequence = 0, limit = 1000 }
 * @returns {Promise<object>} window descriptor with completeness state.
 *
 * Completeness (W-2 semantics):
 *   - window_not_closed: the closure probe (one more read at lastSequence)
 *     found additional rows, so the window does not cover the full range.
 *   - inputs_skipped: one or more delivered rows were malformed and skipped.
 *   COMPLETE iff neither condition holds.
 */
async function collectReplayWindow(runtime, options = {}) {
  if (!runtime || typeof runtime.replay !== 'function') {
    return { status: 'error', error: 'collectReplayWindow requires a runtime with a read-only replay() method' };
  }
  const afterSequence = options.afterSequence == null ? 0 : Number(options.afterSequence);
  const limit = options.limit == null ? 1000 : Number(options.limit);
  if (!Number.isFinite(afterSequence) || afterSequence < 0) {
    return { status: 'error', error: `Invalid afterSequence: ${options.afterSequence}` };
  }
  if (!Number.isFinite(limit) || limit < 1) {
    return { status: 'error', error: `Invalid limit: ${options.limit}` };
  }

  // Single read through the certified read-only reader. This is the ONLY
  // data access this module performs; there is no direct table scan.
  const read = await runtime.replay({ afterSequence, limit });
  if (!read || read.status !== 'ok') {
    return { status: 'error', error: `Replay read failed: ${read && read.error ? read.error : 'unknown'}` };
  }
  const delivered = Array.isArray(read.events) ? read.events : [];

  const events = [];
  let skipped = 0;
  for (const row of delivered) {
    if (!isWellFormedRow(row)) {
      skipped += 1;
      continue;
    }
    events.push({
      sequence: Number(row.sequence),
      event_id: row.event_id,
      content_hash: contentHash(row),
    });
  }

  // Closure probe: one more read at the last observed sequence. If it finds
  // rows, the window does not cover the full range (W-2 inputTruncated).
  const lastSequence = events.length > 0 ? events[events.length - 1].sequence : afterSequence;
  const probe = await runtime.replay({ afterSequence: lastSequence, limit: 1 });
  if (!probe || probe.status !== 'ok') {
    return { status: 'error', error: `Closure probe failed: ${probe && probe.error ? probe.error : 'unknown'}` };
  }
  const probeRows = Array.isArray(probe.events) ? probe.events : [];
  const windowNotClosed = probeRows.length > 0;

  const incompleteReasons = [];
  if (windowNotClosed) incompleteReasons.push('window_not_closed');
  if (skipped > 0) incompleteReasons.push('inputs_skipped');
  const completeness = incompleteReasons.length === 0 ? COMPLETE : INCOMPLETE;

  return {
    status: 'ok',
    after_sequence: afterSequence,
    limit,
    events,
    event_count: events.length,
    last_sequence: lastSequence,
    window_closed: !windowNotClosed,
    inputs_skipped: skipped,
    completeness,
    incomplete_reasons: incompleteReasons,
  };
}

/**
 * Build the replay context pack for one collected window (pure function).
 *
 * @param {object} window — descriptor from collectReplayWindow (status 'ok').
 * @param {object} versions — version labels for traceability:
 *   { replay_engine_version, witness_algorithm_version,
 *     witness_input_schema_version }. Missing keys are recorded as null,
 *   never fabricated.
 * @returns {object} the pack, or { status:'error', error } fail-closed.
 */
function buildReplayContextPack(window, versions = {}) {
  if (!window || window.status !== 'ok') {
    return { status: 'error', error: 'buildReplayContextPack requires a successful window descriptor' };
  }

  const versionLabels = {
    replay_engine_version: versions.replay_engine_version == null ? null : String(versions.replay_engine_version),
    witness_algorithm_version: versions.witness_algorithm_version == null ? null : String(versions.witness_algorithm_version),
    witness_input_schema_version: versions.witness_input_schema_version == null ? null : String(versions.witness_input_schema_version),
  };

  // retrieval_hash: content-bound identity of the window's event set.
  const retrievalHash = sha256Hex(stableStringify({
    version: 1,
    after_sequence: window.after_sequence,
    last_sequence: window.last_sequence,
    events: window.events.map((e) => ({ sequence: e.sequence, event_id: e.event_id, content_hash: e.content_hash })),
  }));

  // Pack identity binds the window cursors, the event set, completeness,
  // and the version labels. Same replay window plus same versions always
  // yields the same pack_id. Truncated pack ids are recorded (the full
  // retrieval_hash is retained for verification).
  const packId = PACK_ID_PREFIX + sha256Hex(stableStringify({
    after_sequence: window.after_sequence,
    last_sequence: window.last_sequence,
    retrieval_hash: retrievalHash,
    completeness: window.completeness,
    versions: versionLabels,
  })).slice(0, PACK_ID_BYTES);

  const first = window.events.length > 0 ? window.events[0] : null;
  const last = window.events.length > 0 ? window.events[window.events.length - 1] : null;

  return {
    status: 'ok',
    replay_context_pack_id: packId,
    derivation: {
      kind: 'DERIVED',
      derived_from: 'read-only replay reader (UnifiedEventRuntime.replay) over committed ping_events rows in certified sequence order',
      authority_decision: 'none. This pack is a derived consumer: it holds no event authority, no witness authority, and no mission authority.',
      emits_events: false,
      triggers_missions: false,
      writes_authority_records: false,
      completeness: window.completeness,
      incomplete_reasons: window.incomplete_reasons.slice(),
    },
    replay_window: {
      after_sequence: window.after_sequence,
      last_sequence: window.last_sequence,
      limit: window.limit,
      event_count: window.event_count,
      delivered_in_certified_sequence_order: true,
      window_closed: window.window_closed,
      inputs_skipped: window.inputs_skipped,
    },
    versions: versionLabels,
    window_identity: {
      retrieval_hash: retrievalHash,
      events: window.events.map((e) => ({ sequence: e.sequence, event_id: e.event_id, content_hash: e.content_hash })),
    },
    source_metadata: {
      earliest_event: first ? { sequence: first.sequence, event_id: first.event_id } : null,
      latest_event: last ? { sequence: last.sequence, event_id: last.event_id } : null,
      event_count: window.event_count,
    },
  };
}

module.exports = {
  collectReplayWindow,
  buildReplayContextPack,
  COMPLETE,
  INCOMPLETE,
};
