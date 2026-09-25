/**
 * Family registry (product lane, V1).
 *
 * Maps (component, variant) pairs to their renderer. Exhaustive and
 * fail-closed: an unknown component or variant renders nothing, never a
 * guess. The public renderer only renders what this registry admits.
 */

import type { PlannedSection } from "./types";
import type { FamilyCtx } from "./types";
import type { FamilySectionProps } from "./shared";
import { Navigation } from "./components/Navigation";
import { Hero } from "./components/Hero";
import { TrustBar } from "./components/TrustBar";
import { ServiceGrid } from "./components/ServiceGrid";
import { FeaturedService } from "./components/FeaturedService";
import { ProjectGallery } from "./components/ProjectGallery";
import { BusinessStory } from "./components/BusinessStory";
import { ServiceArea } from "./components/ServiceArea";
import { ContactCTA } from "./components/ContactCTA";
import { Footer } from "./components/Footer";
import { AskFYD } from "./components/AskFYD";

export type FamilyComponentName =
  | "Navigation"
  | "Hero"
  | "TrustBar"
  | "ServiceGrid"
  | "FeaturedService"
  | "ProjectGallery"
  | "BusinessStory"
  | "ServiceArea"
  | "ContactCTA"
  | "Footer"
  | "AskFYD";

/**
 * The planner's registry vocabulary names the Ask entry "AskFYD-entry";
 * the family registry names it "AskFYD". Both resolve to the same
 * renderer. No other aliases exist.
 */
const PLANNER_ALIASES: Record<string, FamilyComponentName> = {
  "AskFYD-entry": "AskFYD",
};

type SectionRenderer = (props: FamilySectionProps) => JSX.Element | null;

const REGISTRY: Record<FamilyComponentName, Record<string, SectionRenderer>> = {
  Navigation: { taxonomic: Navigation, minimal: Navigation },
  Hero: {
    "media-rich": Hero,
    "identity-led": Hero,
    "service-led": Hero,
    "local-action": Hero,
  },
  TrustBar: {
    "metrics-strip": TrustBar,
    "testimonial-cluster": TrustBar,
  },
  ServiceGrid: {
    cards: ServiceGrid,
    "featured-plus-grid": ServiceGrid,
    "media-grid": ServiceGrid,
  },
  FeaturedService: {
    "media-lead": FeaturedService,
    "scope-lead": FeaturedService,
  },
  ProjectGallery: {
    masonry: ProjectGallery,
    editorial: ProjectGallery,
    carousel: ProjectGallery,
  },
  BusinessStory: {
    "founder-led": BusinessStory,
    "team-grid": BusinessStory,
  },
  ServiceArea: {
    "area-list": ServiceArea,
    "hub-address": ServiceArea,
  },
  ContactCTA: {
    "conversion-dual": ContactCTA,
    "value-capture": ContactCTA,
  },
  Footer: {
    credibility: Footer,
    "credibility-plus-capture": Footer,
  },
  AskFYD: {
    "floating-entry": AskFYD,
    "inline-section": AskFYD,
  },
};

const COMPONENT_NAMES = Object.keys(REGISTRY) as FamilyComponentName[];

/** True when the name resolves to one of the 11 family components (planner aliases included). */
export function isFamilyComponent(name: string): name is FamilyComponentName {
  return (
    (COMPONENT_NAMES as string[]).includes(name) ||
    Object.prototype.hasOwnProperty.call(PLANNER_ALIASES, name)
  );
}

/** Canonical registry name for a planner component name. */
export function canonicalComponentName(name: string): FamilyComponentName | null {
  if ((COMPONENT_NAMES as string[]).includes(name)) return name as FamilyComponentName;
  return PLANNER_ALIASES[name] ?? null;
}

/**
 * Resolve a section to its renderer. Returns null when the section is not
 * approved for public rendering (status !== "planned"), is not a family
 * component, or carries an unknown variant. Fail closed: no fallback
 * rendering, no partial guess.
 */
export function resolveFamilySection(
  section: PlannedSection,
  ctx: FamilyCtx,
): JSX.Element | null {
  if (section.status !== "planned") return null;
  const name = canonicalComponentName(section.component);
  if (!name) return null;
  const renderer = REGISTRY[name][section.variant];
  if (!renderer) return null;
  return renderer({ section, ctx });
}
