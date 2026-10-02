# FYD Harvest Register, 2026-09-25
TRACK G, read-only lane. Evaluates the FYD-PRODUCT-AUTHORITY-DECISIONS-2026-09-25 harvest directive commodity list against FYD MVP gaps. No integration performed, no repo writes, no commits.

Rule applied throughout: USE NOW requires a NAMED gap that a build track has proven cannot be closed with existing machinery. Nothing in this list meets that bar, so USE NOW count is zero. Most items are already integrated; those are recorded as PRESERVE SEAM with the seam already live.

## 1. Crawl4AI
- Current version/state: 0.9.4, released 2026-09-23 per the official GitHub CHANGELOG. Verified from the upstream changelog, not just release notes.
- What it does: Python LLM-friendly web crawler and scraper (browser-based extraction, markdown output, deep crawl, URL seeding).
- MVP gap: none proven. The repo already harvested its design into src/fyd/proceduralize/ACQUISITION-STACK.md (evaluated at 0.9.3) and runs a bounded L0-L4 AcquisitionAdapter, never the dependency.
- Disposition: PRESERVE SEAM
- Rationale: 0.9.4 adds three harvestable lessons: the egress_policy.py pinning-proxy mechanism shared by all library HTTP clients (SSRF defense moved from mitigation to architecture), dict-wrapper laundering of the untrusted-config gate (CWE-501 env-var read), and PruningContentFilterLXML with ~10x faster O(N) pruning and byte-identical output. Harvest the design into the adapter; never import the Python package into the TypeScript runtime and never deploy the Docker server.
- Seam / trigger: ACQUISITION-STACK.md plus the L0-L4 adapter in src/fyd/proceduralize/. Trigger: update the doc with the 0.9.4 egress-proxy and pruning patterns now (read-only follow-up), and re-evaluate only if the adapter meets a hostile target it cannot handle.
- License: Apache-2.0. Safe to study and re-implement patterns from.

## 2. Playwright
- Current version/state: playwright 1.63.0 and @playwright/test 1.63.0 in package.json; in use at src/fyd/preview/capture.ts and scripts/verify-portal.ts, dbg-slots.ts, verify-interactions.ts.
- What it does: Browser automation (Chromium/Firefox/WebKit) with screenshots, used here for visual proof capture and interaction verification.
- MVP gap: none. It IS the current machinery.
- Disposition: PRESERVE SEAM
- Rationale: Already integrated and current. The remaining harvest is extending its use behind the AcquisitionAdapter seam for L1+ rendered extraction rather than adding a second browser engine. No new integration action needed.
- Seam / trigger: Existing: src/fyd/preview/capture.ts (proof) and the acquisition adapter. Trigger for expansion: a named acquisition target that static fetch plus safe-fetch cannot close.
- License: Apache-2.0.

## 3. Lightpanda
- Current version/state: Beta (nightly releases, v0.2.x line; one technical review cites v0.15.2 of the Zig toolchain era). Headless browser written from scratch in Zig, exposes a CDP server, no CSS layout, no image decode, no screenshots.
- What it does: Machine-first browser for AI/automation workloads: DOM plus V8 JS execution over CDP without a rendering pipeline.
- MVP gap: none proven. Acquisition volume is two demo sites; Playwright covers the need.
- Disposition: PRESERVE SEAM
- Rationale: Vendor claims are 11x faster execution and 9x to 16x less memory than headless Chrome on scraping workloads, but independent reviews flag partial Web API coverage, no screenshots or PDFs, single context per process, and beta stability. It can never replace preview/capture.ts proof work. The license is the sharper edge than the performance claim.
- Seam / trigger: CDP drop-in behind the acquisition adapter (connect to a lightpanda serve endpoint the same way Playwright connects over CDP). Trigger: acquisition throughput or concurrency economics exceed what Playwright/Chromium sustains, AND a benchmark on our own corpus passes first.
- License: AGPL-3.0. Network-exposed use carries copyleft obligations on the covered work; keep it an unmodified separate binary behind CDP with no code linkage, and re-check the license before any adoption.
- Benchmark required before adoption: run the actual FYD acquisition corpus (demo business URLs plus the hostile-gate fixture set) through Lightpanda vs Playwright-Chromium measuring per-page success rate to typed observations, wall time, peak memory, JS framework fidelity (React/Next targets), and extraction parity; record failure modes where Web API gaps cause silent fallbacks.

## 4. jsonld / schema.org tooling / metadata parsers
- Current version/state: jsonld 9.0.0 installed and imported (src/fyd/media/discover.ts, src/fyd/proceduralize/structured-data.ts); fast-xml-parser 5.11.1 and node-html-parser 9.0.4 in deps.
- What it does: JSON-LD expansion/compaction, schema.org vocabulary handling, and feed/HTML metadata parsing for structured-data extraction.
- MVP gap: none unclosed for extraction. The proceduralizer already consumes JSON-LD.
- Disposition: PRESERVE SEAM
- Rationale: The remaining harvest is validation tooling (for example SHACL or shape checks that extracted LocalBusiness objects match schema.org expectations) rather than more parsing. No build track has proven the current parsing insufficient.
- Seam / trigger: src/fyd/proceduralize/structured-data.ts. Trigger: first extraction-correctness incident where parsed structured data passes extraction but violates schema.org shape expectations.
- License: jsonld is BSD-3-Clause; parsers are MIT. No issue.

## 5. Readability-style extraction
- Current version/state: @mozilla/readability 0.6.0 latest (Apache-2.0), standalone Firefox Reader View extraction. NOT installed in the repo.
- What it does: DOM-based article body extraction with metadata recovery; gives JSON-LD schema.org fields precedence in metadata (disableJSONLD option).
- MVP gap: none proven. FYD extraction is object-graph oriented via the deterministic proceduralizer, not article-body oriented.
- Disposition: PRESERVE SEAM
- Rationale: The plausible fit is long-form content acquisition (blog posts, about pages) feeding the Posts and business-description paths. No build track has failed to extract article text with existing machinery, so this stays a contingency, not a dependency.
- Seam / trigger: Post-ingestion text extraction in the proceduralizer L3/L4 path. Trigger: deterministic extractor fails on long-form content for real demo sources and the failure is recorded with evidence. Note it needs a real DOM in Node (jsdom or equivalent); the repo currently has node-html-parser, not a DOM.
- License: Apache-2.0.

## 6. PING artifact/media stack + sharp/libvips
- Current version/state: Already live. src/fyd/media/ has discover, ingest, safe-fetch (MIME/size verify), derivatives, provenance, digest/content-addressing, manifests, and authority binding; @vercel/blob 2.8.0 via src/lib/blob-storage.ts; sharp ^0.35.3 with @img/sharp-libvips-linux-x64.
- What it does: Implements the directive's preferred architecture: fetch, verify MIME/size, digest original, preserve source URL plus observation provenance, safe derivatives, FYD media object references.
- MVP gap: none. This is the satisfied requirement, not a gap.
- Disposition: PRESERVE SEAM
- Rationale: The directive said to search PING first for asset storage, artifact storage, content addressing, media hashing, image processing, and provenance before writing new code. That search succeeded; the stack exists and sharp 0.35.3 is the latest release, which also clears the libvips CVE set GHSA-f88m-g3jw-g9cj. No new integration.
- Seam / trigger: Seam already live at src/fyd/media/*. Trigger for new work: only if a derivative format or storage backend the current stack cannot produce is named by a build track.
- License: sharp is Apache-2.0; libvips binaries ship via @img packages. No issue.

## 7. JSON Schema patterns
- Current version/state: Not in the repo. No zod, ajv, or JSON Schema validator found in src or scripts.
- What it does: Declarative schema validation for JSON payloads; the pattern here would validate typed patches before apply.
- MVP gap: none proven. The [Build My FYD] flow (natural language to typed patch to preview to apply with a 4-tier approval model) currently relies on TypeScript types plus claim gating.
- Disposition: PRESERVE SEAM
- Rationale: Schema-validated patches would harden the conversational customization path (for example "Hide my home address" must validate as a visibility-override patch, never a source-observation mutation), but no build track has shown TS types plus the approval tiers failing to catch a malformed patch.
- Seam / trigger: src/fyd/ask/site-patch.ts, the typed-patch boundary. Trigger: first patch-schema mismatch that TypeScript types fail to catch, or the planner moves to AI-proposed composition changes.
- License: MIT for zod/ajv; JSON Schema itself is a specification. No issue.

## 8. Automerge
- Current version/state: @automerge/automerge 3.5.0 latest stable; @automerge/automerge-repo 2.5.6 latest stable (2.6.0 still alpha). Not installed in the repo.
- What it does: CRDT library for local-first, conflict-free replicated JSON-like documents with full change history.
- MVP gap: none proven. Owner corrections plus regeneration safety (a P0 differentiator) are currently handled by deterministic merge of owner overrides surviving regeneration; no multi-device or offline owner editing exists yet.
- Disposition: PRESERVE SEAM
- Rationale: Automerge is the natural fit if owner editing ever goes multi-device or offline, and its change history maps cleanly onto the evidence/event model. Adopting it now would add a WASM binary and a second source-of-truth story before the product question (does the product work) is answered.
- Seam / trigger: The owner-overrides store that survives regeneration. Trigger: first real owner editing from two devices, or offline owner corrections that must merge.
- License: MIT. No issue. Watch bundle size (WASM) for the mobile surface.

## 9. Electric
- Current version/state: ElectricSQL 1.5+ current; read-path sync engine over Postgres via HTTP shapes; first-class React and TanStack DB integrations.
- What it does: Streams partial Postgres replicas ("shapes") to clients with low-latency live updates; writes go through your own API.
- MVP gap: none. There is no multi-client sync consumer in the MVP.
- Disposition: REJECT
- Rationale: Electric requires a real Postgres with wal_level=logical plus a sync service, and it would duplicate the canonical event/observation plane that UnifiedEventRuntime owns. The convergence program explicitly forbids duplicating PING's event system.
- License: Apache-2.0, but irrelevant given the rejection.

## 10. PGlite patterns
- Current version/state: @electric-sql/pglite 0.5.8 latest (Postgres 18.3 as of 0.5.0); WASM in-process Postgres. Not installed in the repo.
- What it does: Embedded Postgres for tests, local dev, and edge runtimes with no server process.
- MVP gap: none. No test or local-dev track has proven it needs an embedded Postgres; Postgres rotation is already proven against real Postgres.
- Disposition: REJECT
- Rationale: PGlite cannot serve as an Electric source (single connection, no walsender), so the "local-first sync" reading of the directive does not compose. As a test fixture it adds WASM boot cost for no proven failing suite.
- License: Dual Apache-2.0 / PostgreSQL License. No issue, but irrelevant given the rejection.

## 11. MCP
- Current version/state: v2 is the stable line implementing the 2026-07-28 spec; packages renamed to @modelcontextprotocol/server and @modelcontextprotocol/client. The old @modelcontextprotocol/sdk name is the v1 maintenance line. MIT. Not installed in the repo.
- What it does: Standard protocol for exposing tools, resources, and prompts to AI agents.
- MVP gap: none proven. No external agent consumer exists yet; Ask FYD serves the demo owner directly.
- Disposition: PRESERVE SEAM
- Rationale: This is the highest-leverage protocol seam in the register. The FYD read model (objects plus evidence plus provenance) is exactly what an MCP tool surface wants: fyd.ask with evidence references, fyd.get_object, fyd.propose_patch. When the "Agents" compiler target activates, MCP is the interop layer, and getting the package name right now avoids a v1/v2 migration later.
- Seam / trigger: A new MCP tool module over the FYD read model (objects/evidence/projection), behind the existing capability/authorization seam. Trigger: first authorized external agent integration or the first "Agents" compiler target.
- License: MIT. Note the rename: adopt @modelcontextprotocol/server, not @modelcontextprotocol/sdk.

## 12. ActivityPub / Fedify
- Current version/state: @fedify/fedify 2.3.7 in deps; adapters exist at src/fyd/adapters/activitypub/ (webfinger.ts, signing.ts).
- What it does: TypeScript framework for ActivityPub federation (HTTP signatures, JSON-LD, WebFinger, inbox/outbox).
- MVP gap: none for the website MVP. FYD SOCIAL NODE is a named "tomorrow" compiler target.
- Disposition: PRESERVE SEAM
- Rationale: The package is already the current release. Note: 2.3.7 was published about 22 hours ago (2026-09-24) as the patch for CVE-2026-50131, an SSRF in validatePublicUrl via special-use IP ranges. Verify the lockfile actually resolved to the patched publish before any federation work.
- Seam / trigger: src/fyd/adapters/activitypub/. Trigger: first FYD social node compiler target or owner-authorized fediverse publishing.
- License: MIT.

## 13. ATProto
- Current version/state: @atproto/api 0.20.44 in deps (current per upstream changelogs); zero imports in src; src/fyd/adapters/ATPROTO-HARVEST.md exists as a harvest note.
- What it does: Client SDK for the AT Protocol (Bluesky): identity, repositories, XRPC lexicons.
- MVP gap: none for the website MVP. Bluesky is a named future compiler target.
- Disposition: PRESERVE SEAM
- Rationale: The dependency is installed but unused, which is the correct posture: no code, no session, no keys until a compiler target needs it. Harvest the lexicon patterns (typed record schemas) when the time comes.
- Seam / trigger: New src/fyd/adapters/atproto/ module. Trigger: first Bluesky compiler target authorized by Nolan.
- License: MIT and Apache-2.0 (dual, per package).

## 14. Nostr
- Current version/state: Protocol stable; nostr-tools 2.x current, @nostr-dev-kit/ndk 3.0.3 current. Not installed in the repo.
- What it does: Simple signed-JSON events relayed over websockets; NIPs define kinds (profiles, posts, DMs via gift wrap).
- MVP gap: none for the website MVP. Nostr is a named future compiler target.
- Disposition: PRESERVE SEAM
- Rationale: The cheapest protocol of the four to add later (no federation server to run, just relay connections), and its event model maps cleanly onto FYD observations. Key management is the constraint: NIP-07/NIP-46 patterns mean owner keys must never touch the FYD server.
- Seam / trigger: New src/fyd/adapters/nostr/ module. Trigger: first Nostr compiler target authorized by Nolan.
- License: MIT (nostr-tools), MIT (NDK).

## 15. Farcaster
- Current version/state: Protocol architecture changed. Hubs are deprecated; since mid-2025 Farcaster runs on Snapchain (blockchain-style). Neynar acquired Farcaster from Merkle Manufactory in early 2026 and runs the protocol, client, and developer platform. Not installed in the repo.
- What it does: Crypto-native social protocol; practical developer access is now via the Neynar platform/API rather than self-hosted hubs.
- MVP gap: none for the website MVP. Farcaster is a named future compiler target.
- Disposition: PRESERVE SEAM
- Rationale: Any harvest plan written against the old hub architecture is stale and must be rewritten at adoption time. The seam is a Neynar API adapter, not a hub deployment.
- Seam / trigger: New src/fyd/adapters/farcaster/ over the Neynar API. Trigger: first Farcaster compiler target authorized by Nolan, with a fresh Snapchain-era evaluation first.
- License: Varies by component (hub code was MIT/Apache); Neynar API is a commercial service with its own terms, check at adoption.

## 16. Marketing patterns (study only)
Patterns harvested from product observation, never proprietary code. Disposition for all: PRESERVE SEAM as recorded patterns; trigger is the first campaign/signal compiler target.
- Metricool: a unified multi-network content calendar where scheduling, per-network best-time heatmaps, and analytics share one plan object.
- Sprout Social: Smart Inbox triage, a sentiment-scored message queue with assignment, collision detection, and SLA timers.
- Brandwatch: one connected data model across consumer intelligence, search intelligence, social management, and influencer marketing so a signal in one surface becomes an opportunity in another.
- Later: creator-centric scheduling tied to link-in-bio commerce attribution, closing the post to click to purchase loop.
- Ahrefs: Brand Radar, share-of-voice across AI answers, search, YouTube, Reddit, and TikTok in a single surface.
- HubSpot: campaign attribution as the data model, every content asset carries a contact-to-revenue journey record rather than attribution being a report bolted on after.
- Creator systems: brief to deliverable to usage-rights contract as a typed object triple, making creator content licensable inventory.
- MVP gap: none; the directive explicitly says not to build these dashboards now. The object/evidence model must keep them possible, which the entity compiler design already does.
- Disposition: PRESERVE SEAM
- Rationale: The stealable unit is the data model and the workflow, not the dashboard. The future loop in the directive (observation to signal to opportunity to proposed mission to authorization to action to result to evidence to outcome to learning) is the schema these patterns should eventually hang on.
- Seam / trigger: The entity compiler's future Signal, Opportunity, Campaign, Asset, Publication, Conversation, Creator, Conversion, Experiment, and Learning objects. Trigger: first campaign or signal compiler target.
- License: Patterns only; no code copied. No license exposure.

## Factual corrections to claims in the directive and related notes
1. Crawl4AI 0.9.4 claims: CONFIRMED accurate. Released 2026-09-23. Two SSRF advisories (blind SSRF via robots.txt fetch, GHSA-f77g-77vp-r96v; SSRF with response disclosure via link_preview_config, GHSA-wh5w-hmj3-vgg7) plus the env-var trust-boundary bypass via dict-wrapper laundering (CWE-501, GHSA-5w5p-vcv6-mm3f). Pruning: new PruningContentFilterLXML, ~10x faster, byte-identical output. Also of note: 0.9.3 was released 2026-08-31, so the ACQUISITION-STACK.md "August 2026" note is consistent.
2. Fedify: the installed 2.3.7 was published ~2026-09-24 as the patch for CVE-2026-50131 (SSRF via special-use IP ranges in validatePublicUrl). The repo has the patched version, but confirm the lockfile resolved after that publish.
3. Farcaster: the harvest list predates the protocol change. Hubs are deprecated, Snapchain is the architecture since mid-2025, Neynar owns the protocol as of early 2026. Re-evaluate before any adoption.
4. MCP: the package was renamed. The current line is @modelcontextprotocol/server plus @modelcontextprotocol/client (v2, 2026-07-28 spec); @modelcontextprotocol/sdk is the v1 maintenance line.
5. PGlite: latest is 0.5.8 (Postgres 18.3), and it cannot serve as an Electric source (no walsender, single connection), so the local-first sync reading does not compose.
6. sharp: 0.35.3 is the latest release and is the patched version for the libvips CVE set GHSA-f88m-g3jw-g9cj. The installed version is current and secure.

## Disposition counts
- USE NOW: 0
- PRESERVE SEAM: 14 (Crawl4AI, Playwright, Lightpanda, jsonld/schema.org tooling, Readability, media stack + sharp, JSON Schema, Automerge, MCP, ActivityPub/Fedify, ATProto, Nostr, Farcaster, marketing patterns)
- REJECT: 2 (Electric, PGlite)

## Three highest-leverage PRESERVE SEAM items
1. MCP. The FYD read model (objects plus evidence plus provenance) is a natural MCP tool surface (fyd.ask with evidence refs, fyd.get_object, fyd.propose_patch), and it is the interop layer for the "Agents" compiler target. Trigger: first authorized external agent integration. Use @modelcontextprotocol/server (v2), not the old sdk name.
2. JSON Schema typed-patch validation. The [Build My FYD] flow turns natural language into typed patches with a 4-tier approval model; schema-validating patches at src/fyd/ask/site-patch.ts hardens the P0 editability differentiator. Trigger: first patch-schema mismatch TypeScript types fail to catch, or AI-proposed composition.
3. Crawl4AI 0.9.4 design harvest. The egress_policy.py pinning-proxy mechanism and the O(N) PruningContentFilterLXML are directly applicable to the L0-L4 AcquisitionAdapter. Trigger: update ACQUISITION-STACK.md with the 0.9.4 patterns now; re-evaluate the adapter only if it meets a hostile target it cannot handle.
