/**
 * Family variant tests (product lane, V1).
 *
 * Every locked variant of all 11 components renders through the
 * registry, honors its data-variant contract, and fail-closed behavior
 * holds for unknown components/variants. Variant-specific behavioral
 * assertions pin the responsive and conversion contracts.
 */

import { renderToStaticMarkup } from "react-dom/server";
import type { PlannedSection } from "../../proceduralize/planner";
import { resolveFamilySection } from "../registry";
import { buildFamilyCtx, type FamilyCtx } from "../types";
import {
  verifierSourceFor,
  renderAtomClassificationFor,
  FAMILY_GENERATED_COPY_REF,
} from "../bindings";
import { coppersmithLikeFamilyInput, hppLikeFamilyInput } from "./fixtures";

const hppInput = hppLikeFamilyInput();
const copperInput = coppersmithLikeFamilyInput();
const hppCtx: FamilyCtx = buildFamilyCtx(hppInput);
const copperCtx: FamilyCtx = buildFamilyCtx(copperInput);

const ALL: Array<[string, string[]]> = [
  ["Navigation", ["taxonomic", "minimal"]],
  ["Hero", ["media-rich", "identity-led", "service-led", "local-action"]],
  ["TrustBar", ["metrics-strip", "testimonial-cluster"]],
  ["ServiceGrid", ["cards", "featured-plus-grid", "media-grid"]],
  ["FeaturedService", ["media-lead", "scope-lead"]],
  ["ProjectGallery", ["masonry", "editorial", "carousel"]],
  ["BusinessStory", ["founder-led", "team-grid"]],
  ["ServiceArea", ["area-list", "hub-address"]],
  ["ContactCTA", ["conversion-dual", "value-capture"]],
  ["Footer", ["credibility", "credibility-plus-capture"]],
  ["AskFYD-entry", ["floating-entry", "inline-section"]],
];

function sectionFor(
  component: string,
  variant?: string,
): { section: PlannedSection; ctx: FamilyCtx } {
  const sources: Array<{ input: typeof hppInput; ctx: FamilyCtx }> = [
    { input: hppInput, ctx: hppCtx },
    { input: copperInput, ctx: copperCtx },
  ];
  // Prefer a planned section already carrying the requested variant, so
  // variant-specific bindings (e.g. the newsletter binding on
  // value-capture) are present as the planner emitted them.
  if (variant) {
    for (const { input, ctx } of sources) {
      const exact = input.plan.sections.find(
        (s) => s.component === component && s.variant === variant,
      );
      if (exact) return { section: exact, ctx };
    }
  }
  for (const { input, ctx } of sources) {
    const fromPlan = input.plan.sections.find((s) => s.component === component);
    if (fromPlan) return { section: fromPlan, ctx };
  }
  throw new Error("no planned section for " + component);
}

describe("every locked variant renders", () => {
  for (const [component, variants] of ALL) {
    for (const variant of variants) {
      test(`${component} / ${variant}`, () => {
        const { section, ctx } = sectionFor(component, variant);
        // value-capture is capability-gated: the planner only emits it
        // with its newsletter binding, so the variant probe carries one.
        const bindings =
          variant === "value-capture" &&
          !section.ctaBindings.some((c) => c.kind === "newsletter")
            ? [
                ...section.ctaBindings,
                {
                  tier: "tertiary" as const,
                  kind: "newsletter" as const,
                  label: "Owner-provided updates",
                  target: "#newsletter",
                  display: "Owner-provided updates: No spam, ever.",
                  placement: "contactcta",
                },
              ]
            : section.ctaBindings;
        const el = resolveFamilySection({ ...section, variant, ctaBindings: bindings }, ctx);
        expect(el).not.toBeNull();
        const html = renderToStaticMarkup(el!);
        expect(html).toContain(`data-variant="${variant}"`);
        expect(html.length).toBeGreaterThan(50);
      });
    }
  }
});

describe("variant behavior", () => {
  test("local-action hero leads with the big tap-to-call number", () => {
    const hero = copperInput.plan.sections.find((s) => s.component === "Hero")!;
    const html = renderToStaticMarkup(
      resolveFamilySection({ ...hero, variant: "local-action" }, copperCtx)!,
    );
    expect(html).toContain("min-h-[56px]");
    expect(html).toContain("tel:+19702453869");
    expect(html).toContain("(970) 245-3869");
  });

  test("service-led hero routes service discovery", () => {
    const { section, ctx } = sectionFor("Hero");
    const html = renderToStaticMarkup(
      resolveFamilySection({ ...section, variant: "service-led" }, ctx)!,
    );
    expect(html).toContain('aria-label="Service lines"');
  });

  test("media-grid gives every service its imagery", () => {
    const { section, ctx } = sectionFor("ServiceGrid");
    const html = renderToStaticMarkup(
      resolveFamilySection({ ...section, variant: "media-grid" }, ctx)!,
    );
    const articles = html.match(/<article[\s\S]*?<\/article>/gi) ?? [];
    expect(articles.length).toBeGreaterThan(0);
    for (const a of articles) {
      expect(a).toContain("<img");
    }
  });

  test("carousel is a touch-native swipe region", () => {
    const { section, ctx } = sectionFor("ProjectGallery");
    const html = renderToStaticMarkup(
      resolveFamilySection({ ...section, variant: "carousel" }, ctx)!,
    );
    expect(html).toContain('role="region"');
    expect(html).toContain("snap-x");
  });

  test("value-capture holds no money CTA", () => {
    // The planner gates this variant on newsletter evidence and always
    // attaches the newsletter binding; the probe reproduces that shape.
    const { section, ctx } = sectionFor("ContactCTA");
    const probe = {
      ...section,
      variant: "value-capture",
      ctaBindings: [
        ...section.ctaBindings,
        {
          tier: "tertiary" as const,
          kind: "newsletter" as const,
          label: "Owner-provided updates",
          target: "#newsletter",
          display: "Owner-provided updates: No spam, ever.",
          placement: "contactcta",
        },
      ],
    };
    const html = renderToStaticMarkup(resolveFamilySection(probe, ctx)!);
    expect(html).not.toContain("tel:");
    expect(html).toContain('type="email"');
    expect(html).toContain("Owner-provided updates");
  });

  test("value-capture without a newsletter binding renders nothing (fail closed)", () => {
    // Binding rule 3: a capture variant without its evidenced binding
    // must not invent a funnel or a value proposition. The guard lives
    // inside the variant component, so assert on rendered output.
    const { section, ctx } = sectionFor("ContactCTA");
    const stripped = {
      ...section,
      variant: "value-capture",
      ctaBindings: section.ctaBindings.filter((c) => c.kind !== "newsletter"),
    };
    expect(renderToStaticMarkup(resolveFamilySection(stripped, ctx)!)).toBe("");
  });

  test("conversion-dual without a newsletter binding renders no capture form", () => {
    // The planner gates the newsletter CTA on the newsletter-capture
    // capability or owner intent; without it the component must not
    // invent a "Get useful updates" funnel.
    const { section, ctx } = sectionFor("ContactCTA");
    const withoutNewsletter = {
      ...section,
      variant: "conversion-dual",
      ctaBindings: section.ctaBindings.filter((c) => c.kind !== "newsletter"),
    };
    const html = renderToStaticMarkup(resolveFamilySection(withoutNewsletter, ctx)!);
    expect(html).not.toContain("Get useful updates");
    expect(html).not.toContain('type="email"');
    expect(html).not.toContain("A real person answers");
  });

  test("conversion-dual with a newsletter binding keeps the capture form", () => {
    const { section, ctx } = sectionFor("ContactCTA");
    const withNewsletter = {
      ...section,
      variant: "conversion-dual",
      ctaBindings: [
        ...section.ctaBindings,
        {
          tier: "tertiary" as const,
          kind: "newsletter" as const,
          label: "Owner-provided updates",
          target: "#newsletter",
          display: "Owner-provided updates",
          placement: "contactcta",
        },
      ],
    };
    const html = renderToStaticMarkup(resolveFamilySection(withNewsletter, ctx)!);
    expect(html).toContain("Get useful updates");
    expect(html).toContain('type="email"');
    expect(html).toContain("Owner-provided updates");
  });

  test("credibility-plus-capture keeps the footer capture with the honest disclaimer", () => {
    const { section, ctx } = sectionFor("Footer");
    const html = renderToStaticMarkup(
      resolveFamilySection({ ...section, variant: "credibility-plus-capture" }, ctx)!,
    );
    expect(html).toContain('type="email"');
    expect(html).toContain("cannot guarantee openings");
  });

  test("credibility-plus-capture without a newsletter binding renders no capture form", () => {
    // Binding rule 3: the footer stays credibility-only rather than
    // inventing a newsletter funnel.
    const { section, ctx } = sectionFor("Footer");
    const stripped = {
      ...section,
      variant: "credibility-plus-capture",
      ctaBindings: section.ctaBindings.filter((c) => c.kind !== "newsletter"),
    };
    const html = renderToStaticMarkup(resolveFamilySection(stripped, ctx)!);
    expect(html).not.toContain('type="email"');
    expect(html).toContain("Powered by FYD");
  });

  test("inline-section AskFYD is a quiet block, floating-entry is one pill", () => {
    const { section, ctx } = sectionFor("AskFYD-entry");
    const inline = renderToStaticMarkup(
      resolveFamilySection({ ...section, variant: "inline-section" }, ctx)!,
    );
    const floating = renderToStaticMarkup(
      resolveFamilySection({ ...section, variant: "floating-entry" }, ctx)!,
    );
    expect(inline).toContain('id="ask-fyd"');
    expect(inline).not.toContain("fixed");
    expect(floating).toContain("fixed");
  });
});

describe("fail closed", () => {  test("unknown variant renders nothing", () => {
    const { section, ctx } = sectionFor("Hero");
    expect(resolveFamilySection({ ...section, variant: "hologram" }, ctx)).toBeNull();
  });

  test("unknown component renders nothing", () => {
    const { section, ctx } = sectionFor("Hero");
    expect(
      resolveFamilySection({ ...section, component: "ObjectRail" as never }, ctx),
    ).toBeNull();
  });

  test("non-planned status renders nothing", () => {
    const { section, ctx } = sectionFor("Hero");
    expect(resolveFamilySection({ ...section, status: "proposed" }, ctx)).toBeNull();
  });
});

describe("binding contract (Nolan 2026-09-26)", () => {
  test("render-side kinds map onto the existing verifier vocabulary, no parallel authority", () => {
    expect(verifierSourceFor("object-field")).toBe("object-field");
    expect(verifierSourceFor("evidence-derivation")).toBe("object-field");
    expect(verifierSourceFor("owner-content")).toBe("owner-assertion");
    expect(verifierSourceFor("generated-copy")).toBe("generated-presentation");
    expect(renderAtomClassificationFor("object-field")).toBe("DIRECT_EVIDENCE");
    expect(renderAtomClassificationFor("evidence-derivation")).toBe("DETERMINISTIC_DERIVATION");
    expect(renderAtomClassificationFor("owner-content")).toBe("OWNER_ASSERTED");
    expect(renderAtomClassificationFor("generated-copy")).toBe("GENERATED_PRESENTATION");
    // Generator mark is name@version, as the verifier requires.
    expect(FAMILY_GENERATED_COPY_REF).toMatch(/^[A-Za-z0-9_.-]+@\d+$/);
  });

  test("section chrome renders marked generated copy, never business facts", () => {
    const { section, ctx } = sectionFor("ServiceGrid");
    const html = renderToStaticMarkup(resolveFamilySection(section, ctx)!);
    // Generic chrome present...
    expect(html).toContain("A few ways we can help");
    // ...recorded as the visual scale the planner tagged.
    expect(html).toContain('data-visual-scale="');
  });

  test("components receive no free-form factual props: only section + ctx", () => {
    // FamilySectionProps is exactly { section, ctx }; the registry calls
    // every renderer with that pair and nothing else.
    const { section, ctx } = sectionFor("Hero");
    const el = resolveFamilySection(section, ctx)!;
    expect(el.props).toEqual({ section, ctx });
  });
});
