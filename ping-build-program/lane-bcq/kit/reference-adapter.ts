/**
 * LANE BCQ — Reference connector adapter.
 *
 * The minimal CORRECT implementation of the ConnectorAdapter SPI. It exists
 * to (a) prove the contract test kit is passable, and (b) serve as the
 * template lane CONN copies for real providers (GBP, Meta, Yelp).
 *
 * What it does: scripted four-verb lifecycle, bounded retries with jitter,
 * Retry-After honoring, circuit breaker, opaque cursors, contiguous
 * checkpoints, FULL_RESYNC on cursor invalidation, OUTCOME_UNKNOWN
 * reconciliation by idempotency key, sanitization at the ingestion boundary,
 * provenance on every observation, failure-taxonomy conformance.
 *
 * What it does NOT do: persist canonical state, sequence events, touch raw
 * tokens, interpret cursors, invent failure codes, or probe undeclared
 * capabilities. Those belong to the event authority, lane L's broker, lane M,
 * and lane K respectively.
 */
import {
  CheckOutcome,
  ConnectorAdapter,
  ReadOutcome,
  WebhookOutcome,
} from './adapter';
import { ConnectorPorts, Harness, idempotencyKeyFor, sha256Hex } from './harness';
import {
  Confidence,
  ConnectorManifest,
  CursorState,
  FailureCode,
  FetchAttemptRecord,
  FetchState,
  Observation,
  ReadRequest,
  StreamDescriptor,
  WebhookDelivery,
} from './types';
import {
  isBlockedUrl,
  looksMixedScript,
  MAX_REDIRECT_HOPS,
  MAX_RESPONSE_BYTES,
  rawEvidenceRefFor,
  sanitizeText,
} from './sanitize';

const BASE = 'https://provider.example/api';

/** Deterministic jitter: decorrelated without randomness (testable). */
function jitterMs(attempt: number): number {
  return (attempt * 137) % 500;
}

interface Page {
  records: Array<Record<string, unknown>>;
  nextCursor: string | null;
}

export class ReferenceAdapter implements ConnectorAdapter {
  readonly manifest: ConnectorManifest;
  /** Client-side token bucket: calls used in the current window. */
  private callsUsed = 0;
  /** Circuit breaker state. */
  private consecutiveFailures = 0;
  private breakerOpenUntilVirtualMs = 0;
  /** Seen webhook delivery ids (dedupe). */
  private seenDeliveries = new Set<string>();

  constructor(manifest: ConnectorManifest) {
    this.manifest = manifest;
  }

  /* ---------------- check ---------------- */

  async check(configRef: string, ports: ConnectorPorts): Promise<CheckOutcome> {
    const checkedAt = ports.nowIso();
    try {
      const res = await ports.fetchRaw({
        method: 'GET', url: `${BASE}/health`, tenantId: '__check__',
        connectionId: configRef, capability: 'read.health',
      });
      if (res.status === 200) {
        return { status: 'SUCCEEDED', checkedAt, message: 'provider reachable', verifiedObjects: ['health'] };
      }
      if (res.status === 401 || res.status === 403) {
        return {
          status: 'FAILED', checkedAt, message: `auth rejected: ${res.status}`,
          errorClass: 'user_error', verifiedObjects: [],
        };
      }
      return {
        status: 'FAILED', checkedAt, message: `health returned ${res.status}`,
        errorClass: 'connector_error', verifiedObjects: [],
      };
    } catch (err) {
      return {
        status: 'FAILED', checkedAt,
        message: `health fetch threw: ${(err as Error).message}`,
        errorClass: 'connector_error', verifiedObjects: [],
      };
    }
  }

  /* ---------------- discover ---------------- */

  async discover(configRef: string, ports: ConnectorPorts): Promise<StreamDescriptor[]> {
    const res = await ports.fetchRaw({
      method: 'GET', url: `${BASE}/streams`, tenantId: '__discover__',
      connectionId: configRef, capability: 'search.streams',
    });
    if (!res.ok) throw new Error(`discover failed: ${res.status}`);
    const parsed = JSON.parse(res.body) as { streams: StreamDescriptor[] };
    // Deterministic ordering (M2): alphabetical by stream_id.
    return [...parsed.streams].sort((a, b) => a.streamId.localeCompare(b.streamId));
  }

  /* ---------------- read ---------------- */

  async read(request: ReadRequest, ports: ConnectorPorts): Promise<ReadOutcome> {
    const fetchAttemptId = `attempt-${sha256Hex(request.idempotencyKey).slice(0, 12)}`;
    const startedAt = ports.nowIso();
    let attemptsUsed = 0;
    let recordsEmitted = 0;
    const recordsSkipped: string[] = [];
    let partial = false;
    const newCursor: CursorState = { ...(request.state ?? {}) };

    const finish = (
      terminalState: FetchState, failureCode?: FailureCode, reason?: string,
      missingFields?: string[],
    ): ReadOutcome => {
      const rec: FetchAttemptRecord = {
        fetchAttemptId, connectorId: this.manifest.connectorId,
        streamId: request.streamIds.join(','), tenantId: request.tenantId,
        state: terminalState, failureCode, reason, attemptsUsed,
        partial: partial || undefined, missingFields,
        startedAt, finishedAt: ports.nowIso(),
      };
      ports.recordFetchAttempt(rec);
      return {
        fetchAttemptId, terminalState, failureCode, reason,
        recordsEmitted, recordsSkipped, partial, newCursor,
      };
    };

    // Declared streams only: reads against undeclared streams are a protocol violation.
    const declared = new Map(this.manifest.streams.map((s) => [s.streamId, s]));
    for (const sid of request.streamIds) {
      if (!declared.has(sid)) {
        return finish(FetchState.FAILED, FailureCode.PERMANENT, `undeclared stream: ${sid}`);
      }
    }

    for (const streamId of request.streamIds) {
      const stream = declared.get(streamId)!;
      let cursor: string | null = request.state?.[streamId] ?? null;
      let resynced = false;

      // Resume: the harness cursor store is the durable watermark across restarts.
      const stored = ports.cursorStore.load(request.tenantId, streamId);
      if (stored && stored.cursor) cursor = stored.cursor;

      // Circuit breaker: fail fast without touching the provider.
      if (this.breakerOpen()) {
        return finish(FetchState.FAILED, FailureCode.SOURCE_UNAVAILABLE, 'circuit-breaker-open');
      }

      for (;;) {
        // Client-side budget: stop before exceeding the declared budget.
        if (!this.takeBudget()) {
          return finish(FetchState.NOT_STARTED, undefined, 'client-budget-exhausted');
        }
        const url = `${BASE}/${streamId.replace('.', '/')}?cursor=${encodeURIComponent(cursor ?? '')}`;
        let raw;
        try {
          raw = await this.fetchWithRetry(url, request, ports, 'read.' + stream.streamClass);
          attemptsUsed = raw.attemptsUsed;
        } catch (err) {
          const coded = err as { failureCode: FailureCode; reason: string; outcomeUnknown?: boolean; attemptsUsed?: number };
          if (typeof coded.attemptsUsed === 'number') attemptsUsed = coded.attemptsUsed;
          if (coded.outcomeUnknown) {
            // OUTCOME_UNKNOWN: exactly one bounded reconciliation pass, same idempotency key.
            const reconciled = await this.reconcile(url, request, ports, stream, fetchAttemptId, cursor);
            recordsEmitted += reconciled.emitted;
            recordsSkipped.push(...reconciled.skipped);
            if (reconciled.partial) partial = true;
            if (reconciled.newCursor) {
              newCursor[streamId] = reconciled.newCursor;
              ports.cursorStore.save(request.tenantId, streamId, { cursor: reconciled.newCursor });
            }
            return finish(FetchState.OUTCOME_UNKNOWN, coded.failureCode, coded.reason);
          }
          return finish(FetchState.FAILED, coded.failureCode, coded.reason);
        }
        this.noteSuccess();

        // Boundary checks before parsing.
        if (isBlockedUrl(raw.finalUrl)) {
          return finish(FetchState.FAILED, FailureCode.PERMANENT, 'ssrf-blocked');
        }
        if (raw.redirectHops > MAX_REDIRECT_HOPS) {
          return finish(FetchState.FAILED, FailureCode.INVALID_PAYLOAD, 'redirect-cap');
        }
        if (raw.bytes > MAX_RESPONSE_BYTES) {
          return finish(FetchState.FAILED, FailureCode.INVALID_PAYLOAD, 'oversized');
        }
        if (raw.status === 304) {
          // 304: freshness clock refreshed, NO change events.
          break;
        }
        if (raw.status === 410) {
          // Cursor invalidation is a typed FULL_RESYNC, not an error.
          if (resynced) {
            return finish(FetchState.FAILED, FailureCode.SOURCE_CHANGED, 'cursor-invalid-after-resync');
          }
          ports.log('warn', 'cursor invalidated; FULL_RESYNC', { streamId });
          resynced = true;
          cursor = null;
          continue;
        }

        let page: Page;
        try {
          page = this.parsePage(raw.body);
        } catch {
          return finish(FetchState.FAILED, FailureCode.INVALID_PAYLOAD, 'malformed-response');
        }

        const rawRef = rawEvidenceRefFor(raw.body, sha256Hex);
        let pageSkipped = 0;
        for (const record of page.records) {
          const emitted = this.normalizeAndEmit(
            record, stream, request, ports, fetchAttemptId, rawRef, raw.finalUrl,
          );
          if (emitted === 'emitted') recordsEmitted++;
          else {
            partial = true;
            pageSkipped++;
            recordsSkipped.push(emitted);
          }
        }

        // Contiguous checkpoint: advance only past fully-processed pages.
        // A page with skipped records is NOT checkpointed; the next run
        // re-reads it and the idempotency keys absorb already-emitted records.
        if (page.nextCursor && pageSkipped === 0) {
          cursor = page.nextCursor;
          newCursor[streamId] = page.nextCursor;
          ports.cursorStore.save(request.tenantId, streamId, { cursor: page.nextCursor });
        } else if (!page.nextCursor) {
          break;
        }
        // else: page.nextCursor exists but pageSkipped > 0 → hold the cursor,
        // loop re-reads the same page next run. Break to avoid a hot loop
        // within a single read; the scheduler re-dispatches.
        if (page.nextCursor && pageSkipped > 0) break;
      }
    }
    return finish(FetchState.SUCCEEDED, undefined, undefined, partial ? recordsSkipped : undefined);
  }

  /* ---------------- webhook ---------------- */

  async receiveWebhook(delivery: WebhookDelivery, ports: ConnectorPorts): Promise<WebhookOutcome> {
    // Verify BEFORE parse, fail closed (M6).
    if (!ports.verifyWebhookSignature(delivery)) {
      return { deliveryId: delivery.deliveryId, accepted: false, reason: 'signature-mismatch', observationsEmitted: 0 };
    }
    if (this.seenDeliveries.has(delivery.deliveryId)) {
      return { deliveryId: delivery.deliveryId, accepted: true, duplicate: true, observationsEmitted: 0 };
    }
    this.seenDeliveries.add(delivery.deliveryId);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(delivery.rawBody) as Record<string, unknown>;
    } catch {
      return { deliveryId: delivery.deliveryId, accepted: false, reason: 'malformed-body', observationsEmitted: 0 };
    }

    const tenantId = typeof parsed.tenant_id === 'string' ? parsed.tenant_id : 'unknown';
    const eventType = typeof parsed.event_type === 'string' ? parsed.event_type : 'unknown';
    const rawRef = rawEvidenceRefFor(delivery.rawBody, sha256Hex);

    if (eventType === 'review.received' || eventType === 'review.updated') {
      const record = (parsed.record ?? {}) as Record<string, unknown>;
      const stream = this.manifest.streams.find((s) => s.streamClass === 'reviews') ?? this.manifest.streams[0];
      const obs = this.buildObservation(record, stream, tenantId, 'webhook', ports, delivery.deliveryId, rawRef);
      if (!obs) {
        return { deliveryId: delivery.deliveryId, accepted: false, reason: 'record-missing-id', observationsEmitted: 0 };
      }
      ports.emitObservation(obs);
      return { deliveryId: delivery.deliveryId, accepted: true, observationsEmitted: 1 };
    }

    // Unknown shapes are preserved opaque, never dropped, never crashed on (M17/M18).
    const extId = typeof parsed.id === 'string' ? parsed.id : delivery.deliveryId;
    const version = typeof parsed.updated_at === 'string' ? parsed.updated_at : delivery.receivedAt;
    ports.emitObservation({
      idempotencyKey: idempotencyKeyFor(this.manifest.connectorId, 'webhook', extId, version),
      connectorId: this.manifest.connectorId,
      streamId: 'webhook',
      tenantId,
      principal: 'platform-operator',
      externalObjectId: extId,
      externalTimestamp: version,
      observedTimestamp: ports.nowIso(),
      provenance: {
        provider: this.manifest.provider, sourceRecordId: extId, fetchedAt: ports.nowIso(),
        fetchAttemptId: delivery.deliveryId, connectorVersion: this.manifest.version,
        rawEvidenceRef: rawRef,
      },
      confidence: Confidence.UNKNOWN,
      confidenceMethod: 'unmodeled-webhook-shape',
      payload: { event_type: eventType, raw_preserved: true },
      unmodeled: true,
    });
    return { deliveryId: delivery.deliveryId, accepted: true, observationsEmitted: 1 };
  }

  /* ---------------- internals ---------------- */

  private breakerOpen(): boolean {
    return this.currentVirtualMs < this.breakerOpenUntilVirtualMs;
  }
  private currentVirtualMs = 0;

  /** Virtual sleep that keeps the adapter's clock in sync with the harness. */
  private async vsleep(ms: number, ports: ConnectorPorts): Promise<void> {
    this.currentVirtualMs += ms;
    await ports.sleep(ms);
  }

  private takeBudget(): boolean {
    if (this.callsUsed >= this.manifest.rateBudget.callsPerWindow) return false;
    this.callsUsed++;
    return true;
  }

  private noteAttemptFailure(ports: ConnectorPorts): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= 3) {
      // Open the breaker for the break duration (virtual ms).
      this.breakerOpenUntilVirtualMs = this.currentVirtualMs + 30_000;
      ports.log('warn', 'circuit breaker opened', { consecutiveFailures: this.consecutiveFailures });
    }
  }

  private noteSuccess(): void {
    this.consecutiveFailures = 0;
    this.breakerOpenUntilVirtualMs = 0;
  }

  private async fetchWithRetry(
    url: string,
    request: ReadRequest,
    ports: ConnectorPorts,
    capability: string,
  ): Promise<{ status: number; headers: Record<string, string>; body: string; bytes: number; finalUrl: string; redirectHops: number; attemptsUsed: number }> {
    const maxAttempts = this.manifest.rateBudget.maxAttempts;
    let attemptsUsed = 0;
    let lastError: { failureCode: FailureCode; reason: string; outcomeUnknown?: boolean } | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      attemptsUsed = attempt;
      let raw;
      try {
        raw = await ports.fetchRaw({
          method: 'GET', url, tenantId: request.tenantId,
          connectionId: request.configRef, capability,
        });
      } catch (err) {
        const code = (err as { code?: string }).code;
        // Timeout / reset AFTER send: outcome unknown, never blind-retry the same write.
        // For idempotent GET reads, one bounded reconciliation pass is allowed.
        this.noteAttemptFailure(ports);
        lastError = {
          failureCode: code === 'ETIMEDOUT' ? FailureCode.TIMEOUT : FailureCode.TRANSIENT,
          reason: `network-fault:${code}`,
          outcomeUnknown: true,
        };
        break;
      }

      if (raw.status === 200 || raw.status === 304 || raw.status === 410) {
        this.noteSuccess();
        return { ...raw, attemptsUsed };
      }

      const retryAfterMs = parseRetryAfter(raw.headers);
      if (raw.status === 429 || raw.status === 408) {
        this.noteAttemptFailure(ports);
        lastError = { failureCode: FailureCode.RATE_LIMITED, reason: `http-${raw.status}` };
      } else if (raw.status === 401) {
        // Token refresh is the AuthBroker's job; the connector reports expiry and stops.
        throw { failureCode: FailureCode.AUTH_EXPIRED, reason: 'http-401' };
      } else if (raw.status === 403) {
        throw { failureCode: FailureCode.PERMISSION_DENIED, reason: 'http-403' };
      } else if (raw.status >= 500) {
        this.noteAttemptFailure(ports);
        lastError = { failureCode: FailureCode.TRANSIENT, reason: `http-${raw.status}` };
      } else {
        // Other 4xx are non-retryable.
        throw { failureCode: FailureCode.INVALID_PAYLOAD, reason: `http-${raw.status}-non-retryable` };
      }

      if (attempt < maxAttempts) {
        const backoff = Math.min(
          this.manifest.rateBudget.baseDelayMs * 2 ** (attempt - 1) + jitterMs(attempt),
          this.manifest.rateBudget.maxDelayMs,
        );
        const wait = retryAfterMs ?? backoff; // Honor provider Retry-After when present.
        await this.vsleep(wait, ports);
      }
    }
    // Propagate the attempt count so the caller records honest retry accounting.
    if (lastError) (lastError as { attemptsUsed?: number }).attemptsUsed = attemptsUsed;
    throw lastError ?? { failureCode: FailureCode.TRANSIENT, reason: 'exhausted' };
  }

  /** One bounded reconciliation pass after OUTCOME_UNKNOWN, same idempotency key. */
  private async reconcile(
    url: string, request: ReadRequest, ports: ConnectorPorts,
    stream: StreamDescriptor, fetchAttemptId: string, cursor: string | null,
  ): Promise<{ emitted: number; skipped: string[]; partial: boolean; newCursor: string | null }> {
    ports.log('info', 'reconciling OUTCOME_UNKNOWN with read-back', { url });
    const raw = await ports.fetchRaw({
      method: 'GET', url, tenantId: request.tenantId,
      connectionId: request.configRef, capability: 'read.' + stream.streamClass,
    });
    if (!raw.ok || raw.status === 304 || raw.status === 410) {
      return { emitted: 0, skipped: [], partial: false, newCursor: null };
    }
    const page = this.parsePage(raw.body);
    const rawRef = rawEvidenceRefFor(raw.body, sha256Hex);
    let emitted = 0;
    const skipped: string[] = [];
    let partial = false;
    for (const record of page.records) {
      const r = this.normalizeAndEmit(record, stream, request, ports, fetchAttemptId, rawRef, raw.finalUrl);
      if (r === 'emitted') emitted++;
      else { partial = true; skipped.push(r); }
    }
    void cursor;
    return { emitted, skipped, partial, newCursor: page.nextCursor };
  }

  private parsePage(body: string): Page {
    const parsed = JSON.parse(body) as {
      records?: Array<Record<string, unknown>>;
      next_cursor?: string | null;
    };
    if (!Array.isArray(parsed.records)) throw new Error('missing records array');
    return { records: parsed.records, nextCursor: parsed.next_cursor ?? null };
  }

  /**
   * Normalize one provider record. Picks DECLARED fields only — unknown
   * provider fields (where secret canaries hide) are never copied.
   */
  private normalizeAndEmit(
    record: Record<string, unknown>,
    stream: StreamDescriptor,
    request: ReadRequest,
    ports: ConnectorPorts,
    fetchAttemptId: string,
    rawRef: string,
    finalUrl: string,
  ): 'emitted' | string {
    void finalUrl;
    const extId = record.id;
    if (typeof extId !== 'string' || extId.length === 0) {
      return 'missing-external-id';
    }
    const version = typeof record.updated_at === 'string' ? record.updated_at : ports.nowIso();

    const payload: Record<string, unknown> = {};
    const truncatedFields: string[] = [];
    // Declared fields only. Anything else the provider sent is ignored here
    // (the verbatim raw payload is still hash-referenced for re-runs).
    for (const field of ['name', 'description', 'rating', 'review_text']) {
      const v = record[field];
      if (typeof v === 'string') {
        const s = sanitizeText(v);
        payload[field] = s.text;
        if (s.truncated) truncatedFields.push(field);
        if (field === 'name' && looksMixedScript(v)) {
          ports.log('warn', 'mixed-script business name flagged for review', { externalObjectId: extId });
        }
      } else if (typeof v === 'number' || typeof v === 'boolean') {
        // M14 coerce-then-quarantine: coerce scalar types to the declared shape.
        payload[field] = v;
      } else if (v !== undefined && v !== null) {
        // Uncoercible value for a declared field: quarantine the record, don't drop silently.
        ports.log('warn', 'uncoercible field value; record quarantined', { field, externalObjectId: extId });
        return `uncoercible-field:${field}`;
      }
    }
    // Coerce numeric-looking rating strings ("5" -> 5): deterministic, logged.
    if (typeof payload.rating === 'string' && /^\d+(\.\d+)?$/.test(payload.rating)) {
      payload.rating = Number(payload.rating);
    }

    const obs: Observation = {
      idempotencyKey: idempotencyKeyFor(this.manifest.connectorId, stream.streamId, extId, version),
      connectorId: this.manifest.connectorId,
      streamId: stream.streamId,
      tenantId: request.tenantId,
      principal: request.principal,
      externalObjectId: extId,
      externalTimestamp: typeof record.updated_at === 'string' ? record.updated_at : null,
      observedTimestamp: ports.nowIso(),
      provenance: {
        provider: this.manifest.provider,
        sourceRecordId: extId,
        fetchedAt: ports.nowIso(),
        fetchAttemptId,
        connectorVersion: this.manifest.version,
        rawEvidenceRef: rawRef,
      },
      confidence: stream.streamClass === 'reviews' ? Confidence.INFERRED : Confidence.DIRECT,
      confidenceMethod: stream.streamClass === 'reviews' ? 'review-factual-content-at-most-inferred' : undefined,
      payload,
      truncatedFields: truncatedFields.length > 0 ? truncatedFields : undefined,
    };
    ports.emitObservation(obs);
    return 'emitted';
  }

  private buildObservation(
    record: Record<string, unknown>,
    stream: StreamDescriptor,
    tenantId: string,
    principal: string,
    ports: ConnectorPorts,
    fetchAttemptId: string,
    rawRef: string,
  ): Observation | null {
    const extId = record.id;
    if (typeof extId !== 'string' || extId.length === 0) return null;
    const version = typeof record.updated_at === 'string' ? record.updated_at : ports.nowIso();
    const payload: Record<string, unknown> = {};
    for (const field of ['name', 'description', 'rating', 'review_text']) {
      const v = record[field];
      if (typeof v === 'string') payload[field] = sanitizeText(v).text;
      else if (typeof v === 'number' || typeof v === 'boolean') payload[field] = v;
    }
    return {
      idempotencyKey: idempotencyKeyFor(this.manifest.connectorId, stream.streamId, extId, version),
      connectorId: this.manifest.connectorId,
      streamId: stream.streamId,
      tenantId,
      principal,
      externalObjectId: extId,
      externalTimestamp: typeof record.updated_at === 'string' ? record.updated_at : null,
      observedTimestamp: ports.nowIso(),
      provenance: {
        provider: this.manifest.provider, sourceRecordId: extId, fetchedAt: ports.nowIso(),
        fetchAttemptId, connectorVersion: this.manifest.version, rawEvidenceRef: rawRef,
      },
      confidence: Confidence.INFERRED,
      confidenceMethod: 'review-factual-content-at-most-inferred',
      payload,
    };
  }
}

function parseRetryAfter(headers: Record<string, string>): number | null {
  const v = headers['retry-after'] ?? headers['Retry-After'];
  if (!v) return null;
  const secs = Number(v);
  if (Number.isFinite(secs)) return secs * 1000;
  const date = Date.parse(v);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return null;
}

/** Re-export for the kit runner. */
export { Harness };
