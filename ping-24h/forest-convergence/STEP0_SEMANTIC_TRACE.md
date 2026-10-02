# STEP 0 — Semantic Trace: FYD two-site behaviors to actual code

Lane: read-only code-tracing (no repo writes made; all reads via stdin-batched Pig SSH).
Date: 2026-09-28 ~18:30 MDT.
Verification evidence traced against: `~/workspace/ping-24h/builder-harvest/TWO_SITE_VERIFICATION.md` (independent live re-proof, 2026-09-28 ~18:50 MDT).

## Canonical binding

- Repo: `/home/nolan/projects/ping` (Pig WSL).
- Branch: `fyd/builder-harvest-trackc-2026-09-28`.
- HEAD: `f877c3919941978f07d5014909595df4751ec258` ("trackc: 16 tests for the staged SitePatch pipeline", 2026-09-28 16:59:43 -0600).
- Direct ancestors: `47ea5b26` ("trackc: staged SitePatch pipeline PATCH->VALIDATE->CAPABILITY->PREVIEW->APPROVAL->EVENT->NEW SPEC VERSION", 16:59:40), `fdb5d3f3` ("trackc: typed 10-op SitePatch vocabulary + Phase-1 approval seam adapter", 16:59:37), `0264d517` ("hardening: fail-closed vocabulary gate + SSRF effective-destination boundary", 05:59:49), `9ea3e6a6` (merge harvest, 05:46:24).
- Served build: `.next/BUILD_ID` = `DqZQX-gQgkpciv6rpLgG3`, built 2026-09-27 21:00 MDT; served by pid 23046, next-server v15.5.24, started 06:38 MDT 2026-09-28 on *:3100.
- Tree state: HEAVILY DIRTY. `git status --short` shows dozens of ` M` (modified, unstaged) plus dozens of `??` (untracked, incl. `.bak` files, `__pycache__`, extra `.next.*` dirs). The tree is frozen per instructions; nothing was committed.
- BUILD SKEW (confirmed): the served build predates the three trackc commits (all 2026-09-28 16:59) and many dirty files. Build-vs-tree spot checks: the build chunks DO contain the uncommitted `suppressHydrationWarning` (12 files under `.next` match, incl. `.next/server/chunks/5921.js`, `1889.js`) and DO contain `layeredSpecDigest` in `.next/server/app/api/fyd/customize/route.js`, but do NOT contain `StaleGuardError`/`stale_approval`. Conclusion: the build was compiled from the dirty working tree as of 2026-09-27 21:00 MDT; dirty changes made after that (notably the stale-guard additions in the customize route/server) are NOT in the served bytes. Anything marked SERVED below rests on the live probes in TWO_SITE_VERIFICATION.md, not on tree state.

---

## 1. Two-site proceduralization + SiteSpec generation

### CODE FOUND
- `src/fyd/proceduralize/proceduralizer.ts` — the proceduralizer. Key exports: `discover(seedUrl, observedAt)` (157), `normalize` (335), `extract` (372), `provenance` (420), `evidenceRefForFact` (448), `resolve` (466), `scopeFields` (518), `relate` (549), `canonicalEntityUrl` (644), `project` (744). Deterministic IDs: `"website-business-" + sha256Hex(canonicalEntityUrl(entityUrl)).slice(0, 16)` (688), `"rel-" + sha256Hex([subject,predicate,object].join("|")).slice(0, 16)` (693), plus `${businessId}-person-/-ext-/-offer-/-service-` ids (940/965/1005/1052/1111). Committed; `git log -3`: `0264d517`, `2532e5a5` ("feat(fyd): additive microdata extraction"), `3f8e5e11`.
- `src/fyd/proceduralize/structured-data.ts` — JSON-LD/microdata discovery: `discoverStructuredData` (88), `entityCandidates` (328); stable node key `"blank:" + sha256Hex(canonicalJson(rest))` (337). Committed; log: `0264d517`, `2532e5a5`, `ac3c2eeb`.
- `src/fyd/proceduralize/generator.ts` — the SiteSpec planner/generator: `generateSiteSpec(graph: ObjectGraph, opts: GeneratorOptions): FYDSiteSpec` (314), `GENERATOR_VERSION = "1.1.0"` (54). Commit lineage: `568b3e5e`, `6d5ee8ff` ("FYD planner: generic relationship-driven composition"), `5c2a2e4e`. This is the structural graph-driven composition the site pages use.
- `src/app/sites/_shared/spec-pipeline.ts` — THE single compile seam for every `/sites/*` demo page (SERVER ONLY). `compilePublicSite(siteId)` (line ~66): `getVerifiedPublicProjection(siteId, "anonymous")` → `generateSiteSpec` (imported from `@/fyd/proceduralize/generator`) → `applyPresentationIntent` (from `@/fyd/customize/apply-layer`) → `validateSiteSpec`/`isRenderable` (from `@/fyd/sitespec/validator`). Zero per-site conditionals; pages pass only their site id. Commit lineage: `89c7da78`, `568b3e5e`, `3f44b8ee`. Not in dirty list (committed).
- `src/app/sites/happy-place/page.tsx` / `src/app/sites/coppersmith-plumbing/page.tsx` — both DIRTY (uncommitted). Each calls `compilePublicSite(SITE_ID)`; comments assert no hand-layout or hardcoded customer facts exist in the pipeline. The happy-place page also runs the binding-verification observation tap (`auditSitesRenderClaims`/`logSitesRenderAudit`) and notes PROD-1: owner chrome never mounted on public routes.
- `src/fyd/data/ping-object-source.ts` — read seam: `getPingObjectGraph`/`getPingObjectGraphSync` (264/285) read `/home/nolan/ping/var/fyd-projections/<site>.json`, fail closed if missing; `getVerifiedPublicProjection`/`...Sync` (336/346) apply the public-projection privacy boundary. Commit lineage: `41880441`, `d2564ba8`, `ff449e30`. Committed.
- Fixture → projection build chain (offline): `tools/fyd-site-projection/dump.py` `SITES` dict (line 161): `happy-place` ← `REPO + "/src/fyd/proceduralize/__fixtures__/happy-place-graph.ts"`; `coppersmith-plumbing` ← `.../coppersmith-graph.ts`. `dump_site` (542): `extract_base_graph` (fixture) → `query_overlays(site)` (journal JSONL) → `apply_overlays` (417) → atomic write of `/home/nolan/ping/var/fyd-projections/<site>.json` with `graphDigest` and `presentationIntentDigest`. dump.py committed (log: `4a8c5f2e`, `dc2acca6`).
- SERVED: yes (live-proven: both pages fetch, refresh-identical, deterministic base digests). The pipeline file itself is committed pre-build; page.tsx files are dirty but the served pages render the current projection bytes.

### PROOF LINK
Verification proofs (a) refresh-identical digests, (c) deterministic regeneration with stable base graphDigest `40ad3c430350...` / base digest `eacaa6113180...`, and the full serve-time digest chain.

### OVERLAP
- `src/fyd/builder/` (directory exists in src/fyd) is a separate builder surface — not traced as live for these pages; the pages use `proceduralize/generator`, not `builder/`. (Not verified whether builder/ is dead code; flagged for the convergence pass.)
- `src/fyd/proceduralize/patch.ts` vs `src/fyd/sitepatch/pipeline.ts` — see section 11.

---

## 2. Generic JSON-LD/@graph repair + deterministic IDs

### CODE FOUND
- `src/fyd/proceduralize/structured-data.ts` — the repair layer. JSON-LD expansion handles `@graph` envelopes (the old recursive flattener "could not see @graph envelopes or nested objects", per `proceduralizer.ts` header comment lines 14-15; proceduralizer.ts:1263/1319 records "@GRAPH VERIFIED: every node the expansion visited"). Deterministic identity: "Stable key: the @id IRI, or `blank:<sha256>` for blank nodes" (275); blank-node key `= "blank:" + sha256Hex(canonicalJson(rest))` (337). Imports `sha256Hex` from `./sha256` (35).
- `src/fyd/proceduralize/proceduralizer.ts` — deterministic entity/relationship IDs (see section 1): `website-business-<sha256:16>` (688), `rel-<sha256:16>` (693); comment at 680-681 contrasts `generate_id()` (UUIDv7, non-deterministic by design) with `generate_deterministic_id()`. The why-this proof's objectId `website-business-6fa5ebd99d72c4cb` is exactly this scheme.
- `src/fyd/proceduralize/sha256.ts` — DIRTY (uncommitted); re-exports `sha256Hex` from `../../lib/ping/digest.ts`, algorithm `sha256-canonical-json-v1` (the single canonical implementation; browser-safe, no node:crypto).
- Branch/HEAD: `fyd/builder-harvest-trackc-2026-09-28` @ `f877c391`. Files committed except `sha256.ts` (dirty, but the re-export content is behavior-neutral relative to the pre-existing digest lib).
- SERVED: the ID scheme is live-proven (the served why-this objectId uses it); the digest lib predates the build.

### PROOF LINK
Verification "Why this/evidence" probe: `objectId=website-business-6fa5ebd99d72c4cb` resolves with claim "Happy Place Carpentry LLC" — the deterministic business ID produced by this code.

### OVERLAP
- `src/fyd/media/discover.ts` also parses `application/ld+json` (media lane), but for media assets, not entity facts. No conflict; different concern.
- `src/lib/ping/digest.ts` (untracked-new file `??`, plus `__tests__/digest.test.ts`) is the canonical digest home that `proceduralize/sha256.ts` re-exports. Two paths to the same algorithm; the re-export keeps importers stable.

---

## 3. Renderer / components; mobile `min-w-0` fix; layout.tsx `suppressHydrationWarning`; URL/scheme safety

### CODE FOUND
- `src/fyd/components/renderer.tsx` — the site page renderer. Key exports: `buildRenderContext` (275), `designIntentForTheme` (459), `renderSection(section, ctx, motionIndex)` (2124), `SitePageView({page, ctx})` (2190), `galleryEligible` (2043), plus query/order/hidden-object helpers (`resolveQuery` 77, `applyObjectOrder` 153, `applyHiddenObjects` 181). DIRTY (uncommitted); `git log -3`: `761bd086` ("fix(fyd): eliminate React hydration #418 on site pages"), `5fd6ffa7`, `6245af11`. The served page shells render through this (the 130690/159636-byte page digests).
- `src/app/sites/_shared/site-client.tsx` — DIRTY; renders the "Generated site demo" header and mounts `SitePageView`. Contains one `min-w-0` at line 457 (an input className); `renderer.tsx:1709` has `<div className="min-w-0 flex-1">`.
- `src/app/layout.tsx` — the candidate one-liner EXISTS in the working tree as an UNCOMMITTED change: `git diff HEAD` shows exactly one line changed on the `<html>` element: addition of `suppressHydrationWarning` (was `<html lang="en" className=...`, now `<html lang="en" suppressHydrationWarning className=...`). Last committed change `b0161b1a`. It IS in the served build: 12 files under `.next` contain the string (incl. `.next/server/chunks/5921.js`, `1889.js`), consistent with TWO_SITE_VERIFICATION.md's finding that React Flight data contains `"suppressHydrationWarning":true`. No test pins it; nothing in the tree attributes it as the requested mobile fix. Status: real, uncommitted, live in served bytes.
- `src/fyd/sitespec/safe-link.ts` — URL/scheme safety: `resolveSafeLink(...)` (74). Enforced at: `renderer.tsx:918` (comment "Every EXTERNAL href is resolved through resolveSafeLink"), `958`, `1839`; `src/fyd/media/select.ts:85` (http/https allowlist, parser-based; returns null for hostile URLs); `src/fyd/object/view.ts:186,247`. Committed (`4d0ddf7b`, `4a9cc919`).
- SERVED: renderer yes (page digests); suppressHydrationWarning yes (build chunks + live flight data); safe-link yes (committed pre-build).

### PROOF LINK
Verification page digests (happy-place `e3ea19...`, coppersmith `6517e0...`) and the "Mobile fix: NOT committed" section.

### OVERLAP
- None for safe-link (single choke point). Renderer: `src/fyd/components/object-overlay.tsx` (DIRTY) also renders object UI (the tap-to-expand sheet); `src/app/sites/_shared/site-metadata.ts` (DIRTY) handles head tags separately. No duplicate renderSection found.

---

## 4. Binding verifier (rendered bindings)

### CODE FOUND
- `src/fyd/sitespec/binding-verifier.ts` — the strong BindingVerifier. Key exports: `verifyBinding` (224), `verifySpecBindings` (381), `assertSpecBindingsVerified` (429), `dropUnboundBindings` (447), `buildVerifiedRenderModel` (783) with `VERIFIED_RENDER_MODEL_VERSION = "fyd-verified-render-model@1"` (496), `ownerAssertionsFromGraph` (104), `ownerAssertionRefFor` (558), `classifyRenderAtom` (611), `resolveBoundFieldVerified` (357), `EVIDENCE_FRESHNESS_HORIZON_DAYS = 365` (127). DIRTY (uncommitted); `git log -3`: `89c7da78` ("LANE-N claim-gate: model staleness, carrier ref lineage, provenance kind on atoms"), `c3b60e5f`, `4d0ddf7b`.
- `src/fyd/sitespec/sites-render-audit.ts` — DIRTY; `auditSitesRenderClaims`/`logSitesRenderAudit` is the observation-only tap the happy-place page calls at render time (never throws, never mutates). This is the live serve-time hook for the verifier family.
- `src/fyd/sitespec/graph.ts` — `verifyPresentationBinding` (115), `resolveBoundField` (160), `resolveWebsiteUrl` (26). Committed.
- SERVED: observation-tap path yes (the page code calling it is in the served pages); the verifier module itself is dirty at HEAD, but its last commits predate the build. Whether the served build has the exact current dirty content is unproven.

### PROOF LINK
Verification proof: served page's first `<h1>` is the binding-verified business name; PROD-1 comment in page.tsx.

### OVERLAP
- `sites-render-audit.ts` (observation tap) vs `binding-verifier.ts verifySpecBindings` (strong verifier): the page wires the audit tap, not `verifySpecBindings` directly. Two related-but-distinct verification surfaces; convergence question whether the tap and the verifier are one authority.

---

## 5. Owner visibility / address override: directive mechanism

### CODE FOUND
- Storage: `data/fyd-journal/events.jsonl` — append-only journal, COMMITTED (not dirty), 65 events. Op vocabulary counts: `set_presentation_intent` x35, `clear_presentation_intent` x24, `set_field` x3, `add_object` x1, `add_relationship` x1, `deactivate_object` x1.
- The two pre-existing directives live in ONE event, `fyd-ovl-muklxc7l-333f04fa678b` (2026-09-28T02:07:11Z, tenant `happy-place`): op `set_presentation_intent`, `intentId` `pi-82b6c64f99149682` wraps `siteIntent.kind = "edit_copy"`, `pageSlug` `home`, `sectionId` `home:Services:2`, `heading` `"Emergency Services"`, `copy` `"Get in touch with us for urgent repairs at Happy Place Carpentry LLC. We're always ready to help, but we can't promise response speed or ranking."`, `approval.approvedBy` `"nolan:owner"` (an MC-approval transport, note cites `p0prop-ac04480a6d1809fd` and `GRILL-LOCKED-2026-09-27`). The same event carries `pi-b9d3ea837d2e222e` (the `set_featured` directive per the verification record; both intentIds grep to this single event line).
- Overlay op contract: `tools/fyd-site-projection/dump.py` header (lines 30-70) documents `set_presentation_intent` ("upserted by intentId", approval carries the demo-owner marker + proposal digest) and `clear_presentation_intent` ("remove an intent directive"). Unknown op kinds abort the dump.
- TS overlay type: `PresentationIntentOverlayOp` in `src/fyd/customize/types.ts:126-140` (`set_presentation_intent` {intentId, siteIntent, proposal, approval{proposalDigest, approvedBy, approvedAt, note}} | `clear_presentation_intent` {intentId}); `buildDirective` in `src/fyd/customize/server.ts:698` always produces the set-variant. Both files DIRTY (server.ts +428 lines uncommitted).
- Applied at serve time: `applyPresentationIntent` in `src/fyd/customize/apply-layer.ts:116` (committed; log `95b4702d`, `86ed0f74`, `7c1043db`), called by `compilePublicSite` OVER the compiled base spec. Its switch handles SiteIntent kinds `set_featured` (77), `edit_copy` (83) — these are the wrapped intent kinds, matching the journal payloads.
- Survival across re-dumps: `dump_site` rebuilds `presentationIntent: {directives, provenance}` from the full journal on EVERY dump (`apply_overlays` replays all events; `set_presentation_intent` upserts by intentId at dump.py:482, `clear_presentation_intent` removes at :529). The journal is never rewritten — survival is by replay, not by persistence of the projection. The read seam (`parseAndVerify` in `ping-object-source.ts`) digest-verifies `presentationIntentDigest` exactly like the graph digest.
- SERVED: yes — the served happy-place bytes contain "Emergency Services", and the verification re-dumped twice with the directives intact.

### PROOF LINK
Verification proof (c): directives survived two full projection re-dumps and remain in served bytes; base digests stable (`40ad3c430350...`, `eacaa6113180...`).

### OVERLAP
- `deactivate_object` (journal op) + `applyHiddenObjects` (renderer) + `siteDeactivatedObjectIds` (renderer:201) are the object-visibility half; presentation intents are the copy/order half. `src/fyd/owner-mode/visibility-policy.ts` (referenced by sitepatch op map) is a third visibility surface — convergence question.

---

## 6. Plain-English → typed proposal (`proposeFromSiteIntent`, parse route, `proposeSitePatch`)

### CODE FOUND
- `src/fyd/customize/propose.ts` — `proposeFromSiteIntent(spec, siteIntent, graph)` (222) is the real entry: it calls `proposeSitePatch(spec, siteIntent)` (line 228), imported from `../proceduralize/patch` (lines 16-20), i.e. **`src/fyd/proceduralize/patch.ts`, NOT `src/fyd/sitepatch/`**. Header comment states it reuses "the existing structured-editor machinery (src/fyd/proceduralize/patch.ts): the same SiteIntent type, the same proposeSitePatch, the same digest algorithm" and "does not fork the proposal format". Also exports `specDigestOf` (37, sha256 over `canonicalize(spec)`) and `reviewCardForSiteIntent` (150). DIRTY; log: `95b4702d`, `86ed0f74`, `7c1043db`.
- `src/fyd/proceduralize/patch.ts` — the canonical patch machinery: `SiteIntent` type (22), `SitePatchBody` (43), `proposalDigest(body)` (104), `proposeSitePatch(spec, intent): PatchResult` (113), `applySitePatch(spec, proposal)` (255). Committed (log: `86ed0f74`, `7c1043db`, `651e916d`).
- Parse route: `src/app/api/fyd/customize/route.ts` `POST` (628) dispatches `action === "parse"` (647) → `handleParse(siteId, text)`; approve path (654) re-derives via `parseCustomizationIntent(text)` → `resolveCustomizationIntent(site.spec, site.graph, parsed.intent)` → `proposeFromSiteIntent(...)`. Plain-English parsing lives in `src/fyd/customize/intent.ts` (`parseCustomizationIntent`; intent.ts:319 maps to `set_featured` kind; DIRTY).
- The byte-identical `proposalDigest b78821def6cc66907d131a30420deeb64a651ff8f802216a814f90b49c51f9e9` in the verification is produced by `proposalDigest` (patch.ts:104) over the overlay-format `SitePatchBody` minus the digest field (digest law pinned in types.ts:112-127).
- SERVED: yes — the live parse probe returned the exact digest the jest run produced.

### PROOF LINK
Verification proof (b): live `POST /api/fyd/customize {action:"parse", siteId:"happy-place", text:"Move Contact to the top"}` → `siteIntent {"kind":"reorder_section","pageSlug":"home","sectionId":"home:Contact:4","toIndex":0}`, digest `b78821de...`, byte-identical to the jest-run visual path. "Visual reorder == plain-English reorder."

### OVERLAP
- `src/fyd/customize/owner-command-compiler.ts` is a second plain-English→command surface (owner commands). Convergence question: `intent.ts parseCustomizationIntent` vs `owner-command-compiler.ts`.

---

## 7. Approval: the approve handler (what it writes; what it does NOT do)

### CODE FOUND
- `src/app/api/fyd/customize/route.ts` (685 lines, DIRTY: +60/-? vs HEAD; last committed `95b4702d`). `handleApprove(req, siteId, text, clientProposal, requestId)` (~lines 380-520): demo-gated first (`demoDenied(req, siteId, "approve")`), then `runIdempotentWrite` with request_id idempotency:
  - derive: `loadCustomizedSite(siteId)` (server.ts:60) → `parseCustomizationIntent(text)` → `resolveCustomizationIntent` → `proposeFromSiteIntent` → re-derives the proposal and 409s on `stale_digest` (proposal digest mismatch) or `proposal_altered` (full body mismatch).
  - execute: `buildDirective(siteId, siteIntent, fresh, isoTime)` (server.ts:698) → `emitOverlayEvent(siteId, [op], {requestId, timeoutMs: 10_000, staleGuard: {...}})` (server.ts:564) → journal gateway appends a `FYD_SITE_OVERLAY` event with op `set_presentation_intent` {intentId `pi-<...>`, siteIntent, proposal, approval{proposalDigest, approvedBy, approvedAt, note}}.
  - The dirty (uncommitted) additions are exactly the stale-guard layer: `directiveRefsFromBlock`, `layeredSpecDigest`, `StaleGuardError` imports; new 409 codes `stale_approval`/`precondition_changed`. The served build's compiled route.js contains `layeredSpecDigest` but NOT `StaleGuardError`/`stale_approval` — so the stale guard is source-only as of the build; the live approve path verified at 18:50 exercised the pre-stale-guard code.
- Response: `{ok, siteId, intentId, eventId, proposalDigest, specDigest, consequenceTier:"LOW", demo:true, demoOwnerMode:true}` plus `note` containing NOT_REAL_AUTH ("DEMO OWNER MODE - not real authentication. No identity was verified; ...") and — critically — `"Re-run the projection dump: the regenerated page must show the approved section order from the review card."`
- What it does NOT do (confirmed by code): no re-dump/re-render trigger — the approve path ends at the journal write. Serving the change requires the manual `FYD_OVERLAY_JOURNAL=demo python3 dump.py <site>` step (the verification's "known operational wrinkle"). No explicit reject action exists anywhere in the route: `POST` accepts only `parse`/`approve`/`clear`; an unapproved proposal is simply never applied (implicit reject).
- `emitOverlayEvent` (server.ts:564) is the journal write seam (HTTP to the gateway on 127.0.0.1:18199; journal file `data/fyd-journal/events.jsonl`). server.ts is DIRTY (+428).
- SERVED: the approve path as of the build is live-proven (verification proof (d): event `fyd-ovl-mulxaxri-c3dbf3e08b33`, specDigest `19b32914...`, served digest `24211990...` with Contact first).

### PROOF LINK
Verification proof (d) approve leg + the "Approve -> serve is NOT automatic" wrinkle.

### OVERLAP
- `src/fyd/sitepatch/approval-seam.ts` (Phase-1 approval seam adapter, committed at HEAD) is a parallel approval-surface definition with zero importers — see section 11.

---

## 8. Owner correction persistence + undo-as-new-version (journal, clear op, re-dump replay)

### CODE FOUND
- Journal: `data/fyd-journal/events.jsonl` (committed, 65 events, append-only). Event envelope: `{event_id, timestamp, event_type:"FYD_SITE_OVERLAY", tenant_id, aggregate_id:"fyd-site:<site>", aggregate_type:"fyd_site", event_data:{siteId, ops:[...]}}`.
- Gateway: `tools/fyd-journal-gateway/server.mjs` (DIRTY; `PORT = parseInt(process.env.FYD_JOURNAL_PORT || "18199", 10)` line 73). Verified live: pid 64173 on 127.0.0.1:18199; the dump defaults to the :8080 main gateway (currently 503) and fails closed with `WRONG_JOURNAL` unless `FYD_OVERLAY_JOURNAL=demo`.
- Undo: `handleClear` in route.ts → `runIdempotentWrite` → `emitOverlayEvent(siteId, [{op:"clear_presentation_intent", intentId}], ...)`. Live event: `fyd-ovl-mulxdrme-8013374d3d29` clearing `pi-dd15109312187b42`. The journal was never rewritten (30 overlay events intact at the time; 65 total lines now including seeds).
- Re-dump replay: `dump.py query_overlays_jsonl` (301) reads all events; `apply_overlays` (417): `set_presentation_intent` upserts into `presentation_intents` by intentId (482-527), `clear_presentation_intent` deletes by intentId (529-532); bad ops raise `ValueError` (unknown kinds abort the whole dump — fail closed). `dump_site` rewrites the projection atomically (mkstemp + os.replace) with fresh `graphDigest` and `presentationIntentDigest`.
- After undo + re-dump, verification observed specDigest return to `bacad15427d3e64d15d3d24d9f4d792a4fc49346b5dbe0586e6f34f1994074a` and the served page to `e3ea19622981f388e67a93a74a6b9359e47bf466ea8257d4b59e8ab71cbe891d` — byte-identical to the pre-move baseline. Undo is a transition, not a rewrite.
- SERVED: yes, end-to-end live-proven.

### PROOF LINK
Verification proof (d) in full; prior-lane corroboration (coppersmith Contact-first directive `pi-06d2931650907ebd`, event `fyd-ovl-mulutp2p-c082dc1d86c7`, specDigest `594ae3adf3dd527c...` unchanged).

### OVERLAP
- None: one journal, one gateway, one dump. The `mc-approval/` untracked dir and `src/app/api/mc/approvals/` are the MC approval surface, which only links to the overlay via prose citations in `approval.note` (digest law, types.ts:112-127) — deliberately not a second journal.

---

## 9. Two-site demo routes + demo-mode / not-real-auth fencing

### CODE FOUND
- Routes are static, not `[site]`: `src/app/sites/happy-place/page.tsx` and `src/app/sites/coppersmith-plumbing/page.tsx` (both DIRTY), under `src/app/sites/layout.tsx` (stylesheet-only wrapper). `/sites/coppersmith` → 307 to `/sites/coppersmith-plumbing` via `next.config.ts:56-61` ("FYD demo alias (2026-09-24, Nolan): /sites/coppersmith is the ... Temporary redirect"). `src/app/sites/page.tsx` (DIRTY) is the index.
- Demo-owner gate: `demoDenied(req, siteId, action)` in `src/app/api/fyd/customize/route.ts` (~lines 70-120): requires `process.env.NEXT_PUBLIC_FYD_DEMO_OWNER_MODE === "1"` AND a localhost/private-network host; otherwise 403 (`{status:403}` at 89/116) with "Customize-with-FYD approvals require DEV/DEMO OWNER MODE (NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1) on a localhost or private-network host."
- Not-real-auth fencing: `NOT_REAL_AUTH` (route.ts:70) = `"DEMO OWNER MODE - not real authentication. No identity was verified; this mode is for localhost/private-network demonstration only."` — carried on every approve/clear response and in `approval.note` on journaled directives; journaled approvals stamped `approvedBy: "demo-owner (seeded, unverified)"` (live). Process env of pid 23046 verified to contain the flag (`/proc/23046/environ`).
- Both site pages render the "Generated site demo" header via `site-client.tsx` (DIRTY; PROD-1 comment notes owner chrome is never mounted on public routes even with the demo flag on; the owner console lives on explicit owner routes such as `/dev/objects` and `/build/[siteId]`).
- Owner build routes: `src/app/build/[siteId]/page.tsx`, `owner-panel.tsx` (both DIRTY; log `25caf3c5`, `b0161b1a`).
- SERVED: yes (all live-probed; ask/why-this/objects/dev-objects/customize all responded on :3100).

### PROOF LINK
Verification "Demo owner mode (unmistakable test harness)" + "Surface inventory" sections; 403-without-flag behavior documented.

### OVERLAP
- Real auth exists alongside: `src/app/api/fyd/auth/*` (google start/callback/session/link/unlink/signout) — the demo gate is a parallel fence, not the auth system. The gate docstring is explicit that demo mode replaces identity verification only on localhost/private hosts.

---

## 10. Ask FYD + why-this

### CODE FOUND
- Ask: `src/app/api/fyd/ask/[siteId]/route.ts` — `POST` (line 44) delegates to `handleAskRequest` from `../ask-pipeline`; tenant derived from the route path param, never the body (header comment). Pipeline `src/app/api/fyd/ask/ask-pipeline.ts`: `handleAskRequest` (241), `answerClassFor` (162), `loadBundleWithOwnerOverlay` (117). BOTH route and pipeline are DIRTY (plus five dirty `__tests__` under `ask/`); last committed: route `77d94ded` ("track-d: Ask FYD binding contract as evidence-bounded assertion seam"), pipeline `b3c891c6` ("ARROW-1: Q-C-01/02/03/13 public projection boundary hardening"). Served build contains the compiled route (`.next/server/app/api/fyd/ask/[siteId]/route.js` present).
- Evidence machinery: `src/fyd/ask/context-compiler.ts` (DIRTY), `contract.ts`, `visitor-answer.ts` (all DIRTY) — the ask context compilers behind `handleAskRequest`.
- Why-this: `src/app/api/fyd/why-this/route.ts` (163 lines, DIRTY; log `00fc3813`, `c767d595`) — `GET` (95) reads `getVerifiedPublicProjectionSync` from `@/fyd/data/ping-object-source` and builds the claim chain via `whyThisStepsFor` (126), `supportForClaim` (219), `whyThisClaimChainFor` (324) from `@/fyd/object/why-this-steps`. Response shape: `{found, claim, source, observedWhen, evidence, support, supportDetail}`; a recorded relationship yields `support: "DIRECT"` (line 150). Served build contains the compiled route.
- SERVED: yes — live probes: `POST /api/fyd/ask/happy-place {"question":"What services does Happy Place offer?"}` → `ok:true` with 5 evidence refs; `GET /api/fyd/why-this?siteId=happy-place&objectId=website-business-6fa5ebd99d72c4cb` → `found:true`, claim "Happy Place Carpentry LLC", support DIRECT.

### PROOF LINK
Verification "Surface inventory" Ask FYD + Why this/evidence entries.

### OVERLAP
- `src/components/ping/ask-ping.tsx` (DIRTY) is the Ask FYD widget component (client) — presentation only, calls the same route. No duplicate answer pipeline found.

---

## 11. Track C `src/fyd/sitepatch/` 10-op vocabulary; served-route import check

### CODE FOUND
- Exists: `src/fyd/sitepatch/types.ts` (5,458 B), `pipeline.ts` (25,246 B), `approval-seam.ts` (6,791 B), `__tests__/`, `jest.config.cjs`. Committed at HEAD across `fdb5d3f3` → `47ea5b26` → `f877c391` (all 2026-09-28 16:59 — AFTER the served build of 2026-09-27 21:00).
- The 10 ops (`types.ts`, `SitePatchOp`): `MOVE_SECTION`, `ADD_SECTION`, `REMOVE_SECTION`, `SET_VISIBILITY`, `SET_FEATURED_OBJECT`, `SET_DESIGN_TOKEN`, `SET_PRESENTATION_COPY`, `ADD_PAGE`, `REMOVE_PAGE`, `CHANGE_QUERY`. `SITE_PATCH_OP_MAP` reconciles each onto the canonical implementation: ADOPT → `src/fyd/proceduralize/patch.ts` (`reorder_section`, `toggle_section`, `set_featured`, `edit_copy`) / `src/fyd/owner-mode/visibility-policy.ts`; ADAPT → `src/fyd/sitepatch/pipeline.ts applyExtendedSitePatch`; REFUSE → `SET_DESIGN_TOKEN` refused at CAPABILITY per the frozen Lane D layer law.
- `pipeline.ts` exports: `TRACKC_DEMO_OWNER` (65), `validateSitePatchOp` (133), `capabilityForOp` (244), `proposeForOp` (354), `applyExtendedSitePatch` (384), `previewSitePatch` (454), `runSitePatchPipeline` (579) — the staged PATCH→VALIDATE→CAPABILITY→PREVIEW→APPROVAL→EVENT→NEW SPEC VERSION pipeline.
- Import check (the decisive grep): `grep -rn 'fyd/sitepatch' src/app src/fyd --include=*.ts --include=*.tsx` — including `__tests__` dirs — returns ONLY self-referential `canonical:` docstrings inside `src/fyd/sitepatch/types.ts` itself. **Zero imports anywhere else in `src/app` or `src/fyd`. No served route imports it; no test imports it; no library module imports it.** The module is committed but fully orphaned.
- CRITICAL CLARIFICATION: the live plain-English→proposal path (`propose.ts proposeFromSiteIntent`) imports `proposeSitePatch` from `../proceduralize/patch` (`src/fyd/proceduralize/patch.ts`), NOT from `src/fyd/sitepatch/`. The similar names are a trap; the file header of propose.ts says so explicitly.
- SERVED: no — source-only. Not in the build (committed after the build) and unimported regardless.

### PROOF LINK
Verification BUILD SKEW NOTE: "Track C's src/fyd/sitepatch/ (10-op vocabulary, approval-seam) is source-only: no served route imports it." — confirmed and strengthened (no imports anywhere in src/).

### OVERLAP (the genuine duplication surface)
- `sitepatch/pipeline.ts` (`proposeForOp`, `previewSitePatch`, `validateSitePatchOp`, `capabilityForOp`, `applyExtendedSitePatch`, `runSitePatchPipeline`) parallels the live Lane D stack: `proceduralize/patch.ts` (`proposeSitePatch`, `proposalDigest`, `applySitePatch`), `customize/propose.ts` (`proposeFromSiteIntent`, `reviewCardForSiteIntent`), `customize/server.ts` (`runIdempotentWrite`, `emitOverlayEvent`, stale guard), `customize/apply-layer.ts` (`applyPresentationIntent`). The types.ts header claims ADOPT/ADAPT/REFUSE convergence ("does NOT re-implement that machinery"), but `runSitePatchPipeline`'s staged flow (EVENT→NEW SPEC VERSION) is a second approval/event pipeline with no callers — the convergence question for the forest pass is whether it gets wired in or stays a dead spec.
- `approval-seam.ts` (Phase-1 approval seam adapter) likewise has zero importers.

---

## Cross-cutting: dirty vs committed vs served (summary)

| File | Committed@HEAD | Dirty | In served build |
|---|---|---|---|
| `src/app/layout.tsx` (suppressHydrationWarning) | no (one-line ` M`) | yes | YES (12 `.next` matches; live flight data) |
| `src/app/api/fyd/customize/route.ts` | yes (`95b4702d`) +60-line dirty | yes (stale-guard layer) | PARTIAL (pre-stale-guard; `StaleGuardError` absent) |
| `src/fyd/customize/server.ts` | yes (`95b4702d`) +428-line dirty | yes | uncertain (see route) |
| `src/fyd/customize/types.ts`, `propose.ts`, `apply-layer.ts` | yes | types/propose dirty; apply-layer committed | yes (core path live-proven) |
| `src/fyd/proceduralize/*` | yes | `patch.ts` committed; `sha256.ts` dirty (re-export only) | yes |
| `src/fyd/sitespec/binding-verifier.ts` | yes (`89c7da78`) | yes | observation tap live; exact dirty content unproven |
| `src/fyd/sitespec/safe-link.ts` | yes | no | yes |
| `src/app/sites/_shared/spec-pipeline.ts` | yes | no | yes |
| `src/app/sites/*/page.tsx` | yes | yes | yes (pages render) |
| `src/app/api/fyd/ask/**`, `why-this/route.ts` | yes | yes | yes (live-proven) |
| `data/fyd-journal/events.jsonl` | yes (65 events) | no | n/a (read at runtime via gateway) |
| `tools/fyd-site-projection/dump.py` | yes | no | n/a (offline tool) |
| `tools/fyd-journal-gateway/server.mjs` | yes | yes | n/a (running pid 64173; dirty content may differ from source) |
| `src/fyd/sitepatch/*` | yes (trackc, post-build) | no | NO (unimported, source-only) |

Failures / gaps encountered: none blocking. The `pi-b9d3ea837d2e222e` payload was not isolated separately from the shared event line `fyd-ovl-muklxc7l-333f04fa678b` (both intentIds grep to that one line; the `set_featured` kind attribution comes from the verification record). The `src/fyd/builder/` directory was not traced (out of scope; flagged as a possible second builder surface).
