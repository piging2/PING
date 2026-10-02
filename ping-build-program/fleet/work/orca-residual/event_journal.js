/**
 * event_journal.js — ORCA residual lane (2026-09-24)
 *
 * Faithful local implementation of the UnifiedEventRuntime semantics this
 * lane depends on, mapped line-by-line to the real substrate:
 *
 *   REAL: /home/nolan/ping/ping-runtime/events/unified_event_runtime.js
 *
 * Semantic mapping (behavior, not filename):
 * - Deterministic content-addressed event_id = sha256({eventType, source,
 *   namespace, logical_id|payload})                    [UER emit step 1]
 *   logical_id = timestamp-stripped logical identity: two emissions of the
 *   same logical event hash identically.
 * - Event-type validation hook (registry injectable)   [UER emit step 2]
 * - Canonical event: {event_id, event_type, source, namespace, timestamp,
 *   payload, metadata{schema_version, causation_id, correlation_id}}
 *                                                      [UER emit step 4]
 * - Persistence is fail-closed: no journal -> error, never fake ok.
 *   Duplicate event_id -> ON CONFLICT DO NOTHING; same-ID/different-payload
 *   -> semantic collision -> fail closed.            [UER emit step 5]
 * - query({eventType, source, limit}) newest-first.     [UER query()]
 *
 * This journal is the chaos-harness stand-in for ping_events. The
 * reconciler (reconciler.js) is written ONLY against the {emit, query}
 * interface below, which the real UnifiedEventRuntime satisfies, so the
 * reconciler ports onto the live substrate unchanged.
 */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function canonical(o) {
  if (o === null || o === undefined) return 'null';
  if (Array.isArray(o)) return '[' + o.map(canonical).join(',') + ']';
  if (typeof o === 'object') {
    return '{' + Object.keys(o).sort().map(k => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
  }
  return JSON.stringify(o);
}

class EventJournal {
  /**
   * @param {object} options
   * @param {string} options.appendFile — JSONL evidence file (append-only)
   * @param {Set<string>} options.registeredTypes — allowed event types (null = allow all)
   * @param {object} options.faults — fault injection { failNextEmit: bool }
   */
  constructor(options = {}) {
    this._events = new Map(); // event_id -> event
    this._seq = 0;
    this._appendFile = options.appendFile || null;
    this._registeredTypes = options.registeredTypes || null;
    this._faults = options.faults || {};
    this.stats = { emitted: 0, persisted: 0, deduplicated: 0, failed: 0, collisions: 0 };
    if (this._appendFile) fs.mkdirSync(path.dirname(this._appendFile), { recursive: true });
  }

  async emit(eventType, source, payload, options = {}) {
    // Fault injection: simulate result-persistence failure.
    if (this._faults.failNextEmit) {
      this._faults.failNextEmit = false;
      this.stats.failed++;
      return { status: 'error', error: 'injected persistence failure', eventId: null };
    }
    if (this._registeredTypes && !this._registeredTypes.has(eventType)) {
      this.stats.failed++;
      return { status: 'error', error: `Unknown event_type: ${eventType}`, eventId: null };
    }
    const namespace = options.namespace || 'core::system';
    const identity = { eventType, source, namespace };
    identity[options.logical_id ? 'logical_id' : 'payload'] = options.logical_id || payload;
    const eventId = crypto.createHash('sha256').update(canonical(identity)).digest('hex');

    const event = {
      event_id: eventId,
      event_type: eventType,
      source,
      namespace,
      timestamp: new Date().toISOString(),
      payload,
      metadata: {
        schema_version: '1.0.0',
        causation_id: options.causation_id || null,
        correlation_id: options.correlation_id || eventId,
        ...(options.metadata || {}),
      },
      _seq: ++this._seq,
    };

    const existing = this._events.get(eventId);
    if (existing) {
      if (canonical(existing.payload) !== canonical(event.payload)) {
        this.stats.collisions++;
        this.stats.failed++;
        return { status: 'error', error: 'Event ID collision: same event_id with different payload semantics', eventId };
      }
      this.stats.deduplicated++;
      return { status: 'ok', eventId, event: existing, deduplicated: true };
    }
    this._events.set(eventId, event);
    this.stats.persisted++;
    this.stats.emitted++;
    if (this._appendFile) fs.appendFileSync(this._appendFile, JSON.stringify(event) + '\n');
    return { status: 'ok', eventId, event };
  }

  /** Newest-first, mirroring UER query() ORDER BY timestamp DESC. */
  async query(options = {}) {
    let rows = [...this._events.values()];
    if (options.eventType) rows = rows.filter(e => e.event_type === options.eventType);
    if (options.source) rows = rows.filter(e => e.source === options.source);
    rows.sort((a, b) => b._seq - a._seq);
    if (options.limit) rows = rows.slice(0, options.limit);
    return { status: 'ok', events: rows, count: rows.length };
  }

  /** All EFFECT_* events for one op key, oldest-first (causal order). */
  async queryOp(opKey) {
    const rows = [...this._events.values()]
      .filter(e => e.event_type.startsWith('EFFECT_') && e.payload && e.payload.op_key === opKey)
      .sort((a, b) => a._seq - b._seq);
    return rows;
  }

  size() { return this._events.size; }
}

module.exports = { EventJournal, canonical };
