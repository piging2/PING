# FYD HARVEST AUDIT — LANE I: FYD PRODUCT LAYER GAPS

**Date:** 2026-09-22 (MDT). **Read-only.** Branch `fyd/builder-composition` @ `/home/nolan/projects/ping` (0dec40f5). No writes, no installs, no commits, no test runs; all repo access via `~/workspace/pig/pigwsl-run.sh`.
**Builds on:** lanes A (pipeline trace), E (security), F (provenance). This lane extends them into product-level gaps; it does not re-prove them.
**Frame:** the eventual 24h directive is a PRODUCT/UI sprint. This audit finds the smallest FYD-specific product layer between PING (substrate) and the UI ecosystem.

---

## 1. SITE SPEC / RENDERER PATH TODAY (the exact chain)

```
ObjectGraph (projection JSON, read seam, digest-verified)
  -> generateSiteSpec(graph)              [proceduralize/generator.ts:289]
  -> FYDSiteSpec  kind "fyd.sitespec@1"   [sitespec/types.ts:314]
       pages[] -> sections[] (id = pageSlug:component:index)
         component: registry name | query: FYDQuery | presentation: {...}
  -> validateSiteSpec -> isRenderable     [sitespec/validator.ts]
  -> registry  COMPONENT_REGISTRY_VERSION "fyd-component-registry@1"
     [components/registry.ts] ~17 components + GenericObjectCard fallback
  -> renderer.tsx
       resolveQuery (FYDQuery -> objects) :72
       buildRenderContext :187
       boundField -> verifyPresentationBinding (sitespec/graph.ts) -- the
         render-time veto from lane F
       renderSection / SitePageView :1732/:1789
  -> SiteClient (shared by both demo sites)
```

### Does a typed patch IR both a human visual editor and Ask FYD could emit already exist?

**The shape exists. The convergence does not.** There are **three** change IRs, not one:

| # | Name | Producer | Shape | Digest | Approval | Replay | Status |
|---|------|----------|-------|--------|----------|--------|--------|
| 1 | Ask FYD `site_patch` | `src/fyd/ask/site-patch.ts` | `SitePatchPayload { siteId, pageSlug, operations: SitePatchOperation[] (reorder_section_objects \| set_presentation ONLY), siteSpecDigest, affectedObjects, evidenceReason }` + `AskProposal` (`ping.social.proposal@1`, optional Ed25519 envelope) | `lib/ping/ask-composer.ts proposalDigest` | `/api/ping/proposal` (digest + envelope + current-spec-digest re-check) -> OBJECT_UPDATED to PING journal | **DEAD**: `registerSiteSpecProvider` has **zero callers** (`grep` verified), so `sitePatchRefusal` always fires ("I do not have your site spec in context"); even if approved, `dump.py` never reads OBJECT_UPDATED events, so **no consumer exists for `changes.site_patch`** — the approved patch lands in the journal and dies there |
| 2 | Customize `site_patch` | `src/fyd/customize/*` + `src/fyd/proceduralize/patch.ts` | `SiteIntent` (reorder_section, toggle_section, set_featured, edit_copy, set_theme_token) -> `SitePatchBody { proposalDigest, targetPage, targetSection, component, propsDiff, reason }` | its **own** `proposalDigest` in `patch.ts` ("Mirrors ask-composer" per header, but a separate `canonicalize` + `VOLATILE_KEYS` implementation) | `/api/fyd/customize` parse -> review card -> approve (freshly re-derived digest must match or 409 `proposal_altered`) -> `set_presentation_intent` overlay op -> FYD_SITE_OVERLAY journal | **LIVE**: `dump.py` applies it; projection changes; the CustomizePanel conversational loop (plain English -> intent -> proposal -> explicit approval) is the working human visual editor |
| 3 | OwnerCommand | `src/fyd/object/commands.ts` (`interpretTextCommand`) | move-service / set-service-visibility / add-service / correct contact field / address visibility | patchDigest + baseStateDigest | `/api/fyd/objects/[objectId]/overrides` propose/approve two-step | **LIVE**: journaled to demo journal, composed at read time by `owner-overlay.ts` (SOURCE SAYS X / OWNER SAYS Y preserved) |

**Where they diverge:**
- IR 1 and IR 2 share the kind name `"site_patch"` with **incompatible bodies** and **two separate digest implementations**. Same name, different law.
- IR 1 is presentation-only (2 ops); IR 2 covers copy/theme/tokens; IR 3 covers facts/order/visibility. No single IR covers facts + presentation.
- IR 1 is the only one Ask FYD drafts (3 keyword intents: `reorder_services_first`, `professionalize`, `feature_object`, `detectSitePatchIntent`), and it is unreachable in practice (null provider + `grants: []` in the visitor pipeline).
- IR 2 is the only one the human editor uses; Ask FYD cannot emit it.
- Replay converges only through the FYD_SITE_OVERLAY journal — IR 1 bypasses it (OBJECT_UPDATED to the main journal).

**Verdict:** the typed-IR convergence target is real and named — digest-bound proposal, human approval of the exact digest, replay through one governed journal — but today it is **three IRs, two digest laws, two replay fates (one dead)**. The convergence work is: one IR (facts + presentation + visibility), one digest law, one replay path (FYD_SITE_OVERLAY), one approval UX. The Ask FYD `site_patch` draft/apply code is the best-shaped starting point; the customize overlay path is the only live replay. Do not build a fourth.

---

## 2. ASK FYD GAPS

### Bounded to the tenant graph? Yes.
`src/app/api/fyd/ask/ask-pipeline.ts` + `src/fyd/ask/visitor-answer.ts`:
- Tenant from the route path only (body-supplied tenant identity -> 400 `tenant_mismatch`).
- Only `visibility: "public"` objects and active relationships with both ends public enter the context.
- `applyFieldVisibility(graph, [])` — conservative defaults (address coarsened, never leaked verbatim) since the decision store is empty.
- Anonymous viewer `{ id: null }`, `grants: []`: "no proposal, draft, or mutation capability exists in this pipeline."
- `mode: "owner"` is **accepted but explicitly treated as visitor-safe** ("grants nothing and changes nothing... There is deliberately no code path here that serves owner-private facts").

### What it actually queries today
From the site bundle (`getSiteBundle`: projection graph + `generateSiteSpec` + validator findings + media manifest) plus the owner overlay (`applyOwnerFieldCorrections`): target object, 1-hop related objects, relationships, capability plan (null in visitor pipeline), current SiteSpec summary (`summarizeSpec`), owner field corrections. **Not queried:** per-field provenance/classes, the presentation-intent layer (see gap 4), hours, people/team, projects, media Q&A, capabilities beyond the static plan.

### The composer
`src/lib/ping/ask-composer.ts composeAnswer` is a **deterministic keyword-branch answerer** (no model). Topic branches: about/describe, services, contact (website/phone/email), location, reviews/trust/evidence, follow, capabilities ("what can you do"), provenance ("how do you know"). **Missing branches:** hours, people/team, projects, media/gallery, anything not keyword-matched (falls to generic "ask about the object" guidance).

### 3-class labeling: contract yes, data no
- The contract exists: every citation carries `claimClass` ("supported" | "derived"); the route reduces the answer to "supported" | "derived" | "unknown" (unknown = refusal, never a guess); DERIVED_FACT/INFERENCE/GENERATED_COPY claims label "derived"; the "Why this?" disclosure shows source, basis, last-checked date.
- But the data never arrives: `claimClassification(ctx.fieldClasses, obj, field)` reads `ctx.fieldClasses`, and `buildAskContext` defaults it to `{}` (ask-composer.ts:234). Nothing feeds it — lane F's dropped-`fieldClasses` break. So **derived-vs-direct labeling is structural, never data-driven**: an assembled `DERIVED_FACT` locality and a verbatim `DIRECT_FACT` both classify "supported" at the citation layer.
- The renderer path has the same hole in reverse (renderer defaults to "direct"; lane F).

### Gaps vs the target (visitor mode vs owner mode)
1. **Owner mode does not exist.** Visitor-safe only; no analyze/recommend; PROPOSE exists only as the dead IR-1 draft (see §1).
2. **Ask reasons over the wrong spec.** `summarizeSpec` hashes `bundle.spec` — the **base** compiled spec — while the rendered page shows the spec **plus** the presentation-intent layer (`applyPresentationIntent`, applied on the happy-place page). On any site with approved intents, Ask FYD drafts against a spec the visitor never sees. The site bundle never applies the intent layer.
3. **Intent detection is 3 keyword shapes.** Anything outside reorder/feature/professionalize never becomes a proposal; proposal intents also require the `site.propose` grant which the visitor pipeline never issues (`grants: []`). The `maintain_site` permission set (`capabilities.ts`) exists but nothing issues it.
4. **No "unknown" beyond refusal.** The "unknown" class = refusal with honest wording (good), but there is no partial-unknown (answer with named gaps) beyond the `unknowns: []` passthrough, which the composer leaves empty.

---

## 3. OWNER GATE

**State:** DEMO OWNER MODE exists as an explicit, bannered, dev-only seam — and it is explicitly **not authentication**. Headers in `gate.ts`, `capability.ts`, `demo-chain.ts` all say: "Nothing in this directory may back a production authorization decision... must be built as a separate, reviewed mechanism; these demo verdicts must not be reused, wrapped, or 'upgraded'."

**Mechanics:** env gate (`NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1`), private-host-only network gate (`isPrivateHost`: loopback, RFC-1918, link-local, Tailscale CGNAT range, .local/.internal/.lan), capability evaluation (`evaluateCapability`, deny-by-default, 5 `OwnerCapability`s).

**Consequence-based friction mapped onto real code:**

| Tier | Consequence | Code path | Friction | Status |
|------|-------------|-----------|----------|--------|
| Low | theme / reorder / preview | CustomizePanel -> `/api/fyd/customize` | Propose -> review card -> explicit approve (digest re-derived server-side; mismatch -> 409, nothing applied). Preview itself is read-only, no gate needed. | EXISTS (demo-scoped) |
| Medium | fact correction | overrides route propose/approve (`baseStateDigest` + `patchDigest` checks) | Explicit approval of the exact patch; journaled as provenance-backed event; source value preserved (SOURCE SAYS X / OWNER SAYS Y) | EXISTS (demo-scoped) |
| Medium | publish | `owner.publish` | **DENY** in demo ("the demo grants no publish path; publishing would be a real-world effect") | Explicitly absent |
| High | send / launch / spend / external mutation | `FORBIDDEN_AGENT_EFFECTS`: site.publish, message.send, purchase.make, ad.buy, provider.call, business.mutate (ask/capabilities.ts) | Structurally absent; `agentGrants` strips them; `assertAgentEffectAllowed` throws | No code path exists |

**Missing:**
- Production identity/auth (the seam is honest that it doesn't exist; per its own headers this is a separate reviewed build, not an upgrade of the demo).
- Visibility decision store: `owner.edit-visibility` is "proposal only; nothing is persisted" (capability.ts).
- Per-field phone/email hide: `set-contact-field` corrects values only (lane F).
- The Ask FYD grant path: no way to issue `maintain_site` today.

---

## 4. OWNER VISIBILITY

**Confirmed (extends lane F §3):** the design is wired at the apply sites but has no producer and no store.

- `applyFieldVisibility` is called in `buildRenderContext` (renderer.tsx:191, default `ownerDecisions: []`), in the Ask pipeline (visitor-answer.ts:169, literal `[]`), and the render model carries `ownerOverrides?: FieldVisibilityDecision[]` (render-model.ts:90).
- Extraction-side safe defaults exist and are wired: `street_address` et al. -> private, withheld in `resolve()` (defense in depth in `project()`).
- **No `FieldVisibilityDecision[]` store exists anywhere.** No route or UI produces decisions. The demo `owner.edit-visibility` capability is proposal-only.
- Per-field matrix: address SHOW/HIDE exists at **site level** (`set-address-visibility`); phone/email have **no hide command**; "USE CITY ONLY / USE SERVICE AREA" coarsening is a pipeline default, not an owner-selectable policy.

---

## 5. TWO TENANTS — verified same pipeline, same components, same contract

Both `src/app/sites/happy-place/page.tsx` and `src/app/sites/coppersmith-plumbing/page.tsx`:
- `getPingObjectGraph(SITE_ID)` (same read seam, digest-verified, fail-closed) ->
- `generateSiteSpec(graph)` (same generator, no per-tenant branching) ->
- `validateSiteSpec` + `isRenderable` (same gate) ->
- shared `SiteClient` -> same renderer + same component registry ->
- same Ask FYD widget (`ask-fyd-widget.tsx`, generic, no business copy).

Graphs differ (7 vs 8 objects, different facts); projections differ (`var/fyd-projections/<slug>.json`); the backend contract is identical (FYD_SITE_OVERLAY journal via `dump.py`).

**Two real divergences (evidence, not assumption):**
1. The happy-place page applies `applyPresentationIntent` and mounts `<DemoOwnerMode>`; the coppersmith page does neither. The intent layer is per-site wired, not pipeline-wired.
2. The Ask site bundle does not apply the presentation-intent layer (see §2 gap 4) — ask/render divergence on any site with approved intents.

**Marketing objective vs business facts vs presentation strategy:**
- Separated in code: `OwnerIntent` (builder/owner-intent.ts: goals, conversionPriorities, preferredCustomers/undesiredCustomers, prohibitedPositioning, brandDirection — the marketing objective) is a distinct type from the ObjectGraph (facts) and from `SiteStrategy`/`CompositionPolicy` + archetype vector (strategies.ts — the presentation strategy). The planner never manufactures facts ("every section comes from the existing generator's data-driven output"); `assertConfidenceLaw` enforces presentationConfidence <= factConfidence; generated copy is evidence-bound (`verifyGeneratedPresentation`).
- **But:** `planSite` is called without an `ownerIntent` in `/build/[siteId]/page.tsx` — the marketing-objective input has no producer and no surface. Strategy is inferred from graph role counts (`infer-strategy.ts`) or an explicit pin. Nothing conflates the three today; the risk is future, not present.

---

## 6. DUPLICATE FYD CODE (delete or wrap)

Candidates where FYD re-implements what PING already provides or what FYD itself provides twice. Caution noted where the duplicate belongs to the PING-social product surface, not the builder lane (wrap, don't delete).

1. **`src/fyd/onboarding/extractor.ts` (`extractPageEvidence`)** — a SECOND HTML extractor parallel to `proceduralize/proceduralizer.ts`. Used only by the anonymous preview and `/app/fyd/page.tsx`. **WRAP**: route the preview through the real pipeline (it already emits `ParsedFact`s) or delete the parallel extractor. Two extraction truths is the exact sovereignty violation the product sprint should close first.
2. **Signing/envelope x3**: `src/fyd/ask/envelope.ts` ("Port of the PING canonical envelope construction"), `src/lib/ping/dev-signer.ts` (`signAsIdentity`), and the PING core envelope law. The FYD port was a deliberate dependency-free choice (harvest A1), but the website repo now carries at least two of its own. **CONSOLIDATE** to one envelope authority inside the repo (the FYD one is pinned to `sha256-canonical-json-v1` and matches the proposal digest law — it is the stronger candidate).
3. **Digest law x2**: `ask-composer.ts proposalDigest` vs `proceduralize/patch.ts proposalDigest` ("Mirrors" but separate `canonicalize` + `VOLATILE_KEYS`). Unification follows the IR convergence in §1 — one IR, one digest.
4. **Binding verification x2**: `sitespec/graph.ts verifyPresentationBinding` (renderer) vs `builder/manifest.ts bindingsForComponent` + planner `verifyGeneratedPresentation` (builder). Two implementations of "is this generated text bound to evidence". **Pick one** (the render-time verifier is the live veto).
5. **`src/fyd/claim/*` (machine/store/resource-id/verification-seam)** — a parallel claim machine to PING core's `EvidenceAuthority` (lane F: zero cross-references). Live only on `/api/fyd/claims/*` + `/app/fyd/page.tsx` (the social-claims flow), not the site pipeline. **For the FYD product path: wrap or route to PING evidence; do not extend.** (Do not delete outright — it serves the PING-social surface.)
6. **`src/fyd/identity/*` vs `src/lib/ping/session.ts`** — two auth surfaces: HMAC `fyd_session` OAuth lane vs unsigned `ping_practice_identity` dev cookie. Different concepts today (real session vs practice selector), but the demo owner chain reads the practice cookie. Needs a decision, not a blind delete: one session story for the product.
7. **Capability vocabularies x2**: `FydGrant` + `FORBIDDEN_AGENT_EFFECTS` (ask/capabilities.ts) vs `OwnerCapability` (owner-mode/capability.ts). Adjacent domains, separate enums. Consider one capability vocabulary in the 24h.
8. **Circle sprawl x6**: `fyd/ask/fyd-circle.tsx` (thin wrapper over `IntelligentCircle` — fine), `fyd/ui/fyd-circle.tsx` ("the true FYD circle"), `fyd/ui/object-circle.tsx`, `fyd/ui/portal-circle.tsx`, `fyd/ui/home-circles.tsx`, `components/ping/intelligent-circle.tsx`, `components/ping/ping-circle.tsx`. The generic object component is where Nolan's ornate-border rule must be enforced once; the sprawl makes that enforcement N places instead of 1.

---

## 7. MUST-WIN #1 BASELINE: time-to-credible-presence

### Today's manual-work inventory (URL -> credible site, fresh business)

| # | Step | Human / machine | Notes |
|---|------|-----------------|-------|
| 1 | Choose seed URL | **Human** | No code; operator knowledge |
| 2 | Fetch bytes | **Human** (uncommitted external tool, 2026-09-21) | robots.txt + crawl-delay honored manually; redirect chain, statuses, final URL unrecorded (lane A loss #1). `safe-fetch.ts` exists but is NOT wired to the pipeline |
| 3 | Pin bytes to `src/fyd/proceduralize/raw/<site>/` + README provenance table | **Human** | Committed by hand |
| 4 | Run `regen.ts` (uncommitted, `/home/nolan/fyd-proof-run/`) | Human command; **machine** runs pipeline 2x, asserts byte-identical, writes fixtures | `acquire()`/`discover()` dead in this path (lane A) |
| 5 | Add demo/overlay events (`emit-overlay.py`) | **Human** (optional) | |
| 6 | Run `dump.py` (manual `docker exec`; main vs demo journal via env) | Human command; **machine** applies overlays, writes projection + digests | Zero tests (lane A) |
| 7 | Configure `FYD_PROJECTION_DIR`, serve Next.js (`dev`/`build`/`start`) | **Human** | |
| 8 | Verify visually; read validator notes | **Human** | |

**Baseline: ~8 human steps.** Machine-done once the bytes are pinned: extraction, provenance assignment, fixture writing, digest verification, spec generation, validation, rendering. The closest machine path — `POST /api/fyd/onboarding/preview` (paste URL -> fetched preview) — is real and gated (`safeFetchPage`, budgets, rate limits), but it uses the **parallel extractor** (gap §6.1) and **does not feed the site pipeline**.

### Instrumentation inventory (the other must-wins)

| Must-win | Instrumentation | Status |
|----------|-----------------|--------|
| Accuracy | `PipelineReport` (facts by class/source, unsupported, privateWithheld) | **In-memory only, never persisted** (lane F §5) |
| Accuracy | resolve() conflicts | **Unrecorded** — losers silently dropped (lane F §4) |
| Accuracy | per-field provenance / extractor version | **Dropped** in `project()`/dump (lane F §1) |
| Evidence coverage | media manifest observations (ingested/failed/rejected/duplicate per URL) | Exists, strongest surface (lane F §7) |
| Evidence coverage | claim badges (`claimBadgeLabel`) | Rendered on site |
| Evidence coverage | validator findings | Surfaced in `SiteClient` ("Validator notes") |
| Owner corrections | `sourceDrifted` flag | **Data only: zero UI consumers** (grep: no .tsx hits) |
| Mobile UX | 320px-safe widget, 44px targets (design notes in code) | **No measurement** (no web-vitals, no layout/perf marks) |
| Service discoverability | — | **None** |
| Contact/conversion discoverability | `OwnerIntent.conversionPriorities` modeled | **Never populated; no measurement** |
| Performance | — | **None** (no timing, no LCP/CLS, no render budgets) |

---

## 8. NO ADTECH CHECK

**Clean.** No marketing/campaign machinery exists in `src/fyd` (grep for campaign/advertis*/marketing-automation/email-sms-campaign: only hits are the `FORBIDDEN_AGENT_EFFECTS` lists naming `ad.buy` as a never-agent-authorized effect). The only marketing-adjacent shapes are `OwnerIntent.goals/preferredCustomers/conversionPriorities` (modeled, unpopulated). Nothing to keep out of the 24h — there is nothing to exclude.

---

## TOP PRODUCT-LEVEL GAPS (ranked)

1. **No live URL->site path.** B0 is a human with an uncommitted tool; `regen.ts` is uncommitted; `dump.py` is a manual `docker exec`. Must-win #1 is ~8 human steps, and the only machine URL path (anonymous preview) uses a parallel extractor and doesn't feed the pipeline. This is the 24h's critical path.
2. **Three patch IRs, zero convergence.** Ask FYD's typed `site_patch` (the target shape: digest-bound, evidence-reasoned, envelope-signed) is **dead twice over** — no provider registered, no grants issued, no replay consumer. The live human editor speaks a different IR with its own digest law. A visual editor and Ask FYD do not share an IR today. Converge to one: facts + presentation + visibility, one digest, one replay journal (FYD_SITE_OVERLAY), one approval UX.
3. **Ask FYD is a visitor-only keyword Q&A.** No owner mode, no analyze/recommend, no reachable PROPOSE path, missing topic branches (hours, people, projects, media), per-field classification plumbing unfed (`fieldClasses: {}`), and it reasons over the **base** spec while the page renders the **intent-layered** spec.
4. **Owner gate is honest demo scaffolding, not auth.** No production identity; no visibility-decision store; no per-field phone/email hide; the headers themselves demand a separate reviewed auth build. The 24h must not "upgrade" the demo into auth.
5. **Must-win instrumentation is absent.** No persisted coverage/conflict reports, no mobile/perf measurement, no discoverability measurement, `conversionPriorities` unpopulated, `sourceDrifted` unsurfaced. You cannot improve what the pipeline does not record.
6. **Duplicate machinery** (§6): extractor x2, envelope x3, digest x2, binding verifier x2, claim machine x2 (FYD vs PING), sessions x2, capability vocabularies x2, circles x6. Each is a sovereignty violation that makes the 24h's "smallest product layer" bigger than it is.

## WHAT NOT TO BUILD

- **No adtech** — none exists; nothing to carry in.
- **No new claim/evidence authority** — the read seam + render-time verifier already own "no invented claims" (lane F). Fix provenance survival instead.
- **No new acquisition pipeline** — wire the existing `safe-fetch` into the existing `AcquisitionAdapter`; delete or route-through the parallel preview extractor. One extraction truth.
- **No new binding system** — pick `verifyPresentationBinding` or the manifest bindings; one survives.
- **No production auth inside the 24h** — the demo gate's own headers forbid upgrading it; production owner auth is its own reviewed lane.
- **No ActivityPub production wiring** — latent SSRF (lane E T5).
- **No fourth patch IR** — converge the three that exist.
- **No new tenant machinery** — the tenant boundary (`tenant-context`, route-derived identity, `tenant_mismatch` refusal) is the strongest-built part of the product layer; reuse it.
- **No growth/instrumentation scaffolding beyond what the must-wins need** — record coverage/conflicts/corrections as pipeline outputs (they're already computed in memory), don't build a dashboard.
