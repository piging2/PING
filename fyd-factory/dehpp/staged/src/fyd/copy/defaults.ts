/**
 * Default presentation copy tables for the one FYD renderer.
 *
 * These tables are DATA, not code: the renderer looks copy up here instead of
 * hardcoding English strings next to the JSX. A tenant never edits these
 * tables directly; tenant-specific voice enters through the composition
 * profile (presentation.copy on a section), which always wins over a table
 * default. Archetype overrides live under the "archetypes" column and are
 * selected only by the archetype key in the emitted spec (P5), never by a
 * tenant or business-name check.
 *
 * Conventions:
 * - No em dashes anywhere in factory-facing copy.
 * - An absent row is not an error: copyFor returns null and the renderer
 *   falls back to its structural rendering (no heading, raw value).
 */

export type CopyArchetype = "generic" | "trade" | "knowledge" | "technical";

/**
 * Section-heading defaults, keyed by the exact section component name the
 * renderer switches on (the key set is registry-owned).
 */
const SECTION_HEADING_DEFAULTS: Record<string, string> = {
  Services: "Services",
  Products: "Products",
  Locations: "Where we work",
  People: "The people",
  Posts: "Latest",
  ObjectGrid: "Browse",
  ObjectFeed: "Explore",
  RecentObjects: "Recent",
  Contact: "Contact",
  Links: "Find us",
  SocialProof: "What people say",
  ObjectRail: "Featured object",
  GenericObjectCard: "More",
  Gallery: "Gallery",
};

/**
 * Archetype column: voice overrides keyed first by section component name,
 * then by archetype. The "generic" column is the fallback for every
 * archetype, so unlisted archetypes render the neutral default.
 */
const ARCHETYPE_HEADING_OVERRIDES: Record<string, Partial<Record<CopyArchetype, string>>> = {
  // No overrides are registered yet. Rows are added here, as data, when an
  // archetype earns a distinct voice; the renderer code does not change.
};

/**
 * Resolve the default heading for a section. Precedence: section presentation
 * heading (tenant voice, resolved by the caller) > archetype override >
 * generic default > null.
 */
export function copyFor(archetype: CopyArchetype, sectionComponent: string): string | null {
  const override = ARCHETYPE_HEADING_OVERRIDES[sectionComponent]?.[archetype];
  if (override) return override;
  return SECTION_HEADING_DEFAULTS[sectionComponent] ?? null;
}

/** Normalize the spec archetype into the copy-table vocabulary. */
export function copyArchetype(specArchetype: string | null | undefined): CopyArchetype {
  if (specArchetype === "trade" || specArchetype === "knowledge" || specArchetype === "technical") {
    return specArchetype;
  }
  return "generic";
}

/**
 * Claim-label seed table (P6). These five English labels are the factory
 * default vocabulary for object provenance badges; they replace the five
 * hardcoded literals that used to sit next to the renderer JSX.
 */
const CLAIM_KIND_LABELS: Record<string, string> = {
  website_statement: "Website statement",
  site_record: "Site record",
  demo_addition: "Demo addition",
  feed_item: "Feed item",
  mixed_sources: "Mixed sources",
};

/**
 * Label for one claim kind. Unknown kinds are rendered raw: an unrecognized
 * kind is data the table has not learned yet, not an error.
 */
export function claimKindLabel(claimKind: string): string {
  return CLAIM_KIND_LABELS[claimKind] ?? claimKind;
}

/**
 * CTA heading default (P7). The seeded generic voice is the neutral default
 * that the hardcoded renderer string used to be.
 */
export function ctaHeadingFor(archetype: CopyArchetype): string {
  if (archetype === "trade") return "Start the conversation";
  if (archetype === "knowledge") return "Start the conversation";
  if (archetype === "technical") return "Start the conversation";
  return "Start the conversation";
}
