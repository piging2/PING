/**
 * Happy Place Carpentry route: a thin tenant route over the generic
 * composition seam.
 *
 * Everything the page renders comes from composeSite: the PING-backed
 * object graph, the resolved composition profile (live intent > this
 * route's recorded composition > category strategy), the composed and
 * validated spec, and the server-resolved media. No hand-layout for this
 * company exists anywhere in the pipeline, and no customer fact is
 * hardcoded in this file: the graph, the spec compile pins, and the
 * metadata all come through the seam.
 *
 * Chrome mode is deployment configuration (P2, FYD_CHROME_MODE), default
 * customer. In customer mode no demo DOM is present: no FYD Social header,
 * no validator banner, no structured editor, no owner-mode panel.
 */

import { CustomerSite } from "../_shared/customer-site";
import { DemoChrome } from "../_shared/demo-chrome";
import {
  composeSite,
  resolveDeployment,
  siteMetadata,
} from "../_shared/compose-site";
import {
  HAPPY_PLACE_CATEGORY,
  HAPPY_PLACE_COMPOSITION,
  HAPPY_PLACE_TENANT_ID,
} from "./composition";

export async function generateMetadata() {
  return siteMetadata({
    tenantId: HAPPY_PLACE_TENANT_ID,
    deployment: resolveDeployment(),
  });
}

export default async function HappyPlacePage() {
  const site = await composeSite({
    tenantId: HAPPY_PLACE_TENANT_ID,
    category: HAPPY_PLACE_CATEGORY,
    compositionRecord: HAPPY_PLACE_COMPOSITION,
    deployment: resolveDeployment(),
  });

  if (site.chromeMode === "demo") {
    return (
      <main className="min-h-screen bg-background">
        <DemoChrome site={site} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <CustomerSite
        spec={site.spec}
        graph={site.graph}
        renderable={site.renderable}
        siteId={site.tenantId}
        heroMedia={site.heroMedia}
        galleryMedia={site.galleryMedia}
        objectMedia={site.objectMedia}
        provenanceSentence={site.provenanceSentence}
      />
    </main>
  );
}
