/**
 * LANE BCQ — red-team test for the Nango AuthBroker wrapper spike.
 *
 * Adversary model: a compromised or curious connector/agent that tries to
 * (1) reach raw credentials through the broker, (2) substitute another
 * tenant's connection, (3) use an undeclared capability, (4) smuggle a
 * hostile base URL / auth header past the wrapper.
 *
 * Run: bun redteam.ts   (from the spike/ directory)
 */
import { NangoAuthBroker, type NangoProxyOnly } from './nango-auth-broker.js';

/** Simulates the REAL @nangohq/node-client surface, INCLUDING the leakage vector. */
class FakeNangoFull implements NangoProxyOnly {
  proxyCalls: Array<Record<string, unknown>> = [];
  /** The dangerous API the real SDK exposes: returns RAW credentials. */
  async getConnection(): Promise<{ credentials: { access_token: string } }> {
    return { credentials: { access_token: 'SECRET-RAW-TOKEN-12345' } };
  }
  async proxy(config: {
    method: string; endpoint: string; providerConfigKey: string; connectionId: string;
    headers?: Record<string, string>; data?: unknown;
  }): Promise<{ status: number; headers: Record<string, string>; data: unknown }> {
    this.proxyCalls.push({ ...config, headers: { ...(config.headers ?? {}) } });
    return { status: 200, headers: { 'content-type': 'application/json', 'proxy-authorization': 'must-be-stripped' }, data: { ok: true } };
  }
}

let passed = 0, failed = 0;
function check(id: string, name: string, ok: boolean, detail = ''): void {
  if (ok) { passed++; console.log(`PASS ${id} ${name}`); }
  else { failed++; console.log(`FAIL ${id} ${name}${detail ? ` → ${detail}` : ''}`); }
}

function brokerFor(fake: FakeNangoFull): NangoAuthBroker {
  // The wrapper receives ONLY the proxy facet. Type-level: getConnection is
  // not in NangoProxyOnly, so even a cast here would be a compile error in
  // real code; at runtime we pass the facet explicitly.
  const proxyOnly: NangoProxyOnly = { proxy: fake.proxy.bind(fake) };
  return new NangoAuthBroker(proxyOnly, {
    connectionTenants: new Map([['conn-A', 'tenant-a']]),
    baseUrlAllowList: new Map([['google', ['https://www.googleapis.com/']]]),
    declaredCapabilities: new Set(['read.reviews']),
  }, 'google');
}

async function main(): Promise<void> {
  // R1: raw-token leakage — the broker object exposes no credential API.
  {
    const b = brokerFor(new FakeNangoFull());
    const hasLeak = ['getConnection', 'getConnections', 'credentials', 'token', 'accessToken']
      .some((k) => k in (b as unknown as Record<string, unknown>));
    check('R1', 'broker exposes no credential-returning API', !hasLeak);
  }
  // R2: cross-tenant connection substitution is rejected.
  {
    const fake = new FakeNangoFull();
    const b = brokerFor(fake);
    let err: string | null = null;
    try {
      await b.proxyCall({ connectionId: 'conn-A', method: 'GET', url: 'https://www.googleapis.com/x', capability: 'read.reviews', tenantId: 'tenant-B-attacker' });
    } catch (e) { err = (e as { code?: string }).code ?? 'thrown'; }
    check('R2', 'cross-tenant connection substitution rejected', err === 'PERMISSION_DENIED' && fake.proxyCalls.length === 0, `err=${err}`);
  }
  // R3: undeclared capability bypass is rejected.
  {
    const fake = new FakeNangoFull();
    const b = brokerFor(fake);
    let err: string | null = null;
    try {
      await b.proxyCall({ connectionId: 'conn-A', method: 'GET', url: 'https://www.googleapis.com/x', capability: 'write.everything', tenantId: 'tenant-a' });
    } catch (e) { err = (e as { code?: string }).code ?? 'thrown'; }
    check('R3', 'undeclared capability rejected', err === 'PERMISSION_DENIED' && fake.proxyCalls.length === 0, `err=${err}`);
  }
  // R4: hostile base URL override (SSRF) is rejected before any provider call.
  {
    const fake = new FakeNangoFull();
    const b = brokerFor(fake);
    let err: string | null = null;
    try {
      await b.proxyCall({ connectionId: 'conn-A', method: 'GET', url: 'http://169.254.169.254/latest/meta-data/', capability: 'read.reviews', tenantId: 'tenant-a' });
    } catch (e) { err = (e as { code?: string }).code ?? 'thrown'; }
    check('R4', 'off-allow-list URL rejected (SSRF guard)', err === 'PERMISSION_DENIED' && fake.proxyCalls.length === 0, `err=${err}`);
  }
  // R5: caller-supplied Authorization header is stripped, never forwarded.
  {
    const fake = new FakeNangoFull();
    const b = brokerFor(fake);
    await b.proxyCall({
      connectionId: 'conn-A', method: 'GET', url: 'https://www.googleapis.com/x',
      capability: 'read.reviews', tenantId: 'tenant-a',
      headers: { Authorization: 'Bearer attacker-supplied', 'X-Ok': 'yes' },
    });
    const sent = fake.proxyCalls[0]?.['headers'] as Record<string, string>;
    check('R5', 'caller Authorization header stripped before proxy', !('Authorization' in sent) && sent['X-Ok'] === 'yes', JSON.stringify(sent));
  }
  // R6: happy path still works; response carries no credential material.
  {
    const fake = new FakeNangoFull();
    const b = brokerFor(fake);
    const res = await b.proxyCall({ connectionId: 'conn-A', method: 'GET', url: 'https://www.googleapis.com/x', capability: 'read.reviews', tenantId: 'tenant-a' });
    const serialized = JSON.stringify(res);
    const leaks = /SECRET-RAW-TOKEN|access_token/i.test(serialized);
    check('R6', 'legit call succeeds; response has no credential material; proxy-auth headers stripped',
      res.status === 200 && !leaks && !('proxy-authorization' in res.headers), serialized.slice(0, 120));
  }
  // R7: the facet handed to the broker carries only proxy, even when the
  // full client exists. (Object.keys on the class would also show instance
  // fields like proxyCalls; the type boundary is what matters.)
  {
    const full = new FakeNangoFull();
    const facet: NangoProxyOnly = { proxy: full.proxy.bind(full) };
    const keys = Object.keys(facet);
    check('R7', 'NangoProxyOnly facet exposes proxy and nothing else', keys.length === 1 && keys[0] === 'proxy', keys.join(','));
  }
  console.log(`\n${passed}/${passed + failed} red-team checks passed (${failed} failed)`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
