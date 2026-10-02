/**
 * LegacyIngressAdapter — PING Core v1 (MC-1, 2026-09-18)
 *
 * CONSTITUTIONAL CLASSIFICATION (MC-1 Option A):
 *   canonical_events        = UPSTREAM INGRESS STORE / LEGACY INGRESS SURFACE
 *                             NON-CANONICAL UNTIL CONVERGED. Not deleted.
 *   This adapter            = ADAPTER. The single wired convergence path for
 *                             that surface into canonical acceptance.
 *   ping_events             = CANONICAL accepted-event store, written only via
 *                             UnifiedEventRuntime.emit().
 *   repository_events leg   = RETIRED. See event_bridge.js (PRESERVED_INACTIVE).
 *
 * A row merely existing in canonical_events MUST NOT mean "accepted by PING".
 * Canonical acceptance occurs only after successful convergence through
 * UnifiedEventRuntime.emit() into ping_events.
 *
 * CONVERGENCE (Phases 5/10, 2026-09-19 — "Refactor authority, preserve mechanism"):
 * The bridge is preserved; reminting is made explicit instead of silent.
 * On acceptance the adapter now records the explicit cross-reference
 * (canonical_events.source_event_id = the canonical event_id) and the
 * certified representation identity (envelope_id, deterministic from the
 * canonical identity), plus an explicit identity-role note in
 * metadata.legacy_ingress. The bridge translates/normalizes/projects; it
 * never silently turns old event X into new canonical event Y.
 *
 * RECEIPT SEMANTICS (explicit, standing law 2026-09-19): every field read
 * from a canonical_events row is RECEIPT-side and is never silently promoted
 * into constitutional semantics:
 *   row.event_id  = receipt identity (ingress-era UUID; preserved on the row)
 *   row.sequence  = receipt ordering (per-tenant; never canonical order)
 *   row.timestamp = receipt timestamp (never the acceptance timestamp)
 *   row.tenant_id = tenant claim (unverified; the AUTHORIZATION layer below
 *                   resolves the canonical namespace, failing closed)
 * Constitutional semantics (canonical identity, canonical sequence,
 * acceptance timestamp, canonical namespace) are minted ONLY by
 * UnifiedEventRuntime.emit() at convergence.
 *
 * REPAIRED DEFECTS (frozen in ~/workspace/f7-evidence/02-era-census-and-bridge.md
 * and ~/workspace/mc1-evidence/01-mc1-freeze-addendum.md):
 *
 *   C-035 — No high-water cursor. The old bridge used a lexicographic
 *           `event_id > $last` cursor over random UUIDs, which can permanently
 *           skip unprocessed rows. This adapter keeps NO cursor: durable
 *           progress is per-row state in canonical_events itself
 *           (processed/processed_at/worker/retries/last_error +
 *           metadata.legacy_ingress.disposition). Rows are selected by state,
 *           ordered by created_at for fairness only. Invariant:
 *           NO UNPROCESSED ROW MAY BECOME PERMANENTLY INVISIBLE.
 *
 *   C-037 — No progress on failure. There is no cursor to advance past a
 *           failed row. A failed emit leaves the row UNPROCESSED (retryable)
 *           or moves it to an explicit durable REJECTED state. Rejected rows
 *           keep processed=FALSE so rejection can never be confused with
 *           acceptance. Invariant: FAILED CANONICAL ACCEPTANCE MUST NOT BE
 *           ACKNOWLEDGED AS SUCCESSFUL PROGRESS.
 *
 *   Vacuous dedup — removed. The old `event_id NOT IN (SELECT event_id FROM
 *           ping_events ...)` compared source-table UUIDs against reminted
 *           event_<16hex> IDs and could never match. Idempotency now rests on
 *           (a) the per-row processed flag and (b) deterministic re-minting:
 *           the ingress identity is carried in the payload, so re-emitting an
 *           unmarked row yields the same V2 canonical ID and
 *           ON CONFLICT DO NOTHING absorbs the duplicate.
 *
 *   Convergence losses — provenance is preserved in layers, not flattened:
 *           IDENTITY INPUT  = { event_type, source, namespace, payload }
 *                             (payload carries the ingress identity keys so
 *                             re-emission is idempotent)
 *           PROVENANCE      = options.metadata: ingress_surface, original
 *                             event_id/type/source/timestamp/metadata,
 *                             tenant_id, actor (claimed, NOT verified — F3
 *                             principal authentication is a separate frozen
 *                             finding), event_version, sequence
 *           ROUTING         = causation_id / correlation_id passed through
 *           AUTHORIZATION   = namespace resolved to tenant::<id> (never
 *                             silently collapsed to core::system); tenant_id
 *                             failing the canonical format is REJECTED
 *           OPERATIONAL     = adapter version, attempts, decision timestamps
 *                             in canonical_events.metadata.legacy_ingress
 *
 * DOCUMENTED COMPATIBILITY EXCEPTION (ruled MC-1 law: "unless a documented
 * compatibility exception exists"):
 *   Legacy event types are external/producer-controlled and unbounded; no
 *   producer type-registration mechanism exists in the repo, so legacy types
 *   cannot be pre-registered in gateway/generated/event_registry.json.
 *   Convergence is therefore TWO-PHASE per row:
 *     Phase 1 — normal acceptance: emit with NO exception flags. Full
 *               validator registry check + full governance, exactly the rules
 *               direct ingress faces. Registered legacy types converge here.
 *     Phase 2 — ONLY after phase 1 returns UNKNOWN_EVENT_TYPE, retry once
 *               presenting the capability object minted in bootstrap
 *               (options.legacyIngressCapability, compared by object
 *               identity). The runtime then excepts ONLY the
 *               registry-membership check (emit step 2) and governance's
 *               registry-derived UNREGISTERED_EVENT check (emit step 3).
 *   The capability is unforgeable: boolean flags (_legacyIngress,
 *   _skipGovernance) presented WITHOUT the capability object grant nothing.
 *   Without the capability the adapter fails closed on unregistered types.
 *   Everything else applies unchanged in both phases: the F7/D1 value-domain
 *   boundary still rejects illegal values BEFORE any ID is minted (no ID, no
 *   persistence, no acceptance claim), persistence is identical, and the
 *   adapter self-enforces the type-independent governance rule — the
 *   canonical namespace format ^(core|tenant)::[a-zA-Z0-9_-]+$ — before
 *   emitting. Which phase accepted a row is durably recorded in
 *   canonical_events.metadata.legacy_ingress.exception ('none' |
 *   'registry_compat'). This is a documented exception, NOT "legacy events
 *   are trusted automatically".
 *
 * PER-ROW STATES (reuses existing columns; no schema change):
 *   UNPROCESSED — processed IS NOT TRUE, no disposition, no error yet
 *   RETRYABLE   — processed IS NOT TRUE, last_error set, attempts < maxRetries
 *   REJECTED    — processed IS NOT TRUE (never confused with acceptance),
 *                 metadata.legacy_ingress.disposition = 'REJECTED'
 *   ACCEPTED    — processed = TRUE, with forward correlation
 *                 (metadata.legacy_ingress.canonical_event_id and the
 *                 canonical_events.source_event_id column) and reverse
 *                 correlation (ping_events.metadata.original_event_id).
 */

const {
  deriveEnvelopeId,
  LEGACY_CONVERGED_ERA,
  ENVELOPE_VERSION,
} = require('./convergence_identity.js');

const CANONICAL_NAMESPACE_RE = /^(core|tenant)::[a-zA-Z0-9_-]+$/;
const ADAPTER_VERSION = '1.1.0';
const ADAPTER_WORKER = 'legacy_ingress_adapter';

// Emit result codes that are deterministic policy/value rejections: retrying
// cannot succeed, so the row moves straight to durable REJECTED.
const DETERMINISTIC_REJECTION_CODES = new Set([
  'UNKNOWN_EVENT_TYPE',       // fail-closed when no capability is configured; phase 2 normally excepts this
  'IDENTITY_VALUE_REJECTED',  // F7/D1 value-domain boundary (before minting)
  'INVALID_TENANT_NAMESPACE', // adapter-side namespace format enforcement
  'GOVERNANCE_VIOLATION',     // defense in depth; adapter skips governance via exception
]);

class LegacyIngressAdapter {
  /**
   * @param {object} options
   * @param {object} options.pool — pg.Pool
   * @param {object} options.eventRuntime — UnifiedEventRuntime instance
   * @param {number} options.pollIntervalMs — poll interval (default 5000)
   * @param {number} options.batchSize — max rows per poll (default 50)
   * @param {number} options.maxRetries — attempts before RETRY_EXHAUSTED (default 5)
   */
  constructor(options = {}) {
    this._pool = options.pool || null;
    this._eventRuntime = options.eventRuntime || null;
    // MC-1 capability: opaque object minted in bootstrap and handed to both
    // this adapter and UnifiedEventRuntime. Presented (by object identity) on
    // the phase-2 emit to claim the documented registry-compatibility
    // exception. Absent => fail closed: unregistered types are rejected.
    this._capability = options.legacyIngressCapability || null;
    this._pollIntervalMs = options.pollIntervalMs || 5000;
    this._batchSize = options.batchSize || 50;
    this._maxRetries = options.maxRetries || 5;
    this._timer = null;
    this._running = false;
    this._polling = false;
    // Phase 5/10: whether the convergence cross-reference columns
    // (source_event_id, envelope_id) exist. Probed in initialize(); when the
    // migration has not been applied yet, acceptance still works and marks
    // via metadata only (bridge preserved across the migration boundary).
    this._hasConvergenceColumns = null;
    this._stats = {
      polls: 0,
      accepted: 0,
      rejected: 0,
      retried: 0,
      errors: 0,
      lastPollAt: null,
    };
  }

  /**
   * Fail-closed probe: the upstream store must exist and be readable.
   * The adapter never runs DDL on canonical_events (it is producer-owned).
   * Also probes for the Phase 5 convergence columns to decide whether
   * acceptance can record the explicit cross-reference or must fall back to
   * metadata-only marking (pre-migration databases keep working).
   */
  async initialize() {
    if (!this._pool) return;
    try {
      await this._pool.query('SELECT 1 FROM canonical_events LIMIT 1');
    } catch (err) {
      throw new Error(
        `[LegacyIngressAdapter] canonical_events is not readable: ${err.message}`
      );
    }
    try {
      const cols = await this._pool.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'canonical_events'
           AND column_name IN ('source_event_id', 'envelope_id')`
      );
      const names = new Set(cols.rows.map((r) => r.column_name));
      this._hasConvergenceColumns = names.has('source_event_id') && names.has('envelope_id');
    } catch (err) {
      this._hasConvergenceColumns = false;
    }
    if (!this._hasConvergenceColumns) {
      console.log(
        '[LegacyIngressAdapter] convergence columns (source_event_id, envelope_id) absent: ' +
        'acceptance will mark via metadata only until the 2026-09-19 convergence migration is applied'
      );
    }
  }

  start() {
    if (!this._pool || !this._eventRuntime) {
      console.log('[LegacyIngressAdapter] Degraded mode — adapter disabled (pool or eventRuntime missing)');
      return;
    }
    if (this._running) return;
    this._running = true;
    console.log(`[LegacyIngressAdapter] Started — surface=canonical_events poll=${this._pollIntervalMs}ms batch=${this._batchSize} maxRetries=${this._maxRetries}`);
    this._timer = setInterval(() => this._poll(), this._pollIntervalMs);
    this._poll();
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._running = false;
    console.log('[LegacyIngressAdapter] Stopped');
  }

  async _poll() {
    if (!this._pool || !this._eventRuntime) return;
    if (this._polling) return; // never overlap a slow poll
    this._polling = true;
    try {
      await this._convergeBatch();
    } catch (err) {
      console.error(`[LegacyIngressAdapter] poll error: ${err.message}`);
      this._stats.errors++;
    } finally {
      this._polling = false;
      this._stats.polls++;
      this._stats.lastPollAt = new Date().toISOString();
    }
  }

  /**
   * Work-row exclusion predicate (Phase 10 seam proof).
   *
   * The adapter converges the LEGACY INGRESS surface only. Rows that are
   * already converged representations must never be selected as ingress
   * work — converging them would be a category error (receipt/ingress vs.
   * representation), and marking them REJECTED would corrupt certified
   * artifacts. Excluded:
   *   - era 'converged': derived via acceptCanonicalEvent from a ping_events
   *     commit (already canonical; nothing to converge);
   *   - era 'legacy_converged': converged via this adapter (processed=TRUE
   *     also excludes them; belt and suspenders);
   *   - source_event_id IS NOT NULL (when the column exists): the explicit
   *     cross-reference already maps this row to a canonical commit.
   * Pure ingress rows (era 'ingress' or no era marker at all, i.e. historical
   * pre-convergence rows) remain selectable.
   */
  _workRowExclusion() {
    const parts = [
      "COALESCE(metadata->'envelope'->>'era','') NOT IN ('converged','legacy_converged')",
    ];
    if (this._hasConvergenceColumns) {
      parts.push('source_event_id IS NULL');
    }
    return parts.join(' AND ');
  }

  /**
   * Select work rows by durable state. No cursor: every row that is not
   * ACCEPTED and not durably REJECTED remains visible to future polls.
   * created_at ordering is fairness only, never progress.
   * Converged representation rows are excluded (see _workRowExclusion).
   */
  async _selectWorkRows() {
    const result = await this._pool.query(
      `SELECT event_id, event_type, event_version, tenant_id, source, actor,
              payload, metadata, causation_id, correlation_id,
              created_at, timestamp, sequence, retries, last_error, processed
       FROM canonical_events
       WHERE processed IS DISTINCT FROM TRUE
         AND COALESCE(metadata->'legacy_ingress'->>'disposition','') <> 'REJECTED'
         AND ${this._workRowExclusion()}
       ORDER BY created_at ASC NULLS LAST, event_id ASC
       LIMIT $1`,
      [this._batchSize]
    );
    return result.rows;
  }

  async _convergeBatch() {
    const rows = await this._selectWorkRows();
    if (rows.length === 0) return;
    let accepted = 0, rejected = 0, retried = 0;
    for (const row of rows) {
      try {
        const outcome = await this._convergeRow(row);
        if (outcome === 'accepted') accepted++;
        else if (outcome === 'rejected') rejected++;
        else if (outcome === 'retried') retried++;
      } catch (err) {
        // Row-level failure must never abort the batch (no head-of-line
        // blocking) and never become invisible: record as retryable.
        console.error(`[LegacyIngressAdapter] row ${row.event_id} threw: ${err.message}`);
        await this._markRetryable(row, 'ADAPTER_THROW', err.message);
        this._stats.errors++;
        retried++;
      }
    }
    if (accepted > 0 || rejected > 0 || retried > 0) {
      console.log(`[LegacyIngressAdapter] batch: accepted=${accepted} rejected=${rejected} retried=${retried}`);
    }
  }

  async _convergeRow(row) {
    const attempts = row.retries || 0;
    if (attempts >= this._maxRetries) {
      await this._markRejected(row, 'RETRY_EXHAUSTED',
        `emit failed ${attempts} times without success; last: ${row.last_error || 'unknown'}`);
      this._stats.rejected++;
      return 'rejected';
    }

    // AUTHORIZATION layer: resolve the tenant boundary before emitting.
    // A malformed tenant_id is fail-closed (REJECTED), never silently
    // collapsed to core::system.
    const ns = this._resolveNamespace(row);
    if (!ns.ok) {
      await this._markRejected(row, 'INVALID_TENANT_NAMESPACE', ns.reason);
      this._stats.rejected++;
      return 'rejected';
    }

    const payload = (row.payload && typeof row.payload === 'object') ? { ...row.payload } : {};
    if (typeof row.payload === 'string') {
      try { Object.assign(payload, JSON.parse(row.payload)); } catch (_) { /* keep {} */ }
    }
    // Ingress identity keys (adapter-owned `_` prefix): part of IDENTITY INPUT
    // so re-emission of an unmarked row mints the same canonical ID.
    payload._canonical_event_id = String(row.event_id);
    if (row.tenant_id != null) payload._tenant_id = row.tenant_id;
    if (row.actor != null) payload._actor = row.actor;

    const metadata = {
      ingress_surface: 'canonical_events',
      adapter: 'LegacyIngressAdapter',
      adapter_version: ADAPTER_VERSION,
      original_event_id: String(row.event_id),
      original_event_type: row.event_type,
      original_source: row.source || null,
      original_timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : null,
      original_metadata: (row.metadata && typeof row.metadata === 'object') ? row.metadata : {},
      original_sequence: row.sequence != null ? row.sequence : null,
      tenant_id: row.tenant_id || null,
      actor: row.actor || null, // claimed actor: PROVENANCE only, not a verified principal (F3 frozen)
      event_version: row.event_version || '1.0.0',
    };

    const baseOptions = {
      namespace: ns.namespace,
      causation_id: row.causation_id != null ? String(row.causation_id) : undefined,
      correlation_id: row.correlation_id != null ? String(row.correlation_id) : undefined,
      metadata,
    };
    let emitResult;
    let usedException = false;
    try {
      // Phase 1: the NORMAL acceptance path — full validator + governance,
      // exactly the rules direct ingress faces. Registered legacy event types
      // converge here with no exception of any kind.
      emitResult = await this._eventRuntime.emit(
        row.event_type,                   // original type passed through
        row.source || 'canonical_events', // PROVENANCE: true origin preserved, not overwritten
        payload,
        baseOptions
      );
      // Phase 2: ONLY after a normal-path UNKNOWN_EVENT_TYPE, retry once
      // through the capability-bound documented compatibility exception
      // (registry-derived checks only). The capability object is minted in
      // bootstrap and unforgeable by other callers; without it the adapter
      // fails closed on unregistered types.
      if (emitResult && emitResult.status === 'error'
          && emitResult.code === 'UNKNOWN_EVENT_TYPE' && this._capability) {
        usedException = true;
        emitResult = await this._eventRuntime.emit(
          row.event_type,
          row.source || 'canonical_events',
          payload,
          {
            ...baseOptions,
            legacyIngressCapability: this._capability,
            _skipGovernance: true, // honored ONLY with the capability (runtime-gated)
          }
        );
      }
    } catch (err) {
      await this._markRetryable(row, 'EMIT_THROW', err.message);
      this._stats.retried++;
      return 'retried';
    }

    if (emitResult && emitResult.status === 'ok') {
      await this._markAccepted(row, emitResult.eventId, usedException ? 'registry_compat' : 'none');
      this._stats.accepted++;
      return 'accepted';
    }

    const code = (emitResult && emitResult.code) || 'EMIT_ERROR';
    const message = (emitResult && (emitResult.error || emitResult.message)) || 'unknown emit failure';
    if (DETERMINISTIC_REJECTION_CODES.has(code)) {
      await this._markRejected(row, code, message);
      this._stats.rejected++;
      return 'rejected';
    }
    await this._markRetryable(row, code, message);
    this._stats.retried++;
    return 'retried';
  }

  _resolveNamespace(row) {
    const namespace = row.tenant_id ? `tenant::${row.tenant_id}` : 'core::system';
    if (!CANONICAL_NAMESPACE_RE.test(namespace)) {
      return {
        ok: false,
        reason: `tenant_id ${JSON.stringify(row.tenant_id)} does not form a valid canonical namespace (must match ^(core|tenant)::[a-zA-Z0-9_-]+$)`,
      };
    }
    return { ok: true, namespace };
  }

  async _markAccepted(row, canonicalEventId, exception = 'none') {
    // Phase 10 — explicit identity distinction (no silent reminting):
    //   ingress_event_id  (X) = this row's event_id: the ingress-era receipt
    //                           identity, preserved on the row, never rewritten.
    //   canonical_event_id (Y) = the canonical identity minted at convergence
    //                           by UnifiedEventRuntime via IdentityAuthority.
    //   migrated_event_id  (Y) = the identity this row's content now converges to.
    // The bridge translates and references; it never substitutes X for Y
    // silently. The explicit cross-reference column (source_event_id) makes
    // the mapping deterministic both directions: ping_events.event_id <->
    // canonical_events.source_event_id. envelope_id is the certified
    // representation's identity (deterministic from Y), never the event's.
    const envelopeId = deriveEnvelopeId(canonicalEventId);
    const marker = {
      legacy_ingress: {
        disposition: 'ACCEPTED',
        ingress_event_id: String(row.event_id),
        canonical_event_id: canonicalEventId,
        migrated_event_id: canonicalEventId,
        identity_note: 'X (this row event_id) is the ingress-era receipt identity, preserved; ' +
          'Y (canonical_event_id) is the canonical identity minted at convergence. ' +
          'The bridge references both explicitly and never silently substitutes one for the other.',
        // 'none' = normal validator+governance path; 'registry_compat' =
        // capability-bound documented compatibility exception (phase 2).
        exception,
        accepted_at: new Date().toISOString(),
        adapter_version: ADAPTER_VERSION,
      },
      envelope: {
        envelope_version: ENVELOPE_VERSION,
        era: LEGACY_CONVERGED_ERA,
        envelope_id: envelopeId,
        canonical_event_id: canonicalEventId,
        note: 'representation via legacy-ingress convergence (adapter), not via acceptCanonicalEvent',
      },
    };
    if (this._hasConvergenceColumns) {
      await this._pool.query(
        `UPDATE canonical_events
         SET processed = TRUE,
             processed_at = NOW(),
             worker = $2,
             envelope_id = $4::uuid,
             source_event_id = $5,
             metadata = COALESCE(metadata,'{}') || $3::jsonb
         WHERE event_id = $1 AND processed IS DISTINCT FROM TRUE`,
        [row.event_id, ADAPTER_WORKER, JSON.stringify(marker), envelopeId, canonicalEventId]
      );
    } else {
      // Pre-migration fallback: the bridge still converges and marks via
      // metadata only. The explicit cross-reference columns are populated
      // once the convergence migration is applied (rebuild covers the gap).
      await this._pool.query(
        `UPDATE canonical_events
         SET processed = TRUE,
             processed_at = NOW(),
             worker = $2,
             metadata = COALESCE(metadata,'{}') || $3::jsonb
         WHERE event_id = $1 AND processed IS DISTINCT FROM TRUE`,
        [row.event_id, ADAPTER_WORKER, JSON.stringify(marker)]
      );
    }
  }

  async _markRetryable(row, code, message) {
    const attempts = (row.retries || 0) + 1;
    if (attempts >= this._maxRetries) {
      await this._markRejected(row, 'RETRY_EXHAUSTED',
        `emit failed ${attempts} times without success; last: ${code}: ${message}`);
      return;
    }
    await this._pool.query(
      `UPDATE canonical_events
       SET processed = FALSE,
           retries = $2,
           last_error = $3,
           worker = $4
       WHERE event_id = $1 AND processed IS DISTINCT FROM TRUE`,
      [row.event_id, attempts, `${code}: ${message}`.slice(0, 2000), ADAPTER_WORKER]
    );
  }

  async _markRejected(row, code, reason) {
    // Durable rejection: processed stays FALSE so rejection can NEVER be
    // confused with acceptance. The disposition marker excludes the row from
    // future work selection without making it invisible to forensics.
    const marker = {
      legacy_ingress: {
        disposition: 'REJECTED',
        code,
        reason: String(reason).slice(0, 1000),
        attempts: row.retries || 0,
        decided_at: new Date().toISOString(),
        adapter_version: ADAPTER_VERSION,
      },
    };
    await this._pool.query(
      `UPDATE canonical_events
       SET processed = FALSE,
           last_error = $2,
           worker = $3,
           metadata = COALESCE(metadata,'{}') || $4::jsonb
       WHERE event_id = $1 AND processed IS DISTINCT FROM TRUE`,
      [row.event_id, `${code}: ${String(reason).slice(0, 1500)}`, ADAPTER_WORKER, JSON.stringify(marker)]
    );
  }

  /**
   * Live per-state counts for observability (the old bridge had none).
   * Converged representation rows are excluded from ingress states
   * (see _workRowExclusion): they are not ingress work.
   */
  async getIngressStateCounts() {
    if (!this._pool) return { status: 'error', error: 'No pool' };
    const excl = this._workRowExclusion();
    const result = await this._pool.query(
      `SELECT
         COUNT(*) FILTER (
           WHERE processed IS DISTINCT FROM TRUE
             AND COALESCE(metadata->'legacy_ingress'->>'disposition','') <> 'REJECTED'
             AND ${excl}
             AND last_error IS NULL
         ) AS unprocessed,
         COUNT(*) FILTER (
           WHERE processed IS DISTINCT FROM TRUE
             AND COALESCE(metadata->'legacy_ingress'->>'disposition','') <> 'REJECTED'
             AND ${excl}
             AND last_error IS NOT NULL
         ) AS retryable,
         COUNT(*) FILTER (
           WHERE processed IS DISTINCT FROM TRUE
             AND COALESCE(metadata->'legacy_ingress'->>'disposition','') = 'REJECTED'
         ) AS rejected,
         COUNT(*) FILTER (WHERE processed = TRUE) AS accepted
       FROM canonical_events`
    );
    return { status: 'ok', ...result.rows[0] };
  }

  getStats() {
    return {
      adapter: 'LegacyIngressAdapter',
      surface: 'canonical_events',
      scope: 'session',
      running: this._running,
      pollIntervalMs: this._pollIntervalMs,
      batchSize: this._batchSize,
      maxRetries: this._maxRetries,
      convergenceColumns: this._hasConvergenceColumns,
      ...this._stats,
    };
  }
}

module.exports = { LegacyIngressAdapter };
