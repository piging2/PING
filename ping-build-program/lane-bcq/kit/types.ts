/**
 * LANE BCQ — Connector Substrate: contract types.
 *
 * Zero-dependency TypeScript. This module defines the executable connector
 * contract every future PING adapter inherits. It owns NO authority:
 * - event id/hash/sequence/persist/stream/replay belong to the canonical
 *   event authority (phase0). Connectors emit observations through the
 *   injected `emitObservation` port only.
 * - secrets belong to lane L's broker. Connectors receive capability
 *   handles, never raw tokens.
 * - the connector registry (operational metadata) belongs to lane M.
 *   This module owns the manifest VALIDATOR and the contract TEST KIT only.
 *
 * Constitutional rule: connector data is OBSERVATION. Connectors never
 * mutate canonical business state.
 */

/** Lane K failure taxonomy. No connector invents its own. */
export enum FailureCode {
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RATE_LIMITED = 'RATE_LIMITED',
  SOURCE_UNAVAILABLE = 'SOURCE_UNAVAILABLE',
  SOURCE_CHANGED = 'SOURCE_CHANGED',
  SCHEMA_CHANGED = 'SCHEMA_CHANGED',
  INVALID_PAYLOAD = 'INVALID_PAYLOAD',
  CONFLICT = 'CONFLICT',
  TIMEOUT = 'TIMEOUT',
  TRANSIENT = 'TRANSIENT',
  PERMANENT = 'PERMANENT',
}

/** Terminal state of one fetch attempt (contract §5). */
export enum FetchState {
  NOT_STARTED = 'NOT_STARTED',
  STARTED = 'STARTED',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  OUTCOME_UNKNOWN = 'OUTCOME_UNKNOWN',
}

/** Connector lifecycle (contract §4). */
export enum LifecycleState {
  DISABLED = 'DISABLED',
  AUTHORIZED = 'AUTHORIZED',
  DEGRADED = 'DEGRADED',
  SUSPENDED = 'SUSPENDED',
  REVOKED = 'REVOKED',
  RETIRED = 'RETIRED',
}

/** Confidence grade on every normalized field (contract §2.1). */
export enum Confidence {
  DIRECT = 'DIRECT',
  DERIVED = 'DERIVED',
  INFERRED = 'INFERRED',
  OWNER_ASSERTED = 'OWNER_ASSERTED',
  CONFLICTING = 'CONFLICTING',
  UNKNOWN = 'UNKNOWN',
}

export type CapabilityVerb = 'read' | 'search' | 'subscribe' | 'webhook-receive' | 'write';

export interface Capability {
  verb: CapabilityVerb;
  object: string; // e.g. 'reviews', 'businesses'
  scope: string; // e.g. 'owner-business-only'
}

export type CredentialType = 'oauth2' | 'api-key' | 'session-cookie' | 'none';
export type GrantedBy = 'business-owner' | 'platform-operator' | 'public-no-auth';

export interface StreamDescriptor {
  streamId: string; // e.g. 'gbp.reviews'
  streamClass: 'business-identity' | 'reviews' | 'web-presence' | 'social-presence';
  syncModes: Array<'full_refresh' | 'incremental' | 'webhook' | 'poll'>;
  /** Opaque watermark field name, required for incremental. Never parsed by PING. */
  incrementalCursor?: string;
}

export interface ConnectorManifest {
  connectorId: string;
  version: string; // semver
  provider: string;
  capabilities: Capability[];
  auth: {
    credentialType: CredentialType;
    grantedBy: GrantedBy;
    scopes: string[];
  };
  rateBudget: {
    callsPerWindow: number;
    windowMs: number;
    maxAttempts: number; // <= 3 per contract §5
    baseDelayMs: number;
    maxDelayMs: number;
  };
  streams: StreamDescriptor[];
  /** Max acceptable age per stream class, ms. */
  stalenessToleranceMs: Record<string, number>;
}

/** Provenance envelope on every observation (contract §2). */
export interface Provenance {
  provider: string;
  sourceRecordId: string; // the provider's own id for this record
  fetchedAt: string; // ISO-8601
  fetchAttemptId: string; // uuid of the fetch attempt
  connectorVersion: string; // semver
  rawEvidenceRef: string; // content-hash pointer to the verbatim raw payload
}

export interface Observation {
  /** Idempotency key: sha256(connectorId|streamId|externalObjectId|externalRecordVersion). */
  idempotencyKey: string;
  connectorId: string;
  streamId: string;
  tenantId: string;
  principal: string; // named party that granted access
  externalObjectId: string;
  externalTimestamp: string | null; // provider's updated-at; null when provider gives none
  observedTimestamp: string; // our fetch time
  provenance: Provenance;
  confidence: Confidence;
  confidenceMethod?: string; // rule id / method for DERIVED / INFERRED
  payload: Record<string, unknown>; // normalized, sanitized
  truncatedFields?: string[];
  /** Set when the provider shape was unmodeled: preserved opaque, never dropped. */
  unmodeled?: boolean;
}

export interface FetchAttemptRecord {
  fetchAttemptId: string;
  connectorId: string;
  streamId: string;
  tenantId: string;
  state: FetchState;
  failureCode?: FailureCode;
  reason?: string;
  attemptsUsed: number;
  partial?: boolean;
  missingFields?: string[];
  startedAt: string;
  finishedAt: string;
}

/** Opaque per-stream sync state. PING stores it verbatim, never interprets it. */
export type CursorState = Record<string, string>;

export interface ReadRequest {
  configRef: string; // pointer to validated config (vault refs, never raw secrets)
  streamIds: string[];
  state: CursorState; // opaque watermarks from the last checkpoint
  priorityTier: 'owner-requested' | 'freshness-triggered' | 'reconciliation' | 'routine-poll' | 'backfill';
  idempotencyKey: string;
  tenantId: string;
  principal: string;
}

export interface WebhookDelivery {
  deliveryId: string; // provider event id — the dedupe key
  rawBody: string; // raw bytes as received (signature verified over THESE)
  signature: string; // provider signature header value
  receivedAt: string;
}

/** Capability handle for a secret. The raw value is never accessible here. */
export interface SecretHandle {
  readonly handleId: string;
  readonly kind: 'oauth2' | 'api-key';
}
