/**
 * FYD family renderer: input and context types (product lane, V1).
 *
 * The family renderer turns a deterministic HomePagePlan (planner.ts) plus
 * the projected ObjectGraph into the PUBLIC site surface: exactly the 11
 * V1 family components, nothing else.
 *
 * Law (token-model 8.3): the renderer consumes COMPILED token output only,
 * referenced as Tailwind v4 @theme utilities or var(--fyd-...) custom
 * properties. No hex, no raw CSS, no Tailwind class strings in the plan.
 *
 * Law (07-surface-separation): owner chrome, evidence panels, and dev
 * diagnostics never enter this tree. See surfaces.tsx for the gated
 * sibling surfaces.
 */

import type { HomePagePlan, PlannedCtaBinding, PlannedSection } from "../proceduralize/planner";
import type { ObjectGraph } from "../sitespec/types";
import type { PingObject } from "@/lib/ping/types";
import { isKnownThemeId, type FYDThemeId } from "../sitespec/types";
import { resolveCompiledThemeById } from "../tokens/themes";

/** One acquired, relevance-passing media asset, ready to render. */
export interface MediaAssetRef {
  /** FYD-controlled derivative URL (Decision 1: ingest, never hotlink). */
  url: string;
  /** Alt text from evidence (object title, location, provenance note). Never invented. */
  alt: string;
  width?: number;
  height?: number;
  /**
   * Responsive derivatives for srcset/sizes, narrowest first. Present
   * when the media lane supplied real variants; absent for legacy
   * single-URL assets, which render as a plain img.
   */
  srcset?: Array<{ url: string; width: number }>;
}

/** Asset id -> renderable reference. Only relevance-passing assets belong here. */
export type MediaManifest = Record<string, MediaAssetRef>;

/**
 * Everything the public page needs. The plan is data (intent only); the
 * graph is the projected source of truth; media is the acquired-asset
 * manifest. Theme and surface wiring resolve by name, never by value.
 */
export interface FamilyRenderInput {
  plan: HomePagePlan;
  graph: ObjectGraph;
  media: MediaManifest;
  /** Public site slug, used to build default surface hrefs. */
  siteSlug: string;
  /** Where the quiet AskFYD entry points. The full panel lives on the ask
   *  surface, never on the public page (deletion list item 14). */
  askHref?: string;
  /** Inspect-surface URL for one object id (the ObjectView page is the working model). */
  inspectHrefFor?: (objectId: string) => string;
  /** Owner-mode entry target ("Customize with FYD"). The owner surface
   *  itself is gated in surfaces.tsx and never renders inside the public tree. */
  customizeHref?: string;
}

/** Resolved render context threaded through every family component. */
export interface FamilyCtx {
  input: FamilyRenderInput;
  objects: Map<string, PingObject>;
  /** First public business object, or null. */
  owner: PingObject | null;
  /** Legal business name (nav small, footer). Never the H1 by default. */
  legalName: string;
  askHref: string;
  inspectHrefFor: (objectId: string) => string;
  customizeHref: string;
  /** data-theme value resolved through the theme seam (themes.ts). */
  themeDataTheme: string;
}

const FAMILY_DEFAULT_THEME: FYDThemeId = "fyd/hpp-warm-craftsman@1";

/**
 * Resolve the plan's theme reference through the compiled-theme seam.
 * Unknown theme ids (e.g. the planner's "fyd-family-default" placeholder)
 * resolve to the family default theme rather than breaking the public
 * page. The planner-side strictness (themes.ts throws) is untouched.
 */
export function resolveThemeDataTheme(plan: HomePagePlan): string {
  const name = plan.theme?.name ?? "";
  if (isKnownThemeId(name)) {
    return resolveCompiledThemeById(name).dataTheme;
  }
  return resolveCompiledThemeById(FAMILY_DEFAULT_THEME).dataTheme;
}

export function buildFamilyCtx(input: FamilyRenderInput): FamilyCtx {
  const objects = new Map<string, PingObject>();
  for (const o of input.graph.objects) objects.set(o.id, o);
  const owner =
    input.graph.objects.find(
      (o) =>
        (o.schema === "ping.social.business@1" || o.schema === "ping.knowledge.business@1") &&
        o.visibility === "public",
    ) ?? null;
  return {
    input,
    objects,
    owner,
    legalName: owner?.title?.trim() ?? input.siteSlug,
    askHref: input.askHref ?? "#ask-fyd",
    inspectHrefFor: input.inspectHrefFor ?? ((objectId: string) => "/o/" + objectId),
    customizeHref: input.customizeHref ?? "#customize",
    themeDataTheme: resolveThemeDataTheme(input.plan),
  };
}

/** Objects bound to a section for one role, in binding order. */
export function objectsForRole(ctx: FamilyCtx, section: PlannedSection, role: string): PingObject[] {
  const binding = section.objectBindings.find((b) => b.role === role);
  if (!binding) return [];
  const out: PingObject[] = [];
  for (const id of binding.objectIds) {
    const o = ctx.objects.get(id);
    if (o) out.push(o);
  }
  return out;
}

/** Renderable media for a media binding, or null when the manifest lacks it. */
export function mediaForAsset(ctx: FamilyCtx, assetId: string): MediaAssetRef | null {
  return ctx.input.media[assetId] ?? null;
}

/** Media bindings of a section, optionally filtered to one role. */
export function mediaBindingsFor(
  section: PlannedSection,
  role?: string,
): PlannedSection["mediaBindings"] {
  return section.mediaBindings.filter((b) => !role || b.role === role);
}

export type { HomePagePlan, PlannedCtaBinding, PlannedSection };
