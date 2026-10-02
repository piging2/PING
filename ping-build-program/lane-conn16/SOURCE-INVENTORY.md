# SOURCE INVENTORY — Connector / Git Ingestion (Agent 16)

Lane: lane-conn16 (agent 16, CONN-BUSINESS sibling worker). Status: INVESTIGATION
COMPLETE, read-only. No implementation tonight per mission (Event/Witness
certification pending). This doc extends, never redoes: lane A (git), lane-conn
GitHub/GBP (sibling lanes), lane D (web acquisition), lane P (media), lane BCQ
(Nango/Airbyte evaluation), lane L (secret broker), lane R (fixtures).

Constitutional position (all sources): provider data is OBSERVATION. It becomes
EVIDENCE after normalization and redaction, resolves against the object graph,
and only the Event Authority (phase0) writes canonical events. No connector
writes canonical PING state directly.

Per-source record fields used below:
- source identity: how the source is addressed/identified in the registry
- acquisition mechanism: how bytes are pulled
- evidence shape: what the normalized observation looks like
- event mapping: which canonical event names observations feed toward
  (phase0 names pending; lane M proposes SOURCE_* operational events)
- provenance requirements: what the provenance envelope must carry
- dedup strategy: what makes re-fetch safe
- refresh/incremental semantics: cursor kind and advance rules
- deletion handling: how provider deletes are observed without erasing history
- replay semantics: what re-running from an old checkpoint guarantees

Canonical event names referenced (SOURCE_REGISTERED etc.) come from lane M's
SOURCE-REGISTRY-DESIGN.md and await phase0 confirmation.

## 1. Git ingestion (lane A — DELTA on existing work)

State found: lane A spike exists (spike/engines/gitcli.mjs over git CLI
plumbing with config isolation, spike/engines/iso.mjs over isomorphic-git,
spike/lib/common.mjs, fixtures/make-repo.mjs + make-hostile.mjs, redteam.mjs,
packets in spike/out/packet-cli.json and packet-iso.json). STATE.md is
BUILDABLE; the STATE ledger records NEXT steps but the spike run artifacts are
already on disk. This section deltas that work, does not redo it.

- source identity: repo URL (or local path) + ref name (branch/tag) + tenant.
  Stable source id: `git-` + sha256(tenant | repoUrl | ref).
- acquisition mechanism: read-only git CLI plumbing against a bare mirror
  (no checkout, no recurse-submodules; redteam bans those). Two proven
  engines: git CLI plumbing (config-isolated) and isomorphic-git. Pull
  commit metadata (SHA, author, author/committer dates, message, parents),
  changed paths (diff name-status), and ref snapshots (HEAD + ref tips).
- evidence shape: AcquiredObservation-shaped records (lane A STATE cites
  `src/fyd/acquisition/acquisition-adapter.ts`): one observation per commit
  (commit metadata + changed-path list), one per ref movement (old -> new).
  Each carries evidenceHash (canonicalizeJson via dev-signer precedent).
- event mapping: commit -> evidence -> OBJECT_CREATED/UPDATED on a PING
  `git-commit` derived object; changed path -> file evidence; ref move ->
  RELATIONSHIP_CREATED/UPDATED. Canonical events come from phase0 names;
  lane A already wires toward the gateway CanonicalEvent vocabulary.
- provenance requirements: commit SHA (native id), repo URL, ref name,
  author/committer identity, author/committer timestamps, parent SHAs,
  fetch timestamp, fetch attempt id, connector version. Ref snapshot
  (ref -> SHA map at fetch time) for replay.
- dedup strategy: commit SHA is the natural idempotency key (content
  addressed). Same-commit-twice -> no duplicate knowledge (lane A NEXT
  step 4; packets already JSONL).
- refresh/incremental semantics: cursor = OLD HEAD SHA. Each run: list
  commits in OLD..NEW (topological), emit observations, advance cursor
  only after journal commit (commit-first advance, lane M §5.2). Forced
  pushes (old HEAD not an ancestor of new HEAD) are the corruption case:
  treat as lane-K INVALID_PAYLOAD on the cursor -> quarantine -> full
  re-derive (re-walk reachable history from new HEAD).
- deletion handling: deletions are observed as diff entries
  (deleted path), never as object purges. A file deleted in git emits a
  deletion observation; the canonical graph keeps the history and marks
  the field/object superseded (lane N supersede chain), never erased.
- replay semantics: given a ref snapshot (ref -> SHA at time T) and the
  bare mirror, a run is fully reproducible: same SHAs in, same packet out
  byte-for-byte. Packets are JSONL and content-pinned by evidenceHash.

DELTA vs lane A STATE.md: the spike engines/fixtures/redteam/packets exist
on disk but STATE.md lists "build minimal spike" under NEXT as if pending.
Recommendation for lane A owner: flip NEXT steps 3-6 to TESTED/PROVEN or
record why the existing artifacts do not satisfy them.

## 2. GitHub (lane-conn CONN-GITHUB — SUMMARY, no rework)

Design complete (GITHUB-CONNECTOR.md v0.1): 7 objects mapped
(GITHUB <object> -> GITHUB OBSERVATION -> EVIDENCE -> RESOLUTION -> PING
<object>): repo metadata, issue, PR, review, workflow run, release,
remote branch state. Live spike hit octocat/Hello-World (5 issues, 4
requests, ETag 304 revalidation with zero observations). 9/9 failure
tests pass. Testkit wiring follow-up green 18/18 (adapter.py).

- source identity: `github` + tenant + owner/repo (providerInstanceId).
- acquisition mechanism: REST API v3 (read-only), stdlib-equivalent thin
  client (~150 lines per harvest verdict); production ports to
  safe-fetch.ts + lane-L AuthBroker. Poll per stream; webhook receiver
  for push (signature-verified), push-never-replaces-polling.
- evidence shape: NormalizedObservation (testkit contract.py): one per
  GitHub object, with provenance (provider=github.com, source_record_id,
  fetched_at, fetch_attempt_id, connector_version) and confidence grade.
- event mapping: issue/PR/review/run/release/branch observations feed
  resolution into PING objects; GitHub ids travel as graded link records
  (ADDRESSING), never canonical identity.
- provenance requirements: node id / numeric id, updated_at, ETag of the
  response, rate-limit state at fetch time, webhook delivery id when
  pushed.
- dedup strategy: idempotency key
  sha256(connectorId | streamId | externalObjectId | externalRecordVersion)
  (BCQ formula, lane R). Duplicate webhook delivery (same eventId, new
  deliveryId) absorbed by eventId dedup.
- refresh/incremental semantics: ETag conditional refresh per pollable
  object (304 = freshness clock only); since=/Link rel=next page cursors;
  webhook delivery IDs for push; typed FULL_RESYNC on invalidation.
  Cursors stored verbatim, never parsed (registry Checkpoint kind:
  etag/cursor/opaque-delta).
- deletion handling: deleted issue/PR/repo -> deletion observation
  (testkit input.deletion); history never erased; object marked
  superseded with the deletion evidence attached.
- replay semantics: ETag + since cursors are replayable; webhook fixture
  github-issues-paginated in lane R proves duplicate-delivery absorption
  and pagination under failure injection.

## 3. Google Drive

- source identity: `google-drive` + tenant + account email (providerInstanceId).
- acquisition mechanism: Drive API v3. `GET /changes/startPageToken` once,
  then `GET /changes?pageToken=<cursor>` with `includeRemoved=true`;
  response carries `newStartPageToken` when caught up (save for next run).
  Workspace file content via `files.export` (Docs -> text/plain, Sheets ->
  text/csv, Slides -> text/plain); binary via `files.get?alt=media`.
  Push leg: `changes.watch` (x-goog-* headers); notifications carry NO file
  payloads, so push triggers a changes.list poll. Shared drives need
  `supportsAllDrives=true`, `includeItemsFromAllDrives=true`, `corpora=drive`.
  Evidence: Google Drive API changes feed is cursor-based by design
  (per current API references; Nango webhook docs confirm the
  notify-then-poll pattern).
- evidence shape: one observation per changed file: fileId (stable
  provider id), name, mimeType, modifiedTime, size, parents, trashed flag,
  removed flag (deletions), content hash (sha256 of exported bytes),
  export link or content ref. Metadata fetch and content fetch are
  separate observations joined by fileId + modifiedTime.
- event mapping: file -> evidence -> PING document/media object;
  modifiedTime change -> OBJECT_UPDATED; trashed/removed -> deletion
  observation -> supersede/tombstone; folder move -> RELATIONSHIP update.
- provenance requirements: fileId, driveId (or myDrive), revisionId when
  fetching a specific revision, modifiedTime, mimeType, export format used,
  changes pageToken that surfaced it, fetch attempt id. Provider ids are
  graded ADDRESSING.
- dedup strategy: fileId + (modifiedTime | revisionId) as version key;
  content hash skip on re-fetch (hash of exported bytes identical -> no
  new observation). Revision pinning via `files/{id}/revisions/{revId}`
  with keepForever for evidence-grade captures.
- refresh/incremental semantics: cursor = newStartPageToken (opaque
  string, lane-M Checkpoint kind: opaque-delta). Advance only after
  journal commit. Expired/invalid token (HTTP 410) -> lane-K
  INVALID_PAYLOAD -> quarantine cursor -> bounded full re-derive
  (files.list with modifiedTime window), re-anchor. First run: full
  enumeration bounded by policy (default 90d lookback, caps per run).
- deletion handling: changes feed reports `removed=true` or file
  `trashed=true` -> deletion observation -> canonical graph marks
  document superseded/tombstoned; bytes stay in the evidence plane
  (audit trail of what was seen). Disconnect-time purge is an
  operator decision, not a connector behavior.
- replay semantics: pageToken + per-file (fileId, modifiedTime) makes a
  run reproducible; the changes feed is append-only within its retention
  window (~30 days typical), so replays older than the window fall back
  to full re-derive by design.

## 4. Email (Gmail API primary, IMAP fallback)

- source identity: `gmail` + tenant + account email.
- acquisition mechanism: Gmail API `users.history.list?startHistoryId=<cursor>`
  returns messagesAdded (id + labelIds partials), messagesDeleted,
  labelsAdded/labelsRemoved. Full fetch only for added message ids
  (`messages.get?format=full`); label flips cost no further request
  (labelIds in the history record are the resulting state). Fallback:
  IMAP (UIDVALIDITY + UID) for providers without a history API; plain
  password auth never, app-password/OAuth only. Push leg: Gmail
  `users.watch` -> Cloud Pub/Sub topic; notifications trigger a
  history.list poll. Evidence: Gmail history cursors expire after roughly
  a week of inactivity -> 404 (the Gmail analog of Drive's 410); the
  correct recovery is drop-the-cursor full re-enumeration, not an error.
- evidence shape: one observation per message: message id (stable),
  threadId, historyId, labelIds (resulting state), headers (From/To/Date/
  Subject), body (text/plain preferred, HTML converted, quoted replies
  trimmed per policy), attachment descriptors (filename, mimeType,
  size, sha256; attachment bytes fetched separately via
  messages.attachments.get and routed through the lane-P media pipeline).
  Drafts excluded by default.
- event mapping: message -> evidence -> PING message/document object;
  label flips (UNREAD removal, STARRED) -> state-change observations on
  the existing object (labels are mutable state, not new objects);
  messagesDeleted -> deletion observation. Thread identity = set of
  non-draft message ids (sha256), NOT Gmail's historyId; a reply changes
  thread identity, a label change does not.
- provenance requirements: message id, threadId, historyId that surfaced
  it, labelIds, internalDate, fetch attempt id, scope used
  (gmail.readonly vs gmail.modify recorded). Provider ids graded
  ADDRESSING.
- dedup strategy: message id is the idempotency key (Gmail ids are
  immutable). Partial re-fetch across history pages deduped by id.
  Thread observations versioned by thread-identity hash.
- refresh/incremental semantics: cursor = mailbox historyId, captured
  BEFORE the walk so mid-sync changes replay next run (advance on
  commit). Expired cursor (404) -> INVALID_PAYLOAD -> drop cursor ->
  full re-enumeration in the same run (bounded by initial-lookback
  policy, default 30d). First run: messages.list with q=after:<epoch>
  bounded backfill, then seed cursor.
- deletion handling: messagesDeleted -> deletion observation; documents
  whose message left scope are flagged (e.g. `gmailDeleted`), never
  hard-deleted by the connector.
- replay semantics: historyId-ordered replay within the ~1 week window;
  beyond it, full re-enumeration reproduces the mailbox state at a new
  historyId. Batch gets of 50 (batch endpoint semantics) are an
  optimization, not a semantic.

## 5. Web (arbitrary sites) (lane D — DELTA)

Lane D is BUILDABLE with HOSTILE-INPUT-CONTRACT.md (F1-F12/P1-P8/R1-R6/
D1-D7/S1-S5/E1-E5/C1-C4). safe-fetch.ts is the ONE canonical SSRF gate
(never duplicated). This section adds source-inventory fields, not a new
acquisition pipeline.

- source identity: `web-acquire` + tenant + canonical URL (normalized:
  scheme+host+path, tracking params stripped). Public web sources use
  `none`-credential (lane M: connectionHandle empty).
- acquisition mechanism: escalation ladder HTTP -> JSON-LD -> HTML ->
  browser -> intelligence (lane D owns the ladder); every hop through
  safe-fetch (SSRF gate, metadata-service deny, safe schemes, redirect
  policy). Parse stage bounded (CPU/mem/time/size), per-run scratch
  sandbox with realpath containment; PDFs rejected by default (D1-D7);
  robots.txt fail-closed; browser only at L2; anti-bot/CAPTCHA/cookie
  walls are blocked, never bypassed.
- evidence shape: one observation per fetch: URL, fetched_at, HTTP status,
  ETag/Last-Modified seen, content hash (sha256 of raw bytes), extracted
  claims with per-claim provenance (CSS/XPath/JSON-LD path), page
  screenshot ref when browser-level, hostile-input contract version.
- event mapping: page -> evidence -> PING document/claim objects; content
  change (hash differs) -> OBJECT_UPDATED with before/after evidence
  refs; structured data (JSON-LD Business) -> field-level observations
  with claim grades.
- provenance requirements: final URL after redirects, HTTP status,
  response headers (ETag, Last-Modified, Content-Type), content hash,
  extraction method + selector, fetch attempt id, robots decision
  (allowed path that permitted the fetch).
- dedup strategy: content hash skip (byte-identical page -> freshness
  clock only, zero observations); URL + ETag/Last-Modified conditional
  refresh (304 = no change).
- refresh/incremental semantics: cursor = (ETag | Last-Modified | content
  hash) per URL; commit-first advance. Staleness cadence per source
  (default 7d for business sites). Sitemap lastmod / RSS feed may act
  as the change signal where available (see §6).
- deletion handling: 404/410 on a previously valid URL -> deletion
  observation -> canonical graph marks document superseded; history
  kept. robots.txt newly disallowing a URL -> PAUSE the stream
  (PERMISSION_DENIED at source level), not a deletion.
- replay semantics: URL + fetch timestamp + content hash reproduces the
  observation; raw bytes retained in the evidence plane (bounded by
  retention policy) so normalization can be re-run after normalizer
  version bumps.

## 6. RSS / Atom

- source identity: `rss` + tenant + feed URL (canonicalized).
- acquisition mechanism: plain HTTP GET through safe-fetch; conditional
  refresh with If-None-Match / If-Modified-Since (304 = no change).
  Parses RSS 2.0 and Atom 1.0. Feed discovery via HTML
  <link rel="alternate" type="application/rss+xml|atom+xml"> where the
  user supplies a page URL instead of a feed URL.
- evidence shape: one observation per feed item: guid (RSS) or id
  (Atom) as the stable key; title, link, pubDate/updated, author,
  description/content (sanitized: script/event handlers stripped per
  testkit sanitize.hostile_html), content hash, enclosure refs
  (media routed through lane P). Feed-level observation: feed title,
  last build date, TTL/skipHours hints (advisory only).
- event mapping: item -> evidence -> PING post/document object; new
  guid -> OBJECT_CREATED; changed content under a stable guid ->
  OBJECT_UPDATED with before/after refs.
- provenance requirements: feed URL, item guid/id, pubDate/updated,
  link, ETag/Last-Modified of the feed fetch, fetch attempt id.
  Publisher-claimed dates are evidence, not truth (feeds lie about
  dates; record both claimed and fetched_at).
- dedup strategy: guid/id is the idempotency key; where guid is absent,
  fallback key = sha256(feedUrl | link | title). Same guid seen twice
  -> no duplicate knowledge. isPermaLink=false guids are opaque
  strings, stored verbatim never dereferenced.
- refresh/incremental semantics: cursor = (ETag | Last-Modified | newest
  item date + guid) per feed; commit-first advance. Poll cadence from
  feed TTL hint bounded by floor/ceiling policy (default floor 15min).
  Feeds are inherently windowed (most publish last N items): a run
  that finds items older than the watermark is normal, not a gap.
- deletion handling: feeds rarely signal deletion; an item that stops
  appearing is NOT a deletion (feeds are windows, not logs). Deletion
  observations for RSS require an explicit provider signal (rare) or
  operator action. Never infer deletion from absence in a feed.
- replay semantics: feed fetch at time T is reproducible from the
  retained raw feed bytes; item observations are append-only per guid.

## 7. Files (local uploads) (lane P — DELTA)

Lane P is BUILDABLE with MEDIA-DESIGN.md (SHA-256 content addressing,
magic-byte MIME verification, SVG rejected at boundary, EXIF stripped
by default, derivative decode caps, re-encode destroys polyglots). This
section adds source-inventory fields.

- source identity: `file-upload` + tenant + upload session id.
- acquisition mechanism: multipart/form-data or resumable upload intake;
  bytes written to a quarantine area; MIME verified by magic bytes
  against an allowlist (never trust the client Content-Type or
  extension); EXIF stripped before any derivative; hostile-input
  contract parse caps apply (lane D).
- evidence shape: one observation per file: sha256 content hash (the
  canonical id, lane P), verified MIME, byte size, EXIF-stripped flag,
  uploader identity, upload timestamp, derivative refs (thumbnails,
  text extraction for PDFs/docs) each with their own hash. Text
  extraction outputs become document observations linked to the blob.
- event mapping: blob -> evidence -> PING media/document object;
  re-upload of byte-identical content -> no new object (dedup hit),
  only a provenance link to the new upload session.
- provenance requirements: content hash, verified MIME, original
  filename (untrusted label, never a key), uploader, upload session,
  EXIF-strip record, derivative chain (parent hash -> child hash).
- dedup strategy: byte-exact content hash dedup (lane P decision;
  perceptual hashing out of scope). Same bytes uploaded twice -> one
  canonical blob, two upload-session provenance links.
- refresh/incremental semantics: uploads are event-driven (no cursor);
  text-extraction re-runs keyed on normalizer version (lane M §5.4:
  normalizer bump flags re-normalization, checkpoints unaffected).
- deletion handling: operator-initiated delete -> tombstone with the
  content hash retained in the audit trail (proves what was removed);
  raw bytes purged per retention policy. Disconnect of the uploader
  does not delete blobs.
- replay semantics: content hash + retained bytes fully reproduce any
  derivative; extraction is deterministic (seed/pin versions in the
  observation).

## 8. External APIs (generic)

Covers any REST/JSON (and GraphQL-shaped) provider not given a bespoke
connector. Consumes: BCQ Nango evaluation (auth + connection management
ONLY; Nango never becomes authority; BCQ-NANGO worker still running, no
doc on disk as of this write), Airbyte harvest (per-stream opaque state,
at-least-once/dedup incremental, commit-gated checkpointing, discover,
selective streams, controlled initial sync — all ADOPTED as concepts,
zero CDK code), the incremental-state envelope proposal
(lane-bcq/INCREMENTAL-STATE-SCHEMA-PROPOSAL.md: fixed framing, opaque
cursor value, cursor_kind enum, version + migration history,
monotonicity rules, replacement-connector adoption rule).

- source identity: `api-generic` + tenant + provider slug + base URL
  (provider slug from the connector manifest, BCQ-validated).
- acquisition mechanism: declarative stream definitions (endpoint,
  pagination style, auth) interpreted by a thin generic reader; auth
  via lane-L handle through the AuthBroker SPI; all egress through
  safe-fetch. Pagination styles supported: page-number, cursor-in-body,
  Link-header, since-timestamp, GraphQL edges/pageInfo. No SDK
  adoption per connector without the veto gate.
- evidence shape: NormalizedObservation per provider record, with the
  generic record contract: provider id field (declared per stream),
  version field (declared per stream), raw payload ref (content hash),
  provenance envelope (provider, stream, fetched_at, attempt id,
  connector version).
- event mapping: provider record -> evidence -> resolution; provider
  ids graded ADDRESSING; stream definitions declare which PING object
  kind each stream resolves toward (never provider-shaped canonical
  objects).
- provenance requirements: base URL, stream id, pagination cursor that
  surfaced the record, raw payload hash, recordSchema version
  (lane R recordSchema: idField/versionField declared so drift is
  detectable), fetch attempt id.
- dedup strategy: BCQ idempotency formula
  sha256(connectorId | streamId | externalObjectId |
  externalRecordVersion). Generic streams declare idField and
  versionField; absent version field -> content hash of the record as
  the version.
- refresh/incremental semantics: per-stream opaque cursor in the
  Airbyte envelope (kind: opaque-delta/cursor/etag/timestamp/none,
  valueSha256, normalizerVersion, eventSeqFloor). Commit-first advance
  per lane M §5.2. Stream-type full (snapshot) vs incremental declared
  in the manifest; snapshot streams re-fetch and diff, emitting only
  deltas as observations.
- deletion handling: soft-delete flags (deleted_at, status=archived)
  -> deletion observations; hard deletes with no signal -> detected
  only by snapshot diff on full streams, emitted as deletion
  observations with `inferred_by_diff:true` and lower confidence
  grade (never silently erased).
- replay semantics: cursor + raw payload refs reproduce the run; the
  fixture format (ping.ingest.fixture@1) covers request/response
  sequences including pagination, 429-then-success, schema drift
  quarantine, and cursor corruption with FULL_RESYNC.

## 9. Business data (GBP/Stripe/QuickBooks-class)

Sibling lane-conn (CONN-BUSINESS) chose Google Business Profile as the
winner and proved it fixture-end-to-end (BUSINESS-CONNECTOR.md);
morning queue items live in lane-conn/MORNING-QUEUE.md (GBP approval,
Square sandbox, Yelp Fusion, Jobber partner, Meta App Review). This
section maps the CLASS onto the substrate so Stripe/QuickBooks-class
connectors inherit it without new machinery.

- source identity: provider slug + tenant + provider account/merchant id
  (e.g. `stripe` + acct id, `quickbooks` + realm id).
- acquisition mechanism: provider REST API with OAuth (Stripe: restricted
  keys or OAuth; QuickBooks: OAuth2 accounting scopes; Square: OAuth2 +
  sandbox). Webhooks where offered (Stripe constructEvent, Square
  signature) with verify-before-parse (lane R reference mechanism);
  poll backfill mandatory (providers never guarantee redelivery).
  Egress through safe-fetch + lane-L AuthBroker.
- evidence shape: per provider object (Stripe: payment intent/invoice/
  customer; QuickBooks: invoice/expense; Square: order/payment):
  NormalizedObservation with money fields as (amount, currency) pairs,
  never floats; timestamps UTC; provider ids graded ADDRESSING.
  Financial data gets the lane-K PII-minimization rule at quarantine.
- event mapping: invoice/payment -> evidence -> PING financial-document
  object (derived truth, capability-gated); refund/void -> state-change
  observations; disputes -> conflict-persisted CONTESTED edges
  (lane N pattern: both values kept).
- provenance requirements: provider account id, object id, livemode/
  testmode flag (Stripe test mode is a different source instance from
  live), event/webhook id when pushed, fetch attempt id. Test-mode
  data is NEVER mixed with live-mode canonical state (separate source
  records).
- dedup strategy: provider event/object id idempotency keys; webhook
  duplicate delivery absorbed by event id dedup (lane R
  webhook-duplicate-delivery fixture pattern). Stripe's own
  idempotency keys echoed where the connector initiates writes (v1 is
  read-only; writes need the elevated grant lane M requires).
- refresh/incremental semantics: provider-native cursors (Stripe
  `starting_after`, QuickBooks `STARTPOSITION`, Square cursor) as
  opaque-delta checkpoints; commit-first advance. Financial streams
  are append-mostly; updates arrive as new events (refund.created),
  not mutations.
- deletion handling: financial records are rarely deleted; void/refund
  are new events. True provider deletes -> deletion observation with
  the tombstone rule (history kept, bytes retained per retention).
  Never delete canonical financial evidence on provider signal
  (lane K PERMANENT: provider deletion is an observation, not a purge
  command).
- replay semantics: webhook event log + poll cursors reproduce the
  ledger view at any point; money math re-derives from events, never
  from cached balances.

## Shared record lines

DOMAIN: connectors | COMPONENT: git-ingestion | CLAIM: lane A spike engines
(fixtures, redteam, packets) already satisfy its STATE.md NEXT steps 3-6
| EVIDENCE: lane-a/spike/{engines,fixtures,redteam.mjs,out/packet-*.json}
exist on disk | CALLER: lane-a owner | CALLEE: none | WRITER: agent 16
| READER: lane A owner, coordinator, convergence auditor | AUTHORITY: agent 16
| CLASSIFICATION: DELTA-NOT-REDO | CONFIDENCE: 0.9 | BROKEN BOUNDARY: none
| DEPENDENCIES: lane-a/STATE.md | AFFECTS AGENTS: lane A worker, coordinator

DOMAIN: connectors | COMPONENT: git-ingestion | CLAIM: incremental git
ingestion cursor is OLD HEAD SHA; force-push is the cursor-corruption case
(INVALID_PAYLOAD -> quarantine -> full re-derive) | EVIDENCE: lane A design
intent + lane M §5.3 corruption procedure | CALLER: lane-a design | CALLEE:
lane M registry | WRITER: agent 16 | READER: lane A owner, lane M owner
| AUTHORITY: agent 16 (investigation) | CLASSIFICATION: DESIGN-PROPOSAL
| CONFIDENCE: 0.85 | BROKEN BOUNDARY: none | DEPENDENCIES: lane-m
SOURCE-REGISTRY-DESIGN.md §5.3 | AFFECTS AGENTS: lane A worker, lane M worker

DOMAIN: connectors | COMPONENT: github | CLAIM: 7 GitHub objects mapped
through observation->evidence->resolution; 18/18 testkit green on the
adapter; no rework needed by lane-conn16 | EVIDENCE:
lane-conn/GITHUB-CONNECTOR.md + github/adapter.py + ADAPTER-TEST-RESULTS.md
| CALLER: lane-conn CONN-GITHUB | CALLEE: none | WRITER: agent 16
| READER: coordinator, convergence auditor | AUTHORITY: agent 16
| CLASSIFICATION: CONSUMED-NO-DUPLICATION | CONFIDENCE: 0.95
| BROKEN BOUNDARY: none | DEPENDENCIES: lane-bcq testkit, lane-k taxonomy
| AFFECTS AGENTS: none (no new work proposed)

DOMAIN: connectors | COMPONENT: google-drive | CLAIM: changes feed
(changes/startPageToken + changes?pageToken, newStartPageToken) is the
incremental mechanism; 410 on stale token -> full re-derive; watch
notifications carry no payloads (notify-then-poll) | EVIDENCE: Drive API
v3 changes reference (current docs); Nango google-drive webhooks doc
| CALLER: agent 16 | CALLEE: future Drive connector lane | WRITER: agent 16
| READER: coordinator, lane CONN successors | AUTHORITY: agent 16
| CLASSIFICATION: RESEARCHED | CONFIDENCE: 0.9 | BROKEN BOUNDARY: none
| DEPENDENCIES: lane L (OAuth custody), lane M (opaque-delta checkpoint)
| AFFECTS AGENTS: future Drive connector worker

DOMAIN: connectors | COMPONENT: email | CLAIM: Gmail history.list with
startHistoryId is the incremental mechanism; cursor expires ~1 week ->
404 -> drop-cursor full re-enumeration; thread identity = sha256 of
non-draft message id set, not historyId | EVIDENCE: Gmail API behavior
documented across multiple current implementations (obsidian-gmail,
brev ADR-0064, launchstack design) | CALLER: agent 16 | CALLEE: future
email connector lane | WRITER: agent 16 | READER: coordinator
| AUTHORITY: agent 16 | CLASSIFICATION: RESEARCHED | CONFIDENCE: 0.9
| BROKEN BOUNDARY: none | DEPENDENCIES: lane L, lane M, lane P (attachments)
| AFFECTS AGENTS: future email connector worker

DOMAIN: connectors | COMPONENT: web | CLAIM: arbitrary-site acquisition
adds no new pipeline; lane D owns the ladder and hostile-input contract,
this inventory only assigns per-source identity/cursor/deletion semantics
| EVIDENCE: lane-d/HOSTILE-INPUT-CONTRACT.md | CALLER: agent 16
| CALLEE: lane D | WRITER: agent 16 | READER: lane D owner, coordinator
| AUTHORITY: agent 16 | CLASSIFICATION: CONSUMED-NO-DUPLICATION
| CONFIDENCE: 0.9 | BROKEN BOUNDARY: none | DEPENDENCIES: lane-d design
| AFFECTS AGENTS: none

DOMAIN: connectors | COMPONENT: rss | CLAIM: feeds are windowed logs, not
event streams: never infer deletion from item absence; guid/id is the
idempotency key; claimed dates are evidence not truth | EVIDENCE: RSS 2.0
/ Atom 1.0 semantics; testkit sanitize.hostile_html | CALLER: agent 16
| CALLEE: future RSS connector lane | WRITER: agent 16 | READER: coordinator
| AUTHORITY: agent 16 | CLASSIFICATION: RESEARCHED | CONFIDENCE: 0.95
| BROKEN BOUNDARY: none | DEPENDENCIES: lane-bcq testkit (sanitization),
lane M (cursor) | AFFECTS AGENTS: future RSS connector worker

DOMAIN: connectors | COMPONENT: file-upload | CLAIM: content hash is the
canonical blob id (lane P); re-upload of identical bytes -> no new object,
only a new provenance link | EVIDENCE: lane-p/MEDIA-DESIGN.md | CALLER:
agent 16 | CALLEE: lane P | WRITER: agent 16 | READER: lane P owner
| AUTHORITY: agent 16 | CLASSIFICATION: CONSUMED-NO-DUPLICATION
| CONFIDENCE: 0.95 | BROKEN BOUNDARY: none | DEPENDENCIES: lane-p design
| AFFECTS AGENTS: none

DOMAIN: connectors | COMPONENT: api-generic | CLAIM: a thin generic reader
over declarative stream definitions inherits the whole substrate; the
Airbyte envelope (opaque cursor + framing) plus the BCQ idempotency formula
cover every pagination style without per-provider code | EVIDENCE:
lane-bcq/AIRBYTE-HARVEST.md + INCREMENTAL-STATE-SCHEMA-PROPOSAL.md
| CALLER: agent 16 | CALLEE: future generic-API connector lane | WRITER: agent 16
| READER: coordinator | AUTHORITY: agent 16 | CLASSIFICATION: DESIGN-PROPOSAL
| CONFIDENCE: 0.8 | BROKEN BOUNDARY: none | DEPENDENCIES: lane-bcq envelope,
lane-l AuthBroker, lane-m checkpoints | AFFECTS AGENTS: future API connector
worker

DOMAIN: connectors | COMPONENT: business-data | CLAIM: GBP proven by
sibling lane; Stripe/QuickBooks/Square-class connectors inherit the
substrate with two class rules: test-mode and live-mode are separate
source instances; money as (amount, currency) pairs never floats
| EVIDENCE: lane-conn/BUSINESS-CONNECTOR.md | CALLER: agent 16 | CALLEE:
lane-conn CONN-BUSINESS | WRITER: agent 16 | READER: coordinator
| AUTHORITY: agent 16 | CLASSIFICATION: CONSUMED-NO-DUPLICATION
| CONFIDENCE: 0.9 | BROKEN BOUNDARY: none | DEPENDENCIES:
lane-conn/BUSINESS-CONNECTOR.md | AFFECTS AGENTS: none
