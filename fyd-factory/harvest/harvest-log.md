# HARVEST LOG - LANE-HARVEST (2026-09-23)

Run context: PING repo /home/nolan/projects/ping, branch fyd-factory, read-only via wsl-run.sh.
Scope: repo outside src/fyd only. No code written, decisions only.
Patch polls: early poll (18:23 MDT) empty, late poll (18:30 MDT) empty. No lane proposals to reconcile this run.

---

## 1. Media fetch/cache

PROBLEM: FYD needs to fetch, cache, and verify media assets (real authorized imagery per the mobile rebuild binding decision) without hotlinking or fabrication.

EXISTING PING IMPLEMENTATION:
- src/lib/media.ts: Media Authority Adapter. KV is the ONLY runtime authority for PublishedMediaAsset; static files are backup/audit projections. Fail-closed (KV null or error means fail, never bypass). No process-global caches. isStaticBuild() degrades only during next build.
- src/lib/media-kv-store.ts: Upstash Redis KV store, environment-namespaced keys (getKvNamespace), rejects synthetic content identity (SHA256(canonicalId) vs actual bytes).
- src/lib/blob-storage.ts: verifyBlobHash, physical blob verification for constitutional proof.
- src/types/media.ts: Media, MediaManifest + type guards isDriveReference, isMaterializingMedia, isPublishedMediaAsset, isStaleMedia.
- src/config/media.v1.json (+ .main.json): static projection for bootstrap/recovery only.
- src/lib/media-contracts.ts, src/lib/media-constants.ts, src/lib/visual-asset-registry.ts: supporting contracts.

REUSABLE?: yes. This is a complete, battle-hardened media authority pipeline matching the FYD media binding requirements (discover, observe, evidence, digest, derivative, binding, projection; deterministic hero selection can layer on top).

DEPENDENCY COST: medium. Needs @upstash/redis + Upstash credentials + blob storage. The fail-closed semantics are intentional; a factory lane adopting this must accept KV as a hard runtime dependency.

TEST STATUS: tested. src/lib/__tests__/media-audit-classification.test.ts, media-authority-route.test.ts exist.

DECISION: use-as-is. The media pipeline already encodes the constitutional constraints FYD needs. Do not rebuild a parallel media cache.

## 2. Evidence/provenance model

PROBLEM: FYD needs a provenance vocabulary for objects and claims (source vs owner vs overlay, evidence refs for Ask FYD answers).

EXISTING PING IMPLEMENTATION:
- src/lib/ping/types.ts: ObjectProvenance { kind: "canonical-journal" | "website-derived" | "overlay-authored", ref, updatedRefs?, derivedAt }. PingRelationship.evidenceRef = canonical event id. OwnerFieldCorrection keeps sourceValue/ownerValue separate with actorLabel, basis, sourceDrifted flag (source vs owner never collapsed). AskEvidenceRef { kind: object|relationship|field, id, label } and AskClaimClassification with evidenceRefIds per claim.
- src/lib/events.ts: EventProvenance { provider, eventType } for idempotency across webhook retries.
- src/components/architecture/replay-evidence.tsx, hero-evidence-card.tsx: display-layer evidence components.

REUSABLE?: yes. The provenance-kind vocabulary plus evidenceRef-as-event-id pattern is exactly the evidence-bounded Ask FYD substrate. OwnerFieldCorrection is the strongest find: it solves the owner-correction-survives-regen problem already.

DEPENDENCY COST: low. Pure types, no runtime deps.

TEST STATUS: covered indirectly via src/lib/ping/__tests__/lane-a.test.ts; no dedicated provenance unit test seen.

DECISION: use-as-is. Adopt ObjectProvenance kinds and the OwnerFieldCorrection pattern verbatim in FYD object types. Flag: overlay-authored kind exists because demo/overlay content must never be classified as source or owner; keep that discipline.

## 3. Object readers

PROBLEM: FYD needs server-side reads of PING objects with sanitization and typed failures.

EXISTING PING IMPLEMENTATION:
- src/lib/ping/ping-object-reader.ts (53KB): server-only BFF adapter. Contract: all reads via PING_GATEWAY_BASE_URL env, UI never sees raw journal shapes, sanitizes public fields, typed errors (PingReaderError, GatewayNotConfiguredError with machine-readable codes), nothing faked when gateway is down.
- src/lib/ping/website-objects.ts: getWebsiteObjects, getWebsiteRelationships.
- src/lib/ping/feed-rank.ts: compareRanked, rankScore.
- src/lib/ping/ask-composer.ts (36KB): buildAskContext, composeAnswer, verifyProposalDigest.
- KNOWN_OBJECT_SCHEMAS + isKnownSchema in src/lib/ping/types.ts (10 schemas: profile, post, business, person, article, project, product, service, location, offer).

REUSABLE?: partial. The reader is the PING website's BFF, not a generic object store. The types, schema registry, ranking helpers, and the typed-error/no-faking contract pattern are reusable. The reader itself is PING-site-specific.

DEPENDENCY COST: low for types/helpers; the reader needs the live PING gateway (Lane D) at runtime.

TEST STATUS: src/lib/ping/__tests__/lane-a.test.ts exists.

DECISION: adapt. Extract the pattern (typed errors, sanitize-at-boundary, schema registry, fail-closed on missing gateway) into FYD's own reader seam; do not import the reader directly since its contract is website-bound.

## 4. Capability model

PROBLEM: FYD needs to decide which actions a viewer/agent may take on an object (mobile actions: Call, Ask FYD, Website only when supported; no dead actions).

EXISTING PING IMPLEMENTATION:
- src/lib/ping/action-planner.ts: planActions(input) is PURE and DETERMINISTIC. Same output drives the human UI action row and the agent context builder. 13 ActionKinds (follow, unfollow, like, unlike, open, open_site, open_website, ask, reference, reply, propose_update, propose_create, propose_site_patch). Rules: follow/unfollow identity-backed only, like/unlike content objects only, propose_update owner-only, open_website only when object carries a URL.
- src/lib/ping/grants.ts: grantsForViewer (deterministic, pure), FydGrant resource-scoped strings, attenuation by default, MAINTAIN_SITE_GRANTS bundle (site.read, site.propose, object.reference), agents NEVER receive publish/message/purchase/advertise/provider/mutate. Explicit warning in the file header not to confuse the user-facing grant authority with the executor CapabilityAuthority.
- src/lib/ping/types.ts: CapabilityPlan { viewerId, targetObjectId, targetSchema, viewerIsOwner, actions, capabilities }, PlannedAction, FydGrant.

REUSABLE?: yes. This is the highest-value find: deterministic capability planning shared between humans and agents is exactly what the mobile rebuild's "no dead actions, no capability without reachable representation" rule needs.

DEPENDENCY COST: low. Pure functions, zero runtime deps.

TEST STATUS: no dedicated action-planner/grants unit test seen; covered only via lane-a.test.ts. Gap worth closing before heavy reuse.

DECISION: use-as-is (types + planner + grants), with a note to add unit tests for planActions rules before the factory leans on them at scale.

## 5. Proposal/approval workflow

PROBLEM: FYD needs agent-drafted proposals with owner approval of the exact digest (post-proof correction loop).

EXISTING PING IMPLEMENTATION:
- src/lib/ping/types.ts: SitePatchPayload { siteId, pageSlug, operations: SitePatchOperation[], siteSpecDigest, affectedObjects, evidenceReason }. SitePatchOperation is a union (reorder_section_objects, set_presentation) where EVERY op carries before AND after. AskProposalBody / SitePatchProposalBody.
- src/lib/ping/ask-composer.ts: verifyProposalDigest.
- src/lib/ping/grants.ts: site.propose never implies site.publish. Agents draft site patches; the owner publishes by approving the exact digest.

REUSABLE?: yes. Digest-bound proposals with before/after per op is a complete approval workflow matching the post-proof correction-loop pattern.

DEPENDENCY COST: low for types; verifyProposalDigest lives in the 36KB ask-composer (heavier import if taken whole).

TEST STATUS: no dedicated digest-verification test seen.

DECISION: adapt. Take SitePatchOperation/SitePatchPayload types and the propose-never-implies-publish rule into the FYD approval seam. Consider extracting verifyProposalDigest into a small standalone module to avoid dragging the full ask-composer in.

## 6. Themes/design tokens

PROBLEM: FYD needs brand-aware palettes and motion consistency (deterministic contrast utility, no literal RGB complement rule).

EXISTING PING IMPLEMENTATION:
- src/app/globals.css: 140 CSS custom properties (--color-primary, --color-honey, --color-ping-violet, --color-ping-gold, --color-ping-ink, --color-accent + hover/foreground variants).
- src/motion/motionTokens.ts: duration, delay, spring tokens ("no hardcoded animation values outside this file").
- src/components/theme-provider.tsx, theme-toggle.tsx: dark/light plumbing.
- src/lib/brand.ts + src/config/brand.v1.json: brand authority.

REUSABLE?: partial. Color tokens and the brand authority are reusable. CAUTION: src/motion/motionTokens.ts imports `MotionTokens` from "@/fyd/sitespec/types", meaning a supposedly shared PING file already depends on the FYD side. That coupling direction is backwards for harvest; reuse the token VALUES, not the file as-is.

DEPENDENCY COST: low (CSS vars are zero-dep); motion tokens carry the FYD import noted above.

TEST STATUS: none seen.

DECISION: adapt. Harvest the CSS token naming convention and brand authority; for motion tokens, copy values into a factory-owned module without the @/fyd import. The deterministic contrast utility itself does not exist yet and still needs to be built (no find for luminance-based foreground selection).

## 7. Shared components

PROBLEM: FYD needs shared UI building blocks (constellation, sheets, cards, error states).

EXISTING PING IMPLEMENTATION:
- src/components/ui/: button.tsx, card.tsx, badge.tsx only (thin; not a full design system).
- src/components/ping/ (10): intelligent-circle, object-preview, action-buttons, ask-ping, post-card, ping-circle, node-sections, identity-selector, selection-bar, bio-editor, test-user-card.
- src/components/architecture/ (10): replay-evidence, hero-evidence-card, system-topology, business-graph, knowledge-loop, tenant-model, multi-runtime, agent-authority, hero-system, system-strip.
- src/components/: section, cta-section, star-rating, icon-registry, service-card, newsletter-signup, site-header, site-footer, component-error-boundary, provider-error-boundary, provider-fallbacks, parallax-image, scroll-reveal, tape-measure-nav, tracked-contact.
- src/components/editor/: editable-slot.tsx.
- src/components/fyd/: exists but is FYD-side, out of harvest scope.

REUSABLE?: partial. component-error-boundary, provider-fallbacks, icon-registry, and the architecture evidence cards are genuinely reusable. The ping/* and marketing components are PING-site-coupled.

DEPENDENCY COST: low to medium; ping/* components assume PING identity/object shapes.

TEST STATUS: none seen for components.

DECISION: adapt. Take error boundaries, provider fallbacks, icon-registry, and the evidence display cards. Do not import ping/* or marketing components into the factory; build factory UI on ui/ primitives plus these.

## 8. Caching

PROBLEM: FYD needs bounded caching for authorities and read models.

EXISTING PING IMPLEMENTATION:
- src/lib/authority-loader.ts: loadAuthority<T> with in-process Map cache keyed by path, clearAuthorityCache, plus findById, sortByOrder, filterFeatured, filterByField. Used generically across media, reviews, projects, brand, navigation, faq, cities, materials, before-after authorities. Constitutional rule in the header: frontend reads projections, these utilities are for admin tools and build-time generation.
- src/lib/media-kv-store.ts: Upstash Redis KV with environment namespacing for durable published-asset cache.
- Note: media.ts explicitly forbids process-global caches for runtime media authority (no cross-request contamination).

REUSABLE?: yes. authority-loader is the generic zero-dep cache; KV store is the durable one. Both patterns are directly applicable to FYD authority/spec caching.

DEPENDENCY COST: low for authority-loader (zero-dep); medium for KV (Upstash).

TEST STATUS: no dedicated authority-loader test seen.

DECISION: use-as-is for authority-loader (add a cache-invalidation unit test; clearAuthorityCache exists but its call sites should be audited). KV store reuse rides with the media pipeline decision in item 1.

## 9. Observability/tracing

PROBLEM: FYD needs structured observability for factory runs (spans, logs, audit trail).

EXISTING PING IMPLEMENTATION:
- NONE FOUND for distributed tracing or structured logging (no OTel, no pino/winston, no tracer).
- Adjacent but different purpose: src/lib/metrics.ts (constitutional content-quality metrics: authority integrity, reference integrity, completeness scores; NOT operational tracing), src/lib/events.ts (HPP event logger, explicitly in-memory MVP, not durable, warns against production use), src/lib/infrastructure/audit.ts (deployment/service health audits for Google Workspace/Vercel/GitHub/OAuth), console.log cache hit/miss lines in authority-loader.

REUSABLE?: no for tracing itself. The audit.ts health-check shape (component, status, layers: configuration/connectivity/capability/health) is a decent pattern for factory run health reporting.

DEPENDENCY COST: n/a.

TEST STATUS: none.

DECISION: skip for tracing (does not exist; build factory observability fresh, do not repurpose metrics.ts). Optionally adapt the InfrastructureAudit shape for lane health reports.

## 10. Search

PROBLEM: FYD needs full-text search over objects/sites (ALL OBJECTS sheet needs search when dense; constellation search).

EXISTING PING IMPLEMENTATION: none found. No lunr/fuse/minisearch/flexsearch/algolia/typesense/elasticsearch anywhere in src/lib, src/components, src/services. The only "search" hits were loose word usage in replay-evidence.tsx and business-graph.tsx.

REUSABLE?: no.

DEPENDENCY COST: n/a.

TEST STATUS: n/a.

DECISION: skip. Factory lanes must bring their own search (recommend evaluating minisearch or fuse for client-side object search; the objects-lab may already have one, check src/app/dev/objects before choosing).

---

## Summary counts

- Items evaluated: 10 (standing list; 0 patch proposals this run)
- use-as-is: 4 (media fetch/cache, evidence/provenance model, capability model, caching/authority-loader)
- adapt: 4 (object readers, proposal/approval workflow, themes/design tokens, shared components)
- skip: 2 (observability/tracing, search)

## 3 highest-value reuse finds

1. Capability model (src/lib/ping/action-planner.ts + grants.ts + types): pure deterministic planActions shared by human UI and agent context, resource-scoped grants with propose-never-implies-publish. Directly satisfies the mobile rebuild's no-dead-actions rule. Zero deps, needs unit tests.
2. Evidence/provenance model (src/lib/ping/types.ts): ObjectProvenance kinds + OwnerFieldCorrection (source/owner never collapsed, drift flag). Solves owner-correction-survives-regen already. Zero deps.
3. Media authority pipeline (src/lib/media.ts + media-kv-store.ts + blob-storage.ts): fail-closed KV authority, synthetic-identity rejection, physical blob verification. Matches FYD's authorized-imagery binding requirements exactly. Medium dep cost (Upstash).

## Notes for other lanes

- Do NOT rebuild: media caching, provenance kinds, capability planning, authority caching. All exist and are logged above.
- CAUTION: src/motion/motionTokens.ts imports from @/fyd/sitespec/types. A shared PING file already reaches into FYD. Any lane touching motion tokens should note this coupling rather than widen it.
- Gaps to build fresh: distributed tracing/structured logging, full-text search, deterministic contrast utility (luminance-based foreground selection).
