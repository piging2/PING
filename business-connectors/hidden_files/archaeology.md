# PING/FYD Business-Connectors Archaeology
Date: 2026-09-23 (MDT). Coordinator: ARCHAEOLOGY subagent. READ-ONLY forensics; nothing modified.

## SUMMARY

The repo has a real, tested, mostly-owner-build acquisition surface in `src/fyd/`
but NO executed general crawler and NO business-data provider adapters
(Google Business Profile, Yelp, Facebook Pages, Instagram) in the canonical
repo. Business data today enters FYD through three live paths only:
(1) website HTML fetch -> extraction pipelines (proceduralize, media,
onboarding), (2) RSS/Atom feed parsing, (3) manual/verified ingest fixtures.
All social-protocol work is ActivityPub-outbound (follow/unfollow federation)
plus harvest-only design docs for ATProto/Nostr; the `@atproto/api` npm dep is
installed but imported by ZERO source files. The one signed outbound social
channel lives in `src/fyd/social/` (PING journal envelope path, dev keys only).

The REAL business acquisition pipeline today is NOT in the repo: it is the
local machinery in `~/workspace/outreach/` (discovery scripts, JSONL prospect
store), `~/workspace/tandem/` (brief lifecycle, distill sweep, emit-observation
into PING), and `~/workspace/pig-fb/` (Pig SSH/CDP browser substrate), plus
Nolan's connected X OAuth (`custom.x` via `~/workspace/skills/x-api/`).

Largest gap: no implemented `AcquisitionAdapter` (types exist,
`src/fyd/acquisition/acquisition-adapter.ts`, implementation explicitly
deferred to a separate reviewable commit), no Facebook/IG/Google/Yelp read
adapters, no conditional-GET/etag resume, no polling scheduler.

## REPO ACCESS

- Canonical repo reached READ-ONLY via authorized helper
  `~/workspace/pig/pigwsl-run.sh` (SSH `pigwsl` -> WSL), path
  `/home/nolan/projects/ping`.
- HEAD: `e48ef710cb889bf4d59b833ef9766067a9e2bbf0` (WIP dirty files present;
  untouched per boundaries).
- Per-file commit SHAs captured with `git log -1 --format=%H -- <file>` and
  recorded as 12-char prefixes in the table.
- Secrets policy honored: `.env`/credentials/keys not read; env-var names
  noted only where they appear in source comments (KIT_API_KEY,
  FYD_SESSION_SECRET, FYD_DEV_KEY_DIR). No token values printed anywhere.

## INVENTORY TABLE

Format: file | symbol(s) | purpose | state read / written | failure paths |
restart behavior | tests | verdict

### A. Network boundary (canonical, fyd/net)

1. `src/fyd/net/safe-fetch.ts` (48dec1f11837) | `safeFetch*`, `SafeFetchResult`,
   `SafeFetchOptions`, `SafeFetchDeps` | THE one SSRF gate: scheme allowlist,
   credentialed-URL reject, per-hop DNS resolution rejecting private
   space (incl. 100.64/10 tailnet), max-5 redirects re-validated,
   content-type allowlist pre-check, content-length + streaming size abort,
   connect/overall timeouts | Reads: DNS, env opts. Writes: none |
   Typed `SafeFetchFail{reason}`; never throws for policy | Stateless |
   `src/fyd/net/__tests__` | **KEEP** (use as-is; sole network egress authority)

2. `src/fyd/net/rate-limit.ts` (48dec1f11837) | `TokenBucket`, `GenerationQuota`,
   `AnonymousGate` | Server-side abuse quotas for anonymous generation (onboarding
   order G) | Reads: none durable. Writes: in-memory maps only |
   Closed on budget exhaustion | Restart resets counters (documented,
   acceptable) | jest config present | **KEEP** (abuse boundary, NOT a
   provider rate-limit handler; no 429/backoff logic for upstream APIs)

3. `src/fyd/net/budgets.ts` (48dec1f11837) | `CrawlBudget`,
   `ANONYMOUS_CRAWL_BUDGET` (6 pages / 8MiB), `CrawlLedger`, `OriginSemaphore`,
   `DedupCache` (per-origin in-flight dedupe + TTL cache keyed by normalized
   URL) | Page/byte/concurrency budgets for anonymous server-side fetching |
   In-memory only | Fail-closed | Restart resets (documented) | tests present |
   **KEEP**

4. `src/fyd/media/safe-fetch.ts` (bd6d3306e6bf) | re-export of `../net/safe-fetch`
   | Shim so media pipeline compiles against the one canonical gate | n/a |
   n/a | n/a | n/a | **KEEP** (explicitly one implementation; do not duplicate)

### B. Acquisition design (types only, NO implementation)

5. `src/fyd/acquisition/acquisition-adapter.ts` (f40b3a3247c2) |
   `AcquisitionAdapter`, `AcquisitionRequest`, `AcquisitionPolicy`,
   `AcquiredObservation`, `PolicyDecision` | Contract: L0 policy gate -> L1
   static HTTP -> L2 bounded browser render -> L3 bounded discovery
   (sitemap/RSS/internal links, page budget) -> L4 AI interpretation (last
   resort, observations only) | Reads: none. Writes: none (types only) |
   Contract requires typed insufficiency before escalation; egress policy must
   be test-proven before any real fetch | n/a | No impl tests (none exist) |
   **ADAPT** (harvest the interface; implementation is the single highest-value
   build, requires separate reviewable commit per the module's own contract)

6. `src/fyd/proceduralize/ACQUISITION-STACK.md` (f40b3a3247c2) | Design doc |
   Version-verified evaluation: Crawl4AI 0.9.3 HARVEST design only (Docker
   server REJECT, LLM extraction REJECT, anti-bot circumvention REJECT),
   Playwright 1.63.0 HARVEST as L2 engine; egress/privacy policy; thin
   AcquisitionAdapter interface | Doc | n/a | n/a | n/a |
   **ADAPT** (decisions stand; Crawl4AI stays design-harvest, not a dependency)

7. `src/fyd/harvest/PUBLIC-SOCIAL-DATA-FABRIC.md` (8980625d0e7a) | Source
   capability matrix (ATProto ADOPT public-read+Jetstream subset, Nostr,
   Farcaster, ActivityPub; X API read 402 credits-depleted, GitHub custom
   credential 401 recorded as FL-20260921-012) | Harvest only, no code |
   n/a | n/a | n/a | **ADAPT** (source matrix for the connector wave)

8. `src/fyd/adapters/ATPROTO-HARVEST.md` (08cc39d65f07) | ATProto harvest table
   (lexicon ADOPT, strong-refs ADOPT, permission-pattern ADOPT w/ lineage to
   `src/lib/ping/grants.ts`) | Doc; explicitly no executable adapter code per
   Nolan 2026-09-21 directive | n/a | n/a | n/a | **ADAPT** (pattern harvest)

9. `src/fyd/harvest/IDENTITY-PROOF-EVIDENCE.json` (8980625d0e7a) | Evidence
   bundle for the harvest lane | Data | n/a | n/a | n/a | **KEEP** (evidence)

### C. Website extraction (live, tested)

10. `src/fyd/proceduralize/feed-parser.ts` (5da3aa9ced968) | `parseFeed`,
    `FeedItem`, `ParsedFeed` | RSS 2.0 + Atom -> `ParsedFact[]` (claimKind
    `feed_item`), fast-xml-parser, fail-closed (malformed/oversize -> null,
    never throw); 5MiB cap, 200 items, provenance = feed URL + GUID |
    Reads: AcquiredSource bytes. Writes: none | null on bad input | Stateless |
    `__tests__/feed-parser.test.ts` | **KEEP** (wire into acquisition pipeline
    as the L1 feed stage)

11. `src/fyd/proceduralize/structured-data.ts` (3fb4d121aa78) |
    JSON-LD/microdata/RDFa extraction | Structured-data -> claims |
    Reads: HTML. Writes: none | Fail-closed | Stateless | structured-data +
    structured-determinism tests | **KEEP**

12. `src/fyd/proceduralize/proceduralizer.ts` (cbb4358036f2) | `FactClass`,
    `ParsedFact`, `ClaimKind` | Deterministic observation -> evidence pipeline
    (AI interpretation is last resort per ACQUISITION-STACK) | Reads: acquired
    sources. Writes: evidence-backed objects | n/a | Stateless |
    proceduralizer + regression-corpus + service-extraction tests | **KEEP**

13. `src/fyd/onboarding/extractor.ts` (3e0248e2967f) | `PageEvidence`
    (title, description, headings, phone, email, address, services, hours,
    social) | Tiny evidence extractor over fetched HTML; observed-text only,
    strips script/style so injected markup cannot plant contact facts |
    Reads: HTML string. Writes: none | Missing fields -> null, never guesses |
    Stateless | extractor.test.ts | **KEEP** (contact-fact extraction for the
    business profile golden path)

14. `src/fyd/onboarding/anonymous-preview.ts` + `index.ts` (3e0248e2967f) |
    Order-G anonymous generation orchestration wiring net budgets/rate limits
    to extraction | Reads: fetched pages. Writes: none durable | Fail-closed |
    In-memory budgets reset on restart | anonymous-preview.test.ts | **KEEP**

15. `src/fyd/builder/source-refresh.ts` (60b77425614d23324ebcc7311a6970e3a52a69da) |
    `SOURCE_REFRESH_VERSION`, `SourceRefreshInput`, owner-layer digest proof |
    Re-ingest SOURCE layer without touching OWNER layer; owner-override
    collisions flagged, never silently merged | Reads: current + refreshed
    source graphs, owner layer. Writes: new source graph passthrough |
    Digest mismatch on owner layer = hard failure | Pure | source-refresh.test.ts |
    **KEEP** (refresh semantics the connector layer must respect)

### D. Media acquisition pipeline (live, tested)

16. `src/fyd/media/discover.ts` (bd6d3306e6bf) | `discoverImages`,
    `classifyRights`, `DiscoveredImage` | Image discovery from HTML via
    `node-html-parser` (img/srcset/og:image/JSON-LD/link-image_src) + rights
    classification (public-demo-source / unclear-reference-only /
    business-provided) | Reads: HTML. Writes: none | Pure | Stateless |
    discover.test.ts | **KEEP** (commodity parsing harvested, policy is FYD's)

17. `src/fyd/media/ingest.ts` (7aecdeb7c96f) | `ingestSiteMedia`, `IngestOptions`
    | SOURCE REF -> RIGHTS GATE -> SAFE FETCH -> DIGEST -> MEDIA OBSERVATION ->
    DERIVATIVES -> MEDIA OBJECT + manifest; unclear-reference-only bytes never
    fetched; deterministic content-addressed output | Reads: discovered refs.
    Writes: `<publicDir>/<sha256>/...`, manifest JSON | Failures become
    MediaObservations, never run-killing throws | Deterministic re-runnable
    (dedupe by digest) | pipeline-contract + pipeline-invariants + attach tests |
    **KEEP** (the model acquisition pipeline: rights-first, evidence-bound)

18. `src/fyd/media/run-ingest.ts` (7aecdeb7c96f) | CLI runner (`npx tsx
    run-ingest.ts <site>`) | Build-host runner; preview runs stamped
    `preview:true` and structurally incapable of becoming production truth |
    Reads: site pages. Writes: manifests | n/a | Manual invocation |
    n/a | **KEEP** (operational entry point; needs scheduler, not a rebuild)

19. `src/fyd/media/derivatives.ts` (7aecdeb7c96f via ingest SHA family) |
    `generateDerivatives`, `hashContentBytes` | sharp renditions (480/768/1600/blur
    10w, webp), magic-byte validation, decompression-bomb caps, SVG rejected |
    Reads: image bytes. Writes: derivative files | Throw on mislabeled bytes ->
    recorded failed | Deterministic | derivatives.test.ts | **KEEP**

20. `src/fyd/media/provenance.ts` (bd6d3306e6bf) | Provenance query surface
    (fyd-media@2) | Read-only projection over manifests; served by
    `src/app/api/fyd/media/route.ts`; full chain: source URL, observed_at,
    sha256, rights class | Reads: manifests. Writes: none | Deterministic |
    provenance.test.ts | **KEEP**

21. `src/fyd/media/site-bundle.ts` (490f5f7c415a) | `getPipelineManifest` |
    Production read path for manifests; rejects preview-marked manifests |
    Reads: manifest dir. Writes: none | Fail-closed | n/a | bundle-media.test.ts |
    **KEEP**

### E. Identity / OAuth / credential storage

22. `src/fyd/identity/provider.ts` (71a62464526c) | `OidcProviderId`
    ("google" only; Apple OFF by 2026-09-21 directive), `GoogleOidcConfig`,
    `buildAuthorizationUrl`, `codeChallengeFor`, `exchangeCodeForTokens`,
    `verifyGoogleIdToken` | OIDC provider seam; PKCE; scopes openid/profile/email
    only; provider tokens discarded after ID-token verification, never enter
    objects/journal/agent context | Reads: env (client id/secret server-only).
    Writes: none | `configured:false` + problems list when creds missing |
    Stateless | provider.test.ts, provider-seam.test.ts | **KEEP** (identity
    OAuth; note: this is USER auth, not business-data provider OAuth)

23. `src/fyd/identity/callback-flow.ts` (71a62464526c) | start/callback flows |
    Google OIDC start/callback with injected deps; route handlers stay thin |
    Reads/writes via injected store | Typed errors | Stateless |
    callback-flow.test.ts | **KEEP**

24. `src/fyd/identity/session.ts` (fae6c673f598) | `SESSION_COOKIE_NAME`,
    `OAUTH_STATE_COOKIE_NAME`, HMAC-signed sessions, CSRF tokens | Server-only;
    fails closed when `FYD_SESSION_SECRET` missing/placeholder; no provider
    tokens ever | Reads: env. Writes: cookies | Fail-closed | session.test.ts |
    **KEEP**

25. `src/fyd/identity/file-store.ts` (2bd0e4e71868) | File-backed binding store
    `data/fyd-identity/accounts/*.json` | Atomic writes (tmp+rename); one file
    per provider account; fills gap where no PING authority owns user binding |
    Reads/writes: data dir (FYD_IDENTITY_DIR override) | Atomic | Durable |
    file-store.test.ts | **KEEP** (credential-adjacent storage pattern to reuse)

26. `src/fyd/identity/mock-provider.ts` (416eb2dc231f) | `MockOidcProvider` |
    Test-only RS256 ID-token issuer + JWKS; exercises real verify path with no
    network | n/a | n/a | n/a | Test-only | **KEEP**

27. `src/fyd/identity/audit.ts` | `appendAuthAudit` | Auth audit log |
    Appends `src/fyd/identity/data/fyd-identity/audit.jsonl` | Append-only |
    Durable | n/a | **KEEP**

28. `src/lib/oauth.ts` (f6386ee16473) | `loadOAuthManifest`, `getProviderById`,
    `getEnabledProviders` | OAuth Authority Adapter over
    `src/config/oauth.v1.json` via AuthorityLoader | Reads: config JSON.
    Writes: none | Fallback empty manifest | Stateless | n/a | **UNKNOWN**
    (older PING-site OAuth manifest plumbing; verify live contents before reuse)

29. `src/lib/infrastructure/auth-manager.ts` (dba78c15aa5e) | `AuthConfig`,
    `AuthStatus`, `OAuthFlowResult` | Google/Vercel/GitHub OAuth flows;
    dynamic `googleapis` import; scopes gmail.send, drive.file, contacts,
    spreadsheets | Reads: env/secret stores. Writes: approved secure locations
    only (Vercel env, GitHub Secrets, Secret Manager, .env.local dev) |
    Detects missing auth, launches official popup, waits for user | n/a |
    n/a | **UNKNOWN** (agent-side infra auth; read fully before the connector
    wave touches Google APIs)

### F. Social outbound (signed, journal-backed)

30. `src/fyd/adapters/activitypub/index.ts` + `follow.ts` + `webfinger.ts` +
    `signing.ts` + `endpoints.ts` (all f61200c7d8ad) | `resolveAcct`,
    `buildFollowActivity`, `generateThrowawayKey`, `signActivityRequest`,
    `postToInbox`, `localOutboxEndpoint` | First open-protocol adapter: FYD
    follow/unfollow intent -> signed ActivityPub Follow/Undo via Fedify;
    WebFinger acct: resolution; HTTP Signatures; inbox delivery; local outbox
    deliberately fails closed (`not_implemented`) | Reads: remote actor docs.
    Writes: remote inboxes (POST) | Typed `ActivityPubAdapterError`
    (invalid_intent, webfinger_not_found, delivery_failed, network_error) |
    Stateless | follow-mapping.test.ts | **KEEP** (only provider-style write
    adapter in repo; model for future outbound connectors)

31. `src/fyd/social/actions.ts` (14ff033c5312) | follow/unfollow, dev identity
    minting | Writes via PING canonical path: signed bff-envelope@1
    RELATIONSHIP_CREATED to gateway, journaled; C1 content-hash action IDs
    (dedupe), C4 attestation gate re-reads journal before reporting success |
    Reads: journal. Writes: gateway events | attestation failure -> ok:false,
    never false success | Journal is durable | tests | **KEEP**

32. `src/fyd/social/envelope.ts` (14ff033c5312) | `buildSignedEnvelope`,
    `submitEnvelope`, `SignedSocialEnvelope` | Ed25519 over sorted-key
    canonical bytes {type,payload,metadata}; proof {algorithm,signature,publicKey};
    canonicalizer is verbatim dev port of `src/lib/ping/dev-signer.ts`
    (bff-envelope@1), separate from constitutional canonicalizeObject |
    Reads: dev private key (server only). Writes: gateway POST | Typed
    EnvelopeRejectedError | n/a | n/a | **KEEP**

33. `src/fyd/social/key-custody.ts` (14ff033c5312) | `storeFydKeypair`,
    `signAsFydIdentity`, `FydKeyNotFoundError` | Dev Ed25519 key custody:
    FYD_DEV_KEY_DIR, dir 0700, private.pem 0600, path-traversal guard on
    identity ids; mirrors BFF custody model | Reads/writes: key dir |
    Throws on missing key | Durable | n/a | **KEEP** (credential-storage
    pattern; DEV keys only, never Nolan's or a real person's)

34. `src/fyd/social/readers.ts` (14ff033c5312) | `readJournalEvents`,
    `readNetRelationships` | Journal-first social reads from gateway
    `GET /events/<TYPE>`; last-wins ordering; absent reads as absent |
    Reads: gateway. Writes: none | Throws on HTTP failure | Stateless | n/a |
    **KEEP**

35. `src/fyd/social/attestation-gate.ts` (14ff033c5312) | `attestRelationshipState`,
    `attestObjectCreated` | Failure-honesty gate: journal must carry claimed
    state before success is reported | Reads: journal. Writes: none |
    ATTESTATION_REJECTED with missing evidence named | Stateless | n/a |
    **KEEP**

36. `src/fyd/social/config.ts` (14ff033c5312) | `fydGatewayBaseUrl`,
    `fydDevKeyDir` | Gateway URL + key dir resolution from env with Pig-demo
    defaults | Reads: env. Writes: none | n/a | Stateless | n/a | **KEEP**

### G. Refresh / second-source lane (live, tested)

37. `src/fyd/refresh/website-observe.ts` (3f1c2a17ea9f) | `observeWebsite`,
    `extractRawFacts` | Fetched HTML -> provenance-labeled claims graded
    `website_statement`; pure, no network, no journal writes |
    Reads: HTML + fetch meta. Writes: none | Heuristic best-effort, notes kept |
    Stateless | tests | **KEEP** (the website second-source adapter shape)

38. `src/fyd/refresh/facebook-source.ts` (3f1c2a17ea9f) |
    `checkFacebookAvailability`, `fromFacebookCliJson`,
    `syntheticFacebookObservation` | Facebook second-source adapter:
    availability check (website outbound-link scan + authorized search +
    facebook-cli presence); REAL ingest path `fromFacebookCliJson` wired for
    the day an authorized page ID exists; labeled synthetic fixture proves
    conflict machinery | Reads: none live. Writes: none | Availability false ->
    synthetic, clearly labeled | Stateless | tests | **WIRE** (the seam is
    ready; `fromFacebookCliJson` is the exact function a Facebook connector
    must feed once an authorized read path exists)

39. `src/fyd/refresh/run-t2.ts` (3f1c2a17ea9f) | T2 refresh runner |
    Reads fetched HTML from disk -> observation -> snapshot persist -> diff vs
    previous -> conflict detection -> JSON report; NO journal writes |
    Reads: html file. Writes: snapshot dir | n/a | Manual tsx invocation |
    n/a | **WIRE** (needs a scheduler + live fetch feeding it, not a rewrite)

40. `src/fyd/refresh/conflict.ts`, `diff.ts`, `dependency-index.ts`,
    `snapshot-store.ts`, `types.ts` (3f1c2a17ea9f) | Conflict records,
    temporal diff (added/removed/changed), object->section dependency index,
    snapshot persistence, `normalizeClaimValue` | Second-source merge
    machinery: same entity/field, different normalized value, different source
    -> open Conflict, both claims kept, loser never deleted |
    Reads/writes: snapshot dir | n/a | Durable snapshots | tests | **KEEP**

41. `src/fyd/refresh/README.md` (3f1c2a17ea9f) | Lane doc | One-writer rule;
    documents 2026-09-21 finding: authorized Facebook data genuinely
    unavailable for the demo entity (no facebook.com outbound link, no
    business page surfaced, facebook-cli not installed on Pig) | Doc | n/a |
    n/a | n/a | **KEEP** (records the exact missing piece for FB wiring)

### H. Legacy PING-site integrations (not FYD acquisition)

42. `src/lib/kit.ts` (f6386ee16473) | `createSubscriber`, `addTagToSubscriber`,
    `enrollInSequence`, `fetchWithBackoff` | Kit (email) API V4 client;
    exponential backoff on 429 (1s*2^attempt, cap 5s, 3 retries); KIT_API_KEY
    from env | Reads: env. Writes: Kit API | 429 -> backoff; else throw |
    Stateless | kit.test.ts | **DEAD** for the connector wave (legacy
    HPP/newsletter plumbing; only upstream 429/backoff pattern worth noting)

43. `src/lib/kit-adapter.ts` (f6386ee16473) | `KitAdapter implements
    MarketingProvider` | Wraps Kit API, emits canonical marketing events |
    Reads: env. Writes: Kit API + HPP events | n/a | Stateless | kit.test.ts |
    **DEAD** for the connector wave (same legacy surface)

44. `src/lib/marketing-provider.ts` (f6386ee16473) | `MarketingProvider`,
    `CanonicalEvent` (LeadCaptured/TagApplied/...) | Marketing automation
    provider abstraction (Kit, etc.) | Interface only | n/a | n/a | n/a |
    **DEAD** for the connector wave (legacy; FYD connector events should use
    PING journal/OBSERVATION_CREATED, not this)

45. `src/app/api/kit/webhook/route.ts` (f6386ee16473) | `POST` | Inbound Kit
    webhook -> HPP event mapping (subscriber events -> NewsletterConfirmed
    etc. via `logEvent`, acquisitionSource "kit_webhook") | Reads: webhook
    body. Writes: HPP events | 400 invalid payload, 500 on failure; unmapped
    events logged | n/a | n/a | **DEAD** for the connector wave (only inbound
    webhook in repo; pattern reference at most)

46. `src/lib/sentiment/classifier-provider.ts` (f6386ee16473) |
    `ClassifierProvider` | Review-moderation classifier seam (VADER now;
    OpenAI/Claude/Gemini future) | Reads: review text. Writes: none |
    n/a | Stateless | n/a | **DEAD** for the connector wave (review pipeline
    seam, not a data connector; sentiment only)

47. `src/types/reviews.ts` (f6386ee16473) | `ReviewProvider`
    (manual/google/crm/imported/form), Canonical Review Model | Review model
    with adapter seam: "When Google comes online, only the adapter needs to be
    replaced" | Types only | n/a | n/a | n/a | **ADAPT** (canonical review
    model is KEEP-ready; the Google Reviews adapter it anticipates does NOT
    exist -> GAP)

48. `src/services/notification.ts` (f6386ee16473) | `NotificationService`,
    `mockNotificationService` | Interface only; mock logs in non-production |
    Writes: console | n/a | Stateless | n/a | **DEAD** (mock only; "Tomorrow:
    Gmail/Resend/Twilio" never built)

49. `src/lib/ping-api.ts` (f6386ee16473) | `Observation`, `KnowledgeResult` |
    PING API seam with explicitly UNCONNECTED implementation | Boundary only |
    n/a | n/a | n/a | **DEAD** (labeled unconnected; do not build on it)

50. `src/lib/api/client.ts` (dba78c15aa5e) | `ApiClient` | Generic backend
    HTTP client with optional Bearer <redacted> | Reads: none. Writes: backend
    calls | Throws on !ok | Stateless | n/a | **UNKNOWN** (generic; "designed
    for scalable connector integration" per docstring but no connector uses it)

51. `src/lib/blob-storage.ts` (f6386ee16473) | Vercel Blob + Upstash Redis |
    Media asset storage (original/WebP/AVIF/thumbnail), content-addressed,
    idempotency race fixes | Reads/writes: Blob + Redis | Typed verification
    errors | Durable | n/a | **KEEP** (storage connector, not acquisition)

52. `src/lib/media-kv-store.ts` (f6386ee16473) | Upstash Redis media KV |
    Media metadata KV | Reads/writes: Redis | n/a | Durable | assignment-store-kv
    tests adjacent | **KEEP** (storage)

53. `src/fyd/data/ping-object-source.ts` (ff449e30d807) | PING projection read
    seam | Reads canonical projection JSON from PING dump; fail-closed
    verification (siteId match, provenance refs non-empty, sha256 graphDigest
    over canonical JSON); never falls back to fixtures | Reads: projection
    file. Writes: none | Hard failure on missing/tampered | Stateless |
    n/a | **KEEP** (the projection intake seam refresh re-derivation feeds)

## ACQUISITION PIPELINE MAP

### In-repo (PING canonical repo @ e48ef710cb889bf4d59b833ef9766067a9e2bbf0)

```
Business website URL
  -> [NOT BUILT] AcquisitionAdapter impl (types: src/fyd/acquisition/acquisition-adapter.ts)
  -> manual/tsx fetch today
  -> feed-parser.ts (RSS/Atom) ──┐
  -> structured-data.ts (JSON-LD) ├─> proceduralizer.ts -> evidence-backed objects
  -> onboarding/extractor.ts (contact facts) ──┘
  -> media/discover.ts -> ingest.ts (rights gate -> safe-fetch -> digest -> derivatives)
       -> manifests/*.json -> provenance.ts -> /api/fyd/media
  -> refresh/website-observe.ts -> claims (website_statement)
  -> refresh/run-t2.ts -> snapshots -> diff.ts -> conflict.ts (vs facebook synthetic fixture)
  -> builder/source-refresh.ts (SOURCE re-derivation, OWNER digest-preserved)
  -> sitespec -> projection -> ping-object-source.ts (verified intake)
Social outbound: fyd/social/* -> signed bff-envelope@1 -> PING gateway journal
Open protocols: adapters/activitypub/* (follow/unfollow federation, Fedify)
Identity: fyd/identity/* (Google OIDC, HMAC sessions, file bindings)
```

### Real acquisition machinery (local workspace, feeds the outreach engine)

```
~/workspace/outreach/fb*-discover.py        -> FB discovery rounds -> fb*-candidates.json
~/workspace/outreach/ (research scripts,    -> JSONL prospect store + MD digest
  engagement-guard.py, email queues)
~/workspace/pig-fb/meta-pass.sh             -> meta.ai via Pig headed Chrome (CDP :9223)
  tandem/prompts/{a,b,c,d}-*.md             -> rotating research briefs
  tandem/build-context-pack.py               -> versioned context packs
  tandem/validate-meta-answer.py             -> shape gate (>=3 items, >1200 chars)
  tandem/distill-sweep.py                    -> dead-letter sweep
  outreach engine step 4e                    -> Muse verification gate (Meta output UNVERIFIED until here)
~/workspace/tandem/emit-observation.py       -> OBSERVATION_CREATED -> PING gateway
  (Bearer <redacted> resolved at runtime from gateway container env; never stored;
   duplicate-emission guard via sha256; drill mode with byte-identity preflight)
~/workspace/pig-fb/pig-ssh.sh                -> shared SSH (muse-ssh@100.79.154.43)
~/workspace/skills/x-api/bin/xapi.py         -> X API v2 via authd surrogate (custom.x):
  me | follow <id> (idempotent) | lookup <username> (~$0.01, browser-first)
  Note: /2/users/by/username returns 402 (credits depleted); writes need Nolan approval.
```

### What flows where today

- Prospect/business discovery: local scripts + Meta AI research -> verified by Muse
  -> JSONL in ~/workspace/outreach (NOT in PING; PING is not a lead DB per
  delegation architecture).
- PING journal: OBSERVATION_CREATED events via emit-observation.py only.
- FYD demo entities: hand-provisioned fixtures + live website fetches
  (happy-place-platform.vercel.app, coppersmith-plumbing raw HTML/RSS/sitemap
  under src/fyd/proceduralize/raw/).
- Facebook business data: NO live adapter; facebook-source.ts keeps
  `fromFacebookCliJson` wired for a future authorized page ID; facebook-cli not
  installed on Pig; sandbox reads need IDs from prior authorized output.

## GAPS (what FYD's golden path needs that nothing provides)

1. **AcquisitionAdapter implementation** (highest value): types + L0-L4 contract
   exist; no code. Must prove egress policy with tests first (per module
   contract), then L1 static fetch via `fyd/net/safe-fetch`, L2 Playwright
   fallback, L3 sitemap/RSS discovery, robots.txt honoring (policy field
   `requireRobotsTxt` exists but no robots parser anywhere in repo).
2. **Facebook/Instagram read connector**: no adapter; seam ready at
   `refresh/facebook-source.ts::fromFacebookCliJson`; blocked on authorized
   page/profile ID + facebook-cli on Pig (or Graph API token path).
3. **Google Business Profile connector**: no code; `ReviewProvider.google`
   enum anticipates it; GBP API needs OAuth (business.manage scope) -> the
   `fyd/identity` OIDC lane is user-auth shaped, not business-data OAuth.
4. **Yelp/real reviews connector**: no code; canonical review model ready
   (`src/types/reviews.ts`) with no adapter behind it.
5. **Conditional GET / resume**: no etag/last-modified/if-none-match usage
   anywhere; `refresh/snapshot-store.ts` persists snapshots but re-fetch is
   full re-fetch.
6. **Polling/scheduler**: no cron-shaped acquisition runner in repo; refresh
   runs are manual `tsx` invocations; scheduling lives in local crons outside
   the repo.
7. **ATProto public-read connector**: ADOPT decision recorded, zero code;
   `@atproto/api@0.20.44` installed but unimported (dead weight or future use).
8. **Rate-limit handling for UPSTREAM provider APIs**: `net/rate-limit.ts`
   is a server-side abuse gate, not a 429/backoff client; only `lib/kit.ts`
   has fetchWithBackoff and it is legacy. Any new provider client needs its
   own backoff/quota (harvest kit.ts pattern).
9. **Webhook receivers**: only the legacy Kit webhook route exists; no
   provider webhook ingestion (e.g. GBP notifications, FB webhooks).
10. **Entity resolution across sources**: `src/fyd/resolve/spike/*`
    (EXACT/AMBIGUOUS/UNMATCHED) exists per harvest doc; identity.join key
    conventions per-source (DID/npub) are documented but no resolver wires
    sources to FYD objects.

## NEXT HIGHEST-VALUE PACKET

Build the `AcquisitionAdapter` L0+L1 implementation as the separate
reviewable commit its own contract demands:
- L0 policy gate (allowlist domains, no credentialed URLs, block private
  nets, robots.txt fetch+honor, content-type allowlist, size/timeout budgets)
  reusing `src/fyd/net/safe-fetch.ts` as the only fetch primitive.
- L1 static HTTP fast path emitting `AcquiredObservation` (with evidenceHash
  sha256, policyNotes, escalation record).
- Test-proof of the egress policy BEFORE any real fetch (the module's explicit
  acceptance condition).
- Then wire L1 output into `proceduralize/feed-parser.ts`,
  `structured-data.ts`, and `onboarding/extractor.ts` so a fetched business
  homepage flows observations -> evidence without new parallel machinery.
- Do NOT build L2/L4 in the same packet; L3 discovery is the second packet
  (sitemap/RSS via feed-parser.ts is already live code to reuse).

## LEDGER (inspected, read-only)

Repo remote greps (semantic families, node_modules excluded): connector/adapter/
provider/oauth/token/credential/vault/apikey (179 files hit, top 40 listed);
scrape/crawl/fetch/ratelimit/backoff/webhook/polling/etag (138 files hit, top
40 listed); normalize/canonicalize/transform/mapper/parse/extract (40 listed);
review/yelp/google-business/facebook/instagram (50 listed); dependency-usage
greps for @atproto/api/@fedify/fedify/googleapis/node-html-parser/
fast-xml-parser/@upstash/redis/@vercel/blob; webhook/etag usage greps;
adapter-dir find.
Files read (head/cat, full or partial): acquisition-adapter.ts,
ACQUISITION-STACK.md, ATPROTO-HARVEST.md, PUBLIC-SOCIAL-DATA-FABRIC.md,
IDENTITY-PROOF-EVIDENCE.json (listed), activitypub/{index,follow,webfinger,
signing,endpoints}.ts, net/{index,safe-fetch,rate-limit,budgets}.ts,
media/{discover,ingest,run-ingest,derivatives,provenance,site-bundle,safe-fetch}.ts,
proceduralize/feed-parser.ts, onboarding/{extractor,index,anonymous-preview}.ts,
builder/source-refresh.ts, identity/{provider,callback-flow,session,file-store,
mock-provider}.ts, social/{config,readers,actions,envelope,key-custody,
attestation-gate}.ts, refresh/{README,facebook-source,website-observe,run-t2}.ts,
data/ping-object-source.ts, lib/{kit,kit-adapter,marketing-provider,oauth,
infrastructure/auth-manager,blob-storage,media-kv-store,api/client,ping-api,
sentiment/classifier-provider}.ts, app/api/kit/webhook/route.ts,
types/{reviews,oauth}.ts, services/notification.ts. Git SHAs captured for 46
files via `git log -1 --format=%H`.
Local: ~/workspace/outreach (listing), ~/workspace/tandem/emit-observation.py
(docstring), ~/workspace/pig-fb/pig-ssh.sh, ~/workspace/skills/x-api/{SKILL.md,
bin/xapi.py}. No writes to the repo; no secrets read or printed.
