/**
 * Composition profile tests: strategy pipeline, planner policy mapping,
 * and the live-intent > tenant-record > strategy precedence (B3).
 * No tenant names, no business-name checks anywhere on this path.
 */

import {
  applyPlannerPolicy,
  asCompositionIntent,
  DEFAULT_COMPOSITION_PROFILE,
  resolveCompositionProfile,
  strategyForSite,
  systemDefaultForCategory,
  type SiteCompositionProfile,
} from "../profile";
import type { ObjectGraph } from "../../sitespec/types";

const EMPTY_GRAPH: ObjectGraph = { objects: [], relationships: [] };

function record(over: Partial<SiteCompositionProfile>): SiteCompositionProfile {
  return { ...DEFAULT_COMPOSITION_PROFILE, ...over };
}

describe("systemDefaultForCategory", () => {
  test("trade default comes from the TRADES archetype profile, not a tenant branch", () => {
    const d = systemDefaultForCategory("trade");
    expect(d.homeSectionOrder[0]).toBe("Hero");
    expect(d.homeSectionOrder[1]).toBe("Services");
    expect(d.layoutCharacter).toBe("CRAFT");
    expect(d.themeTokenOverrides.accent).toBe("#b3541e");
  });

  test("knowledge default comes from the KNOWLEDGE profile", () => {
    const d = systemDefaultForCategory("knowledge");
    expect(d.layoutCharacter).toBe("EDITORIAL");
    expect(d.homeSectionOrder).toContain("SocialProof");
  });

  test("unknown category falls back to knowledge, never throws", () => {
    const d = systemDefaultForCategory("nonsense" as never);
    expect(d).toEqual(systemDefaultForCategory("knowledge"));
  });
});

describe("applyPlannerPolicy", () => {
  test("trade urgency 0.6 maps to the medium policy: standard CTA", () => {
    const out = applyPlannerPolicy(record({ ctaEmphasis: "elevated" }), "trade");
    expect(out.ctaEmphasis).toBe("standard");
  });

  test("knowledge urgency 0.25 maps to the low policy: quiet CTA", () => {
    const out = applyPlannerPolicy(record({ ctaEmphasis: "elevated" }), "knowledge");
    expect(out.ctaEmphasis).toBe("quiet");
  });

  test("the policy only touches ctaEmphasis", () => {
    const base = record({ homeSectionOrder: ["Hero", "CTA"] });
    const out = applyPlannerPolicy(base, "trade");
    expect(out.homeSectionOrder).toEqual(["Hero", "CTA"]);
    expect(out.layoutCharacter).toBe(base.layoutCharacter);
    expect(out.themeTokenOverrides).toEqual(base.themeTokenOverrides);
  });
});

describe("strategyForSite", () => {
  test("one code path per category: trade strategy is deterministic", () => {
    const a = strategyForSite("trade", EMPTY_GRAPH);
    const b = strategyForSite("trade", EMPTY_GRAPH);
    expect(a).toEqual(b);
    expect(a.ctaEmphasis).toBe("standard");
    expect(a.layoutCharacter).toBe("CRAFT");
  });
});

describe("resolveCompositionProfile precedence", () => {
  test("strategy output is the base when nothing else is provided", () => {
    const out = resolveCompositionProfile({ category: "trade", graph: EMPTY_GRAPH });
    expect(out).toEqual(strategyForSite("trade", EMPTY_GRAPH));
  });

  test("tenant record overrides the strategy base", () => {
    const out = resolveCompositionProfile({
      category: "trade",
      graph: EMPTY_GRAPH,
      tenantRecord: record({ ctaEmphasis: "quiet", layoutCharacter: null }),
    });
    expect(out.ctaEmphasis).toBe("quiet");
    expect(out.layoutCharacter).toBeNull();
    // Untouched fields still come from the strategy.
    expect(out.themeTokenOverrides).toEqual(strategyForSite("trade", EMPTY_GRAPH).themeTokenOverrides);
  });

  test("live intent wins over the tenant record", () => {
    const out = resolveCompositionProfile({
      category: "trade",
      graph: EMPTY_GRAPH,
      tenantRecord: record({ ctaEmphasis: "quiet" }),
      liveIntent: { ctaEmphasis: "elevated" },
    });
    expect(out.ctaEmphasis).toBe("elevated");
  });

  test("order lists replace wholesale, never merge", () => {
    const out = resolveCompositionProfile({
      category: "trade",
      graph: EMPTY_GRAPH,
      tenantRecord: record({ homeSectionOrder: ["Hero", "CTA"] }),
    });
    expect(out.homeSectionOrder).toEqual(["Hero", "CTA"]);
  });
});

describe("asCompositionIntent", () => {
  test("accepts a well-shaped intent block", () => {
    expect(
      asCompositionIntent({ homeSectionOrder: ["Hero", "CTA"], ctaEmphasis: "quiet" }),
    ).toEqual({ homeSectionOrder: ["Hero", "CTA"], ctaEmphasis: "quiet" });
  });

  test("rejects malformed shapes instead of coercing", () => {
    expect(asCompositionIntent(null)).toBeNull();
    expect(asCompositionIntent("quiet")).toBeNull();
    expect(asCompositionIntent({ ctaEmphasis: "loud" })).toBeNull();
    expect(asCompositionIntent({ homeSectionOrder: ["Hero", 42] })).toBeNull();
    expect(asCompositionIntent({})).toBeNull();
  });
});
