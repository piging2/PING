/**
 * LANE BCQ — Contract test kit: harness.
 *
 * The harness is the controlled universe a connector under test runs in.
 * It provides:
 * - a SCRIPTED fake provider (no network): scripted responses per scenario
 *   including duplicates, poison records, oversized payloads, 429/5xx/auth
 *   failures, cursor invalidation, redirect chains;
 * - an in-memory cursor store (restart = new adapter, same store);
 * - a knowledge ledger that dedupes on idempotency key (the canonical-knowledge
 *   stand-in: the kit asserts ledger size, never real canonical state);
 * - an observation/event sink plus a log sink, both scanned for secret canaries;
 * - a virtual clock (no real sleeping; backoff is proven by recorded delays).
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import {
  ConnectorManifest,
  CursorState,
  FetchAttemptRecord,
  Observation,
  SecretHandle,
  WebhookDelivery,
} from './types';

export function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/** Idempotency key rule — the single dedupe identity for canonical knowledge. */
export function idempotencyKeyFor(
  connectorId: string,
  streamId: string,
  externalObjectId: string,
  externalRecordVersion: string,
): string {
  return sha256Hex([connectorId, streamId, externalObjectId, externalRecordVersion].join('|'));
}

/* ------------------------------------------------------------------ */
/* Scripted fake provider                                              */
/* ------------------------------------------------------------------ */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ScriptedResponse {
  status: number;
  headers?: Record<string, string>;
  /** Raw body bytes as the provider would send them. */
  body?: string;
  /** Simulated network behavior instead of an HTTP response. */
  networkFault?: 'timeout' | 'reset';
  /** Redirect chain: each hop is validated against policy by the adapter. */
  redirects?: string[];
  /** Override the final URL (lets tests simulate hostile redirects). */
  finalUrl?: string;
}

export interface FetchCall {
  seq: number;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: string;
  tenantId: string;
  connectionId: string;
  /** Declared capability the adapter claims this call exercises. */
  capability: string;
  /** Virtual ms the adapter waited (backoff) before this call. */
  waitedMs: number;
  atVirtualMs: number;
}

export interface RawFetchResult {
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  body: string;
  bytes: number;
  finalUrl: string;
  redirectHops: number;
}

/**
 * ScriptedProvider answers fetchRaw calls from a queue of scripted responses,
 * matched in order per (method, url-prefix). Unmatched calls get a default.
 */
export class ScriptedProvider {
  private scripts: Array<{ method: HttpMethod; urlPrefix: string; responses: ScriptedResponse[] }> = [];
  calls: FetchCall[] = [];
  private defaultResponse: ScriptedResponse = { status: 404, body: '{"error":"no script"}' };

  script(method: HttpMethod, urlPrefix: string, responses: ScriptedResponse[]): this {
    this.scripts.push({ method, urlPrefix, responses });
    return this;
  }

  setDefault(r: ScriptedResponse): this {
    this.defaultResponse = r;
    return this;
  }

  next(method: HttpMethod, url: string): ScriptedResponse {
    for (const s of this.scripts) {
      if (s.method === method && url.startsWith(s.urlPrefix) && s.responses.length > 0) {
        return s.responses.shift()!;
      }
    }
    return this.defaultResponse;
  }
}

/* ------------------------------------------------------------------ */
/* Ports given to the adapter under test                               */
/* ------------------------------------------------------------------ */

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  fields?: Record<string, unknown>;
  atVirtualMs: number;
}

export interface ConnectorPorts {
  manifest: ConnectorManifest;
  fetchRaw(input: {
    method: HttpMethod;
    url: string;
    headers?: Record<string, string>;
    body?: string;
    tenantId: string;
    connectionId: string;
    capability: string;
  }): Promise<RawFetchResult>;
  emitObservation(obs: Observation): void;
  recordFetchAttempt(rec: FetchAttemptRecord): void;
  getSecretHandle(name: string): SecretHandle;
  log(level: LogEntry['level'], message: string, fields?: Record<string, unknown>): void;
  nowIso(): string;
  /** Virtual sleep: advances the clock, records the delay. No real waiting. */
  sleep(ms: number): Promise<void>;
  cursorStore: {
    load(tenantId: string, streamId: string): CursorState | null;
    save(tenantId: string, streamId: string, state: CursorState): void;
  };
  /**
   * Webhook signature verification: HMAC-SHA256 over the RAW body bytes with
   * the per-connector webhook secret, hex-encoded, compared with
   * timingSafeEqual. The adapter must call this BEFORE parsing. The harness
   * holds the key; the adapter never sees it.
   */
  verifyWebhookSignature(delivery: WebhookDelivery): boolean;
}

export class Harness implements ConnectorPorts {
  manifest: ConnectorManifest;
  provider = new ScriptedProvider();
  observations: Observation[] = [];
  fetchAttempts: FetchAttemptRecord[] = [];
  logs: LogEntry[] = [];
  /** Secret canary planted in provider responses; must NEVER appear in outputs. */
  readonly secretCanary = 'sk-canary-' + sha256Hex('bcq-canary').slice(0, 24);
  private cursors = new Map<string, CursorState>();
  private virtualMs = 0;
  private seq = 0;
  private webhookSecret = 'whsec-harness-' + sha256Hex('webhook').slice(0, 16);
  /** Tenant -> connection id mapping (tenant-scoped connections). */
  tenantConnections = new Map<string, string>();

  constructor(manifest: ConnectorManifest) {
    this.manifest = manifest;
  }

  /* ConnectorPorts */
  async fetchRaw(input: {
    method: HttpMethod; url: string; headers?: Record<string, string>; body?: string;
    tenantId: string; connectionId: string; capability: string;
  }): Promise<RawFetchResult> {
    const atVirtualMs = this.virtualMs;
    const call: FetchCall = {
      seq: this.seq++, method: input.method, url: input.url,
      headers: input.headers ?? {}, body: input.body,
      tenantId: input.tenantId, connectionId: input.connectionId,
      capability: input.capability, waitedMs: 0, atVirtualMs,
    };
    this.provider.calls.push(call);
    const scripted = this.provider.next(input.method, input.url);
    if (scripted.networkFault === 'timeout') {
      const err = new Error('simulated timeout') as Error & { code: string };
      err.code = 'ETIMEDOUT';
      throw err;
    }
    if (scripted.networkFault === 'reset') {
      const err = new Error('simulated reset') as Error & { code: string };
      err.code = 'ECONNRESET';
      throw err;
    }
    const body = scripted.body ?? '';
    return {
      ok: scripted.status >= 200 && scripted.status < 300,
      status: scripted.status,
      headers: scripted.headers ?? {},
      body,
      bytes: Buffer.byteLength(body, 'utf8'),
      finalUrl: scripted.finalUrl ?? input.url,
      redirectHops: scripted.redirects?.length ?? 0,
    };
  }

  emitObservation(obs: Observation): void {
    this.observations.push(obs);
  }
  recordFetchAttempt(rec: FetchAttemptRecord): void {
    this.fetchAttempts.push(rec);
  }
  getSecretHandle(name: string): SecretHandle {
    // Capability handle only. The harness never reveals a raw token, mirroring
    // lane L's broker: even the test double refuses to hand out secrets.
    return { handleId: `handle:${name}`, kind: name.includes('oauth') ? 'oauth2' : 'api-key' };
  }
  log(level: LogEntry['level'], message: string, fields?: Record<string, unknown>): void {
    this.logs.push({ level, message, fields, atVirtualMs: this.virtualMs });
  }
  nowIso(): string {
    return new Date(Date.UTC(2026, 8, 23, 19, 40, 0) + this.virtualMs).toISOString();
  }
  async sleep(ms: number): Promise<void> {
    this.virtualMs += ms;
  }
  cursorStore = {
    load: (tenantId: string, streamId: string): CursorState | null => {
      return this.cursors.get(`${tenantId}|${streamId}`) ?? null;
    },
    save: (tenantId: string, streamId: string, state: CursorState): void => {
      this.cursors.set(`${tenantId}|${streamId}`, { ...state });
    },
  };
  /**
   * Real HMAC-SHA256 over the RAW body bytes, hex-encoded. The adapter must
   * call this BEFORE parsing; the harness signs with the same scheme.
   */
  verifyWebhookSignature(delivery: WebhookDelivery): boolean {
    const expected = createHmac('sha256', this.webhookSecret)
      .update(delivery.rawBody, 'utf8')
      .digest();
    return timingSafeEqualHexBuf(expected, delivery.signature);
  }
  /** Test-side signer: HMAC-SHA256 over raw bytes, hex-encoded. */
  signWebhook(rawBody: string): string {
    return createHmac('sha256', this.webhookSecret).update(rawBody, 'utf8').digest('hex');
  }
  /** Scan every output surface for the secret canary. */
  findCanaryLeaks(): string[] {
    const leaks: string[] = [];
    const canary = this.secretCanary;
    for (const [i, o] of this.observations.entries()) {
      if (JSON.stringify(o).includes(canary)) leaks.push(`observation[${i}]`);
    }
    for (const [i, l] of this.logs.entries()) {
      if (JSON.stringify(l).includes(canary)) leaks.push(`log[${i}]`);
    }
    for (const [i, f] of this.fetchAttempts.entries()) {
      if (JSON.stringify(f).includes(canary)) leaks.push(`fetchAttempt[${i}]`);
    }
    return leaks;
  }
  resetOutputs(): void {
    this.observations = [];
    this.fetchAttempts = [];
    this.logs = [];
    this.provider.calls = [];
  }
}

/**
 * Constant-time hex signature comparison using node:crypto timingSafeEqual.
 * Length mismatch fails closed (no exception path for attackers to probe).
 */
function timingSafeEqualHexBuf(expected: Buffer, actualHex: string): boolean {
  if (!/^[0-9a-fA-F]*$/.test(actualHex)) return false;
  const actual = Buffer.from(actualHex, 'hex');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(expected, actual);
}

/* ------------------------------------------------------------------ */
/* Knowledge ledger: the canonical-knowledge stand-in                  */
/* ------------------------------------------------------------------ */

/**
 * The ledger dedupes on idempotency key, exactly like canonical knowledge
 * must. Tests assert on ledger size: duplicates in, no duplicate knowledge out.
 */
export class KnowledgeLedger {
  private byKey = new Map<string, Observation>();
  duplicatesAbsorbed = 0;

  ingest(obs: Observation): 'accepted' | 'duplicate' {
    if (this.byKey.has(obs.idempotencyKey)) {
      this.duplicatesAbsorbed++;
      return 'duplicate';
    }
    this.byKey.set(obs.idempotencyKey, obs);
    return 'accepted';
  }
  get size(): number {
    return this.byKey.size;
  }
  get all(): Observation[] {
    return [...this.byKey.values()];
  }
  has(key: string): boolean {
    return this.byKey.has(key);
  }
}

/* ------------------------------------------------------------------ */
/* Suite report                                                        */
/* ------------------------------------------------------------------ */

export interface CheckResult {
  id: string;
  name: string;
  passed: boolean;
  detail: string;
}

export interface SuiteReport {
  connectorId: string;
  version: string;
  checks: CheckResult[];
  passed: number;
  failed: number;
}

export function check(id: string, name: string, passed: boolean, detail: string): CheckResult {
  return { id, name, passed, detail };
}

/** Validate a manifest at admission. Any violation keeps the connector DISABLED. */
export function validateManifest(m: ConnectorManifest): string[] {
  const problems: string[] = [];
  if (!m.connectorId || !/^[a-z][a-z0-9-]{2,63}$/.test(m.connectorId))
    problems.push('connectorId must match ^[a-z][a-z0-9-]{2,63}$');
  if (!m.version || !/^\d+\.\d+\.\d+$/.test(m.version)) problems.push('version must be semver');
  if (!m.provider) problems.push('provider required');
  if (!m.capabilities || m.capabilities.length === 0) problems.push('at least one capability required');
  const verbs = new Set(['read', 'search', 'subscribe', 'webhook-receive', 'write']);
  for (const c of m.capabilities ?? []) {
    if (!verbs.has(c.verb)) problems.push(`unknown capability verb: ${c.verb}`);
    if (!c.object) problems.push('capability missing object');
  }
  if (m.rateBudget.maxAttempts > 3)
    problems.push('rateBudget.maxAttempts must be <= 3 (contract §5)');
  if (!m.streams || m.streams.length === 0) problems.push('at least one stream required');
  for (const s of m.streams ?? []) {
    if (s.syncModes.includes('incremental') && !s.incrementalCursor)
      problems.push(`stream ${s.streamId}: incremental requires incrementalCursor`);
  }
  return problems;
}
