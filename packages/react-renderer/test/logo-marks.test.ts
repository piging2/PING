/**
 * Proof 5 (extension): per-business irregular-border logo marks + click
 * overlay, per Nolan's binding product directives 2026-10-02-fyd-object-logos.md
 * and 2026-10-02-fyd-logo-overlay.md.
 *
 * - FYD objects do NOT use circles. They use irregular border logos.
 *   HPP = tape measure, Coppersmith = pipe wrench, unknown = generic.
 * - Clicking the logo opens an immersive overlay covering almost the
 *   whole background (details/summary, zero JS).
 * - Overlay text uses a high-contrast OUTLINE (SVG text stroke), NOT
 *   a drop shadow.
 * - Presentation-layer only: the semantic render model is unchanged
 *   (no SiteSpec/ObjectGraph/ViewerContext changes).
 */
import { generateSiteSpec } from "../../sitespec/src/generator";
import { buildVerifiedPublicProjection } from "../../sitespec/src/projection";
import {
  buildSemanticRenderModel,
  type SemanticRenderModel,
} from "../../sitespec/src/render-model";
import type { ObjectGraph } from "../../sitespec/src/types";
import { HAPPY_PLACE_GRAPH } from "../../sitespec/fixtures/happy-place-graph";
import { COPPERSMITH_GRAPH } from "../../sitespec/fixtures/coppersmith-graph";
import {
  factsFromProjection,
  type FactsById,
} from "../src/facts";
import { renderModelToStaticHtml } from "../src/render";
import {
  BusinessLogoMark,
  BusinessLogoOverlay,
  LOGO_OVERLAY_CSS,
  resolveLogoMark,
  resolveMarkImage,
} from "../src/marks";
import { renderToStaticMarkup } from "react-dom/server";

const GEN_AT = "2026-10-02T12:00:00Z";
const HPP_ID = "website-business-6fa5ebd99d72c4cb";
const COPPERSMITH_ID = "website-business-2f1327c09d622175";

interface Built {
  model: SemanticRenderModel;
  facts: FactsById;
}

function build(graph: ObjectGraph): Built {
  const spec = generateSiteSpec(graph, { generatedAt: GEN_AT });
  const projection = buildVerifiedPublicProjection(graph);
  const model = buildSemanticRenderModel(spec, projection);
  return { model, facts: factsFromProjection(projection) };
}

describe("logo mark resolution", () => {
  test("src ships no per-customer default: proof businesses resolve generic", () => {
    // Backend genericity (point 11): the adapter must not branch on
    // customer identity. The caller supplies business->mark assignments.
    expect(resolveLogoMark(HPP_ID)).toBe("generic");
    expect(resolveLogoMark(COPPERSMITH_ID)).toBe("generic");
  });
  test("unknown business resolves to generic", () => {
    expect(resolveLogoMark("website-business-unknown")).toBe("generic");
  });
  test("caller-supplied mapping is the only mapping", () => {
    expect(resolveLogoMark(HPP_ID, { [HPP_ID]: "tape-measure" })).toBe("tape-measure");
    expect(resolveLogoMark(COPPERSMITH_ID, { [COPPERSMITH_ID]: "pipe-wrench" })).toBe("pipe-wrench");
  });
  test("resolution is deterministic", () => {
    const m = { [HPP_ID]: "tape-measure" } as const;
    expect(resolveLogoMark(HPP_ID, { ...m })).toBe(resolveLogoMark(HPP_ID, { ...m }));
  });
});

describe("logo mark rendering", () => {
  test("mark output contains zero <circle elements", () => {
    for (const id of [HPP_ID, COPPERSMITH_ID, "website-business-zzz"]) {
      const html = renderToStaticMarkup(
        BusinessLogoMark({ objectId: id, title: "T" }),
      );
      expect(html).not.toMatch(/<circle/);
    }
  });
  test("mark carries data-logo-mark and irregular border hooks", () => {
    // SVG marks (pipe-wrench, generic) keep the hand-authored irregular
    // border. The tape-measure mark is the owner's real webp: its own
    // irregular cutout edge IS the border, so it renders an <img> with
    // no border wrapper and no black badge box. Marks are caller-assigned;
    // src ships no per-customer default (backend genericity, point 11).
    const svgHtml = renderToStaticMarkup(
      BusinessLogoMark({
        objectId: COPPERSMITH_ID,
        title: "Coppersmith",
        overrides: { [COPPERSMITH_ID]: "pipe-wrench" },
      }),
    );
    expect(svgHtml).toContain('data-logo-mark="pipe-wrench"');
    expect(svgHtml).toContain('data-logo-border="irregular"');
    const imgHtml = renderToStaticMarkup(
      BusinessLogoMark({
        objectId: HPP_ID,
        title: "Happy Place",
        overrides: { [HPP_ID]: "tape-measure" },
      }),
    );
    expect(imgHtml).toContain('data-logo-mark="tape-measure"');
    expect(imgHtml).toContain('data-logo-mark-img="tape-measure"');
    expect(imgHtml).toContain('src="assets/marks/tape-measure.webp"');
    expect(imgHtml).not.toContain('data-logo-border=');
  });
  test("no caller mapping renders the generic mark (empty src default)", () => {
    const html = renderToStaticMarkup(
      BusinessLogoMark({ objectId: HPP_ID, title: "Happy Place" }),
    );
    expect(html).toContain('data-logo-mark="generic"');
    expect(html).toContain('data-logo-border="irregular"');
  });
  test("tape-measure image URL is caller-overridable, SVG marks unaffected", () => {
    const html = renderToStaticMarkup(
      BusinessLogoMark({
        objectId: HPP_ID,
        title: "Happy Place",
        overrides: { [HPP_ID]: "tape-measure" },
        imageUrls: { "tape-measure": "/custom/hpp.webp" },
      }),
    );
    expect(html).toContain('src="/custom/hpp.webp"');
    expect(resolveMarkImage("pipe-wrench")).toBeNull();
  });
  test("mark is an accessible image with a label", () => {
    const html = renderToStaticMarkup(
      BusinessLogoMark({ objectId: HPP_ID, title: "Happy Place" }),
    );
    expect(html).toContain('aria-label="Happy Place logo"');
  });
});

describe("logo overlay", () => {
  test("overlay renders details/summary (click works with zero JS)", () => {
    const html = renderToStaticMarkup(
      BusinessLogoOverlay({ objectId: HPP_ID, title: "Happy Place" }),
    );
    expect(html).toContain("data-logo-overlay");
    expect(html).toContain("data-logo-overlay-trigger");
    expect(html).toContain("data-logo-overlay-backdrop");
    expect(html).toMatch(/<details/);
    expect(html).toMatch(/<summary/);
  });
  test("overlay text is SVG text with stroke outline, not a drop shadow", () => {
    const html = renderToStaticMarkup(
      BusinessLogoOverlay({ objectId: HPP_ID, title: "Happy Place" }),
    );
    expect(html).toContain("data-logo-overlay-text");
    expect(html).toContain('stroke="#000000"');
    expect(html).toContain('paint-order="stroke"');
    expect(html.toLowerCase()).not.toContain("drop-shadow");
  });
  test("overlay CSS uses outline treatment, never drop-shadow/text-shadow", () => {
    expect(LOGO_OVERLAY_CSS.toLowerCase()).not.toContain("drop-shadow");
    expect(LOGO_OVERLAY_CSS.toLowerCase()).not.toContain("text-shadow");
    expect(LOGO_OVERLAY_CSS).toContain("position: fixed");
    expect(LOGO_OVERLAY_CSS).toContain("inset:");
  });
  test("overlay CSS carries the rock-on-hover animation (pure CSS, zero JS)", () => {
    expect(LOGO_OVERLAY_CSS).toContain("@keyframes fyd-logo-rock");
    expect(LOGO_OVERLAY_CSS).toContain("summary:hover");
    expect(LOGO_OVERLAY_CSS).toContain(".fyd-logo-mark-img");
  });
  test("rock animation is disabled under prefers-reduced-motion", () => {
    expect(LOGO_OVERLAY_CSS).toContain("prefers-reduced-motion");
    expect(LOGO_OVERLAY_CSS).toContain("animation: none");
  });
});

describe("logo marks in the real business renders", () => {
  const hpp = build(HAPPY_PLACE_GRAPH);
  const cop = build(COPPERSMITH_GRAPH);

  test("HPP home page carries the tape-measure webp mark and overlay", () => {
    const html = renderModelToStaticHtml(hpp.model, hpp.facts, undefined, {
      logoMarks: { [HPP_ID]: "tape-measure" },
    });
    expect(html).toContain('data-logo-mark="tape-measure"');
    expect(html).toContain("data-logo-overlay");
    expect(html).toContain('src="assets/marks/tape-measure.webp"');
    // the webp is an irregular cutout: the mark element has no border
    // wrapper and no badge box (the <style> block legitimately names the
    // selector for SVG marks, so strip it before asserting on markup)
    const markup = html.replace(/<style>[\s\S]*?<\/style>/, "");
    expect(markup).not.toContain('data-logo-border="irregular"');
  });
  test("Coppersmith home page carries the pipe-wrench mark and overlay", () => {
    const html = renderModelToStaticHtml(cop.model, cop.facts, undefined, {
      logoMarks: { [COPPERSMITH_ID]: "pipe-wrench" },
    });
    expect(html).toContain('data-logo-mark="pipe-wrench"');
    expect(html).toContain("data-logo-overlay");
    expect(html).toContain('data-logo-border="irregular"');
  });
  test("without caller logoMarks both pages render the generic mark", () => {
    // Proves the src default is empty: no customer identity branches the mark.
    for (const b of [hpp, cop]) {
      const html = renderModelToStaticHtml(b.model, b.facts);
      expect(html).toContain('data-logo-mark="generic"');
      expect(html).not.toContain('data-logo-mark="tape-measure"');
      expect(html).not.toContain('data-logo-mark="pipe-wrench"');
    }
  });
  test("neither business render contains a <circle element", () => {
    expect(renderModelToStaticHtml(hpp.model, hpp.facts)).not.toMatch(/<circle/);
    expect(renderModelToStaticHtml(cop.model, cop.facts)).not.toMatch(/<circle/);
  });
  test("overlay CSS is injected into rendered HTML", () => {
    const html = renderModelToStaticHtml(hpp.model, hpp.facts);
    expect(html).toContain("<style>");
    expect(html).toContain("data-logo-overlay-backdrop");
  });
  test("override option flows through renderModelToStaticHtml", () => {
    const html = renderModelToStaticHtml(hpp.model, hpp.facts, undefined, {
      logoMarks: { [HPP_ID]: "generic" },
    });
    expect(html).toContain('data-logo-mark="generic"');
    expect(html).not.toContain('data-logo-mark="tape-measure"');
  });
});
