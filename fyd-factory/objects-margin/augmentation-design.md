# Objects in the Margins: PING object intelligence as augmentation for the HPP-derived website

Date: 2026-09-23. Status: design only, no repo changes. Branch fyd-factory, read only.

Directive: harvest the good existing PING object machinery AS AUGMENTATION for the HPP-derived website, not as replacement. The HPP-derived site (tenant sites under src/app/sites, e.g. happy-place, coppersmith-plumbing, rendered by SiteClient through the declarative SiteSpec renderer) remains beautiful first. No object-graph UI replaces HPP visual composition.

Binding constraints honored (all verified in the repo on 2026-09-23):
- No customer-facing "All Objects" explorer. The graph is the substrate, never the customer experience.
- No floating chrome on mobile. Static in-flow triggers only; no persistent drawer in primary UX.
- Private objects never cross the public boundary. Tenant pages serialize only the public graph (publicGraph in src/app/sites/happy-place/page.tsx).
- Motion never gates content. Reduced motion collapses decorative motion to instant swaps with full capability.
- Ask FYD is never per-circle/per-object chatbot sprawl: one assistant, context follows attention.

## 1. What exists today (the gap)

The PING homepage (src/app/page.tsx) already mounts the full object plane: MarginObjectLayer with document-anchored rails, PortalHost with aware/engaged circles, the ONE global ask dock, MobileSheet bottom-sheet projections. It also stamps data-object-anchor keys on sections.

The tenant sites (HPP-derived) have none of this. SiteClient renders the SiteSpec pages (home, about, services, explore) from the public graph, and has one object seam already: a click interceptor that turns any /o/<id> link into the ObjectOverlay sheet, restoring scroll on close. But nothing on the tenant site currently links to /o/, so the overlay is dead code in practice. There are no data-object-anchor attributes on tenant sections, and MarginObjectLayer is not mounted there.

The augmentation closes exactly this gap: bring the proven object machinery onto the tenant site as margins and inline depth, without touching HPP composition.

## 2. Machinery harvested (verified reads)

- MarginObjectLayer (src/fyd/ui/object-layer/MarginObjectLayer.tsx): one page-level document-anchored plane, portaled into document.body, height = document height, scrolls WITH the page. Document-space anchor midpoints, deterministic placeObjects, collision resolution, overflow clusters. Responsive: dual rails >=1400px, single rail 1024-1399, compact edge rail 768-1023, mobile <768 customer chrome excluded by binding.
- PortalCircle / ObjectCircle (src/fyd/ui/portal-circle.tsx, object-layer/ObjectCircle.tsx): rest 64px -> aware 112px on hover/focus -> engaged in-slot expansion clamped to the safe rectangle. Host content never occluded by construction.
- PeekCard (src/fyd/ui/object-layer/PeekCard.tsx): compact preview, max ~400px, identity, one-line description (80-140 char budget), 2-4 capability-derived actions, Ask FYD entry with up to 3 contextual suggestions. Never scrolls.
- WorkspaceSheet (src/fyd/ui/object-layer/WorkspaceSheet.tsx): the Ask | Evidence | Contact | Related workspace used by both desktop expansion and the mobile sheet. One component, two spatial projections.
- ObjectOverlay (src/fyd/components/object-overlay.tsx): intercepts /o/ links, opens the node sheet with detail and ask hrefs (/o/<id>, /o/<id>#ask), restores scroll.
- ObjectCard (src/fyd/object/card.tsx): the portable inline projection of the same object Circle and Node project. Embeddable, compact, capability-gated actions, provenance.
- ObjectNode / ObjectView (src/fyd/object/node.tsx, view.ts): the full intelligent object experience: CENTER canonical content plane plus MARGINS context plane (related objects, Ask FYD sample questions, capability-gated actions, provenance). Every margin section omits itself when data is absent.
- Global ask pattern (src/fyd/ui/portal-host.tsx, global-ask-dock.tsx, home-circles.tsx): onAskRequest(id) routes to the ONE assistant with {siteId, objectId} context; context follows the aware-or-engaged object; null when nothing holds attention.
- Boundary: publicGraph() server-side strips private objects and private relationships before SiteClient receives them. Evidence basis labels (direct, derived, generated, owner_authored) and the binding verifier stay underneath as quiet disclosure.
- AskPageContext (object-layer/types.ts): visibleObjectIds + contextObjectId carried into Ask FYD, so the concierge knows what the visitor can see.

## 3. The augmentation map

### Desktop (>=1024px): contextual object rails

Mount MarginObjectLayer on tenant site pages with descriptors built from the already-serialized public graph. Objects anchor to HPP sections, never into them.

Anchor map (anchor key = deterministic section id, pageSlug:component:index, stamped by patch 01):

| HPP section | Object rail content | Why it earns the margin |
|---|---|---|
| home: Hero | none. Owner identity stays document-only. | Hero is the brand moment; object chrome would compete with it. |
| home: BusinessSummary | owner object descriptor (name, category, location, why-here one-liner). | Contextual intelligence about the business itself, in the margin, collapsible by geometry. |
| services: Services | one descriptor per service object, anchored to the services section; overflow merges into clusters by placement. | The highest-value rail: services are what the visitor shops for. Rail carries evidence-backed one-liners + peer jumps; the section keeps its HPP card grid untouched. |
| about: People | person objects. | Team trust: who does the work, beside the team section. |
| about: Locations | location objects. | Coarse public claims (per visibility law); beside the service area section. |
| explore: ObjectFeed/Posts | post/article objects. | Freshness signal without turning the feed into a graph browser. |
| Contact | none as rail. Contact facts stay document (safe-link capabilities already exist); the overlay carries object contact depth on tap. | Contact is a conversion surface; margin chrome would add friction. |

Related objects ride as RelatedObject peer-jump links on expanded cards (kind label + evidence basis hint), so a visitor can walk service -> related business -> person without ever leaving the margin plane. Relationship navigation collapses the current card, scrolls the target slot into view, and opens it (existing expansion.ts bus).

Ask entry: PeekCard's Ask FYD entry calls onAsk; on tenant sites this routes to the ONE global ask with {siteId, objectId} context, reusing the trusted visitor ask path (POST /api/fyd/ask, evidence-bounded, public objects only). No per-object chatbot is created.

### Mobile (<768px): inline depth, zero floating chrome

The margin layer contributes nothing visible on mobile. Depth comes from the document itself:

- Service and person cards in the HPP sections become tappable object cards. The existing SiteClient click interception opens ObjectOverlay (node projection: identity, evidence-backed summary, facts, contact, provenance, related objects) and returns to the exact scroll position. Mobile gets full object intelligence as a sheet, with no drawer, no tab, no floating button.
- The overlay's ask entry (/o/<id>#ask) scopes Ask FYD to that object on the node page. Same one-assistant model.
- AskPageContext still feeds the tenant AskFYD section (visibleObjectIds from the inline cards), so the site-level assistant knows what the visitor saw.

Tablet (768-1023): compact edge rail (40px rest) per the existing layer policy. No mobile drawer in primary UX.

### What the overlay must not do

The overlay stays a sheet with a single object, never a list of objects. It never becomes the All Objects explorer through the back door. Related objects render as peer-jump links, not as a browseable grid.

## 4. Interaction patterns (reused, not invented)

- Discover: rest circles in margins (desktop) or inline cards (mobile). No auto-expansion, no attention theft.
- Engage: hover/focus wakes the rim (desktop); tap opens in place (mobile sheet; PortalCircle already prefers the bottom sheet on narrow viewports over spatial expansion).
- Deepen: expanded card -> peer-jump links, capability actions (call, email, website via safe-link; never raw hrefs), Ask FYD entry.
- Ask: one global assistant, context = the engaged/tapped object; null when nothing holds attention. Fail closed on transport or server failure.
- Exit: close returns to exact scroll position (overlay) or collapses in place (rails).

## 5. What stays out (deliberate exclusions)

1. All Objects explorer, edge tabs, floating buttons, persistent drawers on the customer surface. Binding direction: the graph is the substrate, never the customer experience. The ?objectDebug=1 debug surface stays internal.
2. Follow/like on the tenant customer surface. Follow and like are PING social capabilities, capability-gated on the object node. A business's own website should not pitch PING social chrome to its customers; it dilutes business-first trust. The node (/o/<id>) keeps them; the tenant site links to the node instead.
3. Owner management, owner overlays, structured editor changes. The augmentation is customer-surface only.
4. Private objects in any client payload. publicGraph() stays the boundary; the augmentation never requests the full graph client-side.
5. Object-circle overlays on the Hero or floating over HPP composition. Margins are geometry-decided and peripheral; center content is untouched.
6. Per-object chatbots. One assistant, context follows attention.
7. Ask FYD sample questions on tenant sections. They belong to the node margin plane (/o/), where evidence context is complete, not to the customer site surface.
8. New design language. Stone/zinc/amber substrate, fyd-shell, shared evidence chrome. The augmentation reads HPP theme tokens through the same compiler the renderer uses.

## 6. Integration order and acceptance

Patch 01 (anchors): stamp data-object-anchor on tenant sections in SitePageView. No visual change. Accept: tenant pages render byte-identical DOM except the added attribute; screenshots before/after match.

Patch 02 (layer mount): mount MarginObjectLayer in SiteClient from a TenantObjectMargin wrapper, descriptors from the public graph, layer active only at width >=1024 (tablet edge rail allowed 768-1023; nothing below 768). Accept: desktop shows rails beside anchored sections with scroll-invariant placement; mobile shows nothing; no private object ids in client payloads; reduced-motion users get instant swaps.

Patch 03 (inline cards): service/person section cards link to /o/<id> so the existing interception opens ObjectOverlay on tap. Accept: tapping a service card opens the node sheet with evidence-backed content; close returns to exact scroll; modifier-clicks still open real tabs.

Open risks: the anchor wrapper div can disturb margin-collapsing in section CSS; verify with before/after screenshots of both demo tenants. Descriptor evidence fidelity must be enforced at construction (nulls omitted, never guessed); the MarginObjectDescriptor type already requires this contract.

## 7. Open questions for Nolan (not blocking)

- Should the tenant site expose the node detail link (/o/<id>) as a real navigable page from the overlay, or keep overlay-only on tenant sites? Current design keeps both available (overlay has detailHref).
- Tablet edge rail on tenant sites: keep (harmless 40px) or also suppress? Proposal keeps it, since it is peripheral and non-covering.
