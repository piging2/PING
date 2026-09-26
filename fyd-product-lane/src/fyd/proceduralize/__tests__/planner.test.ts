/**
 * Planner unit tests: determinism, eligibility rules, variant selection,
 * CTA primary resolution, and the media-bar-never-lowered invariant.
 *
 * All fixtures are synthetic; HPP-like and Coppersmith-like inputs exercise
 * the two archetypes the family was built from (a family, not clones).
 */

import type { PingObject, PingRelationship } from "@/lib/ping/types";
import {
  planPage,
  planPageFromGraph,
  formatPhoneDisplay,
  adaptedServiceAreaList,
  type HomePagePlan,
  type PlannerInput,
  type ScoredMediaAsset,
  type RegistryComponent,
} from "../planner";

const AT = "2026-09-25T00:00:00.000Z";

const provenance = {
  kind: "website-derived" as const,
  ref: "website-ingestion:test",
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

function ownerWith(fields: Record<string, string | string[]>, title = "Test Business LLC"): PingObject {
  return mkObject("owner-1", "ping.social.business@1", title, fields);
}

function service(id: string, title: string, scope: string, priority?: string): PingObject {
  return mkObject(
    id,
    "ping.social.service@1",
    title,
    priority ? { scope, priority } : { scope },
    title + " done right.",
  );
}

function providesRel(id: string, objectId: string): PingRelationship {
  return mkRel(id, "owner-1", "provides", objectId);
}

/** Minimal viable business: owner with phone, one service, nothing else. */
function minimalInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  const owner = ownerWith({ phone: "+15551234567", trade: "carpentry" });
  const svc = service("svc-1", "Deck Building", "Custom decks and outdoor structures");
  return {
    graph: {
      objects: [owner, svc],
      relationships: [providesRel("r1", svc.id)],
    },
    capabilities: ["phone-tap", "ask-affordance"],
    ...overrides,
  };
}

function sectionBy(plan: HomePagePlan, component: RegistryComponent, variant?: string) {
  return plan.sections.filter(
    (s) => s.component === component && (variant === undefined || s.variant === variant),
  );
}

function eligibility(plan: HomePagePlan, component: RegistryComponent, variant?: string) {
  return plan.eligibility.filter(
    (e) => e.component === component && (variant === undefined || e.variant === variant),
  );
}

// ============================================================================
// Determinism
// ============================================================================

describe("planner determinism", () => {
  test("same inputs produce byte-identical plans", () => {
    const input = minimalInput({
      media: {
        assets: [
          mkAsset("hero-1", "hero-documentary", 0.9, true),
          mkAsset("logo-1", "logo-mark", 0.8, true),
        ],
      },
      designSignal: {
        authority: "signal-not-authority",
        imageDensityBand: "high",
        imageFinish: "documentary",
      },
      ownerIntent: { headline: "We build the good stuff." },
    });
    const a = planPage(input);
    const b = planPage(input);
    expect(a).not.toBeNull();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test("shuffled object and relationship order yields the identical plan", () => {
    const base = minimalInput({
      media: { assets: [mkAsset("hero-1", "hero-documentary", 0.9, true)] },
    });
    const reversed: PlannerInput = {
      ...base,
      graph: {
        objects: [...base.graph.objects].reverse(),
        relationships: [...base.graph.relationships].reverse(),
      },
    };
    const a = planPage(base);
    const b = planPage(reversed);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test("plan output contains no clock-derived values", () => {
    const plan = planPage(minimalInput()) as HomePagePlan;
    // Fixture timestamps must not leak into the plan: the planner has no clock.
    expect(JSON.stringify(plan)).not.toContain("2026-09-25");
  });

  test("no owner means no site", () => {
    const svc = service("svc-1", "Deck Building", "Custom decks");
    const plan = planPage({ graph: { objects: [svc], relationships: [] } });
    expect(plan).toBeNull();
    expect(planPageFromGraph({ objects: [svc], relationships: [] })).toBeNull();
  });
});

// ============================================================================
// Eligibility rules: true/false cases
// ============================================================================

describe("eligibility rules", () => {
  test("ServiceGrid: <2 services ineligible, >=2 eligible", () => {
    const one = planPage(minimalInput()) as HomePagePlan;
    expect(sectionBy(one, "ServiceGrid")).toHaveLength(0);
    expect(eligibility(one, "ServiceGrid")[0].eligible).toBe(false);

    const owner = ownerWith({ phone: "+15551234567" });
    const two = planPage({
      graph: {
        objects: [owner, service("s1", "A", "scope a"), service("s2", "B", "scope b")],
        relationships: [providesRel("r1", "s1"), providesRel("r2", "s2")],
      },
      capabilities: ["phone-tap", "ask-affordance"],
    }) as HomePagePlan;
    expect(sectionBy(two, "ServiceGrid")).toHaveLength(1);
    expect(eligibility(two, "ServiceGrid")[0].eligible).toBe(true);
  });

  test("ProjectGallery: insufficient gallery-quality media means INELIGIBLE, never degraded", () => {
    const owner = ownerWith({ phone: "+15551234567" });
    const p1 = mkObject("post-1", "ping.social.post@1", "Steel-Framed Courtyard", { location: "Corvallis" }, "A courtyard story.");
    const p2 = mkObject("post-2", "ping.social.post@1", "Cedar Deck", { location: "Albany" }, "A deck story.");
    const plan = planPage({
      graph: {
        objects: [owner, p1, p2],
        relationships: [mkRel("r1", "owner-1", "publishes", "post-1"), mkRel("r2", "owner-1", "publishes", "post-2")],
      },
      capabilities: ["phone-tap", "ask-affordance"],
      // No media at all: two titled items but zero relevance-passing project photos.
    }) as HomePagePlan;
    expect(sectionBy(plan, "ProjectGallery")).toHaveLength(0);
    const rec = eligibility(plan, "ProjectGallery")[0];
    expect(rec.eligible).toBe(false);
    expect(rec.reason).toMatch(/INELIGIBLE/);

    const withMedia = planPage({
      graph: {
        objects: [owner, p1, p2],
        relationships: [mkRel("r1", "owner-1", "publishes", "post-1"), mkRel("r2", "owner-1", "publishes", "post-2")],
      },
      capabilities: ["phone-tap", "ask-affordance"],
      media: {
        assets: [
          mkAsset("pp-1", "project-photo", 0.8, true, { objectIds: ["post-1"] }),
          mkAsset("pp-2", "project-photo", 0.75, true, { objectIds: ["post-2"] }),
        ],
      },
    }) as HomePagePlan;
    expect(sectionBy(withMedia, "ProjectGallery")).toHaveLength(1);
  });

  test("BusinessStory: needs a named owner/founder person WITH story evidence", () => {
    const owner = ownerWith({ phone: "+15551234567" });
    const tech = mkObject("per-1", "ping.social.person@1", "Sam Rivera", { role: "technician" });
    const noStory = planPage({
      graph: {
        objects: [owner, tech],
        relationships: [mkRel("r1", "owner-1", "employs", "per-1")],
      },
      capabilities: ["phone-tap", "ask-affordance"],
    }) as HomePagePlan;
    expect(sectionBy(noStory, "BusinessStory")).toHaveLength(0);

    // A named founder alone is not enough: without story evidence
    // (bio/story/quote/description or a provably bound portrait) the
    // section is omitted, never fabricated.
    const founderBare = mkObject("per-2", "ping.social.person@1", "Taylor Morgan", { role: "founder" });
    const bare = planPage({
      graph: {
        objects: [owner, founderBare],
        relationships: [mkRel("r1", "owner-1", "employs", "per-2")],
      },
      capabilities: ["phone-tap", "ask-affordance"],
    }) as HomePagePlan;
    expect(sectionBy(bare, "BusinessStory")).toHaveLength(0);

    const founder = mkObject(
      "per-2",
      "ping.social.person@1",
      "Taylor Morgan",
      { role: "founder", bio: "Third-generation plumber; started sweeping the shop at fourteen." },
    );
    const story = planPage({
      graph: {
        objects: [owner, founder],
        relationships: [mkRel("r1", "owner-1", "employs", "per-2")],
      },
      capabilities: ["phone-tap", "ask-affordance"],
    }) as HomePagePlan;
    expect(sectionBy(story, "BusinessStory", "founder-led")).toHaveLength(1);
  });

  test("BusinessStory: >=3 named people with roles selects team-grid", () => {
    const owner = ownerWith({ phone: "+15551234567" });
    const people = ["per-1", "per-2", "per-3"].map((id, i) =>
      mkObject(id, "ping.social.person@1", "Person " + (i + 1), {
        role: i === 0 ? "owner" : "technician",
        // Story evidence on one bound person is enough for the section.
        ...(i === 0 ? { bio: "Founded the company in 2009 with one truck." } : {}),
      }),
    );
    const plan = planPage({
      graph: {
        objects: [owner, ...people],
        relationships: people.map((p, i) => mkRel("r" + i, "owner-1", "employs", p.id)),
      },
      capabilities: ["phone-tap", "ask-affordance"],
    }) as HomePagePlan;
    expect(sectionBy(plan, "BusinessStory", "team-grid")).toHaveLength(1);
  });

  test("ServiceArea: vague coverage is ineligible; named areas select area-list", () => {
    const vague = planPage(
      minimalInput({
        graph: {
          objects: [ownerWith({ phone: "+15551234567", service_areas: ["we serve the area"] }), service("svc-1", "Deck Building", "decks")],
          relationships: [providesRel("r1", "svc-1")],
        },
      }),
    ) as HomePagePlan;
    expect(sectionBy(vague, "ServiceArea")).toHaveLength(0);

    const named = planPage(
      minimalInput({
        graph: {
          objects: [
            ownerWith({ phone: "+15551234567", service_areas: ["Benton County", "Linn County"] }),
            service("svc-1", "Deck Building", "decks"),
          ],
          relationships: [providesRel("r1", "svc-1")],
        },
      }),
    ) as HomePagePlan;
    expect(sectionBy(named, "ServiceArea", "area-list")).toHaveLength(1);
  });

  test("ServiceArea: address plus service-radius evidence selects hub-address", () => {
    const plan = planPage(
      minimalInput({
        graph: {
          objects: [
            ownerWith({
              phone: "+15551234567",
              address: "630 Maldonado Street, Grand Junction CO",
              serving: "Western Colorado",
            }),
            service("svc-1", "Plumbing", "plumbing"),
          ],
          relationships: [providesRel("r1", "svc-1")],
        },
      }),
    ) as HomePagePlan;
    expect(sectionBy(plan, "ServiceArea", "hub-address")).toHaveLength(1);
  });

  test("TrustBar metrics-strip: >=2 metric facts required", () => {
    const oneFact = planPage(
      minimalInput({
        graph: {
          objects: [ownerWith({ phone: "+15551234567", years_in_business: "12" }), service("svc-1", "Decks", "decks")],
          relationships: [providesRel("r1", "svc-1")],
        },
      }),
    ) as HomePagePlan;
    expect(sectionBy(oneFact, "TrustBar", "metrics-strip")).toHaveLength(0);

    const twoFacts = planPage(
      minimalInput({
        graph: {
          objects: [
            ownerWith({ phone: "+15551234567", years_in_business: "12", license_number: "CCB# 254240" }),
            service("svc-1", "Decks", "decks"),
          ],
          relationships: [providesRel("r1", "svc-1")],
        },
      }),
    ) as HomePagePlan;
    expect(sectionBy(twoFacts, "TrustBar", "metrics-strip")).toHaveLength(1);
  });

  test("Testimonials: named specific reviews select the cluster; absent reviews mean no review section", () => {
    // Default: no review evidence => no review section at all. The empty
    // state is opt-in only (see next test); absence of reviews is never
    // itself a section, and reviews are never fabricated.
    const empty = planPage(minimalInput()) as HomePagePlan;
    expect(sectionBy(empty, "TrustBar", "testimonial-cluster")).toHaveLength(0);
    expect(sectionBy(empty, "TrustBar", "testimonial-cluster-empty-state")).toHaveLength(0);

    const owner = ownerWith({ phone: "+15551234567" });
    const review = mkObject(
      "post-9",
      "ping.social.post@1",
      "Furnace install",
      { reviewer_name: "Dana W.", work_done: "furnace install in 2004" },
      "They installed our furnace in 2004 and serviced it ever since.",
    );
    const withReview = planPage({
      graph: {
        objects: [owner, review],
        relationships: [mkRel("r1", "owner-1", "publishes", "post-9")],
      },
      capabilities: ["phone-tap", "ask-affordance"],
    }) as HomePagePlan;
    expect(sectionBy(withReview, "TrustBar", "testimonial-cluster")).toHaveLength(1);
    expect(sectionBy(withReview, "TrustBar", "testimonial-cluster-empty-state")).toHaveLength(0);
  });

  test("Testimonials: the honest empty state is owner opt-in only, proposed never published", () => {
    // Opted out (default): absent reviews => no section.
    const out = planPage(
      minimalInput({ ownerIntent: { honestEmptyStateAllowed: false } }),
    ) as HomePagePlan;
    expect(sectionBy(out, "TrustBar", "testimonial-cluster-empty-state")).toHaveLength(0);
    expect(sectionBy(out, "TrustBar", "testimonial-cluster")).toHaveLength(0);

    // Opted in with owner copy: the empty state is PROPOSED, never planned.
    const proposed = planPage(
      minimalInput({
        ownerIntent: {
          honestEmptyStateAllowed: true,
          honestEmptyStateCopy: "Reviews are coming soon.",
        },
      }),
    ) as HomePagePlan;
    const sections = sectionBy(proposed, "TrustBar", "testimonial-cluster-empty-state");
    expect(sections).toHaveLength(1);
    expect(sections[0].status).toBe("proposed");
    expect(sections[0].job).toBe("PROVE");
  });

  test("ContactCTA: ineligible when no primary CTA binding is resolvable", () => {
    const owner = ownerWith({ trade: "carpentry" }); // no phone
    const plan = planPage({
      graph: {
        objects: [owner, service("svc-1", "Decks", "decks")],
        relationships: [providesRel("r1", "svc-1")],
      },
      capabilities: ["ask-affordance"],
    }) as HomePagePlan;
    expect(plan.ctaHierarchy.primary).toBeNull();
    expect(sectionBy(plan, "ContactCTA")).toHaveLength(0);
  });

  test("Navigation and Footer are always present; AskFYD-entry is always eligible", () => {
    const plan = planPage(minimalInput()) as HomePagePlan;
    expect(sectionBy(plan, "Navigation")).toHaveLength(1);
    expect(sectionBy(plan, "Footer")).toHaveLength(1);
    expect(sectionBy(plan, "AskFYD-entry", "floating-entry")).toHaveLength(1);
  });

  test("deterministic section order follows the family grammar", () => {
    const plan = planPage(minimalInput()) as HomePagePlan;
    // minimalInput: 1 service (no ServiceGrid), no gallery, no story, no metrics,
    // no areas, no reviews (no review section without evidence or owner opt-in).
    const order = plan.sections.map((s) => s.component + ":" + s.variant);
    expect(order).toEqual([
      "Navigation:minimal",
      "Hero:identity-led",
      "ContactCTA:conversion-dual",
      "AskFYD-entry:floating-entry",
      "Footer:credibility",
    ]);
    // Section ids are deterministic and unique.
    const ids = plan.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe("home:navigation:0");
    // Every section carries a job; the page job list mirrors section order.
    expect(plan.pageJobs).toEqual(plan.sections.map((s) => s.job));
    // Every section is planner-tagged: visual scale, grammar stage,
    // evidence importance, and a concept identity for semantic dedup.
    for (const s of plan.sections) {
      expect(["PRIMARY", "SECONDARY", "UTILITY"]).toContain(s.visualScale);
      expect(typeof s.importance).toBe("number");
      expect(s.conceptKey.length).toBeGreaterThan(0);
    }
    const stages = plan.sections.map((s) => s.grammarStage);
    expect(stages).toEqual(["navigation", "hero", "conversion", "serve", "close"]);
    // Grammar stages are non-decreasing across the page.
    const stageRank: Record<string, number> = {
      navigation: 0, hero: 1, trust: 2, services: 3, "visual-proof": 4,
      projects: 5, "human-story": 6, "social-proof": 7, location: 8,
      conversion: 9, serve: 10, close: 11,
    };
    const ranks = stages.map((st) => stageRank[st]);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });
});

// ============================================================================
// Semantic dedup: one concept, one section
// ============================================================================

describe("semantic dedup", () => {
  test("two service representations of one concept collapse to the richest", () => {
    const owner = ownerWith({ phone: "+15551234567", trade: "plumbing" });
    const dup = service("svc-a", "Plumbing", "Residential plumbing");
    const richer = mkObject(
      "svc-b",
      "ping.social.service@1",
      "Plumbing Services",
      { scope: "Full-service residential and commercial plumbing, drain cleaning", priority: "1" },
      "Plumbing Services done right.",
    );
    const other = service("svc-c", "HVAC", "Heating and cooling");
    const plan = planPage({
      graph: {
        objects: [owner, dup, richer, other],
        relationships: [providesRel("r1", "svc-a"), providesRel("r2", "svc-b"), providesRel("r3", "svc-c")],
      },
      capabilities: ["phone-tap", "ask-affordance"],
      ownerIntent: { serviceLinesAsBuyingUnits: true },
    }) as HomePagePlan;

    // The weaker representation is merged away: never bound, named in the notes.
    const boundIds = plan.sections.flatMap((s) => s.objectBindings.flatMap((b) => b.objectIds));
    expect(boundIds).not.toContain("svc-a");
    expect(boundIds).toContain("svc-b");
    expect(boundIds).toContain("svc-c");
    expect(plan.plannerNotes.join("\n")).toContain("svc-a");

    // Two distinct concepts => two featured buying units, no duplicates.
    const featured = plan.sections.filter((s) => s.component === "FeaturedService");
    expect(featured).toHaveLength(2);
    const keys = featured.map((s) => s.conceptKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("a single concept never earns a ServiceGrid", () => {
    const owner = ownerWith({ phone: "+15551234567", trade: "plumbing" });
    const dup = service("svc-a", "Plumbing", "Residential plumbing");
    const richer = service("svc-b", "Plumbing Services", "Full-service plumbing");
    const plan = planPage({
      graph: {
        objects: [owner, dup, richer],
        relationships: [providesRel("r1", "svc-a"), providesRel("r2", "svc-b")],
      },
      capabilities: ["phone-tap", "ask-affordance"],
    }) as HomePagePlan;
    // Two rows, one concept: grid needs >=2 distinct concepts.
    expect(plan.sections.filter((s) => s.component === "ServiceGrid")).toHaveLength(0);
    expect(plan.sections.filter((s) => s.component === "FeaturedService")).toHaveLength(0);
  });

  test("two project tellings of one project collapse to the richer telling", () => {
    const owner = ownerWith({ phone: "+15551234567", trade: "carpentry" });
    const thin = mkObject(
      "post-1", "ping.social.post@1", "Kitchen Remodel",
      { location: "Corvallis" }, "Nice kitchen.",
    );
    const rich = mkObject(
      "post-2", "ping.social.post@1", "Kitchen remodel services",
      { location: "Corvallis", narrative: "Full gut renovation: custom cabinets, quartz counters, new lighting." },
      "A kitchen with a story.",
    );
    const other = mkObject(
      "post-3", "ping.social.post@1", "Cedar Deck Overlook",
      { location: "Albany" }, "A deck with a story.",
    );
    const plan = planPage({
      graph: {
        objects: [owner, thin, rich, other],
        relationships: [
          mkRel("r1", "owner-1", "publishes", "post-1"),
          mkRel("r2", "owner-1", "publishes", "post-2"),
          mkRel("r3", "owner-1", "publishes", "post-3"),
        ],
      },
      capabilities: ["phone-tap", "ask-affordance"],
      media: {
        assets: [
          mkAsset("pp-1", "project-photo", 0.85, true, { objectIds: ["post-1"] }),
          mkAsset("pp-2", "project-photo", 0.9, true, { objectIds: ["post-2"] }),
          mkAsset("pp-3", "project-photo", 0.85, true, { objectIds: ["post-3"] }),
        ],
      },
    }) as HomePagePlan;
    const gallery = plan.sections.filter((s) => s.component === "ProjectGallery");
    expect(gallery).toHaveLength(1);
    const boundIds = gallery[0].objectBindings.flatMap((b) => b.objectIds);
    expect(boundIds).toContain("post-2");
    expect(boundIds).toContain("post-3");
    expect(boundIds).not.toContain("post-1");
    expect(plan.plannerNotes.join("\n")).toContain("post-1");
  });

  test("section-level dedup keeps the higher-evidence rendering of one concept", () => {
    // Two FeaturedService sections can never share a conceptKey: the final
    // pass keeps the higher-importance rendering. (Unit-level: same
    // component + conceptKey collapses.)
    const owner = ownerWith({ phone: "+15551234567", trade: "plumbing" });
    const a = service("svc-a", "Plumbing", "Residential plumbing", "1");
    const b = service("svc-b", "HVAC", "Heating and cooling", "2");
    const plan = planPage({
      graph: {
        objects: [owner, a, b],
        relationships: [providesRel("r1", "svc-a"), providesRel("r2", "svc-b")],
      },
      capabilities: ["phone-tap", "ask-affordance"],
      ownerIntent: { serviceLinesAsBuyingUnits: true },
    }) as HomePagePlan;
    const featured = plan.sections.filter((s) => s.component === "FeaturedService");
    expect(featured).toHaveLength(2);
    const keys = featured.map((s) => s.component + "|" + s.conceptKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ============================================================================
// Eligibility omission: no evidence => no section, never a placeholder
// ============================================================================

describe("eligibility omission", () => {
  test("no reviews and no opt-in => no review section anywhere", () => {
    const plan = planPage(minimalInput()) as HomePagePlan;
    const reviewSections = plan.sections.filter(
      (s) => s.component === "TrustBar" && s.variant.startsWith("testimonial-cluster"),
    );
    expect(reviewSections).toHaveLength(0);
    // The omission is recorded in the eligibility log, but no section exists.
    expect(JSON.stringify(plan.sections)).not.toContain("testimonial-cluster");
  });

  test("no projects => no gallery", () => {
    const plan = planPage(minimalInput()) as HomePagePlan;
    expect(plan.sections.filter((s) => s.component === "ProjectGallery")).toHaveLength(0);
  });

  test("no story evidence => no story section", () => {
    const owner = ownerWith({ phone: "+15551234567" });
    const founder = mkObject("per-1", "ping.social.person@1", "Taylor Morgan", { role: "founder" });
    const plan = planPage({
      graph: {
        objects: [owner, founder],
        relationships: [mkRel("r1", "owner-1", "employs", "per-1")],
      },
      capabilities: ["phone-tap", "ask-affordance"],
    }) as HomePagePlan;
    expect(plan.sections.filter((s) => s.component === "BusinessStory")).toHaveLength(0);
  });

  test("no services => no service sections, page still plans", () => {
    const plan = planPage(
      minimalInput({
        graph: {
          objects: [ownerWith({ phone: "+15551234567", trade: "carpentry" })],
          relationships: [],
        },
      }),
    ) as HomePagePlan;
    expect(plan.sections.filter((s) => s.component === "ServiceGrid")).toHaveLength(0);
    expect(plan.sections.filter((s) => s.component === "FeaturedService")).toHaveLength(0);
    // Always-on surfaces still plan.
    expect(plan.sections.map((s) => s.component)).toEqual(
      expect.arrayContaining(["Navigation", "Hero", "Footer"]),
    );
  });
});

// ============================================================================
// Evidence-weighted ordering within the grammar spine
// ============================================================================

describe("evidence-weighted ordering", () => {
  test("within a stage, higher evidence importance renders first regardless of build order", () => {
    const owner = ownerWith({ phone: "+15551234567", trade: "plumbing" });
    // svc-3 is built LAST (priority 3) but carries the only service imagery.
    const a = service("svc-a", "Plumbing", "Residential plumbing", "1");
    const b = service("svc-b", "HVAC", "Heating and cooling", "2");
    const c = service("svc-c", "Electrical", "Panels and wiring", "3");
    const plan = planPage({
      graph: {
        objects: [owner, a, b, c],
        relationships: [providesRel("r1", "svc-a"), providesRel("r2", "svc-b"), providesRel("r3", "svc-c")],
      },
      capabilities: ["phone-tap", "ask-affordance"],
      ownerIntent: { serviceLinesAsBuyingUnits: true },
      media: {
        assets: [mkAsset("svc-img-c", "service-imagery", 0.8, true, { objectIds: ["svc-c"] })],
      },
    }) as HomePagePlan;
    const featured = plan.sections.filter((s) => s.component === "FeaturedService");
    expect(featured).toHaveLength(3);
    const firstBound = featured[0].objectBindings[0].objectIds;
    expect(firstBound).toEqual(["svc-c"]);
    // Importance is strictly non-increasing within the stage.
    const imps = featured.map((s) => s.importance);
    expect([...imps].sort((x, y) => y - x)).toEqual(imps);
    expect(featured[0].importance).toBeGreaterThan(featured[1].importance);
  });

  test("conversion, serve, and close hold deterministic terminal positions", () => {
    const plan = planPage(coppersmithLikeInput()) as HomePagePlan;
    const tail = plan.sections.slice(-3).map((s) => s.component);
    expect(tail).toEqual(["ContactCTA", "AskFYD-entry", "Footer"]);
    expect(plan.sections[0].component).toBe("Navigation");
    expect(plan.sections[1].component).toBe("Hero");
  });

  test("every section carries the renderer visual-scale contract", () => {
    const plan = planPage(coppersmithLikeInput()) as HomePagePlan;
    const scales = new Map(plan.sections.map((s) => [s.component + ":" + s.variant, s.visualScale]));
    // Spot-check the contract against the family hierarchy: hero is the
    // primary moment, metrics are a utility strip, footer is utility.
    expect(scales.get("Hero:" + plan.sections.find((s) => s.component === "Hero")!.variant)).toBe("PRIMARY");
    expect(scales.get("Footer:credibility")).toBe("UTILITY");
  });
});

// ============================================================================
// Deterministic baseline: same inputs -> byte-identical SiteSpec
// ============================================================================

describe("deterministic baseline", () => {
  test("full-evidence plan is byte-identical across runs", () => {
    const a = planPage(coppersmithLikeInput());
    const b = planPage(coppersmithLikeInput());
    expect(a).not.toBeNull();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test("no customer-name conditionals: renaming the business changes only name-derived strings", () => {
    const renamed: PlannerInput = {
      ...coppersmithLikeInput(),
      graph: {
        objects: coppersmithLikeInput().graph.objects.map((o) =>
          o.id === "owner-1" ? { ...o, title: "Generic Trade Co LLC" } : o,
        ),
        relationships: coppersmithLikeInput().graph.relationships,
      },
    };
    const a = planPage(coppersmithLikeInput()) as HomePagePlan;
    const b = planPage(renamed) as HomePagePlan;
    // Same evidence shape => same section spine (components, variants, stages).
    expect(b.sections.map((s) => s.component + ":" + s.variant)).toEqual(
      a.sections.map((s) => s.component + ":" + s.variant),
    );
    expect(b.sections.map((s) => s.grammarStage)).toEqual(a.sections.map((s) => s.grammarStage));
  });
});

// ============================================================================
// Hero variant chain
// ============================================================================

describe("hero variant selection", () => {
  function heroVariantFor(input: PlannerInput): string {
    const plan = planPage(input) as HomePagePlan;
    return sectionBy(plan, "Hero")[0].variant;
  }

  test("HERO-V1: passing hero-documentary media selects media-rich", () => {
    expect(
      heroVariantFor(
        minimalInput({
          media: { assets: [mkAsset("h1", "hero-documentary", 0.9, true)] },
          designSignal: { authority: "signal-not-authority", imageDensityBand: "high" },
        }),
      ),
    ).toBe("media-rich");
  });

  test("HERO-V2: logo-mark plus brand voice selects identity-led", () => {
    expect(
      heroVariantFor(
        minimalInput({
          media: { assets: [mkAsset("l1", "logo-mark", 0.8, true)] },
          ownerIntent: { brandVoiceLine: "You Don't Need A Plumber, You Need A Coppersmith" },
        }),
      ),
    ).toBe("identity-led");
  });

  test("HERO-V3: service taxonomy with weak media selects service-led", () => {
    const owner = ownerWith({ phone: "+15551234567", trade: "hvac" });
    const services = ["Plumbing", "HVAC", "Cooling", "Heating"].map((t, i) =>
      service("s" + i, t, t.toLowerCase() + " systems"),
    );
    expect(
      heroVariantFor({
        graph: {
          objects: [owner, ...services],
          relationships: services.map((s, i) => providesRel("r" + i, s.id)),
        },
        capabilities: ["phone-tap", "ask-affordance"],
      }),
    ).toBe("service-led");
  });

  test("HERO-V4: emergency trade with phone and location selects local-action", () => {
    const owner = ownerWith({
      phone: "+15551234567",
      trade: "plumbing",
      address: "123 Main St",
      service_areas: ["Mesa County"],
    });
    expect(
      heroVariantFor({
        graph: { objects: [owner, service("s1", "Drain Cleaning", "drains")], relationships: [providesRel("r1", "s1")] },
        capabilities: ["phone-tap", "ask-affordance"],
      }),
    ).toBe("local-action");
  });

  test("HERO-V5: fallback is identity-led with typographic treatment, never a fake photo", () => {
    const variant = heroVariantFor(minimalInput());
    expect(variant).toBe("identity-led");
    const plan = planPage(minimalInput()) as HomePagePlan;
    const hero = sectionBy(plan, "Hero")[0];
    expect(hero.mediaBindings).toHaveLength(0);
  });

  test("low image density bars the media-rich hero even with a passing asset", () => {
    expect(
      heroVariantFor(
        minimalInput({
          media: { assets: [mkAsset("h1", "hero-documentary", 0.9, true)] },
          designSignal: { authority: "signal-not-authority", imageDensityBand: "low" },
        }),
      ),
    ).not.toBe("media-rich");
  });

  test("designSignal with a bad authority marker is discarded, never used for facts", () => {
    const plan = planPage(
      minimalInput({
        designSignal: { authority: "canonical-truth", imageDensityBand: "high" } as unknown as PlannerInput["designSignal"],
        media: { assets: [mkAsset("h1", "hero-documentary", 0.9, true)] },
      }),
    ) as HomePagePlan;
    expect(plan.plannerNotes.some((n) => n.includes("discarded"))).toBe(true);
    // Without a usable signal, density is unknown: the media gate alone decides.
    expect(sectionBy(plan, "Hero")[0].variant).toBe("media-rich");
  });
});

// ============================================================================
// CTA hierarchy
// ============================================================================

describe("CTA primary resolution", () => {
  test("emergency-prone trade with phone resolves to phone-primary, formatted", () => {
    const owner = ownerWith({ phone: "+15551234567", trade: "plumbing" });
    const plan = planPage({
      graph: { objects: [owner, service("s1", "Drain Cleaning", "drains")], relationships: [providesRel("r1", "s1")] },
      capabilities: ["phone-tap", "estimate-path", "ask-affordance"],
    }) as HomePagePlan;
    expect(plan.ctaHierarchy.primary?.kind).toBe("call");
    expect(plan.ctaHierarchy.primary?.display).toBe("(555) 123-4567");
    expect(plan.ctaHierarchy.primary?.display).not.toContain("+1");
    expect(plan.ctaHierarchy.resolutionRationale.some((r) => r.includes("CTA-P1"))).toBe(true);
  });

  test("project trade with estimate capability resolves to estimate-primary", () => {
    const owner = ownerWith({ phone: "+15551234567", trade: "carpentry" });
    const plan = planPage({
      graph: { objects: [owner, service("s1", "Decks", "decks")], relationships: [providesRel("r1", "s1")] },
      capabilities: ["phone-tap", "estimate-path", "ask-affordance"],
    }) as HomePagePlan;
    expect(plan.ctaHierarchy.primary?.kind).toBe("estimate");
    expect(plan.ctaHierarchy.primary?.label).toBe("Get an Estimate");
  });

  test("phone with no estimate path resolves to call", () => {
    const plan = planPage(minimalInput()) as HomePagePlan;
    expect(plan.ctaHierarchy.primary?.kind).toBe("call");
  });

  test("owner bounded override is honored within eligible bounds", () => {
    const owner = ownerWith({ phone: "+15551234567", trade: "plumbing" });
    const plan = planPage({
      graph: { objects: [owner, service("s1", "Drains", "drains")], relationships: [providesRel("r1", "s1")] },
      capabilities: ["phone-tap", "estimate-path", "ask-affordance"],
      ownerIntent: { primaryCta: "estimate" },
    }) as HomePagePlan;
    expect(plan.ctaHierarchy.primary?.kind).toBe("estimate");
  });

  test("owner override outside eligible bounds is ignored", () => {
    const plan = planPage(
      minimalInput({ ownerIntent: { primaryCta: "estimate" } }),
    ) as HomePagePlan;
    expect(plan.ctaHierarchy.primary?.kind).toBe("call");
  });

  test("placement map covers nav, hero, sections, footer", () => {
    const plan = planPage(minimalInput()) as HomePagePlan;
    const placements = plan.ctaHierarchy.placementMap.map((p) => p.placement);
    for (const p of ["navigation", "hero", "servicegrid", "contactcta", "footer", "askfyd-entry"]) {
      expect(placements).toContain(p);
    }
  });

  test("formatPhoneDisplay formats E.164 and passes through the rest", () => {
    expect(formatPhoneDisplay("+15551234567")).toBe("(555) 123-4567");
    expect(formatPhoneDisplay("5551234567")).toBe("(555) 123-4567");
    expect(formatPhoneDisplay("(555) 123-4567")).toBe("(555) 123-4567");
  });
});

// ============================================================================
// Media bar never lowered
// ============================================================================

describe("media bar integrity", () => {
  test("a hero-documentary asset that failed the bar never selects media-rich", () => {
    const plan = planPage(
      minimalInput({
        media: { assets: [mkAsset("h1", "hero-documentary", 0.85, false)] },
        designSignal: { authority: "signal-not-authority", imageDensityBand: "high" },
      }),
    ) as HomePagePlan;
    expect(sectionBy(plan, "Hero")[0].variant).not.toBe("media-rich");
  });

  test("no media binding in any plan references a failed asset", () => {
    const assets = [
      mkAsset("good-hero", "hero-documentary", 0.9, true),
      mkAsset("bad-hero", "hero-documentary", 0.85, false),
      mkAsset("good-logo", "logo-mark", 0.8, true),
      mkAsset("bad-service", "service-imagery", 0.7, false, { objectIds: ["svc-1"] }),
      mkAsset("good-service", "service-imagery", 0.75, true, { objectIds: ["svc-1"] }),
    ];
    const plan = planPage(
      minimalInput({
        media: { assets },
        designSignal: { authority: "signal-not-authority", imageDensityBand: "high" },
      }),
    ) as HomePagePlan;
    const passedIds = new Set(assets.filter((a) => a.passed).map((a) => a.assetId));
    for (const s of plan.sections) {
      for (const b of s.mediaBindings) {
        expect(passedIds.has(b.assetId)).toBe(true);
      }
    }
  });

  test("owner-portrait binds only when it provably depicts the named person", () => {
    const owner = ownerWith({ phone: "+15551234567" });
    const founder = mkObject("per-1", "ping.social.person@1", "Taylor Morgan", { role: "founder" });
    const plan = planPage({
      graph: { objects: [owner, founder], relationships: [mkRel("r1", "owner-1", "employs", "per-1")] },
      capabilities: ["phone-tap", "ask-affordance"],
      media: {
        assets: [
          mkAsset("portrait-1", "owner-portrait", 0.8, true, { depictsPersonId: "per-1" }),
          mkAsset("portrait-2", "owner-portrait", 0.85, true, { depictsPersonId: "per-999" }),
        ],
      },
    }) as HomePagePlan;
    const story = sectionBy(plan, "BusinessStory")[0];
    expect(story.mediaBindings.map((b) => b.assetId)).toEqual(["portrait-1"]);
  });

  test("featured services never repeat one image and never cross trades", () => {
    // Two service lines (Plumbing, Heating & Cooling) and a single
    // unbound condenser asset that won under hvac: it may illustrate the
    // HVAC line only. Plumbing gets no honest binding -> scope-lead.
    const plumbing = service("svc-plumb", "Plumbing", "Pipes, drains, fixtures");
    const hvacSvc = service("svc-hvac", "Heating & Cooling", "Furnaces and AC");
    const condenser = mkAsset("condenser-1", "service-imagery", 0.92, true, { onTrade: "hvac" });
    const plan = planPage(
      minimalInput({
        graph: {
          objects: [ownerWith({ phone: "+15551234567" }), plumbing, hvacSvc],
          relationships: [providesRel("r1", plumbing.id), providesRel("r2", hvacSvc.id)],
        },
        media: { assets: [condenser] },
      }),
    ) as HomePagePlan;
    const featured = sectionBy(plan, "FeaturedService");
    expect(featured).toHaveLength(2);
    const byService = new Map(featured.map((s) => [s.objectBindings[0].objectIds[0], s]));
    const hvacSection = byService.get("svc-hvac")!;
    const plumbingSection = byService.get("svc-plumb")!;
    expect(hvacSection.variant).toBe("media-lead");
    expect(hvacSection.mediaBindings.map((b) => b.assetId)).toEqual(["condenser-1"]);
    // Condenser is hvac-won: binding it to Plumbing would be wrong media.
    expect(plumbingSection.variant).toBe("scope-lead");
    expect(plumbingSection.mediaBindings).toHaveLength(0);
  });

  test("featured services consume each unbound asset at most once", () => {
    // Two plumbing-titled lines, one on-trade unbound asset: the first
    // line binds it, the second falls back to scope-lead (no repeat).
    const s1 = service("svc-a", "Plumbing", "Pipes and fixtures");
    const s2 = service("svc-b", "Drain Cleaning", "Drains and sewers");
    const asset = mkAsset("pipe-1", "service-imagery", 0.9, true, { onTrade: "plumbing" });
    const plan = planPage(
      minimalInput({
        graph: {
          objects: [ownerWith({ phone: "+15551234567" }), s1, s2],
          relationships: [providesRel("r1", s1.id), providesRel("r2", s2.id)],
        },
        media: { assets: [asset] },
      }),
    ) as HomePagePlan;
    const featured = sectionBy(plan, "FeaturedService");
    expect(featured).toHaveLength(2);
    const bound = featured.flatMap((s) => s.mediaBindings.map((b) => b.assetId));
    expect(bound).toEqual(["pipe-1"]);
    expect(featured.map((s) => s.variant)).toContain("scope-lead");
  });
});

// ============================================================================
// Editorial rules
// ============================================================================

describe("editorial rules", () => {
  test("services order by business priority, never alphabetical", () => {
    const owner = ownerWith({ phone: "+15551234567" });
    const zebra = service("s-z", "Zebra Service", "scope z", "1");
    const apple = service("s-a", "Apple Service", "scope a", "2");
    const mango = service("s-m", "Mango Service", "scope m", "3");
    const plan = planPage({
      graph: {
        objects: [owner, zebra, apple, mango],
        relationships: [providesRel("r1", "s-z"), providesRel("r2", "s-a"), providesRel("r3", "s-m")],
      },
      capabilities: ["phone-tap", "ask-affordance"],
    }) as HomePagePlan;
    const grid = sectionBy(plan, "ServiceGrid")[0];
    expect(grid.objectBindings[0].objectIds).toEqual(["s-z", "s-a", "s-m"]);
  });

  test("owner intent priority order outranks the priority field", () => {
    const owner = ownerWith({ phone: "+15551234567" });
    const plan = planPage({
      graph: {
        objects: [owner, service("s1", "A", "scope a", "1"), service("s2", "B", "scope b", "2")],
        relationships: [providesRel("r1", "s1"), providesRel("r2", "s2")],
      },
      capabilities: ["phone-tap", "ask-affordance"],
      ownerIntent: { servicePriority: ["s2", "s1"] },
    }) as HomePagePlan;
    const grid = sectionBy(plan, "ServiceGrid")[0];
    expect(grid.objectBindings[0].objectIds).toEqual(["s2", "s1"]);
  });

  test("headline rule: owner > source-site > derived > pending; never the legal name by default", () => {
    const base = minimalInput();
    const pending = planPage(base) as HomePagePlan;
    expect(pending.headline.h1).toBeNull();
    expect(pending.headline.source).toBe("pending");
    expect(pending.headline.usesLegalName).toBe(false);

    const byOwner = planPage(minimalInput({ ownerIntent: { headline: "Built to outlast." } })) as HomePagePlan;
    expect(byOwner.headline).toMatchObject({ h1: "Built to outlast.", source: "owner" });
    expect(sectionBy(byOwner, "Hero")[0].headline?.h1).toBe("Built to outlast.");

    const bySource = planPage(
      minimalInput({ ownerIntent: { sourceHeadline: "You Don't Need A Plumber, You Need A Coppersmith" } }),
    ) as HomePagePlan;
    expect(bySource.headline.source).toBe("source-site");

    // The H1 lives on the Hero and only there.
    const withH1 = byOwner.sections.filter((s) => s.headline !== undefined);
    expect(withH1).toHaveLength(1);
    expect(withH1[0].component).toBe("Hero");
  });
});

// ============================================================================
// Family, not clones: HPP-like vs Coppersmith-like
// ============================================================================

function hppLikeInput(): PlannerInput {
  const owner = ownerWith(
    {
      phone: "+15412865190",
      trade: "carpentry",
      license_number: "CCB# 254240",
      project_count: "125+",
      years_in_business: "12",
      service_areas: ["Benton County", "Linn County", "Marion County", "Polk County"],
      rating_summary: "5.0",
      address: "Adair Village OR",
      newsletter: "Stay Ahead of Home Maintenance",
    },
    "Happy Place Carpentry LLC",
  );
  const services = [
    service("svc-decks", "Decks", "Custom decks and outdoor living", "1"),
    service("svc-fences", "Fences", "Privacy and perimeter fencing", "2"),
    service("svc-drywall", "Drywall", "Interior drywall and finishing", "3"),
    service("svc-framing", "Framing", "Structural framing", "4"),
    service("svc-remodels", "Remodels", "Whole-home remodels", "5"),
  ];
  const people = [
    mkObject("per-taylor", "ping.social.person@1", "Taylor Morgan", { role: "founder" }),
    mkObject("per-lanie", "ping.social.person@1", "Lanie Morgan", { role: "owner" }),
  ];
  const projects = [
    mkObject("post-1", "ping.social.post@1", "Steel-Framed Covered Privacy Courtyard", { location: "Corvallis" }, "A courtyard with a story."),
    mkObject("post-2", "ping.social.post@1", "Cedar Deck Overlook", { location: "Albany" }, "A deck with a story."),
  ];
  const objects = [owner, ...services, ...people, ...projects];
  const relationships: PingRelationship[] = [
    ...services.map((s, i) => providesRel("r-s" + i, s.id)),
    ...people.map((p, i) => mkRel("r-p" + i, "owner-1", "employs", p.id)),
    ...projects.map((p, i) => mkRel("r-w" + i, "owner-1", "publishes", p.id)),
  ];
  return {
    graph: { objects, relationships },
    capabilities: [
      "phone-tap",
      "estimate-path",
      "ask-affordance",
      "address-display",
      "map-route",
      "newsletter-capture",
    ],
    media: {
      assets: [
        mkAsset("hpp-hero", "hero-documentary", 0.92, true),
        mkAsset("hpp-logo", "logo-mark", 0.8, true),
        ...services.slice(0, 4).map((s, i) => mkAsset("hpp-svc-" + i, "service-imagery", 0.7 + i * 0.02, true, { objectIds: [s.id] })),
        mkAsset("hpp-pp-1", "project-photo", 0.85, true, { objectIds: ["post-1"] }),
        mkAsset("hpp-pp-2", "project-photo", 0.8, true, { objectIds: ["post-2"] }),
        mkAsset("hpp-taylor", "owner-portrait", 0.8, true, { depictsPersonId: "per-taylor" }),
        mkAsset("hpp-lanie", "owner-portrait", 0.8, true, { depictsPersonId: "per-lanie" }),
      ],
    },
    designSignal: {
      authority: "signal-not-authority",
      imageDensityBand: "high",
      imageFinish: "documentary",
      navLabels: ["Services", "Our Work", "About", "Contact"],
    },
    ownerIntent: {
      headline: "Your favorite part of coming home should be the home itself.",
      brandVoiceLine: "Your favorite part of coming home should be the home itself.",
    },
  };
}

function coppersmithLikeInput(): PlannerInput {
  const owner = ownerWith(
    {
      phone: "+19705550134",
      trade: "plumbing",
      years_in_business: "25+",
      rating_summary: "4.9",
      address: "630 Maldonado Street, Grand Junction CO",
      serving: "Western Colorado",
    },
    "Coppersmith Plumbing LLC",
  );
  const services = [
    service("svc-plumb", "Plumbing", "Residential and commercial plumbing"),
    service("svc-hvac", "HVAC", "Heating and cooling systems"),
    service("svc-cool", "Cooling", "AC installation and service"),
    service("svc-heat", "Heating", "Furnaces and heat pumps"),
    service("svc-vent", "Ventilation", "Ductwork and ventilation"),
  ];
  const people = [
    mkObject("per-1", "ping.social.person@1", "Owner One", {
      role: "owner",
      bio: "Master plumber; founded the company in 2001 with one truck.",
    }),
    mkObject("per-2", "ping.social.person@1", "Tech Two", { role: "technician" }),
    mkObject("per-3", "ping.social.person@1", "Tech Three", { role: "technician" }),
    mkObject("per-4", "ping.social.person@1", "Tech Four", { role: "installer" }),
  ];
  const reviews = [
    mkObject(
      "post-r1",
      "ping.social.post@1",
      "Furnace install 2004",
      { reviewer_name: "Dana W.", work_done: "furnace install" },
      "They installed our furnace in 2004 and have serviced it for 19 years.",
    ),
    mkObject(
      "post-r2",
      "ping.social.post@1",
      "Water heater",
      { reviewer_name: "Mike R.", work_done: "water heater replacement" },
      "Same-day water heater replacement, fair price, clean work.",
    ),
  ];
  const products = [
    mkObject("prod-1", "ping.social.product@1", "Tankless Water Heater X"),
    mkObject("prod-2", "ping.social.product@1", "High-Efficiency Furnace Y"),
  ];
  const objects = [owner, ...services, ...people, ...reviews, ...products];
  const relationships: PingRelationship[] = [
    ...services.map((s, i) => providesRel("r-s" + i, s.id)),
    ...people.map((p, i) => mkRel("r-p" + i, "owner-1", "employs", p.id)),
    ...reviews.map((p, i) => mkRel("r-r" + i, "owner-1", "publishes", p.id)),
    ...products.map((p, i) => mkRel("r-d" + i, "owner-1", "provides", p.id)),
  ];
  return {
    graph: { objects, relationships },
    capabilities: ["phone-tap", "schedule-path", "ask-affordance", "address-display", "map-route"],
    media: {
      assets: [mkAsset("cop-logo", "logo-mark", 0.8, true)],
    },
    designSignal: { authority: "signal-not-authority", imageDensityBand: "medium" },
    ownerIntent: {
      sourceHeadline: "You Don't Need A Plumber, You Need A Coppersmith",
      brandVoiceLine: "You Don't Need A Plumber, You Need A Coppersmith",
      serviceLinesAsBuyingUnits: true,
    },
  };
}

describe("family, not clones", () => {
  test("HPP-like and Coppersmith-like inputs produce related but materially different plans", () => {
    const hpp = planPage(hppLikeInput()) as HomePagePlan;
    const cop = planPage(coppersmithLikeInput()) as HomePagePlan;

    // Same family: same registry, same section order law, same always-on components.
    const hppComponents = hpp.sections.map((s) => s.component);
    const copComponents = cop.sections.map((s) => s.component);
    for (const c of ["Navigation", "Hero", "Footer", "AskFYD-entry", "ContactCTA"]) {
      expect(hppComponents).toContain(c);
      expect(copComponents).toContain(c);
    }
    // Both plans are deterministic.
    expect(JSON.stringify(planPage(hppLikeInput()))).toBe(JSON.stringify(hpp));

    // Materially different: hero variants differ by evidence.
    expect(sectionBy(hpp, "Hero")[0].variant).toBe("media-rich");
    expect(sectionBy(cop, "Hero")[0].variant).toBe("identity-led");

    // CTA primary differs by trade evidence: project trade -> estimate; emergency trade -> phone.
    expect(hpp.ctaHierarchy.primary?.kind).toBe("estimate");
    expect(cop.ctaHierarchy.primary?.kind).toBe("call");
    expect(cop.ctaHierarchy.primary?.display).toBe("(970) 555-0134");

    // Proof surfaces differ by evidence: HPP has a project gallery; Coppersmith has mid-page reviews.
    expect(sectionBy(hpp, "ProjectGallery", "editorial")).toHaveLength(1);
    expect(sectionBy(cop, "ProjectGallery")).toHaveLength(0);
    expect(sectionBy(cop, "TrustBar", "testimonial-cluster")).toHaveLength(1);
    const copClusterIdx = cop.sections.findIndex((s) => s.variant === "testimonial-cluster");
    const copCtaIdx = cop.sections.findIndex((s) => s.component === "ContactCTA");
    expect(copClusterIdx).toBeGreaterThan(-1);
    expect(copClusterIdx).toBeLessThan(copCtaIdx); // testimonials placed for trust, never appended

    // ServiceGrid variants differ: HPP media-grid (imagery covers >=60%), Coppersmith cards.
    expect(sectionBy(hpp, "ServiceGrid")[0].variant).toBe("media-grid");
    expect(sectionBy(cop, "ServiceGrid")[0].variant).toBe("cards");

    // Coppersmith's distinct buying units earn FeaturedService lines (max 3, distinct objects).
    const featured = sectionBy(cop, "FeaturedService");
    expect(featured.length).toBe(3);
    expect(new Set(featured.flatMap((s) => s.objectBindings[0].objectIds)).size).toBe(3);

    // Coppersmith's crew earns team-grid; HPP's founders earn founder-led.
    expect(sectionBy(hpp, "BusinessStory")[0].variant).toBe("founder-led");
    expect(sectionBy(cop, "BusinessStory")[0].variant).toBe("team-grid");

    // Headlines: editorial identity copy, never the legal name.
    expect(hpp.headline.h1).toBe("Your favorite part of coming home should be the home itself.");
    expect(cop.headline.h1).toBe("You Don't Need A Plumber, You Need A Coppersmith");
    expect(hpp.headline.h1).not.toContain("LLC");
    expect(cop.headline.h1).not.toContain("LLC");
  });

  test("planPageFromGraph degrades deterministically with graph-only input", () => {
    const plan = planPageFromGraph(hppLikeInput().graph) as HomePagePlan;
    expect(plan).not.toBeNull();
    // No capabilities passed: phone-tap derived from the phone field, no estimate-path.
    expect(plan.ctaHierarchy.primary?.kind).toBe("call");
    // No media, no intent: the 5-service taxonomy selects service-led, never a fake-photo hero.
    expect(sectionBy(plan, "Hero")[0].variant).toBe("service-led");
    expect(JSON.stringify(planPageFromGraph(hppLikeInput().graph))).toBe(JSON.stringify(plan));
  });
});

// ============================================================================
// Service-area adapter: hub line never repeats inside the area list
// ============================================================================

describe("adaptedServiceAreaList hub exclusion", () => {
  const hubOwner = () =>
    ownerWith(
      { phone: "+15551234567", address: "Grand Junction, Colorado 81501, United States" },
      "Coppersmith Plumbing LLC",
    );
  const hubLocation = () =>
    mkObject(
      "loc-1",
      "ping.social.location@1",
      "Grand Junction, Colorado, 81501, United States",
    );

  test("without exclusion, the hub-equivalent location title appears in the list", () => {
    const list = adaptedServiceAreaList(hubOwner(), [hubLocation()]);
    expect(list).toContain("Grand Junction, Colorado, 81501, United States");
  });

  test("excludeHubLine drops the hub line and its punctuation variants, keeps real regions", () => {
    const owner = hubOwner();
    owner.description = "We serviced Western Colorado for over 25 years.";
    const list = adaptedServiceAreaList(owner, [hubLocation()], { excludeHubLine: true });
    expect(list).not.toContain("Grand Junction, Colorado, 81501, United States");
    expect(list).not.toContain("Grand Junction, Colorado 81501, United States");
    // Distinct verified region names survive the exclusion.
    expect(list).toContain("Western Colorado");
  });
});
