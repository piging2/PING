/**
 * Tests for media role scoring (media-score@1, presentation-observations.md
 * Part B).
 *
 * Contract: scoring is pure (same asset data in, same scorecard out), the
 * five components follow the locked formulas, the per-role bars are the
 * locked V1 numbers, and every rejection is typed (R1..R6 + MIN_SCORE)
 * and never silent.
 *
 * No fs, no network, no clock: fixtures are hand-built FydMediaObjects.
 */

import type { FydMediaObject } from "../types";
import {
  barForRole,
  ROLE_ACCEPTANCE_BARS,
  scoreAsset,
  scoreOneRole,
  SCORE_VERSION,
  weightedScore,
  type MediaScoreInput,
} from "../score";

const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);

function fixtureAsset(over: Partial<FydMediaObject> = {}): FydMediaObject {
  return {
    id: "fyd-media-aaaaaaaa",
    schema: "ping.social.media@1",
    title: "Test image",
    mediaType: "image",
    roles: [],
    rightsSource: "public-demo-source",
    rightsBasis: "Public marketing imagery on the business site; FYD claims no copyright.",
    lifecycle: "derivatives_ready",
    provenance: {
      sourceUrl: "https://www.example.com/images/photo.jpg",
      sourcePage: "https://www.example.com/",
      observedAt: "2026-09-25T00:00:00.000Z",
    },
    digest: DIGEST_A,
    originalFormat: "jpeg",
    width: 1600,
    height: 900,
    variants: [
      {
        name: "card",
        width: 768,
        height: 432,
        format: "webp",
        url: "/fyd-media/demo-site/" + DIGEST_A + "/card-768w.webp",
        bytes: 50000,
        digest: DIGEST_B,
        derivedFrom: DIGEST_A,
      },
    ],
    depicts: [],
    altText: "A photo",
    altTextSource: "source",
    visibility: "public",
    ...over,
  };
}

function inputFor(
  asset: FydMediaObject,
  role: MediaScoreInput["role"],
  businessTrade: string,
  extra: Partial<MediaScoreInput> = {},
): MediaScoreInput {
  return { asset, role, businessTrade, siblingAssets: [], presentation: null, ...extra };
}

describe("scoring determinism", () => {
  test("same asset data in, same scorecard out", () => {
    const asset = fixtureAsset({ altText: "new cedar deck we built" });
    const card1 = scoreAsset(asset, "carpentry", [], null);
    const card2 = scoreAsset(asset, "carpentry", [], null);
    expect(card2).toEqual(card1);
  });

  test("component scores are deterministic across identical inputs", () => {
    const asset = fixtureAsset();
    const r1 = scoreOneRole(inputFor(asset, "hero-documentary", "carpentry"));
    const r2 = scoreOneRole(inputFor(asset, "hero-documentary", "carpentry"));
    expect(r2).toEqual(r1);
  });
});

describe("locked acceptance bars", () => {
  test("every role's weights sum to 1.0", () => {
    for (const bar of ROLE_ACCEPTANCE_BARS) {
      const sum = bar.weights.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    }
  });

  test("hero-documentary bar matches the locked V1 numbers", () => {
    const bar = barForRole("hero-documentary");
    expect(bar.minScore).toBe(0.7);
    expect(bar.minWidth).toBe(1200);
    expect(bar.aspectBands).toEqual([[1.33, 2.4]]);
    expect(bar.minDocumentary).toBe(0.5);
    expect(bar.minRelevance).toBe(0.6);
    expect(bar.weights).toEqual([0.35, 0.3, 0.15, 0.1, 0.1]);
  });

  test("gallery bar matches the locked V1 numbers", () => {
    const bar = barForRole("gallery");
    expect(bar.minScore).toBe(0.45);
    expect(bar.minWidth).toBe(400);
    expect(bar.aspectBands).toEqual([[0.5, 2.5]]);
    expect(bar.minDocumentary).toBe(0.0);
    expect(bar.minRelevance).toBe(0.2);
    expect(bar.weights).toEqual([0.25, 0.15, 0.2, 0.2, 0.2]);
  });

  test("hero score formula: 0.35*rel + 0.30*doc + 0.15*res + 0.10*aspect + 0.10*uniq", () => {
    // relevance 0.6 (projects-section context only), documentary 0.5,
    // resolution 1.0 (1400px >= 1200), aspect 0.5 (1.167 within 25% of the
    // 1.33 band edge), uniqueness 1.0.
    // Expected: 0.35*0.6 + 0.30*0.5 + 0.15*1 + 0.10*0.5 + 0.10*1 = 0.66.
    const asset = fixtureAsset({
      width: 1400,
      height: 1200,
      altText: "A nice photo",
      provenance: {
        sourceUrl: "https://www.example.com/images/img-001.jpg",
        sourcePage: "https://www.example.com/",
        observedAt: "2026-09-25T00:00:00.000Z",
      },
    });
    const result = scoreOneRole(
      inputFor(asset, "hero-documentary", "carpentry", {
        observationContext: { sectionKind: "projects" },
      }),
    );
    expect(result.components.onTradeRelevance).toBe(0.6);
    expect(result.components.documentarySignal).toBe(0.5);
    expect(result.components.resolutionAdequacy).toBe(1.0);
    expect(result.components.aspectFit).toBe(0.5);
    expect(result.components.uniqueness).toBe(1.0);
    expect(result.score).toBeCloseTo(0.66, 10);
    expect(weightedScore(result.components, barForRole("hero-documentary"))).toBeCloseTo(
      result.score,
      10,
    );
  });
});

describe("R1 wrong-trade content (conduit on a carpentry site)", () => {
  const conduit = fixtureAsset({
    altText: "copper conduit and pipes installation",
    title: "Conduit pipes",
    provenance: {
      sourceUrl: "https://www.example.com/images/conduit-pipes.jpg",
      sourcePage: "https://www.example.com/",
      observedAt: "2026-09-25T00:00:00.000Z",
    },
  });

  test("conduit photo is REJECTED for hero-documentary on a carpentry site", () => {
    const result = scoreOneRole(inputFor(conduit, "hero-documentary", "carpentry"));
    expect(result.eligible).toBe(false);
    expect(result.rejections.some((r) => r.rule === "R1")).toBe(true);
    // Cross-trade cap: plumbing tokens, no carpentry signal -> 0.1.
    expect(result.components.onTradeRelevance).toBe(0.1);
  });

  test("cross-trade assets cannot clear the gallery bar either (cap 0.1 < minRelevance 0.2)", () => {
    const result = scoreOneRole(inputFor(conduit, "gallery", "carpentry"));
    expect(result.eligible).toBe(false);
    expect(result.rejections.some((r) => r.rule === "R1")).toBe(true);
  });

  test("the same conduit photo scores fine for a plumbing business", () => {
    const result = scoreOneRole(inputFor(conduit, "hero-documentary", "plumbing"));
    expect(result.components.onTradeRelevance).toBe(1.0);
    expect(result.rejections.some((r) => r.rule === "R1")).toBe(false);
  });
});

describe("R2 documentary bar (AC condenser stock photo)", () => {
  const condenser = fixtureAsset({
    altText: "AC condenser unit",
    title: "Condenser",
    provenance: {
      sourceUrl: "https://www.example.com/images/shutterstock-ac-condenser-12345.jpg",
      sourcePage: "https://www.example.com/",
      observedAt: "2026-09-25T00:00:00.000Z",
    },
  });

  test("stock condenser is REJECTED for hero-documentary (the documented Coppersmith failure)", () => {
    const result = scoreOneRole(inputFor(condenser, "hero-documentary", "hvac"));
    expect(result.components.documentarySignal).toBe(0.0);
    expect(result.eligible).toBe(false);
    expect(result.rejections.some((r) => r.rule === "R2")).toBe(true);
  });

  test("documentary alt text scores 1.0", () => {
    const real = fixtureAsset({ altText: "installed the new condenser at the Miller job site" });
    const result = scoreOneRole(inputFor(real, "hero-documentary", "hvac"));
    expect(result.components.documentarySignal).toBe(1.0);
  });
});

describe("R3 resolution and R4 aspect", () => {
  test("R3: asset below the role minWidth is rejected for that role", () => {
    const small = fixtureAsset({ width: 300, height: 200 });
    const hero = scoreOneRole(inputFor(small, "hero-documentary", "carpentry"));
    expect(hero.eligible).toBe(false);
    expect(hero.rejections.some((r) => r.rule === "R3")).toBe(true);
    // ...but it may still qualify for a lower-bar role.
    const mid = fixtureAsset({ width: 500, height: 400, altText: "deck photo" });
    const gallery = scoreOneRole(inputFor(mid, "gallery", "carpentry"));
    expect(gallery.rejections.some((r) => r.rule === "R3")).toBe(false);
    expect(gallery.eligible).toBe(true);
  });

  test("R3 uses the spec formula min(1, min(width, minWidth) / minWidth)", () => {
    const asset = fixtureAsset({ width: 600, height: 400 });
    const result = scoreOneRole(inputFor(asset, "hero-documentary", "carpentry"));
    expect(result.components.resolutionAdequacy).toBeCloseTo(600 / 1200, 10);
  });

  test("R4: aspectFit 0.0 rejects for the role", () => {
    const portrait = fixtureAsset({ width: 800, height: 1600 }); // aspect 0.5
    const hero = scoreOneRole(inputFor(portrait, "hero-documentary", "carpentry"));
    expect(hero.components.aspectFit).toBe(0);
    expect(hero.eligible).toBe(false);
    expect(hero.rejections.some((r) => r.rule === "R4")).toBe(true);
  });

  test("aspect within 25% of a band edge is crop-tolerant (0.5), not rejected", () => {
    const asset = fixtureAsset({ width: 1200, height: 1000 }); // aspect 1.2
    const hero = scoreOneRole(inputFor(asset, "hero-documentary", "carpentry"));
    expect(hero.components.aspectFit).toBe(0.5);
    expect(hero.rejections.some((r) => r.rule === "R4")).toBe(false);
  });
});

describe("R6 near-duplicates", () => {
  test("near-duplicate sibling scores uniqueness 0.5 and loses ties", () => {
    const base = fixtureAsset({ digest: "c".repeat(64), width: 800, height: 600 });
    const near = fixtureAsset({
      digest: "d".repeat(64),
      width: 800,
      height: 600,
      variants: [
        {
          name: "card",
          width: 768,
          height: 576,
          format: "webp",
          url: "/fyd-media/demo-site/" + "d".repeat(64) + "/card-768w.webp",
          bytes: 50100, // within 2% of base's 50000
          digest: "e".repeat(64),
          derivedFrom: "d".repeat(64),
        },
      ],
    });
    const result = scoreOneRole(
      inputFor(near, "gallery", "carpentry", { siblingAssets: [base] }),
    );
    expect(result.components.uniqueness).toBe(0.5);
    const alone = scoreOneRole(inputFor(near, "gallery", "carpentry"));
    expect(alone.components.uniqueness).toBe(1.0);
    expect(alone.score).toBeGreaterThan(result.score);
  });

  test("same dimensions but very different byte size is not a near-duplicate", () => {
    const base = fixtureAsset({ digest: "c".repeat(64), width: 800, height: 600 });
    const other = fixtureAsset({
      digest: "d".repeat(64),
      width: 800,
      height: 600,
      variants: [
        {
          name: "card",
          width: 768,
          height: 576,
          format: "webp",
          url: "/fyd-media/demo-site/" + "d".repeat(64) + "/card-768w.webp",
          bytes: 120000, // far outside 2%
          digest: "e".repeat(64),
          derivedFrom: "d".repeat(64),
        },
      ],
    });
    const result = scoreOneRole(
      inputFor(other, "gallery", "carpentry", { siblingAssets: [base] }),
    );
    expect(result.components.uniqueness).toBe(1.0);
  });
});

describe("scorecard shape", () => {
  test("a strong hero candidate clears the hero-documentary bar", () => {
    const hero = fixtureAsset({
      altText: "new cedar deck we built in Grand Junction",
      title: "Deck project",
      provenance: {
        sourceUrl: "https://www.example.com/images/deck-project.jpg",
        sourcePage: "https://www.example.com/",
        observedAt: "2026-09-25T00:00:00.000Z",
      },
    });
    const card = scoreAsset(hero, "carpentry", [], null);
    expect(card.assetDigest).toBe(hero.digest);
    expect(card.scoreVersion).toBe(SCORE_VERSION);
    expect(card.scoreVersion).toBe("media-score@1");
    expect(card.eligibleRoles).toContain("hero-documentary");
    expect(card.rejections.filter((r) => r.role === "hero-documentary")).toHaveLength(0);
  });

  test("scorecard carries per-role scores, components, and typed rejections", () => {
    const weak = fixtureAsset({ width: 100, height: 100, altText: "x" });
    const card = scoreAsset(weak, "carpentry", [], null);
    expect(Object.keys(card.roleScores)).toHaveLength(5);
    expect(Object.keys(card.components)).toHaveLength(5);
    for (const role of Object.keys(card.roleScores) as Array<keyof typeof card.roleScores>) {
      expect(card.roleScores[role]).toBeGreaterThanOrEqual(0);
      expect(card.roleScores[role]).toBeLessThanOrEqual(1);
    }
    expect(card.rejections.length).toBeGreaterThan(0);
    for (const r of card.rejections) {
      expect(["R1", "R2", "R3", "R4", "MIN_SCORE"]).toContain(r.rule);
      expect(r.detail).toContain("relevance=");
    }
  });
});
