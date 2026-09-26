/**
 * FYD family demo: Happy Place Carpentry.
 *
 * Renders the family page from the ONE generic planning path:
 * buildFamilyInput("happy-place") from the shared family-input builder
 * (pinned rich object-graph fixture + production media manifest (zero
 * assets: tolerated, the planner fails closed on media) -> planPage()).
 *
 * No customer-specific planning logic lives on this route; all policy is
 * generic and evidence-driven. The family page replaces the legacy
 * generateSiteSpec pipeline on this route.
 */

import { PublicFamilyPage } from "@/fyd/family/family-page";
import { buildFamilyInput } from "@/app/sites/_shared/family-input";

const SITE_ID = "happy-place";

export async function generateMetadata() {
  const input = buildFamilyInput(SITE_ID);
  const name =
    input.graph.objects.find(
      (o) => o.schema === "ping.social.business@1" && o.visibility === "public",
    )?.title?.trim() ?? SITE_ID;
  return {
    title: name + " | FYD Family Demo",
    description:
      "Happy Place Carpentry rendered from the FYD component family: same planner, catalog, and renderer as every FYD site.",
  };
}

export default function HappyPlaceFamilyPage() {
  const input = buildFamilyInput(SITE_ID);
  return <PublicFamilyPage input={input} />;
}
