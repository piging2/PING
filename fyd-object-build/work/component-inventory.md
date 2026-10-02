# Component Inventory: PING Object Experience Build

Read-only inventory of reusable UI in the FYD Next.js app on the Pig (`/home/nolan/projects/ping/src`, Next.js 15 + React 18 + Tailwind + framer-motion + lucide-react). Inventory date: 2026-09-22.

Target experience: compact identity object in the margin/rail, tap/hover to expand, graph-derived identity/relationships/actions, desktop popover, mobile sheet. Brand: gold/purple; FYD surfaces sit in a small royal purple/gold themed border.

No radix-ui anywhere in `src`. Popovers, sheets, and dialogs are hand-rolled everywhere (CSS class animations, no layoutId shared-element transitions anywhere).

---

## 1. Circle primitives

### 1a. `src/fyd/ui/object-circle.tsx` - ObjectCircle
**Verdict: REUSE-WITH-ADAPTER** (closest to the target interaction pattern; needs theme + relationship rows)

Renders: compact inline reference (logo or initials circle + name + category/location line) -> hover/focus opens a positioned preview card on hover-capable devices; click/Enter/Space anywhere opens a bottom-sheet dialog (fixed overlay, role=dialog, Escape closes, focus returns to trigger, body scroll locked).

Props/data contract:
- `view: ObjectView` (from `src/fyd/object/types.ts`): id, schema, name, category, locationLabel, summary, media[] (role logo|hero|gallery, src, alt), services[] ({id, name, basis, basisLabel, visible}), serviceArea[], contact {phone, email, website, locality, addressVisibility}, capabilities[] (view|ask|follow|like|call|email|website, value-gated), provenance {kind, ref, derivedAt, label}, ownerUpdatedAt, sampleQuestions[], fieldCorrections[]
- `nodeHref?: string` (defaults to `/o/<id>`)
- `className?: string`

Notes: actions render ONLY from `view.capabilities`, missing fields omitted never faked. Motion is CSS-module scale/fade (`object-circle.module.css`), prefers-reduced-motion honored. Theme is stone/amber; adapt to gold/purple. Card shows hero image, logo, name, category, location, top services chips, capability action row, provenance label. No relationship section currently; add via ObjectPreview or RelatedRow.

### 1b. `src/components/ping/intelligent-circle.tsx` - IntelligentCircle
**Verdict: REUSE-WITH-ADAPTER** (identity-flavored; already supports relationships and follow wiring)

Same interaction pattern as ObjectCircle (hover card + bottom-sheet dialog) but for PING identities: fetches `/api/ping/circle?identityId=` on open (or `initialData`), shows avatar, displayName, handle, kind badge, category, description, website, location, provenance label, follower/following counts, relationship context (Follows you, mutual count), Top objects list, Connected networks, Follow/Unfollow/Open/Ask PING buttons.

Props: `identityId`, `initialData?: IntelligentCircleData | null`, `fetchOnOpen`, `onAsk(prefill, objectId)`, `plan?: CapabilityPlan | null` (capability-gated action row), `askLabel`, `nodeHref`, `className`. Contract `IntelligentCircleData` in `src/lib/ping/types.ts`.

### 1c. `src/fyd/ask/fyd-circle.tsx` - FydCircle
**Verdict: REUSE-AS-IS**

Thin wrapper over IntelligentCircle with `askLabel="Ask FYD"` and optional `nodeHref` for the Open action. "The FYD-flavored Intelligent Circle. The portable doorway into an FYD Node." Use this directly when the expansion needs identity + follow wiring rather than ObjectView.

### 1d. `src/fyd/ui/portal-circle.tsx` - PortalCircle
**Verdict: REUSE-WITH-ADAPTER** (harvest motion + capability wiring; expansion shape differs from target)

The portal-grade margin object: 64px rest circle -> 112px aware (hover proximity, spring) -> engaged (expands from exact origin to largest diameter fitting the assigned peripheral slot, clamped 200..480px) -> ask (in-circle conversational state). Perimeter orbit buttons (Follow, Ask, Web, Like, Close) around the engaged circle; evidence affordance (subtle check -> provenance detail on demand); in-circle Ask with evidence-bounded answers ("I do not have evidence for that yet.").

Props: `portal: PortalProjection` ({circle: CircleProjection, logo, preview: PreviewRecord | null, websiteHref}), `slot: PeripheralSlot | null`, `dock?`, `aware`, `engaged`, `onAware/onUnaware/onEngageRequest/onRelease(id)`. CircleProjection: id, name, category, locationLabel, tagline, topFacts[], background (image|gradient with digest proof), capabilities[], provenanceLabel/Detail, sampleQuestions[].

Motion: framer-motion `motion.button` scale spring from `src/motion/motionTokens.ts`, AnimatePresence name-hint, engaged portal via `createPortal` scaling from COLLAPSED_D/d. prefers-reduced-motion fully honored (instant swap). Capabilities via `src/fyd/capabilities/runtime.ts` (hasCapability/executeFollow/executeLike/openWebsite/submitAskCapability).

Caution: expansion is an enlarged circle with orbit controls, NOT a popover card with relationship lists. Take its engaged geometry (`engagedGeometryFor` in `src/fyd/spatial/slot-manager.ts`), motion tokens, and capability runtime; build the card content separately.

### 1e. `src/components/ping/ping-circle.tsx` - PingCircle
**Verdict: REUSE-AS-IS (compact trigger only) / NOT-SUITABLE (as expansion)**

Simple compact/expanded inline toggle card (not popover): avatar initials, name, handle, verified mark, bio, follower counts, `action` slot. Props: `identity: PingIdentitySummary | null`, bio, variant compact|expanded, status ready|loading|error, interactive, action slot. Good compact trigger building block; no sheet/popover.

### 1f. `src/fyd/ui/circle-machine.ts` - circleReducer
**Verdict: REUSE-AS-IS**

Pure deterministic state machine for circle interaction: states collapsed | peek | expanded | ask; events hover/unhover/focus/blur/tap/tapOutside/key/askOpen/askClose/evidenceToggle. Fail-closed (invalid events return identical state). Use to drive the new object experience instead of ad-hoc boolean flags.

---

## 2. ObjectPreview / schema-driven renderers

### 2a. `src/components/ping/object-preview.tsx` - ObjectPreview
**Verdict: REUSE-WITH-ADAPTER**

The ONE composable object-preview renderer: schema label + prominent fields per schema (`SCHEMA_FIELD_CONFIG` for ping.social.* schemas; unknown schemas fall back to graceful generic), details disclosure, relationship context line (counts by predicate), provenance badge (Website/Demo/PING), and capability plan action row via ActionButtons. Props: `object: PingObject`, `relationships?: PingRelationship[]`, `plan?: CapabilityPlan | null`, `onAsk`, `onChanged`, `linked`, `className`.

### 2b. `src/components/ping/node-sections.tsx` - NodeSections / NODE_RENDERERS
**Verdict: REUSE-WITH-ADAPTER** (PING-side /node pages, but the section patterns transfer)

Schema -> section-renderer registry: BusinessNodeSections / PersonNodeSections / GenericNodeSections composing shared sections (Hero, Description, Services, People, Content, SocialClaims, Relationships, RelatedObjects, Metadata, Ask). RelationshipsSection groups active relationships by predicate with links to the other object. RelatedObjectsSection/PeopleSection/ContentSection filter related objects by schema and render ObjectPreview grids. Contract: `NodePayload` {object: PingObject, related: PingObject[], relationships: PingRelationship[], plan: CapabilityPlan, controller}. Harvest the predicate-grouped relationship pattern for the expansion's relationship list.

### 2c. `src/fyd/object/card.tsx` - ObjectCard
**Verdict: REUSE-WITH-ADAPTER**

Portable inline card projection of the same object (name, kind, category, location, evidence-backed summary, top facts, real related objects, capability-gated actions, provenance). Contract: `ObjectProjection` from `src/fyd/object/object-projection.ts`. Composes chrome helpers below.

### 2d. `src/fyd/object/evidence-chrome.tsx` - EvidenceMark, FactRow, RelatedRow, CapabilityActions, InitialsMark
**Verdict: REUSE-AS-IS**

Shared evidence chrome: EvidenceMark (evidence-state pill), FactRow (labeled fact row), RelatedRow (one related object row with evidence state), CapabilityActions (capability-gated action row), InitialsMark (initials circle, sm/lg). Reuse inside expansion relationship lists and the FYD-bordered surface.

### 2e. `src/fyd/components/renderer.tsx` + `src/fyd/components/registry.ts`
**Verdict: NOT-SUITABLE directly** (site-generator machinery); registry is the harvest source for "planner computes ELIGIBLE COMPONENTS deterministically"

Renderer: (SiteSpec + ObjectGraph + ViewerContext) -> UI, resolves queries against the graph, renders registered components; missing data means the section does not render. Registry: 18 component defs with acceptsSchemas, requiredData, capabilities, responsive metadata; ObjectRail def documents "rail-to-drawer, collapseBelow lg, 44px touch targets". Not needed for the object experience itself.

---

## 3. Popover / sheet / dialog primitives

**Verdict: no radix, all hand-rolled. REUSE the proven pattern.**

- ObjectCircle (fyd/ui) and IntelligentCircle both implement the same battle-tested pattern: hover/focus card (`absolute ... z-40`, only on hover-capable devices) + full bottom-sheet dialog on tap/click (`fixed inset-0 z-50`, scrim click-to-close, Escape, focus return to trigger, body scroll lock, sticky close header, 44px targets, aria-modal dialog). Copy this pattern verbatim for the new experience; it satisfies desktop popover + mobile sheet in one component.
- `src/fyd/components/object-rail.tsx` - ObjectRail implements rail aside vs bottom-sheet drawer switch from a token breakpoint (CSS media query switch so SSR/hydration match; open drawer releases when viewport crosses back to rail geometry; Escape closes). Reuse placement law thinking for the margin/rail host; the trigger button pattern is directly reusable for a mobile-only sheet trigger.
- `src/fyd/ui/object-circle.module.css` - the CSS-module enter animations (cardEnter/sheetEnter) for ObjectCircle.

---

## 4. Relationship display components

- `node-sections.tsx` RelationshipsSection: predicate-grouped active relationships, links to other objects. **REUSE-WITH-ADAPTER** (compact variant for the expansion).
- `object-preview.tsx` relationship context line: "3 provides, 1 located_at" style counts. **REUSE-AS-IS**.
- `evidence-chrome.tsx` RelatedRow: single related-object row. **REUSE-AS-IS**.
- IntelligentCircle: Top objects list + Connected networks + relationship context (Follows you, mutual follows). **REUSE-WITH-ADAPTER**.
- For Coppersmith's person/external-identity relationships: PeopleSection pattern (IntelligentCircle for controller + ObjectPreview for person objects) covers it.

---

## 5. Capability/action components

### 5a. `src/components/ping/action-buttons.tsx` - ActionButtons
**Verdict: REUSE-AS-IS**

Renders a CapabilityPlan as buttons: follow/unfollow, like/unlike, open, open_site, open_website, ask, reply, propose_update, propose_site_patch, reference (copy stable id). Follow/like hit `/api/practice/*` BFF; unknown kinds never render (fail closed). Props: `actions: PlannedAction[]`, `onAsk`, `onChanged`, `className`.

### 5b. `src/fyd/ask/circle-actions.ts` - circleUiActions
**Verdict: REUSE-AS-IS**

Pure mapping CapabilityPlan -> CircleUiAction[] for circles (follow/unfollow, open/open_site, ask, propose_site_patch, open_website). like/unlike/reply/reference deliberately excluded from identity cards. Already consumed by IntelligentCircle's GatedActions.

### 5c. `src/fyd/capabilities/runtime.ts`
**Verdict: REUSE-AS-IS**

Capability runtime used by PortalCircle: hasCapability(portal, kind), executeFollow, executeLike, openWebsite, submitAskCapability. Capability-gated, fail-closed.

---

## 6. Media/image handling

- `src/fyd/media/` (server-only pipeline): discover -> ingest (SSRF-safe fetch, digest, rights gate) -> derivatives (sharp, WebP, thumbs, blur variants, constants from `src/lib/media-constants.ts`) -> manifests -> `select.ts` (the ONE display selector every surface uses: Page, Circle, ObjectView). **REUSE-AS-IS** at the server seam.
- `src/fyd/media/circle-background.ts` - resolveCircleBackground: website-photo derivative when authorized, else deterministic gradient fallback; both carry digest + observedAt proof. **REUSE-AS-IS** for compact circle visuals.
- `src/fyd/preview/types.ts` - PreviewRecord {src, thumbSrc, srcSet, focalX, focalY}; `focalToObjectPosition`; `isSafeWebHref` (https-only href validation). **REUSE-AS-IS**.
- `src/fyd/object/types.ts` - ObjectMediaView {id, role (logo|hero|gallery), src, alt, rightsSource, rightsBasis, sourceUrl, digest, observedAt}. LogoMark/initials pattern repeated in every circle.
- PortalCircle prewarms the engaged image on hover proximity (new Image()). **Harvest this.**

---

## 7. framer-motion usage

- `src/fyd/ui/portal-circle.tsx`: the only component with spring-based expansion animation (motion.button scale from token springs, AnimatePresence hint, engaged createPortal scaling from collapsed size). Tokens in `src/motion/motionTokens.ts` (duration, delay, spring presets gentle/bouncy/snappy/smooth/magnetic, easings); additional presets in `src/motion/` (reveal, hero, buttons, cards, hover, stagger, parallax, pageTransition, fade, typography, magnetic, registry).
- **No `layoutId` shared-element transitions exist anywhere.** A true shared-element circle-to-popover morph would be new code; PortalCircle's scale-from-origin engaged animation is the closest existing proof of the pattern.
- ObjectCircle/IntelligentCircle dialogs use CSS-class enter animations, not framer-motion.

---

## 8. /portal-rail route (full read)

`src/app/portal-rail/` is a dev placement harness, unlinked from nav, for the "website canvas + intelligent side rail" spatial primitive.

- `page.tsx` (server): reads query params `business=happy-place|coppersmith-plumbing`, `side=left|right|auto`, `mode=static|sticky`; builds `PortalProjection` via `buildPortalProjection(business)` from `@/fyd/preview/pipeline`; renders `RailClient`.
- `rail-client.tsx` (client): renders ONE PortalCircle in the chosen side rail. `side=auto` resolves via `chooseRailSide(leftFree, rightFree)` from `src/fyd/placement/rail-rule.ts` against measured live margins. `reconcileEngagementOnModeChange` releases engagement when placement mode changes. On-screen metrics readout (viewport, margins, portal box, overlap). **Key directive honored: at or below 719px the rail never renders ("NO BOTTOM PORTAL"; mobile is a separate interaction problem).**
- `fixture.tsx`: fake business page (hero, content, footer) as the host page.
- `metrics.ts`: live geometry measurement into `window.__railMetrics` + on-screen readout.
- Data: `PortalProjection` from `buildPortalProjection`; follow/like state from `/api/fyd/follow`, `/api/fyd/like`.

Relevance: the rail-slot geometry (`src/fyd/spatial/slot-manager.ts` engagedGeometryFor) and the PortalHost mounting machinery (`src/fyd/ui/portal-host.tsx`: slot manager + semantic targets + attention controller) are the placement layer the new experience should sit on. Note current portal-rail is desktop-only by directive; the new object experience must add the mobile sheet path (already solved in ObjectCircle's dialog).

---

## 9. /o/ route (object/node pages)

- `src/app/o/page.tsx`: DEMOTED objects index, unlinked from nav; renders all `ObjectCircle`s from `loadObjectView`/`listObjectIds`. Product primitive is the Circle; this page is the optional-projection lane.
- `src/app/o/[objectId]/page.tsx`: full Object Node page. Server renders from `loadObjectView(objectId)` (`src/fyd/object/view.ts`): SOURCE STATE = PING journal digest-verified projection dump (`src/fyd/data/ping-object-source.ts`), DERIVED = deterministic transforms (area parsing, category mapping), OWNER STATE = durable owner decisions (`src/fyd/object/owner-store.ts`). Page: hero image, category/location, name, summary, capability action row, Services, Service area, About (with WhyThis lineage), Contact (with owner-correction display), Source vs owner corrections, Ask FYD section (`AskObjectPanel`), quiet provenance disclosure. All generic via ObjectView; no business-specific code (HPP and Coppersmith flow through the same components).
- `src/app/o/[objectId]/manage/`: owner control plane (out of scope).

---

## 10. Evidence affordances (priority: usable now)

- `src/fyd/ui/evidence-state.tsx` - EvidenceStateLabel: observed/inferred/unverified/unknown/unavailable/withheld pills with receipt + asOf on hover. **REUSE-AS-IS**.
- `src/fyd/ui/why-this.tsx` - WhyThis: quiet "Why this?" drill-down from any claim to its lineage (object field -> evidence -> observation -> source). **REUSE-AS-IS**.
- `src/fyd/ui/fail-closed.tsx` - FailClosed: ok|unknown|unavailable read states; never renders fake healthy values. **REUSE-AS-IS**.
- Ask surfaces: `src/fyd/ui/ask-object-panel.tsx` - AskObjectPanel (POST /api/fyd/ask, citations + refusal copy) **REUSE-WITH-ADAPTER**; `src/fyd/components/ask-fyd-widget.tsx` - AskFydWidget (theme-token-driven variant) **REUSE-WITH-ADAPTER**; PortalCircle's in-circle ask **REUSE-WITH-ADAPTER**.

---

## Priority recommendation for the object experience build

| Layer | Primary pick | Backup |
|---|---|---|
| Compact circle | FydCircle (identity) / ObjectCircle inline trigger (object view) | PingCircle (simple) |
| Expansion host | ObjectCircle dialog pattern (hover card + bottom-sheet dialog, copy verbatim) | PortalCircle engaged portal + AnimatePresence |
| Interaction state | circleReducer (circle-machine.ts) | n/a |
| Expansion content | ObjectPreview (schema-driven) + RelatedRow lists | ObjectCard |
| Relationships | RelationshipsSection predicate grouping (compacted) + IntelligentCircle context | RelatedRow |
| Actions | ActionButtons (plan) / circleUiActions (circle row) | fyd capabilities runtime |
| Evidence | EvidenceStateLabel + WhyThis + FailClosed | PortalCircle evidence affordance |
| Ask | AskObjectPanel | in-circle ask from PortalCircle |
| Rail placement | slot-manager engagedGeometryFor + rail-rule chooseRailSide + ObjectRail CSS-switch | PortalHost |
| Motion | motionTokens springs + PortalCircle patterns | object-circle.module.css enters |
| Media | select.ts DisplayMedia + circle-background + PreviewRecord focal points | LogoMark/initials |
| Data | ObjectView (loadObjectView) for objects; IntelligentCircleData for identities; PortalProjection for engaged | n/a |

Gaps to build (not invent from nothing): a relationship-list block for the expansion (RelationshipsSection compacted), the gold/purple FYD border treatment on the FYD layer, and desktop popover-vs-mobile-sheet geometry that keeps the target brand's site untouched (the portal-rail slot math plus ObjectCircle's dialog gives both halves; nothing combines them yet).
