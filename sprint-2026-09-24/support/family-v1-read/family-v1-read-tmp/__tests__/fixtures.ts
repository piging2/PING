/**
 * Family surface fixtures (product lane, V1).
 *
 * Synthetic HPP-like and Coppersmith-like planner inputs, modeled on the
 * planner's own "family, not clones" fixtures. They exercise the two
 * archetypes the family was built from: a media-rich craftsman and a
 * phone-primary emergency trade. Nothing here is a real business.
 */

import type { PingObject, PingRelationship } from "@/lib/ping/types";
import {
  planPage,
  type HomePagePlan,
  type PlannerInput,
  type ScoredMediaAsset,
} from "../../proceduralize/planner";
import type { FamilyRenderInput, MediaManifest } from "../types";

const AT = "2026-09-25T00:00:00.000Z";

const provenance = {
  kind: "website-derived" as const,
  ref: "website-ingestion:family-test",
  derivedAt: AT,
};

function mkObject(
  id: string,
  schema: string,
  title: string,
  fields: Record<string, string | string[]> = {},
  description = "",
): PingObject {
  return {
    id,
    schema,
    controllerId: "c1",
    visibility: "public",
    title,
    description,
    fields,
    createdAt: AT,
    updatedAt: AT,
    provenance,
  };
}

function mkRel(id: string, subject: string, predicate: string, object: string): PingRelationship {
  return { id, subject, predicate, object, status: "active", createdAt: AT, evidenceRef: "ev" };
}

function mkAsset(
  assetId: string,
  role: ScoredMediaAsset["role"],
  score: number,
  passed: boolean,
  extra: Partial<ScoredMediaAsset> = {},
): ScoredMediaAsset {
  return { assetId, role, score, passed, ...extra };
}

function providesRel(id: string, objectId: string): PingRelationship {
  return mkRel(id, "owner-1", "provides", objectId);
}

/** HPP-like: media-rich craftsman, editorial headline, HPP theme. */
export function hppLikeInput(): PlannerInput {
  const owner = mkObject(
    "owner-1",
    "ping.social.business@1",
    "Hearth Pine Woodworks LLC",
    {
      phone: "+15551234567",
      trade: "carpentry",
      years_in_business: "12",
      rating_summary: "5.0",
      service_areas: ["Grand Junction", "Fruita", "Palisade"],
      license_number: "LIC-88412",
    },
    "Custom cabinetry and woodwork built for the way your family actually lives.",
  );
  const services = [
    mkObject("svc-1", "ping.social.service@1", "Custom Cabinets", { scope: "Kitchens, baths, and built-ins, designed around your space" }, "Custom cabinets done right."),
    mkObject("svc-2", "ping.social.service@1", "Furniture", { scope: "Tables, shelving, and one-off pieces" }, "Furniture done right."),
    mkObject("svc-3", "ping.social.service@1", "Repairs", { scope: "Cabinet and furniture restoration" }, "Repairs done right."),
  ];
  const people = [
    mkObject("per-1", "ping.social.person@1", "Sam Hart", { role: "owner", quote: "Wood remembers every shortcut. We take none." }, "Sam has built cabinetry in the Grand Valley for twelve years."),
  ];
  const projects = [
    mkObject("post-1", "ping.social.post@1", "Walnut Kitchen Remodel", { location: "Grand Junction" }, "A walnut kitchen with a story."),
    mkObject("post-2", "ping.social.post@1", "Cedar Deck Overlook", { location: "Fruita" }, "A deck with a story."),
  ];
  const reviews = [
    mkObject("rev-1", "ping.social.post@1", "Kitchen cabinets", { reviewer_name: "Dana W." }, "They measured twice, built once, and the kitchen finally works."),
  ];
  return {
    graph: {
      objects: [owner, ...services, ...people, ...projects, ...reviews],
      relationships: [
        ...services.map((s, i) => providesRel("r-s" + i, s.id)),
        ...people.map((p, i) => mkRel("r-p" + i, "owner-1", "employs", p.id)),
        ...projects.map((p, i) => mkRel("r-w" + i, "owner-1", "publishes", p.id)),
        ...reviews.map((p, i) => mkRel("r-r" + i, "owner-1", "publishes", p.id)),
      ],
    },
    capabilities: ["phone-tap", "estimate-path", "ask-affordance", "newsletter-capture"],
    media: {
      assets: [
        mkAsset("hpp-hero", "hero-documentary", 0.92, true),
        mkAsset("hpp-logo", "logo-mark", 0.8, true),
        ...services.map((s, i) =>
          mkAsset("hpp-svc-" + i, "service-imagery", 0.75 + i * 0.02, true, { objectIds: [s.id] }),
        ),
        mkAsset("hpp-pp-1", "project-photo", 0.85, true, { objectIds: ["post-1"] }),
        mkAsset("hpp-pp-2", "project-photo", 0.8, true, { objectIds: ["post-2"] }),
        mkAsset("hpp-portrait", "owner-portrait", 0.8, true, { depictsPersonId: "per-1" }),
      ],
    },
    designSignal: {
      authority: "signal-not-authority",
      imageDensityBand: "high",
      imageFinish: "documentary",
    },
    ownerIntent: {
      themeName: "fyd/hpp-warm-craftsman@1",
      headline: "Your favorite part of coming home should be the home itself.",
      brandVoiceLine: "Your favorite part of coming home should be the home itself.",
    },
  };
}

/** Coppersmith-like: phone-primary emergency trade, Coppersmith theme. */
export function coppersmithLikeInput(): PlannerInput {
  const owner = mkObject(
    "owner-1",
    "ping.social.business@1",
    "Copperline Plumbing LLC",
    {
      phone: "+19702453869",
      trade: "plumbing",
      tradeCategory: "emergency",
      years_in_business: "25+",
      rating_summary: "4.9",
      address: "630 Maldonado Street, Grand Junction CO",
      service_areas: ["Grand Junction", "Fruita", "Palisade", "Clifton"],
    },
    "Emergency plumbing and honest pricing for the Grand Valley.",
  );
  const services = [
    mkObject("svc-e", "ping.social.service@1", "Emergency Plumbing", { scope: "Burst pipes, major leaks, and no-water calls, day or night", priority: "1" }, "Emergency plumbing done right."),
    mkObject("svc-w", "ping.social.service@1", "Water Heaters", { scope: "Repair and replacement, same-day when it matters" }, "Water heaters done right."),
    mkObject("svc-d", "ping.social.service@1", "Drain Cleaning", { scope: "Cleared drains without the mess" }, "Drains done right."),
  ];
  const products = [
    mkObject("prod-1", "ping.social.product@1", "Tankless Water Heater X"),
    mkObject("prod-2", "ping.social.product@1", "High-Efficiency Water Heater Y"),
  ];
  const people = [
    mkObject("per-1", "ping.social.person@1", "Chris Vale", { role: "Owner and master plumber" }, "Chris has answered emergency calls in the valley for 25 years."),
    mkObject("per-2", "ping.social.person@1", "Tech Two", { role: "Technician" }, "Licensed technician."),
  ];
  return {
    graph: {
      objects: [owner, ...services, ...products, ...people],
      relationships: [
        ...services.map((s, i) => providesRel("r-s" + i, s.id)),
        ...products.map((p, i) => mkRel("r-d" + i, "owner-1", "provides", p.id)),
        ...people.map((p, i) => mkRel("r-p" + i, "owner-1", "employs", p.id)),
      ],
    },
    capabilities: ["phone-tap", "schedule-path", "ask-affordance", "address-display"],
    media: {
      assets: [
        mkAsset("cop-logo", "logo-mark", 0.8, true),
        mkAsset("cop-van", "work-detail", 0.7, true),
      ],
    },
    designSignal: { authority: "signal-not-authority", imageDensityBand: "low" },
    ownerIntent: {
      themeName: "fyd/coppersmith-trade-authority@1",
      tradeCategory: "emergency",
      headline: "Water where it should not be? Call now.",
      brandVoiceLine: "Water where it should not be? Call now.",
      serviceLinesAsBuyingUnits: true,
    },
  };
}

/**
 * Build a synthetic media manifest from the planner input's scored
 * assets. URLs are FYD-controlled derivatives; alt text is derived from
 * the asset role and the business it depicts (the evidence-derived
 * minimum for fixtures).
 */
export function mediaManifestFor(input: PlannerInput, legalName: string): MediaManifest {
  const manifest: MediaManifest = {};
  const assets = input.media?.assets ?? [];
  for (const a of assets) {
    if (!a.passed) continue;
    manifest[a.assetId] = {
      url: "https://media.fyd.test/" + a.assetId + ".jpg",
      alt: mediaAlt(a, legalName),
    };
  }
  return manifest;
}

function mediaAlt(a: ScoredMediaAsset, legalName: string): string {
  switch (a.role) {
    case "hero-documentary":
      return "Documentary photo of " + legalName + " at work";
    case "logo-mark":
      return legalName + " logo";
    case "owner-portrait":
      return "Portrait of the owner of " + legalName;
    case "project-photo":
      return "Completed project by " + legalName;
    case "service-imagery":
      return "Work detail from " + legalName;
    default:
      return "Photo from " + legalName;
  }
}

/** Plan + render input for a fixture, throwing if the planner declines. */
export function familyInputFor(input: PlannerInput, legalName: string): FamilyRenderInput {
  const plan = planPage(input);
  if (!plan) throw new Error("planPage returned null for fixture input");
  return {
    plan,
    graph: input.graph,
    media: mediaManifestFor(input, legalName),
    siteSlug: "family-test",
  };
}

export function hppLikeFamilyInput(): FamilyRenderInput {
  return familyInputFor(hppLikeInput(), "Hearth Pine Woodworks LLC");
}

export function coppersmithLikeFamilyInput(): FamilyRenderInput {
  return familyInputFor(coppersmithLikeInput(), "Copperline Plumbing LLC");
}

export function hppLikePlan(): HomePagePlan {
  const plan = planPage(hppLikeInput());
  if (!plan) throw new Error("planPage returned null for HPP-like input");
  return plan;
}

export function coppersmithLikePlan(): HomePagePlan {
  const plan = planPage(coppersmithLikeInput());
  if (!plan) throw new Error("planPage returned null for Coppersmith-like input");
  return plan;
}
