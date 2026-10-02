/**
 * LANE BCQ — Connector Substrate: adapter SPI + AuthBroker seam.
 *
 * A connector adapter is the ONLY PING-side code that talks to a provider.
 * It is authority-free: it emits observations through ports, stores cursors
 * through ports, and fetches through ports. It never persists canonical
 * state, never sequences events, never sees raw tokens.
 */
import {
  ConnectorManifest,
  CursorState,
  FetchState,
  FailureCode,
  ReadRequest,
  StreamDescriptor,
  WebhookDelivery,
} from './types';
import { ConnectorPorts, HttpMethod } from './harness';

/** Result of check(): prove reachability before any read. */
export interface CheckOutcome {
  status: 'SUCCEEDED' | 'FAILED';
  checkedAt: string;
  message: string;
  /** Config failure (bad credential) vs connector failure (internal). */
  errorClass?: 'user_error' | 'connector_error';
  verifiedObjects: string[];
}

/** Result of read(): emitted via ports during the call; summarized here. */
export interface ReadOutcome {
  fetchAttemptId: string;
  terminalState: FetchState;
  failureCode?: FailureCode;
  reason?: string;
  recordsEmitted: number;
  recordsSkipped: string[];
  partial: boolean;
  newCursor: CursorState;
}

export interface WebhookOutcome {
  deliveryId: string;
  accepted: boolean;
  reason?: string;
  duplicate?: boolean;
  observationsEmitted: number;
}

export interface ConnectorAdapter {
  readonly manifest: ConnectorManifest;
  check(configRef: string, ports: ConnectorPorts): Promise<CheckOutcome>;
  discover(configRef: string, ports: ConnectorPorts): Promise<StreamDescriptor[]>;
  read(request: ReadRequest, ports: ConnectorPorts): Promise<ReadOutcome>;
  /** Optional. Present only if the manifest declares webhook-receive. */
  receiveWebhook?(delivery: WebhookDelivery, ports: ConnectorPorts): Promise<WebhookOutcome>;
  /** Optional. Present only if the manifest declares write.* (DENIED by default). */
  write?(...args: unknown[]): Promise<unknown>;
}

/* ------------------------------------------------------------------ */
/* AuthBroker SPI — the Nango seam (and its hand-rolled fallback)       */
/* ------------------------------------------------------------------ */

/**
 * AuthBroker holds provider connections (OAuth refresh, credential storage)
 * WITHOUT PING ever seeing raw tokens. This is the interface Nango implements
 * (self-hosted, Auth + Proxy only) and the interface a minimal hand-rolled
 * M11 broker implements as fallback. Connectors and agents use ONLY this.
 *
 * What is DELIBERATELY absent: any call that returns raw credentials
 * (Nango's getConnection is never exposed past the wrapper). The Nango env
 * secret key is held by lane L's secret broker as a capability; the wrapper
 * exposes only scoped proxy calls plus a PING-side audit log.
 */
export interface AuthBroker {
  /**
   * Proxy one authenticated provider call. The broker resolves the provider,
   * injects credentials server-side, handles token refresh (single-flight),
   * retries and rate limits, and returns the response. The caller never sees
   * the token. `capability` must be in the connector's declared capabilities.
   */
  proxyCall(input: {
    connectionId: string;
    method: HttpMethod;
    url: string;
    headers?: Record<string, string>;
    body?: string;
    capability: string;
    tenantId: string;
  }): Promise<{
    status: number;
    headers: Record<string, string>;
    body: string;
    bytes: number;
    finalUrl: string;
    redirectHops: number;
  }>;

  /** Begin an owner-consent OAuth flow (Nango Connect UI). Returns a URL for the owner. */
  startConnectionFlow(input: {
    integrationId: string;
    tenantId: string;
    principal: string;
    scopes: string[];
  }): Promise<{ connectUrl: string; flowId: string }>;

  /** Connection metadata ONLY: status, scopes, expiry. Never credentials. */
  getConnectionStatus(connectionId: string): Promise<{
    status: 'connected' | 'expired' | 'revoked' | 'error';
    scopes: string[];
    expiresAt: string | null;
  }>;

  /** Revoke a connection: destroy credentials broker-side. PING evidence stays. */
  revokeConnection(connectionId: string): Promise<void>;
}
