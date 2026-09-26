/**
 * FYD family demo: Coppersmith Plumbing & HVAC (Coppersmith-first proving).
 *
 * Renders the family page from the deterministic pipeline:
 * pinned graph fixture + authorized demo media ingest + pinned presentation
 * observation -> score.ts verdicts -> planPage() -> PublicFamilyPage with
 * the coppersmith theme.
 *
 * Sibling of the legacy generator demo at /sites/coppersmith-plumbing
 * (left intact; cutover comes after the owner test passes).
 */

import { PublicFamilyPage } from "@/fyd/family/family-page";
import {
  buildCoppersmithFamilyInput,
  COPPERSMITH_SITE_ID,
} from "./family-input";

export async function generateMetadata() {
  const input = buildCoppersmithFamilyInput();
  const name =
    input.graph.objects.find(
      (o) => o.schema === "ping.social.business@1" && o.visibility === "public",
    )?.title?.trim() ?? COPPERSMITH_SITE_ID;
  return {
    title: name + " | FYD Family Demo",
    description:
      "Coppersmith Plumbing & HVAC rendered from the FYD component family: same planner, catalog, and renderer as every FYD site.",
  };
}

export default function CoppersmithFamilyV2Page() {
  const input = buildCoppersmithFamilyInput();
  return <PublicFamilyPage input={input} />;
}
