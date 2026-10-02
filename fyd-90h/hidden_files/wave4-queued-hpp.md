# WAVE 4 AUDIT B — HAPPY PLACE (HPP) — PARTIAL FINDINGS, QUEUED

**Status (2026-09-29 ~09:06 MDT):** RECLASSIFIED per Nolan's binding PING-MVP pivot (`~/workspace/fyd-90h/PING-MVP-FINISH.md`). HPP is now a regression/adversarial fixture, useful but noncritical. This audit stopped mid-read; nothing is discarded. No further writer effort until an MVP writer unit closes and Nolan promotes it.

**What was verified (all from primary artifacts actually read; lane reports treated as hypotheses):**
- Repo pinned live: `/home/nolan/projects/ping` @ `f877c3919941978f07d5014909595df4751ec258`, branch `fyd/builder-harvest-trackc-2026-09-28`, 144 porcelain, 71 worktrees. All code reads from a FRESH detached worktree `/tmp/w4-audit-hpp` @ f877c391 (0 porcelain) — never the dirty checkout.
- :3214 served state: worktree `/home/nolan/projects/ping-wave2-ownerloop` @ `3235804d`, route `/sites/happy-place` → 200. Journal `/home/nolan/ping/var/fyd-ownerloop-journal/events.jsonl` (6 events, read-only).
- :3100 courtroom build: SEPARATE tree `/home/nolan/projects/ping-fyd-converged` @ `5732485b` — NOT the pinned HEAD. Its HPP page also returns 200 but is a different build.
- ws3 browser proof: `~/workspace/fyd-90h/hidden_files/ws3-browser-proof-20260929/` (5 viewports vs :3214, no console errors).
- Projections read: `/home/nolan/ping/var/fyd-ws4-projections/happy-place.json`, `/home/nolan/ping/var/fyd-ownerloop-projections/happy-place.json`, `/home/nolan/ping/var/fyd-projections/happy-place.json` (the one :3100 serves).
- Media manifest: `src/fyd/media/manifests/happy-place.json` (in the pinned worktree).
- Generator: `src/fyd/proceduralize/generator.ts`; approve path: `src/app/api/fyd/customize/route.ts` + `src/fyd/customize/{server,propose,owner-proposal}.ts`; seam: `src/fyd/sitepatch/approval-seam.ts`.

## EXPECTED BUSINESS REALITY (partial)
Happy Place Carpentry LLC, Adair Village OR, licensed Oregon carpentry contractor (CCB# 254240), decks/fences/pergolas/bathrooms/custom work, Benton/Linn/Marion/Polk counties. Source: `https://happy-place-platform.vercel.app/` (fixture provenance; live source NOT re-crawled per task scope).

## ACQUIRED REALITY (verified)
The entire HPP acquired reality is a MACHINE-GENERATED 7-object fixture (`src/fyd/proceduralize/__fixtures__/happy-place-graph.ts`, 233 lines): 1 business, 1 location (coarse city/state), 5 services (Repairs, Fencing, Painting, Drywall, Restoration), 6 relationships. Provenance per object is a flat triple `{kind: "website-derived", ref: "website-ingestion:https://happy-place-platform.vercel.app/", derivedAt: "2026-09-21T13:50:00Z"}`. No observation records, no per-field evidence, no evidence objects in the graph.

## EVIDENCE MODEL (verified — contains the first verified corruption)
- **Layer flattening, VERIFIED:** the business `description` field in both live projections carries the suffix `"[owner-loop source refresh 2026-09-29]"`. The fixture file does NOT contain it (grep count 0), so a simulated source refresh MUTATED the source-derived fact string with pipeline bookkeeping. The mutated fact renders in visitor copy (hero card, About section), in `<meta name="description">`, `og:description`, and `twitter:description` (confirmed in served HTML from :3214). Meanwhile `provenance.derivedAt` was NOT updated (still 2026-09-21). Bookkeeping went into the fact; provenance stayed stale. This violates the locked layering (SOURCE-DERIVED FACTS vs GENERATED PRESENTATION never flattened).
- Media provenance is the bright spot: `src/fyd/media/manifests/happy-place.json` records per-asset observations (sourceUrl, sourcePage, observedAt, outcome, rightsBasis "Demo-authorized source (Nolan 2026-09-25)"), digests, dimensions (1080x1440), and derivative variants. BUT media lives in a sidecar manifest keyed by site id — there are NO MediaAsset objects in the object graph (Gallery section uses query kind `"static"`: "the section resolves no graph objects").

## OBJECT GRAPH (verified)
Thin and flat: phone/email/website/images are plain strings on the business object (no ContactMethod objects); no Person objects (HPP stress profile demands human/business story — absent); no Capability objects; no Hours; no Posts. **Internal inconsistency:** the business description names "decks, fences, pergolas, bathrooms, and custom work" but there are NO service objects for decks, pergolas, bathrooms, or custom work — the structured service surface underrepresents the business's own words.

## SITESPEC (verified on HEAD)
`generateSiteSpec` is pure and deterministic: fixed page order (home/about/services/explore), fixed section order per page, all sorts by id, `generatedAt` pinned via projection meta. Section eligibility is rule-based (services>0 → Services), matching the convergence doc's determinism-first composition. Section titles are NOT in the spec — they come from renderer defaults or `presentation.heading`. Determinism claim "same graph + intent → same SiteSpec" holds for the base compile on HEAD; the intent layer (`applyPresentationIntent`) applies journaled directives in order.

## SERVED EXPERIENCE (verified via curl + ws3 screenshots)
Two different served states from two different code trees (provenance binding absent — see below):
- **:3214 (owner-loop preview, 3235804d):** reflects 3 real journaled owner intents (hide Locations, Services first, CTA first). Still renders the engineering harness as customer UX: H1 "Generated site demo", "Procedural close proof" badge, "WEBSITE STATEMENT" pill + "Why this?" expander on EVERY service card and gallery photo, "SITE RECORD" chips, "Photo source:" raw vercel-blob URLs exposed to visitors, the full "Customize this site" owner panel (section reorder, copy-edit proposals, design tokens, demo-owner capability allow/deny list, "Attest with NO evidence" button) rendered INLINE on the public page, and the customize example text "Move emergency plumbing first" on a CARPENTRY site. Hero image is a HOTLINK to `https://happyplacecarpentry.com/images/hero-background-enhanced.jpg` (not an FYD derivative). Gallery images ARE FYD derivatives (`/fyd-media/<sha>/card-768w.webp`) but alt text is generic ("Happy Place Carpentry project photo N").
- **:3100 (courtroom, 5732485b):** no demo harness header, BUT renders **"Emergency Services"** as the Services section H2 with copy "Get in touch with us for urgent repairs at Happy Place Carpentry LLC. We're always ready to help, but we can't promise response speed or ranking." Root cause traced: projection `/home/nolan/ping/var/fyd-projections/happy-place.json` carries directive `pi-82b6c64f99149682` (`edit_copy` on `home:Services:2`, `propsDiff.presentation.heading="Emergency Services"`), recorded as approved by `"nolan:owner"` 2026-09-28 via "MC approval p0prop-ac04480a6d1809fd" with note "DEMO OWNER MODE journal transport" — a SEEDED lane-test directive (alongside `pi-stub-001/003`, `fyd-seed-ovl-*`) now served as the business's positioning. The graph has NO emergency capability object. The converged renderer's binding verifier EXPLICITLY EXEMPTS "section headings that come from presentation (generated copy)" from factual verification — so the false capability claim flows straight to visitors.

## MISSING INFORMATION
Decks/pergolas/bathrooms/custom-work as service objects; any Person (owner/team story); ContactMethod objects; MediaAsset objects in the graph; Hours; Posts/content; Capabilities; per-field evidence records.

## WRONG INFORMATION (verified)
1. "Emergency Services" + "urgent repairs... can't promise response speed or ranking" on :3100 — seeded presentation directive misrepresenting the business (see above).
2. `"[owner-loop source refresh 2026-09-29]"` inside visitor-facing business copy and SEO meta tags (layer flattening).
3. "Move emergency plumbing first" example text in the :3214 customize panel (template bleed).
4. "Generated site demo" presented as the page H1 on the served :3214 experience.

## LOST SEMANTICS
- Refresh bookkeeping merged into the fact string (provenance not updated alongside).
- Media semantics (source URL/digest/dimensions/rights) exist only in the sidecar manifest, not as graph objects — Ask/object navigation cannot cite media as evidence.
- Contact info flattened to strings — no ContactMethod objects for the binding verifier to reason over.
- `edit_copy` directives can assert capability-implying claims ("Emergency Services") that the binding verifier is contractually blind to (presentation exemption).

## GENERIC DESIGN DECISIONS
Fixed section order for all fixtures (Hero→BusinessSummary→Services→…→CTA→AskFYD→ObjectRail); the owner had to manually move CTA and Services first on HPP. Evidence chrome ("WEBSITE STATEMENT"/"Why this?"/"SITE RECORD") is the dominant visual language — courtroom exhibit, not the visual warmth/personality the HPP stress profile requires.

## MOBILE DEFECTS (verified from ws3-375.png)
- "Fencing" card: the heading's initial "F" is clipped by an overlapping circular badge (absolute-positioned element collision at 375px).
- Service descriptions truncated with "..."; page is one extremely long scroll dominated by the inline owner-customize panel.
- Otherwise no console errors; layout is single-column and readable.

## ASK DEFECTS (verified live against :3214, read-only)
`POST /api/fyd/ask/happy-place` "Do you build decks?" → "Related offerings: Repairs; Fencing; Painting; Drywall; Restoration. [9][10][11][12][13] The site data has no record addressing 'build' specifically." Claims are SUPPORTED DIRECTLY with object citations and honest refusal — the EVIDENCE BINDING works — but the graph's missing deck/pergola/bathroom services make the business's headline work undiscoverable. Honest, but thin: an Ask-side symptom of the graph-completeness gap, not an Ask reasoning failure. (L4 courtroom 11/11 on the converged tree was not re-run here.)

## OWNER-CONTROL DEFECTS (verified on HEAD f877c391)
- **Approval door: FUNCTIONAL but UNCANONICAL.** HEAD's served approve path (`src/app/api/fyd/customize/route.ts` `handleApprove`) enforces: capability check (`owner.customize-approve`), fresh re-derivation of the proposal from the CURRENT spec with exact digest match (409 `stale_digest` = TOCTOU enforced), full-body equality (409 `proposal_altered`), idempotent write with request_id + canonical payload digest, journal identity pre-flight (FYD-037). The W2 worktree's journal additionally shows APPROVAL_SUPERSEDED / APPROVAL_DENIED / APPROVAL_EXPIRED events being recorded.
- **Gaps vs the required contract:** (1) `emitGateProposal` hardcodes `expires_at: null` and `verifyGateDecision` never checks time — **no proposal expiration on HEAD**; (2) `SeamProposalStatus` has EXPIRED/SUPERSEDED but the served `OwnerProposal` status is only `drafted|approved|applied` — **no DENY/EXPIRED/SUPERSEDED terminal states on the HEAD served path**; (3) `src/fyd/sitepatch/approval-seam.ts` declares itself "AN ADAPTER, NOT AN AUTHORITY" with **"BINDING STATUS: PENDING"** — the Phase 1 gate (`phase1/approval-door-2026-09-28`) is the declared authority and is NOT on HEAD; (4) all approvals are `demo-owner (seeded, unverified)`; (5) the served :3100 projection carries SEEDED `"nolan:owner"` approvals from lane tests presented indistinguishably from real owner approvals.
- So: OWNER INTENT → PROPOSAL → [locally-enforced door] → TRANSITION is closed on HEAD's customize route, but the CANONICAL approval contract (One Approval Contract, expiration, terminal states, real identity) is NOT on HEAD.

## REGEN DEFECTS (partially verified)
- Approve→regen chain: the :3214 projection dump picked up all 3 journaled intents (overlayEventIds match journal event_ids; `presentationIntentDigest` covers them) — the journal→projection→rendered-page path works.
- `loadCustomizedSite` pins `generatedAt` from projection meta (stable per dump) — spec digest reproducible across calls.
- NOT assessed: DependencyIndex-driven invalidation, last-good recovery on regen failure, atomic publish, incremental-vs-full rebuild equivalence.

## FIRST QUALITY LOSS (provisional — audit incomplete)
**EVIDENCE QUALITY, specifically: source-refresh bookkeeping flattened into the source-derived fact string.** It is the earliest layer with a defect VERIFIED from primary artifacts (fixture file lacks the marker; both live projections carry it in the `description` field; `derivedAt` was not updated; the marker renders in visitor copy and SEO meta tags). It violates the locked layering (SOURCE-DERIVED FACTS vs GENERATED PRESENTATION), is visible to visitors and search engines, and every downstream layer faithfully propagates the corruption — the generator, renderer, and Ask all treat the polluted string as business truth. The thin graph (missing services/people/media objects) is the second loss and the largest product-surface gap for HPP's stress profile, but it follows the evidence-layer break in the chain.

## SMALLEST BACKEND CORRECTION (provisional — for the future writer unit)
Do NOT add a new store/authority. In the refresh path that produced the marker (and any future source-refresh writer): **forbid mutation of source-derived fact fields with pipeline bookkeeping; record refresh provenance as a separate evidence/provenance record** (refresh run id, observed_at, diff summary) linked from the object's provenance, leaving `description` byte-identical unless the SOURCE actually changed. Concretely: strip the `"[owner-loop source refresh ...]"` suffix from the fact (one deterministic migration over the projection's business object), move it to `provenance.refresh: {runId, at, note}`, and add a validator/test asserting no source-derived string field matches pipeline-marker patterns. WHAT PRODUCT CAPABILITY DOES THIS ENABLE: trustworthy source refresh — the regen loop can re-observe reality without corrupting business truth, which the 90-hour loop's SOURCE→…→SOURCE-REFRESH→INTENT-SURVIVAL promise requires. Determinism first: same source + same refresh run → same graph bytes.
Expected shared benefit: identical defect class applies to any fixture whose refresh path annotates facts; the validator protects all three.

## EXPECTED EFFECT ON THE OTHER TWO FIXTURES (PING, Coppersmith)
Provisional: the refresh-marker flattening is a pipeline defect, not HPP-specific — any fixture run through the same refresh simulation would carry markers in its facts. The `edit_copy`-can-assert-capability gap (presentation exemption in the binding verifier) affects all fixtures equally: it is how "Emergency Services" could equally appear on PING or Coppersmith. The media-sidecar-vs-graph gap affects any media-rich fixture (HPP most). No fixture-specific architecture is proposed; all corrections are kernel-level.

## NOT ASSESSED (queued for the future writer unit)
Full mobile pass beyond 375px; Ask battery beyond one probe; regen failure/last-good/atomicity; DependencyIndex coverage; determinism re-run proof (same graph+intent → byte-identical spec, twice); acquisition diff vs live source (out of scope — no re-crawl); PING/Coppersmith differential.
