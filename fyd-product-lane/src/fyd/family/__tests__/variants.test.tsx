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

function sectionFor(component: string): { section: PlannedSection; ctx: FamilyCtx } {
  const fromHpp = hppInput.plan.sections.find((s) => s.component === component);
  if (fromHpp) return { section: fromHpp, ctx: hppCtx };
  const fromCopper = copperInput.plan.sections.find((s) => s.component === component);
  if (fromCopper) return { section: fromCopper, ctx: copperCtx };
  throw new Error("no planned section for " + component);
}

describe("every locked variant renders", () => {
  for (const [component, variants] of ALL) {
    for (const variant of variants) {
      test(`${component} / ${variant}`, () => {
        const { section, ctx } = sectionFor(component);
        const el = resolveFamilySection({ ...section, variant }, ctx);
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
    const { section, ctx } = sectionFor("ContactCTA");
    const html = renderToStaticMarkup(
      resolveFamilySection({ ...section, variant: "value-capture" }, ctx)!,
    );
    expect(html).not.toContain("tel:");
    expect(html).toContain('type="email"');
  });

  test("credibility-plus-capture keeps the footer capture with the honest disclaimer", () => {
    const { section, ctx } = sectionFor("Footer");
    const html = renderToStaticMarkup(
      resolveFamilySection({ ...section, variant: "credibility-plus-capture" }, ctx)!,
    );
    expect(html).toContain('type="email"');
    expect(html).toContain("cannot guarantee openings");
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

describe("fail closed", () => {
  test("unknown variant renders nothing", () => {
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
