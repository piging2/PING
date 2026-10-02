/**
 * LANE BCQ — Nango AuthBroker spike (evidence for the ADOPT-bounded verdict).
 *
 * This is the ONLY shape in which PING touches Nango: self-hosted Nango,
 * Auth + Proxy only. The wrapper takes `Pick<Nango, 'proxy'>` — the type
 * system itself proves getConnection (raw credentials) is unreachable.
 *
 * Binding rules enforced here (not in Nango):
 *  1. capability must be in the connector's declared capability set.
 *  2. connectionId must be registered to the calling tenantId.
 *  3. base-url-override is forbidden unless it matches the provider's
 *     declared base URL allow-list (SSRF guard; Nango also validates
 *     server-side, but the wrapper fails closed first).
 *  4. The broker never returns credentials: the response shape carries
 *     status/headers/body only, and headers are filtered like Nango's own
 *     PROXY_RESPONSE_HEADER_DENYLIST.
 *
 * What is DELIBERATELY absent: getConnection, getConnections, setMetadata
 * passthrough of secrets, and any credential-returning API.
 */
import type { AuthBroker } from '../kit/adapter.js';
import type { HttpMethod } from '../kit/harness.js';

/** Minimal structural type of Nango's proxy call (from @nangohq/node-client). */
export interface NangoProxyOnly {
  proxy(config: {
    method: string;
    endpoint: string;
    providerConfigKey: string;
    connectionId: string;
    headers?: Record<string, string>;
    data?: unknown;
    retries?: number;
    baseUrlOverride?: string;
  }): Promise<{
    status: number;
    headers: Record<string, string>;
    data: unknown;
  }>;
}

export interface NangoBrokerBinding {
  /** connectionId -> tenantId registry (lane M owns the real registry). */
  connectionTenants: Map<string, string>;
  /** providerConfigKey -> allowed base URLs (from the provider catalog). */
  baseUrlAllowList: Map<string, string[]>;
  /** Capabilities the owning connector declared. */
  declaredCapabilities: Set<string>;
}

const DENIED_RESPONSE_HEADERS = new Set([
  'proxy-authenticate', 'proxy-authorization', 'set-cookie',
]);

export class NangoAuthBroker implements AuthBroker {
  constructor(
    /** NOTE: Pick<Nango,'proxy'> — getConnection is not in this type. */
    private readonly nangoProxy: NangoProxyOnly,
    private readonly binding: NangoBrokerBinding,
    private readonly providerConfigKey: string,
  ) {}

  async proxyCall(input: {
    connectionId: string;
    method: HttpMethod;
    url: string;
    headers?: Record<string, string>;
    body?: string;
    capability: string;
    tenantId: string;
  }): Promise<{
    status: number; headers: Record<string, string>; body: string;
    bytes: number; finalUrl: string; redirectHops: number;
  }> {
    // 1. Declared capability only.
    if (!this.binding.declaredCapabilities.has(input.capability)) {
      throw Object.assign(new Error(`undeclared capability: ${input.capability}`), { code: 'PERMISSION_DENIED' });
    }
    // 2. Tenant/connection binding: no cross-tenant substitution.
    const owner = this.binding.connectionTenants.get(input.connectionId);
    if (owner !== input.tenantId) {
      throw Object.assign(new Error('connection/tenant mismatch'), { code: 'PERMISSION_DENIED' });
    }
    // 3. URL must stay on the provider's declared base (SSRF guard).
    const allowed = this.binding.baseUrlAllowList.get(this.providerConfigKey) ?? [];
    const urlOk = allowed.some((base) => input.url === base || input.url.startsWith(base.endsWith('/') ? base : base + '/'));
    if (!urlOk) {
      throw Object.assign(new Error('url outside provider base allow-list'), { code: 'PERMISSION_DENIED' });
    }
    // 4. Strip any caller-supplied auth material: the broker (Nango server)
    // injects credentials; the caller must never supply its own.
    const headers = { ...(input.headers ?? {}) };
    for (const k of Object.keys(headers)) {
      if (k.toLowerCase() === 'authorization' || k.toLowerCase() === 'proxy-authorization') delete headers[k];
    }
    const res = await this.nangoProxy.proxy({
      method: input.method,
      endpoint: input.url,
      providerConfigKey: this.providerConfigKey,
      connectionId: input.connectionId,
      headers,
      data: input.body,
      retries: 0, // PING owns retry policy; the kit adapter retries.
    });
    const outHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(res.headers ?? {})) {
      if (!DENIED_RESPONSE_HEADERS.has(k.toLowerCase())) outHeaders[k] = v;
    }
    const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data ?? '');
    return {
      status: res.status,
      headers: outHeaders,
      body,
      bytes: Buffer.byteLength(body, 'utf8'),
      finalUrl: input.url,
      redirectHops: 0,
    };
  }

  async startConnectionFlow(input: {
    integrationId: string; tenantId: string; principal: string; scopes: string[];
  }): Promise<{ connectUrl: string; flowId: string }> {
    // Real implementation: Nango Connect UI session creation. Spike returns
    // a deterministic shape; no credentials involved.
    return {
      connectUrl: `https://nango.internal/connect/${encodeURIComponent(input.integrationId)}?tenant=${encodeURIComponent(input.tenantId)}`,
      flowId: `flow-${input.tenantId}-${input.integrationId}`,
    };
  }

  async getConnectionStatus(connectionId: string): Promise<{
    status: 'connected' | 'expired' | 'revoked' | 'error';
    scopes: string[]; expiresAt: string | null;
  }> {
    // Metadata ONLY. Never credentials. (Nango's getConnection is not called.)
    return { status: 'connected', scopes: [], expiresAt: null };
  }

  async revokeConnection(_connectionId: string): Promise<void> {
    // Real implementation: DELETE /connection/:id server-side.
    return;
  }
}
