# FYD Website/Product Lane — Ecosystem Harvest (read-only, 2026-10-01)

**Worker:** read-only harvest. No files written except this report. No commits, no pushes, no restarts.
**Scope searched:** all 11 Pig worktrees (`git worktree list` on `/home/nolan/projects/ping`), PING substrate (`/home/nolan/ping` @ `23e15f622`, branch `testing/ladder-2026-09-30`), `~/workspace/fyd-build/src` (lane baseline), `~/workspace` skills/outreach (process patterns only), git history (`git log --all`).
**Prior art NOT redone:** `~/workspace/fyd-harvest/harvest-report.md` + `FYD-HARVEST-AUDIT.md` (2026-09-22/23 ecosystem research: json-render/puck/openpage/webstudio/AI-SDK verdicts, Crawl4AI/Lightpanda acquisition ladder). Those verdicts stand; this report covers what is NEW since or NOT covered there.
**Canonical harvest source:** `/home/nolan/projects/ping-fyd-converged` @ `6405011d` `[fyd/convergence-2026-09-28]`. Most other worktrees are stale snapshots of it (verified via diff: askfyd-gold, wave2-ownerloop, harvest-wt, i07-acquisition differ only in narrow, noted areas). Two worktrees genuinely diverge and are cited separately. `richness.ts` exists ONLY in git history (recoverable).

**Baseline (already in the lane, do not re-harvest):** fyd-build `src/fyd/{acquisition(types,validate-chain), ask(context-builder,answer,visitor,snapshot), claims, evidence, media(safe-fetch SSRF gate,ingest,derivatives,discover,attach), owner(interpret,apply,corrections,store,demo-owner), proceduralize(generator,patch,json-patch,sha256,service-cards), readiness, refresh(types,conflict,dependency-index,diff,snapshot-store,run-t2), regen, sensor, sitespec(types,schemas,validator,graph,render-model,archetypes), ui, visibility, why}`; DTCG token compiler + contrast gate (already wired via `fyd-product-lane/builder/tokens`, `build:tokens` script); the catalog-driven site generator (fyd-build `proceduralize/generator.ts` shares lineage with `ee3091cb`).

---

## Ranked harvest list (highest customer leverage first)

### 1. Live acquisition loop — URL to presence, proven end to end
- **Location:** `/home/nolan/worktrees/fyd-i07-acquisition` @ `556fefd2` `[fyd/i07-acquisition]`, `src/fyd/acquisition/live-loop.ts` (+ `./static-adapter`, `ping-sources.json`, `acquisition/review/`). Also present (older copy) in `ping-fyd-converged` @ `6405011d`.
- **What it does:** First proven live path from a real source URL to a generated FYD presence: DISCOVER (L0 policy gate) → ACQUIRE (L1 static HTTP through the SSRF gate) → UNDERSTAND (`proceduralizer.parseRich`) → RESOLVE (normalize→provenance→resolve→project) → GENERATE (object-builder verify → planner → sitespec validate) → MEDIA (ingest behind one function, demo tenants only); fail-closed typed `LiveAcquisitionError` at every stage, never a silent empty result.
- **Customer problem removed:** *Build presence.* The 2026-09-22 audit's #1 finding was "no live acquisition pipeline" (Happy Place/Coppersmith were hand-fetched, pinned bytes replayed through `regen.ts`). This is the closed loop the product test ("I WANT A URL") needs.
- **Commodity boundary avoided:** Rebuilding a fetch/parse/resolve/generate chain. The loop composes ONLY existing machinery behind the `AcquisitionAdapter` interface (a future Crawl4AI adapter plugs in as an alternate fetcher, not a rewrite).
- **FYD step accelerated:** acquisition → observation (the entire left half of the compiler chain).
- **Integration cost:** ADAPT. fyd-build has `acquisition/types.ts` + `validate-chain.ts` but not the loop, the static adapter, or the typed stage errors.

### 2. Presence compiler — PASTE URL to working tenant, no human bridging
- **Location:** `ping-fyd-converged` @ `6405011d`, `src/fyd/onboarding/{compile-tenant.ts, anonymous-preview.ts, extractor.ts, index.ts}` + `src/fyd/claim/{resource-id.ts, identity.ts, machine.ts, store.ts}`.
- **What it does:** `compileTenant` runs normalize (deterministic tenant id `url-<16hex>` from normalized origin, opaque) → acquire (SSRF-safe fetch, observed-only extractor that never infers; `<script>/<style>` stripped so hostile markup can't plant facts) → compile (deterministic PageEvidence → evidence-backed object graph) → project (projection JSON in the exact contract the PING-side dump produces, so the existing golden route `/build/[siteId]` serves it unchanged). Idempotent per-tenant locks; retries resume from the failed stage, never reacquire blindly.
- **Customer problem removed:** *Build presence / understand business.* Directly attacks must-win #1 (time-to-credible-presence): a business goes from pasted URL to inspectable tenant with zero hand-operated stages.
- **Commodity boundary avoided:** Rebuilding URL→tenant→graph→projection wiring and the "claim this business" identity flow (deterministic resource ids + demo-owner identity bridge with fail-closed null).
- **FYD step accelerated:** acquisition → observation → evidence → object graph (the whole spine in one call).
- **Integration cost:** ADAPT. fyd-build has no onboarding module at all; the projection contract it emits already matches what the lane serves.

### 3. Typed SitePatch staged pipeline — the owner-change compiler
- **Location:** `ping-fyd-converged` @ `6405011d`, `src/fyd/sitepatch/{types.ts, pipeline.ts, approval-seam.ts}` (commits `fdb5d3f3`, `47ea5b26`, `f877c391`).
- **What it does:** 10-op typed `SitePatchOp` vocabulary (MOVE/ADD/REMOVE_SECTION, SET_VISIBILITY, SET_FEATURED_OBJECT, SET_DESIGN_TOKEN, SET_PRESENTATION_COPY, ADD/REMOVE_PAGE, CHANGE_QUERY) run through PATCH → VALIDATE → CAPABILITY → PREVIEW → APPROVAL → EVENT → NEW SPEC VERSION; the approval seam emits proposals in the exact Phase-1 `OwnerProposal` shape (same bytes, same sha256-canonical-json-v1 digest); refusals are typed verdicts, never silent skips; pure and browser-safe.
- **Customer problem removed:** *Change it.* This is the directive's owner-change chain made executable: OWNER INTENT → TYPED SITE PATCH → PREVIEW → POLICY/AUTHORIZATION → PERSISTENT OWNER OVERRIDE → RECOMPILE.
- **Commodity boundary avoided:** Inventing a second patch IR. The pipeline delegates covered ops to the existing `customize/apply-layer` and `proceduralize/patch.ts`; new kinds apply through a pure additive extension (`applyExtendedSitePatch`), never a fork.
- **FYD step accelerated:** owner correction (the entire "PUT THIS FIRST → propose → approve → site changes → refresh persists" loop).
- **Integration cost:** ADAPT. fyd-build has `proceduralize/patch.ts` + `json-patch.ts` but not the staged pipeline, the 10-op vocabulary, or the Phase-1 approval seam adapter. (Binding status: PENDING Phase-1 coordinator acceptance — the adapter mirrors the draft contract.)

### 4. Lane D customize — deterministic intent parsing + idempotent write boundary
- **Location:** `ping-fyd-converged` @ `6405011d`, `src/fyd/customize/{intent.ts, propose.ts, apply-layer.ts, write-boundary.ts, owner-command-compiler.ts, README.md}`.
- **What it does:** Plain English → typed `ParsedIntent` via keyword-anchored regexes (no LLM: "put X first" → `promote_first`, "feature X" → `feature_object`, "hide X" → `hide_section`/`hide_object`, "show X" → `show_section`), resolved against the site's evidence (unresolvable targets return honest `unresolved`, never invented); proposals are digest-bound; the write boundary is idempotent (client `request_id` + server canonical digest; same id + same digest = replay, different digest = 409 CONFLICT; per-site lock; unknown journal outcomes surface as UNKNOWN, never failure).
- **Customer problem removed:** *Change it (safely).* Owner natural-language corrections get a deterministic, evidence-grounded execution path that cannot manufacture facts and cannot double-apply.
- **Commodity boundary avoided:** Rebuilding intent parsing, digest-bound proposals, and crash-safe mutation semantics (the layer law — FACTS never written, PRESENTATION INTENT journaled as `FYD_SITE_OVERLAY` replayed over re-observed base — is frozen and tested).
- **FYD step accelerated:** owner correction; "source changes → customization survives" (overlay replay over rebuilt base).
- **Integration cost:** ADAPT. fyd-build `owner/` has interpret/apply/corrections/store; the delta is the evidence-grounded resolution, the write-boundary idempotency contract, and the overlay-replay layer law.

### 5. Ask FYD trust stack — binding contract, signing envelope, agent capability boundary, visitor-safe fields
- **Location:** `ping-fyd-converged` @ `6405011d`, `src/fyd/ask/{contract.ts, envelope.ts, capabilities.ts, visitor-safe-fields.ts, context-projection.ts, field-conflicts.ts}` (+ `CONTEXT_PROJECTION.md`).
- **What it does:** (a) `contract.ts`: six-input binding contract (QUESTION + CURRENT OBJECT + RELATED SUBGRAPH + EVIDENCE + VIEWER CONTEXT + ALLOWED CAPABILITIES → ANSWER + CLAIMS + EVIDENCE REFS + UNCERTAINTIES + OPTIONAL PROPOSED ACTION) asserted deterministically on every served answer, fail-closed to honest-unknown; (b) `envelope.ts`: Ed25519 signing kit with the payload hash bound into the signed bytes, one pinned serializer (sha256-canonical-json-v1) shared with the proposal digest law; (c) `capabilities.ts`: agent capability boundary — `FORBIDDEN_AGENT_EFFECTS` (`site.publish`, `message.send`, `purchase.make`, `ad.buy`, `provider.call`, `business.mutate`), unknown grants denied; (d) `visitor-safe-fields.ts`: FYD-010 fail-closed allowlist for model context (owner HIDE applied before it; unknown fields dropped).
- **Customer problem removed:** *Agents help safely* + *keep it true.* "I don't have evidence for that" becomes a structural guarantee, not a prompt hope; agents get least-privilege tool boundaries; private fields can't leak into model context by default.
- **Commodity boundary avoided:** Rebuilding answer-contract enforcement, proposal signing, and the privacy gate the FYD-010 release criterion depends on (public viewer must be unable to retrieve private fields, adversarially proven).
- **FYD step accelerated:** ask (evidence-bounded Q&A + refusal) and every future agent/tool surface.
- **Integration cost:** ADAPT. fyd-build `ask/` has context-builder/answer/visitor/snapshot but none of the contract, envelope, capability boundary, or safe-fields modules.

### 6. Incremental recomputation — regen trigger + authorized tenant-graph read seam
- **Location:** `ping-fyd-converged` @ `6405011d`, `src/fyd/projection/regen-trigger.ts` + `src/fyd/data/{fyd-tenant-graph.ts, ping-object-source.ts}`.
- **What it does:** `regen-trigger.ts`: APPROVED CANONICAL CHANGE → AFFECTED PROJECTION INVALIDATED → REBUILD → VERIFY (runs the projection dump for the affected site, verifies the journaled event id landed in the new projection's version vector; atomic tmp+rename; approval stays committed even if regen fails; the served page keeps the previous verified projection until the new file lands whole). `fyd-tenant-graph.ts`: the authorized PING↔FYD read seam — fixture base + journaled overlays composed deterministically with digest verification at both layers, tenant-scoped, no cache (Ask FYD sees a newly journaled overlay on the next question), never reads Postgres or raw journal envelopes. `ping-object-source.ts`: fail-closed projection verification (provenance ref required on every object, graphDigest recomputed and compared).
- **Customer problem removed:** *Keep it true.* "Source changes → FYD notices → customization survives" is machine-checked, not hoped; tampered/stale projections are refused, not rendered.
- **Commodity boundary avoided:** Rebuilding the invalidation→rebuild→verify seam and the governed read path onto PING state (the audit's one net-new backend surface, already built here).
- **FYD step accelerated:** owner correction → recompile; source refresh → affected projections only (not the universe), per the directive's dependency rule.
- **Integration cost:** ADAPT. fyd-build has `refresh/dependency-index.ts` (the "what depends on what" half); this is the "invalidate → rebuild → verify" half.

### 7. Refresh-survival proof — machine-checked owner-intent survival
- **Location:** `/home/nolan/worktrees/fyd-i07-acquisition` @ `556fefd2`, `src/fyd/acquisition/prove-refresh-survival.ts` (+ `review/` artifacts); production path it exercises: `src/fyd/builder/{source-refresh, owner-intent, manifest, planner}`.
- **What it does:** Runs the PRODUCTION refresh path with the pre-rebuild base as current and the rebuild candidate as refreshed, carrying the tenant's owner layer through untouched; asserts `ownerLayerDigestBefore === ownerLayerDigestAfter` and `ownerLayerIntact === true`, exiting non-zero otherwise; records the baseline so a future correction has something to survive against.
- **Customer problem removed:** *Keep it true / change it.* The directive's hardest promise — "source refreshes must not casually erase owner intent; corrections preserve source observation, owner correction, time, authority, current effective presentation" — as a runnable proof, not a design note.
- **Commodity boundary avoided:** Inventing a conflict/survival test harness for the refresh path.
- **FYD step accelerated:** keep-it-true (refresh) and the trust/correctability metric.
- **Integration cost:** ADAPT (script + review-artifact convention; the `builder/source-refresh` path it drives is the piece to port alongside).

### 8. Object module — generic object navigation + consequence UX
- **Location:** `ping-fyd-converged` @ `6405011d`, `src/fyd/object/{related.ts, object-projection.ts, by-id.ts, commands.ts, consequence-classification.ts, consequence-tiers.ts, why-this-steps.ts, owner-overlay.ts, owner-store.ts, owner-events.ts, evidence-chrome.tsx, card.tsx, node.tsx}`. (askfyd-gold's copies are BEHIND converged here — e.g. its `context-compiler.ts` lacks the `owner-asserted` legacy mapping; harvest direction is converged → lane, not the reverse.)
- **What it does:** Generic object projection with SOURCE/OWNER/DERIVED layering (UI renders one generic projection; components differ only because graphs differ); `related.ts`: pure bidirectional relationship walk with deterministic ranking (predicate priority, lexicographic tiebreak) returning honest graph facts only; `commands.ts`: deterministic plain-language → typed `OwnerCommand`; `consequence-classification.ts`: every owner action → LOW/MEDIUM/HIGH/CRITICAL with matching UX friction (inline preview+undo → explicit confirmation → typed authorization → authorization+cooldown+audit receipt), implementing Nolan's "fine-grained internal authority must compile to human-understandable consequence"; `why-this-steps.ts`: generic evidence drill-down (CLAIM → SOURCE → OBSERVED WHEN → EVIDENCE → SUPPORT ∈ DIRECT|DERIVED|OWNER-CONFIRMED), failing closed.
- **Customer problem removed:** *Understand business + change it.* Visitor explores services/people/locations/relationships through one generic navigator; owner sees what a change WILL do before approving it.
- **Commodity boundary avoided:** Rebuilding object navigation, relationship traversal, and the authority→consequence UX compiler.
- **FYD step accelerated:** object graph → site spec; ask ("HOW DO YOU KNOW?" → evidence steps).
- **Integration cost:** ADAPT. fyd-build has `sitespec/graph.ts` and `why/` but not the projection layering, related-walk, commands, or consequence classification.

### 9. Net fetch policy — canonical SSRF gate + crawl budgets
- **Location:** `ping-fyd-converged` @ `6405011d`, `src/fyd/net/{safe-fetch.ts, budgets.ts, rate-limit.ts, index.ts}`.
- **What it does:** The ONE canonical SSRF-safe fetch gate (HTTP/HTTPS only, credential-URL rejection, per-hop DNS resolution rejecting loopback/RFC1918/link-local/multicast/CGNAT + IPv6 transition-encoding decoding to effective IPv4, max-5 redirects each re-validated, content-type allowlist, size limits, timeouts) plus `budgets.ts` (per-generation crawl page/byte budgets, per-origin semaphores, in-flight dedupe + bounded TTL cache) and `rate-limit.ts`.
- **Customer problem removed:** *Build presence (without getting owned).* The audit found five live security exposures around arbitrary customer URLs; this is the closed gate.
- **Commodity boundary avoided:** A fourth competing URL-safety implementation (the audit found three). The module header declares canonical home = `fyd/net`; the media pipeline re-exports it as a shim.
- **FYD step accelerated:** acquisition; media (ingest).
- **Integration cost:** REUSE-AS-IS for `budgets.ts`/`rate-limit.ts` (pure, dependency-free); the gate itself is already mirrored in fyd-build `media/safe-fetch.ts` — harvest the canonical-home pattern (one implementation, re-exported shims) rather than the code.

### 10. Media intelligence — deterministic richness scoring (dormant, git history only)
- **Location:** git history only — `git show 06774159:src/fyd/media/richness.ts` (commit `06774159` "Lane 5: media intelligence v1", on branches `design/lane-05-media`, `codex/ping-parallel-review`; absent from every worktree HEAD).
- **What it does:** Pure deterministic quality scoring over `FydMediaObject` — richness = 0.35·resolution + 0.25·role + 0.20·provenance + 0.10·alt + 0.10·focal — so a composition compiler ranks "which photo carries the page"; same manifest → same scores; companion work in the commit: focal backfill, gallery dimension gate, alt-text backfill.
- **Customer problem removed:** *Build presence.* Generated sites pick the wrong/weak/unsafe image, or ship without alt text (accessibility failure) — the directive's "accessibility = compiler correctness."
- **Commodity boundary avoided:** Rebuilding media scoring/selection heuristics.
- **FYD step accelerated:** media → render (image selection for hero/gallery surfaces).
- **Integration cost:** REUSE-AS-IS (pure module, zero deps) — but it must be re-integrated with tests; it fell out of every HEAD, so treat as dormant code to revive, not a live module.

### 11. Turn-origin authorization tagging — agents can't wear the owner's shape
- **Location:** `/home/nolan/worktrees/fyd-i07-turn-origin` @ `c0dbcd1d` `[fyd/i07-turn-origin]`, `src/fyd/owner-mode/capability.ts` (+ `__tests__/turn-origin.test.ts`). NOT in converged @ `6405011d` (verified absent).
- **What it does:** POLYROB-harvest semantics reimplemented against the FYD seam: the authorization chokepoint (`answerAuthorization`) enforces turn origin BEFORE any capability rule — `genuine_owner` (stamped at the HTTP entry point, never read from client input) vs `delegated` / `wake` / `reentry` / `unknown`; a wake, reentry, delegated, or unknown turn asking for an owner capability is denied the owner path; the origin is stamped on the OwnerEvent and bound into its content-hash ID.
- **Customer problem removed:** *Agents help safely.* Closes the exact hole where a scheduler/self-wake turn or a delegation re-entry silently plants an owner-precedence correction — which is where "owner-correction survival silently breaks."
- **Commodity boundary avoided:** Inventing turn-provenance for authorization.
- **FYD step accelerated:** owner correction (safety of the approval path) and every future agent surface.
- **Integration cost:** ADAPT (port the `TurnOrigin` type + chokepoint ordering into converged/fyd-build `owner-mode/capability.ts`; additive, no state-machine change).

### 12. Rank + spatial slot management — what deserves a slot, where it may live
- **Location:** `ping-fyd-converged` @ `6405011d`, `src/fyd/rank/object-ranker.ts` + `src/fyd/spatial/{object-space.ts, slot-manager.ts, semantic-targets.ts}`.
- **What it does:** `ContextObjectRanker`: pure deterministic ranking (semantic proximity 0.35, followed 0.25, capability count 0.10, recency 0.15, slot stability 0.15; lexicographic tiebreak) — geometry never decides relevance. `slot-manager.ts`: computes SAFE PERIPHERAL RECTANGLES from viewport/content/fixed-UI/safe-area geometry with invalidation-driven recompute. `object-space.ts`: normalized object-space layout (center + satellites from already-gated related refs; never invents nodes, never sees private-visibility services). Encodes the standing presence law: resting presence is PAGE-ANCHORED, never viewport-fixed.
- **Customer problem removed:** *Understand business.* Answers "what deserves the slot" and keeps PING objects feeling like they belong to the page (the object-presence law), not overlays/followers.
- **Commodity boundary avoided:** Rebuilding relevance ranking and presence geometry.
- **FYD step accelerated:** render (slot filling, object presence).
- **Integration cost:** ADAPT (`object-ranker.ts` pure, reuse-as-is; spatial needs the projection types it consumes).

### 13. Edge-object resolution — visibility-gated doorway into the graph
- **Location:** `ping-fyd-converged` @ `6405011d`, `src/fyd/edge/{resolve.ts, types.ts, client.ts}`.
- **What it does:** Pure, deterministic, browser-safe pipeline: (graph, objectId, viewer) → public visibility gate (the same rule site pages use) → resolve target → group active outgoing edges by predicate → capability-intersected sheet actions → claim classification (DIRECT_FACT / DERIVED_FACT / OWNER_AUTHORED / GENERATED_COPY). Invariant: an edge object is not rendered until it provides a functional doorway into the authorized business graph; absent/invisible targets 404 indistinguishably from unknown.
- **Customer problem removed:** *Understand business / connect world.* Small client islands (Ask FYD, object interactions) get a safe, functional entry into the business graph instead of decorative widgets.
- **Commodity boundary avoided:** Rebuilding the visibility-gated object-sheet pipeline for edge surfaces.
- **FYD step accelerated:** render (client islands) → ask.
- **Integration cost:** REUSE-AS-IS (pure, browser-safe, no DOM/network/secrets).

### 14. Data-derived visual identity — no hand theming per site
- **Location:** `ping-fyd-converged` @ `6405011d`, `src/fyd/presence/derive-presence.ts` (+ `presence-band.tsx`).
- **What it does:** The entire per-site visual identity as a pure function of (object graph, media manifest): photographic hero vs typographic brand band, ingested logo or nothing, gallery strip or nothing, accent color + button radius from a stable hash of the owner object's graph identity selecting from ONE shared palette. Different data selects differently, same data selects identically, forever.
- **Customer problem removed:** *Build presence (at scale).* Two generated businesses look materially different because their source material differs, not because anyone hand-designed a theme per site.
- **Commodity boundary avoided:** Rebuilding per-site theming; prevents the "every generated site looks identical" failure.
- **FYD step accelerated:** render (site identity pass).
- **Integration cost:** ADAPT (consumes the object projection + media manifest types).

### 15. PING MCP server — the agent/tool interface pattern
- **Location:** `/home/nolan/ping` @ `23e15f622` (branch `testing/ladder-2026-09-30`), `mcp/ping_mcp_server.py` (215 lines) + `AGENT_ACCESS_LAYER.md`, `MCP_CERTIFICATION.md`.
- **What it does:** MCP tool server over governed reads: `search_constitution`, `get_constitution_doc`, `search_constitutional_memory`, `search_memory`, `recent_events`, `event_summary`, `lineage_lookup`, `continuity_status`, `replay_status`. Constitutional law: agents touch memory through MCP ONLY — no direct Qdrant/Postgres/Vault.
- **Customer problem removed:** *Connect world / agents help safely.* The directive's "same verified graph later compiles to ... MCP tools" — this is the proven shape: tools as governed projections, never direct store access.
- **Commodity boundary avoided:** Inventing an agent-access layer; the capability↔adapter↔tools pattern (harvest directive: MCP stateless core + Tasks extension, never canonical truth).
- **FYD step accelerated:** connect world (future: SitePatch-constrained FYD tools, e.g. propose-patch, answer-with-evidence).
- **Integration cost:** REFERENCE-ONLY. Do not port the PING server; FYD tools must be built on FYD's own grant boundary (`ask/capabilities.ts`, #5) with SitePatch-typed mutations only.

### 16. Process patterns — deterministic eligibility + autonomous-loop machinery (reference only)
- **Locations:** `~/workspace/outreach/engagement-guard.py` (function `eligibility_check()`); `~/workspace/skills/social-interdependence/{threads,instagram}/SKILL.md`; `~/workspace/askfyd/` (cassette test harness: `baseline.ts`, `cassette-compare.sh`).
- **What they are:** `engagement-guard.py`: ONE deterministic eligibility function — candidate + action + campaign + history + suppression + corridor + capability → ELIGIBLE / INELIGIBLE / UNKNOWN + reason codes; UNKNOWN = do not dispatch; precedence-ordered; tamper-evident envelopes at plan time, live re-evaluation at dispatch. The skills: machine-enforced autonomy envelope — deterministic eligibility authority, durable intents, budgeted dispatch, leases, read-after-write verification, reconcile-not-replay recovery, circuit breakers, safe mode; UNKNOWN never dispatches. `askfyd/`: cassette-based Ask FYD regression harness.
- **Customer problem removed:** *Agents help safely.* The exact decision discipline Ask FYD's agent surfaces need: classify before acting, budget the blast radius, verify after writing, never replay mutations.
- **Commodity boundary avoided:** Rebuilding the eligibility→budget→verify→reconcile loop for agent actions; rebuilding an Ask FYD regression harness.
- **FYD step accelerated:** ask (agent action gating maps 1:1 onto `ask/capabilities.ts` grants + `object/consequence-classification.ts` tiers); owner correction (durable intents + read-after-write verification for patch dispatch).
- **Integration cost:** REFERENCE-ONLY (process patterns, not product code — per task scope).

---

## Notes and cautions

- **Direction of harvest:** converged @ `6405011d` is NEWER than askfyd-gold @ `475f1dbb` on the examined hunks (e.g. `ask/context-compiler.ts` owner-asserted legacy mapping). Harvest flows converged → lane; do not backport worktree copies blindly.
- **Approval-seam binding is PENDING** (#3): the adapter mirrors the Phase-1 `OwnerProposal` draft contract; binding is confirmed only when the Phase-1 coordinator accepts proposals through it. Until then, emitted records are marked `seam: "trackc-sitepatch/pending-phase1-binding"`.
- **No new authorities proposed.** Every candidate above consumes existing authority boundaries (evidence/object authority, Phase-1 approval gate, owner-mode capability gate); several headers explicitly forbid duplicating them.
- **Accessibility status:** partially covered — contrast gate (adopted), `touchTargetMinPx` registry metadata, alt-text backfill (dormant, #10), richness alt component rewards source alt. No full keyboard/focus/ARIA audit found in the registry; that remains a gap, not a harvest.
- **Local-first state:** the closest existing machinery is `customize/write-boundary.ts` idempotency (#4) and `refresh/snapshot-store.ts` (in fyd-build). No CRDT/sync engine found; none proposed (FYD has a no-CRDT rule).
- **MarketingOS:** parked per task; not summarized.
- **Nothing sensitive was exposed to free models:** all review was direct reads of repo code; no secrets, credentials, or private customer data appear in the cited modules.

---

## Top 5 (by customer leverage)

1. **Live acquisition loop** (`fyd-i07-acquisition` @ `556fefd2`, `src/fyd/acquisition/live-loop.ts`) — closes the audit's #1 finding: no live pipeline exists. ADAPT.
2. **Presence compiler** (converged @ `6405011d`, `src/fyd/onboarding/compile-tenant.ts` + `src/fyd/claim/`) — PASTE URL → working tenant, the must-win #1 machine. ADAPT.
3. **Typed SitePatch staged pipeline** (converged @ `6405011d`, `src/fyd/sitepatch/`) — the owner-change compiler the directive specifies; 10 ops, digest-bound, Phase-1 approval seam. ADAPT.
4. **Ask FYD trust stack** (converged @ `6405011d`, `src/fyd/ask/{contract,envelope,capabilities,visitor-safe-fields}.ts`) — evidence-bounded answers with refusal, signing, agent capability boundary, FYD-010 privacy gate. ADAPT.
5. **Lane D customize** (converged @ `6405011d`, `src/fyd/customize/`) — deterministic "PUT THIS FIRST" → typed intent → digest-bound proposal → idempotent write; the overlay-replay layer law that makes refresh survival possible. ADAPT.

## Single strongest recommendation

**Port the live acquisition loop (#1) together with the presence compiler (#2) as one bounded unit, before any more render work.** The lane's own audit (2026-09-22) proved the acquisition problem is a *pipeline-existence* problem, not a crawler-quality problem — and Track F (2026-09-25) already built the proven loop and the PASTE-URL→tenant compiler in the `fyd/i07-acquisition` lineage. Every downstream investment the directive names (object graph quality, understanding accuracy, trust/correctability, the "I WANT A URL" product test) is gated on real bytes entering the pipeline instead of hand-pinned fixtures. The loop is already fail-closed, SSRF-gated, adapter-shaped (Crawl4AI plugs in later without a rewrite), and its output contract matches the lane's existing golden route — so it lands as composition, not architecture. Suggested falsification-first order: run `live-loop.ts` against the two product-test businesses' real URLs, diff the produced graph against the pinned fixtures, and let the first broken stage (discover/acquire/understand/resolve/generate) name the next smallest correction.
