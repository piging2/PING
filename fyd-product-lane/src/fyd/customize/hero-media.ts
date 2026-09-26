/**
 * Lane D: hero-media resolution honoring approved owner overrides.
 *
 * "Use this project photo as the hero" persists as
 * presentation.heroMediaObjectId on the Hero section (a PRESENTATION
 * INTENT directive). This helper resolves it at the server render seam:
 * the media lane still resolves the actual asset, so an override naming
 * an object with no acquired photographic media falls back to the
 * default hero selection -- never to an invented image.
 */

import {
  heroMediaFor,
  listObjectMedia,
  type DisplayMedia,
} from "../media/select";
import type { FYDSiteSpec, ObjectGraph } from "../sitespec/types";

export type { DisplayMedia };

export function heroMediaWithOverride(
  siteId: string,
  graph: ObjectGraph,
  spec: FYDSiteSpec,
): DisplayMedia | null {
  const hero = spec.pages
    .flatMap((p) => p.sections)
    .find((s) => s.component === "Hero");
  const overrideId = hero?.presentation.heroMediaObjectId;
  if (overrideId) {
    // Photographic assets only: a logo is brand identity, never a hero.
    const media = listObjectMedia(siteId, graph, overrideId).filter(
      (m) => m.role !== "logo",
    );
    if (media.length > 0) return media[0];
  }
  return heroMediaFor(siteId, graph, spec.ownerObjectId);
}
