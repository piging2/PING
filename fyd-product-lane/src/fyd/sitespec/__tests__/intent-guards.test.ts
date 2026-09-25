/**
 * Intent-only guards: the V1 SiteSpec extensions validate additively.
 *
 * - A legacy spec (no new fields) produces no extension findings.
 * - A spec using the new fields with valid values validates clean.
 * - Forbidden content (class strings, CSS, JSX, executable code, raw hex
 *   overrides, primitive overrides, data: URLs, raw E.164 targets) is an
 *   error, each naming its path.
 * - Unknown themes, variants, media roles, CTA references are errors.
 */
import { HAPPY_PLACE_GRAPH } from "../../proceduralize/__fixtures__/happy-place-graph";
import { generateSiteSpec } from "../../proceduralize/generator";
import { validateIntentExtensions } from "../intent-guards";
import { isRenderable, validateSiteSpec } from "../validator";
import type { FYDSiteSpec } from "../types";

const OPTS = { generatedAt: "2026-09-21T12:00:00.000Z" };

function baseSpec(): FYDSiteSpec {
  return generateSiteSpec(HAPPY_PLACE_GRAPH, OPTS);
}

function schemas(): Set<string> {
  return new Set(HAPPY_PLACE_GRAPH.objects.map((o) => o.schema));
}

/** A fully-populated, valid set of V1 extension fields. */
function extendedSpec(): FYDSiteSpec {
  const spec = baseSpec();
  // First section is "Hero", a V1 family component.
  spec.pages[0].sections[0].composition = {
    job: "persuade",
    variant: "media-rich",
    selectionRationale: "Owner hero photo documents the work; media-rich leads with it.",
    sectionRhythm: "hero",
    density: "comfortable",
    emphasis: "prominent",
    objectBindings: [{ role: "owner", objectId: "owner-1", note: "hero identity" }],
    mediaBindings: [{ role: "hero-documentary", assetId: "asset-hero-1" }],
    ctaBindings: ["cta-call-primary"],
    responsiveIntent: { narrow: ["stack"], wide: ["snap-row"] },
    mediaTreatment: { treatment: "documentary" },
  };
  spec.designTokens = {
    theme: "fyd/hpp-warm-craftsman@1",
    tier: "semantic",
    overrides: { "hero.kicker": "{accent.gold-text}" },
  };
  spec.ctaHierarchy = {
    hierarchy: [
      {
        id: "cta-call-primary",
        rank: "primary",
        kind: "call",
        label: "Call now",
        target: "(970) 555-0100",
        rationale: "Owner closes on the phone.",
      },
      {
        id: "cta-estimate",
        rank: "secondary",
        kind: "estimate",
        label: "Get a free estimate",
        target: "contact",
      },
    ],
    placement: { hero: ["cta-call-primary"], "contact-cta": ["cta-estimate"] },
  };
  spec.sourceDesignSignal = {
    authority: "signal-not-authority",
    observedAt: "2026-09-25",
    sourceUrl: "https://example.com",
    observations: {
      brandColorHints: ["#254240", "#F6F4F0"],
      fontTendencies: ["Georgia serif display"],
      notes: ["warm off-white bands"],
    },
  };
  spec.pages[0].headlineIntent = {
    h1Kind: "editorial",
    source: "source-site",
    sourceNote: "Hero headline observed on the source site.",
  };
  return spec;
}

function extensionErrors(spec: FYDSiteSpec): string[] {
  return validateIntentExtensions(spec)
    .filter((f) => f.severity === "error")
    .map((f) => `${f.path}: ${f.message}`);
}

describe("validateIntentExtensions", () => {
  test("legacy spec without new fields produces no extension findings", () => {
    const findings = validateIntentExtensions(baseSpec());
    expect(findings).toEqual([]);
  });

  test("extended spec with valid values validates clean", () => {
    expect(extensionErrors(extendedSpec())).toEqual([]);
  });

  test("extended spec is renderable through the full validator", () => {
    const findings = validateSiteSpec(extendedSpec(), schemas());
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors).toEqual([]);
    expect(isRenderable(findings)).toBe(true);
  });

  test("legacy spec still passes the full validator (backward compatible)", () => {
    const findings = validateSiteSpec(baseSpec(), schemas());
    expect(findings.filter((f) => f.severity === "error")).toEqual([]);
  });

  test("class string in selectionRationale is an error", () => {
    const spec = extendedSpec();
    spec.pages[0].sections[0].composition!.selectionRationale =
      "Use class=\"bg-teal-800 text-white\" for the hero.";
    const errors = extensionErrors(spec);
    expect(errors.some((e) => e.includes("selectionRationale"))).toBe(true);
  });

  test("raw CSS declaration in a note is an error", () => {
    const spec = extendedSpec();
    spec.pages[0].sections[0].composition!.mediaBindings = [
      { role: "hero-documentary", assetId: "a1", note: "color: red; display: flex;" },
    ];
    const errors = extensionErrors(spec);
    expect(errors.some((e) => e.includes("note"))).toBe(true);
  });

  test("JSX in sourceNote is an error", () => {
    const spec = extendedSpec();
    spec.pages[0].headlineIntent = {
      h1Kind: "editorial",
      sourceNote: "Render <Hero headline='Hi' /> here.",
    };
    const errors = extensionErrors(spec);
    expect(errors.some((e) => e.includes("sourceNote"))).toBe(true);
  });

  test("executable code in rationale is an error", () => {
    const spec = extendedSpec();
    spec.ctaHierarchy!.hierarchy[0].rationale = "eval(document.cookie)";
    const errors = extensionErrors(spec);
    expect(errors.some((e) => e.includes("rationale"))).toBe(true);
  });

  test("raw hex in designTokens overrides is an error", () => {
    const spec = extendedSpec();
    spec.designTokens = {
      theme: "fyd/hpp-warm-craftsman@1",
      overrides: { "hero.kicker": "#ff0000" },
    };
    const errors = extensionErrors(spec);
    expect(errors.some((e) => e.includes("overrides"))).toBe(true);
  });

  test("primitive id in designTokens overrides is an error", () => {
    const spec = extendedSpec();
    spec.designTokens = {
      theme: "fyd/hpp-warm-craftsman@1",
      overrides: { "hero.kicker": "{color.teal.800}" },
    };
    const errors = extensionErrors(spec);
    expect(errors.some((e) => e.includes("overrides") && e.includes("primitive"))).toBe(true);
  });

  test("raw hex in brandColorHints is allowed (observation, not authority)", () => {
    const spec = extendedSpec();
    expect(extensionErrors(spec)).toEqual([]);
    expect(spec.sourceDesignSignal!.observations.brandColorHints).toEqual([
      "#254240",
      "#F6F4F0",
    ]);
  });

  test("data: URL as media asset is an error", () => {
    const spec = extendedSpec();
    spec.pages[0].sections[0].composition!.mediaBindings = [
      { role: "hero-documentary", assetId: "data:image/png;base64,iVBORw0KGgo=" },
    ];
    const errors = extensionErrors(spec);
    expect(errors.some((e) => e.includes("assetId"))).toBe(true);
  });

  test("raw E.164 phone as CTA target is an error", () => {
    const spec = extendedSpec();
    spec.ctaHierarchy!.hierarchy[0].target = "+19705550100";
    const errors = extensionErrors(spec);
    expect(errors.some((e) => e.includes("target"))).toBe(true);
  });

  test("unknown theme id is an error", () => {
    const spec = extendedSpec();
    spec.designTokens = { theme: "fyd/not-a-theme@1" };
    const errors = extensionErrors(spec);
    expect(errors.some((e) => e.includes("theme") && e.includes("Unknown theme"))).toBe(true);
  });

  test("unknown variant for a V1 component is an error", () => {
    const spec = extendedSpec();
    spec.pages[0].sections[0].composition!.variant = "mega-hero";
    const errors = extensionErrors(spec);
    expect(errors.some((e) => e.includes("variant"))).toBe(true);
  });

  test("unknown media role is an error", () => {
    const spec = extendedSpec();
    spec.pages[0].sections[0].composition!.mediaBindings = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { role: "vibe-shot", assetId: "a1" } as any,
    ];
    const errors = extensionErrors(spec);
    expect(errors.some((e) => e.includes("Unknown media role"))).toBe(true);
  });

  test("ctaBindings referencing an unknown CTA id is an error", () => {
    const spec = extendedSpec();
    spec.pages[0].sections[0].composition!.ctaBindings = ["cta-ghost"];
    const errors = extensionErrors(spec);
    expect(errors.some((e) => e.includes("cta-ghost"))).toBe(true);
  });

  test("wrong authority marker on sourceDesignSignal is an error", () => {
    const spec = extendedSpec();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (spec.sourceDesignSignal as any).authority = "canonical-truth";
    const errors = extensionErrors(spec);
    expect(errors.some((e) => e.includes("authority"))).toBe(true);
  });
});
