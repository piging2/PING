/**
 * FYD deterministic page planner (product lane, V1 family).
 *
 * Catalog-driven replacement for the fixed homePage() template. Given the
 * same inputs it produces byte-identical plans: no LLM calls, no
 * randomness, no clock, no filesystem access in the planner core.
 *
 * Locked authorities implemented here:
 * - family-spec.md: the 11-component registry, IF/THEN eligibility rules,
 *   per-variant selection rules, deterministic section order, CTA hierarchy
 *   with the primary resolution rule, editorial ordering, headline rule.
 * - presentation-observations.md: the designSignal is weighed as signal,
 *   never authority. Confidence weighting is fixed: direct may gate a
 *   variant choice, derived may seed a token, inferred may only break ties.
 * - fyd-builder-authorization-2026-09-25.md: boring and deterministic first.
 *   The planner never lowers a media bar to fill a slot; ineligible
 *   sections are omitted, never rendered empty or degraded.
 *
 * Media scoring (score.ts, media-score@1) owns the acceptance bars. The
 * planner consumes the scorer's pass/fail verdict per asset and never
 * re-scores, never relaxes a bar, never binds a failed asset.
 */

import type { ObjectGraph } from "../sitespec/types";
import type { PingObject, PingRelationship } from "@/lib/ping/types";
import { SCHEMA_ROLES, type FYDSchemaRole } from "../sitespec/schemas";
import { ROLE_PREDICATES, INVERSE_ROLE_PREDICATES } from "./generator";
import { TRADE_KEYWORDS, KNOWN_TRADES } from "../media/trade-keywords";

// ============================================================================
// ADAPTER SECTION: canonical FYD types.
// ----------------------------------------------------------------------------
// Every import from shared canonical types lives here and ONLY here. The
// planner's own plan shape is defined locally below (Plan* types) against
// the LOCKED specs (family-spec.md + 06-binding-model.md).
//
// TODO(sibling): a sibling subagent is extending sitespec/types.ts
// additively with the EXTENDED SiteSpec fields (section job, variant,
// object/media bindings, CTA hierarchy, responsive intent, theme reference,
// rationale). When those types land, map them here in this section:
//   - PlannedSection  ->  the extended FYDSection (job, component, variant,
//     objectBindings, mediaBindings, ctaBindings, responsiveIntent)
//   - CtaHierarchy    ->  the extended CTA hierarchy block
//   - HomePagePlan    ->  the extended FYDSiteSpec page plan
// No other file section may import canonical types directly.
// ============================================================================

// ---------------------------------------------------------------------------
// GRAPH FIELD-NAME ADAPTER: graph vocabulary -> planner vocabulary.
//
// The canonical object graph emits different field names than the planner's
// locked vocabulary (family-spec): services carry `description` where the
// planner reads `scope`; the business carries `locality` (and location
// objects carry address_locality/address_region/...) where the planner reads
// `address`. This adapter is the ONLY place that translates. Planner logic
// below reads through these functions, never raw graph field names, for
// scope and address.
//
// The adapter never invents data: when no evidence exists the planner field
// reads empty and the section stays ineligible (never degraded, never
// rendered from nothing).
//
// NOTE: these functions call fieldValue/fieldList/byId, hoisted function
// declarations defined in PURE HELPERS below. Calls happen at plan time,
// after module init, so hoisting is safe.
// ---------------------------------------------------------------------------

/**
 * A description "reads as a scope line" when it is a short human sentence
 * about the offering: bounded length, no URL, non-empty after trim.
 * Provenance boilerplate, paragraphs, and link-like text are not scope
 * lines and are never promoted.
 */
const SCOPE_LINE_MAX_LEN = 280;
const SCOPE_LINE_URL_PATTERN = /https?:\/\/|www\./i;

function readsAsScopeLine(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (t === "" || t.length > SCOPE_LINE_MAX_LEN) return false;
  if (SCOPE_LINE_URL_PATTERN.test(t)) return false;
  return true;
}

/**
 * Service scope, graph vocabulary -> planner vocabulary. A direct `scope`
 * field wins; otherwise the service `description` (top-level, then fields)
 * is promoted ONLY when it reads as a scope line. Scope is never
 * synthesized from the title or keywords: no scope-like description means
 * no scope, and the buying-unit rules stay ineligible.
 */
export function adaptedServiceScope(service: PingObject): string {
  const direct = fieldValue(service, "scope").trim();
  if (direct !== "") return direct;
  const raw =
    typeof service.description === "string" && service.description.trim() !== ""
      ? service.description
      : fieldValue(service, "description");
  const desc = raw.replace(/\s+/g, " ").trim();
  if (!readsAsScopeLine(desc)) return "";
  return desc;
}

export interface AdaptedAddress {
  /** Formatted address lines from evidence, most specific first. */
  lines: string[];
  /** True when a line carries street-level detail (routable: map-route honest). */
  streetLevel: boolean;
}

/**
 * Street-address field keys the graph is known to emit (bounded list; the
 * adapter never guesses other keys).
 */
const STREET_ADDRESS_KEYS = [
  "street_address",
  "address_line1",
  "address_street",
  "streetaddress",
];

/** Compose one address line from a location object's locality components. */
function composeLocalityLine(l: PingObject): { line: string; streetLevel: boolean } {
  const street =
    STREET_ADDRESS_KEYS.map((k) => fieldValue(l, k).trim()).find((s) => s !== "") ?? "";
  const locality = fieldValue(l, "address_locality").trim();
  const region = fieldValue(l, "address_region").trim();
  const postal = fieldValue(l, "postal_code").trim();
  const country = fieldValue(l, "address_country").trim();
  const cityRegion = [locality, region].filter((s) => s !== "").join(", ");
  let line = cityRegion;
  if (postal !== "") line = (line !== "" ? line + " " : "") + postal;
  if (country !== "") line = (line !== "" ? line + ", " : "") + country;
  if (line === "") {
    // Fall back to the location's own composed locality string when the
    // components are absent (still the graph's words, not ours).
    line = fieldValue(l, "locality").trim();
  }
  if (street !== "") line = street + (line !== "" ? ", " + line : "");
  return { line: line.replace(/\s+/g, " ").trim(), streetLevel: street !== "" };
}

/**
 * Owner address lines, graph vocabulary -> planner vocabulary. A direct
 * `address` field wins; otherwise location objects (the located_at claims)
 * composed from their locality components; otherwise the owner's own
 * `locality` field. Every line is formatted evidence; nothing is invented.
 */
export function adaptedAddress(
  owner: PingObject | null,
  locations: PingObject[],
): AdaptedAddress {
  if (owner) {
    const direct = fieldValue(owner, "address").trim();
    if (direct !== "") {
      return {
        lines: [direct.replace(/\s+/g, " ").trim()],
        streetLevel: STREET_ADDRESS_KEYS.some((k) => fieldValue(owner, k).trim() !== ""),
      };
    }
  }
  const lines: string[] = [];
  let streetLevel = false;
  for (const l of [...locations].sort(byId)) {
    const composed = composeLocalityLine(l);
    if (composed.line !== "" && !lines.includes(composed.line)) {
      lines.push(composed.line);
      streetLevel = streetLevel || composed.streetLevel;
    }
  }
  if (lines.length === 0 && owner) {
    const loc = fieldValue(owner, "locality").trim().replace(/\s+/g, " ");
    if (loc !== "") lines.push(loc);
  }
  return { lines, streetLevel };
}

/**
 * Service-radius evidence, graph vocabulary -> planner vocabulary.
 * Explicit radius/serving fields win; otherwise the owner's own
 * description making a service-region claim ("serviced Western Colorado"
 * yields "Western Colorado"). The region phrase is quoted from the
 * business's own words; when the description makes no region claim the
 * radius reads empty and hub-address stays ineligible.
 */
const SERVICE_REGION_CLAIM =
  /\bservic(?:e|es|ed|ing)\s+(?:the\s+)?([A-Z][\w.'-]*(?:\s+[A-Z][\w.'-]*)*)/i;

export function adaptedServiceRadius(owner: PingObject | null): string {
  if (!owner) return "";
  const direct =
    fieldValue(owner, "service_radius").trim() || fieldValue(owner, "serving").trim();
  if (direct !== "") return direct.replace(/\s+/g, " ").trim();
  const desc =
    typeof owner.description === "string" && owner.description.trim() !== ""
      ? owner.description
      : fieldValue(owner, "description");
  const m = SERVICE_REGION_CLAIM.exec(desc.replace(/\s+/g, " "));
  if (!m || !m[1]) return "";
  // Keep the leading run of capitalized words (the region name itself);
  // stop at the first lowercase word ("for over 25 years" is duration,
  // not region). Nothing invented beyond the owner's own claim.
  const taken: string[] = [];
  for (const w of m[1].trim().split(/\s+/)) {
    if (!/^[A-Z]/.test(w)) break;
    taken.push(w);
    if (taken.length >= 4) break;
  }
  return taken.join(" ");
}

/**
 * Named service areas for RENDER (the planner's namedServiceAreas keeps its
 * eligibility role): owner service_areas, then location titles, then the
 * adapted radius region. Normalized-deduped so the same place written two
 * ways does not double-render. With excludeHubLine, the hub address line
 * (rendered separately by the hub-address variant) is seeded into the
 * seen-set so it never repeats inside the list.
 */
export function adaptedServiceAreaList(
  owner: PingObject | null,
  locations: PingObject[],
  opts?: { excludeHubLine?: boolean },
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const key = (t: string): string => t.toLowerCase().replace(/[^a-z0-9]/g, "");
  const push = (s: string): void => {
    const t = s.replace(/\s+/g, " ").trim();
    if (t === "") return;
    const k = key(t);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  };
  if (opts?.excludeHubLine && owner) {
    for (const line of adaptedAddress(owner, locations).lines) {
      const t = line.replace(/\s+/g, " ").trim();
      if (t !== "") seen.add(key(t));
    }
  }
  if (owner) {
    for (const a of fieldList(owner, "service_areas")) push(a);
  }
  for (const l of [...locations].sort(byId)) push(l.title.trim());
  if (owner) push(adaptedServiceRadius(owner));
  return out;
}

/** Registry component names, exactly as family-spec.md names them. */
export type RegistryComponent =
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
  | "AskFYD-entry";

/** Customer-facing job every section must declare (family-spec registry shape). */
export type SectionJob = "PERSUADE" | "PROVE" | "CONVERT" | "REASSURE" | "SERVE" | "CLOSE";

/**
 * Bounded capability vocabulary (family-spec). Capabilities are canonical
 * evidence about what the business offers; they never come from the
 * design signal.
 */
export type PlannerCapability =
  | "cta-primary"
  | "cta-secondary"
  | "cta-tertiary"
  | "phone-tap"
  | "estimate-path"
  | "schedule-path"
  | "ask-affordance"
  | "hours-display"
  | "address-display"
  | "map-route"
  | "social-link"
  | "content-link"
  | "newsletter-capture";

/**
 * Bounded media role vocabulary (family-spec). The scorer's 5-role set
 * (presentation-observations.md Part B) is a scorer-side subset; the planner
 * binds against this 9-role registry vocabulary.
 */
export type PlannerMediaRole =
  | "logo-mark"
  | "hero-documentary"
  | "service-imagery"
  | "project-photo"
  | "owner-portrait"
  | "team-photo"
  | "work-detail"
  | "product-photo"
  | "location-photo";

/**
 * One scored media asset as handed to the planner. Scores and the pass/fail
 * verdict are produced by the media scorer (media-score@1); the planner
 * trusts `passed` and never re-scores or lowers the bar.
 */
export interface ScoredMediaAsset {
  /** Asset id within the site-scoped media manifest. */
  assetId: string;
  role: PlannerMediaRole;
  /** Weighted score 0..1 from the scorer. */
  score: number;
  /** The scorer's acceptance-bar verdict for this role. */
  passed: boolean;
  /** Object ids this asset depicts (project photos, per-service imagery). */
  objectIds?: string[];
  /**
   * Person object id this portrait provably depicts (never stock).
   * Required for owner-portrait/team-photo binding: the depicts-person
   * rule (portraitRoleBindable) rejects those roles without it.
   */
  depictsPersonId?: string;
  /** Optional component breakdown for provenance. */
  components?: Record<string, number>;
  /**
   * The scorer's winning business-trade key for this role verdict
   * (e.g. "hvac", "plumbing"). Lets the planner bind unbound pool
   * assets only to service lines in the same trade: a condenser photo
   * that won under hvac must never illustrate a Plumbing section.
   */
  onTrade?: string;
}

export interface MediaAvailability {
  assets: ScoredMediaAsset[];
}

/**
 * Presentation observations, consumed as SIGNAL ONLY
 * (presentation-observations.md A.12). The planner may weigh these for
 * design choices; it may never read them for business facts.
 */
export interface DesignSignal {
  /** Mandatory non-authority marker. A missing or wrong marker => signal ignored. */
  authority: "signal-not-authority";
  /** Logo candidates observed on the source site (hint only; binding needs scored media). */
  logoCandidates?: Array<{ position: string; confidence: "direct" | "inferred" }>;
  /** Dominant primary CTA label observed (copy seed only; never a capability). */
  dominantPrimaryLabel?: string | null;
  /** Source nav labels in DOM order (taxonomy hint only; never creates services). */
  navLabels?: string[];
  /** Image density band: low | medium | high. */
  imageDensityBand?: "low" | "medium" | "high";
  /** Image finish tendency: documentary | polished | mixed. */
  imageFinish?: "documentary" | "polished" | "mixed";
  /** Observed section kinds in DOM order (tiebreak hint only). */
  sectionKinds?: string[];
}

/**
 * Owner intent. Outranks source signal outranks family default, for DESIGN
 * choices only. Never carries business facts the graph does not have.
 */
export interface OwnerIntent {
  /** Owner-provided or owner-approved headline line (H1 source #1). */
  headline?: string;
  /** Owner explicitly approved the legal business name as the identity line. */
  headlineUsesLegalName?: boolean;
  /** Source-site hero headline evidence (H1 source #2). */
  sourceHeadline?: string;
  /** Evidence-derived editorial line from craft-voice observations (H1 source #3). */
  derivedHeadlineLine?: string;
  /** Ownable brand-voice line, e.g. "You Don't Need A Plumber, You Need A Coppersmith". */
  brandVoiceLine?: string;
  /** Explicit service priority order (object ids, highest priority first). */
  servicePriority?: string[];
  /** Explicit flagship service lines (object ids). */
  featuredServiceIds?: string[];
  /** Owner flags service lines as distinct buying units. */
  serviceLinesAsBuyingUnits?: boolean;
  /** "emergency" | "project" trade category override (outranks keyword evidence). */
  tradeCategory?: "emergency" | "project";
  /** Owner-approved honest empty-state copy for the review cluster. */
  honestEmptyStateCopy?: string;
  /** Opt-in to the proposed honest empty state when no reviews exist. Default true. */
  honestEmptyStateAllowed?: boolean;
  /** Value-capture evidence: newsletter label + specific promise. */
  newsletter?: { label: string; promise: string };
  /** Bounded primary-CTA override (only within eligible bounds). */
  primaryCta?: "call" | "estimate";
  /** Theme reference by name. */
  themeName?: string;
}

export interface PlannerInput {
  graph: ObjectGraph;
  /** Bounded capabilities. When absent, planPageFromGraph derives the minimal honest set. */
  capabilities?: PlannerCapability[];
  media?: MediaAvailability;
  designSignal?: DesignSignal | null;
  ownerIntent?: OwnerIntent;
}

/** One object binding: which objects a section reads, by role. */
export interface ObjectBinding {
  role: "business" | "service" | "product" | "location" | "person" | "project" | "review" | "content";
  objectIds: string[];
}

/** One media binding: a relevance-passing asset bound to a role (never a failed asset). */
export interface MediaBinding {
  role: PlannerMediaRole;
  assetId: string;
  /** The object this asset illustrates, when object-specific. */
  objectId?: string;
  /** The named person this portrait provably depicts, when a portrait. */
  depictsPersonId?: string;
}

export type CtaTier = "primary" | "secondary" | "tertiary";

export interface PlannedCtaBinding {
  tier: CtaTier;
  kind:
    | "call"
    | "estimate"
    | "schedule"
    | "quote-start"
    | "see-work"
    | "service-line"
    | "newsletter"
    | "content"
    | "social"
    | "ask";
  label: string;
  /** tel:+1..., #estimate, #schedule, #projects, #newsletter, or a real URL. Never raw E.164 as display. */
  target: string;
  /** Formatted display text (phone formatted, never raw E.164). */
  display: string;
  placement: string;
  /** The service object this hook converts for, when per-card/per-line. */
  contextObjectId?: string;
}

/** Semantic responsive intent, never px (family-spec responsive contracts). */
export interface ResponsiveIntent {
  mobile375: string;
  mobile390: string;
  desktop1440: string;
}

/** Per-section media treatment intent (06-binding-model gap #4). */
export interface MediaIntent {
  treatment: "documentary" | "polished" | "mixed" | "none";
  /** The acceptance bar this section's media cleared, referenced by role name (scorer-owned). */
  relevanceBar: string;
}

export interface PlannedSection {
  /** Deterministic id: home:<component-lower>:<order index>. */
  id: string;
  component: RegistryComponent;
  variant: string;
  job: SectionJob;
  jobSecondary?: SectionJob;
  order: number;
  objectBindings: ObjectBinding[];
  mediaBindings: MediaBinding[];
  ctaBindings: PlannedCtaBinding[];
  responsiveIntent: ResponsiveIntent;
  mediaIntent: MediaIntent;
  /** Deterministic rule citations with evidence counts (SiteSpec rationale/provenance). */
  rationale: string[];
  /**
   * "planned": publishable. "proposed": needs owner approval before the
   * renderer may publish it (currently only the honest review empty state).
   */
  status: "planned" | "proposed";
  /** Editorial headline block; present only on the Hero (H1 lives here and only here). */
  headline?: HeadlinePlan;
}

/** Typed eligibility record per registry component (ineligible => omitted from sections). */
export interface EligibilityRecord {
  component: RegistryComponent;
  variant: string | null;
  eligible: boolean;
  ruleId: string;
  reason: string;
}

export interface CtaHierarchy {
  primary: PlannedCtaBinding | null;
  secondary: PlannedCtaBinding[];
  tertiary: PlannedCtaBinding[];
  /** The family-spec placement map: which tiers appear at nav/hero/section/footer. */
  placementMap: Array<{ placement: string; tiers: string[] }>;
  resolutionRationale: string[];
}

/** Headline rule: H1 is editorial identity copy, never the legal name by default. */
export interface HeadlinePlan {
  h1: string | null;
  source: "owner" | "source-site" | "derived" | "pending";
  usesLegalName: boolean;
  rule: string;
}

export interface ThemeReference {
  /** Theme referenced BY NAME; the token compiler owns the tokens. */
  name: string;
  source: "owner" | "family-default";
  /** Non-canonical design seeds with confidence tags (derived may seed; inferred never gates). */
  tokenSeeds: Array<{ token: string; value: string; confidence: "direct" | "derived"; note: string }>;
}

export interface HomePagePlan {
  planVersion: "fyd.planner@1";
  page: "home";
  /** Ordered page jobs (06-binding-model gap #1). */
  pageJobs: SectionJob[];
  sections: PlannedSection[];
  /** Full eligibility ledger: every registry component, eligible or not, with its rule. */
  eligibility: EligibilityRecord[];
  ctaHierarchy: CtaHierarchy;
  headline: HeadlinePlan;
  theme: ThemeReference;
  /** Cross-cutting rationale: signal consumption, tiebreaks, precedence notes. */
  plannerNotes: string[];
}

// ============================================================================
// LOCKED DATA TABLES (versioned with the spec; changing a value is a spec change)
// ============================================================================

export const PLANNER_VERSION = "fyd.planner@1";
export const MEDIA_SCORE_VERSION = "media-score@1";

/**
 * Emergency-prone trade evidence table (family-spec: "plumbing/HVAC/electrical
 * evidence"). Matched against canonical trade text (owner trade field +
 * service titles + scopes). The media spec assigns trade keyword sets to the
 * product lane as data; this table is that data for the planner's CTA
 * resolution. ownerIntent.tradeCategory outranks this table.
 */
const EMERGENCY_TRADE_SIGNALS: Array<{ trade: string; keywords: string[] }> = [
  { trade: "plumbing", keywords: ["plumb", "drain", "sewer", "water heater", "pipefitter"] },
  {
    trade: "hvac",
    keywords: [
      "hvac",
      "heating",
      "cooling",
      "air condition",
      "furnace",
      "heat pump",
      "mini-split",
      "minisplit",
      "refrigeration",
    ],
  },
  { trade: "electrical", keywords: ["electric", "electrician", "wiring", "panel upgrade"] },
];

/** Person roles that make a person an owner/founder for BusinessStory. */
const OWNER_FOUNDER_ROLES = new Set(["owner", "founder", "co-owner", "co-founder"]);

/** Service-area values too vague to count as named areas (family-spec: ineligible). */
const VAGUE_AREA_PATTERNS = [/^we serve/i, /service area/i, /surrounding/i, /\bthe area\b/i, /^local$/i];

/** Metric facts the metrics-strip counts (family-spec: >=2 to be eligible). */
const METRIC_FIELDS = ["license_number", "project_count", "years_in_business", "service_areas", "rating_summary"] as const;

/** Responsive contracts per component:variant, verbatim from the registry (semantic intent, never px). */
const RESPONSIVE_INTENT: Record<string, ResponsiveIntent> = {
  "Navigation:taxonomic": {
    mobile375: "collapses to logo + phone CTA + primary CTA button; sticky bottom call/estimate bar appears after hero on touch, never covers the primary CTA",
    mobile390: "collapses to logo + phone CTA + primary CTA button; sticky bottom call/estimate bar appears after hero on touch, never covers the primary CTA",
    desktop1440: "full taxonomy inline; trust strip may sit above the nav",
  },
  "Navigation:minimal": {
    mobile375: "logo + phone + primary CTA, conversion without scroll",
    mobile390: "logo + phone + primary CTA, conversion without scroll",
    desktop1440: "compact bar: logo, phone, primary CTA",
  },
  "Hero:media-rich": {
    mobile375: "banner-above-copy (image never behind small text at low contrast); CTAs stack full-width, thumb-reachable; trust strip becomes a horizontal snap row",
    mobile390: "banner-above-copy (image never behind small text at low contrast); CTAs stack full-width, thumb-reachable; trust strip becomes a horizontal snap row",
    desktop1440: "full-bleed image overlay with headline",
  },
  "Hero:identity-led": {
    mobile375: "editorial type-led stack; CTAs full-width, thumb-reachable",
    mobile390: "editorial type-led stack; CTAs full-width, thumb-reachable",
    desktop1440: "editorial type-led; mark and typography do the work",
  },
  "Hero:service-led": {
    mobile375: "subhead names the service lines; CTAs stack full-width",
    mobile390: "subhead names the service lines; CTAs stack full-width",
    desktop1440: "split: identity copy plus service-line route list",
  },
  "Hero:local-action": {
    mobile375: "phone CTA prominent full-width; service-area proof beside it",
    mobile390: "phone CTA prominent full-width; service-area proof beside it",
    desktop1440: "phone-forward hero with service-area proof",
  },
  "TrustBar:metrics-strip": {
    mobile375: "horizontal snap-scroll row",
    mobile390: "horizontal snap-scroll row",
    desktop1440: "metrics band under the hero",
  },
  "TrustBar:testimonial-cluster": {
    mobile375: "stacked cards, one per screen width",
    mobile390: "stacked cards, one per screen width",
    desktop1440: "3-column cards with quoted specificity intact",
  },
  "TrustBar:testimonial-cluster-empty-state": {
    mobile375: "single quiet honest card, one per screen width",
    mobile390: "single quiet honest card, one per screen width",
    desktop1440: "single quiet honest card",
  },
  "ServiceGrid:cards": {
    mobile375: "compact tiles: thumb, name, scope line, hook",
    mobile390: "compact tiles: thumb, name, scope line, hook",
    desktop1440: "2-4 column grid",
  },
  "ServiceGrid:featured-plus-grid": {
    mobile375: "featured card leads full-width; rest collapse to compact tiles",
    mobile390: "featured card leads full-width; rest collapse to compact tiles",
    desktop1440: "featured card spans; grid for the rest",
  },
  "ServiceGrid:media-grid": {
    mobile375: "single column, media top per card",
    mobile390: "single column, media top per card",
    desktop1440: "2-4 column media grid",
  },
  "FeaturedService:media-lead": {
    mobile375: "media top, scope, CTA; product funnel becomes progressive disclosure, never a cramped table",
    mobile390: "media top, scope, CTA; product funnel becomes progressive disclosure, never a cramped table",
    desktop1440: "split layout: media one side, scope + CTA + product select the other",
  },
  "FeaturedService:scope-lead": {
    mobile375: "scope copy leads; CTA below; product funnel becomes progressive disclosure",
    mobile390: "scope copy leads; CTA below; product funnel becomes progressive disclosure",
    desktop1440: "copy-forward split: scope one side, CTA the other",
  },
  "ProjectGallery:masonry": {
    mobile375: "projects as a horizontal carousel/snap row; per-card title, location, CTA",
    mobile390: "projects as a horizontal carousel/snap row; per-card title, location, CTA",
    desktop1440: "masonry grid",
  },
  "ProjectGallery:editorial": {
    mobile375: "projects as a horizontal carousel/snap row; per-card title, location, CTA",
    mobile390: "projects as a horizontal carousel/snap row; per-card title, location, CTA",
    desktop1440: "editorial feature layout with narrative",
  },
  "ProjectGallery:carousel": {
    mobile375: "contained horizontal band, snap row",
    mobile390: "contained horizontal band, snap row",
    desktop1440: "carousel band",
  },
  "BusinessStory:founder-led": {
    mobile375: "stacked portrait cards: portrait with name + role",
    mobile390: "stacked portrait cards: portrait with name + role",
    desktop1440: "side-by-side: story copy one side, portraits the other",
  },
  "BusinessStory:team-grid": {
    mobile375: "stacked cards: name, role, portrait when evidenced",
    mobile390: "stacked cards: name, role, portrait when evidenced",
    desktop1440: "team grid: name, role, portrait when evidenced",
  },
  "ServiceArea:area-list": {
    mobile375: "chips or compact list",
    mobile390: "chips or compact list",
    desktop1440: "named-areas band",
  },
  "ServiceArea:hub-address": {
    mobile375: "address block with tap-to-map and tap-to-call",
    mobile390: "address block with tap-to-map and tap-to-call",
    desktop1440: "address card + service-radius copy",
  },
  "ContactCTA:conversion-dual": {
    mobile375: "primary CTA thumb-reachable full-width; tap-to-call on the formatted number; schedule form becomes progressive disclosure",
    mobile390: "primary CTA thumb-reachable full-width; tap-to-call on the formatted number; schedule form becomes progressive disclosure",
    desktop1440: "framed block: emotional headline, dual buttons, contact grid",
  },
  "ContactCTA:value-capture": {
    mobile375: "single-column capture with the specific promise, never a generic subscribe",
    mobile390: "single-column capture with the specific promise, never a generic subscribe",
    desktop1440: "value-first capture band",
  },
  "Footer:credibility": {
    mobile375: "stacked sections, phone + primary CTA first (thumb-reachable), links as simple lists",
    mobile390: "stacked sections, phone + primary CTA first (thumb-reachable), links as simple lists",
    desktop1440: "multi-column grid: contact | services links | quick links | capture/social",
  },
  "Footer:credibility-plus-capture": {
    mobile375: "stacked sections, phone + primary CTA first, capture folded into the close",
    mobile390: "stacked sections, phone + primary CTA first, capture folded into the close",
    desktop1440: "multi-column grid with the tertiary capture folded into the close",
  },
  "AskFYD-entry:floating-entry": {
    mobile375: "thumb-reachable bottom corner, safe-area aware, never covers the sticky primary CTA",
    mobile390: "thumb-reachable bottom corner, safe-area aware, never covers the sticky primary CTA",
    desktop1440: "floating bottom corner; opens the ask surface on demand",
  },
  "AskFYD-entry:inline-section": {
    mobile375: "single quiet prompt card",
    mobile390: "single quiet prompt card",
    desktop1440: "quiet prompt card after proof sections",
  },
};

function responsiveIntentFor(component: RegistryComponent, variant: string): ResponsiveIntent {
  const hit = RESPONSIVE_INTENT[component + ":" + variant];
  if (hit) return hit;
  const fallback: ResponsiveIntent = {
    mobile375: "stacked single column, thumb-reachable actions",
    mobile390: "stacked single column, thumb-reachable actions",
    desktop1440: "family default layout",
  };
  return fallback;
}

/** The family-spec placement map: which CTA tiers appear where. */
const PLACEMENT_MAP: Array<{ placement: string; tiers: string[] }> = [
  { placement: "navigation", tiers: ["primary (button)"] },
  { placement: "hero", tiers: ["primary", "secondary (S3 or service-line)"] },
  { placement: "trustbar", tiers: ["none: proof only"] },
  { placement: "servicegrid", tiers: ["secondary (S1 per card)"] },
  { placement: "featuredservice", tiers: ["primary (repeat on phone-primary sites)", "secondary (S1 / S2)"] },
  { placement: "projectgallery", tiers: ["secondary (S3: see all projects)", "secondary (S1 per project)"] },
  { placement: "businessstory", tiers: ["none: trust anchor"] },
  { placement: "servicearea", tiers: ["none"] },
  { placement: "contactcta", tiers: ["primary", "secondary", "tertiary (T1: value-capture variant)"] },
  { placement: "footer", tiers: ["primary (phone)", "tertiary (T1 / T2 / T3)"] },
  { placement: "askfyd-entry", tiers: ["ask-affordance only"] },
];

// ============================================================================
// PURE HELPERS (no I/O, no clock, no randomness)
// ============================================================================

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function fieldValue(o: PingObject, name: string): string {
  const v = o.fields[name];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.join(",");
  return "";
}

function fieldList(o: PingObject, name: string): string[] {
  const v = o.fields[name];
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string" && x.trim() !== "");
  if (typeof v === "string" && v.trim() !== "") return [v.trim()];
  return [];
}

interface Grouped {
  owner: PingObject | null;
  services: PingObject[];
  products: PingObject[];
  locations: PingObject[];
  people: PingObject[];
  articles: PingObject[];
  posts: PingObject[];
}

/**
 * Role grouping, mirroring generator.ts: forward predicates (owner -> object)
 * plus inverse predicates (object -> owner), canonical order, id-sorted,
 * public visibility only, owner-presentation hidden overrides excluded.
 */
function groupRoles(graph: ObjectGraph): Grouped {
  const objects = new Map(graph.objects.map((o) => [o.id, o]));
  const businesses = graph.objects
    .filter((o) => SCHEMA_ROLES.business.includes(o.schema) && o.visibility === "public")
    .sort(byId);
  const owner = businesses[0] ?? null;

  const related = (role: FYDSchemaRole): PingObject[] => {
    if (!owner) return [];
    const out = new Map<string, PingObject>();
    const predicates = ROLE_PREDICATES[role] ?? [];
    const inverse = INVERSE_ROLE_PREDICATES[role] ?? [];
    const schemas = SCHEMA_ROLES[role];
    for (const r of graph.relationships) {
      if (r.status !== "active") continue;
      let target: PingObject | undefined;
      if (r.subject === owner.id && predicates.includes(r.predicate)) {
        target = objects.get(r.object);
      } else if (r.object === owner.id && inverse.includes(r.predicate)) {
        target = objects.get(r.subject);
      } else {
        continue;
      }
      if (
        target &&
        schemas.includes(target.schema) &&
        target.visibility === "public" &&
        !target.ownerPresentationOverride?.hidden
      ) {
        out.set(target.id, target);
      }
    }
    return [...out.values()].sort(byId);
  };

  const posts = related("post");
  const articles = related("article");
  return {
    owner,
    services: related("service"),
    products: related("product"),
    locations: related("location"),
    people: related("person"),
    articles,
    posts,
  };
}

/** Minimal honest capability derivation for planPageFromGraph (graph-only input). */
function deriveCapabilities(g: Grouped): PlannerCapability[] {
  const caps: PlannerCapability[] = ["ask-affordance"];
  if (!g.owner) return caps;
  const phone = fieldValue(g.owner, "phone").trim();
  if (phone !== "") caps.push("phone-tap");
  if (fieldValue(g.owner, "hours").trim() !== "") caps.push("hours-display");
  // Address evidence comes through the graph field-name adapter: a direct
  // address field, location-object locality components, or the owner
  // locality. map-route needs street-level detail to be honest.
  const addr = adaptedAddress(g.owner, g.locations);
  if (addr.lines.length > 0) {
    caps.push("address-display");
    if (addr.streetLevel) caps.push("map-route");
  }
  if (fieldValue(g.owner, "socials").trim() !== "") caps.push("social-link");
  if (fieldList(g.owner, "content_links").length > 0) caps.push("content-link");
  if (fieldValue(g.owner, "newsletter").trim() !== "") caps.push("newsletter-capture");
  // NOTE: estimate-path and schedule-path are NEVER derived from a bare
  // graph here. They are canonical conversion capabilities and must arrive
  // as explicit capability evidence in PlannerInput.capabilities.
  return caps;
}

/**
 * Deterministic US phone formatting. +1 E.164 becomes (XXX) XXX-XXXX.
 * Values that do not match are passed through untouched; the display value
 * is never raw E.164 when a format is recognized.
 */
export function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (/^1\d{10}$/.test(digits)) {
    const d = digits.slice(1);
    return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
  }
  if (/^\d{10}$/.test(digits)) {
    return "(" + digits.slice(0, 3) + ") " + digits.slice(3, 6) + "-" + digits.slice(6);
  }
  return raw;
}

function phoneTelTarget(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 10) return "tel:+" + (digits.length === 10 ? "1" + digits : digits);
  return "tel:" + raw;
}

/** Emergency-prone trade evidence (family-spec: plumbing/HVAC/electrical). Owner override wins. */
function isEmergencyTrade(g: Grouped, intent: OwnerIntent): boolean {
  if (intent.tradeCategory === "emergency") return true;
  if (intent.tradeCategory === "project") return false;
  if (!g.owner) return false;
  const haystack = (
    fieldValue(g.owner, "trade") +
    " " +
    g.services.map((s) => s.title + " " + adaptedServiceScope(s)).join(" ")
  ).toLowerCase();
  return EMERGENCY_TRADE_SIGNALS.some((t) => t.keywords.some((k) => haystack.includes(k)));
}

/** Distinct non-empty service scope texts (the service taxonomy signal). */
function distinctScopes(services: PingObject[]): string[] {
  const seen = new Set<string>();
  for (const s of services) {
    const scope = adaptedServiceScope(s).trim().toLowerCase();
    if (scope !== "") seen.add(scope);
  }
  return [...seen].sort();
}

/**
 * Service priority order: owner intent first, then the priority field rank,
 * then deterministic object-id tiebreak. Never alphabetical (family-spec
 * editorial ordering rule 1).
 */
function orderServicesByPriority(services: PingObject[], intent: OwnerIntent): PingObject[] {
  const rank = new Map<string, number>();
  (intent.servicePriority ?? []).forEach((id, i) => {
    if (!rank.has(id)) rank.set(id, i);
  });
  const fieldRank = (s: PingObject): number => {
    const p = fieldValue(s, "priority").trim();
    const n = Number(p);
    return p !== "" && Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
  };
  return [...services].sort((a, b) => {
    const ra = rank.get(a.id);
    const rb = rank.get(b.id);
    if (ra !== undefined || rb !== undefined) {
      const va = ra ?? Number.MAX_SAFE_INTEGER;
      const vb = rb ?? Number.MAX_SAFE_INTEGER;
      if (va !== vb) return va - vb;
    }
    const fa = fieldRank(a);
    const fb = fieldRank(b);
    if (fa !== fb) return fa - fb;
    return byId(a, b);
  });
}

/** Evidence-backed flagship service id, or null. */
function flagshipServiceId(services: PingObject[], intent: OwnerIntent): string | null {
  const ids = new Set(services.map((s) => s.id));
  for (const id of intent.featuredServiceIds ?? []) {
    if (ids.has(id)) return id;
  }
  const ranked = services.filter((s) => {
    const p = fieldValue(s, "priority").trim();
    return p === "1";
  });
  if (ranked.length === 1) return ranked[0].id;
  return null;
}

/** Named specific reviews: reviewer name + full text + what was done. */
interface NamedReview {
  id: string;
  reviewerName: string;
}
function namedReviews(items: PingObject[]): NamedReview[] {
  const out: NamedReview[] = [];
  for (const o of items) {
    const reviewerName = fieldValue(o, "reviewer_name").trim();
    const text = (o.description + " " + fieldValue(o, "review_text")).trim();
    const workDone = (o.title + " " + fieldValue(o, "work_done")).trim();
    if (reviewerName !== "" && text !== "" && workDone !== "") {
      out.push({ id: o.id, reviewerName });
    }
  }
  return out.sort(byId);
}

/** People with an owner/founder role and a name. */
function ownerFounders(people: PingObject[]): PingObject[] {
  return people
    .filter((p) => {
      const role = fieldValue(p, "role").trim().toLowerCase();
      const name = (p.title || fieldValue(p, "name")).trim();
      return OWNER_FOUNDER_ROLES.has(role) && name !== "";
    })
    .sort(byId);
}

/** Named people with roles (any role). */
function namedPeopleWithRoles(people: PingObject[]): PingObject[] {
  return people
    .filter((p) => {
      const role = fieldValue(p, "role").trim();
      const name = (p.title || fieldValue(p, "name")).trim();
      return role !== "" && name !== "";
    })
    .sort(byId);
}

/** Named service areas: owner service_areas minus vague values, plus location titles. */
function namedServiceAreas(g: Grouped): string[] {
  if (!g.owner) return [];
  const areas = fieldList(g.owner, "service_areas").filter(
    (a) => !VAGUE_AREA_PATTERNS.some((re) => re.test(a)),
  );
  for (const l of g.locations) {
    if (l.title.trim() !== "") areas.push(l.title.trim());
  }
  return [...new Set(areas)].sort();
}

/** Verifiable metric facts on the owner (family-spec TrustBar required fields). */
function metricFacts(owner: PingObject): string[] {
  const facts: string[] = [];
  for (const f of METRIC_FIELDS) {
    if (f === "service_areas") {
      if (fieldList(owner, f).some((a) => !VAGUE_AREA_PATTERNS.some((re) => re.test(a)))) facts.push(f);
    } else if (fieldValue(owner, f).trim() !== "") {
      facts.push(f);
    }
  }
  return facts;
}

// --- Media availability index: the planner's read-only view of scored media ---

/**
 * DEPICTS-PERSON RULE (family-spec 9-role media vocabulary; planner-owned
 * binding contract, enforced here in exactly one place): an asset may bind
 * to the owner-portrait or team-photo media role ONLY when it carries
 * depicts-person evidence, a depictsPersonId that references a person
 * object in the graph. Without it the asset is ineligible for those roles
 * regardless of score. (The scorer's owner-portrait bar has minRelevance
 * 0.0, so product photos pass it; binding one as a portrait would be a
 * wrong-media hard-gate failure.) Every binding path reads through the
 * MediaIndex pools (best/passing/passingForObject/passingUnbound), so
 * filtering at index time covers all of them. This is a binding gate, not
 * a re-score: the planner still never touches the scorer's numbers.
 */
const PERSON_PORTRAIT_ROLES: ReadonlySet<PlannerMediaRole> = new Set([
  "owner-portrait",
  "team-photo",
]);

export function portraitRoleBindable(
  asset: ScoredMediaAsset,
  personIds: ReadonlySet<string>,
): boolean {
  if (!PERSON_PORTRAIT_ROLES.has(asset.role)) return true;
  const id = (asset.depictsPersonId ?? "").trim();
  return id !== "" && personIds.has(id);
}

interface MediaIndex {
  /** Best passing asset per role, deterministic: score desc, assetId asc. */
  best(role: PlannerMediaRole): ScoredMediaAsset | null;
  /** All passing assets for a role, deterministic order. */
  passing(role: PlannerMediaRole): ScoredMediaAsset[];
  /** Passing assets for a role bound to a specific object id. */
  passingForObject(role: PlannerMediaRole, objectId: string): ScoredMediaAsset[];
  /** Passing unbound assets for a role (the generic pool). */
  passingUnbound(role: PlannerMediaRole): ScoredMediaAsset[];
}

function indexMedia(
  availability: MediaAvailability | undefined,
  personIds: ReadonlySet<string>,
): MediaIndex {
  const byRole = new Map<PlannerMediaRole, ScoredMediaAsset[]>();
  for (const a of availability?.assets ?? []) {
    if (!a.passed) continue; // the planner never sees failed assets as bindable
    if (!portraitRoleBindable(a, personIds)) continue; // depicts-person gate
    const list = byRole.get(a.role) ?? [];
    list.push(a);
    byRole.set(a.role, list);
  }
  for (const list of byRole.values()) {
    list.sort((x, y) =>
      y.score !== x.score ? y.score - x.score : x.assetId < y.assetId ? -1 : x.assetId > y.assetId ? 1 : 0,
    );
  }
  const passing = (role: PlannerMediaRole): ScoredMediaAsset[] => byRole.get(role) ?? [];
  return {
    passing,
    best: (role) => passing(role)[0] ?? null,
    passingForObject: (role, objectId) =>
      passing(role).filter((a) => (a.objectIds ?? []).includes(objectId)),
    passingUnbound: (role) => passing(role).filter((a) => (a.objectIds ?? []).length === 0),
  };
}

/** Validate the design signal. A bad authority marker discards the whole signal. */
function sanitizeSignal(signal: DesignSignal | null | undefined): {
  signal: DesignSignal | null;
  note: string | null;
} {
  if (!signal) return { signal: null, note: null };
  if (signal.authority !== "signal-not-authority") {
    return {
      signal: null,
      note:
        "designSignal discarded: authority marker missing or wrong " +
        "(presentation-observations.md A.12 requires the literal signal-not-authority)",
    };
  }
  return { signal, note: null };
}

// ============================================================================
// PLANNING CONTEXT
// ============================================================================

interface Facts {
  heroVariant: string;
  heroRuleId: string;
  heroMediaAsset: ScoredMediaAsset | null;
  logoMarkAsset: ScoredMediaAsset | null;
  brandVoice: string;
  metricsFacts: string[];
  metricsEligible: boolean;
  featuredIds: string[];
  featuredEligible: boolean;
  serviceGridEligible: boolean;
  serviceGridVariant: string;
  serviceMediaById: Map<string, MediaBinding>;
  galleryItems: PingObject[];
  galleryEligible: boolean;
  galleryVariant: string;
  reviews: NamedReview[];
  clusterEligible: boolean;
  emptyStateProposed: boolean;
  storyPeople: PingObject[];
  storyEligible: boolean;
  storyVariant: string;
  namedAreas: string[];
  areaEligible: boolean;
  areaVariant: string;
  navVariant: string;
  footerVariant: string;
  newsletterEvidence: boolean;
  locationEvidence: boolean;
}

interface PlanCtx {
  g: Grouped;
  caps: Set<PlannerCapability>;
  media: MediaIndex;
  signal: DesignSignal | null;
  intent: OwnerIntent;
  emergency: boolean;
  phone: string;
  phoneDisplay: string;
  servicesOrdered: PingObject[];
  distinctLineCount: number;
  facts: Facts;
  primary: PlannedCtaBinding | null;
  notes: string[];
  eligibility: EligibilityRecord[];
  sections: PlannedSection[];
}

function pushEligibility(
  ctx: PlanCtx,
  component: RegistryComponent,
  variant: string | null,
  eligible: boolean,
  ruleId: string,
  reason: string,
): void {
  ctx.eligibility.push({ component, variant, eligible, ruleId, reason });
}

function makeSection(
  ctx: PlanCtx,
  component: RegistryComponent,
  variant: string,
  job: SectionJob,
  jobSecondary: SectionJob | undefined,
  objectBindings: ObjectBinding[],
  mediaBindings: MediaBinding[],
  ctaBindings: PlannedCtaBinding[],
  rationale: string[],
  status: "planned" | "proposed" = "planned",
): PlannedSection {
  const order = ctx.sections.length;
  const treatment: MediaIntent["treatment"] =
    ctx.signal?.imageFinish === "documentary"
      ? "documentary"
      : ctx.signal?.imageFinish === "polished"
        ? "polished"
        : ctx.signal?.imageFinish === "mixed"
          ? "mixed"
          : "none";
  return {
    id: "home:" + component.toLowerCase() + ":" + order,
    component,
    variant,
    job,
    ...(jobSecondary ? { jobSecondary } : {}),
    order,
    objectBindings,
    mediaBindings,
    ctaBindings,
    responsiveIntent: responsiveIntentFor(component, variant),
    mediaIntent: { treatment, relevanceBar: MEDIA_SCORE_VERSION },
    rationale,
    status,
  };
}

// ============================================================================
// ELIGIBILITY FACTS (computed once, in registry order, before section build)
// ============================================================================

function computeFacts(
  g: Grouped,
  media: MediaIndex,
  signal: DesignSignal | null,
  intent: OwnerIntent,
  emergency: boolean,
  caps: Set<PlannerCapability>,
): Facts {
  const servicesOrdered = orderServicesByPriority(g.services, intent);
  const distinctLineCount = distinctScopes(g.services).length;

  // --- Hero variant chain (family-spec IF/THEN, ordered ELSE chain) ---
  const heroMediaAsset = media.best("hero-documentary");
  const logoMarkAsset = media.best("logo-mark");
  const brandVoice = (intent.brandVoiceLine ?? intent.sourceHeadline ?? "").trim();
  const densityLow = signal?.imageDensityBand === "low";
  const phone = g.owner ? fieldValue(g.owner, "phone").trim() : "";
  const namedAreasPre = namedServiceAreas(g);
  const locationEvidence =
    namedAreasPre.length >= 1 || adaptedAddress(g.owner, g.locations).lines.length > 0;

  let heroVariant: string;
  let heroRuleId: string;
  if (heroMediaAsset && !densityLow) {
    heroVariant = "media-rich";
    heroRuleId = "HERO-V1";
  } else if (logoMarkAsset && brandVoice !== "") {
    heroVariant = "identity-led";
    heroRuleId = "HERO-V2";
  } else if (g.services.length >= 4 || distinctLineCount >= 2) {
    heroVariant = "service-led";
    heroRuleId = "HERO-V3";
  } else if (emergency && phone !== "" && locationEvidence) {
    heroVariant = "local-action";
    heroRuleId = "HERO-V4";
  } else {
    heroVariant = "identity-led";
    heroRuleId = "HERO-V5";
  }

  // --- TrustBar metrics-strip ---
  const metricsFacts = g.owner ? metricFacts(g.owner) : [];
  const metricsEligible = metricsFacts.length >= 2;

  // --- FeaturedService: distinct buying units, max 3 distinct objects ---
  let featuredIds: string[] = [];
  if (intent.serviceLinesAsBuyingUnits) {
    featuredIds = servicesOrdered.slice(0, 3).map((s) => s.id);
  } else {
    const byScope = new Map<string, PingObject[]>();
    for (const s of servicesOrdered) {
      const scope = adaptedServiceScope(s).trim().toLowerCase();
      if (scope === "") continue;
      const list = byScope.get(scope) ?? [];
      list.push(s);
      byScope.set(scope, list);
    }
    const scopes = [...byScope.keys()].sort();
    featuredIds = scopes.slice(0, 3).map((sc) => (byScope.get(sc) as PingObject[])[0].id);
  }
  const featuredEligible = featuredIds.length >= 2;

  // --- ServiceGrid ---
  const serviceGridEligible = g.services.length >= 2;
  const serviceMediaById = new Map<string, MediaBinding>();
  if (serviceGridEligible) {
    const usedGridAssets = new Set<string>();
    for (const s of servicesOrdered) {
      const m = takeDistinctServiceMedia(media, s, usedGridAssets);
      if (m) {
        serviceMediaById.set(s.id, { role: m.role, assetId: m.assetId, objectId: s.id });
      }
    }
  }
  const coverage =
    servicesOrdered.length > 0 ? serviceMediaById.size / servicesOrdered.length : 0;
  const flagship = flagshipServiceId(g.services, intent);
  let serviceGridVariant = "cards";
  if (coverage >= 0.6) serviceGridVariant = "media-grid";
  else if (g.services.length >= 4 && flagship) serviceGridVariant = "featured-plus-grid";

  // --- ProjectGallery: >=2 gallery-quality items or INELIGIBLE (never degraded) ---
  const published = [...g.posts, ...g.articles].sort(byId);
  const galleryItems = published.filter(
    (o) => o.title.trim() !== "" && media.passingForObject("project-photo", o.id).length >= 1,
  );
  const galleryEligible = galleryItems.length >= 2;
  let galleryVariant = "carousel";
  if (galleryItems.length >= 6) {
    galleryVariant = "masonry";
  } else if (galleryItems.length >= 2) {
    const storied = galleryItems.filter((o) => {
      const narrative = (o.description + " " + fieldValue(o, "narrative")).trim();
      const location = fieldValue(o, "location").trim();
      return narrative !== "" && location !== "";
    });
    if (storied.length >= Math.ceil(galleryItems.length / 2)) galleryVariant = "editorial";
  }

  // --- TrustBar testimonial-cluster ---
  const reviews = namedReviews(published);
  const clusterEligible = reviews.length >= 1;
  const emptyStateProposed =
    !clusterEligible && intent.honestEmptyStateAllowed !== false;

  // --- BusinessStory ---
  const storyPeople = ownerFounders(g.people);
  const storyEligible = storyPeople.length >= 1;
  const storyVariant = namedPeopleWithRoles(g.people).length >= 3 ? "team-grid" : "founder-led";

  // --- ServiceArea ---
  const namedAreas = namedAreasPre;
  // Address and radius evidence come through the graph field-name
  // adapter: location-object locality components compose the address
  // lines; the radius is an explicit field or the owner's own
  // service-region claim. No evidence => the section stays ineligible.
  const address = adaptedAddress(g.owner, g.locations).lines[0] ?? "";
  const radiusEvidence = adaptedServiceRadius(g.owner) !== "";
  const areaEligible = namedAreas.length >= 2 || (address !== "" && radiusEvidence);
  const areaVariant = namedAreas.length >= 2 ? "area-list" : "hub-address";

  // --- Navigation / Footer / newsletter ---
  const navVariant = g.services.length >= 4 || distinctLineCount >= 2 ? "taxonomic" : "minimal";
  const newsletterEvidence =
    caps.has("newsletter-capture") || intent.newsletter !== undefined;
  const footerVariant = newsletterEvidence ? "credibility-plus-capture" : "credibility";

  return {
    heroVariant,
    heroRuleId,
    heroMediaAsset,
    logoMarkAsset,
    brandVoice,
    metricsFacts,
    metricsEligible,
    featuredIds,
    featuredEligible,
    serviceGridEligible,
    serviceGridVariant,
    serviceMediaById,
    galleryItems,
    galleryEligible,
    galleryVariant,
    reviews,
    clusterEligible,
    emptyStateProposed,
    storyPeople,
    storyEligible,
    storyVariant,
    namedAreas,
    areaEligible,
    areaVariant,
    navVariant,
    footerVariant,
    newsletterEvidence,
    locationEvidence,
  };
}

// ============================================================================
// SECTION BUILDERS (fixed family order; ineligible sections omitted)
// ============================================================================

function buildNavigation(ctx: PlanCtx): void {
  const { g, facts, intent } = ctx;
  const owner = g.owner as PingObject;
  const taxonomic = facts.navVariant === "taxonomic";
  const objectBindings: ObjectBinding[] = [{ role: "business", objectIds: [owner.id] }];
  if (taxonomic) {
    objectBindings.push({ role: "service", objectIds: ctx.servicesOrdered.map((s) => s.id) });
  }
  const mediaBindings: MediaBinding[] = [];
  if (facts.logoMarkAsset) {
    mediaBindings.push({ role: "logo-mark", assetId: facts.logoMarkAsset.assetId });
  }
  const ctaBindings: PlannedCtaBinding[] = [];
  if (ctx.primary) ctaBindings.push({ ...ctx.primary, placement: "navigation" });
  const rationale = [
    "NAV-ELIG: Navigation always present, exactly one per site (family-spec composition rules).",
    taxonomic
      ? "NAV-V-taxonomic: " +
        g.services.length +
        " services, " +
        ctx.distinctLineCount +
        " distinct service lines (>=4 services OR >=2 lines)."
      : "NAV-V-minimal: " + g.services.length + " services, no distinct lines; phone-first conversion.",
    facts.logoMarkAsset
      ? "NAV-MEDIA: logo-mark bound from scored media (asset " + facts.logoMarkAsset.assetId + "); never a fake logo."
      : "NAV-MEDIA: no passing logo-mark asset; business name in type is the fallback.",
  ];
  if (ctx.signal?.navLabels && ctx.signal.navLabels.length > 0) {
    rationale.push(
      "NAV-SIGNAL: source nav labels noted as a taxonomy hint (" +
        ctx.signal.navLabels.slice(0, 8).join(" | ") +
        "); labels never become services (signal-not-authority).",
    );
  }
  pushEligibility(ctx, "Navigation", facts.navVariant, true, "NAV-ELIG", "always present");
  ctx.sections.push(
    makeSection(ctx, "Navigation", facts.navVariant, "CONVERT", undefined, objectBindings, mediaBindings, ctaBindings, rationale),
  );
  void intent;
}

function buildHero(ctx: PlanCtx): void {
  const { g, facts } = ctx;
  const owner = g.owner as PingObject;
  const objectBindings: ObjectBinding[] = [{ role: "business", objectIds: [owner.id] }];
  const serviceIds = ctx.servicesOrdered.map((s) => s.id);
  if (serviceIds.length > 0) objectBindings.push({ role: "service", objectIds: serviceIds });
  if (facts.heroVariant === "local-action" && g.locations.length > 0) {
    objectBindings.push({ role: "location", objectIds: g.locations.map((l) => l.id).sort() });
  }
  const mediaBindings: MediaBinding[] = [];
  if (facts.heroVariant === "media-rich" && facts.heroMediaAsset) {
    mediaBindings.push({ role: "hero-documentary", assetId: facts.heroMediaAsset.assetId });
  } else if (facts.heroVariant === "identity-led" && facts.logoMarkAsset) {
    mediaBindings.push({ role: "logo-mark", assetId: facts.logoMarkAsset.assetId });
  }
  const ctaBindings: PlannedCtaBinding[] = [];
  if (ctx.primary) ctaBindings.push({ ...ctx.primary, placement: "hero" });
  if (facts.heroVariant === "service-led") {
    for (const s of ctx.servicesOrdered.slice(0, 3)) {
      ctaBindings.push({
        tier: "secondary",
        kind: "service-line",
        label: s.title,
        target: "#services",
        display: s.title,
        placement: "hero",
        contextObjectId: s.id,
      });
    }
  } else if (facts.galleryEligible) {
    ctaBindings.push({
      tier: "secondary",
      kind: "see-work",
      label: "See Our Work",
      target: "#projects",
      display: "See Our Work",
      placement: "hero",
    });
  } else if (serviceIds.length > 0) {
    ctaBindings.push({
      tier: "secondary",
      kind: "quote-start",
      label: "Start a quote",
      target: "#estimate",
      display: "Start a quote",
      placement: "hero",
    });
  }
  const rationale = [
    facts.heroRuleId +
      ": Hero variant " +
      facts.heroVariant +
      " (" +
      heroVariantReason(ctx) +
      ").",
    "HERO-JOB: PERSUADE. The H1 lives here and only here (one H1 per page).",
    facts.metricsFacts.length >= 2
      ? "HERO-TRUST: trust strip beneath hero (" + facts.metricsFacts.join(", ") + ")."
      : "HERO-TRUST: fewer than 2 metric facts; no trust strip invented.",
    "HERO-HEADLINE: " + headlineRationale(ctx),
  ];
  pushEligibility(ctx, "Hero", facts.heroVariant, true, facts.heroRuleId, "Hero always eligible; variant chain selects");
  const section = makeSection(
    ctx, "Hero", facts.heroVariant, "PERSUADE", undefined,
    objectBindings, mediaBindings, ctaBindings, rationale,
  );
  section.headline = resolveHeadline(ctx);
  ctx.sections.push(section);
}

function heroVariantReason(ctx: PlanCtx): string {
  const { facts } = ctx;
  switch (facts.heroRuleId) {
    case "HERO-V1":
      return ">=1 hero-documentary asset passed the relevance gate";
    case "HERO-V2":
      return "no passing hero media; logo-mark + brand-voice evidence present";
    case "HERO-V3":
      return "no passing hero media or brand voice; service taxonomy present";
    case "HERO-V4":
      return "emergency-prone trade with phone + location evidence; phone-forward conversion";
    default:
      return "fallback: identity-led with typographic treatment, never a fake photo";
  }
}

function buildTrustMetrics(ctx: PlanCtx): void {
  const { g, facts } = ctx;
  const owner = g.owner as PingObject;
  if (!facts.metricsEligible) {
    pushEligibility(
      ctx, "TrustBar", "metrics-strip", false, "TRUST-M-ELIG",
      "only " + facts.metricsFacts.length + " metric facts (<2 required); section omitted, nothing invented",
    );
    return;
  }
  pushEligibility(
    ctx, "TrustBar", "metrics-strip", true, "TRUST-M-ELIG",
    facts.metricsFacts.length + " verifiable metric facts: " + facts.metricsFacts.join(", "),
  );
  ctx.sections.push(
    makeSection(
      ctx, "TrustBar", "metrics-strip", "REASSURE", undefined,
      [{ role: "business", objectIds: [owner.id] }],
      [],
      [],
      [
        "TRUST-M-ELIG: >=2 metric facts exist (" + facts.metricsFacts.join(", ") + "); placed above the fold under the hero.",
        "TRUST-M-PROOF: every fact is evidence-backed or it does not render; no invented counts. Proof surface, no money CTAs.",
      ],
    ),
  );
}

/**
 * Infer a service line's business-trade key from its title using the
 * scorer's trade vocabulary (media-score@1, same vocabulary that produced
 * ScoredMediaAsset.onTrade). Returns null when the title carries no trade
 * keyword: the planner then cannot prove a trade match.
 */
function serviceTradeKey(title: string): string | null {
  const tokens = title.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.length === 0) return null;
  let best: string | null = null;
  let bestHits = 0;
  for (const trade of KNOWN_TRADES) {
    const kws: readonly string[] = TRADE_KEYWORDS[trade] ?? [];
    let hits = 0;
    for (const t of tokens) if (kws.includes(t)) hits++;
    if (hits > bestHits) {
      best = trade;
      bestHits = hits;
    }
  }
  return best;
}

/**
 * Bind at most one distinct asset per service line. Object-specific
 * evidence (asset bound to the service object) always wins. The unbound
 * pool binds only when the asset's winning trade matches the service
 * line's trade; when the line's trade is unknowable from its title, the
 * business-level relevance verdict is the evidence. Returns null when no
 * honest binding exists: the caller falls back to a media-optional
 * variant instead of repeating or misbinding imagery.
 */
function takeDistinctServiceMedia(
  media: MediaIndex,
  service: PingObject,
  usedAssetIds: Set<string>,
): ScoredMediaAsset | null {
  const objectSpecific =
    media.passingForObject("service-imagery", service.id)[0] ??
    media.passingForObject("work-detail", service.id)[0] ??
    media.passingForObject("project-photo", service.id)[0] ??
    null;
  if (objectSpecific && !usedAssetIds.has(objectSpecific.assetId)) {
    usedAssetIds.add(objectSpecific.assetId);
    return objectSpecific;
  }
  const tradeKey = serviceTradeKey(service.title);
  for (const role of ["service-imagery", "work-detail"] as const) {
    const next = media
      .passingUnbound(role)
      .find(
        (a) =>
          !usedAssetIds.has(a.assetId) &&
          (tradeKey === null || (a.onTrade ?? null) === tradeKey),
      );
    if (next) {
      usedAssetIds.add(next.assetId);
      return next;
    }
  }
  return null;
}

function buildFeaturedServices(ctx: PlanCtx): void {
  const { g, facts, caps } = ctx;
  if (!facts.featuredEligible) {
    pushEligibility(
      ctx, "FeaturedService", null, false, "FEAT-ELIG",
      "fewer than 2 distinct buying units; section omitted",
    );
    return;
  }
  const byIdMap = new Map(g.services.map((s) => [s.id, s]));
  const products = [...g.products].sort(byId);
  // One asset binds to at most one featured section, and only on a trade
  // match: a repeated image across service lines reads as template
  // filler, and a cross-trade image (condenser photo on Plumbing) is a
  // wrong-media hard-gate failure. When no honest binding exists, the
  // section falls back to scope-lead (media-optional).
  const usedFeaturedAssets = new Set<string>();
  facts.featuredIds.forEach((serviceId, i) => {
    const service = byIdMap.get(serviceId);
    if (!service) return;
    const lineMedia = takeDistinctServiceMedia(ctx.media, service, usedFeaturedAssets);
    const variant = lineMedia ? "media-lead" : "scope-lead";
    const boundProducts = products.filter((_, pi) => pi % facts.featuredIds.length === i).slice(0, 3);
    const objectBindings: ObjectBinding[] = [{ role: "service", objectIds: [serviceId] }];
    if (boundProducts.length > 0) {
      objectBindings.push({ role: "product", objectIds: boundProducts.map((p) => p.id) });
    }
    const mediaBindings: MediaBinding[] = [];
    if (lineMedia) {
      mediaBindings.push({ role: lineMedia.role, assetId: lineMedia.assetId, objectId: serviceId });
    }
    const ctaBindings: PlannedCtaBinding[] = [
      {
        tier: "secondary",
        kind: "quote-start",
        label: "Start a quote",
        target: "#estimate",
        display: "Start a quote",
        placement: "featuredservice",
        contextObjectId: serviceId,
      },
    ];
    if (boundProducts.length > 0 && caps.has("schedule-path")) {
      ctaBindings.push({
        tier: "secondary",
        kind: "schedule",
        label: "Schedule Installation",
        target: "#schedule",
        display: "Schedule Installation",
        placement: "featuredservice",
        contextObjectId: serviceId,
      });
    }
    if (ctx.primary && ctx.primary.kind === "call") {
      ctaBindings.push({ ...ctx.primary, placement: "featuredservice" });
    }
    pushEligibility(
      ctx, "FeaturedService", variant, true, "FEAT-ELIG",
      "service line " + serviceId + " is a distinct buying unit (" + (i + 1) + " of " + facts.featuredIds.length + ", max 3)",
    );
    ctx.sections.push(
      makeSection(
        ctx, "FeaturedService", variant, "PERSUADE", "CONVERT",
        objectBindings, mediaBindings, ctaBindings,
        [
          "FEAT-ELIG: >=2 service lines are distinct buying units; instance binds exactly one service object.",
          variant === "media-lead"
            ? "FEAT-V-media-lead: relevant imagery for this line passed the relevance gate."
            : "FEAT-V-scope-lead: strong scope text, weak/absent media; copy does the persuasion.",
          boundProducts.length > 0
            ? "FEAT-PRODUCT: " + boundProducts.length + " named products bound to the install funnel."
            : "FEAT-PRODUCT: no product objects; no funnel invented.",
        ],
      ),
    );
  });
}

function buildServiceGrid(ctx: PlanCtx): void {
  const { g, facts } = ctx;
  if (!facts.serviceGridEligible) {
    pushEligibility(
      ctx, "ServiceGrid", null, false, "SG-ELIG",
      g.services.length + " services (<2 required); section omitted",
    );
    return;
  }
  const objectBindings: ObjectBinding[] = [
    { role: "service", objectIds: ctx.servicesOrdered.map((s) => s.id) },
  ];
  const mediaBindings: MediaBinding[] = [];
  if (facts.serviceGridVariant === "media-grid") {
    for (const s of ctx.servicesOrdered) {
      const b = facts.serviceMediaById.get(s.id);
      if (b) mediaBindings.push(b);
    }
  }
  const ctaBindings: PlannedCtaBinding[] = ctx.servicesOrdered.map((s) => ({
    tier: "secondary" as CtaTier,
    kind: "quote-start" as const,
    label: "Start a quote",
    target: "#estimate",
    display: "Start a quote",
    placement: "servicegrid",
    contextObjectId: s.id,
  }));
  const variantRationale =
    facts.serviceGridVariant === "media-grid"
      ? "SG-V-media-grid: relevance-passing imagery covers " +
        facts.serviceMediaById.size +
        " of " +
        ctx.servicesOrdered.length +
        " cards (>=60%)."
      : facts.serviceGridVariant === "featured-plus-grid"
        ? "SG-V-featured-plus-grid: >=4 services with an evidence-backed priority flagship."
        : "SG-V-cards: flat service set, no single flagship; scan-and-convert.";
  pushEligibility(
    ctx, "ServiceGrid", facts.serviceGridVariant, true, "SG-ELIG",
    g.services.length + " services; " + variantRationale,
  );
  ctx.sections.push(
    makeSection(
      ctx, "ServiceGrid", facts.serviceGridVariant, "CONVERT", undefined,
      objectBindings, mediaBindings, ctaBindings,
      [
        "SG-ELIG: multiple service objects -> ServiceGrid eligible.",
        variantRationale,
        "SG-ORDER: services in business-priority order, never alphabetical; per-card conversion hooks.",
      ],
    ),
  );
}

function buildProjectGallery(ctx: PlanCtx): void {
  const { facts } = ctx;
  if (!facts.galleryEligible) {
    pushEligibility(
      ctx, "ProjectGallery", null, false, "PG-ELIG",
      "only " + facts.galleryItems.length + " gallery-quality items (<2 with relevance-passing media); gallery INELIGIBLE, never degraded",
    );
    return;
  }
  const objectBindings: ObjectBinding[] = [
    { role: "project", objectIds: facts.galleryItems.map((o) => o.id) },
  ];
  const mediaBindings: MediaBinding[] = [];
  for (const item of facts.galleryItems) {
    const asset = ctx.media.passingForObject("project-photo", item.id)[0];
    if (asset) {
      mediaBindings.push({ role: "project-photo", assetId: asset.assetId, objectId: item.id });
    }
  }
  const ctaBindings: PlannedCtaBinding[] = [
    {
      tier: "secondary",
      kind: "see-work",
      label: "See all projects",
      target: "#projects",
      display: "See all projects",
      placement: "projectgallery",
    },
  ];
  for (const item of facts.galleryItems) {
    ctaBindings.push({
      tier: "secondary",
      kind: "quote-start",
      label: "Start a similar project",
      target: "#estimate",
      display: "Start a similar project",
      placement: "projectgallery",
      contextObjectId: item.id,
    });
  }
  const variantRationale =
    facts.galleryVariant === "masonry"
      ? "PG-V-masonry: >=6 items with passing project-photo media; browse-density proof of volume."
      : facts.galleryVariant === "editorial"
        ? "PG-V-editorial: items carry narrative + location text; storytelling proof."
        : "PG-V-carousel: 2-4 items; contained band without scroll fatigue.";
  pushEligibility(
    ctx, "ProjectGallery", facts.galleryVariant, true, "PG-ELIG",
    facts.galleryItems.length + " gallery-quality items; " + variantRationale,
  );
  ctx.sections.push(
    makeSection(
      ctx, "ProjectGallery", facts.galleryVariant, "PROVE", undefined,
      objectBindings, mediaBindings, ctaBindings,
      [
        "PG-ELIG: >=2 gallery-quality items with relevance-passing media.",
        variantRationale,
        "PG-HONESTY: missing media means fewer items, not filler; no stock, no cross-trade contamination.",
      ],
    ),
  );
}

const HONEST_EMPTY_STATE_DEFAULT =
  "We're building our public review portfolio. Ask us for references in your neighborhood.";

function buildTestimonials(ctx: PlanCtx): void {
  const { facts, intent } = ctx;
  if (facts.clusterEligible) {
    pushEligibility(
      ctx, "TrustBar", "testimonial-cluster", true, "TRUST-C-ELIG",
      facts.reviews.length + " named specific reviews; mid-page after proof surfaces",
    );
    ctx.sections.push(
      makeSection(
        ctx, "TrustBar", "testimonial-cluster", "PROVE", undefined,
        [{ role: "review", objectIds: facts.reviews.map((r) => r.id) }],
        [],
        [],
        [
          "TRUST-C-ELIG: >=1 named specific review exists; placed mid-page after proof, before ContactCTA, never appended at the end.",
          "TRUST-C-PROOF: specificity intact (reviewer name + full text + what was done); proof surface, no money CTAs.",
        ],
      ),
    );
    return;
  }
  if (!facts.emptyStateProposed) {
    pushEligibility(
      ctx, "TrustBar", "testimonial-cluster-empty-state", false, "TRUST-C-EMPTY",
      "no review evidence and owner opted out of the honest empty state; section omitted",
    );
    return;
  }
  pushEligibility(
    ctx, "TrustBar", "testimonial-cluster-empty-state", true, "TRUST-C-EMPTY",
    "no review evidence; honest empty state PROPOSED (the only component allowed one)",
  );
  ctx.sections.push(
    makeSection(
      ctx, "TrustBar", "testimonial-cluster-empty-state", "PROVE", undefined,
      [], [], [],
      [
        "TRUST-C-EMPTY: no named reviews; honest empty state proposed instead of fake stars.",
        "TRUST-C-COPY: " +
          (intent.honestEmptyStateCopy ? "owner-approved copy." : "family default honest copy; owner approval required before publish."),
        "TRUST-C-STATUS: proposed, not planned; the renderer must not publish without owner approval.",
      ],
      "proposed",
    ),
  );
}

function buildBusinessStory(ctx: PlanCtx): void {
  const { facts } = ctx;
  if (!facts.storyEligible) {
    pushEligibility(
      ctx, "BusinessStory", null, false, "STORY-ELIG",
      "no person with an owner/founder role and a name; never invent the story",
    );
    return;
  }
  const people =
    facts.storyVariant === "team-grid"
      ? namedPeopleWithRoles(ctx.g.people)
      : facts.storyPeople;
  const mediaBindings: MediaBinding[] = [];
  for (const p of people) {
    const portrait = ctx.media.passing("owner-portrait").find((a) => a.depictsPersonId === p.id);
    if (portrait) {
      mediaBindings.push({ role: "owner-portrait", assetId: portrait.assetId, depictsPersonId: p.id });
    }
  }
  const teamPhoto = ctx.media.best("team-photo");
  if (teamPhoto) mediaBindings.push({ role: "team-photo", assetId: teamPhoto.assetId });
  pushEligibility(
    ctx, "BusinessStory", facts.storyVariant, true, "STORY-ELIG",
    people.length + " bound people; variant " + facts.storyVariant,
  );
  ctx.sections.push(
    makeSection(
      ctx, "BusinessStory", facts.storyVariant, "REASSURE", undefined,
      [{ role: "person", objectIds: people.map((p) => p.id) }],
      mediaBindings,
      [],
      [
        facts.storyVariant === "team-grid"
          ? "STORY-V-team-grid: >=3 named people with roles; bench depth."
          : "STORY-V-founder-led: 1-2 owner/founder people; the trust anchor in craft voice.",
        "STORY-MEDIA: portraits render only when the media provably depicts the named person; never stock faces.",
        "STORY-JOB: REASSURE. No money CTAs on the trust anchor.",
      ],
    ),
  );
}

function buildServiceArea(ctx: PlanCtx): void {
  const { g, facts } = ctx;
  const owner = g.owner as PingObject;
  if (!facts.areaEligible) {
    pushEligibility(
      ctx, "ServiceArea", null, false, "AREA-ELIG",
      "vague coverage evidence only; render nothing rather than 'We serve your area.'",
    );
    return;
  }
  const objectBindings: ObjectBinding[] = [{ role: "business", objectIds: [owner.id] }];
  if (g.locations.length > 0) {
    objectBindings.push({ role: "location", objectIds: g.locations.map((l) => l.id).sort() });
  }
  const mediaBindings: MediaBinding[] = [];
  const locationPhoto = ctx.media.best("location-photo");
  if (locationPhoto) mediaBindings.push({ role: "location-photo", assetId: locationPhoto.assetId });
  pushEligibility(
    ctx, "ServiceArea", facts.areaVariant, true, "AREA-ELIG",
    facts.areaVariant === "area-list"
      ? facts.namedAreas.length + " named service areas"
      : "physical address with service-radius evidence",
  );
  ctx.sections.push(
    makeSection(
      ctx, "ServiceArea", facts.areaVariant, "REASSURE", undefined,
      objectBindings, mediaBindings, [],
      [
        facts.areaVariant === "area-list"
          ? "AREA-V-area-list: local proof via named places (" + facts.namedAreas.join(", ") + ")."
          : "AREA-V-hub-address: anchored to a real place with service-radius evidence.",
        "AREA-HONESTY: no rendered map pins beyond evidenced locations.",
      ],
    ),
  );
}

function buildContactCtas(ctx: PlanCtx): void {
  const { g, facts, caps } = ctx;
  const owner = g.owner as PingObject;
  if (!ctx.primary) {
    pushEligibility(
      ctx, "ContactCTA", null, false, "CTA-ELIG",
      "primary CTA binding not resolvable (no phone, no estimate path, no schedule path); section omitted",
    );
    return;
  }
  const objectBindings: ObjectBinding[] = [{ role: "business", objectIds: [owner.id] }];
  if (ctx.servicesOrdered.length > 0) {
    objectBindings.push({ role: "service", objectIds: ctx.servicesOrdered.map((s) => s.id) });
  }
  const ctaBindings: PlannedCtaBinding[] = [{ ...ctx.primary, placement: "contactcta" }];
  ctaBindings.push({
    tier: "secondary",
    kind: "quote-start",
    label: "Start a quote",
    target: "#estimate",
    display: "Start a quote",
    placement: "contactcta",
  });
  if (caps.has("schedule-path")) {
    ctaBindings.push({
      tier: "secondary",
      kind: "schedule",
      label: "Schedule Installation",
      target: "#schedule",
      display: "Schedule Installation",
      placement: "contactcta",
    });
  }
  const mediaBindings: MediaBinding[] = [];
  const backdrop = ctx.media.best("hero-documentary") ?? ctx.media.best("owner-portrait");
  if (backdrop) {
    mediaBindings.push({ role: backdrop.role, assetId: backdrop.assetId });
  }
  pushEligibility(ctx, "ContactCTA", "conversion-dual", true, "CTA-ELIG", "primary CTA resolvable; the closing argument before the footer");
  ctx.sections.push(
    makeSection(
      ctx, "ContactCTA", "conversion-dual", "CONVERT", undefined,
      objectBindings, mediaBindings, ctaBindings,
      [
        "CTA-ELIG: primary CTA binding resolvable.",
        "CTA-V-conversion-dual: DEFAULT variant; emotional framing + dual CTAs + formatted contact block.",
        "CTA-PHONE: phone numbers always formatted, never raw E.164; never 'Visit website' as a CTA.",
      ],
    ),
  );
  if (facts.newsletterEvidence) {
    const label = ctx.intent.newsletter?.label ?? "Stay Ahead of Home Maintenance";
    const promise = ctx.intent.newsletter?.promise ?? "No spam, ever.";
    pushEligibility(ctx, "ContactCTA", "value-capture", true, "CTA-VC-ELIG", "repeat-value content evidence; retains the not-ready-yet visitor");
    ctx.sections.push(
      makeSection(
        ctx, "ContactCTA", "value-capture", "CONVERT", undefined,
        [{ role: "business", objectIds: [owner.id] }],
        [],
        [
          {
            tier: "tertiary",
            kind: "newsletter",
            label,
            target: "#newsletter",
            display: label + ": " + promise,
            placement: "contactcta",
          },
        ],
        [
          "CTA-VC-ELIG: evidence of repeat-value content; value-first capture with a specific promise.",
          "CTA-VC-COPY: " + (ctx.intent.newsletter ? "owner-provided label/promise." : "family default from the HPP reference; owner may edit through FYD."),
        ],
      ),
    );
  }
}

function buildAskFyd(ctx: PlanCtx): void {
  pushEligibility(ctx, "AskFYD-entry", "floating-entry", true, "ASK-ELIG", "site capability; one quiet entry per page");
  ctx.sections.push(
    makeSection(
      ctx, "AskFYD-entry", "floating-entry", "SERVE", undefined,
      [], [],
      [],
      [
        "ASK-ELIG: always eligible (site capability); floating-entry default on the home page.",
        "ASK-QUIET: ask-affordance only; the full evidence panel never appears on the public surface.",
      ],
    ),
  );
}

function buildFooter(ctx: PlanCtx): void {
  const { g, facts, caps } = ctx;
  const owner = g.owner as PingObject;
  const objectBindings: ObjectBinding[] = [{ role: "business", objectIds: [owner.id] }];
  if (ctx.servicesOrdered.length > 0) {
    objectBindings.push({ role: "service", objectIds: ctx.servicesOrdered.map((s) => s.id) });
  }
  if (g.locations.length > 0) {
    objectBindings.push({ role: "location", objectIds: g.locations.map((l) => l.id).sort() });
  }
  const content = [...g.posts, ...g.articles].sort(byId).slice(0, 6);
  if (content.length > 0) {
    objectBindings.push({ role: "content", objectIds: content.map((o) => o.id) });
  }
  const mediaBindings: MediaBinding[] = [];
  if (facts.logoMarkAsset) {
    mediaBindings.push({ role: "logo-mark", assetId: facts.logoMarkAsset.assetId });
  }
  const ctaBindings: PlannedCtaBinding[] = [];
  if (ctx.phone !== "") {
    ctaBindings.push({
      tier: "primary",
      kind: "call",
      label: "Call",
      target: phoneTelTarget(ctx.phone),
      display: ctx.phoneDisplay,
      placement: "footer",
    });
  }
  if (facts.newsletterEvidence) {
    ctaBindings.push({
      tier: "tertiary",
      kind: "newsletter",
      label: ctx.intent.newsletter?.label ?? "Stay Ahead of Home Maintenance",
      target: "#newsletter",
      display: ctx.intent.newsletter?.label ?? "Stay Ahead of Home Maintenance",
      placement: "footer",
    });
  }
  if (caps.has("social-link")) {
    ctaBindings.push({
      tier: "tertiary",
      kind: "social",
      label: "Follow",
      target: "#social",
      display: "Follow",
      placement: "footer",
    });
  }
  pushEligibility(ctx, "Footer", facts.footerVariant, true, "FOOTER-ELIG", "exactly one footer, always last; the credibility close");
  ctx.sections.push(
    makeSection(
      ctx, "Footer", facts.footerVariant, "CLOSE", undefined,
      objectBindings, mediaBindings, ctaBindings,
      [
        "FOOTER-ELIG: exactly one Footer per site, always last.",
        facts.footerVariant === "credibility-plus-capture"
          ? "FOOTER-V-credibility-plus-capture: tertiary capture folded into the close."
          : "FOOTER-V-credibility: full contact block, service links, quick trust links, copyright.",
        "FOOTER-NAME: the legal business name lives here (and small in nav), never as the H1.",
      ],
    ),
  );
}

// ============================================================================
// CTA HIERARCHY (family-spec CTA hierarchy model; one primary per page)
// ============================================================================

function resolveCtaHierarchy(ctx: Omit<PlanCtx, "primary" | "facts" | "notes" | "eligibility" | "sections"> & { facts?: Facts }): CtaHierarchy {
  const { g, caps, intent, emergency, phone, phoneDisplay } = ctx;
  const hasEstimate = caps.has("estimate-path");
  const hasSchedule = caps.has("schedule-path");
  const rationale: string[] = [];

  let primary: PlannedCtaBinding | null = null;
  let ruleId = "CTA-P5";
  const override = intent.primaryCta;
  const overrideValid =
    (override === "call" && phone !== "") || (override === "estimate" && hasEstimate);
  if (override && overrideValid) {
    ruleId = "CTA-OVERRIDE";
    rationale.push("CTA-OVERRIDE: owner bounded choice selected " + override + ".");
  } else if (override && !overrideValid) {
    rationale.push(
      "CTA-OVERRIDE: owner choice '" + override + "' not within eligible bounds; ignored, hierarchy resolves by evidence.",
    );
  }
  const kind: "call" | "estimate" | "schedule" | null =
    override && overrideValid
      ? override
      : emergency && phone !== ""
        ? "call"
        : hasEstimate
          ? "estimate"
          : phone !== ""
            ? "call"
            : hasSchedule
              ? "schedule"
              : null;
  if (!override || !overrideValid) {
    if (emergency && phone !== "" && kind === "call") ruleId = "CTA-P1";
    else if (hasEstimate && kind === "estimate") ruleId = "CTA-P2";
    else if (phone !== "" && kind === "call") ruleId = "CTA-P3";
    else if (hasSchedule && kind === "schedule") ruleId = "CTA-P4";
  }
  if (kind === "call") {
    primary = {
      tier: "primary",
      kind: "call",
      label: "Call",
      target: phoneTelTarget(phone),
      display: phoneDisplay,
      placement: "nav",
    };
    rationale.push(
      ruleId +
        ": primary = Call (" +
        phoneDisplay +
        "). " +
        (emergency
          ? "Emergency-prone trade with phone evidence: the phone IS the conversion."
          : "Phone evidence; estimate path absent."),
    );
  } else if (kind === "estimate") {
    primary = {
      tier: "primary",
      kind: "estimate",
      label: "Get an Estimate",
      target: "#estimate",
      display: "Get an Estimate",
      placement: "nav",
    };
    rationale.push(ruleId + ": primary = Get an Estimate (estimate/quote capability evidence).");
  } else if (kind === "schedule") {
    primary = {
      tier: "primary",
      kind: "schedule",
      label: "Schedule Installation",
      target: "#schedule",
      display: "Schedule Installation",
      placement: "nav",
    };
    rationale.push(ruleId + ": primary = Schedule Installation (schedule capability; no phone or estimate path).");
  } else {
    rationale.push("CTA-P5: no phone, no estimate path, no schedule path; primary unresolvable, ContactCTA ineligible.");
  }
  rationale.push("CTA-NEVER: the primary is never 'Visit website' (conversion abdication).");

  const secondary: PlannedCtaBinding[] = [
    {
      tier: "secondary",
      kind: "quote-start",
      label: "Start a quote",
      target: "#estimate",
      display: "Start a quote",
      placement: "servicegrid",
    },
  ];
  if (hasSchedule && g.products.length > 0) {
    secondary.push({
      tier: "secondary",
      kind: "schedule",
      label: "Schedule Installation",
      target: "#schedule",
      display: "Schedule Installation",
      placement: "featuredservice",
    });
  }

  const tertiary: PlannedCtaBinding[] = [];
  const newsletterEvidence =
    caps.has("newsletter-capture") || intent.newsletter !== undefined;
  if (newsletterEvidence) {
    tertiary.push({
      tier: "tertiary",
      kind: "newsletter",
      label: intent.newsletter?.label ?? "Stay Ahead of Home Maintenance",
      target: "#newsletter",
      display: intent.newsletter?.label ?? "Stay Ahead of Home Maintenance",
      placement: "footer",
    });
  }
  if (caps.has("content-link") || g.articles.length + g.posts.length > 0) {
    tertiary.push({
      tier: "tertiary",
      kind: "content",
      label: "Tips and project stories",
      target: "#content",
      display: "Tips and project stories",
      placement: "footer",
    });
  }
  if (caps.has("social-link")) {
    tertiary.push({
      tier: "tertiary",
      kind: "social",
      label: "Follow",
      target: "#social",
      display: "Follow",
      placement: "footer",
    });
  }

  return {
    primary,
    secondary,
    tertiary,
    placementMap: PLACEMENT_MAP,
    resolutionRationale: rationale,
  };
}

function headlineRationale(ctx: PlanCtx): string {
  const h = resolveHeadline(ctx);
  if (h.source === "pending") {
    return "H1 pending: no owner/source/derived headline evidence; the renderer must NOT fall back to the legal business name.";
  }
  return "H1 from " + h.source + " evidence.";
}

/**
 * Headline rule: H1 is editorial identity copy, never the legal business
 * name by default. Source hierarchy: owner > source-site > derived > never.
 * The planner never invents the line; absent evidence => pending.
 */
function resolveHeadline(ctx: PlanCtx): HeadlinePlan {
  const intent = ctx.intent;
  const rule =
    "H1 is editorial identity copy, never the legal business name by default. The legal name lives in the nav and footer.";
  const ownerLine = (intent.headline ?? "").trim();
  if (ownerLine !== "") {
    return { h1: ownerLine, source: "owner", usesLegalName: intent.headlineUsesLegalName === true, rule };
  }
  const sourceLine = (intent.sourceHeadline ?? "").trim();
  if (sourceLine !== "") {
    return { h1: sourceLine, source: "source-site", usesLegalName: false, rule };
  }
  const derivedLine = (intent.derivedHeadlineLine ?? "").trim();
  if (derivedLine !== "") {
    return { h1: derivedLine, source: "derived", usesLegalName: false, rule };
  }
  return { h1: null, source: "pending", usesLegalName: false, rule };
}

// ============================================================================
// ENTRY POINTS
// ============================================================================

/**
 * Catalog-driven deterministic home page plan. Same inputs -> same plan.
 * Returns null when no public business object exists (no owner, no site).
 */
export function planPage(input: PlannerInput): HomePagePlan | null {
  const g = groupRoles(input.graph);
  if (!g.owner) return null;

  const intent: OwnerIntent = input.ownerIntent ?? {};
  const caps = new Set<PlannerCapability>(input.capabilities ?? deriveCapabilities(g));
  const media = indexMedia(input.media, new Set(g.people.map((p) => p.id)));
  const { signal, note: signalNote } = sanitizeSignal(input.designSignal);
  const emergency = isEmergencyTrade(g, intent);
  const phone = fieldValue(g.owner, "phone").trim();
  const phoneDisplay = phone !== "" ? formatPhoneDisplay(phone) : "";
  const servicesOrdered = orderServicesByPriority(g.services, intent);
  const distinctLineCount = distinctScopes(g.services).length;
  const facts = computeFacts(g, media, signal, intent, emergency, caps);

  const notes: string[] = [];
  if (signalNote) notes.push(signalNote);
  if (signal) {
    notes.push(
      "designSignal consumed as signal only (authority=signal-not-authority): " +
        "image density band " +
        (signal.imageDensityBand ?? "unknown") +
        " gated the media-rich hero bar; " +
        "image finish " +
        (signal.imageFinish ?? "unknown") +
        " seeded per-section media treatment intent; " +
        "nav labels and section sequence recorded as tiebreak-grade hints only.",
    );
    if (signal.dominantPrimaryLabel) {
      notes.push(
        "designSignal dominant primary CTA label '" +
          signal.dominantPrimaryLabel +
          "' recorded as copy seed only; capabilities come from canonical evidence.",
      );
    }
  } else if (input.designSignal) {
    notes.push("no usable designSignal; family defaults govern design choices.");
  }
  notes.push(
    "precedence: owner intent > source signal > family default for design choices; " +
      "canonical graph evidence alone decides eligibility and facts.",
  );
  notes.push(
    "media bars owned by the scorer (" +
      MEDIA_SCORE_VERSION +
      "); the planner bound only passing assets and never lowered a bar to fill a slot.",
  );

  const partial = { g, caps, media, signal, intent, emergency, phone, phoneDisplay, servicesOrdered, distinctLineCount };
  const hierarchy = resolveCtaHierarchy(partial);

  // Gallery S3 secondary is part of the hierarchy once eligibility is known.
  if (facts.galleryEligible) {
    hierarchy.secondary.push({
      tier: "secondary",
      kind: "see-work",
      label: "See Our Work",
      target: "#projects",
      display: "See Our Work",
      placement: "projectgallery",
    });
  }

  const ctx: PlanCtx = {
    ...partial,
    facts,
    primary: hierarchy.primary,
    notes,
    eligibility: [],
    sections: [],
  };

  // Fixed family order; ineligible sections are omitted, order is preserved.
  buildNavigation(ctx);
  buildHero(ctx);
  buildTrustMetrics(ctx);
  buildFeaturedServices(ctx);
  buildServiceGrid(ctx);
  buildProjectGallery(ctx);
  buildTestimonials(ctx);
  buildBusinessStory(ctx);
  buildServiceArea(ctx);
  buildContactCtas(ctx);
  buildAskFyd(ctx);
  buildFooter(ctx);

  const headline = resolveHeadline(ctx);
  const theme: ThemeReference = {
    name: intent.themeName ?? "fyd-family-default",
    source: intent.themeName ? "owner" : "family-default",
    tokenSeeds:
      signal?.imageDensityBand
        ? [
            {
              token: "section-rhythm-intent",
              value: signal.imageDensityBand,
              confidence: "derived",
              note: "from presentation-observations A.5 density band; seeds rhythm intent, never a business fact",
            },
          ]
        : [],
  };

  return {
    planVersion: PLANNER_VERSION,
    page: "home",
    pageJobs: ctx.sections.map((s) => s.job),
    sections: ctx.sections,
    eligibility: ctx.eligibility,
    ctaHierarchy: hierarchy,
    headline,
    theme,
    plannerNotes: notes,
  };
}

/**
 * Thin entry for the future cutover: graph in, home page plan out.
 * Derives the minimal honest capability set from the graph (phone-tap when a
 * phone exists, ask-affordance always); estimate-path and schedule-path
 * need explicit capability evidence via planPage. No media, no signal,
 * no owner intent: the plan degrades deterministically to evidence-backed
 * variants, never to invented content.
 */
export function planPageFromGraph(
  graph: ObjectGraph,
  opts?: { themeName?: string },
): HomePagePlan | null {
  return planPage({
    graph,
    ownerIntent: opts?.themeName ? { themeName: opts.themeName } : {},
  });
}

/** The planner's catalog: component names in fixed family order. */
export const PLANNER_COMPONENT_ORDER: RegistryComponent[] = [
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
];
