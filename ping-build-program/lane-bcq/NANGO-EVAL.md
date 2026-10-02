# NANGO EVALUATION — BCQ-NANGO lane

**Date:** 2026-09-23 (night shift) | **Evaluator:** BCQ-NANGO lane worker
**Repo harvested:** https://github.com/NangoHQ/nango — cloned to `~/workspace/ping-build-program/harvest/nango` (depth-1, HEAD 2026-09-24, commit 7bf896b)
**Verdict: ADAPT** — self-hosted Nango (free tier: Auth + Proxy only) as token custodian behind a PING-owned wrapper. No Nango Cloud. Production hot-path placement is gated on Nolan's vendor veto decision (morning). No live credentials used in this evaluation (fixtures and code-reading only, per standing order).

---

## PROBLEM

PING's connector substrate needs, for every business-data provider (Facebook Graph, Google APIs, future Google Business Profile, Yelp, etc.):

1. Provider OAuth dance handling (authorization-code + PKCE, token exchange, refresh scheduling, revocation detection)
2. Encrypted credential custody with a strict secret boundary (lane L: agents get capability handles, never tokens)
3. Connection lifecycle management (connect, health, re-auth, disconnect) per business, per provider
4. A provider catalog so each new connector is configuration, not a new OAuth implementation
5. Failure semantics the connector contract can map to lane K's taxonomy

The connect flow Nolan ordered: CONNECT SOURCE -> provider -> requested permissions explained -> OAuth authorization -> callback -> encrypted custody -> source capability inventory. Smallest permission set, never speculative write scopes, tokens never in browser/agent/events/SiteSpec/logs.

## PING ALREADY HAS

(verified read-only in `/home/nolan/projects/ping`)

- `src/fyd/identity/` — user OIDC (Google sign-in for FYD users): PKCE, `buildAuthorizationUrl`, `exchangeCodeForTokens`, `verifyGoogleIdToken`. Provider tokens are **discarded after ID-token verification**; they never enter objects/journal/agent context. This is USER auth, not business-data provider OAuth. The pattern (server-only secrets, fail-closed) is reusable.
- `src/lib/oauth.ts` + `src/config/oauth.v1.json` + `src/types/oauth.ts` — OAuth provider **manifest**: declares Google services (drive, contacts, gmail enabled; calendar, maps, business-profile disabled) with scopes. Declaration only. No vault, no refresh, no connection records, no connect UX.
- `src/fyd/identity/file-store.ts` — session store (credential-adjacent storage pattern, KEEP per archaeology).
- `~/workspace/business-connectors/hidden_files/connector-contract.md` — the contract every connector satisfies: capability declaration, auth requirements with `granted_by` (business-owner / platform-operator), least-privilege scopes, consent records, rate budgets, typed raw payloads stored verbatim, provenance envelope on every normalized field, enumerated failure modes. Our wrapper must satisfy this contract; Nango sits underneath it.

**Gap:** no provider token vault, no refresh machinery, no multi-provider OAuth config catalog, no connect UX. That gap is exactly Nango's Auth+Proxy core. Nothing in PING needs to be rewritten to make room; the wrapper is additive.

## EXTERNAL CANDIDATES

| Candidate | Role considered | Outcome |
|---|---|---|
| **Nango (self-hosted, free tier)** | Auth + connection management + proxy | **ADAPT** (this eval) |
| Nango Cloud | Same, hosted by vendor | Rejected for PING: customer-data custody on vendor infra, recurring paid dependency, per-connection pricing. Fails the veto gate on custody and cost. |
| Airbyte | Source/stream/checkpoint concepts | Harvest concepts only (per lane scope). Heavier platform, Java, auth is not its core. Not evaluated as auth substrate. |
| Hand-rolled OAuth vault | Build it ourselves | Rejected on cost: vault + refresh scheduler + Connect UX + provider configs = months of commodity code for zero product differentiation. |
| Composio / hosted unified APIs | Auth as a service | Rejected: hosted-only, same custody problem as Nango Cloud, no self-host escape. |
| Per-provider SDKs | Direct OAuth per connector | Rejected: N connectors x OAuth quirks; no shared refresh/custody story. |

## LICENSES

**Nango: Elastic License 2.0 (ELv2), verified from the repo's own `LICENSE` file** (cloned copy, lines 1-30 read verbatim).

- Source-available, NOT OSI open source. Single license across the whole monorepo including SDKs/CLI (npm metadata for `nango` and `@nangohq/frontend` reads "SEE LICENSE IN LICENSE FILE IN GIT REPOSITORY" pointing at root ELv2; the "MIT SDKs" claim in some marketing does not hold up).
- Permits: use, copy, distribute, modify, self-host, internal commercial use. No copyleft, no change-date conversion.
- Forbids: (a) providing the software to third parties **as a hosted/managed service** exposing a substantial set of its features; (b) circumventing license-key functionality; (c) removing notices.
- **What it means for us:** FYD self-hosts Nango as an internal component. FYD customers never see Nango's dashboard, API, or Connect UI as a product surface; they get FYD sites and the CONNECT SOURCE flow. We do not resell connector-auth-as-a-service. This is internal use, squarely permitted. Boundary we must not cross: never expose Nango itself (dashboard/API/Connect UI) to FYD customers as a standalone offering.
- Residual risk: vendor may change future terms; mitigation is pinning a version and the fact that credentials stay exportable (see Optionality).

## TESTED

No live credentials were used (standing order). No `npm ci` (monorepo install infeasible in this window; noted as follow-up). What was actually verified:

1. **Provider catalog (structural, executed):** parsed `packages/providers/providers.yaml`: **1,015 provider entries**. Auth modes: OAUTH2 302, API_KEY 332, OAUTH2_CC 104, TWO_STEP 65, BASIC 99, MCP_OAUTH2 30, plus long tail. 62 entries lack `auth_mode` (aliases/inherited), 40 lack proxy `base_url`. `google` (OAUTH2, proxy `https://www.googleapis.com`) and `facebook` (OAUTH2, proxy `https://graph.facebook.com`) confirmed present with correct OAuth endpoints.
2. **Catalog gap (executed):** **no `google-business-profile` provider** among 24 Google entries. GBP (the review source for review-triggered outreach) would need a YAML provider addition plus our OAuth app registration. Not a blocker: providers are YAML config, and Nango merges PRs adding providers within days.
3. **Scope enforcement (code-read):** `packages/server/lib/controllers/connection/connectionId/getConnection.ts:60-71` — without the `environment:connections:read_credentials` scope, the endpoint serves the redacted connection and **403s** any credential/refresh option ("Credential and refresh options require the environment:connections:read_credentials scope"). The capability-handle pattern is enforceable at the Nango layer, not just by convention.
4. **Scoped key minting (code-read):** `packages/server/lib/controllers/v1/environment/createApiKey.ts` accepts a `scopes` array validated against `API_KEY_SCOPES` (`packages/types/lib/api-keys/scopes.ts`), which separates `environment:proxy`, `environment:connections:read`, and `environment:connections:read_credentials`. No plan-gate in the creation path. Free self-host can mint a proxy-only key.
5. **Secret storage (code-read):** `DBConnection.credentials` is `{ encrypted_credentials?: string }` with `credentials_iv`/`credentials_tag` (`packages/types/lib/connection/db.ts:36-38`). Envelope encryption via AWS Encryption SDK, DEK wrapped by AWS KMS or GCP KMS (`packages/kms/lib/envelope.ts`, strictest commitment policy). Free self-host uses `NANGO_ENCRYPTION_KEY` (256-bit base64); docs warn it cannot be changed after first credential is stored.
6. **Connect completion without webhooks (code-read):** Connect UI emits `{type:'connect', payload: AuthResult}` via `parent.postMessage` (`packages/connect-ui/src/lib/events.ts:32`); `AuthResult = ConnectionResponseSuccess` includes `connectionId`. Free self-host has no webhooks, but the frontend `onEvent` callback gives us the webhook-free completion path: our page listens, extracts the connection ID, POSTs it to our backend, which binds it to the PING business.
7. **Refresh failure semantics (code-read):** `connectionRefreshFailed` (`packages/server/lib/hooks/hooks.ts:331`) persists an auth error notification (`errorNotificationService.auth.create({type:'auth', active:true})`), sends webhook/Slack when configured. Connection row carries `last_refresh_failure`, `last_refresh_success`, `refresh_attempts`, `refresh_exhausted`, `credentials_expires_at` (`db.ts:39-44`). BUT the proxy wire format collapses `credentials_refresh_failed` to `server_error` (`allProxy.ts:403-406`), so our wrapper must read the connection row for typed health, not the proxy error code.
8. **Authority disclaimer (docs-read):** "You must store it on your side, attached to the user/org/project that owns the connection. **Nango doesn't model that ownership.**" (`docs/guides/auth/auth-guide.mdx`). The vendor draws the authority line exactly where our constitution needs it.
9. **Free-tier boundaries (docs-read):** free self-host = Auth + Proxy only. No syncs, no tool calls, no webhooks, no triggers, no MCP server, no RBAC, no MFA (`docs/guides/platform/free-self-hosting.mdx`). Our design uses only Auth + Proxy, so nothing we need is paywalled.
10. **Project health (web-verified):** 12,273 stars; commits/PRs within the last 6 days (incl. OAuth consent-flow work NAN-6924, new providers Bandwidth/Moneybird/HiBob); Series A $25M led by Lightspeed (2025-07-22, ~$29M total). Active, funded, maintained.
11. **Repo CI (read):** PR bodies show `npx vitest run packages/providers` and `npm run lint` as required checks; their own test suites exist per package (unit + integration tests colocated). We did not execute them here.

## WINNER

**Nango self-hosted, free tier (Auth + Proxy), ADAPTED behind a PING-owned wrapper.** Nango Cloud and Enterprise self-host are explicitly not selected.

## ADOPT-ADAPT-REJECT

### Verdict: ADAPT

Adopt the mechanism (self-hosted OAuth custody + proxy + provider catalog). Adapt it by wrapping it in a PING-owned interface that enforces our secret boundary, ownership binding, provenance envelope, and failure taxonomy. Do not adopt Nango's agent-session/MCP/sync vision; those are Cloud-gated and would pull Nango toward authority.

### Kill-criteria check (all pass)

- License compatible: yes (ELv2, internal use; see LICENSES).
- Surrenders canonical authority: no. Nango stores opaque tokens + connection metadata; PING keeps objects, evidence, capabilities, policy, events, and the connection-to-business binding. Nango's own docs disclaim ownership modeling.
- Unsafe secret model: no, **provided** we use scoped keys (verified in code). Default full-access keys do return raw tokens; our wrapper never holds one at runtime.
- Cannot preserve provenance: no, it can. Connection rows carry identity/timestamps; our wrapper stamps the full PING provenance envelope on every observation.
- Cannot be isolated: no. 3 containers, self-hosted, pinned version.
- Weight dwarfs value: no. 3 containers vs months of commodity OAuth infrastructure.
- PING already solves it: no (see PING ALREADY HAS).
- Only benefit is novelty: no. It removes commodity code from the critical acquisition path.

### Nolan's vendor veto gate (production hot-path placement needs his morning decision)

This recommendation **triggers the veto gate**: new secret surface (token vault), customer-data custody (OAuth tokens), large runtime dependency (stateful service). Experimentation is authorized now; production wiring waits for Nolan. Gate answers:

1. **DOES IT REMOVE COMMODITY CODE?** Yes. OAuth dances per provider, refresh scheduling with backoff, PKCE, Connect UI, envelope encryption, 1,015 provider OAuth configs, proxy token injection. Months of undifferentiated work.
2. **DOES IT IMPROVE THE URL -> TRUSTED FYD LOOP?** Yes, at the OBSERVATION stage: auth-walled provider APIs (reviews, listings, page data) that web acquisition cannot reach become observable. It does not touch the loop's authority stages (EVIDENCE -> OBJECT GRAPH -> SITE SPEC).
3. **CAN WE REMOVE/REPLACE IT?** Yes. Credentials exportable via a `read_credentials`-scoped admin key; the wrapper seam is 7 methods; the connection-to-business binding lives in PING. Replacement = implement the port elsewhere, re-import tokens or re-run connect. Seam cost: LOW-MODERATE (see Optionality).
4. **DOES PING REMAIN THE AUTHORITY?** Yes. Nango never sees business objects, evidence, capabilities, policy, or events. Connection IDs must never become foreign keys in canonical objects; PING handle IDs are the canonical reference.
5. **WHAT DATA DOES IT OWN?** OAuth/API tokens (encrypted at rest), connection metadata (provider, scopes, timestamps, end-user id), provider OAuth app configs. No business objects, no evidence, no canonical identity.
6. **WHAT FAILS IF IT DISAPPEARS?** New connections, refreshes, and proxy reads stop. Everything already ingested (evidence, objects, sites) is unaffected. Recovery: pinned self-host keeps running; export credentials; migrate. Nango retries failed refreshes for days before giving up, so transient outages self-heal.
7. **COST AT 10 / 1,000 / 100,000 FYDs?** License $0 (self-host). Infra: one small VM (3 containers + Postgres + Redis) at 10 and 1,000 FYDs; proxy is effectively stateless and horizontally scalable toward 100,000. No per-connection fee on self-host. Ops cost is real (backups, updates, key management) but bounded and far below Cloud per-connection pricing at scale.

## CODE WE DO NOT NEED TO WRITE

- OAuth 2.0/1.0a authorization-code flows, PKCE, token exchange, refresh scheduling, revocation retry budgets
- Per-provider OAuth endpoint/scope quirks (1,015 YAML configs, community-maintained)
- Connect UI (embeddable auth UX with per-provider guidance)
- Envelope encryption for tokens at rest (AWS Encryption SDK + KMS/GCP patterns; `NANGO_ENCRYPTION_KEY` for self-host)
- Proxy token injection and per-provider base-URL routing
- Auth audit events (typed `connection.created/refreshed/deleted`, `agent_session.*` in the audit trail)
- API-key scoping infrastructure

## MINIMAL PING WRAPPER

PING-owned. Nango is an implementation detail behind this port. The CONN lane builds connectors against this, never against Nango directly.

```ts
// Opaque to agents. Resolves to (providerConfigKey, connectionId) ONLY
// inside the wrapper's server process. Never logged, never serialized
// into events/SiteSpec/agent context.
type ConnectionHandle = {
  id: string;            // PING-issued handle id (canonical reference)
  businessId: string;    // PING business object id: ownership binding lives HERE
  provider: string;      // e.g. 'facebook', 'google'
  scopes: string[];      // granted scopes, least privilege
};

type HealthStatus =
  | 'AUTH_OK' | 'AUTH_EXPIRING_SOON' | 'AUTH_EXPIRED'
  | 'AUTH_REVOKED' | 'RATE_LIMITED' | 'SOURCE_UNAVAILABLE'
  | 'PROVIDER_TOS_CHANGE' | 'UNKNOWN';

type ObservationBatch = {
  records: unknown[];          // raw provider payloads, verbatim
  provenance: {
    provider: string;
    source_record_id: string;   // provider's id for the record
    fetched_at: string;         // ISO-8601
    fetch_attempt_id: string;   // uuid of this fetch
    connector_version: string;  // semver
    connection_handle_id: string;
    ping_business_id: string;
  };
  // confidence graded per connector-contract: DIRECT | DERIVED | INFERRED | UNKNOWN
};

interface ConnectorAuthPort {
  // CONNECT SOURCE (queued for morning; Nolan picks the accounts).
  // UI offers CONNECT FACEBOOK / CONNECT ATPROTO / CONNECT OTHER SOURCE
  // but only lists providers actually supported. Smallest scope set for
  // the demonstrated feature; never speculative write scopes; PKCE required.
  connect(opts: {
    businessId: string;
    provider: string;
    requestedScopes: string[];
    grantedBy: 'business-owner' | 'platform-operator';
  }): Promise<{ connectSessionToken: string; connectUiUrl: string }>;

  // Called by OUR backend when the frontend reports the Connect UI
  // 'connect' event (free tier has no webhooks) or when a Cloud webhook
  // arrives. Binds nangoConnectionId <-> PING business. This is where
  // PING asserts ownership; Nango never does.
  completeConnection(opts: {
    nangoConnectionId: string;
    providerConfigKey: string;
    businessId: string;
    grantedBy: 'business-owner' | 'platform-operator';
  }): Promise<{ handle: ConnectionHandle }>;

  // Provider capability inventory from providers.yaml (filtered to enabled).
  discover(provider: string): Promise<ProviderCapability[]>;

  // Opaque resume cursor for incremental reads (Airbyte-style checkpoint
  // concept lives HERE, PING-side, not in Nango).
  checkpoint(handle: ConnectionHandle): Promise<{ cursor: string }>;

  // Authenticated read. ONLY via Nango proxy with the proxy-scoped key.
  // Returns raw payload + provenance envelope; normalization is the
  // adapter's job per connector-contract section 2.
  read(handle: ConnectionHandle, req: {
    method: 'GET' | 'POST';
    path: string;              // provider-relative, validated against allowlist
    query?: Record<string, string>;
    cursor?: string;
  }): Promise<ObservationBatch>;

  refresh(handle: ConnectionHandle): Promise<HealthStatus>;   // force token refresh
  disconnect(handle: ConnectionHandle, opts?: {
    revokeAtProvider: boolean;  // default true: revoke the grant, then delete
  }): Promise<void>;

  // Typed health. Reads the connection row (last_refresh_failure,
  // refresh_exhausted, credentials_expires_at) because the proxy wire
  // format collapses refresh failure to server_error. Maps to lane K taxonomy.
  health(handle: ConnectionHandle): Promise<HealthStatus>;
}
```

### Wrapper enforcement rules (non-negotiable)

1. **Two keys, strict separation.** ADMIN key (full scope incl. `read_credentials`) lives in the vault; used only by offline bootstrap/export jobs, never by the runtime. RUNTIME key scopes: `environment:proxy`, `environment:connections:list`, `environment:connections:read`, `environment:connect_sessions:write`. **No `read_credentials`.** Verified in code that this 403s credential retrieval.
2. **Agents never see tokens.** They receive `ConnectionHandle` (opaque id). Token resolution happens inside the wrapper's server process via the proxy.
3. **Provider allowlist per read.** `read()` validates `path` against the connector's declared endpoints; no arbitrary proxy URLs (Nango supports base-URL override; we disable it).
4. **Provenance on everything.** Every `ObservationBatch` carries the full envelope; raw payloads stored verbatim (bytes + content hash) before normalization, per connector-contract 1.4.
5. **GBP gap.** No `google-business-profile` provider in the catalog. Wrapper ships a `google-business-profile` YAML provider addition (contribution-ready upstream) and the OAuth app registration is a morning queue item for Nolan. Until then, review-triggered outreach stays on existing sources.
6. **ATProto.** No Bluesky/ATProto provider in the catalog (app-password auth, not OAuth). CONNECT ATPROTO is either a custom YAML provider entry or wrapper-native; starts as unsupported-in-Nango, queued.
7. **Nango connection IDs are not canonical.** Canonical reference is the PING handle id. The binding table (handle -> business -> nango connection) lives in PING storage.

## FAILURE TEST

Fixtures and recorded responses only (no live credentials, per standing order). Each becomes a contract test in the kit:

- **F1 token revoked:** recorded 401 from provider + `refresh_exhausted=true` fixture on the connection row. Expect `health()` -> `AUTH_EXPIRED` (not `server_error`), `read()` fails closed, existing evidence untouched, re-auth flow offered. Never infinite retry.
- **F2 Nango down:** proxy connection refused. Expect `read()` -> `SOURCE_UNAVAILABLE`, bounded retries with jitter, no retry storm, already-ingested evidence unaffected.
- **F3 scope enforcement:** runtime (proxy-scoped) key calls `getConnection`. Expect HTTP 403 `forbidden` (verified in code at getConnection.ts:62-70). Proves a stolen runtime key cannot reach raw tokens.
- **F4 DB compromise:** Nango Postgres dump without `NANGO_ENCRYPTION_KEY`/KMS. Expect opaque ciphertext (envelope encryption, verified in code). Key lives in the vault, never beside the DB.
- **F5 cross-tenant forgery:** `read()` with a handle bound to business A but a connectionId of business B. Expect fail-closed: handle resolution is server-side, connectionIds never accepted from the caller.
- **F6 refresh backoff:** `connection_refresh_backoff` from proxy. Expect wrapper to surface `RATE_LIMITED`/`TRANSIENT` and back off per the connector's backoff policy, not hammer the provider.
- **F7 Nango disappears:** kill the containers. Expect canonical objects, evidence, and sites unaffected; reconnect/export path exercised from the last backup.

## PRODUCT CAPABILITY UNLOCKED

- Auth-walled provider data becomes observable: Facebook Page data via Graph, Google Workspace data, and (after the GBP YAML addition) Google Business Profile reviews -> the review-triggered outreach trigger gets its primary source.
- The ordered CONNECT SOURCE flow becomes buildable: provider picker (only supported providers enabled) -> scopes explained -> OAuth -> callback -> encrypted custody -> capability inventory, with Nolan picking real accounts in the morning.
- The CONN lane gets a stable `ConnectorAuthPort` to build the first real business connector against, without waiting on auth infrastructure.

## BYTES-DEPENDENCY COST

- Harvest clone: ~490 MB in `~/workspace/ping-build-program/harvest/nango` (research only; **nothing is vendored into PING**).
- Runtime footprint (free self-host, from `docker-compose.yaml`): 3 containers: `nangohq/nango-server` (single image), `postgres:16-alpine`, `redis:7.2.4`. Elasticsearch optional and off by default. No new database engine for PING (Postgres/Redis already in the stack family).
- License cost: $0. Ops cost: one more stateful service (backups, updates, encryption-key custody in the vault). No per-connection fees on self-host.
- Dependency risk: ELv2 vendor terms could change for future versions; mitigated by version pinning + credential exportability + the narrow 7-method seam.

---

## RED TEAM

**Token leakage paths.**
1. `getConnection`/`getToken`/`getRawTokenResponse` return raw tokens to any caller with `read_credentials`. Mitigated: runtime key lacks the scope (403 verified); admin key in vault, offline use only.
2. Nango dashboard/API with the admin key. Mitigated: admin key never in runtime, dashboard not exposed beyond ops.
3. Proxy error logging: `allProxy.ts` logs response bodies on failure ("Failed with this body"), which may contain PII. Mitigated: keep Nango logs out of the PING journal; set log level; treat Nango logs as provider-adjacent, not evidence.
4. Connect UI session tokens are short-lived by design; the frontend `connect` event carries only connectionId, never tokens.

**Cross-tenant leakage.** Nango's tenant boundary is the environment; we run one environment (ours). Per-business isolation is enforced PING-side via handles. A Nango-internal environment-crossing bug is accepted residual risk, bounded by self-hosting a pinned binary and by never placing two mutually-distrusting parties' trust boundary inside Nango (all end users are businesses we serve through our backend).

**Compromised/misbehaving Nango instance.** With DB + host, attacker gets tokens (same as any vault-host compromise). Blast radius: provider API abuse as the connected businesses until revocation. They cannot mint PING authority: objects, evidence, capabilities, policy, and events live outside Nango, and connection IDs are not canonical references. Mitigations: least-privilege scopes per connection, `disconnect(revokeAtProvider:true)` path, audit trail review, encryption key separate from DB host.

**Nango outage.** Reads fail closed to `SOURCE_UNAVAILABLE`; canonical data unaffected; Nango's own refresh retry (days-long backoff before giving up) self-heals transient provider outages. No silent data loss: evidence already ingested is immutable per connector-contract.

**Nango as authority creep.** The specific REJECT trigger. Guardrails: (a) wrapper interface is the only import surface; (b) no Nango IDs in canonical objects; (c) no Nango webhooks driving canonical events directly (free tier has none anyway); (d) business identity binding lives in PING; (e) any design placing policy, capabilities, or evidence in Nango is rejected at review. Nango's own docs ("Nango doesn't model that ownership") align with this.

## OPTIONALITY (the seam cost)

- **Seam:** `ConnectorAuthPort` (7 methods) + PING-side binding table (handle -> business -> nango connection) + provenance envelope + failure-taxonomy mapping. All PING-owned.
- **Replace cost:** implement the port against another backend; export tokens via the admin `read_credentials` key (mechanism verified); re-import or re-run connect. Provider OAuth configs are portable YAML. Estimate: days, not weeks. The expensive knowledge (which scopes, which endpoints, refresh behavior) is captured in the connector declarations, not in Nango.
- **What we must never do:** let Nango IDs become canonical foreign keys; let Nango own the business identity; build product features on Nango-only primitives (syncs, functions, MCP server) that don't exist in the free tier anyway.

## OPEN QUESTIONS FOR NOLAN (morning queue, not blockers)

1. Vendor veto gate: approve Nango self-hosted Auth+Proxy for the production hot path? (Gate answers above; experimentation proceeds regardless.)
2. Which real accounts get connected first (Facebook? Google?). OAuth app registrations needed per provider.
3. Google Business Profile: approve adding the GBP provider YAML + requesting `business.manage` scope? (GBP API is approval-gated by Google; quota starts at 0.)
4. ATProto: desired, or deprioritized behind Facebook/Google?

## EVIDENCE INDEX (harvest clone paths)

- License: `LICENSE` (ELv2, lines 1-30)
- Free-tier boundaries: `docs/guides/platform/free-self-hosting.mdx`
- Scope catalog: `packages/types/lib/api-keys/scopes.ts`
- Scope enforcement: `packages/server/lib/controllers/connection/connectionId/getConnection.ts:60-71`
- Scoped key creation: `packages/server/lib/controllers/v1/environment/createApiKey.ts`
- Connection model: `packages/types/lib/connection/db.ts:18-45`
- Proxy errors: `packages/server/lib/services/proxy.service.ts:75-93`, `packages/server/lib/controllers/proxy/allProxy.ts:396-427`
- Refresh failure hook: `packages/server/lib/hooks/hooks.ts:331-400`
- Connect UI events: `packages/connect-ui/src/lib/events.ts:32`
- Envelope encryption: `packages/kms/lib/envelope.ts`
- Auth guide (ownership disclaimer): `docs/guides/auth/auth-guide.mdx`
- Provider catalog: `packages/providers/providers.yaml` (1,015 entries)
- Runtime footprint: `docker-compose.yaml`
