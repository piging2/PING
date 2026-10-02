/**
 * Happy Place Carpentry tenant composition record (B3): the recorded
 * owner-set composition layer. This file is DATA, not code: it pins HPP's
 * composition policy as typed parameters. No tenant logic lives here and
 * nothing here branches on business names; the route passes this record
 * into the generic composeSite seam.
 *
 * What is pinned and why:
 * - homeSectionOrder: the judged golden emission order, with the
 *   SocialProof slot (B6) in its canonical position after Products. HPP's
 *   graph carries no verified testimonials, so the slot stays inert; it is
 *   pinned so a future verified-testimonials event lands in the judged
 *   position instead of an arbitrary one.
 * - pageOrder: the judged page order (home, about, services, explore).
 * - ctaEmphasis "standard": the judged default. The strategy pipeline also
 *   yields "standard" for the trade category (TRADES urgency 0.6 maps to
 *   the "medium" policy), so the record and the strategy agree; the record
 *   is explicit so the judgment is visible as data.
 * - layoutCharacter null: no tenant opinion (P10). The judged default
 *   (EDITORIAL) flows through untouched.
 * - themeTokenOverrides {}: no tenant overrides (P11).
 */

import {
  DEFAULT_HOME_SECTION_ORDER,
  DEFAULT_PAGE_ORDER,
  type SiteCompositionProfile,
  type TenantCategory,
} from "@/fyd/compose/profile";

export const HAPPY_PLACE_TENANT_ID = "happy-place";

export const HAPPY_PLACE_CATEGORY = "trade" as const satisfies TenantCategory;

export const HAPPY_PLACE_COMPOSITION: SiteCompositionProfile = {
  homeSectionOrder: [...DEFAULT_HOME_SECTION_ORDER],
  pageOrder: [...DEFAULT_PAGE_ORDER],
  ctaEmphasis: "standard",
  layoutCharacter: null,
  themeTokenOverrides: {},
};
