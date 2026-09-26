/**
 * Generic family-input builder tests (product lane).
 *
 * One planning path serves every family site. These tests pin the
 * evidence-driven derivation: trade detection, emergency/project intent,
 * capability derivation, headline precedence, and byte-identical
 * determinism per site.
 *
 * No network, no clock, no customer-name conditionals.
 */

import {
  buildFamilyInput,
  buildFamilyPlan,
  deriveCapabilities,
  deriveOwnerIntent,
  detectTradeEvidence,
  loadSiteObservation,
  supportedSiteIds,
} from "@/app/sites/_shared/family-input";
import { COPPERSMITH_GRAPH } from "@/fyd/proceduralize/__fixtures__/coppersmith-graph";
import { HAPPY_PLACE_RICH_GRAPH } from "@/fyd/proceduralize/__fixtures__/happy-place-rich-graph";
import {
  detectEmergencyTrade,
  detectUrgencySignals,
} from "@/fyd/proceduralize/planner";

describe("site registry", () => {
  test("serves coppersmith and happy-place", () => {
    expect(supportedSiteIds()).toEqual(["coppersmith-plumbing", "happy-place"]);
  });

  test("unknown siteId fails closed", () => {
    expect(() => buildFamilyPlan("nope")).toThrow("unknown family siteId");
  });

  test("missing observation degrades to no signal, never a failure", () => {
    // Happy Place has no pinned observation: the planner runs on the
    // graph alone.
    expect(loadSiteObservation("happy-place")).toBeNull();
    expect(loadSiteObservation("coppersmith-plumbing")).not.toBeNull();
  });
});

describe("trade evidence", () => {
  test("detects plumbing/hvac for coppersmith, carpentry for happy-place", () => {
    const coppersmith = detectTradeEvidence(COPPERSMITH_GRAPH);
    expect(coppersmith).toContain("plumbing");
    expect(coppersmith).toContain("hvac");
    expect(detectTradeEvidence(HAPPY_PLACE_RICH_GRAPH)).toContain("carpentry");
  });

  test("emergency trade: coppersmith yes (trade table), happy-place no", () => {
    expect(detectEmergencyTrade(COPPERSMITH_GRAPH)).toBe(true);
    expect(detectEmergencyTrade(HAPPY_PLACE_RICH_GRAPH)).toBe(false);
  });

  test("urgency phrases: neither fixture carries them", () => {
    expect(detectUrgencySignals(COPPERSMITH_GRAPH)).toBe(false);
    expect(detectUrgencySignals(HAPPY_PLACE_RICH_GRAPH)).toBe(false);
  });
});

describe("capability derivation", () => {
  test("coppersmith: phone + booking + hours, no estimate path", () => {
    const obs = loadSiteObservation("coppersmith-plumbing");
    const caps = deriveCapabilities(
      COPPERSMITH_GRAPH,
      obs,
      detectTradeEvidence(COPPERSMITH_GRAPH),
      false,
    );
    expect(caps).toContain("ask-affordance");
    expect(caps).toContain("phone-tap");
    expect(caps).toContain("schedule-path");
    expect(caps).toContain("hours-display");
    expect(caps).toContain("address-display");
    expect(caps).not.toContain("estimate-path");
  });

  test("happy-place: phone + estimate path, no booking evidence", () => {
    const caps = deriveCapabilities(
      HAPPY_PLACE_RICH_GRAPH,
      null,
      detectTradeEvidence(HAPPY_PLACE_RICH_GRAPH),
      false,
    );
    expect(caps).toContain("ask-affordance");
    expect(caps).toContain("phone-tap");
    expect(caps).toContain("estimate-path");
    expect(caps).not.toContain("schedule-path");
  });
});

describe("owner intent derivation", () => {
  test("happy-place: warm-craftsman theme, project trade, estimate CTA, graph tagline headline", () => {
    const intent = deriveOwnerIntent(
      "happy-place",
      HAPPY_PLACE_RICH_GRAPH,
      detectTradeEvidence(HAPPY_PLACE_RICH_GRAPH),
      false,
      ["estimate-path"],
    );
    expect(intent.themeName).toBe("fyd/hpp-warm-craftsman@1");
    expect(intent.tradeCategory).toBe("project");
    expect(intent.primaryCta).toBe("estimate");
    expect(intent.sourceHeadline).toBe(
      "Your favorite part of coming home should be the home itself.",
    );
  });

  test("coppersmith: trade-authority theme, emergency trade, call CTA, owner-pin headline", () => {
    const intent = deriveOwnerIntent(
      "coppersmith-plumbing",
      COPPERSMITH_GRAPH,
      detectTradeEvidence(COPPERSMITH_GRAPH),
      false,
      ["phone-tap"],
    );
    expect(intent.themeName).toBe("fyd/coppersmith-trade-authority@1");
    expect(intent.tradeCategory).toBe("emergency");
    expect(intent.primaryCta).toBe("call");
    expect(intent.sourceHeadline).toBe("You Don't Need A Plumber, You Need A Coppersmith");
  });
});

describe("end-to-end builds", () => {
  test("buildFamilyPlan is byte-identical across runs for both sites", () => {
    for (const siteId of supportedSiteIds()) {
      const a = JSON.stringify(buildFamilyPlan(siteId));
      const b = JSON.stringify(buildFamilyPlan(siteId));
      expect(a).toBe(b);
    }
  });

  test("the two sites plan materially differently from evidence", () => {
    const coppersmith = buildFamilyPlan("coppersmith-plumbing");
    const happyPlace = buildFamilyPlan("happy-place");
    expect(coppersmith.theme.name).toBe("fyd/coppersmith-trade-authority@1");
    expect(happyPlace.theme.name).toBe("fyd/hpp-warm-craftsman@1");
    expect(coppersmith.sections.length).not.toBe(happyPlace.sections.length);
    expect(coppersmith.headline.h1).not.toBe(happyPlace.headline.h1);
  });

  test("buildFamilyInput returns the full render shape", () => {
    for (const siteId of supportedSiteIds()) {
      const input = buildFamilyInput(siteId);
      expect(input.siteSlug).toBe(siteId);
      expect(input.askHref).toBe("#ask-fyd");
      expect(input.plan.sections.length).toBeGreaterThan(0);
      expect(input.graph.objects.length).toBeGreaterThan(0);
    }
  });
});
