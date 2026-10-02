/**
 * FYD NIGHT PREVIEW: cohort acquisition page. Preview only, not production.
 *
 * Renders one bundled cohort acquisition JSON through the existing
 * generated-site pipeline (SiteClient), the same components as the
 * flagship /sites routes. Each acquisition bundles a pre-compiled
 * sitespec (built by the cohort pipeline at the preview SHA); the page
 * re-validates that spec with the repo validator before render. An
 * invalid spec never renders.
 *
 * Cohort JSONs are bundled at build time under ./_data/<siteId>.json;
 * the manifest lists the site ids to prerender.
 *
 * New file for the night preview; no existing route was modified.
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteClient } from "../../../sites/_shared/site-client";
import { isRenderable, validateSiteSpec } from "@/fyd/sitespec/validator";
import type {
  FYDFinding,
  FYDSiteSpec,
  ObjectGraph,
} from "@/fyd/sitespec/types";
import manifest from "../_data/manifest.json";

const SITE_ID_RE = /^[a-z0-9-]+$/;

function cohortSiteIds(): string[] {
  const ids = (manifest as { siteIds?: unknown }).siteIds;
  return Array.isArray(ids)
    ? ids.filter((s): s is string => typeof s === "string" && SITE_ID_RE.test(s))
    : [];
}

export async function generateStaticParams() {
  return cohortSiteIds().map((siteId) => ({ siteId }));
}

interface CohortAcquisition {
  site_id: string;
  business_name: string;
  graph: ObjectGraph | null;
  sitespec: FYDSiteSpec | null;
  validation: { findings: FYDFinding[]; renderable: boolean } | null;
}

/**
 * Load and honesty-check one bundled acquisition. Returns null (route 404s)
 * for unknown site ids, missing bundles, incomplete acquisitions, or a
 * spec that fails the repo validator. Fail closed: nothing unverifiable
 * renders.
 */
async function loadCohort(siteId: string): Promise<{
  spec: FYDSiteSpec;
  graph: ObjectGraph;
  findings: FYDFinding[];
  renderable: boolean;
  name: string;
} | null> {
  if (!SITE_ID_RE.test(siteId)) return null;
  if (!cohortSiteIds().includes(siteId)) return null;
  let mod: { default: unknown };
  try {
    mod = await import(`../_data/${siteId}.json`);
  } catch {
    return null;
  }
  const raw = mod.default as Partial<CohortAcquisition>;
  if (!raw || typeof raw !== "object") return null;
  const { graph, sitespec, business_name } = raw;
  if (!graph || !sitespec || typeof business_name !== "string") return null;
  if (raw.site_id !== siteId) return null;
  // Re-validate the bundled spec with the repo validator; the bundled
  // validation field is informational, not authoritative.
  const knownSchemas = new Set(graph.objects.map((o) => o.schema));
  const findings = validateSiteSpec(sitespec, knownSchemas);
  const renderable = isRenderable(findings);
  if (!renderable) return null;
  return { spec: sitespec, graph, findings, renderable, name: business_name };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siteId: string }>;
}): Promise<Metadata> {
  const { siteId } = await params;
  const cohort = await loadCohort(siteId);
  if (!cohort)
    return {
      title: { absolute: "Not found | FYD night preview" },
      robots: { index: false },
    };
  return {
    title: { absolute: `${cohort.name} | FYD night preview` },
    description: `Cohort acquisition preview for ${cohort.name}. Preview only, not production.`,
    robots: { index: false, follow: false },
  };
}

export default async function CohortSitePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const cohort = await loadCohort(siteId);
  if (!cohort) notFound();

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b-4 border-amber-500 bg-stone-950 px-4 py-2 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
          Night preview, not production
        </p>
      </div>
      <SiteClient
        spec={cohort.spec}
        graph={cohort.graph}
        findings={cohort.findings}
        renderable={cohort.renderable}
        siteId={siteId}
        heroMedia={null}
      />
    </main>
  );
}
