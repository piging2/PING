/**
 * Site composition profiles: the typed parameter block that turns tenant
 * inputs into a composed FYDSiteSpec without customer-specific branches.
 *
 * Precedence, high to low (B3):
 *   1. live owner intent  (presentation intent block, set through the editor)
 *   2. tenant composition record (repo tenant data, e.g. one file per route)
 *   3. strategy output (category strategy + planner policy, one code path
 *      for every tenant)
 *
 * The profile carries ONLY typed composition inputs: section/page order,
 * CTA emphasis, layout character, and theme token overrides. There are no
 * tenant names, no business-name checks, and no customer-specific JSX
 * anywhere on this path: the planner works on dimension vectors, the
 * strategy works on tenant categories, and the generator works on the
 * resolved profile.
 */

import type {
  FYDLayoutCharacter,
  FYDThemeTokens,
  ObjectGraph,
} from "../sitespec/types";
import {
  KNOWLEDGE_PROFILE,
  TRADES_PROFILE,
  TECHNICAL_ENTERPRISE_PROFILE,
  type ArchetypeProfile,
} from "../archetypes/profiles";
import { NAMED_PRESET_VECTORS, policyForVector } from "../builder/dimensions";

/** Tenant categories are generic business kinds, never tenant identities. */
export type TenantCategory = "trade" | "knowledge" | "technical";

/** CTA emphasis (P8): where and how the CTA renders. "standard" is the seed. */
export type CtaEmphasis = "standard" | "elevated" | "quiet";

export interface SiteCompositionProfile {
  /** Home-page section order (P3): registry section ids. */
  homeSectionOrder: string[];
  /** Page order (P4): page slugs. */
  pageOrder: string[];
  /** CTA emphasis (P8). */
  ctaEmphasis: CtaEmphasis;
  /** Layout character (P10): null means "no opinion, use the judged default". */
  layoutCharacter: FYDLayoutCharacter | null;
  /** Token overrides (P11). Always an object, possibly empty. */
  themeTokenOverrides: Partial<FYDThemeTokens>;
}

/**
 * Canonical default order table (P3 fallback). This is the current fixed
 * generator emission order, with the SocialProof slot (B6) in the position
 * the trade archetype profile already uses: after Products, before Locations.
 * When no composition profile reaches the generator, this table reproduces
 * the historical emission order exactly.
 */
export const DEFAULT_HOME_SECTION_ORDER: string[] = [
  "Hero",
  "BusinessSummary",
  "Services",
  "Products",
  "SocialProof",
  "Locations",
  "People",
  "RecentObjects",
  "Contact",
  "Links",
  "CTA",
  "AskFYD",
  "ObjectRail",
];

/** Canonical default page order (P4 fallback): the current fixed order. */
export const DEFAULT_PAGE_ORDER: string[] = ["home", "about", "services", "explore"];

/** The system-default profile when nothing at all is specified. */
export const DEFAULT_COMPOSITION_PROFILE: SiteCompositionProfile = {
  homeSectionOrder: [...DEFAULT_HOME_SECTION_ORDER],
  pageOrder: [...DEFAULT_PAGE_ORDER],
  ctaEmphasis: "standard",
  layoutCharacter: null,
  themeTokenOverrides: {},
};

const CATEGORY_ARCHETYPE: Record<TenantCategory, ArchetypeProfile> = {
  trade: TRADES_PROFILE,
  knowledge: KNOWLEDGE_PROFILE,
  technical: TECHNICAL_ENTERPRISE_PROFILE,
};

const CATEGORY_VECTOR = {
  trade: "TRADES",
  knowledge: "KNOWLEDGE",
  technical: "TECHNICAL_ENTERPRISE",
} as const;

function mapArchetypeCta(c: ArchetypeProfile["ctaEmphasis"]): CtaEmphasis {
  return c === "high" ? "elevated" : c === "low" ? "quiet" : "standard";
}

function mapPolicyCta(c: "high" | "medium" | "low"): CtaEmphasis {
  return c === "high" ? "elevated" : c === "low" ? "quiet" : "standard";
}

/**
 * System default per archetype profile (P3/P4/P8/P10/P11): order, CTA
 * emphasis, layout character, and token overrides derived from the
 * category's archetype profile. The planner never branches on tenant names;
 * the category selects a dimension vector and the policy does the rest.
 */
export function systemDefaultForCategory(category: TenantCategory): SiteCompositionProfile {
  const profile = CATEGORY_ARCHETYPE[category] ?? KNOWLEDGE_PROFILE;
  const { layoutCharacter, ...tokenOverrides } = profile.tokenOverrides;
  return {
    homeSectionOrder: [...profile.compositionRules.sectionOrder],
    pageOrder: [...DEFAULT_PAGE_ORDER],
    ctaEmphasis: mapArchetypeCta(profile.ctaEmphasis),
    layoutCharacter: layoutCharacter ?? null,
    themeTokenOverrides: { ...tokenOverrides },
  };
}

/**
 * Planner policy application (B7): the planner's urgency dimension maps onto
 * P8 ctaEmphasis through the named-preset vectors and policyForVector. This
 * is the only dimension-vector policy that executes inside composition;
 * the generator itself applies no vector policy.
 */
export function applyPlannerPolicy(
  base: SiteCompositionProfile,
  category: TenantCategory,
): SiteCompositionProfile {
  const vector = NAMED_PRESET_VECTORS[CATEGORY_VECTOR[category] ?? "KNOWLEDGE"];
  const policy = policyForVector(vector);
  return { ...base, ctaEmphasis: mapPolicyCta(policy.ctaEmphasis) };
}

/**
 * Strategy entry point (B3/R9): one code path for every tenant. The category
 * selects the system default, then the planner policy maps the urgency
 * dimension onto CTA emphasis. The graph is accepted for signature fidelity
 * with the composition seam and is currently reserved for future
 * graph-derived strategy inputs; it does not influence the output today.
 */
export function strategyForSite(
  category: TenantCategory,
  _graph: ObjectGraph,
): SiteCompositionProfile {
  return applyPlannerPolicy(systemDefaultForCategory(category), category);
}

export interface CompositionInputs {
  category: TenantCategory;
  graph: ObjectGraph;
  /** Recorded owner-set composition (repo tenant data). */
  tenantRecord?: SiteCompositionProfile | null;
  /** Live owner-set composition (presentation intent). Wins over the record. */
  liveIntent?: Partial<SiteCompositionProfile> | null;
}

/**
 * Resolve the final composition profile. Precedence: live intent >
 * tenant record > strategy output. Each layer replaces the whole block it
 * provides (order lists wholesale, scalars by value); absent layers fall
 * through to the layer below.
 */
export function resolveCompositionProfile(inputs: CompositionInputs): SiteCompositionProfile {
  const base = strategyForSite(inputs.category, inputs.graph);
  const withRecord = inputs.tenantRecord ? { ...base, ...inputs.tenantRecord } : base;
  const withIntent = inputs.liveIntent ? { ...withRecord, ...inputs.liveIntent } : withRecord;
  return withIntent;
}

/**
 * Shape-check a live composition intent block before it may override the
 * recorded profile. Unknown shapes are rejected, not coerced: fail closed.
 */
export function asCompositionIntent(raw: unknown): Partial<SiteCompositionProfile> | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: Partial<SiteCompositionProfile> = {};
  if (Array.isArray(r.homeSectionOrder) && r.homeSectionOrder.every((s) => typeof s === "string")) {
    out.homeSectionOrder = [...r.homeSectionOrder];
  }
  if (Array.isArray(r.pageOrder) && r.pageOrder.every((s) => typeof s === "string")) {
    out.pageOrder = [...r.pageOrder];
  }
  if (r.ctaEmphasis === "standard" || r.ctaEmphasis === "elevated" || r.ctaEmphasis === "quiet") {
    out.ctaEmphasis = r.ctaEmphasis;
  }
  if (r.layoutCharacter === null || typeof r.layoutCharacter === "string") {
    out.layoutCharacter = r.layoutCharacter as FYDLayoutCharacter | null;
  }
  if (r.themeTokenOverrides && typeof r.themeTokenOverrides === "object") {
    out.themeTokenOverrides = { ...(r.themeTokenOverrides as Partial<FYDThemeTokens>) };
  }
  return Object.keys(out).length > 0 ? out : null;
}
