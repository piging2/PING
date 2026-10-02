# SUBSTRATE MAPPING — Part 2 (Agent 16)

Each Part-1 source mapped onto the built substrate. Consumes, never
duplicates: BCQ contract test kit (18/18 green, ErrorClass now the lane-K
13 classes), lane L secret broker (opaque cap_ handles, execute(handle,fn)
trusted seam, proxy mode), lane K 13-class taxonomy, lane R fixture lab
(ping.ingest.fixture@1, 5 passing fixtures), lane M source registry
(derivable, never canonical), lane J run records.

Contract surfaces referenced are the testkit verbs: connect, discover,
checkpoint, read, normalize, refresh, disconnect, health, rate_limit_state.

## Per-source substrate map

### 1. Git ingestion

- Contract surfaces: connect (none-credential: local path or deploy key
  ref), discover (refs list), checkpoint (OLD HEAD SHA per ref, kind:
  opaque-delta), read (OLD..NEW commit walk), normalize (commit ->
  observation), refresh (conditional: HEAD unchanged -> zero observations),
  disconnect (release mirror), health (fetch freshness vs expected cadence),
  rate_limit_state (n/a local; provider git hosts: declared budget).
- Fixtures needed from lane R: git-force-push-full-resync (corrupt cursor
  analog), git-same-head-twice (idempotency: zero new observations),
  git-hostile-refname (banned invocations: checkout/submodule attempts
  fail closed). Lane A already owns redteam.mjs; propose these three as
  ping.ingest.fixture@1 additions.
- Dominant error classes: SOURCE_UNAVAILABLE (host down), TIMEOUT (large
  clone/fetch), INVALID_PAYLOAD (corrupt mirror, non-ancestor forced push),
  PERMANENT (repo deleted at host -> confirmed 404). Auth classes only
  for private repos over SSH/HTTPS (AUTH_REQUIRED/EXPIRED).
- Lane-L handle plug: private repos only. SSH deploy key or HTTPS token
  held by the broker; handle bound to (tenant, source, operations:
  ["read:refs","read:objects"]). Public mirrors: none-credential.
- Registry: checkpoint kind opaque-delta (HEAD SHA); quarantine on
  non-ancestor movement per §5.3 procedure.

### 2. GitHub

- Contract surfaces: fully mapped by the CONN-GITHUB adapter (18/18
  green). connect (CredentialRef -> AUTHORIZED), discover (7 streams),
  checkpoint (ETag/page-cursor/delivery-id), read, normalize, refresh
  (If-None-Match 304), disconnect (REVOKED), health, rate_limit_state
  (X-RateLimit headers after every call).
- Fixtures needed: covered by lane R (github-issues-paginated,
  flaky-429-then-success, webhook-duplicate-delivery) plus
  schema-drift-quarantine and cursor-corruption-full-resync. Remaining:
  github-403-permission-vs-ratelimit (the two-403 disambiguation as a
  fixture), github-app-token-expiry (installation token 1h TTL ->
  AUTH_EXPIRED -> single refresh).
- Dominant error classes: RATE_LIMITED (primary + secondary limits;
  the 403-with-zero-remaining case), PERMISSION_DENIED (missing scope /
  not accessible by integration), AUTH_EXPIRED (installation token
  expiry), SOURCE_CHANGED (API version sunset, endpoint retirement).
- Lane-L handle plug: GitHub App installation token or OAuth token via
  broker; execute(handle, fn) in the worker seam; proxy mode preferred
  (transport injects Authorization, worker never holds the token).
  Scopes requested at connect: read-only minimum (repo metadata,
  issues, PRs read).
- Registry: per-stream ETag/cursor checkpoints; webhook deliveries do
  not advance poll checkpoints (push-never-replaces-polling).

### 3. Google Drive

- Contract surfaces: connect (OAuth credentialRef, scopes recorded),
  discover (drives list + root folder tree), checkpoint (newStartPageToken
  per drive, kind: opaque-delta), read (changes?pageToken, then
  files.get/export per changed file), normalize (file -> observation),
  refresh (conditional on changes feed; 410 -> typed FULL_RESYNC),
  disconnect (revoke -> evidence marked source_revoked_at), health
  (degraded when one drive errors, others continue), rate_limit_state
  (Drive quota headers; 403 rateLimitExceeded vs 403 insufficient
  permissions disambiguated per lane-K rule).
- Fixtures needed: drive-changes-paginated (nextPageToken chain ending
  in newStartPageToken), drive-token-expired-410 (stale pageToken ->
  FULL_RESYNC -> re-anchor), drive-export-formats (Docs/Sheets/Slides
  export MIME matrix), drive-shared-drive-permission-error (per-folder
  error does not fail the sync), drive-watch-notify-then-poll
  (x-goog-* headers trigger changes.list).
- Dominant error classes: RATE_LIMITED (quota), PERMISSION_DENIED
  (file not shared with the authorized account; shared-drive ACL),
  INVALID_PAYLOAD (stale pageToken 410), AUTH_EXPIRED (revoked grant),
  SCHEMA_CHANGED (files resource shape drift).
- Lane-L handle plug: OAuth2 access+refresh pair in broker custody
  (encrypted at rest); single-flight refresh; handle scope
  operations: ["read:changes","read:files","export:workspace"].
  Requested scopes at connect: drive.readonly (+ drive.metadata.readonly
  if metadata-only mode is ever split out; v1 takes drive.readonly).
- Registry: checkpoint = {kind: opaque-delta, value: newStartPageToken,
  valueSha256}; quarantine on 410 per lane M §5.3.

### 4. Email (Gmail)

- Contract surfaces: connect (OAuth credentialRef), discover (labels
  list), checkpoint (mailbox historyId, kind: opaque-delta),
  read (history.list delta, messages.get full for added ids),
  normalize (message -> observation; label flips -> state-change
  observations), refresh (history.list from cursor; 404 -> drop cursor
  -> full re-enumeration), disconnect (revoke; evidence kept),
  health, rate_limit_state (Gmail quota: per-user rate limits;
  429 honored).
- Fixtures needed: gmail-history-delta (messagesAdded/labelsAdded/
  labelsRemoved/messagesDeleted mix), gmail-history-expired-404
  (cursor aged out -> full re-enumeration -> re-anchor), gmail-watch
  (Pub/Sub notification triggers history.list), gmail-partial-labels
  (labelIds absent -> re-fetch, never read absence as empty).
- Dominant error classes: INVALID_PAYLOAD (expired historyId 404),
  RATE_LIMITED (per-user quota), AUTH_EXPIRED (revoked grant),
  PERMISSION_DENIED (scope insufficient for a label, e.g. restricted
  labels). IMAP fallback adds TIMEOUT and SOURCE_UNAVAILABLE.
- Lane-L handle plug: OAuth2 pair in custody; handle scope operations:
  ["read:history","read:messages"]. Requested scope: gmail.readonly
  (v1 read-only; gmail.modify only if send/label-write is ever a
  demonstrated feature, which it is not tonight).
- Registry: checkpoint = {kind: opaque-delta, value: historyId};
  historyId is monotonic, so a regression check (new < old) is cheap
  and feeds the lane-M monotonicity rule.

### 5. Web (arbitrary sites)

- Contract surfaces: connect (none-credential for public), discover
  (URL list from sitemap/RSS where offered, else explicit registration),
  checkpoint (ETag/Last-Modified/content-hash per URL), read
  (safe-fetch ladder), normalize (extraction -> claims), refresh
  (conditional; 304 = freshness only), disconnect (stop scheduling),
  health (fetch success rate, robots posture), rate_limit_state
  (per-host politeness budget, Crawl-delay honored).
- Fixtures needed: owned by lane D + lane R. Proposed additions:
  web-304-not-modified (zero observations, freshness clock), web-410-gone
  (deletion observation), web-robots-disallow (PAUSE not delete),
  web-hostile-html (sanitize.hostile_html already in testkit),
  web-sitemap-lastmod (change signal).
- Dominant error classes: SOURCE_UNAVAILABLE (host down, DNS),
  TIMEOUT (slow host), PERMISSION_DENIED (robots disallow, 403 with no
  rate-limit signal), SOURCE_CHANGED (site redesign breaking selectors
  -> SCHEMA_CHANGED on the extraction contract), TRANSIENT (flaky).
- Lane-L handle plug: none for public web. Authenticated sources
  (paywalled partner sites) use a handle scoped to that host with
  operations ["read:page"]; the broker holds the session/API key.
- Registry: per-URL checkpoint; content-hash dedup means most runs are
  freshness-only (cheap).

### 6. RSS

- Contract surfaces: connect (none), discover (feed URL validation +
  feed discovery from page URL), checkpoint (ETag/Last-Modified/newest
  guid, kind: cursor), read (conditional GET), normalize (item ->
  observation, sanitize), refresh (poll; TTL-hint bounded cadence),
  disconnect, health (fetch health + item velocity anomaly flag),
  rate_limit_state (per-feed floor, default 15min).
- Fixtures needed: rss-new-items (guid dedup across polls), rss-guid-reuse
  (content changed under stable guid -> OBJECT_UPDATED), rss-no-guid
  (fallback key sha256(feed|link|title)), rss-hostile-content
  (sanitization), rss-feed-window (old items falling out of the window
  are NOT deletions).
- Dominant error classes: SOURCE_UNAVAILABLE (feed host down),
  TRANSIENT (flaky feed), SCHEMA_CHANGED (feed format drift breaking
  the parser), PERMANENT (feed URL 404/410 confirmed retired).
- Lane-L handle plug: none (public feeds). Authenticated feeds (private
  podcast/B2B feeds) use a handle with operations ["read:feed"].
- Registry: checkpoint per feed; deletion is never inferred from
  absence (inventory rule), so the registry needs no tombstone path
  for RSS.

### 7. Files (local uploads)

- Contract surfaces: connect (upload session), discover (n/a),
  checkpoint (n/a: event-driven), read (intake), normalize
  (MIME verify -> EXIF strip -> extract), refresh (re-extract on
  normalizer bump), disconnect (close session), health (intake
  health), rate_limit_state (upload size/rate budgets).
- Fixtures needed: owned by lane P + lane R. Proposed: upload-svg-rejected
  (boundary reject), upload-exif-stripped (GPS-in -> zero-EXIF-out),
  upload-duplicate-bytes (second upload -> provenance link only),
  upload-polyglot (re-encode destroys payload).
- Dominant error classes: INVALID_PAYLOAD (bad bytes, MIME mismatch),
  PERMANENT (quarantined hostile file), TIMEOUT (large upload).
- Lane-L handle plug: uploads carry the uploader's session, not a
  provider credential; no broker handle needed. Extracted text inherits
  the upload session provenance.
- Registry: no checkpoints (event-driven); normalizerVersion tracked
  per blob for re-extraction passes (lane M §5.4).

### 8. External APIs (generic)

- Contract surfaces: the full nine, driven by declarative stream
  definitions in the connector manifest (BCQ-validated). discover =
  manifest stream list; checkpoint = per-stream Airbyte-envelope cursor;
  refresh = read from stored cursor; the rest as in §2.
- Fixtures needed: covered by lane R's existing five (pagination,
  429-then-success, webhook duplicates, cursor corruption, schema
  drift) which were DESIGNED as the generic reference set. Per new
  provider: one happy-path paginated fixture + one provider-native
  error fixture (e.g. provider-specific 403 body -> PERMISSION_DENIED).
- Dominant error classes: provider-dependent; the mapping table each
  stream definition carries: HTTP 429 -> RATE_LIMITED; 401 expired ->
  AUTH_EXPIRED; 403 disambiguated by provider signals; 200-with-bad-
  shape -> SCHEMA_CHANGED; 404-once-valid -> SOURCE_CHANGED or
  PERMANENT by evidence.
- Lane-L handle plug: per-provider credential in custody; the generic
  reader calls execute(handle, fn) with the stream's declared
  operations; proxy mode where the transport supports it (Nango
  pattern), ephemeral mode otherwise.
- Registry: per-stream Airbyte-envelope checkpoints; replacement-
  connector adoption rule (envelope is portable across connector
  implementations).

### 9. Business data (GBP/Stripe/QuickBooks-class)

- Contract surfaces: mapped by the sibling GBP connector
  (BUSINESS-CONNECTOR.md §2.1): connect (OAuth ref or fixture ref;
  DISABLED without GBP approval), discover (fixed streams),
  checkpoint (opaque pageToken / (updateTime,name) watermark),
  read, normalize (sanitize-then-coerce, 10KB cap, quarantine on
  uncoercible), refresh (conditional ETag / watermark-incremental),
  disconnect (REVOKED; evidence kept), health (per-leg status),
  rate_limit_state (300 QPM post-approval; 0 pre-approval).
- Fixtures needed: sibling proved GBP fixture-end-to-end; lane R to
  add stripe-webhook-duplicate (constructEvent id dedup), stripe-test-
  vs-live-separation (two source records, no mixing), quickbooks-
  throttle (throttled 429 with retry guidance).
- Dominant error classes: PERMISSION_DENIED (GBP reviews leg
  403 SERVICE_DISABLED -> degrade leg to UNKNOWN, designed state),
  AUTH_EXPIRED (OAuth revoke; Square merchant uninstall -> PERMANENT
  per lane-K scenario 8), RATE_LIMITED (429 honored), INVALID_PAYLOAD
  (bad stored cursor).
- Lane-L handle plug: OAuth pairs per provider in custody; Stripe
  restricted keys as handle-bound secrets; test-mode and live-mode
  material NEVER share a handle scope (separate credentialRef,
  separate source records).
- Registry: per-stream checkpoints; connectionState cache mirrors
  broker status (invalid -> health down -> owner notified with the
  exact remediation).

## Substrate gap analysis (what is missing, not what exists)

1. Nango evaluation doc: the BCQ-NANGO worker is still running; no doc
   on disk as of this write. The proxy-mode pattern is referenced by
   lane L and lane-conn16 but its ADOPT/ADAPT/REJECT verdict is not
   recorded. GAP: record the verdict before any connector takes a
   production dependency on Nango. (Vendor veto gate applies.)
2. lane-K taxonomy enum is published (13 classes) but the testkit
   reconciled only after the GitHub adapter run; any NEW connector
   adapter must import the enum, not a copy. GAP: single import path
   documented for future adapters.
3. Fixture coverage for git ingestion (force-push, same-head-twice,
   hostile refname) and Drive/Gmail/RSS happy paths does not exist
   yet in lane R. The generic five cover the MECHANISMS; per-source
   happy-path fixtures are still needed for the morning connect wave.
4. Event names (SOURCE_REGISTERED etc.) are lane-M proposals awaiting
   phase0 confirmation. Connectors must not hard-code them; they must
   read them from the phase0-published contract when it lands.

## Shared record lines

DOMAIN: substrate | COMPONENT: connector-mapping | CLAIM: every Part-1
source maps onto the 9 testkit verbs with no new contract surface needed
| EVIDENCE: per-source table in this doc; testkit contract.py verb list
| CALLER: agent 16 | CALLEE: future connector lanes | WRITER: agent 16
| READER: coordinator, convergence auditor | AUTHORITY: agent 16
| CLASSIFICATION: DESIGN-PROPOSAL | CONFIDENCE: 0.85 | BROKEN BOUNDARY: none
| DEPENDENCIES: lane-bcq testkit, lane-l broker, lane-k taxonomy, lane-r
lab, lane-m registry, lane-j runs | AFFECTS AGENTS: all future connector
workers

DOMAIN: substrate | COMPONENT: secret-broker | CLAIM: the lane-L handle
plugs in at connect() (credentialRef) and at fetch time via
execute(handle,fn); no connector holds raw material in proxy mode
| EVIDENCE: lane-l/SECRET-BROKER-DESIGN.md §5-6 | CALLER: agent 16
| CALLEE: lane L | WRITER: agent 16 | READER: future connector workers
| AUTHORITY: agent 16 | CLASSIFICATION: CONSUMED-NO-DUPLICATION
| CONFIDENCE: 0.95 | BROKEN BOUNDARY: none | DEPENDENCIES: lane-l design
| AFFECTS AGENTS: none

DOMAIN: substrate | COMPONENT: fixtures | CLAIM: lane R's 5 fixtures are
the generic reference set; 14 per-source fixtures proposed (3 git, 2
github, 5 drive, 4 gmail, 5 rss, 4 upload, 3 business); none implemented
tonight | EVIDENCE: this doc §gap-3; lane-r fixture list | CALLER: agent 16
| CALLEE: lane R | WRITER: agent 16 | READER: lane R owner, coordinator
| AUTHORITY: agent 16 | CLASSIFICATION: GAP-RECORDED | CONFIDENCE: 0.8
| BROKEN BOUNDARY: none | DEPENDENCIES: lane-r FIXTURE-FORMAT.md
| AFFECTS AGENTS: lane R worker (fixture backlog)

DOMAIN: substrate | COMPONENT: error-taxonomy | CLAIM: per-source dominant
classes identified; the 403 disambiguation rule (rate-limit headers
FIRST) is the highest-risk classification point across GitHub, Drive,
and generic APIs | EVIDENCE: lane-k §2.3/2.4 + scenario 1-2 | CALLER:
agent 16 | CALLEE: future connector lanes | WRITER: agent 16
| READER: coordinator | AUTHORITY: agent 16 | CLASSIFICATION: RISK-FLAG
| CONFIDENCE: 0.9 | BROKEN BOUNDARY: none | DEPENDENCIES: lane-k taxonomy
| AFFECTS AGENTS: future connector workers

DOMAIN: substrate | COMPONENT: nango-eval | CLAIM: Nango ADOPT/ADAPT/REJECT
verdict not yet recorded on disk; no connector may take a production
dependency on it before the verdict | EVIDENCE: lane-bcq dir listing
(no nango doc as of 2026-09-23 night) | CALLER: agent 16 | CALLEE: BCQ-NANGO
worker, coordinator | WRITER: agent 16 | READER: coordinator
| AUTHORITY: agent 16 | CLASSIFICATION: GAP-RECORDED | CONFIDENCE: 0.95
| BROKEN BOUNDARY: none | DEPENDENCIES: BCQ-NANGO worker output
| AFFECTS AGENTS: coordinator (gate), future connector workers
