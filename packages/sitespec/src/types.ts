/**
 * FYD SiteSpec: the declarative product of the generative object-site compiler.
 *
 * Law: the spec is DATA, never generated JSX. The renderer turns
 * (SiteSpec + ObjectGraph + ViewerContext) into UI. A spec is portable,
 * diffable, validatable, and deterministic: the same graph always yields
 * the same spec.
 *
 * HARVEST (adapted): subset of the source SiteSpec contracts. Only the
 * shapes the deterministic generator, the semantic render model, and the
 * binding verifier need. Composition extensions (status, revision,
 * archetype, objectPresence, motion semantics beyond the token shape)
 * stay with the source until a proof requires them.
 *
 * SOURCE: /home/nolan/projects/ping-fyd-converged @ 32f8347
 *         src/fyd/sitespec/types.ts (ObjectGraph, ViewerContext, FYDQuery,
 *         FYDPresentation, FYDSection, FYDPage, FYDNavItem, FYDThemeTokens
 *         and its token interfaces, DEFAULT_FYD_THEME, FYDSpecProvenance,
 *         FYDSiteSpec, FYDFinding)
 * TARGET OWNER: packages/sitespec (piging2 experience IR)
 * DEPENDENCIES: ./ping-types (PingObject, PingRelationship)
 * PROOFS: [1, 2, 3, 4, 5]
 */

import type { PingObject, PingRelationship } from "./ping-types";

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
  /**
   * Owner-approved object display order (object ids). The renderer lists
   * these ids first, in this order; objects not listed follow in their
   * default query order. Never a fact: only the display sequence.
   */
  objectOrder?: string[];
  /**
   * Owner-approved hidden object ids within this section. The renderer
   * filters these ids out after resolving the section query (and after
   * applying objectOrder). Never a fact: only a display decision.
   */
  hiddenObjectIds?: string[];
}

export interface FYDSection {
  /** Deterministic id: pageSlug + ":" + component + ":" + index. */
  id: string;
  /** Component registry name, e.g. "Hero", "Services". */
  component: string;
  query: FYDQuery;
  presentation: FYDPresentation;
}

export interface FYDPage {
  /** URL slug, e.g. "home", "about", "services", "explore". */
  slug: string;
  title: string;
  navLabel: string;
  sections: FYDSection[];
}

export interface FYDNavItem {
  label: string;
  pageSlug: string;
}

/** Base font size in px + modular ratio between type steps. */
export interface FYDTypeScale {
  base: number;
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

/** Named viewport breakpoints in px. */
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
 * The one shared motion type the whole design system uses.
 * (Nolan, 2026-09-22 FYD grill, BINDING.)
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

/** Semantic design intent for the design-system compiler. Optional and additive. */
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
}

/** A typed validation finding. */
export interface FYDFinding {
  severity: "error" | "warning" | "info";
  authority: "fyd.sitespec.validator";
  resourceId: string;
  path: string;
  message: string;
}
