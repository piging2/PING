/**
 * FB-B — FacebookConnector: the official-Graph-API read adapter.
 *
 * Implements the lane-bcq ConnectorAdapter SPI. Authority map (what this
 * file does NOT own):
 * - event id/hash/sequence/persist/replay: the canonical event authority
 *   (phase0, still converging). This adapter emits observations only.
 * - failure vocabulary: lane K (FailureCode). Never invented here.
 * - secrets: lane L's broker. The adapter holds a capability HANDLE from
 *   ports.getSecretHandle() and passes it as connectionId; the raw token is
 *   resolved ONLY inside the trusted seam (production: AuthBroker.proxyCall;
 *   test: the harness fetchRaw, which is that seam's stand-in). The adapter
 *   never sees, logs, or emits a credential value.
 * - the connect flow (Nolan clicks): lane-conn16 OAUTH-CONNECT-FLOW.md +
 *   connector-queue/facebook-page.md. This adapter consumes the resulting
 *   connection, never creates it.
 * - canonical identity: contract §2.5. Page/post/comment ids are link
 *   records, never PING business object ids.
 *
 * Read-only by construction: this file contains no write path, no
 * pause/hold/freeze semantics on any engagement surface, and the manifest
 * declares no `write` capability. (Standing law 2026-10-02 ~18:21: social
 * automations never stop on directive grounds; a read API has no stop
 * switch to begin with.)
 */
import {
  CheckOutcome,
  ConnectorAdapter,
  ReadOutcome,
} from '../../../ping-build-program/lane-bcq/kit/adapter';
import {
  ConnectorPorts,
  Harness,
  idempotencyKeyFor,
  sha256Hex,
} from '../../../ping-build-program/lane-bcq/kit/harness';
import {
  MAX_RECORD_BYTES,
  MAX_RESPONSE_BYTES,
  looksMixedScript,
  sanitizeText,
} from '../../../ping-build-program/lane-bcq/kit/sanitize';
import {
  Confidence,
  CursorState,
  FailureCode,
  FetchState,
  Observation,
  ReadRequest,
  StreamDescriptor,
} from '../../../ping-build-program/lane-bcq/kit/types';
import {
  COMMENTS_EDGE,
  EdgeSpec,
  FEED_EDGE,
  PAGE_EDGE,
  backoffDelayMs,
  classifyGraphFailure,
  graphBaseUrl,
  retryAfterMs,
} from './graph-api';
import { CONNECTOR_ID, CONNECTOR_VERSION, facebookManifest } from './manifest';
import {
  buildSourceEnvelope,
  provenanceFor,
  sourceVersionOf,
} from './envelope';

/** Connector config, resolved by the host. configRef carries this as JSON. */
export interface FacebookConfig {
  /** The connected Page id (source_account). */
  page_id: string;
  /** Graph API version override; defaults to the pinned version. */
  version?: string;
  /**
   * Named party that granted access (Nolan's bootstrap identity). Resolved
   * from config/env by the host; NEVER hardcoded in this lane.
   */
  principal: string;
}

function parseConfig(configRef: string): FacebookConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(configRef);
  } catch {
    throw new Error('facebook config: configRef is not valid JSON');
  }
  const c = parsed as Record<string, unknown>;
  if (typeof c['page_id'] !== 'string' || c['page_id'].length === 0) {
    throw new Error('facebook config: page_id required');
  }
  if (typeof c['principal'] !== 'string' || c['principal'].length === 0) {
    throw new Error('facebook config: principal required (named party, never fabricated)');
  }
  return {
    page_id: c['page_id'],
    version: typeof c['version'] === 'string' ? c['version'] : undefined,
    principal: c['principal'],
  };
}

interface ParsedEdge<T> {
  records: T[];
  after: string | null;
  hasNext: boolean;
}

const MAX_PAGES_PER_READ = 10;

/**
 * Declared read fields per edge (contract §1.4 data shape). The Graph API
 * `fields=` parameter already limits the wire; this allow-list is the
 * second gate at the ingestion boundary.
 */
function keepFieldsFor(edge: EdgeSpec): string[] {
  switch (edge.name) {
    case 'page':
      return ['id', 'name', 'about', 'category_list', 'phone', 'website', 'single_line_address', 'location', 'hours', 'verification_status', 'link'];
    case 'feed':
      return ['id', 'message', 'story', 'created_time', 'updated_time', 'permalink_url', 'from', 'type', 'status_type', 'shares', 'comments', 'likes'];
    case 'comments':
      return ['id', 'message', 'created_time', 'updated_time', 'from', 'like_count', 'comment_count', 'parent', 'is_hidden', 'message_tags'];
    default:
      return ['id'];
  }
}

export class FacebookConnector implements ConnectorAdapter {
  readonly manifest = facebookManifest();
  /** Client-side token bucket: calls used in the current window. */
  private callsUsed = 0;
  /** Circuit breaker: virtual-ms clock (advanced by sleep()). */
  private virtualMs = 0;
  private consecutiveFailures = 0;
  private breakerOpenUntil = 0;

  private async sleepTracked(ports: ConnectorPorts, ms: number): Promise<void> {
    this.virtualMs += ms;
    await ports.sleep(ms);
  }

  private checkBudget(): boolean {
    return this.callsUsed < this.manifest.rateBudget.callsPerWindow;
  }

  private checkBreaker(): boolean {
    return this.virtualMs < this.breakerOpenUntil;
  }

  private noteFailure(): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= 5) {
      this.breakerOpenUntil = this.virtualMs + 60_000;
      this.consecutiveFailures = 0;
    }
  }

  private noteSuccess(): void {
    this.consecutiveFailures = 0;
  }

  /**
   * fetchRaw is the trusted-seam stand-in: the capability handle travels as
   * connectionId, the seam injects the credential server-side. The adapter
   * never sees the token. Bounded retry for retryable dispositions; 5xx and
   * network faults end as OUTCOME_UNKNOWN (contract §5: reconcile by
   * re-read, never blind-retry; re-reads are safe because observations
   * dedupe on idempotency keys).
   */
  private async fetchWithPolicy(
    ports: ConnectorPorts,
    input: {
      url: string;
      tenantId: string;
      connectionId: string;
      capability: string;
    },
  ): Promise<
    | { outcome: 'ok'; status: number; headers: Record<string, string>; body: string; attemptsUsed: number }
    | { outcome: 'failed'; failureCode: FailureCode; reason: string; attemptsUsed: number }
    | { outcome: 'unknown'; reason: string; attemptsUsed: number }
  > {
    let attemptsUsed = 0;
    for (let attempt = 1; attempt <= 3; attempt++) {
      attemptsUsed = attempt;
      if (this.checkBreaker()) {
        return {
          outcome: 'failed',
          failureCode: FailureCode.TRANSIENT,
          reason: 'circuit-breaker-open: backing off from sustained failures',
          attemptsUsed,
        };
      }
      if (!this.checkBudget()) {
        return {
          outcome: 'failed',
          failureCode: FailureCode.RATE_LIMITED,
          reason: 'client-side rate budget exhausted for this window',
          attemptsUsed,
        };
      }
      let res: Awaited<ReturnType<ConnectorPorts['fetchRaw']>>;
      try {
        this.callsUsed += 1;
        res = await ports.fetchRaw({ method: 'GET', ...input });
      } catch (err) {
        // Network fault: the request may have landed provider-side.
        // OUTCOME_UNKNOWN -> reconcile by bounded re-read, never blind retry.
        const code = (err as { code?: string }).code ?? 'unknown';
        this.noteFailure();
        return {
          outcome: 'unknown',
          reason: `network-fault (${code}): no definitive response; reconcile by re-read with identical idempotency keys`,
          attemptsUsed,
        };
      }
      if (res.status >= 200 && res.status < 300) {
        if (res.bytes > MAX_RESPONSE_BYTES) {
          this.noteFailure();
          return {
            outcome: 'failed',
            failureCode: FailureCode.INVALID_PAYLOAD,
            reason: `oversized-response: ${res.bytes} bytes exceeds ${MAX_RESPONSE_BYTES}; rejected with recorded attempt, not partially ingested`,
            attemptsUsed,
          };
        }
        this.noteSuccess();
        return { outcome: 'ok', status: res.status, headers: res.headers, body: res.body, attemptsUsed };
      }
      const classified = classifyGraphFailure(res.status, res.body);
      if (classified.disposition === 'retry' && attempt < 3) {
        const wait = backoffDelayMs(attempt);
        ports.log('warn', `retryable ${classified.failureCode}; backing off`, {
          attempt,
          waitMs: wait,
          reason: classified.reason,
        });
        await this.sleepTracked(ports, wait);
        continue;
      }
      if (classified.disposition === 'retry') {
        // Bounded retries exhausted on an ambiguous 5xx: OUTCOME_UNKNOWN.
        this.noteFailure();
        return {
          outcome: 'unknown',
          reason: `${classified.reason}; retries exhausted; reconcile by re-read with identical idempotency keys`,
          attemptsUsed,
        };
      }
      this.noteFailure();
      if (classified.failureCode === FailureCode.RATE_LIMITED) {
        // Honor Retry-After (or the declared backoff), then report FAILED.
        // The attempt is over; the NEXT dispatch may proceed.
        const wait = retryAfterMs(res.headers) ?? backoffDelayMs(1);
        ports.log('warn', 'rate limited; honoring provider backoff', { waitMs: wait });
        await this.sleepTracked(ports, wait);
      }
      return {
        outcome: 'failed',
        failureCode: classified.failureCode,
        reason: classified.reason,
        attemptsUsed,
      };
    }
    // Unreachable: the loop always returns. Kept for exhaustiveness.
    return { outcome: 'unknown', reason: 'unreachable', attemptsUsed };
  }

  private parseEdge<T extends Record<string, unknown>>(
    body: string,
  ): ParsedEdge<T> | { malformed: true } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return { malformed: true };
    }
    const p = parsed as { data?: unknown; paging?: { cursors?: { after?: string }; next?: string } };
    if (!Array.isArray(p.data)) return { malformed: true };
    return {
      records: p.data as T[],
      after: p.paging?.cursors?.after ?? null,
      hasNext: typeof p.paging?.next === 'string',
    };
  }

  private processRecord(
    ports: ConnectorPorts,
    opts: {
      record: Record<string, unknown>;
      edge: EdgeSpec;
      streamId: string;
      tenantId: string;
      config: FacebookConfig;
      fetchAttemptId: string;
      observedAt: string;
      cursor: CursorState | null;
    },
  ): { emitted: boolean; skippedReason?: string } {
    const { record, edge } = opts;
    const id = record['id'];
    if (typeof id !== 'string' || id.length === 0) {
      return { emitted: false, skippedReason: 'missing id' };
    }
    const rawJson = JSON.stringify(record);
    if (Buffer.byteLength(rawJson, 'utf8') > MAX_RECORD_BYTES) {
      return { emitted: false, skippedReason: 'oversized record' };
    }
    // Declared-field allow-list (contract §1.4): the connector reads only
    // the fields its manifest/data-shape declares. Undeclared provider
    // fields (debug blobs, embedded tokens, future additions) are NEVER
    // copied into observations; they survive only inside the raw payload
    // hash for replay. This is the secret-canary boundary (kit check E5).
    const sanitized: Record<string, unknown> = {};
    for (const f of keepFieldsFor(edge)) {
      if (f in record) sanitized[f] = record[f];
    }
    const truncatedFields: string[] = [];
    const flags: string[] = [];
    for (const field of ['message', 'about', 'name', 'story']) {
      const v = sanitized[field];
      if (typeof v === 'string' && v.length > 0) {
        const s = sanitizeText(v);
        sanitized[field] = s.text;
        if (s.truncated) truncatedFields.push(field);
      }
    }
    const name = sanitized['name'];
    if (typeof name === 'string' && looksMixedScript(name)) {
      flags.push('mixed-script-name: flagged for review (contract §3)');
      ports.log('warn', 'mixed-script name flagged for review', { recordId: id });
    }

    const sourceVersion = sourceVersionOf(record);
    const ingestedAt = ports.nowIso();
    const envelope = buildSourceEnvelope({
      sourceAccount: opts.config.page_id,
      sourceObjectType: edge.objectType,
      sourceObjectId: id,
      sourceVersion,
      observedAt: opts.observedAt,
      ingestedAt,
      principal: opts.config.principal,
      rawRecordJson: rawJson,
      cursor: opts.cursor,
    });
    const created = record['created_time'];
    // Third-party comment text is hostile input: its factual content is at
    // most INFERRED (contract §3). Page/post metadata is provider-asserted.
    const confidence =
      edge.objectType === 'comment'
        ? Confidence.INFERRED
        : Confidence.DIRECT;
    const observation: Observation = {
      idempotencyKey: idempotencyKeyFor(CONNECTOR_ID, opts.streamId, id, sourceVersion),
      connectorId: CONNECTOR_ID,
      streamId: opts.streamId,
      tenantId: opts.tenantId,
      principal: opts.config.principal,
      externalObjectId: id,
      externalTimestamp: typeof created === 'string' ? created : null,
      observedTimestamp: opts.observedAt,
      provenance: provenanceFor(envelope, opts.fetchAttemptId, CONNECTOR_VERSION),
      confidence,
      confidenceMethod: edge.objectType === 'comment' ? 'fb-third-party-text' : undefined,
      payload: { source_envelope: envelope, record: sanitized, flags },
      ...(truncatedFields.length > 0 ? { truncatedFields } : {}),
    };
    ports.emitObservation(observation);
    return { emitted: true };
  }

  /* ---------------- check ---------------- */

  async check(configRef: string, ports: ConnectorPorts): Promise<CheckOutcome> {
    const checkedAt = ports.nowIso();
    let config: FacebookConfig;
    try {
      config = parseConfig(configRef);
    } catch (err) {
      return {
        status: 'FAILED',
        checkedAt,
        message: (err as Error).message,
        errorClass: 'user_error',
        verifiedObjects: [],
      };
    }
    const handle = ports.getSecretHandle('facebook-oauth2-page-token');
    const res = await this.fetchWithPolicy(ports, {
      url: PAGE_EDGE.urlFor(graphBaseUrl(config.version), config.page_id, { limit: 1 }),
      tenantId: '__check__',
      connectionId: handle.handleId,
      capability: PAGE_EDGE.capability,
    });
    if (res.outcome === 'ok') {
      return {
        status: 'SUCCEEDED',
        checkedAt,
        message: 'facebook page reachable; declared read surface verified',
        verifiedObjects: ['facebook.page'],
      };
    }
    const isAuth =
      res.outcome === 'failed' &&
      (res.failureCode === FailureCode.AUTH_EXPIRED ||
        res.failureCode === FailureCode.PERMISSION_DENIED);
    return {
      status: 'FAILED',
      checkedAt,
      message: res.reason,
      errorClass: isAuth ? 'user_error' : 'connector_error',
      verifiedObjects: [],
    };
  }

  /* ---------------- discover ---------------- */

  async discover(configRef: string, ports: ConnectorPorts): Promise<StreamDescriptor[]> {
    const chk = await this.check(configRef, ports);
    if (chk.status !== 'SUCCEEDED') {
      throw new Error(`discover: check failed: ${chk.message}`);
    }
    // Deterministic ordering (M2): alphabetical by stream_id.
    return [...this.manifest.streams].sort((a, b) => a.streamId.localeCompare(b.streamId));
  }

  /* ---------------- read ---------------- */

  /**
   * Resolve the prior cursor for a stream: request.state (the governor's
   * last checkpoint, namespaced per stream_id as a JSON string) wins;
   * the durable cursor store is the fallback.
   */
  private resolvePrior(
    request: ReadRequest,
    ports: ConnectorPorts,
    streamId: string,
  ): CursorState | null {
    const fromState = request.state[streamId];
    if (typeof fromState === 'string' && fromState.length > 0) {
      try {
        return JSON.parse(fromState) as CursorState;
      } catch {
        // Corrupt state is fail-closed: fall through to the store, never guess.
      }
    }
    return ports.cursorStore.load(request.tenantId, streamId);
  }

  /** Persist the per-stream cursor: JSON-namespaced in newCursor + durable store. */
  private saveCursor(
    ports: ConnectorPorts,
    request: ReadRequest,
    streamId: string,
    newCursor: CursorState,
    state: CursorState,
  ): void {
    ports.cursorStore.save(request.tenantId, streamId, state);
    newCursor[streamId] = JSON.stringify(state);
  }

  async read(request: ReadRequest, ports: ConnectorPorts): Promise<ReadOutcome> {
    const fetchAttemptId = `fb-${sha256Hex(request.idempotencyKey).slice(0, 16)}`;
    const startedAt = ports.nowIso();
    let config: FacebookConfig;
    try {
      config = parseConfig(request.configRef);
    } catch (err) {
      return this.finishAttempt(ports, {
        fetchAttemptId,
        request,
        startedAt,
        terminalState: FetchState.FAILED,
        failureCode: FailureCode.PERMANENT,
        reason: (err as Error).message,
        recordsEmitted: 0,
        recordsSkipped: [],
        partial: false,
        newCursor: request.state,
        attemptsUsed: 0,
      });
    }
    const declared = new Set(this.manifest.streams.map((s) => s.streamId));
    for (const sid of request.streamIds) {
      if (!declared.has(sid)) {
        // M2: reads against undeclared streams are protocol violations.
        return this.finishAttempt(ports, {
          fetchAttemptId,
          request,
          startedAt,
          terminalState: FetchState.FAILED,
          failureCode: FailureCode.PERMANENT,
          reason: `protocol violation: stream not declared in manifest: ${sid}`,
          recordsEmitted: 0,
          recordsSkipped: [],
          partial: false,
          newCursor: request.state,
          attemptsUsed: 0,
        });
      }
    }

    const handle = ports.getSecretHandle('facebook-oauth2-page-token');
    const connectionId = handle.handleId;
    const base = graphBaseUrl(config.version);
    let recordsEmitted = 0;
    const recordsSkipped: string[] = [];
    let partial = false;
    let attemptsUsed = 0;
    const newCursor: CursorState = { ...request.state };

    for (const streamId of request.streamIds) {
      const outcome = await this.readStream(ports, {
        streamId,
        base,
        config,
        request,
        connectionId,
        fetchAttemptId,
        newCursor,
      });
      recordsEmitted += outcome.recordsEmitted;
      recordsSkipped.push(...outcome.recordsSkipped);
      if (outcome.partial) partial = true;
      attemptsUsed = Math.max(attemptsUsed, outcome.attemptsUsed);
      if (outcome.terminalState !== FetchState.SUCCEEDED) {
        // Stop at the first non-success stream; its cursor was NOT advanced.
        return this.finishAttempt(ports, {
          fetchAttemptId,
          request,
          startedAt,
          terminalState: outcome.terminalState,
          failureCode: outcome.failureCode,
          reason: outcome.reason,
          recordsEmitted,
          recordsSkipped,
          partial: true,
          newCursor,
          attemptsUsed,
        });
      }
    }
    return this.finishAttempt(ports, {
      fetchAttemptId,
      request,
      startedAt,
      terminalState: FetchState.SUCCEEDED,
      recordsEmitted,
      recordsSkipped,
      partial,
      newCursor,
      attemptsUsed,
    });
  }

  private async readStream(
    ports: ConnectorPorts,
    opts: {
      streamId: string;
      base: string;
      config: FacebookConfig;
      request: ReadRequest;
      connectionId: string;
      fetchAttemptId: string;
      newCursor: CursorState;
    },
  ): Promise<{
    terminalState: FetchState;
    failureCode?: FailureCode;
    reason?: string;
    recordsEmitted: number;
    recordsSkipped: string[];
    partial: boolean;
    attemptsUsed: number;
  }> {
    const { streamId, base, config, request, connectionId, fetchAttemptId, newCursor } = opts;
    const prior = this.resolvePrior(request, ports, streamId);
    const observedAt = ports.nowIso();

    if (streamId === 'facebook.page') {
      const res = await this.fetchWithPolicy(ports, {
        url: PAGE_EDGE.urlFor(base, config.page_id, { limit: 1 }),
        tenantId: request.tenantId,
        connectionId,
        capability: PAGE_EDGE.capability,
      });
      if (res.outcome !== 'ok') {
        return {
          terminalState: res.outcome === 'unknown' ? FetchState.OUTCOME_UNKNOWN : FetchState.FAILED,
          failureCode: res.outcome === 'failed' ? res.failureCode : undefined,
          reason: res.reason,
          recordsEmitted: 0,
          recordsSkipped: [],
          partial: false,
          attemptsUsed: res.attemptsUsed,
        };
      }
      let record: Record<string, unknown>;
      try {
        record = JSON.parse(res.body) as Record<string, unknown>;
      } catch {
        return {
          terminalState: FetchState.FAILED,
          failureCode: FailureCode.INVALID_PAYLOAD,
          reason: 'malformed-response: page object did not parse',
          recordsEmitted: 0,
          recordsSkipped: [],
          partial: false,
          attemptsUsed: res.attemptsUsed,
        };
      }
      const r = this.processRecord(ports, {
        record,
        edge: PAGE_EDGE,
        streamId,
        tenantId: request.tenantId,
        config,
        fetchAttemptId,
        observedAt,
        cursor: null,
      });
      if (r.emitted) {
        this.saveCursor(ports, request, streamId, newCursor, { full_refresh_at: observedAt });
        return {
          terminalState: FetchState.SUCCEEDED,
          recordsEmitted: 1,
          recordsSkipped: [],
          partial: false,
          attemptsUsed: res.attemptsUsed,
        };
      }
      return {
        terminalState: FetchState.FAILED,
        failureCode: FailureCode.INVALID_PAYLOAD,
        reason: `record skipped: ${r.skippedReason}`,
        recordsEmitted: 0,
        recordsSkipped: [`page:${r.skippedReason}`],
        partial: true,
        attemptsUsed: res.attemptsUsed,
      };
    }

    if (streamId === 'facebook.page-posts') {
      return this.readPostStream(ports, {
        base,
        config,
        request,
        connectionId,
        fetchAttemptId,
        newCursor,
        prior,
        observedAt,
      });
    }

    if (streamId === 'facebook.post-comments') {
      return this.readCommentStream(ports, {
        base,
        config,
        request,
        connectionId,
        fetchAttemptId,
        newCursor,
        observedAt,
      });
    }

    return {
      terminalState: FetchState.FAILED,
      failureCode: FailureCode.PERMANENT,
      reason: `unhandled stream: ${streamId}`,
      recordsEmitted: 0,
      recordsSkipped: [],
      partial: false,
      attemptsUsed: 0,
    };
  }

  /**
   * Page -> posts. Cursor semantics: the provider's `after` cursor is echoed
   * VERBATIM into the checkpoint, and the checkpoint advances ONLY past
   * fully processed pages. On OUTCOME_UNKNOWN mid-pagination the cursor is
   * left at the last fully processed page; re-read replays idempotently.
   */
  private async readPostStream(
    ports: ConnectorPorts,
    opts: {
      base: string;
      config: FacebookConfig;
      request: ReadRequest;
      connectionId: string;
      fetchAttemptId: string;
      newCursor: CursorState;
      prior: CursorState | null;
      observedAt: string;
    },
  ): Promise<{
    terminalState: FetchState;
    failureCode?: FailureCode;
    reason?: string;
    recordsEmitted: number;
    recordsSkipped: string[];
    partial: boolean;
    attemptsUsed: number;
  }> {
    const streamId = 'facebook.page-posts';
    const { base, config, request, connectionId, fetchAttemptId, newCursor, observedAt } = opts;
    const prior = opts.prior;
    const recordsSkipped: string[] = [];
    let recordsEmitted = 0;
    let attemptsUsed = 0;
    let after: string | undefined = prior?.['after'];
    const since = prior?.['since'];
    let partial = false;

    for (let page = 0; page < MAX_PAGES_PER_READ; page++) {
      const url = FEED_EDGE.urlFor(base, config.page_id, {
        limit: 50,
        after,
        ...(since ? { since } : {}),
      });
      const res = await this.fetchWithPolicy(ports, {
        url,
        tenantId: request.tenantId,
        connectionId,
        capability: FEED_EDGE.capability,
      });
      attemptsUsed = Math.max(attemptsUsed, res.attemptsUsed);
      if (res.outcome !== 'ok') {
        return {
          terminalState: res.outcome === 'unknown' ? FetchState.OUTCOME_UNKNOWN : FetchState.FAILED,
          failureCode: res.outcome === 'failed' ? res.failureCode : undefined,
          reason: res.reason,
          recordsEmitted,
          recordsSkipped,
          partial: true,
          attemptsUsed,
        };
      }
      const parsed = this.parseEdge<Record<string, unknown>>(res.body);
      if ('malformed' in parsed) {
        return {
          terminalState: FetchState.FAILED,
          failureCode: FailureCode.INVALID_PAYLOAD,
          reason: 'malformed-response: feed edge did not parse',
          recordsEmitted,
          recordsSkipped,
          partial: true,
          attemptsUsed,
        };
      }
      // Checkpoint state for THIS page: verbatim cursor echo.
      const pageCursor: CursorState = after ? { after } : {};
      if (since) pageCursor['since'] = since;
      for (const record of parsed.records) {
        const r = this.processRecord(ports, {
          record,
          edge: FEED_EDGE,
          streamId,
          tenantId: request.tenantId,
          config,
          fetchAttemptId,
          observedAt,
          cursor: pageCursor,
        });
        if (r.emitted) recordsEmitted++;
        else {
          recordsSkipped.push(`post:${r.skippedReason}`);
          partial = true;
        }
      }
      // Fully processed page: NOW the checkpoint advances.
      if (parsed.after) {
        after = parsed.after;
        const state: CursorState = { after: parsed.after };
        if (since) state['since'] = since;
        this.saveCursor(ports, request, streamId, newCursor, state);
      }
      if (!parsed.hasNext) break;
    }
    return {
      terminalState: FetchState.SUCCEEDED,
      recordsEmitted,
      recordsSkipped,
      partial,
      attemptsUsed,
    };
  }

  /**
   * Posts -> comments (one reply level deep). The prospect-reply surface.
   * Comment cursors are per-post (opaque map JSON-encoded into the cursor
   * state, values stay strings). Per-post checkpoints advance only past
   * fully processed posts.
   */
  private async readCommentStream(
    ports: ConnectorPorts,
    opts: {
      base: string;
      config: FacebookConfig;
      request: ReadRequest;
      connectionId: string;
      fetchAttemptId: string;
      newCursor: CursorState;
      observedAt: string;
    },
  ): Promise<{
    terminalState: FetchState;
    failureCode?: FailureCode;
    reason?: string;
    recordsEmitted: number;
    recordsSkipped: string[];
    partial: boolean;
    attemptsUsed: number;
  }> {
    const streamId = 'facebook.post-comments';
    const { base, config, request, connectionId, fetchAttemptId, newCursor, observedAt } = opts;
    const prior = this.resolvePrior(request, ports, streamId);
    const since = prior?.['since'];
    let commentAfterByPost: Record<string, string> = {};
    try {
      if (prior?.['comments_after']) {
        commentAfterByPost = JSON.parse(prior['comments_after']) as Record<string, string>;
      }
    } catch {
      commentAfterByPost = {};
    }
    const recordsSkipped: string[] = [];
    let recordsEmitted = 0;
    let attemptsUsed = 0;
    let partial = false;

    // Candidate posts: recent feed window (bounded; watermark from prior run).
    const postIds: string[] = [];
    {
      let after: string | undefined = prior?.['posts_after'];
      for (let page = 0; page < 2; page++) {
        const res = await this.fetchWithPolicy(ports, {
          url: FEED_EDGE.urlFor(base, config.page_id, {
            limit: 25,
            after,
            ...(since ? { since } : {}),
          }),
          tenantId: request.tenantId,
          connectionId,
          capability: FEED_EDGE.capability,
        });
        attemptsUsed = Math.max(attemptsUsed, res.attemptsUsed);
        if (res.outcome !== 'ok') {
          return {
            terminalState: res.outcome === 'unknown' ? FetchState.OUTCOME_UNKNOWN : FetchState.FAILED,
            failureCode: res.outcome === 'failed' ? res.failureCode : undefined,
            reason: res.reason,
            recordsEmitted,
            recordsSkipped,
            partial: true,
            attemptsUsed,
          };
        }
        const parsed = this.parseEdge<Record<string, unknown>>(res.body);
        if ('malformed' in parsed) {
          return {
            terminalState: FetchState.FAILED,
            failureCode: FailureCode.INVALID_PAYLOAD,
            reason: 'malformed-response: feed edge did not parse',
            recordsEmitted,
            recordsSkipped,
            partial: true,
            attemptsUsed,
          };
        }
        for (const p of parsed.records) {
          if (typeof p['id'] === 'string') postIds.push(p['id']);
        }
        if (parsed.after) {
          after = parsed.after;
          const st: CursorState = { posts_after: parsed.after };
          if (since) st['since'] = since;
          if (commentAfterByPost && Object.keys(commentAfterByPost).length > 0) {
            st['comments_after'] = JSON.stringify(commentAfterByPost);
          }
          this.saveCursor(ports, request, streamId, newCursor, st);
        }
        if (!parsed.hasNext) break;
      }
    }

    for (const postId of postIds) {
      const after = commentAfterByPost[postId];
      const res = await this.fetchWithPolicy(ports, {
        url: COMMENTS_EDGE.urlFor(base, postId, {
          limit: 100,
          after,
          ...(since ? { since } : {}),
        }),
        tenantId: request.tenantId,
        connectionId,
        capability: COMMENTS_EDGE.capability,
      });
      attemptsUsed = Math.max(attemptsUsed, res.attemptsUsed);
      if (res.outcome !== 'ok') {
        return {
          terminalState: res.outcome === 'unknown' ? FetchState.OUTCOME_UNKNOWN : FetchState.FAILED,
          failureCode: res.outcome === 'failed' ? res.failureCode : undefined,
          reason: res.reason,
          recordsEmitted,
          recordsSkipped,
          partial: true,
          attemptsUsed,
        };
      }
      const parsed = this.parseEdge<Record<string, unknown>>(res.body);
      if ('malformed' in parsed) {
        return {
          terminalState: FetchState.FAILED,
          failureCode: FailureCode.INVALID_PAYLOAD,
          reason: 'malformed-response: comments edge did not parse',
          recordsEmitted,
          recordsSkipped,
          partial: true,
          attemptsUsed,
        };
      }
      const pageCursor: CursorState = { post_id: postId };
      if (after) pageCursor['after'] = after;
      for (const record of parsed.records) {
        const r = this.processRecord(ports, {
          record,
          edge: COMMENTS_EDGE,
          streamId,
          tenantId: request.tenantId,
          config,
          fetchAttemptId,
          observedAt,
          cursor: pageCursor,
        });
        if (r.emitted) {
          recordsEmitted++;
          // One reply level: fetch replies for comments that have them.
          const cc = record['comment_count'];
          const cid = record['id'];
          if (typeof cc === 'number' && cc > 0 && typeof cid === 'string') {
            const rep = await this.readReplies(ports, {
              base,
              config,
              request,
              connectionId,
              fetchAttemptId,
              observedAt,
              commentId: cid,
              postId,
            });
            recordsEmitted += rep.recordsEmitted;
            recordsSkipped.push(...rep.recordsSkipped);
            if (rep.partial) partial = true;
            attemptsUsed = Math.max(attemptsUsed, rep.attemptsUsed);
          }
        } else {
          recordsSkipped.push(`comment:${r.skippedReason}`);
          partial = true;
        }
      }
      // Fully processed post: advance its comment cursor verbatim.
      if (parsed.after) {
        commentAfterByPost[postId] = parsed.after;
        const st: CursorState = { comments_after: JSON.stringify(commentAfterByPost) };
        try {
          const cur = newCursor[streamId] ? (JSON.parse(newCursor[streamId]) as CursorState) : {};
          if (cur['posts_after']) st['posts_after'] = cur['posts_after'];
        } catch {
          // keep comments_after only
        }
        if (since) st['since'] = since;
        this.saveCursor(ports, request, streamId, newCursor, st);
      }
    }
    return {
      terminalState: FetchState.SUCCEEDED,
      recordsEmitted,
      recordsSkipped,
      partial,
      attemptsUsed,
    };
  }

  private async readReplies(
    ports: ConnectorPorts,
    opts: {
      base: string;
      config: FacebookConfig;
      request: ReadRequest;
      connectionId: string;
      fetchAttemptId: string;
      observedAt: string;
      commentId: string;
      postId: string;
    },
  ): Promise<{ recordsEmitted: number; recordsSkipped: string[]; partial: boolean; attemptsUsed: number }> {
    const streamId = 'facebook.post-comments';
    const res = await this.fetchWithPolicy(ports, {
      url: COMMENTS_EDGE.urlFor(opts.base, opts.commentId, { limit: 25 }),
      tenantId: opts.request.tenantId,
      connectionId: opts.connectionId,
      capability: COMMENTS_EDGE.capability,
    });
    if (res.outcome !== 'ok') {
      return {
        recordsEmitted: 0,
        recordsSkipped: [`replies(${opts.commentId}):${res.reason.slice(0, 80)}`],
        partial: true,
        attemptsUsed: res.attemptsUsed,
      };
    }
    const parsed = this.parseEdge<Record<string, unknown>>(res.body);
    if ('malformed' in parsed) {
      return {
        recordsEmitted: 0,
        recordsSkipped: [`replies(${opts.commentId}):malformed`],
        partial: true,
        attemptsUsed: res.attemptsUsed,
      };
    }
    let recordsEmitted = 0;
    const recordsSkipped: string[] = [];
    for (const record of parsed.records) {
      const r = this.processRecord(ports, {
        record,
        edge: COMMENTS_EDGE,
        streamId,
        tenantId: opts.request.tenantId,
        config: opts.config,
        fetchAttemptId: opts.fetchAttemptId,
        observedAt: opts.observedAt,
        cursor: { post_id: opts.postId, parent_comment_id: opts.commentId },
      });
      if (r.emitted) recordsEmitted++;
      else {
        recordsSkipped.push(`reply:${r.skippedReason}`);
      }
    }
    return {
      recordsEmitted,
      recordsSkipped,
      partial: recordsSkipped.length > 0,
      attemptsUsed: res.attemptsUsed,
    };
  }

  private finishAttempt(
    ports: ConnectorPorts,
    outcome: ReadOutcome & {
      request: ReadRequest;
      startedAt: string;
      attemptsUsed: number;
    },
  ): ReadOutcome {
    ports.recordFetchAttempt({
      fetchAttemptId: outcome.fetchAttemptId,
      connectorId: CONNECTOR_ID,
      streamId: outcome.request.streamIds.join(','),
      tenantId: outcome.request.tenantId,
      state: outcome.terminalState,
      failureCode: outcome.failureCode,
      reason: outcome.reason,
      attemptsUsed: outcome.attemptsUsed,
      partial: outcome.partial || undefined,
      missingFields: outcome.recordsSkipped.length > 0 ? outcome.recordsSkipped : undefined,
      startedAt: outcome.startedAt,
      finishedAt: ports.nowIso(),
    });
    const { request: _req, startedAt: _s, attemptsUsed: _a, ...rest } = outcome;
    return rest;
  }
}

/** Re-exported for tests that want the harness type without a kit import. */
export { Harness };
