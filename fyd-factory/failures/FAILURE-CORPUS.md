# FYD FACTORY FAILURE CORPUS

Mined 2026-09-23 by LANE-MINE from: ~/workspace/FAILURE_LEDGER.md (2875 lines, full read), git history of /home/nolan/projects/ping (branch fyd-factory), src/fyd/TEST-GATE.md, ~/workspace/BACKLOG_PING.md, ~/workspace/BACKLOG_NOLAN.md, ~/workspace/GRILLING-BRIEF.md.

Every entry: ID / INPUT / EXPECTED / ACTUAL / ROOT CAUSE / FIX (if known) / REGRESSION TEST. Only concrete failures. No prose essays.

Status key: OPEN = unfixed at mine time; FIXED = repaired with evidence; MECHANISM VERIFIED = fix artifacts proven, deployment unverified.

## FC-001: SiteSpec validation rejects Coppersmith Explore page (ObjectFeed schema gap) -- OPEN

- INPUT: regenerate Coppersmith fixtures, build, serve, load the site.
- EXPECTED: the generated site renders.
- ACTUAL: browser renders a red "Spec failed validation" error state. Exact error: `pages.explore.sections[0].query: Component 'ObjectFeed' does not accept schema 'ping.social.external_identity@1'`. Happy Place (2 objects, no external_identity) renders fine.
- ROOT CAUSE: the graph extractor yields 4 public objects for Coppersmith (business, location, person, external_identity). The generator builds an Explore page with an ObjectFeed using an `all` query; validation expands the query across known schemas; ObjectFeed.acceptsSchemas does not include ping.social.external_identity@1.
- FIX: none applied. Fix direction: add ping.social.external_identity@1 to ObjectFeed.acceptsSchemas, or exclude non-feedable schemas from the `all` expansion.
- REGRESSION TEST: missing. Should exist: a SiteSpec validation test that builds an Explore ObjectFeed against a graph containing an external_identity object and asserts the spec validates.
- SOURCE: FAILURE_LEDGER.md FL-20260921-031 (2026-09-21 ~08:01 MDT). Evidence: ~/workspace/fyd-proof/coppersmith-plumbing-desktop.png, ~/workspace/fyd-proof/coppersmith-plumbing-mobile.png.

## FC-002: Renderer interpolates javascript: URLs verbatim into href -- MECHANISM VERIFIED

- INPUT: hostile-content probe with javascript:alert(1) in fields.website and javascript:alert(2) in fields.socials.
- EXPECTED: hostile URLs neutralized (never emitted into href).
- ACTUAL: rendered verbatim into href="javascript:...". React only warns; it does not block. Hostile HTML text (<script>, <img onerror>) was correctly neutralized; no dangerouslySetInnerHTML in renderer.tsx or site-client.tsx.
- ROOT CAUSE: direct href={website} and href={url} interpolation in the renderer with no scheme validation.
- FIX (artifacts, not yet proven on live path): resolveSafeLink gate; every observed-data href interpolates only values that resolveSafeLink returned as kind==="safe" (website/phone/email/socials). Unguarded hrefs are internal routes only ("#ask", "/o/" + encodeURIComponent(id)).
- REGRESSION TEST: fyd-lane/safe-link.test.ts, 16/16 PASS (2026-09-23 ~01:55 MDT falsification run, jest 29 + ts-jest 29): rejects javascript: (plain, mixed-case, whitespace-prefixed, control-char-smuggled), data:/vbscript:/file:/blob:, percent-encoded scheme tricks, malformed URLs, non-string input, relative URLs without explicit safe base; deterministic on repeat.
- SOURCE: FAILURE_LEDGER.md FL-20260921-032 + verification note (2026-09-23 ~01:55 MDT). Sinks: renderer.tsx, site-client.tsx. Live-path rerun of step5-hostile.ts on the Pig repo is still the pending proof.

## FC-003: Ask FYD "Design tokens" proposal row overflows at 320px viewport -- FIXED

- INPUT: render Happy Place / Coppersmith demo sites at 320px viewport, measure document scroll width.
- EXPECTED: scrollW <= 320.
- ACTUAL: scrollW = 331 > 320. Exact owner: `label.flex` (min-width:auto) + `input.flex-1` (min-width:auto, will not shrink below intrinsic width) + "Propose" button (min-width 44px touch target, min-content 55px) in src/app/sites/happy-place/site-client.tsx (shared by both demo sites).
- ROOT CAUSE: flex input refused to shrink below its intrinsic width, pushing the row past the viewport.
- FIX: one class, min-w-0 added to the token input. Button keeps its 44px+ touch target (69px at 320px); input shrinks to fit. Verified matrix on clean c5188f9+fix build: 320px both sites PASS (scrollW=305), 375px both PASS (scrollW=360), 1280px both PASS (scrollW=1265).
- REGRESSION TEST: trace-driver.js + owners-probe.js in ~/workspace/fyd-lane/; replay via C:/Temp/runtrace-vp.ps1 on the Pig. No committed jest test yet. Should exist: viewport overflow test asserting docScrollW <= viewport width at 320/375 for both demo sites.
- SOURCE: FAILURE_LEDGER.md FL-20260921-033 (update 2026-09-21 ~09:05 MDT); BACKLOG_PING.md records commit 8a997421 (2026-09-21, one file staged) and FYD-033 DONE_VERIFIED. Note: the 08:13 375px screenshot failure was a dirty-worktree WIP artifact; no committed code ever exhibited the 375px overflow.

## FC-004: /o index rendered full PING marketing chrome -- FIXED

- INPUT: curl GET /o (the object index path).
- EXPECTED: chromeless object index (same as /o/[objectId]).
- ACTUAL: the /o index rendered the full PING marketing header/footer while /o/[objectId] was correctly chromeless.
- ROOT CAUSE: route-chrome suppression used pathname.startsWith("/o/"), which is false for the exact "/o" path. Prefix match omitted the prefix itself.
- FIX: chromeless = pathname === "/o" || pathname.startsWith("/o/") in src/app/layout.tsx. Rebuilt, restarted, verified /o has no PING header and / still does.
- REGRESSION TEST: implicit via rebuild verification. Should exist: route-chrome test asserting /o is chromeless while / keeps the header.
- SOURCE: FAILURE_LEDGER.md FL-20260921-212, failure 1.

## FC-005: Overrides API staged immediate-apply, violating propose-then-approve -- FIXED (process caught)

- INPUT: design the owner overrides API for the Manage page.
- EXPECTED: Nolan's explicit propose-then-approve requirement: proposal is staged, approval applies it.
- ACTUAL: first staging had immediate-apply semantics on write, which would have mis-satisfied the requirement.
- ROOT CAUSE: builder defaulted to the simplest write path without checking the controlling objective.
- FIX: rebuilt as a real two-stage loop: POST {stage:"propose", text} returns a typed proposal and writes nothing; POST {stage:"approve", command} validates, applies, and returns the refreshed view. Manage page shows a pending-proposal card with Approve/Reject. Order persists across restart (data/fyd-owner/happy-place.json).
- REGRESSION TEST: npx jest --config src/fyd/object/jest.config.cjs (27 pass); live: propose "Put decks first" -> 200 with proposal, order unchanged; approve -> Decks first in /api/fyd/objects/happy-place and /o/happy-place HTML; restart server -> order persists.
- SOURCE: FAILURE_LEDGER.md FL-20260921-212, failure 2 (process). Caught in self-review before any completion claim.

## FC-006: ClaimBadge stamped every claim "Website statement", including demo/overlay content -- FIXED

- INPUT: render claim badges on objects containing overlay-authored (demo) content.
- EXPECTED: the badge names the actual claim source.
- ACTUAL: everything was stamped "Website statement" regardless of source. Overlay-authored demo content had no provenance kind at all.
- ROOT CAUSE: the provenance model had no overlay-authored kind and the badge used one unconditional label.
- FIX (commit fa0f7efa, 2026-09-22): new overlay-authored provenance kind. ClaimBadge names the actual claim source per object (website statement / feed item / site record / demo addition / mixed). Ask FYD classifies overlay content DEMO_SYNTHETIC with honest citation labels. Demo content gets lower builder confidence (src/fyd/builder/confidence.ts) and distinct dev surfaces.
- REGRESSION TEST: src/fyd/components/__tests__/claim-badge.test.ts (new); src/fyd/ask/__tests__/demo-classification.test.ts (new, 156 lines). Follow-up commit 0dec40f5 updated hero badge assertions for the honest labels.
- SOURCE: git commit fa0f7efa (FYD-001). Touched: src/components/ping/node-sections.tsx, src/components/ping/object-preview.tsx, src/fyd/ask/visitor-answer.ts, src/fyd/builder/confidence.ts, src/fyd/components/renderer.tsx.

## FC-007: heroMediaFor() fell back to a logo as the hero banner -- FIXED

- INPUT: a site with no hero-role media asset but a logo-role asset; call heroMediaFor().
- EXPECTED: null, so the caller renders the honest typographic hero.
- ACTUAL: returned the logo-role asset, rendering a brand logo as a photographic banner.
- ROOT CAUSE: fallback ordering treated any media asset as banner-eligible.
- FIX (commit 7aecdeb7, 2026-09-21): preference hero role, then other photographic roles, then null. The select() sort is unchanged: galleries/object view intentionally still lead with logos.
- REGRESSION TEST: 20 new tests (hero logo rule incl. listObjectMedia logo-first pin). Media suite 63/63 green. tsc --noEmit clean.
- SOURCE: git commit 7aecdeb7, DEFECT 1. Earlier pinned by b5e23b4c (hero selection rule: happy-place null, coppersmith hero-role asset, determinism, unknown-site null).

## FC-008: Media manifests not production-truth stamped; preview manifests on the production read path -- FIXED

- INPUT: hand-write or preview-generate a media manifest; read it via getPipelineManifest.
- EXPECTED: only production-pipeline manifests are served to the production read path.
- ACTUAL: preview, stale, or hand-written manifests were accepted exactly like real ones; the read path did not validate provenance.
- ROOT CAUSE: ingestSiteMedia wrote no run/version stamps and the read path applied no validation.
- FIX (commit 7aecdeb7, 2026-09-21): ingestSiteMedia writes ingestRunId, pipelineVersion, and preview marker. validatePipelineManifest() applied on every getPipelineManifest read requires the production generator stamp, the ingest run id, a matching pipeline version, a clear preview marker, and every media item rights-acquirable with a digest and at least one variant. run-ingest.ts --preview writes to manifests/preview/ (namespaced out of the production read path) with preview: true. Both committed manifests regenerated through the real ingest pipeline (content-identical, provenance stamps added).
- REGRESSION TEST: manifest validation tests incl. read-path rejection of preview and provenance-less files, in the 20 new tests; media suite 63/63.
- SOURCE: git commit 7aecdeb7, DEFECT 2. Also adds hero "Why this?" drill-down fed only with the media's own provenance fields (photo source, rights basis, observed date, content digest), no invented copy.

## FC-009: Corrupt/missing/tampered projection escaped POST /api/fyd/ask as empty-body HTTP 500 -- FIXED

- INPUT: corrupt happy-place.json (or missing/tampered-digest projection), POST /api/fyd/ask.
- EXPECTED: a structured, honest error the visitor can understand.
- ACTUAL: getSiteBundle threw, the throw escaped the route handler, and the visitor got an empty-body HTTP 500, bypassing the route error mapping.
- ROOT CAUSE: answerAskFyd had no try/catch around the bundle/projection load; the route had no defensive catch around the pipeline.
- FIX (commit 14494c34, 2026-09-21): visitor-answer.ts wraps the bundle/projection load and returns a new AskFydOutcome kind projection_unavailable (honest unknown: names the failure, states the answer is unknown; internal detail logged server-side only). route.ts maps projection_unavailable to structured 503 {ok:false, kind, error, attempted, answerUnknown:true} plus a defensive try/catch around the pipeline (structured internal_error 500 instead of a leak). Live proof: corrupted happy-place.json -> HTTP 503 structured; restored byte-identical (sha256-verified) -> HTTP 200 with the same evidence-backed answer.
- REGRESSION TEST: throwing-loader unit case; route-level integration tests for corrupt JSON and tampered digest (both 503) and recovery (200). Ask-lane jest config widened to include /api/fyd/ask route tests.
- SOURCE: git commit 14494c34 (lane-a).

## FC-010: Ask FYD never refuses; honest fallback was dead code; citations unlabeled -- FIXED

- INPUT: POST /api/fyd/ask (happy-place): "What is the owner blood type?" / "Does this business offer financing?"
- EXPECTED: explicit unknown/refusal with refusal:true and no plausible filler; every citation carries its evidence class.
- ACTUAL: (1) the honest fallback ("I do not have evidence for the rest of that question...", partial:true) only fired when zero intent branches matched, but the generic who/what/is/do branch matches nearly every question, so the fallback was dead code. "What is the owner blood type?" returned the business description dump with refusal:false. (2) DIRECT/INFERRED/GENERATED labeling never reached the visitor: the composer only populated claimClassifications for "Related offerings" and the visitor pipeline passed no fieldClasses, so basis fell back to the meaningless "Site record" for every citation.
- ROOT CAUSE: branch ordering + an OR-bug in the profile intent (hasWord "what"/"is"), plus missing provenance wiring through pushClaim().
- FIX (commit 3a3f7f35, 2026-09-21): new person branch (zero Person objects -> explicit "no person records... I will not guess", partial:true, refusal:true); profile branch narrowed to genuine profile intent; services branch topic-gated ("Does this business offer financing?" falls through instead of dumping the Pergola offering); fallback returns zero-citation noEvidenceAnswer instead of the description dump; classificationFromProvenance() (canonical-journal -> DIRECT_FACT, website-derived -> website_statement, owner -> owner_authorship) wired through pushClaim(); citationFor() gives canonical-journal objects source "Site record (canonical journal)". Verification: services Q -> refusal:false with real class; person Q -> refusal:true explicit; blood-type Q -> refusal:true explicit unknown, no filler. Determinism: Q1 re-run twice byte-identical. Residual: GENERIC_WORDS topic stoplist is heuristic (fail-closed per contract); contact/location/review branches not topic-gated (surgical scope).
- REGRESSION TEST: src/fyd/ask tests 36/36; ask route tests 13/13 (baseline was 6 failed/7 passed; the fix also repaired 4 pre-existing failures). Commit f35e670c added permanent FYD-007 services-evidence tests (honest refusal + cited answer).
- SOURCE: FAILURE_LEDGER.md FL-20260921-232 (opened and closed 2026-09-21 ~13:30-13:38 MDT).

## FC-011: pg BIGINT sequence returned as string; readers dropped it to null -- FIXED

- INPUT: FYD follow attestation; journal row has sequence 715.
- EXPECTED: attestation returns sequence 715.
- ACTUAL: sequence: null in the follow response. node-postgres returns BIGINT columns as strings; attestation-gate.ts and readers.ts used typeof v === "number" and fell through to null. Ordering still worked (created_at tiebreak) but the evidence was degraded and the projector-ordering mirror was inexact.
- ROOT CAUSE: readers assumed the pg driver returns BIGINT as number.
- FIX: asSequence() normalizer (number|string->number|null) in readers.ts, used in both readers and the attestation gate. Re-transferred both files; verified sequences 747/748/749 flow through on subsequent actions.
- REGRESSION TEST: live verification on the demo gateway (127.0.0.1:18199, DB ping-fyd-demo). No dedicated unit test recorded. Should exist: a unit test for asSequence() covering number, numeric string, null, and garbage input.
- SOURCE: FAILURE_LEDGER.md FL-20260921-227 (2026-09-21 ~12:48 MDT).

## FC-012: Circle/ObjectView and Ask FYD read different sources for the same business -- PARTIALLY FIXED, residue OPEN

- INPUT: compare the service list on the rendered page / Ask FYD answer vs the Circle/ObjectView projection for Happy Place.
- EXPECTED: one read model; the surfaces agree.
- ACTUAL: src/fyd/object/view.ts built ObjectView/CircleProjection from hardcoded fixture graphs (proceduralize/__fixtures__/) and derived services from description prose (Decks, Fences, Pergolas, Bathrooms, Custom Work, basis "derived"), while Ask FYD and the rendered /sites pages read the PING-backed projection (getPingObjectGraphSync) where the only structured service is "Pergola Design Consultations". Two sources of truth; the surfaces disagreed on the service list.
- ROOT CAUSE: fixture graphs were a live read path, not test-only fixtures.
- FIX (commit fe74c481): ObjectView loads media through listObjectMedia (semantic relationships on the attached graph), derivePresence selects logo/hero/gallery via the same attachment (Business represented_by Media), Circle background reads the pipeline manifest store, Ask FYD bundles the same PING graph, same spec generator, same manifest store. "No production fixture fallback." Residue: BACKLOG_PING.md item one-canonical-read-model (P1, OPEN) still records the service-list disagreement (Decks/Fences/Pergolas vs "Pergola Design Consultations") as the first broken boundary for the one-read-model invariant. Fix direction: fixtures become an explicit FIXTURE class, never a live read path.
- REGRESSION TEST: none for the invariant. Should exist: a cross-surface consistency test asserting the service list from ObjectView, Ask FYD, and the rendered page agree for the same business object.
- SOURCE: FAILURE_LEDGER.md FL-20260921-233; git commit fe74c481; ~/workspace/BACKLOG_PING.md one-canonical-read-model.

## FC-013: AttentionController cooldown sentinel blocked the first requestPrimary at now=0 -- FIXED

- INPUT: AttentionController.requestPrimary(id) with no prior release, at now=0 (test clock).
- EXPECTED: first request granted (no cooldown has elapsed because nothing was released).
- ACTUAL: `this.lastRelease.get(id) ?? 0` treated a never-released id as "released at epoch", so the 800ms cooldown blocked the very first requestPrimary. In production (Date.now()) this never triggers, but the sentinel was semantically wrong.
- ROOT CAUSE: nullish coalescing to 0 collapsed "never released" into "released at epoch".
- FIX: distinguish undefined explicitly: releasedAt !== undefined && now - releasedAt < cooldownMs.
- REGRESSION TEST: 4 of 14 new unit tests failed before the fix; all 14 pass after. npx jest --config src/fyd/spatial/jest.config.cjs.
- SOURCE: FAILURE_LEDGER.md FL-20260921-217 (2026-09-21, portal-circle lane).

## FC-014: Duplicate predicates for the same address link (has_address vs located_at) -- FIXED

- INPUT: extract Happy Place graph; inspect relations from business to its location object.
- EXPECTED: one predicate per fact.
- ACTUAL: the graph carried both located_at and has_address from the business to the same location object. The @id-reference extraction mapped schema.org address to has_address while project() emitted located_at for the structured PostalAddress entity.
- ROOT CAUSE: two independent predicate vocabularies (extraction table vs projection) for the same semantic link.
- FIX: unified both to located_at; project() now dedupes identical (subject, predicate, object) triples. Tests updated (fixture 7: 2x located_at; Coppersmith fixture: has_address assertion removed). All 61 tests green; canonical gate re-run at the final SHA.
- REGRESSION TEST: the updated fixture/corpus tests assert the single predicate. Should exist: a dedupe test asserting no identical (subject, predicate, object) triple appears twice in any projected graph.
- SOURCE: FAILURE_LEDGER.md entry 2026-09-21 ~07:40 MDT (fyd extraction lane).

## FC-015: extractGraph silently returned zero nodes for flatten() array output -- FIXED

- INPUT: jsonld.flatten() result (a JSON-LD array of nodes) into extractGraph().
- EXPECTED: nodes extracted.
- ACTUAL: extractGraph() only handled {"@graph": [...]} and single-node objects, so it returned [] for every successful expansion. Zero nodes, zero facts, no error thrown, no unsupported evidence: silent-empty, the worst failure mode.
- ROOT CAUSE: assumed flatten returns an object; never probed the actual return shape (an array).
- FIX: extractGraph now accepts arrays first, then @graph objects, then single-node objects. One-node probe (temporary probe-sd.test.ts) confirmed NODES: 1 FACTS: 1 before the probe was deleted.
- REGRESSION TEST: probe deleted. Should exist: a permanent test asserting extractGraph handles the array shape from a real flatten() call (the lesson: probe the library's actual return shape; prefer an assertion when zero nodes come from a successful expansion).
- SOURCE: FAILURE_LEDGER.md entry 2026-09-21 ~07:05 MDT (fyd extraction lane).

## FC-016: jsonld.flatten() documentLoader passed in context position -- FIXED

- INPUT: expandJsonLdBlocks calling jsonld.flatten(doc, { documentLoader }).
- EXPECTED: blocks expand with the offline document loader.
- ACTUAL: the second argument is the optional @context, not options, so the library read the options object as a context and threw "Invalid JSON-LD syntax; @context term values must be strings or objects". Every block failed expansion; the pipeline reported expansion-failed unsupported evidence and zero nodes.
- ROOT CAUSE: misremembered signature flatten(input, ctx?, options?). The documentLoader belongs in the THIRD argument.
- FIX: jsonld.flatten(offlineContext(block.parsed), undefined, { documentLoader: offlineDocumentLoader }). Noted in STRUCTURED-DATA.md as an implementation warning.
- REGRESSION TEST: pipeline tests cover expansion now. Should exist: a test calling flatten with the offline loader and asserting nodes expand (pins the argument positions).
- SOURCE: FAILURE_LEDGER.md entry 2026-09-21 ~07:00 MDT (fyd extraction lane).

## FC-017: Context-less JSON-LD block dropped every term -- FIXED (design default documented)

- INPUT: JSON-LD block with no @context ({"@type":"LocalBusiness","name":"Acme",...}).
- EXPECTED: terms expand and produce facts.
- ACTUAL: without a context the terms never expand to schema.org IRIs, so the block produced zero facts (only OG/meta titles survived).
- ROOT CAUSE: offlineContext only rewrote declared contexts; a missing context left terms unexpandable.
- FIX: offlineContext injects the inline {"@vocab": "https://schema.org/"} default when no @context is declared. Documented in STRUCTURED-DATA.md as an explicit assumption (HTML-embedded JSON-LD without a context is overwhelmingly schema.org; the property tables only know schema.org terms).
- REGRESSION TEST: pre-existing test "parse harvests JSON-LD first" covers it.
- SOURCE: FAILURE_LEDGER.md entry 2026-09-21 ~07:20 MDT (fyd extraction lane).

## FC-018: mergeStructuredExtractions recounted nodesVisited from post-skip entities -- FIXED

- INPUT: identical input through the fixture test and the corpus test.
- EXPECTED: nodesVisited agrees.
- ACTUAL: extractStructuredData reported nodesVisited=11 (unique expanded nodes, including the deliberately skipped SearchAction chrome node) but mergeStructuredExtractions recomputed it as entities.length from the already chrome-filtered list (10). The fixture test and corpus test disagreed (11 vs 10).
- ROOT CAUSE: two different definitions of the same stat in two functions.
- FIX: the merge now accumulates stats.nodesVisited / stats.nodeIds from each per-extraction stat instead of recomputing from filtered entities. Both paths report 11. Tests assert 11 with the semantics documented in test comments.
- REGRESSION TEST: fixture + corpus tests assert 11.
- SOURCE: FAILURE_LEDGER.md entry 2026-09-21 ~07:25 MDT (fyd extraction lane).

## FC-019: Offer objects classified as claims; Ask answer named offers as services -- FIXED

- INPUT: claim-classification count assertion expected 3 claims for a services answer.
- EXPECTED: 3.
- ACTUAL: 5, because the two Offer objects were also classified as claims and the answer named offer titles.
- ROOT CAUSE: genuine design ambiguity (are Offer nodes "claims" in a services answer?).
- FIX (commit 55c6ce64, product decision): offers are evidence-chain scaffolding, not services. The answer names only service/product objects; classifications cover exactly the claims stated. Test expects 3 DIRECT_FACT classifications and asserts the answer does NOT name offer titles; the graph field class for the unnamed offer's fallback label remains DERIVED_FACT and is asserted at the graph level.
- REGRESSION TEST: the updated classification tests (8/8 service-extraction tests green).
- SOURCE: FAILURE_LEDGER.md FL-20260921-211. Preceded by 3fb4d121 (Tier-1 Service/Offer extraction, relations, ask claim classes).

## FC-020: Gateway refactor crash-looped on Oracle: top-level require of a module absent from the deployment snapshot -- FIXED (process)

- INPUT: deploy oracle-gateway:refactor-bb63da5 (arm64) to ping-gateway on Oracle.
- EXPECTED: gateway boots.
- ACTUAL: container crash-looped: Error: Cannot find module '../../../ping-runtime/events/legacy_ingress_adapter'. The refactored gateway/bootstrap/composition/core_event_spine.js top-level-requires it; the file exists in the repo but is ABSENT from the deployment snapshot's ping-runtime/events/ (snapshot is a pruned subset).
- ROOT CAUSE: Codex's verification (contract test 5/5, node --check) never executed the code. The contract test only reads source text. First runtime execution of the refactor was this Oracle deploy.
- FIX (process, not just code): closure-certify.js + gateway-smoke.js: a require-closure certifier that must certify 189/189 modules distributed, and a smoke test that actually boots the composition (fail-before: closure FAILED with REQUIRED_NOT_DISTRIBUTED and smoke FAILED exit 2 with the exact Oracle string; smoke on complete copy: PASS). Rule: before ANY redeploy, re-run both against the REAL snapshot. Rollback executed: docker tag oracle-gateway:certified-20260919 oracle-gateway:latest, recreate gateway. Re-proof: authenticated POST /events -> HTTP 200; pre-deploy event intact; dedup verified.
- REGRESSION TEST: ~/workspace/p0-lane1/closure-certify.js and gateway-smoke.js (transplant-ready, copied to worktree tools/distribution/ uncommitted). Real-tree certifier: CERTIFIED (189 modules, 0 defects).
- SOURCE: FAILURE_LEDGER.md FL-20260919-ORACLE-006 + FL-20260919-P0-LANE1-001.

## FC-021: Sequence backfill migration vs append-only trigger; recovery loop retried silently forever -- OPEN (convergence lane)

- INPUT: deploy gateway refactor (deploy commit 395b9759e) against Oracle ping_events with an append-only trigger.
- EXPECTED: migration completes or fails with a distinct, visible failure state.
- ACTUAL: UnifiedEventRuntime startup migration runs UPDATE ping_events SET sequence = ... as a backfill for pre-sequence rows. The append-only trigger rejects ALL UPDATEs, so the migration throws on every attempt. The recovery loop retries forever (only attempt 1 and every 10th are logged, so attempts 2+ fail silently). Spine init can never complete: a deterministic migration failure presents as an endless silent retry. Collateral: the migration's ALTER TABLE ping_events ADD COLUMN sequence BIGINT (nullable) DID commit before the UPDATE failed. Rollback was safe (certified image INSERTs do not reference the column).
- ROOT CAUSE: the closure certifier checks module membership, not migration-vs-trigger compatibility; the smoke test runs without Postgres (degraded path skips the spine), so the migration never executes in the smoke environment. Environment asymmetry between the Pig test DB (no append-only trigger) and the Oracle canonical DB.
- FIX: not applied. Redeploy is blocked until the sequence migration is made trigger-compatible (or the trigger policy explicitly permits the migration path) AND a migration-vs-trigger compatibility check is added to the pre-promotion gates (e.g., smoke the migration against a trigger-enforcing fixture). The recovery loop needs a bounded FAILED_MIGRATION state instead of unbounded silent retry.
- REGRESSION TEST: missing. Should exist: a migration smoke against a trigger-enforcing fixture (append-only trigger + pre-sequence rows), asserting either success or a typed FAILED_MIGRATION, never a silent infinite loop. Related pre-existing suite failures: FL-20260919-014 (sequence_replay_cert T1 legacy-schema migration fails on scratch PG: 64 passed, 6 failed, 1 blocked; stash-verified pre-existing), FL-20260919-015 (test_kernel_pipeline.js crashes in UER initialize sequence migration: Cannot read properties of undefined (reading 'n') at unified_event_runtime.js:117; pristine-HEAD verified).
- SOURCE: FAILURE_LEDGER.md FL-20260919-ORACLE-008.

## FC-022: runtimeIdentityAuthority.initialize() throws CANONICALIZATION_ERROR on Node 22 -- FIXED

- INPUT: runtimeIdentityAuthority.initialize() on Node v22.23.2.
- EXPECTED: initializes.
- ACTUAL: throws CANONICALIZATION_ERROR in CANONICALIZATION ("undefined is not in the canonical identity domain").
- ROOT CAUSE: _generateFingerprint() includes process.versions.http_parser in EngineProfile, which is undefined on Node >= 20 (http_parser removed in favor of llhttp). Strict canonical_json rejects undefined, so CanonicalAuthority.hash(fingerprint) throws. Environment drift: code written against older Node. Nothing in the repo calls initialize() at boot, so no live boot path was broken; any lane initializing runtime identity on Node 22 hit it.
- FIX (commit a9cad2663, 2026-09-20): http_parser: process.versions.http_parser ?? process.versions.llhttp (Node <= 18 fingerprints byte-identical). Constitutional intent: provenance-only identity of a specific runtime instance on a specific Node build. 13/13 new FL-004 tests pass on Node 22.23.2 and Node 20.20.2; test_authority_migrations still passes. The Buffer guard in witnessAuthority.createWitness is fail-closed by design (F7/D1 domain), not a defect.
- REGRESSION TEST: 13 new FL-004 tests.
- SOURCE: FAILURE_LEDGER.md FL-20260920-004.

## FC-023: emit-observation.py argv bug queried event_id='fetch'; five rounds misattributed to Pig unreachability -- FIXED

- INPUT: python3 ~/workspace/tandem/emit-observation.py --fetch-event <event_id>.
- EXPECTED: queries WHERE event_id='<event_id>'.
- ACTUAL: the probe JS bound process.argv[2] (the literal string 'fetch') instead of process.argv[3] (the event_id). Every canonical-byte probe since the probe was introduced queried WHERE event_id='fetch' and failed; all five rounds of "canonical-byte fetch failed" were misattributed to Pig unreachability / commute blackout. The Pig was healthy throughout.
- ROOT CAUSE: one-character indexing bug at tandem/emit-observation.py:338.
- FIX: argv[2] -> argv[3]. Verified live 2/2 --fetch-event calls exit 0 returning true observation bytes; batch check of all 37 sidecar event IDs: 30 FOUND durable in ping_events, 7 MISSING (all Sep 13-14, pre-epoch; table epoch starts 2026-09-16 12:24 UTC, a convergence-rebuild artifact, not recent loss).
- REGRESSION TEST: live verification only. Should exist: a test asserting the probe binds the event_id argument, not the subcommand string.
- SOURCE: FAILURE_LEDGER.md FL-20260921-111.

## FC-024: 8080 gateway rejects FYD_SITE_OVERLAY with "Unknown event_type" -- REPO FIXED, 8080 DEPLOYMENT OPEN

- INPUT: POST canonical-spine envelope {event_type:"FYD_SITE_OVERLAY", aggregate_id:"fyd-site:happy-place", aggregate_type:"fyd_site", event_data:{...}} to http://127.0.0.1:8080/events.
- EXPECTED: accepted.
- ACTUAL: {"error":"Unknown event_type: FYD_SITE_OVERLAY"}. The 8080 gateway's EventValidator only accepts the 233 types in its image-baked gateway/generated/event_registry.json; FYD_SITE_OVERLAY was never registered. The registry inside the 8080 image is NOT the repo's file (no bind mount).
- ROOT CAUSE: contract gap: the sprint design assumed an event type the gateway never registered; the demo-script assumed acceptance. The six-hour sprint's H0-1 worker built emit/dump tooling but was interrupted before ever running the emit, so the gap was never discovered.
- FIX (repo): FYD_SITE_OVERLAY registered in the REPO generator (_productionEvents() + regenerate gateway/generated/event_registry.json), 233->234 types, fyd added to NAMESPACE_OWNERS. Demo gateway (18199) restarted and loads 234 types; emit accepted with event_id 39fc9971a47f807ef38cf8976cb9d4ff4360c27b52bf14f4393094d78fd; dump regen shows overlayEventIds, graphDigest changed, new service with provenance ping-event:39fc9971...; Happy Place page renders the service with zero React edits; Coppersmith unchanged. H0-1 proof COMPLETE. 8080 deployment registration remains an explicit backlog item (image rebuild).
- REGRESSION TEST: live proof only. Should exist: a registry test asserting every event_type the FYD tooling emits is present in the generated registry (closes the class: assumed-but-unregistered event types).
- SOURCE: FAILURE_LEDGER.md FL-20260921-231.

## FC-025: FYD-009 -- dangling evidence_refs are not failed closed -- OPEN

- INPUT: Ask FYD produces an answer containing an evidence_ref that does not resolve in the target graph snapshot.
- EXPECTED: post-answer validation fails closed (marks the claim unsupported); per directive 5, dangling citations fail closed.
- ACTUAL: no existence check; the cited evidence_refs existence check (NOW-3) is not implemented. GEN-CONSTRAINT is IN_PROGRESS (structured generation with deterministic claim-binding validation for the Ask FYD answer path, NOW-4).
- ROOT CAUSE: unbuilt validation step.
- FIX: none yet. Proof: a test with one dangling ref must fail closed.
- REGRESSION TEST: missing. Should exist: Ask FYD answer with one dangling evidence_ref -> FAIL CLOSED (unsupported marked), not rendered as cited.
- SOURCE: ~/workspace/BACKLOG_PING.md NOW-3 / FYD-009 (P1, OPEN), GEN-CONSTRAINT (P1, IN_PROGRESS).

## FC-026: FYD-010 -- no field-level privacy gate for Ask FYD -- OPEN

- INPUT: public viewer context + a hidden owner field (phone/home address); ask Ask FYD about it.
- EXPECTED: the answer must not reveal it. With owner context, it may.
- ACTUAL: the renderer passed OWNER ADDRESS OVERRIDE; Ask FYD is a second mouth on the same data and was never tested. Privacy behavior unknown, presumed leaky.
- ROOT CAUSE: unbuilt gate.
- FIX: none yet. Proof: test passes both ways (public -> withheld, owner -> revealed).
- REGRESSION TEST: missing. Should exist: dual-context test (public viewer hides owner phone/address; owner viewer reveals).
- SOURCE: ~/workspace/BACKLOG_PING.md NOW-5 / FYD-010 (P1, OPEN).

## FC-027: FYD-037 -- no wrong-journal fail-closed guard -- OPEN

- INPUT: FYD overlay emit/dump run against a journal lacking the expected overlay marker.
- EXPECTED: fail closed with a typed failure; a projection can never be written against the wrong journal.
- ACTUAL: no guard; a silent write against the wrong journal is possible. Directive 10 marks it an urgent small independent safety lane.
- ROOT CAUSE: unbuilt guard.
- FIX: none yet. Proof: emit against a journal without the marker fails closed with a typed failure; no silent write.
- REGRESSION TEST: missing. Should exist: emit against marker-less journal -> typed failure, zero rows written.
- SOURCE: ~/workspace/BACKLOG_PING.md NOW-9 / FYD-037 (P1, OPEN).

## FC-028: FYD-013 -- stale/superseded evidence can be bound without failing closed or marking stale -- OPEN

- INPUT: Ask FYD binds an answer to evidence that has been superseded (version/as_of advanced).
- EXPECTED: binding against superseded evidence fails closed or marks stale.
- ACTUAL: no policy; evidence carries no enforced version/as_of semantics at binding time. Related: FYD-024 (Ask FYD answers not versioned against the graph snapshot; no stale-mark on regen), also OPEN.
- ROOT CAUSE: unbuilt policy.
- FIX: none yet.
- REGRESSION TEST: missing. Should exist: answer bound to superseded evidence -> marked stale or failed closed; regen against a new graph snapshot -> stale-mark.
- SOURCE: ~/workspace/BACKLOG_PING.md FYD-013 (P2, OPEN), FYD-024 (P2, OPEN).

## FC-029: acq-real-capture-service-gap -- real captures yield zero Service/Offer objects -- OPEN

- INPUT: run the real Happy Place and Coppersmith captures through the acquisition pipeline.
- EXPECTED: Service/Offer objects with provenance.
- ACTUAL: zero Service/Offer objects from both real captures, though the Tier-1 extractor passes its synthetic tests. Broken boundary is acquisition evidence -> Service-object compilation, not Ask FYD composition.
- ROOT CAUSE: unknown; synthetic tests do not exercise the real-capture shape.
- FIX: none yet. Next falsification: a real capture produces Service/Offer objects with provenance.
- REGRESSION TEST: missing. Should exist: a real-bytes capture test asserting Service/Offer objects with provenance emerge (pins the boundary that synthetic tests miss).
- SOURCE: ~/workspace/BACKLOG_PING.md acq-real-capture-service-gap (P1, OPEN). Adjacent: FYD-004 crawl scope policy (acquisition must traverse internal navigation to find service pages; services page missing is an evidence gap, not a refusal to look) also OPEN.

## FC-030: SEC-001 -- POST /tenants accepted unauthenticated and wrote a row -- OPEN

- INPUT: unauthenticated POST /tenants {"tenant_id":"probe"} against the Pig gateway.
- EXPECTED: 401.
- ACTUAL: HTTP 200; row tenant_id='probe', status=active created in tenant_registry. gateway_runtime.js:795 mounts without exteriorAuthMiddleware; routes/tenants.js has no auth checks. SEC-002 (same finding): /mc business-intelligence surfaces also public (lead lists, unpaid invoices, at-risk projects readable unauthenticated).
- ROOT CAUSE: missing auth middleware on the mount; routes assume an authenticated context that was never enforced.
- FIX: none yet (convergence lane owns it). The probe row was surgically deleted to restore exact pre-audit state (verified zero rows remain). Lane B's mount-wiring contract (tests/security/test_mount_wiring_contract.js, committed as aadb9dad9) pins the intended shape: mount auth identifiers must resolve to ExteriorAuthMiddleware backing (its first assertion was itself fixed: the harness asserted a literal inline string while the real diff uses an mcAuth indirection).
- REGRESSION TEST: tests/security/test_mount_wiring_contract.js (5/5 green on the patched copy; pre-fix 0/4 red). Lane B's own fixes are the live reference.
- SOURCE: FAILURE_LEDGER.md FL-20260919-AUDIT-001. Note: the probe itself violated the audit's read-only constraint; it is recorded as an accidental write, disclosed, and removed.

## FC-031: src/fyd/claim/machine.ts -- verification method "not implemented yet" -- OPEN (known)

- INPUT: a claim proof with a verification method the machine does not implement.
- EXPECTED: either implement or fail closed with a typed "unsupported method" state.
- ACTUAL: the code path exists and names the gap: "Verification method '<method>' is not implemented yet." Behavior after the message is a known unknown from this mine; the message is an honest marker, not a silent defect.
- ROOT CAUSE: unimplemented verification methods.
- FIX: none yet.
- REGRESSION TEST: missing. Should exist: for each known-but-unimplemented method, a test asserting the typed unsupported-method outcome (not an exception, not a silent pass).
- SOURCE: src/fyd/claim/machine.ts:127 (grep-verified 2026-09-23).

## FC-032: 6 pre-existing FYD test failures on degraded regen fixtures -- OPEN

- INPUT: run the canonical jest suites on fyd/sitespec-generator: proceduralize (61 tests) + components render test.
- EXPECTED: all pass.
- ACTUAL: 6 fail. 5 in src/fyd/proceduralize/__tests__/generator.test.ts (expect services/explore pages and "Decks" service content from the rich HEAD-committed fixtures) and 1 in src/fyd/components/__tests__/render.test.ts (expects rendered HTML to contain "Decks"). The working-tree fixtures are the earlier lane's degraded regen output (happy-place: 2 objects vs 9 in HEAD; coppersmith: 4 objects). Identical failure set before and after the SiteSpec planner fix lane's edits (proceduralize 5 failed/56 passed of 61 both before and after; happy-place specDigest byte-identical across the lane), so the outcomes are fixture-driven, not edit-driven.
- ROOT CAUSE: either the extraction pipeline regressed (15 facts discovered but only 2 objects emitted for happy-place) or the committed rich fixtures were hand-derived from the PING event journal and regen was never meant to reproduce them. Triage decision pending by parent.
- FIX: none yet.
- REGRESSION TEST: the 6 failing tests ARE the regression signal; the missing piece is a triage decision (pipeline vs fixture provenance).
- SOURCE: FAILURE_LEDGER.md FL-20260921-034.

## FC-033: FYD jest toolchains broken in three independent ways -- FIXED

- INPUT: npx jest on the FYD tree (three variants).
- EXPECTED: suites load and run.
- ACTUAL: (a) jest-resolve loads unrs-resolver whose NAPI native binding was absent from node_modules (npm optional-deps install gap), so findNodeModule returned null for every module: "Module ts-jest in the transform option was not found" and even "Module .../jest-circus/build/runner.js in the testRunner option was not found" (FL-20260921-FYD1). (b) jest 30's findNodeModule("ts-jest/jest-preset") returns null even though the file exists, so every `preset: "ts-jest"` config failed at validation: "Preset ts-jest not found relative to rootDir" (FL-20260921-FYD2, FL-20260921-FYD7). (c) plain `npx jest` with no config ran babel-jest without TypeScript support: `import type` parse errors, 0 tests run (FL-20260921-035); repo has no root jest.config, uses per-lane configs. Separately, jsonld@9 named imports came back undefined under ts-jest CJS interop (FL-20260921-FYD8): use default import (jsonld.expand()) or require(). And @atproto/api@0.20.44 is ESM-only, unloadable in the jest CJS lane (recorded; SDK usage pattern = ADAPT).
- ROOT CAUSE: environment + toolchain version drift; presets/configs written for older jest.
- FIX: (a) npm install --save-optional --save-exact @unrs/resolver-binding-linux-x64-gnu@1.12.2 (durably in package.json; the earlier --no-save install was pruned by the next npm install). (b) removed the redundant `preset: "ts-jest"` line from FYD jest configs (commit 5c84fe2; the preset contributed only transform defaults both configs already override). Canonical gate at 5c84fe2: 116 discovered, 116 pass, 0 fail, 0 skip, exit 0 (ask 36, activitypub 9, proceduralize+sitespec+components 50, refresh 21). (c) run jest with inline ts-jest --config CLI (no config file created, lane constraint); the underlying no-TS-transform-on-this-branch condition remains OPEN on fyd/sitespec-generator. The "11 failing vs 45 passing" contradiction is resolved: the 11 failures were the preset validation error; green claims could not have come from those configs.
- REGRESSION TEST: src/fyd/TEST-GATE.md documents the canonical command and the gate result. Rules for new suites: every new suite ships a committed jest.config.cjs; the gate runs from a clean worktree; report DISCOVERED/PASS/FAIL/SKIP/EXIT.
- SOURCE: FAILURE_LEDGER.md FL-20260921-FYD1, FL-20260921-FYD2 (+resolution), FL-20260921-FYD7, FL-20260921-FYD8, FL-20260921-035, src/fyd/TEST-GATE.md.

## FC-034: Scheduler service unbuildable in the Oracle compose file -- OPEN

- INPUT: docker compose build scheduler (or plain `docker compose up -d` on the Oracle snapshot).
- EXPECTED: builds.
- ACTUAL: Dockerfile.scheduler does COPY .env from context ../../ (snapshot root), which has no .env -> build fails -> the whole unfiltered `up -d` aborts. The scheduler service was never runnable from this snapshot.
- ROOT CAUSE: build context assumption (a .env at the snapshot root) that the snapshot never satisfies.
- FIX: none yet. Follow-up: P1, decide scheduler's fate / fix build context. Standing rule meanwhile: never run unfiltered `up -d` on this compose file; always target services explicitly with -f and -p.
- REGRESSION TEST: missing. Should exist: a compose-config/build smoke for the scheduler service (or the service removed from the compose file if out of the distribution slice). Note FL-20260919-CONV-001: compose.yaml also references Dockerfile.replay, which does not exist (ping-replay-worker unbuildable) -- same class.
- SOURCE: FAILURE_LEDGER.md FL-20260919-ORACLE-003, FL-20260919-CONV-001.

## FC-035: Two browser workers on one profile; Modern Standby destroyed CDP page targets -- MITIGATED, proof pending

- INPUT: an engagement pass and an unfollow worker scheduled on the same Chrome profile (:9226), running across a Modern Standby transition.
- EXPECTED: at most one automation holds the browser; a standby transition does not silently kill the run.
- ACTUAL: 17-like IG pass landed 6/17 then failed 11/17 with "page.goto: Target page, context or browser has been closed" (concurrent unfollow worker on the same profile; standby exit destroyed CDP page targets while the browser lived on). FB pass: 47 likes, 3 landed, 44 failed identically. The 44/11 failed likes are FAILED (never navigated), not unknown-execution.
- ROOT CAUSE: cross-lane coordination failure (violated "never two browser tasks on the same account in one pass") + worker reuse of a single page target with no death detection + no wake ownership in the automation lifecycle.
- FIX: browser-lock.sh (atomic nonblocking flock per profile; contender fails closed with infra=browser_locked), ensurePage() in ig-engage.js and engage.js (recreate a dead page target mid-pass instead of failing all remaining actions). Both md5-verified onto Pig live paths with *.bak-20260921 backups. Dry-run evidence: lock contention test PASS (holder/contender/independence/kill-9 re-acquire). Nolan's decision: scoped wake lock in the automation lifecycle (acquire -> run -> release), never global never-sleep; run records carry WAKE INHIBITOR ACQUIRED/RELEASED; post-suspend revalidation before resume (design at ~/workspace/pig-fb/wake-lock-design.md). STATUS: OPEN until a real FB pass and a real IG pass validate the fixes with receipts.
- REGRESSION TEST: lock dry-run test; ensurePage unit tests (live page reused PASS, dead page recreated PASS). Real-pass proof pending.
- SOURCE: FAILURE_LEDGER.md FL-20260921-015 (+update), FL-20260921-016 (+updates). Design-only items live in BACKLOG_NOLAN.md FYD-028..032.

## FC-036: Intent-sequencing operator error aborted a pass and poisoned the refuse step -- HEALED (procedural)

- INPUT: operator wrote 76 action intents and marked them EXECUTION for pass fb-20260919-234651 BEFORE calling run_pass.sh.
- EXPECTED: run_pass.sh owns the full intent lifecycle.
- ACTUAL: run_pass.sh's refuse step saw the 70 guard-eligible actions already in EXECUTION with no OBSERVATION and refused them as UNKNOWN_EXECUTION (correct fail-closed). Eligible=0, pass aborted, zero browser actions dispatched.
- ROOT CAUSE: wrong mental model of the pipeline. The operator must NEVER pre-write intents for a job that will go through run_pass.sh.
- FIX: recorded 76/76 as not-attempted with truthful reason + evidence (Pig inbox empty + run_pass stdout); re-ran run_pass.sh WITHOUT pre-writing intents. Standing lesson: never write intents or mark EXECUTION for a job destined for run_pass.sh; before every commit in a shared worktree run git diff --cached --stat and confirm the index holds only intended files (sibling lesson from FL-20260919-SPRINT-001: the coordinator's `git add <mine> && git commit` swept Lane B's staged files into Lane A's commit; healed via git reset --soft + restore --staged + single-file recommit).
- REGRESSION TEST: process rule, recorded in AGENTS.md. Not a product defect; included as the canonical operator-sequencing failure.
- SOURCE: FAILURE_LEDGER.md 2026-09-19 ~17:47 MDT pass-73 entry; FL-20260919-SPRINT-001.

## Corpus statistics

- Entries: 36 (FC-001 through FC-036)
- OPEN: FC-001, FC-012 (residue), FC-021, FC-024 (8080 deployment), FC-025, FC-026, FC-027, FC-028, FC-029, FC-030, FC-031, FC-032, FC-034, FC-035 (proof pending), FC-033(c) (no TS transform on branch)
- FIXED / HEALED: FC-003, FC-004, FC-005, FC-006, FC-007, FC-008, FC-009, FC-010, FC-011, FC-013, FC-014, FC-015, FC-016, FC-017, FC-018, FC-019, FC-020, FC-022, FC-023
- MECHANISM VERIFIED (fix artifacts proven, deployment pending): FC-002
- Sources yielding nothing concrete: BACKLOG_NOLAN.md (outreach operations, no FYD product defects; FYD-028..032 are design-only automation robustness items, recorded here via FC-035), the GRILLING-BRIEF FYD sections (decisions and risk questions, no new concrete failures), .skip(/xit( search in src/fyd (zero real hits; all matches were "exit(" false positives), stale branches (fyd/builder-product-blockers exists but contains no defect evidence mined).
