/**
 * FYD Social generated-site demo: Coppersmith Plumbing & HVAC.
 *
 * Second procedural-clone proof (grill plan item 2): the page below is
 * compiled from the site's PING-backed object graph through the shared
 * Lane D pipeline (src/app/sites/_shared/customized-site.ts): VISIBILITY
 * (owner policy + public viewer context) -> generateSiteSpec ->
 * PRESENTATION INTENT (approved directives) -> hero media (owner override
 * honored). No hand-layout for this company exists anywhere in the
 * pipeline, and no customer fact is hardcoded in this file: the graph,
 * the spec compile pins, and the metadata all come from PING.
 *
 * The spec is validated before render. An invalid spec never renders.
 */

import { SiteClient } from "../_shared/site-client";
import { loadPublicSite, ownerName } from "../_shared/customized-site";
import { getPingObjectGraph } from "@/fyd/data/ping-object-source";
import { DemoOwnerMode } from "@/fyd/owner-mode/demo-owner-mode";

const SITE_ID = "coppersmith-plumbing";

export async function generateMetadata() {
  const { graph } = await getPingObjectGraph(SITE_ID);
  const name = ownerName(graph, SITE_ID);
  return {
    title: `${name} | FYD Social Generated Site`,
    description: `A procedurally generated site for ${name}, compiled by FYD Social from its PING-backed object graph.`,
  };
}

export default async function CoppersmithDemoPage() {
  const site = await loadPublicSite(SITE_ID);

  return (
    <main className="min-h-screen bg-background">
      <SiteClient
        spec={site.spec}
        graph={site.graph}
        findings={site.findings}
        renderable={site.renderable}
        siteId={SITE_ID}
        heroMedia={site.heroMedia}
      />
      <DemoOwnerMode siteId={SITE_ID} />
    </main>
  );
}
