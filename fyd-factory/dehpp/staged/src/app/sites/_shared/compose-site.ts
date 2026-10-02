/**
 * Tenant route composition seam (B3/R9): the one server code path every
 * generated-site route uses to turn a tenant id into a composed site.
 *
 * Pipeline, in order:
 *   1. validateTenantId (P1) — malformed ids refuse to render.
 *   2. getPingObjectGraph — the PING-backed object graph, overlays, meta,
 *      and presentation intent.
 *   3. resolveCompositionProfile — live intent > tenant record > strategy
 *      output (category strategy + planner policy). No tenant checks, no
 *      business-name checks, no customer-specific branches anywhere.
 *   4. generateSiteSpec(graph, { composition }) — emission, ordering,
 *      CTA emphasis, token composition.
 *   5. applyPresentationIntent — approved owner directives over the spec.
 *   6. Media seam (B4/M3) — heroMediaFor, galleryMediaFor, listObjectMedia
 *      resolved once per page load; the renderer never selects media itself.
 *   7. validateSiteSpec + isRenderable — an invalid spec never renders.
 *
 * Deployment parameters (P2/P12/P13) come from the environment via
 * resolveDeployment(), never from tenant data.
 */

import { getPingObjectGraph } from "@/fyd/data/ping-object-source";
import { generateSiteSpec } from "@/fyd/proceduralize/generator";
import { applyPresentationIntent } from "@/fyd/customize/apply-layer";
import { isRenderable, validateSiteSpec } from "@/fyd/sitespec/validator";
import {
  galleryMediaFor,
  heroMediaFor,
  listObjectMedia,
  type DisplayMedia,
} from "@/fyd/media/select";
import { getComponentDef } from "@/fyd/components/registry";
import type {
  FYDFinding,
  FYDSiteSpec,
  ObjectGraph,
  PresentationIntentBlock,
} from "@/fyd/sitespec/types";
import {
  asCompositionIntent,
  resolveCompositionProfile,
  type SiteCompositionProfile,
  type TenantCategory,
} from "@/fyd/compose/profile";
import {
  renderProvenanceSentence,
  resolveChromeMode,
  resolveSeoBrandName,
  siteDescription,
  siteTitle,
  validateTenantId,
  type ChromeMode,
} from "@/fyd/compose/params";

/** Deployment parameters (P2/P12/P13): env-only, never per tenant. */
export interface DeploymentConfig {
  chromeMode: ChromeMode;
  seoBrandName: string | null;
  provenanceBrand: string | null;
  provenanceIngestionMethod: string | null;
  provenanceTemplate: string | null;
}

export function resolveDeployment(
  env: NodeJS.ProcessEnv = process.env,
): DeploymentConfig {
  return {
    chromeMode: resolveChromeMode(env),
    seoBrandName: resolveSeoBrandName(env),
    provenanceBrand: (env.FYD_PROVENANCE_BRAND ?? "").trim() || null,
    provenanceIngestionMethod:
      (env.FYD_PROVENANCE_INGESTION_METHOD ?? "").trim() || null,
    provenanceTemplate: env.FYD_PROVENANCE_TEMPLATE ?? null,
  };
}

export interface TenantRouteConfig {
  tenantId: string;
  /** Generic business kind: trade | knowledge | technical. */
  category: TenantCategory;
  /** Recorded owner-set composition (repo tenant data). */
  compositionRecord?: SiteCompositionProfile | null;
  deployment?: DeploymentConfig;
}

export interface ComposedSite {
  tenantId: string;
  spec: FYDSiteSpec;
  graph: ObjectGraph;
  presentationIntent: PresentationIntentBlock | null;
  findings: FYDFinding[];
  renderable: boolean;
  heroMedia: DisplayMedia | null;
  galleryMedia: DisplayMedia[];
  objectMedia: Record<string, DisplayMedia[]>;
  chromeMode: ChromeMode;
  provenanceSentence: string | null;
  seoBrandName: string | null;
}

export async function composeSite(
  config: TenantRouteConfig,
): Promise<ComposedSite> {
  const tenantId = validateTenantId(config.tenantId);
  const deployment = config.deployment ?? resolveDeployment();

  const { graph, meta, presentationIntent } =
    await getPingObjectGraph(tenantId);

  // Live owner intent (presentation intent block) wins over the recorded
  // profile; both lose to nothing else. The block shape is checked before
  // it may override anything: unknown shapes are dropped, not coerced.
  const liveIntent = asCompositionIntent(
    presentationIntent
      ? (presentationIntent as unknown as Record<string, unknown>).composition
      : null,
  );
  const profile = resolveCompositionProfile({
    category: config.category,
    graph,
    tenantRecord: config.compositionRecord ?? null,
    liveIntent,
  });

  const base = generateSiteSpec(graph, {
    generatedAt: meta.generatedAt,
    eventSequences: meta.eventSequences ?? undefined,
    composition: profile,
  });
  // PRESENTATION INTENT layer: approved owner directives applied OVER the
  // compiled spec. Facts (graph) and design system (theme) are untouched.
  const spec = applyPresentationIntent(base, presentationIntent, graph).spec;

  // P3: unknown ids in the profile order list are dropped by the generator;
  // surface them as validator warnings, never errors.
  const unknownOrderIds = profile.homeSectionOrder.filter(
    (id) => !getComponentDef(id),
  );
  const knownSchemas = new Set(graph.objects.map((o) => o.schema));
  const findings = validateSiteSpec(
    spec,
    knownSchemas,
    unknownOrderIds.map(
      (id) =>
        `Unknown section id in composition homeSectionOrder: "${id}". It was dropped from the page order.`,
    ),
  );
  const renderable = isRenderable(findings);

  return {
    tenantId,
    spec,
    graph,
    presentationIntent,
    findings,
    renderable,
    heroMedia: heroMediaFor(tenantId, graph, spec.ownerObjectId),
    galleryMedia: galleryMediaFor(graph) ?? [],
    objectMedia: listObjectMedia(graph),
    chromeMode: deployment.chromeMode,
    provenanceSentence: renderProvenanceSentence({
      brand: deployment.provenanceBrand,
      ingestionMethod: deployment.provenanceIngestionMethod,
      eventSequences: meta.eventSequences ?? null,
      template: deployment.provenanceTemplate,
    }),
    seoBrandName: deployment.seoBrandName,
  };
}

function ownerName(
  graph: {
    objects: { schema: string; visibility: string; title: string }[];
  },
  fallback: string,
): string {
  const owner = graph.objects.find(
    (o) => o.schema === "ping.social.business@1" && o.visibility === "public",
  );
  const name = owner?.title?.trim();
  return name ? name : fallback;
}

/** Route metadata (P13): title and description parameterized by brand. */
export async function siteMetadata(config: {
  tenantId: string;
  deployment?: DeploymentConfig;
}): Promise<{ title: string; description: string }> {
  const tenantId = validateTenantId(config.tenantId);
  const { graph } = await getPingObjectGraph(tenantId);
  const name = ownerName(graph, tenantId);
  const brand = config.deployment?.seoBrandName ?? resolveSeoBrandName();
  return { title: siteTitle(name, brand), description: siteDescription(name, brand) };
}
