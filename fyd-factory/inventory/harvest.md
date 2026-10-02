# PING harvest report (measured 2026-09-23, branch fyd-factory)

PING substrate = repo code OUTSIDE src/fyd (src/lib, src/services, src/components, src/config). One tight block per commodity need.

## 1. media fetch/cache/provenance

PROBLEM: fetch remote images, cache them, keep provenance of where each asset came from.

EXISTING PING IMPLEMENTATION: `src/lib/media.ts` (loadMediaManifest, getMediaManifest, getProjectMedia, getProjectHero/Thumbnail/BeforeAfter, getProjectMediaByRole, clearMediaCache), `src/lib/media-kv-store.ts` (saveMedia/storeMedia/setMedia), `src/lib/media-contracts.ts`, `src/lib/media-constants.ts`, `src/lib/blob-storage.ts`.

REUSABLE? partial. The PING stack is project/gallery-centric (project media roles, bootstrap manifest); FYD media is object-role-centric with rights classification (`classifyRights`, ACQUIRABLE_RIGHTS) and a pipeline manifest schema (`fyd-media@2`) that PING does not have. Reuse the KV caching + blob storage primitives, not the manifest schema.

DEPENDENCY COST: low (lib-level imports; blob-storage may pull infra config).

TEST STATUS: repo has `test:media-invariant` (`scripts/test-media-invariant.ts`); FYD media has its own committed jest config (src/fyd/media/jest.config.cjs, 7 test files). Not cross-measured in this pass.

DECISION: adapt (cache/blob primitives only).

## 2. evidence/provenance model

PROBLEM: every rendered claim must carry a traceable basis ("no customer fact without a traceable basis").

EXISTING PING IMPLEMENTATION: `ObjectProvenance` / `ObjectProvenanceKind` in `src/lib/ping/types.ts`; `EventProvenance` in `src/lib/events.ts`; `AskEvidenceRef`, `AskClaimClassification` in `src/lib/ping/types.ts`; digest/canonical JSON in `src/lib/ping/ask-composer.ts` (`canonicalize`, `proposalDigest`, `verifyProposalDigest`).

REUSABLE? partial. Provenance kinds/refs and the canonical digest primitive are directly reusable; FYD's binding classification (`direct | derived | generated | owner_authored`, src/fyd/sitespec/graph.ts) and claim layer (ClaimEvidence/Fact) are FYD-specific and stay.

DEPENDENCY COST: low (types + one pure function module).

TEST STATUS: FYD binding verifier has committed tests (src/fyd/sitespec/__tests__/binding-verifier.test.ts). PING-side provenance types not measured in this pass.

DECISION: adapt (import PING provenance kinds; keep FYD claim/binding layer).

## 3. object readers

PROBLEM: authorized read path from PING state into FYD (overlays, journal events) without direct Postgres access.

EXISTING PING IMPLEMENTATION: `src/lib/ping/ping-object-reader.ts` (53 KB): `PingObjectReader` interface, `getPingObjectReader()`, `FydJournalOverlay`, typed errors (GatewayNotConfigured, IdentityNotFound, ObjectNotFound, ...); `PingObject`/`PingRelationship` in `src/lib/ping/types.ts`.

REUSABLE? yes. Already the authorized seam: `src/fyd/data/fyd-tenant-graph.ts` reads exclusively through `queryFydSiteOverlays` (sanitized overlay ops, tenant-filtered at the authority, no fs, no Postgres, no raw journal).

DEPENDENCY COST: medium (gateway-backed; requires ping-gateway configured, but the seam is fail-closed with typed errors).

TEST STATUS: FYD tenant lane has committed tests (src/fyd/tenant/__tests__/a-owner..e-scoped-stores.test.ts). Reader itself has PING-side tests (src/lib/ping/__tests__/).

DECISION: use-as-is.

## 4. capability model

PROBLEM: who may do what to whose object/site (viewer grants, agent effects).

EXISTING PING IMPLEMENTATION: `FydGrant` type in `src/lib/ping/types.ts` (line 291); `src/lib/ping/grants.ts`: `grantsForViewer`, `MAINTAIN_SITE_GRANTS` (site.read/site.propose/object.reference; site.propose never implies site.publish), `isSiteCapableSchema`. FYD mirrors it in `src/fyd/ask/capabilities.ts` (`FORBIDDEN_AGENT_EFFECTS`, `PERMISSION_SETS`, `canAgentAuthorize`).

REUSABLE? yes for the grant vocabulary (single shared `FydGrant` type; grants.ts explicitly warns not to confuse user-facing grants with the PING executor CapabilityAuthority). The follow/like/ask/website execution runtime (`src/fyd/capabilities/runtime.ts`) is FYD-specific and stays.

DEPENDENCY COST: low (type + pure grant functions).

TEST STATUS: FYD ask lane has committed tests (src/fyd/ask/jest.config.cjs). Not cross-measured in this pass.

DECISION: use-as-is (shared FydGrant vocabulary); keep FYD runtime.

## 5. proposal/approval workflow

PROBLEM: draft changes as signed proposals; nothing mutates until the owner approves the exact digest.

EXISTING PING IMPLEMENTATION: `AskProposal` / `SitePatchProposalBody` / `SitePatchEnvelope` / `EnvelopeProof` in `src/lib/ping/types.ts`; digest + verify in `src/lib/ping/ask-composer.ts` (`proposalDigest`, `verifyProposalDigest`, `canonicalize`); `FYD_DEMO`/maintain-site grant bundle in `src/lib/ping/grants.ts`.

REUSABLE? partial. The envelope/digest/signing primitives are shared and already consumed by FYD (`src/fyd/ask/envelope.ts` signEnvelope/verifyEnvelope, `src/fyd/ask/site-patch.ts` sign/verify draft). The approval UX (ReviewCard, customize propose/apply, proceduralize patch) is FYD-specific.

DEPENDENCY COST: low (already imported by FYD).

TEST STATUS: FYD ask lane tests cover envelope round-trip (ask-fyd.test.ts). Not cross-measured in this pass.

DECISION: use-as-is for digest/envelope primitives; adapt workflow surfaces per lane.

## 6. themes/design tokens

PROBLEM: per-site visual identity without hand-authored CSS per customer.

EXISTING PING IMPLEMENTATION: `src/lib/brand.ts` (`loadBrandManifest`, getLogo/getTeamPhotos/getOffice/getMarketingAssets), `src/config/brand.v1.json`, `components.json` (shadcn convention) + Tailwind CSS variables.

REUSABLE? partial. Only conventions transfer (CSS-variable theming). FYD token schema (`FYDThemeTokens`, `DEFAULT_FYD_THEME`, `designIntentFromTheme`, `compileShell`) is deliberately separate and strategy/archetype-driven; merging would couple customer sites to the PING marketing brand.

DEPENDENCY COST: low if limited to variable naming; high if schemas merged (do not merge).

TEST STATUS: not measured in this pass.

DECISION: adapt (align on CSS-variable conventions only); skip schema reuse.

## 7. component library

PROBLEM: prebuilt UI components for site sections.

EXISTING PING IMPLEMENTATION: `src/components/` (~35 files) incl. `src/components/ping/` (ask-ping.tsx, intelligent-circle.tsx, ping-circle.tsx, post-card.tsx, object-preview.tsx, action-buttons.tsx...). `src/components/fyd/` exists but is EMPTY (dir only, no files).

REUSABLE? no for site rendering. FYD sites render exclusively through `src/fyd/components/registry.ts` + `renderer.tsx`; `strategies.ts` validates every strategy's sectionPriority against the registry at module load, so PING components cannot be referenced. Pattern value only: `ask-fyd-widget.tsx` states/citation copy was already harvested into `global-ask-dock.tsx`.

DEPENDENCY COST: n/a (not wired).

TEST STATUS: FYD components lane has committed tests (registry.test.ts, render.test.ts, compose.test.ts).

DECISION: skip for site rendering; adapt patterns case-by-case with a harvest note.

## 8. caching

PROBLEM: avoid re-fetching/re-computing across renders.

EXISTING PING IMPLEMENTATION: `src/lib/media-kv-store.ts` (saveMedia), `src/lib/blob-storage.ts`; ad-hoc caches in registries.ts, tenant-config.ts, navigation.ts.

REUSABLE? partial. KV/blob primitives are reusable for the ingest layer. Render-path caching is deliberately ABSENT in FYD by design: `fyd-tenant-graph.ts` rebuilds fixture + journal on every call ("deliberately no cache: Ask FYD re-reads on every serve"), and `select.ts` re-reads manifests per render. Do not add render caching without invalidating that design decision.

DEPENDENCY COST: low (ingest-only use).

TEST STATUS: not measured in this pass.

DECISION: adapt (ingest layer only); skip render-path caching.

## 9. observability/tracing

PROBLEM: traces/metrics for the build and serve pipeline.

EXISTING PING IMPLEMENTATION: `src/lib/metrics.ts` (`generateMetrics`, ConstitutionalMetrics, AuthorityIntegrityMetrics, MediaMetrics, ...). No distributed tracing found (only a substring match in strings.ts). FYD has no tracing/metrics wiring observed; run evidence lives in ad-hoc notes (`src/fyd/proceduralize/runs/2026-09-21-coppersmith-plumbing/RUN-NOTES.md`).

REUSABLE? partial. Metrics interfaces exist but are unwired to FYD; no trace/span infrastructure exists to reuse.

DEPENDENCY COST: low to adopt interfaces; medium to wire meaningfully.

TEST STATUS: not measured in this pass.

DECISION: skip for now (no tracing to harvest; metrics unwired). Revisit when a lane needs pipeline telemetry; do not invent a new event store (continuity guardrail: PING is the event authority).
