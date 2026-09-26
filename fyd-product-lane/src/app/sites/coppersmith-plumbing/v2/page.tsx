/**
 * FYD family demo: Coppersmith Plumbing & HVAC.
 *
 * Renders the family page from the ONE generic planning path:
 * buildFamilyInput("coppersmith-plumbing") from the shared family-input
 * builder (pinned graph fixture + authorized demo media ingest + pinned
 * presentation observation -> score.ts verdicts -> planPage()).
 *
 * No customer-specific planning logic lives on this route; all policy is
 * generic and evidence-driven. Sibling of the legacy generator demo at
 * /sites/coppersmith-plumbing (left intact; cutover comes after the owner
 * test passes).
 */

import { PublicFamilyPage } from "@/fyd/family/family-page";
import { buildFamilyInput } from "@/app/sites/_shared/family-input";

const SITE_ID = "coppersmith-plumbing";

export async function generateMetadata() {
  const input = buildFamilyInput(SITE_ID);
  const name =
    input.graph.objects.find(
      (o) => o.schema === "ping.social.business@1" && o.visibility === "public",
    )?.title?.trim() ?? SITE_ID;
  return {
    title: name + " | FYD Family Demo",
    description:
      "Coppersmith Plumbing & HVAC rendered from the FYD component family: same planner, catalog, and renderer as every FYD site.",
  };
}

export default function CoppersmithFamilyV2Page() {
  const input = buildFamilyInput(SITE_ID);
  return <PublicFamilyPage input={input} />;
}
