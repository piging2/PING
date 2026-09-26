/**
 * DEPRECATED delegation layer (product lane).
 *
 * The customer-specific builder that used to live here (~340 lines of
 * Coppersmith-only planning policy) is gone. There is exactly one planning
 * implementation now: the generic builder at
 * src/app/sites/_shared/family-input.ts.
 *
 * These aliases exist so the one-off proof script
 * (proof/coppersmith-family-2026-09-25/run.ts) and any other legacy
 * consumers keep working while they migrate. New code must import from
 * "@/app/sites/_shared/family-input" directly.
 */

import type { PresentationObservation } from "@/fyd/proceduralize/presentation-observe";
import type { FydMediaObject } from "@/fyd/media/types";
import type { HomePagePlan, ScoredMediaAsset } from "@/fyd/proceduralize/planner";
import type { FamilyRenderInput, MediaManifest } from "@/fyd/family/types";

import {
  buildFamilyInput,
  buildFamilyPlan,
  detectTradeEvidence,
  scoreSiteMedia,
  toDesignSignal as sharedToDesignSignal,
  buildRenderMediaManifest as sharedBuildRenderMediaManifest,
  type ScoredAssetReport as SharedScoredAssetReport,
} from "@/app/sites/_shared/family-input";
import { COPPERSMITH_GRAPH } from "@/fyd/proceduralize/__fixtures__/coppersmith-graph";

/** @deprecated use the generic registry; kept for legacy consumers. */
export const COPPERSMITH_SITE_ID = "coppersmith-plumbing";

/** @deprecated use buildFamilyInput("coppersmith-plumbing") from the shared builder. */
export function buildCoppersmithFamilyInput(): FamilyRenderInput {
  return buildFamilyInput(COPPERSMITH_SITE_ID);
}

/** @deprecated use buildFamilyPlan("coppersmith-plumbing") from the shared builder. */
export function buildCoppersmithPlan(): HomePagePlan {
  return buildFamilyPlan(COPPERSMITH_SITE_ID);
}

function coppersmithTitle(): string {
  const owner = COPPERSMITH_GRAPH.objects.find(
    (o) => o.schema === "ping.social.business@1" && o.visibility === "public",
  );
  return owner?.title?.trim() ?? "Coppersmith Plumbing - HVAC - Mechanical";
}

/**
 * @deprecated use scoreSiteMedia(media, detectTradeEvidence(graph), obs,
 * businessTitle) from the shared builder.
 */
export function scoreCoppersmithMedia(
  media: FydMediaObject[],
  obs: PresentationObservation,
): { scored: ScoredMediaAsset[]; report: SharedScoredAssetReport[] } {
  return scoreSiteMedia(media, detectTradeEvidence(COPPERSMITH_GRAPH), obs, coppersmithTitle());
}

/** @deprecated use toDesignSignal from the shared builder. */
export const toDesignSignal = sharedToDesignSignal;

/** @deprecated use buildRenderMediaManifest from the shared builder. */
export function buildRenderMediaManifest(
  media: FydMediaObject[],
  scored: ScoredMediaAsset[],
): MediaManifest {
  return sharedBuildRenderMediaManifest(media, scored, coppersmithTitle());
}

/** @deprecated use ScoredAssetReport from the shared builder. */
export type ScoredAssetReport = SharedScoredAssetReport;
