# FYD-HARVEST-AUDIT.md

**Date:** 2026-09-22/23 (MDT)
**Mode:** READ-ONLY. No code changed, no fixes, no installs, no commits, no new architecture. All repo access via `~/workspace/pig/pigwsl-run.sh`.
**Repos inspected:** `/home/nolan/projects/ping` @ `fyd/builder-composition` (`0dec40f5`) - FYD website repo; `/home/nolan/ping` @ `refactor/runtime-authority-convergence` (`cc6856c3`) - PING core.
**Live DB probed read-only:** `brain-postgres`/`ping_runtime` (`ping_events` = 2321 rows).
**Lane reports (full evidence):** `~/workspace/fyd-harvest/lanes/` - a-pipeline-trace, b-corpus-loss-map, c-ecosystem, d-github, e-security, f-provenance, g-ping-capabilities, h-ui-ecosystem, i-product-layer.
**Prior art reconciled (not redone):** `~/workspace/fyd-harvest/harvest-report.md` (2026-09-22 ecosystem research), `~/workspace/fyd-harvest/PING_HARVEST_PLAN.md` (2026-09-22 PING inventory), FYD-001..035 backlog + collapse-to-primitives directive (2026-09-22; FYD-002 acquisition contract is the root), Nolan's 2026-09-21 acquisition ladder (static HTTP first, browser only when static evidence insufficient), Nolan's 2026-09-22 builder decisions (media ingest, DEMO_OWNER_MODE seam, Ask FYD evidence-bounded Q&A, must-wins re-ranked with time-to-credible-presence #1), and the product/UI sprint reorientation (PING is the substrate; FYD harvests it).
**Diffing note for tomorrow's run:** this document is the baseline. Re-run lanes, then diff section-by-section: versions (section 7), live DB row counts (sections 3, 6), lane verdicts (UNMEASURED items in 7/8 are the highest-value re-probes). Anything that changed state (e.g. Playwright host deps installed, a seam built) must move its backlog item to a "CLOSED" ledger, not vanish.

--

## EXECUTIVE VERDICT

FYD's acquisition quality problem is not a crawler-quality problem. It is a **pipeline-existence problem**: there is no live acquisition pipeline. The Happy Place and Coppersmith objects were produced by a hand-operated, file-based chain (human fetched bytes with an uncommitted tool on 2026-09-21, pinned them to `src/fyd/proceduralize/raw/`, replayed them through `regen.ts`). `discover()` and `acquire()` are unit-tested dead code in the demo path; the `AcquisitionAdapter` interface has no implementation. Everything from pinned bytes onward is deterministic and well-tested; everything from seed URL to bytes is outside the code.

The good news, measured rather than assumed:

- **12 of 13 site categories in a 13-site corpus are fully acquirable at Level 3 (deterministic HTML parsing) or below.** Only JS-only content needs Level 4 rendering; nothing needs browser interaction. The dominant losses are PARSING (13/13) and DISCOVERY (10/13) - deterministic extractors and multi-page discovery kill them, not a new browser stack.
- **No new browser stack is needed.** Playwright 1.63.0 is already a devDep, installed at exactly 1.63.0, and its type surface covers frames, shadow DOM, downloads, SPA waits, sessions, and HAR replay. The only blocker is host readiness on the Pig (missing OS libs) - maintenance, not architecture.
- **PING already provides 8 of the capabilities FYD needs**, verified against the live DB (event journal, tenant identity, missions/runs, event-derived analytics, capability inventory, knowledge/context retrieval, identity minting, governance policy reads). The single missing piece is proven absent: **no sanitized tenant-graph projection exists**. One read-only route - `GET /tenant/:id/graph` - is the only net-new backend surface the product sprint needs.
- **The UI ecosystem already provides the editor halves.** Puck 0.23.0 (MIT, React 18-compatible) adapts as the visual-editor shell with FYD owning only two translators; Tambo 1.3.0 (MIT) supplies the model-selects-from-registered-vocabulary pattern for Ask FYD. Both converge on one typed `SitePatch` IR through the existing digest-bound proposal path.
- **Five security exposures are live** and must close before arbitrary customer URLs become a public endpoint: stored XSS via ungated capability hrefs (traced end to end), IPv6 SSRF bypass, DNS-rebinding TOCTOU, a DNS oracle for anonymous callers, and the ActivityPub adapter fetching outside the SSRF gate. The prior `javascript:` fix covers only the site-spec renderer; three competing URL-safety implementations now exist.

The 24-hour sprint that this audit designs is therefore a **product/UI sprint on top of a closed acquisition loop**, not a backend convergence sprint and not a crawler build: wire live ACQUIRE, close the five exposures, survive per-field provenance, converge three patch IRs into one, add the one tenant-graph seam, and measure must-win #1 (time-to-credible-presence) on both tenants. The clock does not start here - Nolan issues the official directive.

--

## CURRENT PIPELINE - ACTUAL CODE

What really runs today (lane A), not what the design docs describe:

```
SEED URL (human knowledge, not code)
  happy-place-platform.vercel.app | www.coppersmithplumbing.com
        |
[B0] EXTERNAL FETCH - 2026-09-21, uncommitted tool, NO repo code
  robots.txt checked (Coppersmith: crawl-delay 10 honored); Happy Place is Nolan's own site
  happy-place: index.html only (139,618 bytes)
  coppersmith: index.html (117,898) + rss.xml (1,133) + sitemap.xml (569); atom.xml 404 discarded
        |
[B0b] PINNED CORPUS - src/fyd/proceduralize/raw/{happy-place-platform,coppersmith-plumbing}/
  sha256 in fixture headers; verified matching on disk 2026-09-22
        |
[B1/B2] DISCOVER + ACQUIRE - src/fyd/proceduralize/proceduralizer.ts
  *** BYPASSED in demo path *** regen.ts hard-codes its own SITES list,
  synthesizes AcquiredSource{ok:true,status:200}; acquire() never called
        |
[B3] PARSE - parseRich(): JSON-LD lane (jsonld@9.0.0, offline, blank nodes re-keyed
  blank:<sha256>) + OG/meta/title + 2 regex service-card detectors + feedFacts();
  sitemap branch does NOTHING (pure cost)
        |
[B4] NORMALIZE → [B5] EXTRACT (address→coarsened locality; socials rename)
  → [B6] PROVENANCE (every field gets sourceUrl/sourceType/observedAt/evidenceRef/
     confidence/factClass/visibility/claimKind - the emission choke point)
  → [B7] RESOLVE (one value per field; json-ld>og>html-meta>rss>atom>sitemap>html;
     private fields withheld and counted)
  → [B8] RELATE (page-scope socials → links_to pairs)
        |
[B9] PROJECT → fixture TS → [B10] dump.py (PING side: strips TS wrapper, applies
  FYD_SITE_OVERLAY events from Postgres, atomic write with graphDigest)
        |
[B11] ping-object-source.ts (fail-closed siteId+graphDigest+provenance checks)
  → generateSiteSpec() → validateSiteSpec() → renderer.tsx
```

Boundary facts that matter: 16 boundaries (B0–B15) mapped with input/output types, owners, failure/retry/timeout/size-limit behavior, determinism, cache, provenance, and tests. Deterministic from pinned bytes onward (regen runs the pipeline twice with a byte-identical assert; projection digests re-verified 2026-09-22, both valid). 82 pipeline tests + 35 net-gate tests exist - but the net gate is not wired into the proceduralizer, and the live fetch has no code at all. `dump.py` has zero tests; the fail-closed projection checks have no dedicated tests. No PING-core server-side callers of the pipeline exist.

**15 silent losses** (information discarded without a trace), highest-value first: `fieldClasses` dropped at the fixture boundary (0 occurrences in fixtures); HTML body text never read (headings/visible text/alts/links/canonical - the L1 design doc promises all of them); Article entities silently dropped (Coppersmith's @graph Article node → generator's Explore pages unreachable); sitemap fetched but never parsed; feed URL inconsistency across regen/test/original; `evidenceRef` ignoring sourceUrl/observedAt; doc-vs-code chrome-filter mismatch (`SITE_CHROME_TYPES` has 1 entry, doc claims 5).

No browser escalation exists on JS-heavy pages: Playwright 1.63.0 is used only by a manual screenshot CLI (`src/fyd/preview/capture.ts`). A JS-heavy page with no JSON-LD/OG yields a hostname-titled stub with empty description, silently. Chrome-vs-knowledge filtering exists only in the JSON-LD lane.

--

## EXISTING PING HARVEST INVENTORY

PING core has harvest-shaped machinery, but its website-acquisition half lives entirely in the FYD website repo. Verified against the live DB (lane G):

**PING can be called today (8):** event journal read+ingest (`GET/POST /events` + children/descendants/correlation; 2321 live rows; `tenant::hpp` = 177 events); tenant identity (`tenants` table: 1 live row, `hpp`; `/tenants` CRUD + heartbeat); missions/runs (`ping_missions` = 450; `/mission-control/missions/{active,pending,stats}`, `/:id/trace`); event-derived analytics (`/mission-control/dashboard`, `/business/*`); capability inventory (`GET /connectors/capabilities*`); knowledge/context retrieval (`/knowledge/*` - search **requires** namespace, fails closed; `/context/*`; 197 live nodes); identity minting (`POST /identities`, Ed25519, idempotent); governance policy reads (`GET /governance/*`).

**Ready with wrapper:** relationships (`knowledge_edges` live, 0 rows; predicate vocabulary exists); evidence (`evidence_authority.js` accumulate/verify/rank - no HTTP route); provenance (`provenance_authority.js` + 63 live `LINEAGE_CREATED`, but no `lineage` table); authorization/policy (governance machinery real; **no HTTP auth exists anywhere** - `route_middleware.js asyncHandler` is the single chokepoint and currently only logs/formats).

**Needs small patch:** objects (`ping_objects`/`ping_relationships`/`ping_transitions` DDL exists, never migrated to live DB); proposals/approval - three partial shapes, none wired end-to-end: file-based `ProposalPipeline` (wrong shape), **`BusinessActionAuthority.proposeAction` (the closest typed-patch IR: deterministic action_id, PENDING_HUMAN → APPROVED/REJECTED/EXPIRED, evidence[], zero callers, no table)**, git-oriented `ApprovalAuthority`. Anoint `BusinessActionAuthority` for content actions; do not build a fourth.

**Missing (proven):** no binary media/blob store (bytea only in empty `repository_objects`) - adopt the `hpp_project_artifacts` URL-reference + metadata-registry shape (`id, tenant_id, project_id, artifact_type, title, file_url, file_size, mime_type, metadata JSONB`); no website acquisition in PING core (no crawler anywhere in `gateway/` or `ping-runtime/`); **no sanitized tenant-graph projection** (searched `gateway/` + `ping-runtime/`; only test/catalog hits); no SSE/websocket feed (`GET /events/recent` polling is the feed).

**Duplicate-risk warnings:** two tenant stores (`tenant_registry` 0 rows vs `tenants` 1 live row); three object/relationship stores (`ping_objects` DDL-only, `repository_*` live-but-empty, `knowledge_*` live 197 nodes/0 edges); IdentityAuthority copied 4 places (`/identities` pins the compiled dist as canonical); `FYD_SITE_OVERLAY` catalog-registered but 0 live rows (overlays live only in the demo journal; `dump.py` defaults to the main journal).

**The one backend seam (absence proven):** `GET /tenant/:id/graph` - one read-only route joining `tenants` → `ping_events WHERE namespace='tenant::<id>'` → `knowledge_nodes/edges` → media registry → capabilities → governance policy → recent-changes cursor, with server-side namespace filtering (closing the `/events` read-path gap where `EventReadAuthority` has zero namespace logic). Everything else FYD needs is already callable.

**Owner gate seam (exact):** `gateway/route_middleware.js asyncHandler` (the chokepoint) + compiled IdentityAuthority + `POST /identities` + CapabilityRegistry/TokenStore + `EventGovernance` namespaces. Exists: identity minting/verification, capability registry, governance policy. Missing: any HTTP session/auth, any owner role, any per-tenant credential. The `DEMO_OWNER_MODE` seam must stay local/bounded and visibly incapable of becoming this.

--

## LOSS MAP

Loss classes from the brief, with measured incidence:

- **PARSING - 13/13 corpus sites.** Headings, link inventory, visible text, phones, microdata, sitemap inventory unextracted. Worst cases: a 2.53 MB Wix page yielding 5 facts; karpathy.ai yielding 1 fact. In-repo: HTML body text never read (lane A).
- **DISCOVERY - 10/13.** No sitemap traversal, no multi-page acquisition, no platform endpoints (`/products.json`, `?format=rss`, location subtrees, repo APIs). In-repo: `discover()` dead code; sitemap branch does nothing.
- **SCHEMA - 6/13.** 60 unsupported items across the corpus; `SoftwareApplication`/`FAQPage` unmapped. In-repo: Article entities silently dropped.
- **RELATIONSHIP - 5/13.** Page-scope socials → `links_to` only; no service→location, person→role, project→evidence edges.
- **ENTITY-RESOLUTION - 2/13.** Person/project sites mistyped as business; no ambiguity recording.
- **RENDERING - 1/13.** Only JS-only content (notion.so) needs it.
- **FETCH / NORMALIZATION / PROVENANCE - minor** on the corpus; provenance loss is severe in-repo at per-field granularity (section 9).

The loss map's strategic read: the binding constraint is deterministic extraction breadth, not browser capability. PARSING + DISCOVERY + SCHEMA losses are all killable without crossing Level 4.

--

## WEBSITE CORPUS RESULTS

13 categories, one real public site each, fetched respectfully (robots checked, ~1s pacing, no bypasses). Verdict: **yes, FYD can get most websites without crossing Level 4.** 12 of 13 categories stay at or below L3; 0 require L5+.

| Category | Site | Cheapest sufficient level (Business+Services+Contact+Location) |
|--|--|--|
| WordPress + Yoast | yoast.com | L3 |
| WordPress + Rank Math | rankmath.com | L3 |
| Squarespace | (WP-markers found; flagged) | L3 |
| Wix | (template site; flagged) | L3 |
| Webflow | webflow.com | L3 |
| Shopify | (store; `/products.json` at L2 for products) | L2/L3 |
| Static HTML | (craigslist used; odd example, flagged) | L3 |
| React/Next SPA | vercel.com | L3 (full 4-slot set from SSR HTML alone) |
| JS-heavy | notion.so | **L4** (body content absent from static HTML) |
| Multi-location | (franchise) | L3 (L2 sitemap inventory) |
| Person/portfolio | karpathy.ai | L3 (but only 1 fact extracted today - PARSING loss) |
| GitHub-backed project | (repo API) | L2 |
| Legacy business | lingscars.com | L3 (Business+Contact+Location via JSON-LD) |

Caveats (lane B flags 3 candidates): Squarespace markers turned out WordPress; the Wix pick is a template; craigslist is an odd "static" example. Rerun with cleaner picks tomorrow.

**Three highest-leverage corpus backlog items:** (1) deterministic HTML content extractors - headings, link inventory, visible text, context-gated contact patterns (kills the universal PARSING loss); (2) multi-page + structured-endpoint discovery - sitemap as inventory, `/products.json`, `?format=rss`, GitHub API, location subtrees (kills DISCOVERY loss); (3) Schema.org-to-PING mapping expansion for commercial types + entity typing (kills SCHEMA and ENTITY-RESOLUTION losses).

**Measurement honesty:** L4/L5 were not executed by the audit; L4 for notion.so is assigned by evidence of JS-only content, not by a render run. The Playwright render side is BLOCKED on host readiness (missing OS libs on the Pig), so the JS-only-evidence delta and browser-side determinism are UNMEASURED - recorded as such, not as zero.

--

## GITHUB INGESTION CURRENT STATE

**Critical inventory correction:** `repository_events`/`repository_objects`/`repository_snapshots`/`dead_letters` are the internal constitutional object store (DDD repository pattern), **not** git-repo mirrors. All four hold **0 rows** across every DB. Live `ping_events` (2321 rows) contains **zero** GitHub-related event types.

**Two parallel GitHub acquisition stacks, both dormant** (built 2026-07-05/29, untouched ~2.5 months, 0 rows, 0 events ever):
- **Stack A** (`runtime/workers/github_worker.py`): 5-min REST poll (meta/commits/PRs/branches/contributors/languages) → `REPOSITORY_DISCOVERED`/`COMMIT_CREATED`/`FILE_INDEXED` into the legacy `events` table. Requires unset `GITHUB_OWNER`/`REPO`/`TOKEN` env → idles. The live runtime is JS, so this can never fire.
- **Stack B** (`ping-runtime/connectors/github_adapter.js` → `github_connector.js` → registered live at `gateway_runtime.js:261`, callable on demand but **nothing schedules it** → `github_ingestion.js` → `github_snapshot.js` (full snapshot incl. recursive trees for up to 50 commits - 100+ API calls per run, rate-limit suicide) → normalizer → 5 constitutional object classes → `RepositoryStore`).
- **No git protocol anywhere**: no clone, no libgit2, no tarballs (only `tarball_url` as a string). The only real git usage is `intelligence_graph.js` running `git log` on PING's own checkout. FYD website side: zero repo ingestion (GitHub references are owner-identity anchoring only).

**What breaks on first real run:** env never configured; anonymous API + unbounded snapshot guarantees 403s; `github_release_watcher.js` references a nonexistent `github_scan_metadata` table; no temporal cursor (in-memory seen-set lost on restart → re-emits); `FILE_INDEXED` means "branch" in one stack and "pull request" in the other; the adapter truncates SHAs to 7 chars.

**Minimum object set: 3, not 11.** Repository (identity anchor for project→product page), Document (README/docs → Ask FYD knowledge, claims labeled CLAIM-not-truth), Release (changelog/freshness feed). FYD's trade customers mostly have no GitHub; these three serve the only real use cases (software-product customers, Ask FYD). Excluded until a customer needs them: Commit, Package, Module, Dependency, Contributor, Issue, PullRequest, Workflow (CI facts fold into Repository fields), License (SPDX string field suffices).

**SHA-diff refresh design:** cursor row `(repo_id, last_seen_sha, tree_sha)` → on HEAD move A→B, `git diff -name-status A B` (+renames) → reprocess only affected paths, tombstone deletes, blob-SHA cache skips re-understanding identical bytes, `git log A..B` for new commits, deterministic `(repo, sha)` event IDs for idempotent append. Current code does the opposite: re-polls latest 10, re-fetches everything, no cursor.

**Hard answers:** why ingest GitHub at all - only for software-product FYD customers (project object → product page, release feed → Ask FYD); minimum useful presence = Repository + Document + Release; deterministic facts (identity, SHA, tree, manifests, deps) vs intelligence-needed (what the project *does*); README claims are claims, never truth; license = SPDX string + harvest the license file, never assume; proprietary repos = local models + deterministic extractors only, never source bytes to external models. **Recommendation: defer the git-first worker until the first software-product FYD customer appears.** Consolidate-or-delete the dead stacks first (keep the connector interface; archive the rest per the anti-amnesia rule).

--

## ECOSYSTEM COMPARISON

All versions/licenses verified from primary sources (npm registry, GitHub API) on 2026-09-22/23. Doc/version/evidence-based verdicts (no installs per read-only rule); bounded live measurement used only tools already present on the Pig.

**Do we need a new browser stack? No.** Playwright 1.63.0's type surface was audited for cross-frame `frameLocator` (new in 1.63), shadow-DOM piercing, downloads, SPA waits, `storageState` sessions, HAR replay, and aria/screenshot failure traces. Nothing in the four candidates adds a capability Playwright cannot reach. The gap is host readiness (missing `libnspr4`/`libnss3`/`libasound2` on the Pig) - schedule `npx playwright install-deps` as maintenance.

| Candidate | Version (verified) | License | Verdict |
|--|--|--|--|
| Crawl4AI | 0.9.3 (PyPI) | Apache-2.0 | **ADAPT** deep-crawl/resume/discovery patterns (dispatchers, `resume_state`, prefetch, DomainMapper, declarative request boundary) + its 2026 advisory history as FYD's SSRF/file-write/credential-exfiltration checklist. **REJECT** Docker server (advisory history), pip package (stack mismatch), LLM extraction. Standing 2026-09-21 verdict re-confirmed. |
| Firecrawl | v2.11.0 (`deterministicJson` new) | SDK MIT; **Cloud = vendor meter + data egress**; self-host = **AGPL-3.0**, 5–8 containers | **ADAPT** the `deterministicJson` loop shape only: schema → codegen'd JS extractor → cached per site → cheap deterministic replay → selector repair on failure. Plus the recipe lifecycle (VALID → STALE → RELEARN) and `redactPII`/Lockdown-Mode requirements. **REJECT** Cloud (hosted-vendor flag - needs Nolan's explicit call) and self-host (AGPL). |
| Lightpanda | 0.4.1 | AGPL (beta; telemetry default-on; fidelity gaps: markdown screenshots, 1x1 canvas) | **ADAPT** the PandaScript shape as second witness for learn-once-replay-cheap (agent session → `/save` → deterministic token-free vanilla-JS replay). **REJECT** as default/foundational engine. Stays in the acquisition lane only. |
| Browser Use | 0.13.10 | MIT (but PostHog telemetry, cloud upsell) | **REJECT** as any acquisition/navigation dependency: nondeterministic LLM loop, Python-in-TS stack, telemetry. |
| Playwright | 1.63.0 (devDep, installed) | Apache-2.0 | **ADOPT** as the Level 4 fallback. Already in the repo; needs host deps only. |

**UI ecosystem (product sprint; lane H):**

| Candidate | Version (verified) | License | Verdict |
|--|--|--|--|
| Puck (`@puckeditor/core`) | 0.23.0 | MIT, React 18-compatible | **ADAPT** as the visual-editor shell: SiteSpec→Puck projection adapter + Puck-diff→typed-SitePatch translator. FYD owns only the two translators; Puck data never persisted; query/binding fields preserved out-of-band and rejected from edits. |
| Tambo (`@tambo-ai/react`) | 1.3.0 (11k stars) | MIT | **ADAPT** the registered-vocabulary selection pattern (model picks from the catalog with zod prop schemas, emits validated structured output, never code). **REJECT** the fullstack package (agent loop + backend duplicate Ask FYD/PING authority). |
| Payload Blocks (`payload`) | 3.90.1 | MIT | **ADAPT** discriminated-union block schemas + block-picker UX vocabulary (applies to FYD's `presentation` half). **REJECT** the CMS (second content-truth system). |
| Object UI (`@object-ui/react`) | 17.6.0 (27 stars, brand new) | MIT | **ADAPT** one discipline only: schema compactness as an AI-writability requirement. **REJECT** adoption (duplicates FYD's renderer thesis). |
| OpenPage | no releases, stalled since 2026-03 | MIT | **ADAPT** patterns only (human/AI shared-editing contract); **REJECT** as builder (competing L2). |
| Vercel json-render | 0.21.0 | Apache-2.0 | Prior verdict stands (adapt the typed-catalog-as-AI-contract pattern; **REJECT** the package - `@json-render/react` still peers `react ^19.2.3`, core peers `zod ^4`, clashing with FYD's React 18.3.1 / zod 3.x). |

**Recommended product pairing:** Puck (projection surface) + typed `SitePatch` ops as the single IR - human visual edits and Ask FYD edits both terminate in `SitePatch` ops through the existing digest-bound proposal/authorization path. Ask FYD's "model selects" half comes from Tambo's register-with-zod semantics over FYD's component registry; rule: selection, never generation.

--

## SECURITY FINDINGS

Threat model: acquisition accepts arbitrary customer URLs. Every URL, header, redirect, HTML byte, JSON-LD block, feed item, image reference, and fact string is attacker-controlled until proven otherwise. Five exposures are VULNERABLE (file:line verified, concrete threat tests in lane E):

1. **Stored XSS via ungated capability hrefs (highest urgency).** `buildCapabilities` (`src/fyd/object/view.ts` ~187–193) interpolates the raw observed `website` field into `<a href>` with no gate. Chain traced end to end: hostile `og:url` or JSON-LD `url` = `javascript:alert(document.domain)` → `proceduralizer.ts:318`/`structured-data.ts` → `cleanString` leaves the scheme intact → graph → `view.ts` → clickable "Website" button in `fyd-circle.tsx:545`, `evidence-chrome.tsx`, `identity-object.tsx:237`, `PeekCard.tsx:148`.
2. **SSRF bypass via IPv6 hex-form mapped addresses.** `isPublicIp` (`safe-fetch.ts`) matches only dotted `::ffff:a.b.c.d`; `http://[::ffff:7f00:1]/` (hex 127.0.0.1) passes as public. Same class Crawl4AI closed in 0.8.8.
3. **DNS rebinding TOCTOU.** Gate resolves DNS pre-fetch; undici re-resolves at connect; no peer-IP pinning. Crawl4AI 0.9.3 (GHSA-q5rj-45vw-vp2g) fixed this exact shape by validating the peer IP read back.
4. **DNS oracle for anonymous callers.** Fail reasons include resolved IPs verbatim, returned through the unauthenticated preview route. Crawl4AI 0.8.8: "SSRF errors no longer echo the resolved address."
5. **ActivityPub adapter fetches outside the SSRF gate** (latent). `webfinger.ts:78` fetches remote-supplied `self` URLs with default redirects and no private-IP checks.

**Actual scope of the prior `javascript:` fix:** `resolveSafeLink` (`safe-link.ts`) covers the site-spec renderer (`renderer.tsx:727,1447`) and the contact-link component (`object-projection.ts:122`). It does **not** cover the ObjectView capability path or `center-portal.tsx:103` (ad-hoc `startsWith("https://")`). Three competing implementations now exist (`resolveSafeLink`, `isSafeWebHref` regex, inline prefix checks) - a sovereignty violation; unify under one.

**Crawl4AI mitigations worth adapting:** peer-IP/DNS-rebinding close (0.9.3); IPv6 transition-form blocklist with mapped-v4 normalization (0.8.7/0.8.8); no resolved-address echo + generic errors with correlation IDs (0.8.8/0.9.0); `resolveSafeLink` on every capability href (0.9.3 stored-XSS analog); webhook-style SSRF defense for the ActivityPub adapter (0.8.7); standing rules: untrusted callers never raise caps, never honor request-supplied proxy/LLM `base_url`.

**Genuinely mitigated (evidence cited per item):** redirect-to-private (per-hop revalidation), byte/decompression caps (post-decompression counting + sharp pixel guard), remote `@context` SSRF (offline loader), malformed HTML/JSON-LD (three fail-closed layers), path traversal (content-addressed writes), credentials (rejected pre-DNS, never stored). PDF: no parser exists (N/A). **Open unknowns needing live tests:** undici routing of `::ffff:` hex forms, Fedify's own SSRF behavior, DTD entity expansion in the feed parser, CRLF safety of log sinks.

--

## PROVENANCE / COVERAGE FINDINGS

**Per-field provenance chain breaks identically for all three facts walked** (Happy Place service "Pergola Design Consultations", Happy Place phone, Coppersmith phone): render → object field → object-level provenance ref → fixture header (source URL, per-file sha256, observedAt, pipeline commit) → raw byte snapshots all trace cleanly; then per-field granularity is lost when `ExtractedField` collapses to a scalar map in `project()`, and `dump.py` drops even the coarse `fieldClasses` sidecar. Two concrete corruptions: `dump.py` **forces `provenance.kind = "canonical-journal"`** for overlay-added objects while the website repo already has the truthful `overlay-authored` kind (demo-operator content mislabeled as canonical fact); the Coppersmith phone is **extractor-version-sensitive** (missed by the 12:01 run, caught by the 13:50 regen) and extractor version is not recorded per field.

**Who owns "NO INVENTED CLAIMS":** no single authority - four seams: (1) read-seam law "NO CUSTOMER FACT WITHOUT A TRACEABLE BASIS" (object-level), (2) renderer `verifyPresentationBinding` via `boundField` - the actual render-time veto, fail-closed, (3) planner `verifyGeneratedPresentation` (CopyBinding claimRef match), (4) Ask FYD 3-class contract (supported/derived/unknown, refusal on no evidence). The renderer decides classifications itself (defaults "direct"); the extractor's classes never reach it. **Smallest existing seam to enforce the invariant: `verifyPresentationBinding` + provenance survival through `project()`/dump - no new ClaimAuthority.** Dead gate found: the "generated" classification requires a `generatorRef` that nothing ever supplies. **Parallel universes confirmed:** PING `EvidenceAuthority` has zero references in either direction with the FYD evidence model; joined only by `FYD_SITE_OVERLAY` transport and unresolvable `ping-event:<eid>` string pointers.

**Coverage - computable today vs needing instrumentation.** Computable now: signals discovered / by-class / by-source, unsupported types, objects/relationships, private-withheld, @graph-verified node ids, media per-URL outcomes (Coppersmith: 11 ingested / 3 rejected - the most complete surface). Pages fetched/failed derivable from `acquired[]` but not aggregated. **Needs instrumentation: signals consumed/unused (`resolve()` drops losers silently) and CONFLICTS (field, winner, losers) - the highest-value missing metric.** The `PipelineReport` is computed in memory but never persisted; no report artifact exists in the runs dir.

**Visibility ≠ extraction.** Extraction-side exists and is wired (street_address → private, withheld pre-projection; coarse locality published). Visibility-side is designed but unwired: `field-visibility.ts` has per-field show/hide/coarse + safe defaults with an explicit "not wired" header; Ask FYD calls it with an empty decisions list; the owner store has site-level address toggle and per-service visibility but **no per-field phone/email hide** and no decision store. Use PING's governance namespaces for policy; do not create FYD-only privacy truth.

**Entity resolution:** sameAs/@id/canonical matching exists at the deterministic level; ambiguous merges are not recorded - record ambiguity, never silently merge (not yet implemented).

**Media (Nolan's decision: ingest authorized media):** full pipeline verified on Coppersmith - source observations → sha256 digests → metadata (alt-text source labeled) → derivatives with `derivedFrom` lineage → local serving, never hotlinked. Classification: **CACHE/DERIVATIVE** (`public-demo-source`), never ownership; `unclear-reference-only` refuses fetch/derive/serve (3 rejected). Gap: `depicts[]` empty on all assets (object join works via `represented_by` relationships instead). PING has no binary store - adopt the `hpp_project_artifacts` URL-reference + metadata-registry shape; bytes stay out of Postgres.

--

## KNOWLEDGE-COMPOUNDING OPPORTUNITIES

The economic question: when expensive intelligence solves something, can the result become cheap software next time? Compounding exists informally today; nothing is first-class.

**What exists (informal):** RUN-NOTES → code comments citing "RUN-NOTES #N"; named deterministic detectors in `service-cards.ts` (the real "intelligence learns once, software replays cheaply" artifact); owner overrides as persistent first-party facts (SOURCE SAYS X / OWNER SAYS Y preserved in `owner-overlay.ts`). Zero "recipe" hits in `src/fyd` - no first-class recipe store.

**The compounding map (where the learned artifact would live; bold = missing):**

| Expensive win | Cheap replay | Lives today? |
|--|--|--|
| Site navigation learned | acquisition recipe (URLs + selectors + levels) | **No - no recipe store** |
| Page classification learned | deterministic matcher | Partial - `service-cards.ts` detectors, `SITE_CHROME_TYPES` (1 entry) |
| Entity mapping confirmed by owner | future exact match | Partial - owner overlay persists, but no match-memory |
| Owner corrects service classification | persistent first-party fact | Yes - owner overlay journal |
| Site component preference | persistent override | Yes - presentation-intent layer |
| Extraction procedure learned | keyed cache (bytes-digest × extractor-version) | **No** |

**Top compounding backlog:** (1) persist `ExtractedField[]` + `PipelineReport` per run - one write, unlocks retroactive per-field provenance + coverage; (2) survive per-field provenance through `project()` → dump → projection (the single seam fix behind nearly every finding); (3) record `resolve()` conflicts; (4) emit `overlay-authored` from `dump.py`; (5) keyed extraction cache - the Firecrawl-`deterministicJson` shape; **share extractors across tenants, never values** (tenant safety rule); (6) wire `field-visibility.ts` into render + build the decision store.

**Recipe lifecycle to adopt (from Firecrawl's shape):** VALID → STALE → RELEARN, with `RECIPE VERSION`, `DISCOVERY EVIDENCE`, `REPLAY RESULT` recorded per recipe. On replay failure: fail closed, flag stale, relearn - never silently degrade.

--

## THINGS WE SHOULD DELETE / NOT BUILD

**Delete / archive (per the anti-amnesia rule - classify and isolate, never silent-delete):**
- The two dormant GitHub acquisition stacks (Stack A `github_worker.py`, Stack B connector chain) - keep the connector interface, archive the rest. Both have 0 rows and 0 events in ~2.5 months.
- `src/fyd/onboarding/extractor.ts` - wrap into the real pipeline (parallel extractor that feeds nothing).
- One of the two digest laws (`proceduralize/patch.ts` vs `ask-composer.ts`) - unify with IR convergence.
- Two of the three URL-safety authorities (`isSafeWebHref` regex, inline prefix checks) - unify under `resolveSafeLink`.
- One binding authority: `src/fyd/sitespec/graph.ts` vs `src/fyd/builder/manifest.ts`.

**Do NOT build:**
- No new crawler company: no Crawl4AI Docker server, no Firecrawl Cloud/self-host, no Browser Use, no Lightpanda-as-foundation. Playwright is the Level 4 fallback.
- No new claim/evidence authority (fix provenance survival instead).
- No new acquisition pipeline (wire `safe-fetch` into the existing adapter).
- No new binding system, no fourth patch IR, no new tenant machinery (the tenant boundary is the strongest-built part).
- No PING binary media store (registry shape instead).
- No production auth inside the 24h (DEMO_OWNER_MODE seam only, visibly incapable of becoming production auth).
- No adtech in the first 24h (verified: none exists in the tree; preserve the architecture for site-strategy → campaign proposals later from the same graph).
- No web archive: provenance keeps digests + selective raw bytes, not the internet. Share extractors across tenants, never values.
- No FYD-only privacy truth (use PING governance namespaces).
- No ActivityPub wiring until the adapter goes through `safe-fetch`.
- No Puck-as-backend, no Payload CMS, no Tambo fullstack, no json-render package.

**P3 / deferred (not in the 24h):** git-first GitHub worker (until first software-product customer); Article/Post entity projection; global `EventReadAuthority` namespace fix (seam-local first); CRDT/collaboration state anywhere near SiteSpec.

--

## TOP 20 BACKLOG

Scoring: `USER IMPACT × FREQUENCY × MOAT LEVERAGE × REUSE` against `IMPLEMENTATION COST × RISK × DEPENDENCY WEIGHT`, each factor H/M/L. Tags: P0 blocks URL→trusted presence or is an active vulnerability; P1 materially improves acquisition quality; P2 improves cost/scale; P3 optional/future. HARVEST = use existing machinery/patterns; BUILD = new FYD code.

**H-001 - Live ACQUIRE via safe-fetch (FYD-002 root)** · P0
PROBLEM: No live acquisition pipeline; demo chain is hand-operated pinned bytes. EVIDENCE: lane A - `acquire()` never called, `AcquiredSource{ok:true,status:200}` synthesized, `AcquisitionAdapter` has no implementation. CURRENT FAILURE: URL→site requires ~8 human steps; nothing is repeatable in-repo. PROPOSED CHANGE: implement the adapter on `src/fyd/net/safe-fetch.ts`; wire `discover()`+`acquire()` into the regen path; record final URL, redirect chain, content-type, bytes, timings per source. HARVEST. USER IMPACT H (must-win #1 is gated on this). MOAT IMPACT H (the acquisition contract is the moat). COST M. RISK M (activates the 5 security exposures - land H-002..005 first or gate intake). DEPENDENCIES: H-002..H-005. ACCEPTANCE TEST: `URL in → bytes → observations → evidence → objects` for both demo sites with zero human steps; redirect chain and final URL recorded; byte-identical re-run. SCORE: H×H×H×H vs M×M×L.

**H-002 - Gate capability hrefs (stored XSS)** · P0
PROBLEM: `buildCapabilities` interpolates raw observed `website`/`phone`/`email` into `<a href>` with no gate. EVIDENCE: lane E - full chain `og:url=javascript:` → clickable button in fyd-circle, evidence-chrome, identity-object, PeekCard. CURRENT FAILURE: hostile site metadata becomes executable links on four render surfaces. PROPOSED CHANGE: route every capability href through `resolveSafeLink` (the one authority, per H-013). HARVEST. USER IMPACT H. MOAT IMPACT L. COST L. RISK L. DEPENDENCIES: H-013. ACCEPTANCE TEST: ingest `<meta property="og:url" content="javascript:alert(1)">`; assert every rendered website capability href is absent or `http(s):` across all four surfaces. SCORE: H×H×L×H vs L×L×L.

**H-003 - IPv6 transition-form SSRF blocklist** · P0
PROBLEM: `isPublicIp` misses hex-form IPv4-mapped (`::ffff:7f00:1`), 6to4, NAT64, Teredo, `::`. EVIDENCE: lane E; Crawl4AI closed this class in 0.8.8. CURRENT FAILURE: `http://[::ffff:7f00:1]/` passes as public. PROPOSED CHANGE: normalize mapped-v4, blocklist transition forms (adapt Crawl4AI 0.8.7/0.8.8). HARVEST. USER IMPACT H. MOAT L. COST L. RISK L. DEPENDENCIES: none. ACCEPTANCE TEST: `isPublicIp` returns false for `::ffff:7f00:1`, `::ffff:0:7f00:1`, `64:ff9b::7f00:1`, `2002:7f00:1::`, `::`. SCORE: H×M×L×H vs L×L×L.

**H-004 - DNS-rebinding peer-IP pinning** · P0
PROBLEM: gate DNS-check and fetch connect are separate resolutions (TOCTOU). EVIDENCE: lane E; Crawl4AI 0.9.3 GHSA-q5rj-45vw-vp2g fixed this exact shape. CURRENT FAILURE: TTL-0 domain can pass the gate public and rebind to `169.254.169.254` before connect. PROPOSED CHANGE: validate the peer IP of the response actually read back (adapt Crawl4AI). HARVEST. USER IMPACT H. MOAT L. COST M. RISK M. DEPENDENCIES: none. ACCEPTANCE TEST: alternating-DNS test host; fetch must fail closed on rebind. SCORE: H×M×L×M vs M×M×L.

**H-005 - Remove resolved-address echo (DNS oracle)** · P0
PROBLEM: fail reasons include resolved IPs verbatim, returned to unauthenticated preview callers. EVIDENCE: lane E (`safe-fetch.ts` fail strings → `POST /api/fyd/onboarding/preview` → 502 with message). CURRENT FAILURE: internal DNS→IP enumeration via the public endpoint. PROPOSED CHANGE: generic failure + correlation ID (adapt Crawl4AI 0.8.8/0.9.0). HARVEST. USER IMPACT H. MOAT L. COST L. RISK L. DEPENDENCIES: none. ACCEPTANCE TEST: preview with `http://internal-only-host/` returns generic failure with no IP literal. SCORE: H×M×L×H vs L×L×L.

**H-006 - Per-field provenance survival through project()/dump** · P0
PROBLEM: `ExtractedField` collapses to scalar maps; `fieldClasses` and extractor version dropped; `dump.py` forces `canonical-journal`. EVIDENCE: lane F - all three walked facts break at per-field granularity; Coppersmith phone is extractor-version-sensitive. CURRENT FAILURE: "no invented claims" unenforceable; Ask FYD citations can't distinguish direct/derived; demo-operator content mislabeled canonical. PROPOSED CHANGE: survive `ExtractedField[]` (with extractor name+version, confidence, factClass) through `project()` → dump → projection; emit truthful `overlay-authored`. HARVEST+BUILD. USER IMPACT H. MOAT IMPACT H (evidence is the trust). COST M. RISK L. DEPENDENCIES: none. ACCEPTANCE TEST: the three walked facts each resolve to source URL + method + extractor version + digest + time; overlay objects labeled `overlay-authored`. SCORE: H×H×H×H vs M×L×L.

**H-007 - `GET /tenant/:id/graph` (the one backend seam)** · P0
PROBLEM: no sanitized tenant-graph projection exists anywhere (absence proven, lane G). EVIDENCE: `dump.py` reads the gateway container's Postgres directly, bypassing every governance boundary; against the live DB it yields zero overlay rows. CURRENT FAILURE: FYD has no legitimate read contract for tenant+objects+relationships+evidence+media+capabilities+visibility+recent-changes. PROPOSED CHANGE: one read-only route with server-side `WHERE namespace` enforcement (closing the `/events` read gap seam-locally). BUILD (small). USER IMPACT H. MOAT IMPACT M. COST M. RISK M (auth-free gateway - read-only + namespace filter keeps blast radius small). DEPENDENCIES: none (reads existing tables). ACCEPTANCE TEST: returns the `tenant::hpp` graph (177 events, knowledge nodes, media registry, capabilities, policy) with zero cross-tenant leakage; unfiltered `/events` never used by FYD. SCORE: H×H×M×H vs M×M×L.

**H-008 - Converge 3 patch IRs → 1 typed SitePatch IR** · P0
PROBLEM: Ask FYD `site_patch` (dead: zero provider callers; approved patches die - `dump.py` never reads OBJECT_UPDATED), customize `site_patch` (live, different digest law), `OwnerCommand` (live, fact corrections). Same name, incompatible bodies, two digest laws, two replay fates. EVIDENCE: lane I. CURRENT FAILURE: Puck and Ask FYD cannot share an IR; no single IR covers facts+presentation+visibility. PROPOSED CHANGE: one IR (facts + presentation + visibility), one digest law, one replay journal (`FYD_SITE_OVERLAY`), one approval UX. Start from Ask FYD's shape (best-formed) + customize's live replay. HARVEST. USER IMPACT H. MOAT IMPACT H (the product's change spine). COST M. RISK M. DEPENDENCIES: none. ACCEPTANCE TEST: a human Puck edit and an Ask FYD proposal produce the same IR shape, verify under one digest law, replay through one journal. SCORE: H×H×H×H vs M×M×L.

**H-009 - Deterministic HTML content extractors (body-text tier)** · P1
PROBLEM: headings, link inventory, visible text, context-gated contact patterns, microdata unextracted - PARSING loss on 13/13 corpus sites. EVIDENCE: lane B (2.53 MB Wix page → 5 facts; karpathy.ai → 1). CURRENT FAILURE: service/contact evidence present in HTML never becomes facts. PROPOSED CHANGE: body-text tier with chrome filtering (fix `SITE_CHROME_TYPES` doc/code mismatch); headings/link/phone extractors; microdata. BUILD. USER IMPACT H. MOAT IMPACT M. COST M. RISK L. DEPENDENCIES: H-001. ACCEPTANCE TEST: corpus PARSING-loss count drops; karpathy.ai yields >1 fact; Wix page yields services. SCORE: H×H×M×H vs M×L×L.

**H-010 - Multi-page + structured-endpoint discovery** · P1
PROBLEM: no sitemap traversal, no multi-page acquisition, no platform endpoints - DISCOVERY loss on 10/13. EVIDENCE: lanes A (sitemap branch does nothing), B. CURRENT FAILURE: location subtrees, product feeds, `/products.json`, `?format=rss` never discovered. PROPOSED CHANGE: wire `discover()` (sitemap as inventory + platform endpoints + bounded same-origin discovery) into live ACQUIRE. HARVEST+BUILD. USER IMPACT H. MOAT IMPACT M. COST M. RISK M (crawl budget/robots discipline). DEPENDENCIES: H-001. ACCEPTANCE TEST: multi-location site yields all locations; Shopify `/products.json` consumed; sitemap parsed, not just fetched. SCORE: H×H×M×H vs M×M×L.

**H-011 - Persist PipelineReport + ExtractedField[] per run** · P1
PROBLEM: coverage report computed in memory, never persisted; no report artifact in runs dir. EVIDENCE: lane F. CURRENT FAILURE: "good enough" is unanswerable; conflicts and unused signals invisible. PROPOSED CHANGE: persist the report + extracted fields per run (one write); aggregate pages fetched/failed from `acquired[]`. BUILD. USER IMPACT M. MOAT IMPACT H (coverage is the deepest advantage). COST L. RISK L. DEPENDENCIES: H-006. ACCEPTANCE TEST: per-run report artifact exists with signals discovered/consumed/unused/unsupported, pages discovered/fetched/failed, objects/relationships. SCORE: M×H×H×H vs L×L×L.

**H-012 - Record resolve() conflicts** · P1
PROBLEM: field conflicts (winner/losers) dropped silently. EVIDENCE: lane F - highest-value missing metric. CURRENT FAILURE: conflicting sources invisible; no basis for owner arbitration. PROPOSED CHANGE: emit conflict records (field, winner, losers, rule) into the persisted report. BUILD. USER IMPACT M. MOAT IMPACT H. COST L. RISK L. DEPENDENCIES: H-011. ACCEPTANCE TEST: a page with conflicting phone sources produces a conflict record naming winner and losers. SCORE: M×M×H×H vs L×L×L.

**H-013 - Unify URL safety under one authority** · P1
PROBLEM: three competing implementations (`resolveSafeLink`, `isSafeWebHref` regex, inline prefix checks). EVIDENCE: lane E - sovereignty violation; next caller picks the wrong one. CURRENT FAILURE: policy drift across sinks. PROPOSED CHANGE: `resolveSafeLink` everywhere; delete the regex and inline checks. HARVEST. USER IMPACT M. MOAT IMPACT L. COST L. RISK L. DEPENDENCIES: none (enables H-002). ACCEPTANCE TEST: one grep finds one URL-safety authority; all sinks route through it. SCORE: M×H×L×H vs L×L×L.

**H-014 - Wire field-visibility + decision store** · P1
PROBLEM: `field-visibility.ts` designed but unwired; no per-field phone/email hide; no decision store; Ask FYD calls it with empty decisions. EVIDENCE: lanes F, I. CURRENT FAILURE: OBSERVED ≠ RENDERED unenforceable per-field; owner can't say SHOW/HIDE/USE CITY ONLY/USE SERVICE AREA. PROPOSED CHANGE: wire into render + Ask FYD; build the decision store on PING governance namespaces (no FYD-only privacy truth). HARVEST+BUILD. USER IMPACT H. MOAT IMPACT M. COST M. RISK L. DEPENDENCIES: H-007 (namespace policy). ACCEPTANCE TEST: owner hides phone per-field; public render and Ask FYD both withhold; coarsened locality still renders. SCORE: H×M×M×H vs M×L×L.

**H-015 - Ask FYD owner mode + PROPOSE wiring** · P1
PROBLEM: `mode:"owner"` explicitly visitor-safe; PROPOSE exists only as the dead IR-1 draft; Ask reasons over the base spec while the page renders the intent-layered spec. EVIDENCE: lane I. CURRENT FAILURE: the critical loop (understand → owner confirm/correct/hide → correction becomes stronger evidence → regeneration respects it) can't run. PROPOSED CHANGE: owner mode adds analyze/recommend/PROPOSE structured changes via the converged IR (H-008); fix the spec mismatch (reason over the rendered spec). BUILD. USER IMPACT H. MOAT IMPACT H. COST M. RISK M. DEPENDENCIES: H-008. ACCEPTANCE TEST: owner asks "feature our drain services", approves the digest-bound proposal, regeneration reflects it, correction persists as first-party evidence. SCORE: H×H×H×M vs M×M×L.

**H-016 - Puck projection adapter + translator (design)** · P1
PROBLEM: no human visual editor; customize panel is keyword-driven. EVIDENCE: lane H - Puck 0.23.0 MIT, React 18-compatible. CURRENT FAILURE: visual editing requires hand-built canvas work or nothing. PROPOSED CHANGE: design SiteSpec→Puck projection + Puck-diff→SitePatch translator with rejection classes (query/binding edits rejected); Puck data never persisted. HARVEST. USER IMPACT H. MOAT IMPACT M. COST M. RISK L. DEPENDENCIES: H-008. ACCEPTANCE TEST: design doc with projection mapping per registry component, rejection classes enumerated, no-CRDT invariant stated. (Integration follows the IR convergence.) SCORE: H×M×M×H vs M×L×M.

**H-017 - proposed_actions table + routes (BusinessActionAuthority)** · P1
PROBLEM: closest typed-patch IR has zero callers and no table. EVIDENCE: lane G. CURRENT FAILURE: PING-side proposal/approval can't serve SiteSpec patches. PROPOSED CHANGE: create `proposed_actions`, mount `POST /actions/propose`, `POST /actions/:id/{approve,reject}`, `GET /actions/:id`; map `capability='sitespec.patch'`, evidence[]=field provenance refs. BUILD (small). USER IMPACT M. MOAT IMPACT M. COST L. RISK L. DEPENDENCIES: H-008. ACCEPTANCE TEST: a SitePatch proposal round-trips PENDING_HUMAN → APPROVED with decided_by/at recorded. SCORE: M×H×M×H vs L×L×L.

**H-018 - ActivityPub adapter through safe-fetch** · P1
PROBLEM: `webfinger.ts:78` fetches remote-supplied URLs outside the SSRF gate (latent - only the dev probe calls it). EVIDENCE: lane E. CURRENT FAILURE: future wiring inherits SSRF. PROPOSED CHANGE: route through `safe-fetch` (adapt Crawl4AI 0.8.7 webhook-style defense). HARVEST. USER IMPACT M. MOAT IMPACT L. COST L. RISK L. DEPENDENCIES: none. ACCEPTANCE TEST: webfinger fetch of a private-IP `self` URL fails closed. SCORE: M×L×L×M vs L×L×L.

**H-019 - Keyed extraction cache (bytes-digest × extractor-version)** · P2
PROBLEM: no cache; re-extraction re-pays full cost. EVIDENCE: lanes C (Firecrawl `deterministicJson` shape), F. CURRENT FAILURE: repeated intelligence spend on identical bytes. PROPOSED CHANGE: cache keyed on (bytes-sha256, extractor name+version); share extractors across tenants, never values. BUILD. USER IMPACT M (cost/latency). MOAT IMPACT M. COST L. RISK L. DEPENDENCIES: H-006. ACCEPTANCE TEST: identical bytes + same extractor version = cache hit, zero re-extraction; version bump = miss. SCORE: M×H×M×H vs L×L×L.

**H-020 - Schema.org mapping expansion + entity typing** · P2
PROBLEM: 60 unsupported corpus items; `SoftwareApplication`/`FAQPage` unmapped; person/project mistyped as business. EVIDENCE: lane B. CURRENT FAILURE: SCHEMA + ENTITY-RESOLUTION losses. PROPOSED CHANGE: extend the type map (keep `jsonld` 9.0.0 pinned; schema.org version-aware per 2026-09-21 constraint; preserve unknown types); deterministic entity typing before any AI resolution; record ambiguity, never silently merge. HARVEST+BUILD. USER IMPACT M. MOAT IMPACT M. COST M. RISK L. DEPENDENCIES: H-009. ACCEPTANCE TEST: corpus unsupported-item count drops; person site typed Person with recorded ambiguity. SCORE: M×M×M×M vs M×L×L.

--

## PROPOSED 24-HOUR SPRINT

Frame: PRODUCT/UI sprint, not backend convergence, shaped by Nolan's locked product decisions (2026-09-22). Everything listed harvests existing PING machinery or closes a proven absence; nothing here creates a new authority, event store, claim system, auth system, or browser stack. The 24-hour clock has not started; this is the recommended shape awaiting Nolan's official directive.

**Locked architecture (the sprint must not deviate):** FYD SITE IR -> {Ask FYD, Visual UI, Form UI} -> TYPED PATCH -> VALIDATION -> AUTHORIZATION -> VERSION -> RENDERER. Human visual edits, form edits, and Ask FYD edits all terminate in the same typed patch. Never two representations.

**Goal:** Nolan stress-tests COLD real URLs (unknown business -> credible presence, no prep) as the primary demo. The owner correction loop is the NEXT gate after the sprint proves cold acquisition, not a replacement demo.

**Work items, in Nolan's locked order (harvest-first):**

1. **Keep the 195/195 gate; commit the mobile fix isolated.** No scope bleed into the acquisition work.
2. **Keep URL-safety + binding verifier + visibility override** (H-002, H-003, H-004, H-005, H-013) - gate capability hrefs; IPv6 transition-form blocklist; DNS-rebinding peer-IP pinning; DNS-oracle removal; ActivityPub through safe-fetch; one URL-safety authority. Each ships with a lane E threat-test. *Why first:* cold-URL intake is unsafe on arbitrary URLs without these.
3. **Semantic render determinism regression** - SiteSpec + ObjectGraph snapshot + ViewerContext + RendererVersion -> same semantic render model (section order, component identity, bound IDs/fields, actions, visibility, navigation); explicit tie-breaks; never DB order/insertion/time/random.
4. **Wire live ACQUIRE** (H-001) - implement `AcquisitionAdapter` on `safe-fetch`; `discover()`+`acquire()` into the regen path; record final URL, redirect chain, content-type, bytes, timings. Run both demo tenants end to end with zero human steps; assert byte-identical re-runs.
5. **Persist per-field provenance + the PipelineReport** (H-006, H-011, H-012) - survive `ExtractedField[]` (extractor name+version, confidence, factClass) through `project()` → dump → projection; write one report artifact per run (signals discovered/consumed/unused/unsupported, conflicts, pages discovered/fetched/failed, objects/relationships); emit truthful `overlay-authored`.
6. **Binding verifier at the SiteSpec/projection seam, BEFORE render** - FACTUAL binds to graph/evidence; PRESENTATIONAL needs no binding; GENERATED MARKETING COPY explicitly labeled derived. (The existing `verifyPresentationBinding` is the seam; H-006 makes its inputs truthful.)
7. **Visitor Ask FYD** - full evidence-bounded Q&A: answer + evidence_refs + object_refs + unknowns + suggested actions; cannot-verify when unsupported. Visitor and owner share one concierge engine; context and capabilities differ.
8. **Converge the patch IRs** (H-008) - one IR (facts + presentation + visibility), one digest law, one replay journal (`FYD_SITE_OVERLAY`), one approval UX.
9. **Owner correction loop end to end** (H-014, H-015, H-017) - OBSERVED FACT -> owner confirm/correct/hide -> decision recorded -> projection changes -> regeneration -> decision survives. Owner corrections NEVER rewrite source observations. Four layers stay separate: SOURCE VISIBILITY / DEFAULT POLICY / OWNER OVERRIDE / EFFECTIVE VISIBILITY. Owner mode adds analyze/recommend/PROPOSE structured changes through the converged IR. `DEMO_OWNER_MODE=true` with a visible indicator, never public; proposals logged as demo-authorized.
10. **Ask FYD site edit** - NL -> typed patch -> preview -> confirm -> apply (H-015 + H-017).
11. **Re-observation coexistence proof** - re-run acquisition over an owner-corrected tenant (H-019 cache groundwork); source observations and owner overrides coexist; decisions survive.
12. **THEN thin Puck proof over the same IR** (H-016 design) - Puck is secondary: an optional visual editor OVER FYD's IR (its config+data+renderer separation supports this). Never before the Ask FYD path works end to end.
13. **The one backend seam** (H-007) - `GET /tenant/:id/graph`, read-only, server-side namespace enforcement; `dump.py` migrates from direct DB reads to this contract.

**Locked deployment shape:** builder + real preview is enough. Single multi-tenant renderer (hostname -> TenantResolver -> published SiteSpec version -> projection -> renderer). No per-tenant Next.js apps. Preserve the seam to customer.fyd.social, later customer.com (Vercel multi-tenant patterns now, Cloudflare for SaaS later).

**Locked product rules for the sprint:** Tenants stay Happy Place + Coppersmith; Monument View (if authorized) enters only after the correction loop works. Media: ingest/serve derivatives only with a rights basis (source_url, digest, type, dimensions, observed_at, evidence_ref, rights/basis, derivatives[]); cold URLs without reuse rights -> hotlink-where-permitted or omit. Planner stays deterministic eligibility (schema/cardinality/relationship/capability -> eligible components); intelligence ranks among eligible; owner overrides order/visibility/featured/variant. WHY THIS is a quiet contextual trust primitive, not the homepage centerpiece.

**Metrics (locked):** time-to-credible-presence + mobile UX + contact discoverability + service discoverability + performance. If the original site wins a comparison: RECORD LOSS and fix the generic generator - never hand-patch the tenant.

**Non-goals (locked NO list):** full visual-editor architecture, per-tenant React apps, theme marketplace, general CMS, new graph DB, new evidence/claim/site authorities, new workflow engine, protocol adapters, campaign engine, social harvesting implementation. Plus the audit's own: production auth, adtech implementation, ActivityPub wiring, GitHub ingestion, browser stack changes, Firecrawl Cloud, PING blob store, new acquisition pipelines.

**Acceptance bar:** cold URL in -> credible, accurate, responsive presence in minutes -> per-field provenance traceable for any fact -> visitor Ask FYD evidence-bounded -> owner correction loop end to end with decisions surviving regeneration -> must-win #1 measured with numbers -> RECORD LOSS on any comparison the original site wins.

--

## GRILL - WHY THIS PLAN COULD STILL BE WRONG

1. **The corpus is 13 hand-picked sites, three with flagged picks** (lane B caveats). If the corpus isn't representative of actual customer sites, "12 of 13 at Level 3" is a comforting statistic about the wrong population. The sprint should re-run on the first real customer URL, not the demo pair.
2. **Security closures first could be the wrong order.** If live ACQUIRE is the must-win gate, security-first delays it by ~a day. The counter (Nolan's explicit standing rule: security before arbitrary-URL intake) holds, but it's a sequencing bet, not a law.
3. **The tenant-graph seam could be overbuilt.** `dump.py` works today via direct DB reads. The honest alternative: keep `dump.py` as a build-time tool and never expose the route. The seam wins on sovereignty (one read contract, governance-enforced) but it's real new surface on an auth-free gateway.
4. **Puck might not be worth its projection cost.** The customize panel already edits the live IR. If the translator design reveals per-component projection work approaching a rewrite of the panel, the panel wins and Puck dies.
5. **Deterministic extractors could plateau.** If real customer sites are JS-shell-heavy SPAs, the 12/13 claim collapses and the sprint's Level 3 budget is wrong. The Playwright fallback is planned but unmeasured (host deps missing).
6. **Provenance nobody queries is cost without value.** H-006/H-011/H-012 are cheap to write but the value only materializes through Ask FYD citations and owner arbitration - both H-015 work. Without those consumers, the reports are write-only.
7. **One IR to rule three systems invites a lowest-common-denominator IR.** Ask FYD's well-shaped proposal draft, customize's live replay, and owner corrections have different real needs. Convergence could satisfy all three poorly.
8. **The extraction cache (H-019) compounds nothing until re-observation exists.** If re-observation cadence is quarterly, the cache saves one extraction per quarter per page. Cheap, but not a moat.
9. **Deferring GitHub could strand the first software customer.** If the first paying FYD customer is a software product, the deferred lane becomes a blocker with zero runway. The bet is that trades come first - checkable against the prospect pipeline.
10. **The must-win #1 bar is undefined.** "Credible presence in minutes" needs a number (minutes? coverage %? comparative UX score?) or the sprint can't pass or fail honestly. That's an operator decision, not an agent one.

--

## FINAL RETURN

### FACTS
- No live URL-to-site acquisition pipeline exists. The demo chain is ~8 human steps; `acquire()` is never called; `AcquisitionAdapter` has no implementation. (A)
- 12/13 corpus site categories are acquirable at deterministic HTML parsing or below; 1 needs rendering; 0 need interaction. (B)
- Playwright 1.63.0 is installed and sufficient for the Level 4 fallback; only Pig OS libraries block it. (C)
- Two GitHub stacks exist, both dormant, 0 rows, 0 events ever; no git protocol anywhere; minimum useful set is Repository/Document/Release. (D)
- Five live security exposures: stored XSS via capability hrefs, IPv6 SSRF bypass, DNS-rebinding TOCTOU, DNS oracle, ActivityPub outside the SSRF gate. (E)
- Per-field provenance dies at `project()`/dump; `fieldClasses` dropped; extractor version dropped; overlay content mislabeled `canonical-journal`; conflicts dropped. (F)
- PING has 8 capabilities FYD can call today; the single proven-missing piece is a sanitized tenant-graph projection; no binary media store; no HTTP auth. (G)
- Puck 0.23.0 (MIT, React 18) + Tambo's selection pattern + one typed SitePatch IR is the recommended editor pairing; Payload/Object UI/OpenPage/json-render rejected as packages. (H)
- Three incompatible patch IRs; Ask FYD is visitor-only keyword Q&A on the wrong spec; owner loop is dead; visibility designed but unwired; 15+ silent losses; FYD-002 is the root. (I)

### CONTRADICTIONS
- The design docs describe a 15-boundary pipeline with a net-gate; the code bypasses `discover()`/`acquire()` and the gate is unwired to the proceduralizer.
- The `field-visibility.ts` header says "not wired" while the object-projection module documents the visibility layers as if they operate.
- Three proposal systems exist (`ProposalPipeline`, `BusinessActionAuthority.proposeAction`, `ApprovalAuthority`) and all are partial; two of them have zero callers.
- PING's `EvidenceAuthority` and FYD's evidence model are parallel universes joined only by string pointers.
- The live DB has 2321 events but the demo tenants' overlays live only in the website repo's journals - FYD is not actually consuming the event authority it claims as substrate.

### LOCKED PRODUCT DECISIONS (Nolan, 2026-09-22 - constraints on the sprint, not proposals)
- Demo: Nolan stress-tests COLD real URLs first; the owner correction loop is the NEXT gate, not a replacement.
- Edit order: Ask FYD -> typed patch -> proposal -> confirm -> regenerate FIRST end to end; Puck SECONDARY as an optional visual editor OVER FYD's IR; never two representations.
- Edit spine: FYD SITE IR -> {Ask FYD, Visual UI, Form UI} -> TYPED PATCH -> VALIDATION -> AUTHORIZATION -> VERSION -> RENDERER.
- Correction loop: OBSERVED FACT -> owner confirm/correct/hide -> decision recorded -> projection changes -> regeneration -> decision survives; owner corrections NEVER rewrite source observations; SOURCE VISIBILITY / DEFAULT POLICY / OWNER OVERRIDE / EFFECTIVE VISIBILITY stay separate.
- Deployment: builder + real preview is enough; single multi-tenant renderer (hostname -> TenantResolver -> published SiteSpec version -> projection -> renderer); no per-tenant Next.js apps; seam to customer.fyd.social, later customer.com.
- Tenants: Happy Place + Coppersmith stay; Monument View (if authorized) only after the correction loop works.
- Media: ingest/serve derivatives only with a rights basis (source_url, digest, type, dimensions, observed_at, evidence_ref, rights/basis, derivatives[]); cold URLs without reuse rights -> hotlink-where-permitted or omit.
- DEMO_OWNER_MODE=true: visible indicator, never public, proposals logged as demo-authorized.
- Ask FYD: answer + evidence_refs + object_refs + unknowns + suggested actions; cannot-verify when unsupported; one concierge engine, visitor and owner differ in context/capabilities.
- Binding verifier at the SiteSpec/projection seam BEFORE render: FACTUAL binds to graph/evidence; PRESENTATIONAL needs no binding; GENERATED MARKETING COPY explicitly labeled derived.
- Semantic render determinism: SiteSpec + ObjectGraph snapshot + ViewerContext + RendererVersion -> same semantic render model; explicit tie-breaks; never DB order/insertion/time/random.
- Planner: deterministic eligibility (schema/cardinality/relationship/capability -> eligible); intelligence ranks among eligible; owner overrides order/visibility/featured/variant.
- Metrics: time-to-credible-presence + mobile UX + contact discoverability + service discoverability + performance; RECORD LOSS on original-site wins, never hand-patch the tenant.
- WHY THIS: quiet contextual trust primitive, not the homepage centerpiece.
- NO list: full visual-editor architecture, per-tenant React apps, theme marketplace, general CMS, new graph DB, new evidence/claim/site authorities, new workflow engine, protocol adapters, campaign engine, social harvesting implementation.

### HARVEST
- Crawl4AI's acquisition patterns (dispatchers, resume, prefetch, declarative boundary) and its 2026 advisory history as FYD's security checklist - adapt patterns, reject the Docker server and pip package.
- Firecrawl's `deterministicJson` recipe lifecycle (VALID → STALE → RELEARN) - adapt the loop shape, reject Cloud and AGPL self-host.
- Lightpanda's PandaScript learn-once/replay-cheap pattern as second witness - reject as foundation.
- Playwright 1.63.0 (already installed) as the Level 4 fallback - schedule host deps as maintenance.
- Puck 0.23.0 as visual-editor shell with FYD owning the two translators; Tambo's registered-vocabulary selection semantics for Ask FYD.
- PING's callable core: event journal, tenant identity, missions, analytics, capability inventory, knowledge/context, identity minting, governance reads - FYD calls these, doesn't rebuild them.
- `BusinessActionAuthority.proposeAction` as the anointed proposal IR (closest typed-patch shape; needs only storage+routes+one caller).
- `hpp_project_artifacts` URL-reference + metadata-registry shape for media; bytes stay out of Postgres.

### DELETIONS
- Two dormant GitHub acquisition stacks (keep connector interface; archive per the anti-amnesia rule).
- `src/fyd/onboarding/extractor.ts` (parallel extractor feeding nothing) - wrap into the real pipeline.
- One of the two digest laws; two of the three URL-safety authorities; one of the two binding authorities.
- Never silently delete: discover → understand → classify → consolidate → verify → archive/delete.

### MISSING SEAMS
- One: `GET /tenant/:id/graph` - read-only, server-side namespace enforcement. The only net-new backend surface the product sprint needs.
- Two PING-side enablers that already exist as code but lack storage/routes: `proposed_actions` for `BusinessActionAuthority`; media metadata registry on the `hpp_project_artifacts` shape.
- Everything else FYD needs is callable today.

### SMALLEST HUMAN DECISIONS (still open; the locked set above is no longer negotiable in the sprint)
- The backend seam: new `GET /tenant/:id/graph` HTTP route vs extending `dump.py`'s direct-DB pattern (recommendation: route).
- The canonical object store: `knowledge_nodes/edges` (live) vs migrating `ping_objects` DDL (recommendation: `knowledge_*`).
- Namespace read gap: seam-local filter vs global `EventReadAuthority` fix (recommendation: seam-local now, global later).
- GitHub: build the git-first worker now vs defer until the first software-product customer (recommendation: defer).
- Playwright: schedule `npx playwright install-deps` on the Pig as maintenance to unblock the Level 4 fallback measurement (recommendation: schedule).

## OPERATOR DECISIONS

1. `GET /tenant/:id/graph`: approve the new read-only HTTP route, or keep `dump.py` reading Postgres directly?
2. Canonical FYD object store in PING: `knowledge_nodes/edges` (live, 197 nodes / 0 edges) or migrate the `ping_objects` DDL to the live DB?
3. Namespace read gap: seam-local filter in the new route, or fix `EventReadAuthority` globally now?
4. GitHub ingestion: build the git-first worker now or defer until the first software-product FYD customer?
5. Schedule `npx playwright install-deps` on the Pig as maintenance to unblock the Level 4 fallback measurement?
6. Must-win #1 needs a number: what is the acceptance bar (minutes, evidence coverage %, comparative score) for "credible presence"?
