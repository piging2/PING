/**
 * FYD family visual hierarchy (product lane, V1).
 *
 * Three visual scales, one contract:
 * - PRIMARY: hero moments and major visual proof. Full-bleed real
 *   imagery, large display type, generous whitespace.
 * - SECONDARY: services, projects, story. Strong cards and editorial
 *   grids, standard rhythm.
 * - UTILITY: location, contact chrome, footer, quiet entries. Compact
 *   and quiet; sections must NOT carry equal visual weight.
 *
 * Contract with the planner lane: sections carry a visual-scale tag
 * (PRIMARY / SECONDARY / UTILITY); the family prefers the tag and keeps
 * a deterministic component/variant fallback map for plans deserialized
 * from older snapshots. The fallback is generic, never per-customer.
 *
 * The motion vocabulary is Nolan-approved and restrained:
 * Reveal, Stagger, ImageReveal, CardHover, SectionTransition,
 * Number/TrustReveal, GalleryTransition, CTAEmphasis. Transform/opacity
 * only; prefers-reduced-motion disables everything; no content or action
 * ever depends on an animation completing.
 */

import type { PlannedSection } from "./types";

/** The three visual scales. PRIMARY > SECONDARY > UTILITY in visual weight. */
export type VisualScale = "PRIMARY" | "SECONDARY" | "UTILITY";

/**
 * Plan-driven motion intents (typed SiteSpec intent). The remaining
 * vocabulary members (CardHover, SectionTransition, TrustReveal,
 * GalleryTransition, CTAEmphasis) are renderer-internal applications of
 * the same vocabulary, generic to the family, never per-customer.
 */
export type MotionIntent = "reveal" | "stagger" | "image-reveal" | "none";

/**
 * PlannedSection as the renderer reads it. The planner lane tags every
 * section with visualScale (planner.ts); the cast below is defensive:
 * plans deserialized from older snapshots may lack the tag, in which
 * case the generic component/variant fallback map applies. Unknown tag
 * values fall back; they never break the page.
 */
function taggedVisualScale(section: PlannedSection): unknown {
  return (section as { visualScale?: unknown }).visualScale;
}

const SCALES: ReadonlyArray<VisualScale> = ["PRIMARY", "SECONDARY", "UTILITY"];

/** Generic fallback map: component/variant -> visual scale. */
export function fallbackVisualScale(component: string, variant: string): VisualScale {
  switch (component) {
    case "Hero":
      return "PRIMARY";
    case "ProjectGallery":
      // The editorial gallery is the major visual-proof moment.
      return variant === "editorial" ? "PRIMARY" : "SECONDARY";
    case "FeaturedService":
      return "SECONDARY";
    case "ServiceGrid":
      return "SECONDARY";
    case "BusinessStory":
      return "SECONDARY";
    case "TrustBar":
      // The metrics strip is a compact scannable band, not a section.
      return variant === "metrics-strip" ? "UTILITY" : "SECONDARY";
    case "ContactCTA":
      return "SECONDARY";
    case "ServiceArea":
    case "Footer":
    case "AskFYD":
    case "AskFYD-entry":
      return "UTILITY";
    case "Navigation":
      return "UTILITY";
    default:
      return "SECONDARY";
  }
}

/** Resolve a section's visual scale: planner tag first, fallback map second. */
export function visualScaleFor(section: PlannedSection): VisualScale {
  const tag = taggedVisualScale(section);
  if (typeof tag === "string" && (SCALES as ReadonlyArray<string>).includes(tag)) {
    return tag as VisualScale;
  }
  return fallbackVisualScale(section.component, section.variant);
}

/** Generic fallback map: component/variant -> default motion intent. */
export function fallbackMotionFor(component: string, variant: string): MotionIntent {
  switch (component) {
    case "Hero":
      return "reveal";
    case "ServiceGrid":
      return "stagger";
    case "ProjectGallery":
      return variant === "carousel" ? "none" : "image-reveal";
    case "BusinessStory":
    case "FeaturedService":
    case "ContactCTA":
      return "reveal";
    case "TrustBar":
      // Metrics animate their numbers (TrustReveal), not their layout.
      return variant === "metrics-strip" ? "none" : "stagger";
    default:
      // UTILITY surfaces stay quiet: no scroll motion.
      return "none";
  }
}

/**
 * Resolve a section's motion intent: renderer default map (the planner
 * does not tag motion; the family owns its restrained vocabulary).
 * "none" disables. Unknown values fall back; never break.
 */
export function motionFor(section: PlannedSection): MotionIntent {
  return fallbackMotionFor(section.component, section.variant);
}

/** Vertical rhythm per visual scale. PRIMARY breathes; UTILITY stays quiet. */
export const SCALE_RHYTHM: Record<VisualScale, string> = {
  PRIMARY: "py-20 md:py-36",
  SECONDARY: "py-14 md:py-24",
  UTILITY: "py-10 md:py-14",
};
