/**
 * FYD SiteSpec: the declarative product of the generative object-site compiler.
 *
 * Law: the spec is DATA, never generated JSX. The renderer turns
 * (SiteSpec + ObjectGraph + ViewerContext) into UI. A spec is portable,
 * diffable, validatable, and deterministic: the same graph always yields
 * the same spec.
 *
 * Shape harvested from src/lib/website-structure.ts (Route -> Page ->
 * Section -> Component) and generalized: pages hold sections, sections name
 * a registered component and declare HOW to fetch their objects (query),
 * never the objects themselves.
 */

import type { PingObject, PingRelationship } from "@/lib/ping/types";
import type { FYDSchemaRole } from "./schemas";

/** The graph the generator reasons over: browser-safe objects plus relationships. */
export interface ObjectGraph {
  objects: PingObject[];
  relationships: PingRelationship[];
}

/** Who is viewing the rendered site. Kept minimal on purpose. */
export interface ViewerContext {
  viewerId: string | null;
  displayName: string | null;
}

/** How a section resolves its objects from the graph. Deterministic. */
export type FYDQuery =
  | { kind: "owner" }
  | {
      kind: "related";
      from: string;
      /** Primary predicate, human-readable. */
      predicate: string;
      /**
       * Full predicate match set in canonical order. Resolution matches any
       * of these, so one query compiles both the social vocabulary
       * (provides) and the knowledge vocabulary (offers). Defaults to
       * [predicate] when absent.
       */
      predicates?: string[];
      /**
       * Inverse predicate match set in canonical order. Resolution matches
       * relationships whose OBJECT is `from` and whose predicate is one of
       * these (e.g. a person works_for the business: the edge runs
       * person -> business, but the role membership is the business's
       * team). The resolved object is the edge's subject. Optional; absent
       * means no inverse matching. Added for the planner causality fix
       * (2026-09-23): the proceduralizer emits schema.org inverses
       * (works_for, provided_by, published_by) that the forward-only
       * predicate set could never match, leaving real relationships
       * invisible to composition.
       */
      inversePredicates?: string[];
      schema?: string;
      schemas?: string[];
      limit?: number;
    }
  | { kind: "all"; schema?: string; schemas?: string[]; limit?: number }
  | { kind: "reference"; objectIds: string[] }
  | { kind: "static" };

/** Presentation overrides. Copy edits arrive here as PROPOSED changes only. */
export interface FYDPresentation {
  heading?: string;
  copy?: string;
  featuredIds?: string[];
  hidden?: boolean;
}

export interface FYDSection {
  /** Deterministic id: pageSlug + ":" + component + ":" + index. */
  id: string;
  /** Component registry name, e.g. "Hero", "Services". */
  component: string;
  query: FYDQuery;
  presentation: FYDPresentation;
  /**
   * V1 intent-only composition (fyd-builder-v1, additive, optional).
   * Semantic presentation intent: job, variant, bindings, responsive
   * intent. Never CSS, class strings, JSX, or executable code.
   */
  composition?: FYDSectionComposition;
}

export interface FYDPage {
  /** URL slug, e.g. "home", "about", "services", "explore". */
  slug: string;
  title: string;
  navLabel: string;
  sections: FYDSection[];
  /**
   * V1 headline intent (additive, optional). The H1 is editorial
   * identity copy, never the legal business name by default.
   */
  headlineIntent?: FYDPageHeadlineIntent;
}

export interface FYDNavItem {
  label: string;
  pageSlug: string;
}

/**
 * Basic design tokens. Structured values only, no drag and drop.
 * Tokens re-skin the whole generated site without touching the spec.
 *
 * v1 fields (accent, accentForeground, surface, ink, radius, fontDisplay,
 * fontBody) are frozen. The builder composition lane (fyd/builder-composition)
 * extends the set additively; every new group is optional so specs written
 * before this change validate and render unchanged.
 */
export interface FYDTypeScale {
  /** Base font size in px. */
  base: number;
  /** Modular ratio between type steps. */
  ratio: number;
}

/** Spacing scale in px, named steps. */
export interface FYDSpacingScale {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

/** Extended color roles beyond the v1 accent/surface/ink triple. */
export interface FYDColorSystem {
  muted?: string;
  border?: string;
  success?: string;
  warning?: string;
  danger?: string;
}

/** Surface variants for cards, sheets, overlays. */
export interface FYDSurfaces {
  card?: string;
  overlay?: string;
  sheet?: string;
}

/** Shadow tokens. */
export interface FYDShadows {
  sm?: string;
  md?: string;
  lg?: string;
}

/** Layout tokens: content measure and rail width. */
export interface FYDLayoutTokens {
  /** Max content width in px. */
  contentMaxWidth?: number;
  /** Rail width in px on wide viewports. */
  railWidth?: number;
}

/**
 * Named viewport breakpoints in px. Placement geometry reads these through
 * resolveCollapseBreakpoint; no placement logic hardcodes px.
 */
export interface FYDBreakpoints {
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

/** Media treatment tokens. */
export interface FYDMediaTokens {
  treatment?: "documentary" | "polished" | "schematic";
  aspectRatio?: string;
}

/** Motion tokens: durations in ms; reduced-motion disables animation. */
export interface FYDMotionTokens {
  durationMs?: number;
  easing?: string;
}

/**
 * CANONICAL MOTION PROFILE (Nolan, 2026-09-22 FYD grill, BINDING).
 *
 * The one shared motion type the whole design system uses. The compose
 * lane imports this definition; the shape below is the contract:
 * - motionIntensity: NONE collapses decorative motion (the
 *   reduced-motion equivalent: nothing depends on animation);
 *   SUBTLE is the default product motion (quiet, quick, no theater);
 *   EXPRESSIVE is reserved for hero/celebration moments.
 * - entrance: how a surface first appears (FADE_RISE, REVEAL, SCALE).
 * - objectTransition: how the Circle becomes the card and the card
 *   becomes Ask FYD (MORPH = shared-identity transform; CROSSFADE =
 *   the reduced-motion-safe swap).
 * - stagger: sequencing of grouped children (action grids, suggestion
 *   chips): NONE, TIGHT, RELAXED.
 */
export interface MotionTokens {
  motionIntensity: "NONE" | "SUBTLE" | "EXPRESSIVE";
  entrance: "FADE_RISE" | "REVEAL" | "SCALE";
  objectTransition: "MORPH" | "CROSSFADE";
  stagger: "NONE" | "TIGHT" | "RELAXED";
}

/**
 * Layout character: a PRESENTATION hint, never business truth. Chosen by
 * the composing strategy/archetype and stamped onto the spec's theme
 * tokens (SiteSpec), owner-overridable through the normal token-override
 * path. The same components read it; no fact ever changes with it.
 */
export type FYDLayoutCharacter =
  | "EDITORIAL"
  | "CRAFT"
  | "TECHNICAL"
  | "RETAIL"
  | "PROFESSIONAL"
  | "CREATOR";

/**
 * ViewportCapabilities: the device's composition-relevant capabilities.
 *
 * ONE SEMANTIC SITESPEC (mobile architecture, binding): the renderer never
 * branches on a DesktopSiteSpec/MobileSiteSpec. Composition inputs are
 * SiteSpec + ObjectGraph + ViewerContext + ViewportCapabilities, and the
 * SAME object projects differently per device: a Service is a rich
 * horizontal card on desktop, a compact object tile on mobile.
 *
 * SSR honesty: the server cannot know the viewport, so the server renders
 * the compact (mobile-first) baseline and the client provider
 * (fyd/components/viewport.tsx) resolves the real capabilities after
 * mount. Layout projection is CSS-driven from the data-viewport /
 * data-pointer attributes the provider stamps on <html> (no hydration
 * mismatch: the DOM is identical, only the projection changes);
 * ViewportCapabilities in JS is for BEHAVIORAL choices (touch-first
 * interactions, rails vs grids, sticky actions).
 *
 * Width classes: xs <480, sm 480-767, md 768-1023, lg 1024-1439, xl 1440+.
 * The CSS breakpoints in the renderer use the same cut points.
 */
export type ViewportWidthClass = "xs" | "sm" | "md" | "lg" | "xl";

export interface ViewportCapabilities {
  widthClass: ViewportWidthClass;
  /** Coarse (touch) or fine (mouse/trackpad) primary pointer. */
  pointer: "coarse" | "fine";
  /** Whether the primary input can hover. Never gate functionality on it. */
  hover: boolean;
  /** Viewer asked for reduced motion (or intensity NONE was composed). */
  reducedMotion: boolean;
  /** CSS safe-area insets in px; zeros where unsupported/unknown. */
  safeArea: { top: number; right: number; bottom: number; left: number };
}

/**
 * DESIGN SYSTEM COMPILER (mobile architecture, binding): semantic design
 * intent lives on the SiteSpec; a deterministic token map compiles it to
 * presentation. The LLM/agent proposes INTENT patches (density, radius,
 * type scale, spacing rhythm, surface depth, motion intensity, media
 * treatment, content width, object emphasis); the owner approves; the
 * compiler renders. No arbitrary CSS generation, ever.
 *
 * layoutCharacter is the seed of this compiler: strategy/archetype picks
 * the character, tokenOverrides let the owner adjust, and
 * CHARACTER_PRESENTATION (renderer) is the deterministic map. The fields
 * below grow the seed toward full intent without changing the mechanism.
 */
export interface FYDDesignIntent {
  /** Content density: compact tiles vs comfortable cards. */
  density?: "compact" | "comfortable";
  /** Max content width in px for the center column. */
  contentWidthPx?: number;
  /** Media treatment: contained cards vs edge-to-edge moments on mobile. */
  mediaTreatment?: "contained" | "edge-to-edge";
  /** How hard objects push for attention in the composition. */
  objectEmphasis?: "quiet" | "balanced" | "prominent";
}

export interface FYDThemeTokens {
  accent: string;
  accentForeground: string;
  surface: string;
  ink: string;
  radius: "none" | "sm" | "md" | "lg" | "full";
  fontDisplay: string;
  fontBody: string;
  typography?: FYDTypeScale;
  spacing?: FYDSpacingScale;
  colors?: FYDColorSystem;
  surfaces?: FYDSurfaces;
  shadows?: FYDShadows;
  layout?: FYDLayoutTokens;
  breakpoints?: FYDBreakpoints;
  media?: FYDMediaTokens;
  motion?: FYDMotionTokens;
  /**
   * Presentation character hint (strategy-chosen, owner-overridable).
   * Changes presentation tokens only, never facts.
   */
  layoutCharacter?: FYDLayoutCharacter;
  /**
   * Motion semantics for the customer surface. SiteSpec chooses the
   * semantics; the renderer owns the implementation. Absent: restrained
   * defaults (SUBTLE / FADE_RISE / MORPH / TIGHT), always collapsed by
   * prefers-reduced-motion.
   */
  motionTokens?: MotionTokens;
  /**
   * Semantic design intent for the design-system compiler (mobile
   * architecture). Optional and additive: absent intent falls back to
   * the layoutCharacter presentation map. Owner-overridable through the
   * normal token-override path.
   */
  designIntent?: FYDDesignIntent;
}

export const DEFAULT_FYD_THEME: FYDThemeTokens = {
  accent: "#C9A227",
  accentForeground: "#1c1917",
  surface: "#FFFFFF",
  ink: "#232033",
  radius: "md",
  fontDisplay: "Playfair Display, Georgia, serif",
  fontBody: "Geist, system-ui, sans-serif",
};

/** Where the spec's claims come from. Website claims are never verified fact. */
export interface FYDSpecProvenance {
  source: "website-ingestion";
  claimKind: "website_statement";
  /** Acceptance-sequence window of the ingestion events, when known. */
  eventSequences?: [number, number];
  note: string;
}

export interface FYDSiteSpec {
  kind: "fyd.sitespec@1";
  /** The business (or root) object this site is generated for. */
  ownerObjectId: string;
  version: 1;
  generator: {
    name: "fyd-site-generator";
    version: string;
    generatedAt: string;
  };
  themeTokens: FYDThemeTokens;
  navigation: FYDNavItem[];
  pages: FYDPage[];
  provenance: FYDSpecProvenance;
  /**
   * Builder composition extensions (all optional, backward compatible):
   * status/revision: draft-vs-published lifecycle with bounded revision
   * history; archetype: which composition profile composed this spec;
   * objectPresence: the generic margin/rail layout capability.
   */
  status?: FYDSpecStatus;
  revision?: number;
  archetype?: FYDSiteArchetype;
  objectPresence?: ObjectPresence;
  /**
   * V1 intent-only extensions (fyd-builder-v1, additive, optional):
   * designTokens: theme referenced BY NAME from the compiled token
   * registry (never token values inline); ctaHierarchy: the ranked
   * conversion actions plus the placement map; sourceDesignSignal:
   * NON-CANONICAL presentation observations, explicitly marked
   * signal-not-authority.
   */
  designTokens?: FYDDesignTokenRef;
  ctaHierarchy?: FYDCTASection;
  sourceDesignSignal?: FYDSourceDesignSignal;
}

/** A typed validation finding. Shape harvested from src/lib/findings.ts. */
export interface FYDFinding {
  severity: "error" | "warning" | "info";
  authority: "fyd.sitespec.validator";
  resourceId: string;
  path: string;
  message: string;
}

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Builder composition extensions (fyd/builder-composition, 2026-09-21).
// Additive and optional: pre-existing specs validate and render unchanged.
// ---------------------------------------------------------------------------

/** Lifecycle of a generated spec: operator-authored draft vs published. */
export type FYDSpecStatus = "draft" | "published";

/** Which composition profile composed this spec. */
export type FYDSiteArchetype = "KNOWLEDGE" | "TRADES" | "TECHNICAL_ENTERPRISE";

/** ObjectPresence mode: explicit placement or geometry-decided. */
export type ObjectPresenceMode = "auto" | "rail" | "drawer" | "hidden";

/**
 * ObjectPresence: the generic margin/rail layout capability.
 *
 * Placement law: center = canonical customer content, untouched. Margins =
 * contextual intelligence when safe space exists. Narrow viewports collapse
 * the rail to a drawer/sheet, never displacing content. In "auto" mode the
 * rail-vs-drawer decision comes from geometry: the collapseBelow breakpoint
 * key is resolved through the spec theme tokens via resolveCollapseBreakpoint.
 */
export interface ObjectPresence {
  mode: ObjectPresenceMode;
  /** Contextual object ids eligible for the margin/rail, deterministic order. */
  objects: string[];
  rules: {
    /** Breakpoint key (see FYDBreakpoints); the rail collapses to a drawer below it. */
    collapseBelow: string;
  };
}

/** Default breakpoint table when a spec theme tokens carry none. */
export const DEFAULT_FYD_BREAKPOINTS: FYDBreakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

/**
 * Resolve a collapseBelow breakpoint key to px. Unknown keys fail closed to
 * the "lg" default (1024): the rail still collapses, at standard geometry.
 * Never throws.
 */
export function resolveCollapseBreakpoint(theme: FYDThemeTokens, key: string): number {
  const table = theme.breakpoints ?? DEFAULT_FYD_BREAKPOINTS;
  const v: number | undefined =
    key === "sm" ? table.sm
    : key === "md" ? table.md
    : key === "lg" ? table.lg
    : key === "xl" ? table.xl
    : undefined;
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : DEFAULT_FYD_BREAKPOINTS.lg;
}
/**
 * FYD Builder V1 intent-only SiteSpec extensions (2026-09-25).
 *
 * INTENT-ONLY LAW (rebuild authorization, non-negotiable): nothing in a
 * SiteSpec is a Tailwind class string, raw JSX, arbitrary CSS, or
 * generated executable code. SiteSpec is semantic presentation intent
 * (data); the renderer owns implementation. validateIntentExtensions()
 * in validator.ts enforces this; intent-guards.ts holds the scanners.
 *
 * Everything below is additive and optional: specs written before these
 * fields existed validate and render unchanged.
 */

// ---------------------------------------------------------------------------
// V1 family registry vocabulary (family-spec, locked).
// ---------------------------------------------------------------------------

/** The customer-facing job every V1 section must declare. */
export type FYDSectionJob =
  | "persuade"
  | "prove"
  | "convert"
  | "reassure"
  | "serve"
  | "close";

/** V1 family registry component names (family-spec, locked, 11 entries). */
export const V1_FAMILY_COMPONENTS = [
  "Navigation",
  "Hero",
  "TrustBar",
  "ServiceGrid",
  "FeaturedService",
  "ProjectGallery",
  "BusinessStory",
  "ServiceArea",
  "ContactCTA",
  "Footer",
  "AskFYD-entry",
] as const;

export type V1FamilyComponent = (typeof V1_FAMILY_COMPONENTS)[number];

/** True for the 11 locked V1 registry names. */
export function isV1FamilyComponent(name: string): name is V1FamilyComponent {
  return (V1_FAMILY_COMPONENTS as readonly string[]).includes(name);
}

/** Variant vocabulary per V1 component (family-spec; every variant has a job). */
export const V1_COMPONENT_VARIANTS: Record<V1FamilyComponent, readonly string[]> = {
  Navigation: ["taxonomic", "minimal"],
  Hero: ["media-rich", "identity-led", "service-led", "local-action"],
  TrustBar: ["metrics-strip", "testimonial-cluster"],
  ServiceGrid: ["cards", "featured-plus-grid", "media-grid"],
  FeaturedService: ["media-lead", "scope-lead"],
  ProjectGallery: ["masonry", "editorial", "carousel"],
  BusinessStory: ["founder-led", "team-grid"],
  ServiceArea: ["area-list", "hub-address"],
  ContactCTA: ["conversion-dual", "value-capture"],
  Footer: ["credibility", "credibility-plus-capture"],
  "AskFYD-entry": ["floating-entry", "inline-section"],
};

/** Bounded media role vocabulary (family-spec). Planner and media scoring use exactly these. */
export const V1_MEDIA_ROLES = [
  "logo-mark",
  "hero-documentary",
  "service-imagery",
  "project-photo",
  "owner-portrait",
  "team-photo",
  "work-detail",
  "product-photo",
  "location-photo",
] as const;

export type V1MediaRole = (typeof V1_MEDIA_ROLES)[number];

/** Bounded capability vocabulary (family-spec). */
export const V1_CAPABILITIES = [
  "cta-primary",
  "cta-secondary",
  "cta-tertiary",
  "phone-tap",
  "estimate-path",
  "schedule-path",
  "ask-affordance",
  "hours-display",
  "address-display",
  "map-route",
  "social-link",
  "content-link",
  "newsletter-capture",
] as const;

export type V1Capability = (typeof V1_CAPABILITIES)[number];

/**
 * Accepted object schema roles per V1 component (family-spec "Accepted
 * object schemas"). Used by the validator's semantic layer for V1
 * components; the pre-V1 registry keeps its own eligibility table.
 * AskFYD-entry binds no objects: it is a site capability.
 */
export const V1_COMPONENT_ROLES: Record<V1FamilyComponent, readonly FYDSchemaRole[]> = {
  Navigation: ["business", "service"],
  Hero: ["business", "location", "service"],
  TrustBar: ["business", "location", "post", "article"],
  ServiceGrid: ["service"],
  FeaturedService: ["service", "product", "business"],
  ProjectGallery: ["post", "article", "product"],
  BusinessStory: ["person", "business"],
  ServiceArea: ["location", "business"],
  ContactCTA: ["business", "location", "service"],
  Footer: ["business", "location", "service", "post", "article"],
  "AskFYD-entry": [],
};

// ---------------------------------------------------------------------------
// (a) Per-section composition.
// ---------------------------------------------------------------------------

/** An object bound into a section: reference by id or by query, never the object itself. */
export interface FYDObjectBinding {
  /** Schema role: business | service | product | location | person | post | article. */
  role: string;
  /** Object id when the binding names a concrete object. */
  objectId?: string;
  /** When the binding is query-resolved, names the section query (always "section-query" today). */
  queryRef?: string;
  /** Why this object is bound here (evidence note, prose). */
  note?: string;
}

/**
 * A media asset bound into a section. Asset REFERENCES only: an asset id
 * or content digest, never bytes, never a data: URL, never a hotlink the
 * renderer must trust (Decision 1: ingest, don't hotlink).
 */
export interface FYDMediaBinding {
  role: V1MediaRole;
  /** Asset reference (id or digest). Never bytes. */
  assetId: string;
  /** Media relevance gate outcome for this binding. */
  relevance?: "passed" | "rejected" | "pending";
  note?: string;
}

/** Semantic responsive behavior vocabulary. Intent, never px. */
export type FYDResponsiveBehavior =
  | "stack"
  | "snap-row"
  | "carousel"
  | "compact-tiles"
  | "collapse-to-minimal"
  | "banner-above-copy"
  | "sticky-action-bar"
  | "progressive-disclosure"
  | "full-bleed"
  | "split"
  | "editorial-type-led";

/**
 * Per-section responsive intent (06 gap 6): how the component behaves on
 * narrow vs wide viewports, in semantic terms. The renderer owns the px.
 */
export interface FYDSectionResponsiveIntent {
  /** Behaviors on narrow viewports (xs-first baseline). */
  narrow: FYDResponsiveBehavior[];
  /** Behaviors on wide viewports. */
  wide: FYDResponsiveBehavior[];
  note?: string;
}

/**
 * Per-section media treatment intent (06 gap 4): aspect, treatment, the
 * minimum relevance bar, and the fallback when media fails the gate.
 */
export interface FYDSectionMediaTreatment {
  aspect?: "square" | "landscape" | "portrait" | "wide" | "banner";
  treatment?: "documentary" | "polished" | "schematic";
  /** Minimum bar media must clear to render in this section. */
  relevanceBar?: "relevance-gate" | "strict";
  /** What the planner does when no media clears the bar. */
  fallback?: "omit" | "editorial-variant" | "honest-empty-state";
  note?: string;
}

/**
 * Per-section composition: the section's job, its registry variant, what
 * it binds, and how it behaves. All optional and additive.
 */
export interface FYDSectionComposition {
  /** The customer-facing job this section does. */
  job?: FYDSectionJob;
  /** Chosen registry variant (must be in V1_COMPONENT_VARIANTS for V1 components). */
  variant?: string;
  /** Evidence-based selection rationale: why this variant, from what evidence. */
  selectionRationale?: string;
  /** Section rhythm as intent: tight | section | feature | hero. */
  sectionRhythm?: "tight" | "section" | "feature" | "hero";
  /** Section-level density (06 gap 7). */
  density?: "compact" | "comfortable";
  /** Section-level object emphasis (06 gap 7). */
  emphasis?: "quiet" | "balanced" | "prominent";
  objectBindings?: FYDObjectBinding[];
  mediaBindings?: FYDMediaBinding[];
  /** CTA ids from the site ctaHierarchy that this section renders. */
  ctaBindings?: string[];
  responsiveIntent?: FYDSectionResponsiveIntent;
  mediaTreatment?: FYDSectionMediaTreatment;
}

// ---------------------------------------------------------------------------
// (c) CTA hierarchy + placement map.
// ---------------------------------------------------------------------------

/** Rank in the site-wide CTA hierarchy. Exactly one primary per page. */
export type FYDCTARank = "primary" | "secondary" | "tertiary";

/** A ranked conversion action. Copy and target only; no implementation. */
export interface FYDCTAAction {
  /** Deterministic id, e.g. "cta-call-primary". Referenced by ctaBindings and the placement map. */
  id: string;
  rank: FYDCTARank;
  /** What kind of conversion this is (bounded vocabulary). */
  kind:
    | "call"
    | "estimate"
    | "quote"
    | "schedule"
    | "gallery-route"
    | "capture"
    | "browse"
    | "social"
    | "ask";
  /** Resolved label copy, e.g. "Get a Free Estimate". */
  label: string;
  /**
   * Target: a formatted phone (never raw E.164), a page slug, or a
   * section id. Never a URL the renderer must trust blindly.
   */
  target?: string;
  /** Why this action outranks the others (evidence note, prose). */
  rationale?: string;
}

/**
 * Placement map: placement name -> CTA ids rendered there.
 * Canonical placements: navigation, hero, service-grid, featured-service,
 * project-gallery, contact-cta, footer. TrustBar, BusinessStory,
 * ServiceArea, AskFYD-entry carry no money actions.
 */
export interface FYDCTAPlacementMap {
  [placement: string]: string[];
}

/** The site-wide ranked conversion actions plus where each one renders. */
export interface FYDCTASection {
  hierarchy: FYDCTAAction[];
  placement: FYDCTAPlacementMap;
}

// ---------------------------------------------------------------------------
// (f) Design-token / theme reference by name.
// ---------------------------------------------------------------------------

/**
 * Known theme registry ids. A theme is a COMPLETE semantic+component
 * binding, never a partial override of another theme.
 */
export const FYD_THEME_IDS = [
  "fyd/hpp-warm-craftsman@1",
  "fyd/coppersmith-trade-authority@1",
] as const;

export type FYDThemeId = (typeof FYD_THEME_IDS)[number];

/** True for a registered theme id ("fyd/<slug>@<version>" and known). */
export function isKnownThemeId(id: string): id is FYDThemeId {
  return (FYD_THEME_IDS as readonly string[]).includes(id);
}

/**
 * Design-token reference BY NAME (token-model 8.5). The planner selects
 * the theme; the compiler emits the implementation. No token values
 * inline in SiteSpec, ever.
 */
export interface FYDDesignTokenRef {
  /** Registry id with version, e.g. "fyd/hpp-warm-craftsman@1". */
  theme: string;
  /** Locked: the planner selects semantic intent. Component tier is the renderer's read. */
  tier?: "semantic";
  /**
   * Owner-approved slot overrides. Keys name semantic or component tier
   * slots; values are token references ("{accent.craft-text}"). Never
   * raw hex, never class strings, never CSS, never primitive ids.
   */
  overrides?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// (g) Source design signal: NON-CANONICAL presentation observations.
// ---------------------------------------------------------------------------

/**
 * Presentation observations from the source site. SIGNAL, NOT AUTHORITY:
 * the planner weighs these against the family and owner intent. Never
 * business truth; never copied into canonical claims.
 */
export interface FYDSourceDesignSignal {
  /**
   * Explicit marker. Any other value is a validation error: the block
   * must never be mistaken for canonical truth.
   */
  authority: "signal-not-authority";
  observedAt?: string;
  sourceUrl?: string;
  observations: {
    /** Brand-color hints OBSERVED on the source site. Hex allowed here ONLY: this is evidence of what was seen, not design authority. Token values still live in the token files. */
    brandColorHints?: string[];
    fontTendencies?: string[];
    density?: string;
    navStructure?: string;
    sectionOrder?: string[];
    ctaProminence?: string;
    radiusTendency?: string;
    imageTreatment?: string;
    aspectTendencies?: string[];
    notes?: string[];
  };
}

// ---------------------------------------------------------------------------
// Page headline intent (06 gap 2).
// ---------------------------------------------------------------------------

/**
 * Headline hierarchy intent per page. The H1 is editorial identity copy
 * (source hierarchy: owner-approved > source-site hero headline evidence
 * > evidence-derived editorial line). The legal business name as H1
 * requires explicit owner intent.
 */
export interface FYDPageHeadlineIntent {
  h1Kind: "editorial" | "legal-name";
  /** Where the headline comes from: owner | source-site | evidence-derived. */
  source?: "owner" | "source-site" | "evidence-derived";
  sourceNote?: string;
}
